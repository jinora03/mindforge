import type { MotionFactory } from '@mindforge/engine';
import { MotionClip } from '../MotionClip';
import { bindHumanoidMotion } from '../MotionPlayer';

const TAU = Math.PI * 2;

/**
 * The Observer brings their hands to their own ribs and wiggles the fingers to
 * tickle themselves. The wiggle is fast and clearly visible — but because the
 * brain predicts the touch, the *body* stays relaxed and the reaction never
 * arrives. The failure is the point.
 */
export const createSelfTickleMotion: MotionFactory = bindHumanoidMotion(() =>
  MotionClip.procedural('selfTickle', 0.5, true, (sample, _params, pose) => {
    const fast = sample.phase * TAU;
    const wiggle = Math.sin(fast * 3); // fast finger-scale wiggle
    const settle = Math.min(1, sample.localTime / 0.7); // ease hands inward once

    // Bring both forearms in against the ribs.
    pose.set('shoulderLeft', -0.55 * settle, 0, 0.38 * settle);
    pose.set('shoulderRight', -0.55 * settle, 0, -0.38 * settle);
    pose.set('elbowLeft', -1.55 * settle, 0, wiggle * 0.08 * settle);
    pose.set('elbowRight', -1.55 * settle, 0, -wiggle * 0.08 * settle);

    // Clear, fast wrist/finger wiggle — the tickling motion.
    pose.set('wristLeft', wiggle * 0.18 * settle, 0, wiggle * 0.32 * settle);
    pose.set('wristRight', -wiggle * 0.18 * settle, 0, -wiggle * 0.32 * settle);

    // A slight curl and downward glance; the body remains calm and unbothered.
    pose.set('chest', 0.05 * settle, 0, 0);
    pose.set('head', 0.13 * settle, Math.sin(fast * 0.5) * 0.02, 0);
  }),
);
