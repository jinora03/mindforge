import * as THREE from 'three';
import type { ActionContext, MotionFactory, MotionInstance } from '@mindforge/engine';
import { asNumber, readAxis } from './shared';

/**
 * Separate a group's children along an axis to reveal internal structure. The
 * open amount is driven by finite progress, so seeking is exact. Alternating
 * children move to opposite sides.
 */
export const createSplitMotion: MotionFactory = ({ target, event }): MotionInstance => {
  const object = target.object3d;
  const axis = readAxis(event);
  const children = [...object.children];
  const basePositions = children.map((child) => child.position.clone());
  const from = 'from' in event ? asNumber(event.from, 0) : 0;
  const to = 'to' in event ? asNumber(event.to, 0.6) : 0.6;
  const scratch = new THREE.Vector3();

  return {
    apply(ctx: ActionContext): void {
      const amount = from + (to - from) * ctx.progress;
      children.forEach((child, i) => {
        const side = i % 2 === 0 ? -1 : 1;
        const rank = Math.floor(i / 2) + 1;
        child.position.copy(basePositions[i]).addScaledVector(
          scratch.copy(axis),
          side * amount * rank,
        );
      });
    },
    reset(): void {
      children.forEach((child, i) => child.position.copy(basePositions[i]));
    },
  };
};
