import type { MotionFactory } from '@mindforge/engine';
import { MotionClip } from '../MotionClip';
import { bindHumanoidMotion } from '../MotionPlayer';
import { smoothWindow } from '../MotionTypes';

/**
 * Reach one arm forward/up with a readable shoulder-led gesture, gaze, and
 * weight shift. The pose eases back to neutral inside the event window so a
 * finished reach never pops to the rest pose on the following frame.
 * Mirror the event to reach with the left arm instead.
 */
export const createReachMotion: MotionFactory = bindHumanoidMotion(() =>
  MotionClip.procedural('reach', 1, false, (sample, _params, pose) => {
    const amount = smoothWindow(sample.progress, 0.28, 0.76);

    pose.set('shoulderRight', -1.2 * amount, -0.08 * amount, -0.18 * amount);
    pose.set('elbowRight', -0.3 * amount, 0, -0.04 * amount);
    pose.set('wristRight', 0.11 * amount, 0, 0.03 * amount);

    // The rest of the body supports the gesture instead of staying mannequin-flat.
    pose.set('chest', -0.03 * amount, -0.13 * amount, -0.025 * amount);
    pose.set('spine', -0.015 * amount, -0.055 * amount, 0);
    pose.set('head', -0.1 * amount, -0.11 * amount, 0.025 * amount);
    pose.set('hipRight', -0.035 * amount, 0, 0);
    pose.set('kneeRight', 0.055 * amount, 0, 0);
    pose.root(0.015 * amount, -0.008 * amount, 0.012 * amount);
  }),
);
