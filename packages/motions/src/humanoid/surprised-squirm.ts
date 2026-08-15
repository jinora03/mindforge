import type { MotionFactory } from '@mindforge/engine';
import { MotionClip } from '../MotionClip';
import { bindHumanoidMotion } from '../MotionPlayer';

const TAU = Math.PI * 2;

/**
 * A playful, involuntary squirm — the reaction to an *external* touch the brain
 * could not predict. It reads as a delighted flinch, not pain: torso twist,
 * shoulder compression, bent knees, defensive arm pull-in, and a head tuck,
 * all on an eased onset so it never snaps like an electric jolt.
 */
export const createSurprisedSquirmMotion: MotionFactory = bindHumanoidMotion(() =>
  MotionClip.procedural('surprisedSquirm', 0.52, true, (sample, _params, pose) => {
    const a = sample.phase * TAU;
    const twist = Math.sin(a);
    const wobble = Math.sin(a * 1.4);
    // Ease the whole reaction in over ~0.28s so it is a flinch, not a jolt.
    const onset = Math.min(1, sample.localTime / 0.28);

    // Torso twists and curls inward defensively.
    pose.set('chest', 0.12 * onset, twist * 0.26 * onset, 0);
    pose.set('spine', 0.06 * onset, twist * 0.12 * onset, 0);
    pose.set('hips', 0, -twist * 0.14 * onset, twist * 0.05 * onset);

    // Shoulders compress up and in; arms pull in to guard the ribs.
    pose.set('shoulderLeft', -0.35 * onset, 0, 0.34 * onset + wobble * 0.07);
    pose.set('shoulderRight', -0.35 * onset, 0, -0.34 * onset - wobble * 0.07);
    pose.set('elbowLeft', -1.25 * onset, 0, 0);
    pose.set('elbowRight', -1.25 * onset, 0, 0);
    pose.set('wristLeft', 0, 0, wobble * 0.2 * onset);
    pose.set('wristRight', 0, 0, -wobble * 0.2 * onset);

    // Knees bend — the whole body recoils and drops slightly.
    pose.set('kneeLeft', (0.45 + wobble * 0.12) * onset, 0, 0);
    pose.set('kneeRight', (0.45 - wobble * 0.12) * onset, 0, 0);
    pose.set('hipLeft', -0.12 * onset, 0, 0.05 * onset);
    pose.set('hipRight', -0.12 * onset, 0, -0.05 * onset);

    // Head tucks and wobbles with the laugh.
    pose.set('neck', -0.06 * onset, 0, 0);
    pose.set('head', -0.1 * onset, twist * 0.06 * onset, wobble * 0.14 * onset);

    // Recoil: drop from the knee bend plus a light bounce and side sway.
    pose.root(twist * 0.03 * onset, (-0.06 + Math.abs(Math.sin(a * 2)) * 0.03) * onset, 0);
  }),
);
