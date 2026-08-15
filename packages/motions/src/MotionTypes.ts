import type { ActionContext } from '@mindforge/engine';

/** Resolved parameters shared by humanoid motions. */
export interface HumanoidMotionParams {
  intensity: number;
  speed: number;
  mirror: boolean;
}

/** A phase sample derived from playback time for a (possibly looping) clip. */
export interface PhaseSample {
  /** Clamped local time within the event window. */
  localTime: number;
  /** Overall progress 0..1 across the window (for finite motions). */
  progress: number;
  /** Phase within one cycle, 0..1 (for looping motions). */
  phase: number;
}

/**
 * A reusable, mutable pose: additive Euler offsets per joint plus root
 * offsets. Reused across frames to avoid per-frame allocation.
 */
export class Pose {
  readonly joints = new Map<string, [number, number, number]>();
  readonly rootPos: [number, number, number] = [0, 0, 0];
  readonly rootRot: [number, number, number] = [0, 0, 0];

  clear(): void {
    this.joints.clear();
    this.rootPos[0] = this.rootPos[1] = this.rootPos[2] = 0;
    this.rootRot[0] = this.rootRot[1] = this.rootRot[2] = 0;
  }

  /** Set a joint's additive Euler offset (radians). */
  set(joint: string, x: number, y: number, z: number): void {
    const existing = this.joints.get(joint);
    if (existing) {
      existing[0] = x;
      existing[1] = y;
      existing[2] = z;
    } else {
      this.joints.set(joint, [x, y, z]);
    }
  }

  root(px: number, py: number, pz: number, rx = 0, ry = 0, rz = 0): void {
    this.rootPos[0] = px;
    this.rootPos[1] = py;
    this.rootPos[2] = pz;
    this.rootRot[0] = rx;
    this.rootRot[1] = ry;
    this.rootRot[2] = rz;
  }
}

/** Fill a pose for the given phase. Clip poseFns implement this signature. */
export type PoseFn = (sample: PhaseSample, params: HumanoidMotionParams, pose: Pose) => void;

/** Read a numeric parameter from an event parameters bag with a default. */
export function readNumber(
  params: Readonly<Record<string, unknown>> | undefined,
  key: string,
  fallback: number,
): number {
  const value = params?.[key];
  return typeof value === 'number' ? value : fallback;
}

/** Build the phase sample for a window from its {@link ActionContext}. */
export function samplePhase(ctx: ActionContext, cycleSeconds: number, speed: number): PhaseSample {
  const localTime = ctx.localTime * speed;
  const cycles = cycleSeconds > 0 ? localTime / cycleSeconds : 0;
  return {
    localTime,
    progress: ctx.progress,
    phase: cycles - Math.floor(cycles),
  };
}
