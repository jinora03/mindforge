import * as THREE from 'three';
import type { MotionEvent, ObjectMotionEvent } from '@mindforge/engine';

type AnyMotionEvent = MotionEvent | ObjectMotionEvent;

/** Read an axis vector from an object-motion event (default +Y), normalised. */
export function readAxis(event: AnyMotionEvent): THREE.Vector3 {
  if ('axis' in event && event.axis) {
    return new THREE.Vector3(event.axis[0], event.axis[1], event.axis[2]).normalize();
  }
  return new THREE.Vector3(0, 1, 0);
}

/** Coerce a scalar `from`/`to` value to a number with a fallback. */
export function asNumber(value: number | [number, number, number] | undefined, fallback: number): number {
  return typeof value === 'number' ? value : fallback;
}
