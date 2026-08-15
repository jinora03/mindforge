import type { ActionContext, MotionFactory, MotionInstance } from '@mindforge/engine';
import { readNumber } from '../MotionTypes';

const TAU = Math.PI * 2;

/**
 * Curl a group's children around their local X axis, oscillating `curls` times
 * across the window (grasp / tickle / grip). Each child gets a small phase
 * offset so the curl reads as fingers, not one rigid flap. Deterministic:
 * driven by finite progress.
 */
export const createCurlMotion: MotionFactory = ({ target, event }): MotionInstance => {
  const children = [...target.object3d.children];
  const base = children.map((child) => child.rotation.x);
  const curls = readNumber(event.parameters, 'curls', 2);
  const amount = readNumber(event.parameters, 'amount', 1.15) * (event.intensity ?? 1);

  return {
    apply(ctx: ActionContext): void {
      children.forEach((child, i) => {
        const phase = ctx.progress * curls * TAU + i * 0.6;
        const wave = 0.5 - 0.5 * Math.cos(phase); // 0 → 1 → 0 per curl
        child.rotation.x = base[i] + amount * wave;
      });
    },
    reset(): void {
      children.forEach((child, i) => {
        child.rotation.x = base[i];
      });
    },
  };
};
