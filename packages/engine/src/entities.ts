import * as THREE from 'three';
import type { LightEntity, PrimitiveEntity, Vec3 } from '@mindforge/schema';
import type { Entity, EntityKind, FrameContext, PrefabInstance } from './EngineTypes';
import { disposeObject3D } from './DisposalManager';

type Scaleable = number | Vec3 | undefined;

/** Apply optional transform fields from a schema entity onto an Object3D. */
export function applyTransform(
  object: THREE.Object3D,
  transform: {
    position?: Vec3;
    rotation?: Vec3;
    scale?: Scaleable;
    visible?: boolean;
  },
): void {
  if (transform.position) object.position.fromArray(transform.position);
  if (transform.rotation) object.rotation.set(...transform.rotation);
  if (transform.scale !== undefined) {
    if (typeof transform.scale === 'number') {
      object.scale.setScalar(transform.scale);
    } else {
      object.scale.fromArray(transform.scale);
    }
  }
  if (transform.visible !== undefined) object.visible = transform.visible;
}

/** Build faceted procedural geometry. Defaults favour strong silhouettes. */
export function createPrimitiveGeometry(
  geometry: PrimitiveEntity['geometry'],
  size: Scaleable,
): THREE.BufferGeometry {
  const s = typeof size === 'number' ? size : undefined;
  const v = Array.isArray(size) ? size : undefined;
  switch (geometry) {
    case 'box':
      return new THREE.BoxGeometry(v?.[0] ?? s ?? 1, v?.[1] ?? s ?? 1, v?.[2] ?? s ?? 1);
    case 'sphere':
      return new THREE.SphereGeometry(s ?? v?.[0] ?? 0.5, 24, 16);
    case 'icosahedron':
      return new THREE.IcosahedronGeometry(s ?? v?.[0] ?? 0.5, 0);
    case 'cylinder':
      return new THREE.CylinderGeometry(v?.[0] ?? s ?? 0.5, v?.[1] ?? s ?? 0.5, v?.[2] ?? 1, 24);
    case 'cone':
      return new THREE.ConeGeometry(s ?? v?.[0] ?? 0.5, v?.[1] ?? 1, 20);
    case 'torus':
      return new THREE.TorusGeometry(v?.[0] ?? s ?? 0.5, v?.[1] ?? 0.15, 16, 32);
    case 'prism':
      // A faceted 6-sided prism reads as "transformation / shard" geometry.
      return new THREE.CylinderGeometry(s ?? v?.[0] ?? 0.5, s ?? v?.[0] ?? 0.5, v?.[1] ?? 1, 6);
    case 'plane':
      return new THREE.PlaneGeometry(v?.[0] ?? s ?? 1, v?.[1] ?? s ?? 1);
    default:
      return new THREE.BoxGeometry(1, 1, 1);
  }
}

abstract class BaseEntity implements Entity {
  abstract readonly kind: EntityKind;
  constructor(
    public readonly id: string,
    public readonly object3d: THREE.Object3D,
  ) {
    this.object3d.name = id;
  }
  getAnchor(_name: string): THREE.Object3D | undefined {
    return undefined;
  }
  anchorNames(): string[] {
    return [];
  }
  dispose(): void {
    disposeObject3D(this.object3d);
    this.object3d.removeFromParent();
  }
}


export class PrefabEntityImpl extends BaseEntity {
  readonly kind = 'prefab' as const;
  readonly animationClips: Readonly<Record<string, THREE.AnimationClip>>;
  private readonly anchors: Readonly<Record<string, THREE.Object3D>>;

  constructor(
    id: string,
    private readonly instance: PrefabInstance,
  ) {
    super(id, instance.object3d);
    this.anchors = instance.anchors ?? {};
    this.animationClips = instance.animationClips ?? {};
  }

  override getAnchor(name: string): THREE.Object3D | undefined {
    return this.anchors[name];
  }

  override anchorNames(): string[] {
    return Object.keys(this.anchors).sort();
  }

  override dispose(): void {
    this.instance.dispose?.();
    super.dispose();
  }
}

export class PrimitiveEntityImpl extends BaseEntity {
  readonly kind = 'primitive' as const;
  constructor(id: string, mesh: THREE.Mesh) {
    super(id, mesh);
  }
}

export class LightEntityImpl extends BaseEntity {
  readonly kind = 'light' as const;
}

/**
 * A group exposes its direct children as anchors keyed by child id, so effects
 * and cameras can target e.g. `machine.core` without importing anything.
 */
export class GroupEntityImpl extends BaseEntity {
  readonly kind = 'group' as const;
  private readonly childAnchors = new Map<string, THREE.Object3D>();

  registerChildAnchor(id: string, object: THREE.Object3D): void {
    this.childAnchors.set(id, object);
  }

  override getAnchor(name: string): THREE.Object3D | undefined {
    return this.childAnchors.get(name);
  }

  override anchorNames(): string[] {
    return [...this.childAnchors.keys()];
  }
}

/** Build a MeshStandardMaterial from generic (palette-authored) content values. */
export function createPrimitiveMaterial(def: PrimitiveEntity): THREE.MeshStandardMaterial {
  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color(def.color ?? '#8a7ca8'),
    roughness: def.roughness ?? 0.55,
    metalness: def.metalness ?? 0.1,
    flatShading: def.flatShading ?? true,
  });
  if (def.emissive) {
    material.emissive = new THREE.Color(def.emissive);
    material.emissiveIntensity = def.emissiveIntensity ?? 1;
  }
  if (def.opacity !== undefined && def.opacity < 1) {
    material.transparent = true;
    material.opacity = def.opacity;
  }
  return material;
}

export function createLight(def: LightEntity): THREE.Light {
  const color = new THREE.Color(def.color ?? '#ffffff');
  const intensity = def.intensity ?? 1;
  switch (def.light) {
    case 'ambient':
      return new THREE.AmbientLight(color, intensity);
    case 'directional':
      return new THREE.DirectionalLight(color, intensity);
    case 'point':
      return new THREE.PointLight(color, intensity, def.distance ?? 0);
    case 'hemisphere':
      return new THREE.HemisphereLight(color, new THREE.Color(def.groundColor ?? '#080312'), intensity);
    default:
      return new THREE.AmbientLight(color, intensity);
  }
}

export const noopFrame = (_ctx: FrameContext): void => {};
