import * as THREE from 'three';
import { PALETTE, type PaletteToken } from '@mindforge/style';
import type { EffectEvent, SceneServices } from '@mindforge/engine';

const UP = new THREE.Vector3(0, 1, 0);

/** Read a numeric parameter from an effect event's parameters bag. */
export function readNumber(event: EffectEvent, key: string, fallback: number): number {
  const value = event.parameters?.[key];
  return typeof value === 'number' ? value : fallback;
}

/** Resolve an effect colour: explicit event colour, else a palette token. */
export function effectColor(event: EffectEvent, fallback: PaletteToken): THREE.Color {
  return new THREE.Color(event.color ?? PALETTE[fallback]);
}

/**
 * Resolve the ordered anchor list an effect should follow: `through` if given,
 * otherwise `[from, to]` filtered to those present.
 */
export function resolveAnchorPath(event: EffectEvent, services: SceneServices): THREE.Object3D[] {
  const refs = event.through ?? [event.from, event.to].filter((r): r is string => Boolean(r));
  return refs.map((ref) => services.resolveAnchor(ref));
}

/** Orient a unit-height +Y cylinder mesh to span from `a` to `b`. */
export function spanCylinder(mesh: THREE.Object3D, a: THREE.Vector3, b: THREE.Vector3): void {
  const dir = _dir.subVectors(b, a);
  const length = dir.length();
  mesh.position.copy(a).addScaledVector(dir, 0.5);
  mesh.scale.y = Math.max(length, 1e-4);
  if (length > 1e-5) {
    _dir.normalize();
    mesh.quaternion.setFromUnitVectors(UP, _dir);
  }
}

/** Sample a world-space point at `t ∈ [0,1]` along an anchor polyline. */
export function samplePath(points: THREE.Vector3[], t: number, out: THREE.Vector3): THREE.Vector3 {
  if (points.length === 0) return out.set(0, 0, 0);
  if (points.length === 1) return out.copy(points[0]);
  const clamped = t <= 0 ? 0 : t >= 1 ? 1 : t;
  const scaled = clamped * (points.length - 1);
  const i = Math.min(points.length - 2, Math.floor(scaled));
  return out.copy(points[i]).lerp(points[i + 1], scaled - i);
}

const _dir = new THREE.Vector3();
