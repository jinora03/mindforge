import type { Pose, PoseFn, PhaseSample, HumanoidMotionParams } from './MotionTypes';

export interface Keyframe {
  /** Normalised time within the clip, 0..1. */
  t: number;
  joints?: Record<string, [number, number, number]>;
  rootPos?: [number, number, number];
  rootRot?: [number, number, number];
}

/**
 * A reusable motion clip. A clip is ultimately a {@link PoseFn}; it may be
 * authored procedurally or compiled from keyframes. This is the shared
 * "pose keyframes / joint rotations" representation from the Motion Bible.
 */
export class MotionClip {
  private constructor(
    readonly name: string,
    readonly cycleSeconds: number,
    readonly loop: boolean,
    readonly poseFn: PoseFn,
  ) {}

  /** Author a clip with a procedural pose function. */
  static procedural(name: string, cycleSeconds: number, loop: boolean, poseFn: PoseFn): MotionClip {
    return new MotionClip(name, cycleSeconds, loop, poseFn);
  }

  /** Compile a clip from keyframes; interpolated by phase (loop) or progress. */
  static fromKeyframes(
    name: string,
    cycleSeconds: number,
    loop: boolean,
    keyframes: Keyframe[],
  ): MotionClip {
    const keys = [...keyframes].sort((a, b) => a.t - b.t);
    const jointNames = new Set<string>();
    for (const key of keys) {
      for (const joint of Object.keys(key.joints ?? {})) jointNames.add(joint);
    }

    const poseFn: PoseFn = (sample, _params, pose) => {
      const t = loop ? sample.phase : sample.progress;
      const [k0, k1, blend] = surrounding(keys, t);
      for (const joint of jointNames) {
        const a = k0.joints?.[joint] ?? ZERO;
        const b = k1.joints?.[joint] ?? ZERO;
        pose.set(
          joint,
          a[0] + (b[0] - a[0]) * blend,
          a[1] + (b[1] - a[1]) * blend,
          a[2] + (b[2] - a[2]) * blend,
        );
      }
      const rp0 = k0.rootPos ?? ZERO;
      const rp1 = k1.rootPos ?? ZERO;
      const rr0 = k0.rootRot ?? ZERO;
      const rr1 = k1.rootRot ?? ZERO;
      pose.root(
        rp0[0] + (rp1[0] - rp0[0]) * blend,
        rp0[1] + (rp1[1] - rp0[1]) * blend,
        rp0[2] + (rp1[2] - rp0[2]) * blend,
        rr0[0] + (rr1[0] - rr0[0]) * blend,
        rr0[1] + (rr1[1] - rr0[1]) * blend,
        rr0[2] + (rr1[2] - rr0[2]) * blend,
      );
    };

    return new MotionClip(name, cycleSeconds, loop, poseFn);
  }
}

const ZERO: [number, number, number] = [0, 0, 0];

/** Find the two keyframes bracketing `t` and the blend factor between them. */
function surrounding(keys: Keyframe[], t: number): [Keyframe, Keyframe, number] {
  if (keys.length === 0) {
    const empty: Keyframe = { t: 0 };
    return [empty, empty, 0];
  }
  if (t <= keys[0].t) return [keys[0], keys[0], 0];
  const last = keys[keys.length - 1];
  if (t >= last.t) return [last, last, 0];
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i];
    const b = keys[i + 1];
    if (t >= a.t && t <= b.t) {
      const span = b.t - a.t;
      return [a, b, span > 0 ? (t - a.t) / span : 0];
    }
  }
  return [last, last, 0];
}

export type { PoseFn, PhaseSample, HumanoidMotionParams, Pose };
