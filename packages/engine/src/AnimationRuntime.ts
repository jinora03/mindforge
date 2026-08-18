import * as THREE from 'three';

/**
 * One compiled authored-clip window. The source clip is semantic and detached
 * from the asset cache; the runtime clones it again so overlapping events never
 * share AnimationAction state.
 */
export interface AnimationTrackEvent {
  readonly id: string;
  readonly at: number;
  readonly duration: number;
  readonly clip: THREE.AnimationClip;
  readonly speed: number;
  readonly loop: boolean;
  readonly startOffset: number;
  readonly blendIn: number;
  readonly blendOut: number;
}

interface BoundAnimationEvent extends AnimationTrackEvent {
  readonly action: THREE.AnimationAction;
}

/**
 * Deterministic authored animation sampler for one entity.
 *
 * This intentionally never advances an AnimationMixer with frame delta. Every
 * evaluation derives clip time and weight from the requested absolute episode
 * time, writes those values onto paused actions, then asks Three.js to sample
 * with `mixer.update(0)`. Seeking forward/backward and fixed-frame export
 * therefore use the exact same path.
 */
export class AnimationTrack {
  private readonly mixer: THREE.AnimationMixer;
  private readonly events: BoundAnimationEvent[];

  constructor(
    private readonly root: THREE.Object3D,
    events: readonly AnimationTrackEvent[],
  ) {
    this.mixer = new THREE.AnimationMixer(root);
    this.events = events.map((event) => {
      // A unique clip/action per event allows explicit overlapping windows to
      // blend deterministically, including two windows that reference the same
      // semantic source clip.
      const clip = event.clip.clone();
      const action = this.mixer.clipAction(clip);
      action.enabled = true;
      action.paused = true;
      action.clampWhenFinished = true;
      action.setLoop(THREE.LoopOnce, 1);
      action.setEffectiveWeight(0);
      action.play();
      return { ...event, clip, action };
    });
  }

  evaluate(time: number): void {
    for (const event of this.events) {
      const rawLocalTime = time - event.at;
      const active = rawLocalTime >= 0 && rawLocalTime <= event.duration;
      const elapsed = event.startOffset + Math.max(0, rawLocalTime) * event.speed;
      event.action.time = sampleClipTime(elapsed, event.clip.duration, event.loop);
      event.action.setEffectiveWeight(active ? eventWeight(rawLocalTime, event) : 0);
    }

    // Zero delta is deliberate. AnimationAction state never owns playback time.
    this.mixer.update(0);
  }

  reset(): void {
    for (const event of this.events) {
      event.action.time = 0;
      event.action.setEffectiveWeight(0);
    }
    this.mixer.update(0);
  }

  dispose(): void {
    this.mixer.stopAllAction();
    this.mixer.uncacheRoot(this.root);
  }
}

/** Natural event length when JSON omits `duration`. */
export function defaultAnimationDuration(
  clip: THREE.AnimationClip,
  options: {
    readonly at: number;
    readonly episodeDuration: number;
    readonly speed: number;
    readonly loop: boolean;
    readonly startOffset: number;
  },
): number {
  if (options.loop) return Math.max(0, options.episodeDuration - options.at);
  const remainingClipTime = Math.max(0, clip.duration - options.startOffset);
  return remainingClipTime / options.speed;
}

function sampleClipTime(elapsed: number, clipDuration: number, loop: boolean): number {
  if (clipDuration <= 0) return 0;
  if (!loop) return Math.min(Math.max(elapsed, 0), clipDuration);
  const wrapped = elapsed % clipDuration;
  return wrapped < 0 ? wrapped + clipDuration : wrapped;
}

function eventWeight(localTime: number, event: AnimationTrackEvent): number {
  const fadeIn = event.blendIn > 0 ? clamp01(localTime / event.blendIn) : 1;
  const remaining = event.duration - localTime;
  const fadeOut = event.blendOut > 0 ? clamp01(remaining / event.blendOut) : 1;
  return Math.min(fadeIn, fadeOut);
}

function clamp01(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}
