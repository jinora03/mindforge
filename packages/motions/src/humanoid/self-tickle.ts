import type { MotionFactory } from '@mindforge/engine';
import { MotionClip } from '../MotionClip';
import { bindHumanoidMotion } from '../MotionPlayer';
import { smoothWindow } from '../MotionTypes';

const TAU = Math.PI * 2;

/**
 * One-handed self-tickle aimed at the canonical right-rib contact point.
 *
 * The base pose is intentionally authored against the shared humanoid joint
 * contract rather than either theme's geometry. Voxel and Toybox keep those
 * joint/anchor relationships compatible, so the right hand lands close to
 * `ribRight` in both themes. `mirror: true` produces the left-side version.
 *
 * The important performance contrast is "clear fingers, calm body": the hand
 * visibly works at the ribs, while the torso and legs stay almost completely
 * relaxed because the touch is predicted.
 */
export const createSelfTickleMotion: MotionFactory = bindHumanoidMotion(() =>
  MotionClip.procedural('selfTickle', 0.48, true, (sample, _params, pose) => {
    const hold = smoothWindow(sample.progress, 0.14, 0.82);
    const contact = smoothWindow(sample.progress, 0.2, 0.9);

    // Three small wrist pulses per cycle. A second harmonic keeps the motion
    // from reading as a metronome while remaining a pure function of time.
    const phase = sample.localTime * (TAU / 0.48);
    const wiggle = Math.sin(phase * 3);
    const secondary = Math.sin(phase * 3 + Math.PI * 0.5);

    // Dominant right hand folds across and up into the right ribs. These angles
    // were tuned against both production rigs so the semantic hand anchor stays
    // close to the semantic rib anchor rather than merely "looking inward".
    pose.set('shoulderRight', 0.4 * hold, -0.04 * hold, 0.35 * hold);
    pose.set('elbowRight', -1.66 * hold, 0.27 * hold, -0.77 * hold);
    pose.set(
      'wristRight',
      (-0.08 + wiggle * 0.1) * contact,
      secondary * 0.035 * contact,
      wiggle * 0.13 * contact,
    );

    // The free arm only acknowledges the action. It does not become a second
    // tickling hand, which keeps the ghost-hand comparison visually unambiguous.
    pose.set('shoulderLeft', -0.08 * hold, 0, 0.08 * hold);
    pose.set('elbowLeft', -0.18 * hold, 0, 0.04 * hold);

    // A tiny glance toward the contact point, but no defensive curl or recoil.
    pose.set('chest', 0.025 * hold, -0.025 * hold, 0);
    pose.set('head', 0.1 * hold, -0.045 * hold + secondary * 0.012 * contact, 0);
  }),
);
