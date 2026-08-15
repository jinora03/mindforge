import type { MotionFactory } from '@mindforge/engine';
import { MotionClip } from '../MotionClip';
import { bindHumanoidMotion } from '../MotionPlayer';

/**
 * Reach one arm forward and up, with a small lean and gaze toward the target.
 * Authored as keyframes (finite, non-looping) to exercise the keyframe path.
 * Mirror the event to reach with the left arm instead.
 */
export const createReachMotion: MotionFactory = bindHumanoidMotion(() =>
  MotionClip.fromKeyframes('reach', 1, false, [
    { t: 0, joints: {} },
    {
      t: 0.6,
      joints: {
        shoulderRight: [-1.15, 0, -0.15],
        elbowRight: [-0.35, 0, 0],
        wristRight: [0.1, 0, 0],
        chest: [0, -0.12, 0],
        head: [-0.08, -0.1, 0],
      },
    },
    {
      t: 1,
      joints: {
        shoulderRight: [-1.25, 0, -0.2],
        elbowRight: [-0.2, 0, 0],
        chest: [0, -0.14, 0],
        head: [-0.06, -0.12, 0],
      },
    },
  ]),
);
