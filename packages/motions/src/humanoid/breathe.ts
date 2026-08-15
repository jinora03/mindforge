import type { MotionFactory } from '@mindforge/engine';
import { MotionClip } from '../MotionClip';
import { bindHumanoidMotion } from '../MotionPlayer';

const TAU = Math.PI * 2;

/** Additive secondary motion: a slow breath layered over any base pose. */
export const createBreatheMotion: MotionFactory = bindHumanoidMotion(() =>
  MotionClip.procedural('breathe', 3.6, true, (sample, _params, pose) => {
    const a = sample.phase * TAU;
    const inhale = Math.sin(a);
    pose.set('chest', -inhale * 0.03, 0, 0);
    pose.set('shoulderLeft', 0, 0, inhale * 0.02);
    pose.set('shoulderRight', 0, 0, -inhale * 0.02);
    pose.set('head', inhale * 0.012, 0, 0);
    pose.root(0, inhale * 0.004, 0);
  }),
);
