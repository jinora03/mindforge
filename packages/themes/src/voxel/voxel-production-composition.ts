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


function fallbackGroundCover(): THREE.Object3D {
  const root = new THREE.Group();
  root.name = 'pf6-fallback:voxel.groundCover';
  root.add(block([0.08, 0.45, 0.08], '#5A9252', [-0.12, 0.22, 0]));
  root.add(block([0.07, 0.58, 0.07], '#467D45', [0.08, 0.29, 0.03]));
  root.add(block([0.06, 0.36, 0.06], '#6EA45D', [0.2, 0.18, -0.08]));
  return root;
}

function fallbackCloud(): THREE.Object3D {
  const root = new THREE.Group();
  root.name = 'pf6-fallback:voxel.cloud';
  root.add(block([2.2, 0.72, 0.95], '#667985', [0, 0, 0]));
  root.add(block([1.35, 0.68, 0.86], '#7D909A', [-0.85, 0.35, 0.02]));
  root.add(block([1.5, 0.76, 0.9], '#71838D', [0.8, 0.28, -0.04]));
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
  defaultClusterCount: 5,
  defaultClusterRadius: 3.6,
});



const GROUND_COVER_VARIANTS = [
  {
    id: 'grass.cluster-a',
    assetId: VOXEL_PB1_NATURE_ASSET_IDS.groundCover[0],
    weight: 0.42,
    createFallback: fallbackGroundCover,
    minScale: 0.72,
    maxScale: 1.22,
  },
  {
    id: 'grass.cluster-b',
    assetId: VOXEL_PB1_NATURE_ASSET_IDS.groundCover[1],
    weight: 0.4,
    createFallback: fallbackGroundCover,
    minScale: 0.68,
    maxScale: 1.18,
  },
  {
    id: 'flower.cluster-a',
    assetId: VOXEL_PB1_NATURE_ASSET_IDS.groundCover[2],
    weight: 0.18,
    createFallback: fallbackGroundCover,
    minScale: 0.78,
    maxScale: 1.12,
  },
] as const;

const PUDDLE_VARIANTS = [
  {
    id: 'puddle.a',
    assetId: VOXEL_PB1_NATURE_ASSET_IDS.puddles[0],
    weight: 1,
    createFallback(): THREE.Object3D {
      const root = new THREE.Group();
      root.name = 'pf6-fallback:voxel.puddle';
      const material = createVoxelMaterial('#7FB7C8', {
        pixelVariation: 0,
        transparent: true,
        opacity: 0.62,
        roughness: 0.18,
        depthWrite: false,
      });
      material.name = 'PB2_PuddleWater';
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.82, 0.035, 12), material);
      mesh.position.y = 0.018;
      mesh.scale.z = 0.62;
      mesh.receiveShadow = true;
      root.add(mesh);
      return root;
    },
    minScale: 0.72,
    maxScale: 1.35,
    yOffset: 0.01,
  },
] as const;

const CLOUD_VARIANTS = [
  {
    id: 'cloud.storm-a',
    assetId: VOXEL_PB1_NATURE_ASSET_IDS.clouds[0],
    weight: 0.4,
    createFallback: fallbackCloud,
    minScale: 2.2,
    maxScale: 3.6,
    yOffset: 0.1,
  },
  {
    id: 'cloud.storm-b',
    assetId: VOXEL_PB1_NATURE_ASSET_IDS.clouds[1],
    weight: 0.4,
    createFallback: fallbackCloud,
    minScale: 2.0,
    maxScale: 3.4,
    yOffset: 0.35,
  },
  {
    id: 'cloud.break-a',
    assetId: VOXEL_PB1_NATURE_ASSET_IDS.clouds[2],
    weight: 0.2,
    createFallback: fallbackCloud,
    minScale: 2.1,
    maxScale: 3.2,
    yOffset: 0.7,
  },
] as const;

const createVoxelGroundCover = createDeterministicScatterLayerFactory({
  name: 'voxel.groundCover',
  variants: GROUND_COVER_VARIANTS,
  placement: 'field',
  defaultCount: 42,
  defaultHalfWidth: 16.5,
  defaultNearZ: -1.5,
  defaultFarZ: -27,
  defaultClearRadius: 3.2,
  defaultMinScale: 0.68,
  defaultMaxScale: 1.2,
  defaultClusterCount: 9,
  defaultClusterRadius: 2.1,
});

const createVoxelPuddles = createDeterministicScatterLayerFactory({
  name: 'voxel.puddles',
  variants: PUDDLE_VARIANTS,
  placement: 'field',
  defaultCount: 5,
  defaultHalfWidth: 12.5,
  defaultNearZ: -2.5,
  defaultFarZ: -20,
  defaultClearRadius: 2.4,
  defaultMinScale: 0.72,
  defaultMaxScale: 1.35,
});

const createVoxelClouds = createDeterministicScatterLayerFactory({
  name: 'voxel.clouds',
  variants: CLOUD_VARIANTS,
  placement: 'field',
  defaultCount: 7,
  defaultHalfWidth: 18,
  defaultNearZ: -16,
  defaultFarZ: -34,
  defaultClearRadius: 0,
  defaultMinScale: 2,
  defaultMaxScale: 3.5,
  defaultClusterCount: 3,
  defaultClusterRadius: 5.4,
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
  'layer.surface.puddles': createVoxelPuddles,
  'layer.setDressing.nature': createVoxelNature,
  'layer.setDressing.groundCover': createVoxelGroundCover,
  'layer.foreground.nature': createVoxelForeground,
  'layer.world.clouds': createVoxelClouds,
  'layer.lighting.daylight': createVoxelDaylight,
};
