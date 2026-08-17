import type { MotionFactory } from '@mindforge/engine';
import { MotionClip } from '../MotionClip';
import { bindHumanoidMotion } from '../MotionPlayer';
import { clamp01, smoothWindow, smoothstep01 } from '../MotionTypes';

const TAU = Math.PI * 2;

/**
 * A single playful recoil followed by a short, damped laugh-squirm.
 *
 * This is deliberately NOT a looping "shake". The external touch lands first;
 * the body then compresses away from the contacted right rib, rebounds once or
 * twice, and settles. Mirroring makes the same reusable performance work for a
 * left-side contact without episode-specific motion code.
 */
export const createSurprisedSquirmMotion: MotionFactory = bindHumanoidMotion(() =>
  MotionClip.procedural('surprisedSquirm', 1, false, (sample, _params, pose) => {
    const t = clamp01(sample.progress);
    const envelope = smoothWindow(t, 0.1, 0.82);

    // One readable primary flinch. Peak is early so cause -> reaction is clear.
    const recoilT = clamp01(t / 0.34);
    const recoil = Math.sin(Math.PI * recoilT) * (1 - smoothstep01(clamp01((t - 0.28) / 0.2)));

    // Then a small damped laugh rhythm — enough life to read as playful without
    // turning into repeated procedural shaking.
    const laughT = Math.max(0, t - 0.2);
    const laughDecay = Math.max(0, 1 - laughT / 0.72);
    const laugh = Math.sin(laughT * TAU * 2.15) * laughDecay * envelope;
    const bounce = Math.abs(Math.sin(laughT * TAU * 2.15)) * laughDecay * envelope;

    // Torso turns away from the contacted right side and curls inward briefly.
    pose.set('chest', (0.18 * recoil + 0.055 * bounce) * envelope, -0.28 * recoil + laugh * 0.08, -0.06 * recoil);
    pose.set('spine', (0.1 * recoil + 0.03 * bounce) * envelope, -0.12 * recoil + laugh * 0.04, 0);
    pose.set('hips', 0, 0.14 * recoil - laugh * 0.035, -0.055 * recoil);

    // Contact-side shoulder compresses harder; both arms come in defensively,
    // but asymmetry keeps the performance organic and preserves contact logic.
    pose.set('shoulderRight', -0.5 * recoil - 0.18 * envelope, 0.04 * recoil, -0.42 * recoil - laugh * 0.06);
    pose.set('elbowRight', -1.42 * recoil - 0.42 * envelope, 0, -0.08 * recoil);
    pose.set('wristRight', -0.12 * recoil, 0, -0.18 * recoil + laugh * 0.1);

    pose.set('shoulderLeft', -0.3 * recoil - 0.1 * envelope, 0, 0.24 * recoil + laugh * 0.045);
    pose.set('elbowLeft', -0.95 * recoil - 0.28 * envelope, 0, 0.05 * recoil);
    pose.set('wristLeft', -0.06 * recoil, 0, 0.1 * recoil - laugh * 0.07);

    // Knees compress on the initial flinch, then give two small laugh bounces.
    pose.set('hipRight', (-0.2 * recoil - 0.04 * bounce) * envelope, 0, -0.045 * recoil);
    pose.set('hipLeft', (-0.14 * recoil - 0.025 * bounce) * envelope, 0, 0.035 * recoil);
    pose.set('kneeRight', (0.62 * recoil + 0.14 * bounce) * envelope, 0, 0);
    pose.set('kneeLeft', (0.48 * recoil + 0.1 * bounce) * envelope, 0, 0);

    pose.set('neck', -0.09 * recoil, 0, 0.035 * recoil);
    pose.set('head', -0.16 * recoil + bounce * 0.035, -0.08 * recoil + laugh * 0.055, 0.16 * recoil + laugh * 0.06);

    // Grounded drop + small move away from the touched side. The envelope makes
    // the final pose return continuously to rest instead of popping at window end.
    pose.root(
      -0.045 * recoil + laugh * 0.008,
      -0.09 * recoil - bounce * 0.018,
      -0.018 * recoil,
      0,
      -0.045 * recoil,
      -0.045 * recoil,
    );
  }),
);
