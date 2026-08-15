import * as THREE from 'three';
import type { ActionContext, MotionFactory, MotionInstance } from '@mindforge/engine';
import { readNumber } from '../MotionTypes';
import { readAxis } from './shared';

/**
 * Gentle rotation about an axis. Deliberately slow — the Bibles warn against
 * decorative spinning; `speed` is radians per second (default a slow drift).
 */
export const createSpinMotion: MotionFactory = ({ target, event }): MotionInstance => {
  const object = target.object3d;
  const axis = readAxis(event);
  const base = object.quaternion.clone();
  const tmp = new THREE.Quaternion();
  const speed = readNumber(event.parameters, 'speed', event.intensity ?? 0.6);

  return {
    apply(ctx: ActionContext): void {
      tmp.setFromAxisAngle(axis, ctx.localTime * speed);
      object.quaternion.copy(base).multiply(tmp);
    },
    reset(): void {
      object.quaternion.copy(base);
    },
  };
};
