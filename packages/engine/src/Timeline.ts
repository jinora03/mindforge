import * as THREE from 'three';
import type { Easing } from '@mindforge/schema';
import type {
  ActionContext,
  CameraShot,
  CameraState,
  EffectInstance,
  FaceStateApplier,
  FrameContext,
  MotionInstance,
  ResolvedText,
} from './EngineTypes';
import { applyEasing } from './easing';
import type { AnimationTrack } from './AnimationRuntime';
import type { EffectInfluenceBus, EffectInfluenceSink } from './EffectInfluence';

/** Default window lengths (seconds) when an event omits `duration`. */
export const DEFAULT_DURATIONS = {
  motion: 2,
  effect: 1.5,
  camera: 1.5,
  text: 3,
} as const;

/** Build the per-window context for a timeline action from the frame + window. */
export function makeActionContext(
  frame: FrameContext,
  at: number,
  duration: number,
  easing: Easing | undefined,
): ActionContext {
  const rawLocalTime = frame.time - at;
  const localDuration = duration;
  const localTime = rawLocalTime < 0 ? 0 : rawLocalTime > localDuration ? localDuration : rawLocalTime;
  const rawProgress =
    localDuration <= 0 ? (rawLocalTime >= 0 ? 1 : 0) : localTime / localDuration;
  const phase = rawLocalTime < 0 ? 'before' : rawLocalTime > localDuration ? 'after' : 'active';
  return {
    time: frame.time,
    delta: frame.delta,
    duration: frame.duration,
    normalizedTime: frame.normalizedTime,
    at,
    localDuration,
    localTime,
    rawLocalTime,
    progress: applyEasing(rawProgress, easing),
    active: phase === 'active',
    phase,
  };
}

/* --------------------------------------------------------------- actions --- */

export class MotionAction {
  constructor(
    readonly id: string,
    private readonly at: number,
    private readonly duration: number,
    private readonly easing: Easing | undefined,
    private readonly instance: MotionInstance,
  ) {}
  evaluate(frame: FrameContext): void {
    this.instance.apply(makeActionContext(frame, this.at, this.duration, this.easing));
  }
  reset(): void {
    this.instance.reset();
  }
  dispose(): void {
    this.instance.dispose?.();
  }
}

export class EffectAction {
  constructor(
    readonly id: string,
    private readonly at: number,
    private readonly duration: number,
    private readonly easing: Easing | undefined,
    readonly instance: EffectInstance,
  ) {}
  contributeInfluence(frame: FrameContext, enabled: boolean, sink: EffectInfluenceSink): void {
    if (!enabled || !this.instance.contributeInfluence) return;
    const ctx = makeActionContext(frame, this.at, this.duration, this.easing);
    if (!ctx.active) return;
    this.instance.contributeInfluence(ctx, sink);
  }
  evaluate(frame: FrameContext, enabled: boolean): void {
    if (!enabled) {
      this.instance.object3d.visible = false;
      return;
    }
    this.instance.update(makeActionContext(frame, this.at, this.duration, this.easing));
  }
  reset(): void {
    this.instance.reset();
  }
  dispose(): void {
    this.instance.dispose();
  }
}

interface CameraWindow {
  readonly at: number;
  readonly duration: number;
  readonly easing: Easing | undefined;
  /** Optional deterministic cross-shot blend at the start of this camera window. */
  readonly blendDuration?: number;
  readonly shot: CameraShot;
}

export class TextAction {
  constructor(
    readonly id: string,
    private readonly at: number,
    private readonly duration: number,
    readonly text: ResolvedText,
  ) {}
  isActive(time: number): boolean {
    return time >= this.at && time <= this.at + this.duration;
  }
}

/**
 * A callback is a passive marker on the timeline. It carries no evaluation
 * state: it is NOT a deterministic scene-state producer. The Engine's live
 * layer fires it on forward crossing (see {@link Timeline.getCallbacksInInterval});
 * `evaluateAt(t)` never touches it, so scrubbing produces no side effects.
 */
export class CallbackAction {
  constructor(
    readonly id: string,
    readonly at: number,
    readonly name: string,
  ) {}
}

/* ---------------------------------------------------------------- tracks --- */

export class VisibilityTrack {
  private readonly events: { at: number; visible: boolean }[];
  constructor(
    private readonly object: THREE.Object3D,
    private readonly base: boolean,
    events: { at: number; visible: boolean }[],
  ) {
    this.events = [...events].sort((a, b) => a.at - b.at);
  }
  evaluate(time: number): void {
    let value = this.base;
    for (const event of this.events) {
      if (event.at <= time) value = event.visible;
      else break;
    }
    this.object.visible = value;
  }
  reset(): void {
    this.object.visible = this.base;
  }
}

export class FaceTrack {
  private readonly events: { at: number; state: Parameters<FaceStateApplier>[0] }[];
  constructor(
    private readonly apply: FaceStateApplier,
    events: { at: number; state: Parameters<FaceStateApplier>[0] }[],
  ) {
    this.events = [...events].sort((a, b) => a.at - b.at);
  }
  evaluate(time: number): void {
    let state: Parameters<FaceStateApplier>[0] = 'neutral';
    for (const event of this.events) {
      if (event.at <= time) state = event.state;
      else break;
    }
    this.apply(state);
  }
  reset(): void {
    this.apply('neutral');
  }
}

export type PropValue =
  | { kind: 'number'; n: number }
  | { kind: 'vec3'; v: [number, number, number] }
  | { kind: 'color'; c: THREE.Color };

interface PropEvent {
  at: number;
  duration: number;
  easing: Easing | undefined;
  from: PropValue;
  to: PropValue;
}

export type PropertyChannel =
  | 'position'
  | 'rotation'
  | 'scale'
  | 'opacity'
  | 'color'
  | 'emissiveIntensity'
  | 'intensity';

export class PropertyTrack {
  private readonly events: PropEvent[];
  private readonly scratch = new THREE.Color();
  constructor(
    private readonly object: THREE.Object3D,
    private readonly channel: PropertyChannel,
    private readonly base: PropValue,
    events: PropEvent[],
  ) {
    this.events = [...events].sort((a, b) => a.at - b.at);
  }
  evaluate(time: number): void {
    let value = this.base;
    for (const event of this.events) {
      if (time < event.at) break;
      if (time >= event.at + event.duration) {
        value = event.to;
      } else {
        const t = event.duration > 0 ? (time - event.at) / event.duration : 1;
        value = this.lerp(event.from, event.to, applyEasing(t, event.easing));
      }
    }
    this.applyValue(value);
  }
  reset(): void {
    this.applyValue(this.base);
  }
  private lerp(a: PropValue, b: PropValue, t: number): PropValue {
    if (a.kind === 'number' && b.kind === 'number') {
      return { kind: 'number', n: a.n + (b.n - a.n) * t };
    }
    if (a.kind === 'vec3' && b.kind === 'vec3') {
      return {
        kind: 'vec3',
        v: [
          a.v[0] + (b.v[0] - a.v[0]) * t,
          a.v[1] + (b.v[1] - a.v[1]) * t,
          a.v[2] + (b.v[2] - a.v[2]) * t,
        ],
      };
    }
    if (a.kind === 'color' && b.kind === 'color') {
      this.scratch.copy(a.c).lerp(b.c, t);
      return { kind: 'color', c: this.scratch };
    }
    return b;
  }
  private applyValue(value: PropValue): void {
    switch (this.channel) {
      case 'position':
        if (value.kind === 'vec3') this.object.position.fromArray(value.v);
        break;
      case 'rotation':
        if (value.kind === 'vec3') this.object.rotation.set(...value.v);
        break;
      case 'scale':
        if (value.kind === 'vec3') this.object.scale.fromArray(value.v);
        else if (value.kind === 'number') this.object.scale.setScalar(value.n);
        break;
      case 'opacity':
        if (value.kind === 'number') this.forEachMaterial((m) => {
          m.transparent = value.n < 1;
          m.opacity = value.n;
        });
        break;
      case 'color':
        if (value.kind === 'color')
          this.forEachMaterial((m) => {
            if ('color' in m) (m as THREE.MeshStandardMaterial).color.copy(value.c);
          });
        break;
      case 'emissiveIntensity':
        if (value.kind === 'number')
          this.forEachMaterial((m) => {
            if ('emissiveIntensity' in m)
              (m as THREE.MeshStandardMaterial).emissiveIntensity = value.n;
          });
        break;
      case 'intensity':
        if (value.kind === 'number') {
          this.object.traverse((node) => {
            const light = node as THREE.Light;
            if (light.isLight) light.intensity = value.n;
          });
        }
        break;
    }
  }
  private forEachMaterial(fn: (m: THREE.Material) => void): void {
    this.object.traverse((node) => {
      const mesh = node as THREE.Mesh;
      if (!mesh.material) return;
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const material of materials) fn(material);
    });
  }
}

/* -------------------------------------------------------------- timeline --- */

export interface TimelineLayers {
  effects: boolean;
  camera: boolean;
  text: boolean;
}

/**
 * Holds every runtime action / track built from an episode's timeline and
 * evaluates them from the authoritative frame. Evaluation is a pure function
 * of `frame.time`, which is what makes seeking and restart deterministic.
 */
export class Timeline {
  private readonly animations: AnimationTrack[] = [];
  private readonly motions: MotionAction[] = [];
  private readonly effects: EffectAction[] = [];
  private readonly cameras: CameraWindow[] = [];
  private readonly texts: TextAction[] = [];
  private readonly callbacks: CallbackAction[] = [];
  private readonly visibility: VisibilityTrack[] = [];
  private readonly faces: FaceTrack[] = [];
  private readonly properties: PropertyTrack[] = [];
  private readonly cameraSourceScratch: CameraState = {
    position: new THREE.Vector3(),
    target: new THREE.Vector3(),
    fov: 38,
  };
  private readonly cameraDestinationScratch: CameraState = {
    position: new THREE.Vector3(),
    target: new THREE.Vector3(),
    fov: 38,
  };
  private activeTexts: ResolvedText[] = [];

  addAnimationTrack(track: AnimationTrack): void {
    this.animations.push(track);
  }
  addMotion(action: MotionAction): void {
    this.motions.push(action);
  }
  addEffect(action: EffectAction): void {
    this.effects.push(action);
  }
  addCamera(window: CameraWindow): void {
    this.cameras.push(window);
    this.cameras.sort((a, b) => a.at - b.at);
  }
  addText(action: TextAction): void {
    this.texts.push(action);
  }
  addCallback(action: CallbackAction): void {
    this.callbacks.push(action);
  }
  addVisibilityTrack(track: VisibilityTrack): void {
    this.visibility.push(track);
  }
  addFaceTrack(track: FaceTrack): void {
    this.faces.push(track);
  }
  addPropertyTrack(track: PropertyTrack): void {
    this.properties.push(track);
  }

  hasCameras(): boolean {
    return this.cameras.length > 0;
  }

  /**
   * Phase 1: expression, pose, property tweens, and visibility. Runs before
   * the Engine refreshes world matrices so effects and cameras in phase 2 read
   * up-to-date anchor positions.
   */
  evaluatePose(frame: FrameContext): void {
    // Authored clips establish the base animated pose first. Procedural face,
    // motion, and property tracks may then intentionally layer/override it.
    for (const track of this.animations) track.evaluate(frame.time);
    for (const track of this.faces) track.evaluate(frame.time);
    for (const action of this.motions) action.evaluate(frame);
    for (const track of this.properties) track.evaluate(frame.time);
    for (const track of this.visibility) track.evaluate(frame.time);
  }

  /**
   * PF4 pre-pass: rebuild the frame-local production response bus from the
   * exact same absolute timestamp that will drive environment/layer updates.
   * This prevents one-frame lag and makes direct seeking reconstruct the same
   * world reaction as normal playback.
   */
  evaluateEffectInfluences(
    frame: FrameContext,
    enabled: boolean,
    bus: EffectInfluenceBus,
  ): void {
    bus.beginFrame();
    if (!enabled) return;
    for (const action of this.effects) action.contributeInfluence(frame, true, bus);
  }

  /**
   * Phase 2: effects and active-text collection. Pure deterministic scene
   * state — callbacks are intentionally NOT fired here. Assumes world matrices
   * were refreshed after {@link evaluatePose}.
   */
  evaluateEffects(frame: FrameContext, layers: TimelineLayers): void {
    for (const action of this.effects) action.evaluate(frame, layers.effects);

    this.activeTexts = layers.text
      ? this.texts.filter((t) => t.isActive(frame.time)).map((t) => t.text)
      : [];
  }

  /**
   * Pure query for the live layer: callbacks whose timestamp falls in the
   * forward half-open interval `(fromTime, toTime]`, in time order. No state,
   * no side effects — the Engine decides whether/when to fire them.
   */
  getCallbacksInInterval(fromTime: number, toTime: number): { name: string; time: number }[] {
    if (toTime <= fromTime) return [];
    const out: { name: string; time: number }[] = [];
    for (const cb of this.callbacks) {
      if (cb.at > fromTime && cb.at <= toTime) out.push({ name: cb.name, time: cb.at });
    }
    out.sort((a, b) => a.time - b.time);
    return out;
  }

  /**
   * Compute the governing camera state, writing into `out` (reused). Camera
   * windows can opt into a short deterministic cross-shot blend by supplying
   * `blendDuration`. The source pose is evaluated from the previous shot (or
   * the environment default for the first shot) at the *same timestamp*, so
   * seeking directly into a transition reconstructs the exact same frame.
   */
  evaluateCameraState(
    frame: FrameContext,
    enabled: boolean,
    defaultCamera: CameraState,
    out: CameraState,
  ): void {
    if (!enabled || this.cameras.length === 0) {
      copyCameraState(defaultCamera, out);
      return;
    }

    let governingIndex = -1;
    for (let i = 0; i < this.cameras.length; i++) {
      if (this.cameras[i].at <= frame.time) governingIndex = i;
      else break;
    }
    if (governingIndex < 0) {
      copyCameraState(defaultCamera, out);
      return;
    }

    const governing = this.cameras[governingIndex];
    const destination = this.cameraDestinationScratch;
    const ctx = makeActionContext(frame, governing.at, governing.duration, governing.easing);
    governing.shot.evaluate(ctx, destination);

    const blendDuration = Math.max(0, governing.blendDuration ?? 0);
    const elapsed = frame.time - governing.at;
    if (blendDuration <= 0 || elapsed >= blendDuration) {
      copyCameraState(destination, out);
      return;
    }

    const source = this.cameraSourceScratch;
    if (governingIndex === 0) {
      copyCameraState(defaultCamera, source);
    } else {
      const previous = this.cameras[governingIndex - 1];
      const previousCtx = makeActionContext(frame, previous.at, previous.duration, previous.easing);
      previous.shot.evaluate(previousCtx, source);
    }

    const blend = applyEasing(elapsed / blendDuration, 'easeInOutSine');
    out.position.lerpVectors(source.position, destination.position, blend);
    out.target.lerpVectors(source.target, destination.target, blend);
    out.fov = source.fov + (destination.fov - source.fov) * blend;
  }

  getActiveTexts(): readonly ResolvedText[] {
    return this.activeTexts;
  }

  /** Snapshot each effect's root visibility + world position (for inspection). */
  getEffectStates(): { id: string; visible: boolean; position: [number, number, number] }[] {
    const out: { id: string; visible: boolean; position: [number, number, number] }[] = [];
    for (const action of this.effects) {
      action.instance.object3d.getWorldPosition(_effectPos);
      out.push({
        id: action.id,
        visible: action.instance.object3d.visible,
        position: [_effectPos.x, _effectPos.y, _effectPos.z],
      });
    }
    return out;
  }

  reset(): void {
    for (const track of this.animations) track.reset();
    for (const action of this.motions) action.reset();
    for (const action of this.effects) action.reset();
    for (const track of this.visibility) track.reset();
    for (const track of this.faces) track.reset();
    for (const track of this.properties) track.reset();
    this.activeTexts = [];
  }

  dispose(): void {
    for (const track of this.animations) track.dispose();
    for (const action of this.motions) action.dispose();
    for (const action of this.effects) action.dispose();
    for (const window of this.cameras) window.shot.dispose?.();
    this.animations.length = 0;
    this.motions.length = 0;
    this.effects.length = 0;
    this.cameras.length = 0;
    this.texts.length = 0;
    this.callbacks.length = 0;
    this.visibility.length = 0;
    this.faces.length = 0;
    this.properties.length = 0;
  }
}

function copyCameraState(from: CameraState, to: CameraState): void {
  to.position.copy(from.position);
  to.target.copy(from.target);
  to.fov = from.fov;
}

const _effectPos = new THREE.Vector3();
