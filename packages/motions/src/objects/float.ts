import type { ActionContext, MotionFactory, MotionInstance } from '@mindforge/engine';
import { readNumber } from '../MotionTypes';

const TAU = Math.PI * 2;

/** Buoyant vertical hover. Owns only the object's Y position so it composes. */
export const createFloatMotion: MotionFactory = ({ target, event }): MotionInstance => {
  const object = target.object3d;
  const baseY = object.position.y;
  const amplitude = readNumber(event.parameters, 'amplitude', 0.12) * (event.intensity ?? 1);
  const frequency = readNumber(event.parameters, 'frequency', 0.5);

  return {
    apply(ctx: ActionContext): void {
      object.position.y = baseY + Math.sin(ctx.localTime * frequency * TAU) * amplitude;
    },
    reset(): void {
      object.position.y = baseY;
    },
  };
};
