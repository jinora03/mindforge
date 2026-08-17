import { VOXEL_PRODUCTION_PREFAB_FACTORIES } from './voxel-production-prefabs';
import * as THREE from 'three';
import type { PrefabFactory, PrefabInstance, VisualTone } from '@mindforge/engine';
import {
  BLOCK,
  VOXEL_PALETTE,
  createBlockMaterial,
  createVoxelGlow,
  createVoxelMaterial,
  voxelToneColor,
  type BlockTextureId,
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

function textured(
  texture: BlockTextureId,
  size: [number, number, number],
  options: Parameters<typeof createBlockMaterial>[1] = {},
): THREE.MeshStandardMaterial {
  return createBlockMaterial(texture, { ...options, size });
}

/**
 * Oversized block hand used for external-touch storytelling. Fingers are
 * quarter-BLOCK bars so the hand matches the Observer's own limb thickness —
 * a thin, tapered hand next to a cubic character is one of the fastest ways to
 * break the illusion that both belong to one world.
 */
export const createVoxelExternalHand: PrefabFactory = (): PrefabInstance => {
  const root = new THREE.Group();
  root.name = 'voxel.externalHand';

  const palmSize: [number, number, number] = [0.26, 0.28, 0.1];
  const palm = block(palmSize, textured('skin', palmSize));
  root.add(palm);

  // Cuff reads as "someone else's arm" without modelling the whole body.
  const cuffSize: [number, number, number] = [0.3, 0.1, 0.13];
  root.add(block(cuffSize, textured('cloth', cuffSize), [0, -0.17, -0.01]));

  const fingers = new THREE.Group();
  fingers.name = 'fingers';
  fingers.position.set(0, 0.07, 0.09);
  root.add(fingers);

  const fingerX = [-0.088, -0.03, 0.03, 0.088];
  const fingerLengths = [0.16, 0.19, 0.185, 0.155];
  const contact = new THREE.Object3D();
  contact.name = 'contact';
  for (let i = 0; i < fingerX.length; i++) {
    const length = fingerLengths[i];
    const size: [number, number, number] = [0.05, 0.05, length];

    // The motion system curls direct children of the `fingers` anchor. Give
    // every finger a pivot at its knuckle rather than rotating a mesh around
    // its centre, otherwise the tip slides through the palm during contact.
    const finger = new THREE.Group();
    finger.position.set(fingerX[i], 0, 0);
    finger.rotation.x = -0.06;
    finger.add(block(size, textured('skin', size), [0, 0, length / 2]));

    if (i === 2) {
      contact.position.set(0, 0, length);
      finger.add(contact);
    }
    fingers.add(finger);
  }

  const thumbSize: [number, number, number] = [0.055, 0.055, 0.14];
  const thumb = block(thumbSize, textured('skin', thumbSize), [-0.155, -0.035, 0.035]);
  thumb.rotation.y = -0.5;
  root.add(thumb);

  return { object3d: root, anchors: { palm, fingers, contact } };
};

/**
 * Block-built Heat Engine — a furnace-machine rather than a generic sci-fi
 * core. `core`, `mechanism`, and `shell` remain semantic anchors, so the Heat
 * episode still knows nothing about this geometry.
 *
 * Every material under `core` is created fresh here on purpose: the episode
 * animates `machine.core`'s `emissiveIntensity`, and the Engine's property
 * track walks the whole subtree, so a shared/cached material would leak the
 * heat animation into unrelated objects.
 */
export const createVoxelHeatEngine: PrefabFactory = (): PrefabInstance => {
  const root = new THREE.Group();
  root.name = 'voxel.heatEngine';

  // -- core -----------------------------------------------------------------
  const coreSize: [number, number, number] = [BLOCK * 0.8, BLOCK * 0.8, BLOCK * 0.8];
  const coreMaterial = createVoxelMaterial('#FFFFFF', {
    texture: 'magma',
    size: coreSize,
    emissive: VOXEL_PALETTE.heat,
    emissiveIntensity: 0.15,
    roughness: 0.62,
  });
  const core = block(coreSize, coreMaterial);
  core.name = 'core';
  root.add(core);

  // Bright inset channels read as hot seams. They are children of `core`, so
  // they heat and cool with it under the episode's property track.
  const channelMaterial = createVoxelMaterial(VOXEL_PALETTE.heatBright, {
    pixelVariation: 0,
    emissive: VOXEL_PALETTE.heat,
    emissiveIntensity: 0.15,
  });
  const channels: Array<[number, number, number]> = [
    [0.16, 0.16, 0.83],
    [0.83, 0.16, 0.16],
    [0.16, 0.83, 0.16],
  ];
  for (const size of channels) core.add(block(size, channelMaterial));

  // -- mechanism ------------------------------------------------------------
  const mechanism = new THREE.Group();
  mechanism.name = 'mechanism';
  const barSize: [number, number, number] = [1.7, 0.16, 0.16];
  const barMaterial = textured('metal', barSize);
  for (const size of [
    [1.7, 0.16, 0.16],
    [0.16, 1.7, 0.16],
    [0.16, 0.16, 1.7],
  ] as Array<[number, number, number]>) {
    mechanism.add(block(size, barMaterial));
  }
  const pistonSize: [number, number, number] = [0.32, 0.32, 0.32];
  const pistonMaterial = createVoxelMaterial(VOXEL_PALETTE.copper, {
    texture: 'metalPlate',
    size: pistonSize,
    roughness: 0.68,
    metalness: 0.2,
  });
  for (const position of [
    [0.95, 0, 0],
    [-0.95, 0, 0],
    [0, 0.95, 0],
    [0, -0.95, 0],
  ] as Array<[number, number, number]>) {
    mechanism.add(block(pistonSize, pistonMaterial, position));
  }
  root.add(mechanism);

  // -- shell ----------------------------------------------------------------
  const shell = new THREE.Group();
  shell.name = 'shell';
  const panelSize: [number, number, number] = [1.5, 1.5, 0.14];
  const sidePanelSize: [number, number, number] = [0.14, 1.5, 1.5];
  const panelMaterial = textured('forgeBrick', panelSize);
  const sidePanelMaterial = textured('forgeBrick', sidePanelSize);
  const trimSize: [number, number, number] = [1.05, 0.18, 0.16];
  const trimMaterial = textured('metalPlate', trimSize);
  const sideTrimSize: [number, number, number] = [0.16, 0.18, 1.05];
  const sideTrimMaterial = textured('metalPlate', sideTrimSize);

  const panels: Array<{
    offset: [number, number, number];
    size: [number, number, number];
    material: THREE.Material;
    trim: [number, number, number];
    trimOffset: [number, number, number];
    trimMaterial: THREE.Material;
  }> = [
    { offset: [0, 0, 1.08], size: panelSize, material: panelMaterial, trim: trimSize, trimOffset: [0, 0.55, 1.17], trimMaterial },
    { offset: [0, 0, -1.08], size: panelSize, material: panelMaterial, trim: trimSize, trimOffset: [0, -0.55, -1.17], trimMaterial },
    { offset: [-1.08, 0, 0], size: sidePanelSize, material: sidePanelMaterial, trim: sideTrimSize, trimOffset: [-1.17, 0.55, 0], trimMaterial: sideTrimMaterial },
    { offset: [1.08, 0, 0], size: sidePanelSize, material: sidePanelMaterial, trim: sideTrimSize, trimOffset: [1.17, -0.55, 0], trimMaterial: sideTrimMaterial },
  ];

  for (const spec of panels) {
    const pivot = new THREE.Group();
    pivot.add(block(spec.size, spec.material, spec.offset));
    pivot.add(block(spec.trim, spec.trimMaterial, spec.trimOffset));
    shell.add(pivot);
  }
  root.add(shell);

  // -- base -----------------------------------------------------------------
  const base = new THREE.Group();
  base.position.y = -1.1;
  const plinthSize: [number, number, number] = [2, 0.3, 2];
  base.add(block(plinthSize, textured('stoneBrick', plinthSize)));
  const gratingSize: [number, number, number] = [1.3, 0.14, 1.3];
  base.add(block(gratingSize, textured('metal', gratingSize), [0, 0.22, 0]));
  root.add(base);

  return { object3d: root, anchors: { core, mechanism, shell } };
};

const SHARD_TONES: readonly VisualTone[] = [
  'neutral', 'information', 'prediction', 'suppression', 'reaction', 'insight', 'heat',
];

/**
 * Chunky glowing token — three offset cubes rather than a smooth shard.
 *
 * Accepts an optional `tone` so one semantic prefab can stand in for sunlight,
 * drifting ions, or a data packet without the episode naming a colour. The
 * theme still owns what each tone looks like.
 */
export const createVoxelInformationShard: PrefabFactory = ({ parameters }): PrefabInstance => {
  const requested = parameters.tone;
  const tone: VisualTone =
    typeof requested === 'string' && SHARD_TONES.includes(requested as VisualTone)
      ? (requested as VisualTone)
      : 'information';
  const color = voxelToneColor(tone);
  const root = new THREE.Group();
  root.name = 'voxel.informationShard';
  const material = createVoxelMaterial(`#${color.getHexString()}`, {
    pixelVariation: 0,
    emissive: `#${color.getHexString()}`,
    emissiveIntensity: 0.35,
  });
  root.add(block([0.22, 0.22, 0.22], material, [-0.12, 0.04, 0]));
  root.add(block([0.22, 0.22, 0.22], material, [0.12, -0.04, 0]));
  root.add(block([0.14, 0.14, 0.14], material, [0, 0.18, 0.02]));
  return { object3d: root };
};

/** Theme-owned practical light for character/story emphasis. */
export const createVoxelStoryLight: PrefabFactory = ({ parameters }): PrefabInstance => {
  const intensity = typeof parameters.intensity === 'number' ? parameters.intensity : 8;
  const distance = typeof parameters.distance === 'number' ? parameters.distance : 18;
  const color = parameters.role === 'subject' ? '#FFE2B3' : VOXEL_PALETTE.cream;
  const light = new THREE.PointLight(new THREE.Color(color), intensity, distance, 2);
  light.name = 'voxel.storyLight';
  return { object3d: light };
};

/** Optional tiny marker used by future voxel scenes without adding a new semantic id. */
export function createVoxelMarker(color: string): THREE.Group {
  const group = new THREE.Group();
  group.add(block([0.12, 0.12, 0.12], createVoxelGlow(color, 0.86)));
  return group;
}

export const VOXEL_PREFAB_FACTORIES: Record<string, PrefabFactory> = {
  'prefab.externalHand': createVoxelExternalHand,
  'prefab.heatEngine': createVoxelHeatEngine,
  'prefab.informationShard': createVoxelInformationShard,
  'prefab.storyLight': createVoxelStoryLight,
  ...VOXEL_PRODUCTION_PREFAB_FACTORIES,
};
