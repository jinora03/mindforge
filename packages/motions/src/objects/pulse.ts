import * as THREE from 'three';
import type { ActionContext, MotionFactory, MotionInstance } from '@mindforge/engine';
import { readNumber } from '../MotionTypes';

const TAU = Math.PI * 2;

/** Rhythmic scale pulse — emission / heartbeat / activity. Owns scale. */
export const createPulseMotion: MotionFactory = ({ target, event }): MotionInstance => {
  const object = target.object3d;
  const base = object.scale.clone();
  const amplitude = readNumber(event.parameters, 'amplitude', 0.08) * (event.intensity ?? 1);
  const frequency = readNumber(event.parameters, 'frequency', 1);
  const scratch = new THREE.Vector3();

  return {
    apply(ctx: ActionContext): void {
      const s = 1 + Math.sin(ctx.localTime * frequency * TAU) * amplitude;
      object.scale.copy(scratch.copy(base).multiplyScalar(s));
    },
    reset(): void {
      object.scale.copy(base);
    },
  };
};
