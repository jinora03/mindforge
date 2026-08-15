import type { MotionFactory } from '@mindforge/engine';
import { MotionClip } from '../MotionClip';
import { bindHumanoidMotion } from '../MotionPlayer';

const TAU = Math.PI * 2;

/** A calm, never-idle stand: a slow weight shift with a little life in the head. */
export const createIdleMotion: MotionFactory = bindHumanoidMotion(() =>
  MotionClip.procedural('idle', 4.2, true, (sample, _params, pose) => {
    const a = sample.phase * TAU;
    const sway = Math.sin(a);
    pose.set('hips', 0, 0, sway * 0.02);
    pose.set('chest', 0, sway * 0.02, -sway * 0.015);
    pose.set('neck', Math.sin(a + 0.4) * 0.01, 0, 0);
    pose.set('head', 0, Math.sin(a + 0.6) * 0.05, 0);
    pose.set('shoulderLeft', Math.sin(a) * 0.025, 0, 0);
    pose.set('shoulderRight', Math.sin(a + Math.PI) * 0.025, 0, 0);
    pose.root(0, Math.sin(a * 2) * 0.004, 0);
  }),
);
