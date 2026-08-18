import type { MotionFactory } from '@mindforge/engine';
import { MotionClip } from '../MotionClip';
import { bindHumanoidMotion } from '../MotionPlayer';
import { smoothWindow } from '../MotionTypes';

const TAU = Math.PI * 2;

/**
 * Reusable two-handed rubbing action for balloons, cloth, warming hands, or
 * friction demonstrations. The motion is deterministic and returns smoothly
 * to rest inside the event window so seeking/restarts never leave a held pose.
 */
export const createRubMotion: MotionFactory = bindHumanoidMotion(() =>
  MotionClip.procedural('rub', 0.72, false, (sample, _params, pose) => {
    const envelope = smoothWindow(sample.progress, 0.12, 0.88);
    const rhythm = Math.sin(sample.phase * TAU) * envelope;
    const counter = Math.sin(sample.phase * TAU + Math.PI) * envelope;

    // Bring both hands in front of the chest, then alternate them vertically.
    pose.set('shoulderRight', -0.92 * envelope + rhythm * 0.07, -0.12 * envelope, -0.28 * envelope);
    pose.set('elbowRight', -1.12 * envelope + rhythm * 0.16, 0, -0.08 * envelope);
    pose.set('wristRight', 0.08 * envelope + rhythm * 0.11, 0, 0.04 * rhythm);

    pose.set('shoulderLeft', -0.84 * envelope + counter * 0.07, 0.1 * envelope, 0.24 * envelope);
    pose.set('elbowLeft', -1.04 * envelope + counter * 0.16, 0, 0.08 * envelope);
    pose.set('wristLeft', 0.06 * envelope + counter * 0.11, 0, -0.04 * rhythm);

    // Small torso/head participation keeps the action from reading as detached arms.
    pose.set('chest', -0.06 * envelope, -0.08 * envelope + rhythm * 0.018, 0);
    pose.set('spine', -0.025 * envelope, -0.035 * envelope, 0);
    pose.set('head', -0.12 * envelope, -0.07 * envelope + rhythm * 0.02, 0.02 * rhythm);
    pose.root(0, -0.012 * Math.abs(rhythm), 0.018 * envelope);
  }),
);
