import * as THREE from 'three';
import type { FaceState } from '@mindforge/schema';
import type { Entity, ResolvedText } from './EngineTypes';

/**
 * A structured, renderer-free snapshot of *meaningful* deterministic scene
 * state — the comparison basis for determinism tests and (later) editor
 * inspection. It deliberately captures state, not pixels.
 */
export interface EntitySnapshot {
  /** World-space position. */
  position: number[];
  /** World-space quaternion. */
  quaternion: number[];
  /** Local scale. */
  scale: number[];
  /** The entity's own visibility flag (what visibility events set). */
  visible: boolean;
}

export interface MaterialSnapshot {
  opacity: number;
  emissiveIntensity: number;
  color: number[];
}

export interface SceneSnapshot {
  time: number;
  entities: Record<string, EntitySnapshot>;
  /** `"entityId.anchorName"` → world position. */
  anchors: Record<string, number[]>;
  /** characterId → applied face state. */
  face: Record<string, FaceState>;
  /** primitive entity id → first-material values controlled by the timeline. */
  materials: Record<string, MaterialSnapshot>;
  /** light entity id → intensity. */
  lights: Record<string, number>;
  camera: { position: number[]; quaternion: number[]; fov: number };
  /** Active caption ids at this time. */
  activeText: string[];
  /**
   * effect event id → visibility + world position of the effect root. Position
   * is only meaningful (and only compared) while the effect is visible; a
   * hidden effect's transform is not part of deterministic scene state.
   */
  effects: Record<string, { visible: boolean; position: number[] | null }>;
}

export interface SnapshotInput {
  time: number;
  entities: readonly Entity[];
  camera: THREE.PerspectiveCamera;
  activeText: readonly ResolvedText[];
  effects: readonly { id: string; visible: boolean; position: [number, number, number] }[];
}

const _p = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();

/**
 * Capture a {@link SceneSnapshot}. Assumes world matrices are already current
 * (the runtime refreshes them during evaluation); it still calls
 * `updateWorldMatrix` per read defensively so it is safe to call standalone.
 */
export function captureSnapshot(input: SnapshotInput): SceneSnapshot {
  const entities: Record<string, EntitySnapshot> = {};
  const anchors: Record<string, number[]> = {};
  const face: Record<string, FaceState> = {};
  const materials: Record<string, MaterialSnapshot> = {};
  const lights: Record<string, number> = {};

  for (const entity of input.entities) {
    entity.object3d.updateWorldMatrix(true, false);
    entity.object3d.matrixWorld.decompose(_p, _q, _s);
    entities[entity.id] = {
      position: [_p.x, _p.y, _p.z],
      quaternion: [_q.x, _q.y, _q.z, _q.w],
      scale: [entity.object3d.scale.x, entity.object3d.scale.y, entity.object3d.scale.z],
      visible: entity.object3d.visible,
    };

    for (const name of entity.anchorNames()) {
      const anchor = entity.getAnchor(name);
      if (anchor) {
        anchor.getWorldPosition(_p);
        anchors[`${entity.id}.${name}`] = [_p.x, _p.y, _p.z];
      }
    }

    const applied = entity.getFace?.();
    if (applied) face[entity.id] = applied;

    if (entity.kind === 'primitive') {
      const material = firstMaterial(entity.object3d);
      if (material) materials[entity.id] = readMaterial(material);
    }
    if (entity.kind === 'light') {
      lights[entity.id] = firstLightIntensity(entity.object3d);
    }
  }

  input.camera.updateWorldMatrix(true, false);
  input.camera.matrixWorld.decompose(_p, _q, _s);

  const effects: Record<string, { visible: boolean; position: number[] | null }> = {};
  for (const effect of input.effects) {
    effects[effect.id] = {
      visible: effect.visible,
      position: effect.visible ? [...effect.position] : null,
    };
  }

  return {
    time: input.time,
    entities,
    anchors,
    face,
    materials,
    lights,
    camera: {
      position: [_p.x, _p.y, _p.z],
      quaternion: [_q.x, _q.y, _q.z, _q.w],
      fov: input.camera.fov,
    },
    activeText: input.activeText.map((t) => t.id),
    effects,
  };
}

function firstMaterial(object: THREE.Object3D): THREE.Material | undefined {
  let found: THREE.Material | undefined;
  object.traverse((node) => {
    if (found) return;
    const mesh = node as THREE.Mesh;
    if (mesh.material) found = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
  });
  return found;
}

function readMaterial(material: THREE.Material): MaterialSnapshot {
  const standard = material as THREE.MeshStandardMaterial;
  const color = standard.color ?? new THREE.Color(1, 1, 1);
  return {
    opacity: material.opacity,
    emissiveIntensity: standard.emissiveIntensity ?? 0,
    color: [color.r, color.g, color.b],
  };
}

function firstLightIntensity(object: THREE.Object3D): number {
  let intensity = 0;
  object.traverse((node) => {
    const light = node as THREE.Light;
    if (light.isLight) intensity = light.intensity;
  });
  return intensity;
}
