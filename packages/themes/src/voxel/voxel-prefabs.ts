import * as THREE from 'three';
import type { PrefabFactory, PrefabInstance } from '@mindforge/engine';
import {
  VOXEL_PALETTE,
  createVoxelGlow,
  createVoxelMaterial,
} from './voxel-style';

function block(
  size: [number, number, number],
  material: THREE.Material,
  position: [number, number, number] = [0, 0, 0],
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/** Oversized readable block hand used for external-touch storytelling. */
export const createVoxelExternalHand: PrefabFactory = (): PrefabInstance => {
  const root = new THREE.Group();
  root.name = 'voxel.externalHand';
  const skin = createVoxelMaterial(VOXEL_PALETTE.skin);

  const palm = block([0.18, 0.21, 0.075], skin);
  root.add(palm);

  const fingers = new THREE.Group();
  fingers.name = 'fingers';
  fingers.position.set(0, 0.045, 0.08);
  root.add(fingers);

  const fingerX = [-0.066, -0.022, 0.022, 0.066];
  const fingerLengths = [0.125, 0.145, 0.14, 0.12];
  for (let i = 0; i < fingerX.length; i++) {
    const length = fingerLengths[i];
    const finger = block([0.034, 0.035, length], skin, [fingerX[i], 0, length / 2]);
    finger.rotation.x = -0.08;
    fingers.add(finger);
  }

  const thumb = block([0.04, 0.04, 0.105], skin, [-0.115, -0.025, 0.025]);
  thumb.rotation.y = -0.48;
  root.add(thumb);

  return { object3d: root, anchors: { palm, fingers } };
};

/**
 * Block-built Heat Engine. `core`, `mechanism`, and `shell` remain semantic
 * anchors, so the Heat episode does not know or care about this geometry.
 */
export const createVoxelHeatEngine: PrefabFactory = (): PrefabInstance => {
  const root = new THREE.Group();
  root.name = 'voxel.heatEngine';

  const coreMaterial = createVoxelMaterial('#803E2B', {
    emissive: VOXEL_PALETTE.heat,
    emissiveIntensity: 0.15,
    roughness: 0.58,
  });
  const core = block([0.78, 0.78, 0.78], coreMaterial);
  root.add(core);

  // Bright inset blocks read as hot channels while keeping the core itself the
  // property-animation target used by the episode.
  const channelMaterial = createVoxelMaterial(VOXEL_PALETTE.heatBright, {
    emissive: VOXEL_PALETTE.heat,
    emissiveIntensity: 0.75,
  });
  const channelSpecs: Array<{
    size: [number, number, number];
    position: [number, number, number];
  }> = [
    { size: [0.18, 0.18, 0.81], position: [0, 0, 0] },
    { size: [0.81, 0.18, 0.18], position: [0, 0, 0] },
    { size: [0.18, 0.81, 0.18], position: [0, 0, 0] },
  ];
  for (const spec of channelSpecs) core.add(block(spec.size, channelMaterial, spec.position));

  const mechanism = new THREE.Group();
  mechanism.name = 'mechanism';
  const metal = createVoxelMaterial(VOXEL_PALETTE.metal, { metalness: 0.18, roughness: 0.72 });
  const copper = createVoxelMaterial(VOXEL_PALETTE.copper, { metalness: 0.12, roughness: 0.7 });
  const rotorBars: Array<{
    size: [number, number, number];
    rotation: [number, number, number];
  }> = [
    { size: [1.65, 0.13, 0.13], rotation: [0, 0, 0] },
    { size: [0.13, 1.65, 0.13], rotation: [0, 0, 0] },
    { size: [0.13, 0.13, 1.65], rotation: [0, 0, 0] },
  ];
  for (const spec of rotorBars) {
    const bar = block(spec.size, metal);
    bar.rotation.set(...spec.rotation);
    mechanism.add(bar);
  }
  const pistonPositions: Array<[number, number, number]> = [
    [0.92, 0, 0],
    [-0.92, 0, 0],
    [0, 0.92, 0],
    [0, -0.92, 0],
  ];
  for (const position of pistonPositions) {
    mechanism.add(block([0.28, 0.28, 0.28], copper, position));
  }
  root.add(mechanism);

  const shell = new THREE.Group();
  shell.name = 'shell';
  const shellMaterial = createVoxelMaterial(VOXEL_PALETTE.stone, { roughness: 0.92 });
  const trimMaterial = createVoxelMaterial(VOXEL_PALETTE.stoneLight, { roughness: 0.9 });

  const panelSpecs: Array<{
    offset: [number, number, number];
    size: [number, number, number];
    trim: [number, number, number];
    trimOffset: [number, number, number];
  }> = [
    { offset: [0, 0, 1.08], size: [1.45, 1.45, 0.12], trim: [1.0, 0.16, 0.14], trimOffset: [0, 0.52, 1.15] },
    { offset: [0, 0, -1.08], size: [1.45, 1.45, 0.12], trim: [1.0, 0.16, 0.14], trimOffset: [0, -0.52, -1.15] },
    { offset: [-1.08, 0, 0], size: [0.12, 1.45, 1.45], trim: [0.14, 0.16, 1.0], trimOffset: [-1.15, 0.52, 0] },
    { offset: [1.08, 0, 0], size: [0.12, 1.45, 1.45], trim: [0.14, 0.16, 1.0], trimOffset: [1.15, -0.52, 0] },
  ];

  for (const spec of panelSpecs) {
    const pivot = new THREE.Group();
    pivot.add(block(spec.size, shellMaterial, spec.offset));
    pivot.add(block(spec.trim, trimMaterial, spec.trimOffset));
    shell.add(pivot);
  }
  root.add(shell);

  const base = new THREE.Group();
  base.position.y = -1.08;
  base.add(block([1.8, 0.28, 1.8], metal));
  base.add(block([1.2, 0.12, 1.2], copper, [0, 0.2, 0]));
  root.add(base);

  return { object3d: root, anchors: { core, mechanism, shell } };
};

/** Chunky information token — three offset cubes rather than a glowing shard. */
export const createVoxelInformationShard: PrefabFactory = (): PrefabInstance => {
  const root = new THREE.Group();
  root.name = 'voxel.informationShard';
  const material = createVoxelMaterial(VOXEL_PALETTE.information, {
    emissive: VOXEL_PALETTE.information,
    emissiveIntensity: 0.28,
  });
  root.add(block([0.18, 0.18, 0.18], material, [-0.1, 0.03, 0]));
  root.add(block([0.18, 0.18, 0.18], material, [0.1, -0.03, 0]));
  root.add(block([0.12, 0.12, 0.12], material, [0, 0.14, 0.02]));
  return { object3d: root };
};

/** Theme-owned practical light for character/story emphasis. */
export const createVoxelStoryLight: PrefabFactory = ({ parameters }): PrefabInstance => {
  const intensity = typeof parameters.intensity === 'number' ? parameters.intensity : 8;
  const distance = typeof parameters.distance === 'number' ? parameters.distance : 18;
  const color = parameters.role === 'subject' ? '#FFE2B3' : VOXEL_PALETTE.cream;
  const light = new THREE.PointLight(new THREE.Color(color), intensity, distance, 1.6);
  light.name = 'voxel.storyLight';
  return { object3d: light };
};

/** Optional tiny marker used by future voxel scenes without adding a new semantic id. */
export function createVoxelMarker(color: string): THREE.Group {
  const group = new THREE.Group();
  const material = createVoxelGlow(color, 0.86);
  group.add(block([0.08, 0.08, 0.08], material));
  return group;
}

export const VOXEL_PREFAB_FACTORIES: Record<string, PrefabFactory> = {
  'prefab.externalHand': createVoxelExternalHand,
  'prefab.heatEngine': createVoxelHeatEngine,
  'prefab.informationShard': createVoxelInformationShard,
  'prefab.storyLight': createVoxelStoryLight,
};
