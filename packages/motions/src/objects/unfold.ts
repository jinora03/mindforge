import type { ActionContext, MotionFactory, MotionInstance } from '@mindforge/engine';
import { asNumber } from './shared';

/**
 * Unfold a group's children like opening panels. The fold angles are
 * intentionally *asymmetric* (alternating axes and magnitudes) so the reveal
 * reads as a mechanism, not a symmetric flower. Driven by finite progress.
 */
export const createUnfoldMotion: MotionFactory = ({ target, event }): MotionInstance => {
  const object = target.object3d;
  const children = [...object.children];
  const baseRotations = children.map((child) => child.rotation.clone());
  const full = 'to' in event ? asNumber(event.to, Math.PI / 2) : Math.PI / 2;

  return {
    apply(ctx: ActionContext): void {
      const open = full * ctx.progress;
      children.forEach((child, i) => {
        const base = baseRotations[i];
        const magnitude = open * (0.55 + 0.45 * ((i % 3) / 2));
        const sign = i % 2 === 0 ? 1 : -1;
        if (i % 2 === 0) {
          child.rotation.set(base.x + magnitude * sign, base.y, base.z);
        } else {
          child.rotation.set(base.x, base.y, base.z + magnitude * sign);
        }
      });
    },
    reset(): void {
      children.forEach((child, i) => child.rotation.copy(baseRotations[i]));
    },
  };
};
