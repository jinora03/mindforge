import * as THREE from 'three';
import type { AudioEvent } from '@mindforge/schema';
import type {
  CameraState,
  CapabilityRegistries,
  Entity,
  EnvironmentInstance,
  FrameContext,
  ResolvedText,
} from './EngineTypes';
import { SceneManager, type BuiltScene } from './SceneManager';
import { loadEpisode } from './EpisodeLoader';
import { captureSnapshot, type SceneSnapshot } from './snapshot';

const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);

/** Render layers that affect deterministic scene state. */
export type SceneLayer = 'text' | 'camera' | 'effects';

/**
 * The renderer-free heart of the Engine. `SceneRuntime` owns the Three.js
 * scene, the camera, the built entity/timeline/environment graph, and the one
 * deterministic evaluation path: {@link evaluateAt}. It requires no
 * WebGLRenderer or EffectComposer, so it can be evaluated headlessly (tests,
 * future offline render) and it is the single evaluation path shared by live
 * playback and editor seeking.
 *
 * It resolves **deterministic scene state only** — motions, pose, properties,
 * visibility, face, environment, effects, camera, and active text. It never
 * fires callbacks or other playback side effects; the live layer queries
 * {@link callbacksInInterval} for those.
 */
export class SceneRuntime {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(38, 9 / 16, 0.1, 200);

  private readonly sceneManager = new SceneManager();
  private readonly cameraScratch: CameraState = {
    position: new THREE.Vector3(),
    target: new THREE.Vector3(),
    fov: 38,
  };
  private readonly layers: Record<SceneLayer, boolean> = { text: true, camera: true, effects: true };

  private built?: BuiltScene;
  private environment?: EnvironmentInstance;
  private episodeId?: string;
  private durationSeconds = 0;
  private audioEvents: readonly AudioEvent[] = [];

  constructor() {
    this.camera.position.set(0, 1.4, 7);
  }

  get currentEpisodeId(): string | undefined {
    return this.episodeId;
  }
  get duration(): number {
    return this.durationSeconds;
  }
  get isLoaded(): boolean {
    return this.built !== undefined;
  }

  /** Validate + build an episode, replacing any current one, and settle at t=0. */
  load(raw: unknown, registries: CapabilityRegistries): string {
    const loaded = loadEpisode(raw, registries);
    this.dispose();
    this.built = this.sceneManager.build(loaded, registries, this.scene, this.camera);
    this.environment = this.built.environment;
    this.episodeId = loaded.script.id;
    this.durationSeconds = loaded.script.duration;
    this.audioEvents = loaded.script.timeline.filter((event): event is AudioEvent => event.type === 'audio');
    this.evaluateAt(0);
    return this.episodeId;
  }

  setLayerEnabled(layer: SceneLayer, enabled: boolean): void {
    this.layers[layer] = enabled;
  }
  isLayerEnabled(layer: SceneLayer): boolean {
    return this.layers[layer];
  }

  getEntities(): Entity[] {
    return this.built ? this.built.entities.all() : [];
  }
  getActiveTexts(): readonly ResolvedText[] {
    return this.built ? this.built.timeline.getActiveTexts() : [];
  }
  getAudioEvents(): readonly AudioEvent[] {
    return this.audioEvents;
  }

  /**
   * Resolve deterministic scene state at an absolute time. Pure with respect to
   * `time`: calling it twice with the same `time`, or reaching `time` by any
   * path (fresh, stepping, or after a later time), yields the same scene state.
   * No side effects.
   */
  evaluateAt(time: number): void {
    if (!this.built || !this.environment) return;
    const frame = this.frameAt(time);
    this.built.entities.beginFrame(frame);
    this.built.timeline.evaluatePose(frame);
    this.scene.updateMatrixWorld(true);
    this.environment.update(frame);
    this.built.timeline.evaluateEffects(frame, this.layers);
    this.built.entities.endFrame(frame);
    this.built.timeline.evaluateCameraState(
      frame,
      this.layers.camera,
      this.environment.defaultCamera,
      this.cameraScratch,
    );
    this.applyCameraState(this.cameraScratch);
  }

  /**
   * Pure query: callbacks crossed while moving forward through
   * `(fromTime, toTime]`. The live layer (MindForgeEngine) calls this during
   * forward playback and fires them; it is never invoked from {@link evaluateAt}.
   */
  callbacksInInterval(fromTime: number, toTime: number): { name: string; time: number }[] {
    return this.built ? this.built.timeline.getCallbacksInInterval(fromTime, toTime) : [];
  }

  /** Capture a renderer-free snapshot of meaningful current scene state. */
  snapshot(time: number): SceneSnapshot {
    this.scene.updateMatrixWorld(true);
    this.camera.updateMatrixWorld(true);
    return captureSnapshot({
      time,
      entities: this.getEntities(),
      camera: this.camera,
      activeText: this.getActiveTexts(),
      effects: this.built ? this.built.timeline.getEffectStates() : [],
    });
  }

  dispose(): void {
    if (this.built) {
      this.built.timeline.dispose();
      this.built.entities.dispose();
      this.built.environment.object3d.removeFromParent();
      this.built.environment.dispose();
      this.built = undefined;
      this.environment = undefined;
    }
    for (let i = this.scene.children.length - 1; i >= 0; i--) {
      this.scene.remove(this.scene.children[i]);
    }
    this.episodeId = undefined;
    this.durationSeconds = 0;
    this.audioEvents = [];
  }

  private frameAt(time: number): FrameContext {
    const duration = this.durationSeconds;
    return {
      time,
      delta: 0,
      duration,
      normalizedTime: duration > 0 ? clamp(time / duration, 0, 1) : 0,
    };
  }

  private applyCameraState(state: CameraState): void {
    this.camera.position.copy(state.position);
    this.camera.up.set(0, 1, 0);
    this.camera.lookAt(state.target);
    if (Math.abs(this.camera.fov - state.fov) > 1e-4) {
      this.camera.fov = state.fov;
      this.camera.updateProjectionMatrix();
    }
  }
}
