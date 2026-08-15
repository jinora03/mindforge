import type { MotionFactory } from '@mindforge/engine';
import { MotionClip } from '../MotionClip';
import { bindHumanoidMotion } from '../MotionPlayer';

const TAU = Math.PI * 2;

/**
 * A stationary walk cycle with opposing arm/leg swing, hip sway, torso
 * counter-rotation, a two-step vertical bob, and knee bend on the swing leg to
 * reduce obvious foot sliding. One cycle = two steps.
 */
export const createWalkMotion: MotionFactory = bindHumanoidMotion(
  () =>
    MotionClip.procedural('walk', 1.0, true, (sample, _params, pose) => {
      const a = sample.phase * TAU;
      const swing = Math.sin(a);
      const opposite = Math.sin(a + Math.PI);

      // Legs: opposing hip swing; knees bend as each leg swings forward.
      pose.set('hipLeft', swing * 0.5, 0, 0);
      pose.set('hipRight', opposite * 0.5, 0, 0);
      pose.set('kneeLeft', Math.max(0, -swing) * 0.7, 0, 0);
      pose.set('kneeRight', Math.max(0, -opposite) * 0.7, 0, 0);
      pose.set('ankleLeft', swing * 0.15, 0, 0);
      pose.set('ankleRight', opposite * 0.15, 0, 0);

      // Arms oppose the legs.
      pose.set('shoulderLeft', opposite * 0.42, 0, 0);
      pose.set('shoulderRight', swing * 0.42, 0, 0);
      pose.set('elbowLeft', -0.25 - Math.max(0, opposite) * 0.2, 0, 0);
      pose.set('elbowRight', -0.25 - Math.max(0, swing) * 0.2, 0, 0);

      // Hips sway + pelvis rotation; torso counter-rotates.
      pose.set('hips', 0, swing * 0.08, swing * 0.05);
      pose.set('chest', 0, -swing * 0.12, 0);
      pose.set('head', 0, swing * 0.03, 0);

      // Two-step vertical bob.
      pose.root(0, Math.abs(Math.sin(a)) * 0.03, 0);
    }),
  { intensity: 1 },
);
