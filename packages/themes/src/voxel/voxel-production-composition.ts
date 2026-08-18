import * as THREE from 'three';
import {
  createCompositionStageEnvironmentFactory,
  createDeterministicScatterLayerFactory,
  createReactiveLightingLayerFactory,
  createSurfaceLayerFactory,
} from '@mindforge/environments';
import type { EnvironmentFactory, SceneCompositionLayerFactory } from '@mindforge/engine';
import {
  createBlockMaterial,
  createSkyDome,
  createVoxelLighting,
  createVoxelMaterial,
} from './voxel-style';
import { VOXEL_PB1_NATURE_ASSET_IDS } from './voxel-production-assets';

function block(
  size: readonly [number, number, number],
  color: string,
  position: readonly [number, number, number],
): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(...size),
    createVoxelMaterial(color, { pixelVariation: 0.06, roughness: 0.96 }),
  );
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function fallbackTree(): THREE.Object3D {
  const root = new THREE.Group();
  root.name = 'pf6-fallback:voxel.tree';
  root.add(block([0.46, 2.4, 0.46], '#6C4B31', [0, 1.2, 0]));
  root.add(block([2.0, 1.15, 1.85], '#3E7542', [0, 2.65, 0]));
  root.add(block([1.45, 0.9, 1.45], '#548B4D', [-0.18, 3.45, 0.08]));
  return root;
}

function fallbackRock(): THREE.Object3D {
  const root = new THREE.Group();
  root.name = 'pf6-fallback:voxel.rock';
  root.add(block([1.15, 0.72, 0.95], '#747D7C', [0, 0.36, 0]));
  root.add(block([0.68, 0.42, 0.62], '#87908D', [0.22, 0.78, -0.04]));
  return root;
}

function fallbackBush(): THREE.Object3D {
  const root = new THREE.Group();
  root.name = 'pf6-fallback:voxel.bush';
  root.add(block([1.45, 0.82, 1.2], '#467D45', [0, 0.42, 0]));
  root.add(block([0.9, 0.7, 0.9], '#5A9252', [-0.28, 0.84, 0.1]));
  return root;
}

const createVoxelCompositionStage = createCompositionStageEnvironmentFactory({
  name: 'voxel',
  background: '#8FB8C9',
  camera: {
    position: [4.2, 2.7, 9.6],
    target: [0, 1.15, -3.2],
    fov: 42,
  },
  createBackdrop: () =>
    createSkyDome({
      top: '#54788E',
      horizon: '#9FC6D3',
      ground: '#718D65',
      radius: 150,
    }),
});

const createVoxelGround = createSurfaceLayerFactory({
  name: 'voxel.ground',
  defaultWidth: 38,
  defaultDepth: 46,
  createSurface(width: number, depth: number): THREE.Object3D {
    const material = createBlockMaterial('grassTop', { size: [width, 0.5, depth] });
    material.name = 'MF_VoxelSurface_Grass';
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(width, 0.5, depth),
      material,
    );
    mesh.position.y = -0.25;
    mesh.receiveShadow = true;
    mesh.castShadow = false;
    return mesh;
  },
});

const NATURE_VARIANTS = [
  {
    id: 'tree.oak-a',
    assetId: VOXEL_PB1_NATURE_ASSET_IDS.trees[0],
    weight: 0.2,
    createFallback: fallbackTree,
    minScale: 0.82,
    maxScale: 1.16,
  },
  {
    id: 'tree.oak-b',
    assetId: VOXEL_PB1_NATURE_ASSET_IDS.trees[1],
    weight: 0.16,
    createFallback: fallbackTree,
    minScale: 0.8,
    maxScale: 1.14,
  },
  {
    id: 'tree.pine-a',
    assetId: VOXEL_PB1_NATURE_ASSET_IDS.trees[2],
    weight: 0.08,
    createFallback: fallbackTree,
    minScale: 0.78,
    maxScale: 1.08,
  },
  {
    id: 'tree.young-a',
    assetId: VOXEL_PB1_NATURE_ASSET_IDS.trees[3],
    weight: 0.07,
    createFallback: fallbackTree,
    minScale: 0.82,
    maxScale: 1.18,
  },
  {
    id: 'bush.a',
    assetId: VOXEL_PB1_NATURE_ASSET_IDS.bushes[0],
    weight: 0.13,
    createFallback: fallbackBush,
    minScale: 0.82,
    maxScale: 1.2,
  },
  {
    id: 'bush.b',
    assetId: VOXEL_PB1_NATURE_ASSET_IDS.bushes[1],
    weight: 0.11,
    createFallback: fallbackBush,
    minScale: 0.78,
    maxScale: 1.16,
  },
  {
    id: 'rock.meadow-a',
    assetId: VOXEL_PB1_NATURE_ASSET_IDS.rocks[0],
    weight: 0.08,
    createFallback: fallbackRock,
    minScale: 0.74,
    maxScale: 1.14,
  },
  {
    id: 'rock.meadow-b',
    assetId: VOXEL_PB1_NATURE_ASSET_IDS.rocks[1],
    weight: 0.08,
    createFallback: fallbackRock,
    minScale: 0.68,
    maxScale: 1.05,
  },
  {
    id: 'rock.cluster-a',
    assetId: VOXEL_PB1_NATURE_ASSET_IDS.rocks[2],
    weight: 0.09,
    createFallback: fallbackRock,
    minScale: 0.72,
    maxScale: 1.08,
  },
] as const;

const createVoxelNature = createDeterministicScatterLayerFactory({
  name: 'voxel.nature',
  variants: NATURE_VARIANTS,
  placement: 'field',
  defaultCount: 24,
  defaultHalfWidth: 17,
  defaultNearZ: -5,
  defaultFarZ: -28,
  defaultClearRadius: 5.5,
  defaultMinScale: 0.75,
  defaultMaxScale: 1.25,
});

const createVoxelForeground = createDeterministicScatterLayerFactory({
  name: 'voxel.foreground',
  variants: NATURE_VARIANTS,
  placement: 'sideFrame',
  defaultCount: 5,
  defaultHalfWidth: 11,
  defaultNearZ: 1.2,
  defaultFarZ: 6.0,
  defaultClearRadius: 0,
  defaultMinScale: 1.05,
  defaultMaxScale: 1.55,
  sideFrameInnerX: 6.5,
});

const createVoxelDaylight = createReactiveLightingLayerFactory({
  name: 'voxel.daylight',
  flashBoost: 0.42,
  createLighting: () => createVoxelLighting({ shadowExtent: 20 }),
});

export const VOXEL_PRODUCTION_COMPOSITION_ENVIRONMENTS: Readonly<Record<string, EnvironmentFactory>> = {
  'environment.compositionStage': createVoxelCompositionStage,
};

export const VOXEL_PRODUCTION_COMPOSITION_LAYERS: Readonly<Record<string, SceneCompositionLayerFactory>> = {
  'layer.surface.ground': createVoxelGround,
  'layer.setDressing.nature': createVoxelNature,
  'layer.foreground.nature': createVoxelForeground,
  'layer.lighting.daylight': createVoxelDaylight,
};
