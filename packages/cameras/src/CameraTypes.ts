import * as THREE from 'three';
import type { CameraEvent } from '@mindforge/engine';

/** Read a Vec3 from schema into a THREE.Vector3, with a fallback. */
export function readVec3(
  value: readonly [number, number, number] | undefined,
  fallback: THREE.Vector3,
): THREE.Vector3 {
  return value ? new THREE.Vector3(value[0], value[1], value[2]) : fallback.clone();
}

/** Read a numeric parameter from a camera event's parameters bag. */
export function readNumber(event: CameraEvent, key: string, fallback: number): number {
  const value = event.parameters?.[key];
  return typeof value === 'number' ? value : fallback;
}

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
