import type { ActionContext, MotionFactory, MotionInstance } from '@mindforge/engine';
import { readNumber } from '../MotionTypes';

const TAU = Math.PI * 2;

/**
 * Curl a group's children around their local X axis (grasp / tickle / grip).
 *
 * Every child starts and ends at its exact base rotation. Earlier versions used
 * a per-finger phase offset inside the cosine itself, which meant some fingers
 * were already curled on the first active frame and snapped when the event
 * ended. The shared pulse below keeps the contact beats clean while a small
 * deterministic amplitude variation prevents the fingers reading as one flap.
 */
export const createCurlMotion: MotionFactory = ({ target, event }): MotionInstance => {
  const children = [...target.object3d.children];
  const base = children.map((child) => child.rotation.x);
  const curls = readNumber(event.parameters, 'curls', 2);
  const amount = readNumber(event.parameters, 'amount', 1.15) * (event.intensity ?? 1);

  return {
    apply(ctx: ActionContext): void {
      children.forEach((child, i) => {
        const pulse = 0.5 - 0.5 * Math.cos(ctx.progress * curls * TAU);
        const character = 0.93 + 0.07 * Math.sin(i * 1.7 + ctx.progress * TAU);
        child.rotation.x = base[i] + amount * pulse * character;
      });
    },
    reset(): void {
      children.forEach((child, i) => {
        child.rotation.x = base[i];
      });
    },
  };
};
