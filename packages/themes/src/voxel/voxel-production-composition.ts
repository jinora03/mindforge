import * as THREE from 'three';
import {
  createCompositionStageEnvironmentFactory,
  createDeterministicScatterLayerFactory,
  createSurfaceLayerFactory,
} from '@mindforge/environments';
import {
  createRng,
  disposeObject3D,
  type EnvironmentFactory,
  type SceneCompositionLayerFactory,
  type SceneCompositionLayerInstance,
} from '@mindforge/engine';
import {
  BLOCK,
  createBlockMaterial,
  createSkyDome,
  createVoxelLighting,
  createVoxelWaterMaterial,
  type BlockTextureId,
} from './voxel-style';
import { BlockField } from './voxel-world';
import { VOXEL_PB1_NATURE_ASSET_IDS } from './voxel-production-assets';

function block(
  size: readonly [number, number, number],
  texture: BlockTextureId,
  position: readonly [number, number, number],
  tint?: string,
): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(...size),
    createBlockMaterial(texture, { size, tint, roughness: 0.9 }),
  );
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/**
 * Fallbacks intentionally use the same block textures/orthogonal silhouettes
 * as the established Heat/Cold Battery Voxel scenes.  A missing PF2 model must
 * never make the production world silently fall back to generic low-poly art.
 */
function fallbackTree(): THREE.Object3D {
  const root = new THREE.Group();
  root.name = 'pf6-fallback:voxel.tree';
  root.add(block([0.56, 2.8, 0.56], 'logSide', [0, 1.4, 0]));
  root.add(block([2.25, 1.0, 2.05], 'leaves', [0, 2.85, 0]));
  root.add(block([1.55, 0.85, 1.5], 'leaves', [-0.35, 3.58, 0.08]));
  root.add(block([1.35, 0.72, 1.32], 'leaves', [0.45, 4.12, -0.05]));
  return root;
}

function fallbackRock(): THREE.Object3D {
  const root = new THREE.Group();
  root.name = 'pf6-fallback:voxel.rock';
  root.add(block([1.25, 0.72, 1.0], 'stone', [0, 0.36, 0]));
  root.add(block([0.72, 0.42, 0.65], 'stone', [0.2, 0.86, -0.05]));
  return root;
}

function fallbackBush(): THREE.Object3D {
  const root = new THREE.Group();
  root.name = 'pf6-fallback:voxel.bush';
  root.add(block([1.15, 0.75, 1.0], 'leaves', [-0.32, 0.4, 0]));
  root.add(block([1.2, 0.8, 1.05], 'leaves', [0.35, 0.44, -0.04]));
  root.add(block([0.9, 0.65, 0.86], 'leaves', [0, 0.94, 0.03]));
  return root;
}

function fallbackGroundCover(): THREE.Object3D {
  const root = new THREE.Group();
  root.name = 'pf6-fallback:voxel.groundCover';
  root.add(block([0.09, 0.42, 0.09], 'grassTop', [-0.12, 0.21, 0]));
  root.add(block([0.09, 0.56, 0.09], 'grassTop', [0.08, 0.28, 0.03]));
  root.add(block([0.08, 0.34, 0.08], 'grassTop', [0.2, 0.17, -0.08]));
  return root;
}

function fallbackCloud(): THREE.Object3D {
  const root = new THREE.Group();
  root.name = 'pf6-fallback:voxel.cloud';
  const blocks: Array<
    readonly [readonly [number, number, number], readonly [number, number, number]]
  > = [
    [
      [2.2, 0.68, 1.0],
      [0, 0, 0],
    ],
    [
      [1.55, 0.72, 1.05],
      [-0.85, 0.34, 0.02],
    ],
    [
      [1.65, 0.74, 1.0],
      [0.8, 0.28, -0.04],
    ],
    [
      [1.25, 0.55, 0.85],
      [1.65, 0.02, 0.04],
    ],
  ];
  for (const [size, position] of blocks) {
    const cloud = block(size, 'cloud', position);
    cloud.castShadow = false;
    cloud.receiveShadow = false;
    root.add(cloud);
  }
  return root;
}

const createVoxelCompositionStage = createCompositionStageEnvironmentFactory({
  name: 'voxel',
  // PB5B keeps the production meadow moodier than the generic daylight stage.
  // The hero and semantic effects should own the brightest pixels in frame.
  background: '#405764',
  camera: {
    position: [3.6, 3.2, 8.8],
    target: [0, 1.6, -4.2],
    fov: 40,
  },
  createBackdrop: () =>
    createSkyDome({
      top: '#172833',
      horizon: '#526F7E',
      ground: '#32462F',
      radius: 150,
    }),
});

function numberParameter(
  parameters: Readonly<Record<string, unknown>>,
  key: string,
  fallback: number,
  min: number,
  max: number,
): number {
  const value = parameters[key];
  return typeof value === 'number' && Number.isFinite(value)
    ? THREE.MathUtils.clamp(value, min, max)
    : fallback;
}

const createVoxelGround = createSurfaceLayerFactory({
  name: 'voxel.ground',
  defaultWidth: 38,
  defaultDepth: 46,
  createSurface(width: number, depth: number): THREE.Object3D {
    const columns = Math.max(4, Math.round(width / BLOCK));
    const rows = Math.max(4, Math.round(depth / BLOCK));
    const field = new BlockField(
      BLOCK,
      new THREE.Vector3(-columns * BLOCK * 0.5, -BLOCK, -rows * BLOCK * 0.5),
    );
    for (let x = 0; x < columns; x++) {
      for (let z = 0; z < rows; z++) field.set(x, 0, z, 'grass');
    }
    const ground = field.build('voxel-production-ground');
    const surface = ground.children[0] as THREE.InstancedMesh | undefined;

    if (!surface) {
      throw new Error('Voxel production ground did not generate a grass surface.');
    }

    surface.removeFromParent();
    surface.name = '';
    surface.userData.mindforgeVoxelBaseline = true;

    // Keep the established pixel textures but lower the ground value so the
    // optical subject and selective glow remain the focal point.
    const materials = Array.isArray(surface.material) ? surface.material : [surface.material];
    materials.forEach((material, index) => {
      if (!(material instanceof THREE.MeshStandardMaterial)) return;
      if (materials.length >= 6) {
        if (index === 2) material.color.set('#5D824A');
        else if (index === 3) material.color.set('#624D37');
        else material.color.set('#816746');
      } else {
        material.color.set('#5D824A');
      }
    });

    return surface;
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
      const material = createVoxelWaterMaterial({ size: [2.1, 0.05, 1.3], opacity: 0.68 });
      material.name = 'PB2_PuddleWater';
      const pieces: Array<
        readonly [readonly [number, number, number], readonly [number, number, number]]
      > = [
        [
          [1.45, 0.045, 0.9],
          [0, 0.023, 0],
        ],
        [
          [0.62, 0.04, 0.55],
          [-0.88, 0.02, 0.04],
        ],
        [
          [0.55, 0.04, 0.5],
          [0.82, 0.02, -0.16],
        ],
      ];
      for (const [size, position] of pieces) {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material.clone());
        (mesh.material as THREE.MeshPhysicalMaterial).name = 'PB2_PuddleWater';
        mesh.position.set(...position);
        mesh.receiveShadow = true;
        root.add(mesh);
      }
      material.dispose();
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
    minScale: 1.05,
    maxScale: 1.7,
    yOffset: 0.1,
  },
  {
    id: 'cloud.storm-b',
    assetId: VOXEL_PB1_NATURE_ASSET_IDS.clouds[1],
    weight: 0.4,
    createFallback: fallbackCloud,
    minScale: 1.0,
    maxScale: 1.65,
    yOffset: 0.35,
  },
  {
    id: 'cloud.break-a',
    assetId: VOXEL_PB1_NATURE_ASSET_IDS.clouds[2],
    weight: 0.2,
    createFallback: fallbackCloud,
    minScale: 1.0,
    maxScale: 1.55,
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
  defaultMinScale: 1,
  defaultMaxScale: 1.7,
  defaultClusterCount: 2,
  defaultClusterRadius: 4.2,
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

interface DioramaFrameSlot {
  readonly assetId: string;
  readonly fallback: () => THREE.Object3D;
  readonly position: readonly [number, number, number];
  readonly scale: number;
  readonly yaw: number;
}

const DIORAMA_FRAME_SLOTS: readonly DioramaFrameSlot[] = [
  { assetId: VOXEL_PB1_NATURE_ASSET_IDS.trees[0], fallback: fallbackTree, position: [-7.1, 0, -11.8], scale: 1.06, yaw: 0.18 },
  { assetId: VOXEL_PB1_NATURE_ASSET_IDS.trees[1], fallback: fallbackTree, position: [7.3, 0, -12.5], scale: 1.0, yaw: -0.2 },
  { assetId: VOXEL_PB1_NATURE_ASSET_IDS.trees[2], fallback: fallbackTree, position: [-8.8, 0, -19.0], scale: 0.86, yaw: -0.1 },
  { assetId: VOXEL_PB1_NATURE_ASSET_IDS.trees[3], fallback: fallbackTree, position: [8.7, 0, -18.6], scale: 0.92, yaw: 0.12 },
  { assetId: VOXEL_PB1_NATURE_ASSET_IDS.bushes[0], fallback: fallbackBush, position: [-5.4, 0, -8.6], scale: 0.9, yaw: 0.24 },
  { assetId: VOXEL_PB1_NATURE_ASSET_IDS.bushes[1], fallback: fallbackBush, position: [5.7, 0, -9.2], scale: 0.88, yaw: -0.28 },
  { assetId: VOXEL_PB1_NATURE_ASSET_IDS.rocks[1], fallback: fallbackRock, position: [-4.9, 0, -15.3], scale: 0.82, yaw: -0.14 },
  { assetId: VOXEL_PB1_NATURE_ASSET_IDS.rocks[2], fallback: fallbackRock, position: [4.8, 0, -16.0], scale: 0.8, yaw: 0.2 },
] as const;

function addDioramaRidge(root: THREE.Group, centerZ: number, spread: number): void {
  const ridgeSpecs: readonly {
    readonly x: number;
    readonly z: number;
    readonly width: number;
    readonly height: number;
    readonly depth: number;
  }[] = [
    { x: -8.7, z: -25.2, width: 7.4, height: 1.15, depth: 4.6 },
    { x: 8.9, z: -25.8, width: 7.0, height: 1.05, depth: 4.4 },
    { x: -11.2, z: -28.0, width: 4.2, height: 1.7, depth: 3.4 },
    { x: 11.4, z: -28.4, width: 4.0, height: 1.55, depth: 3.2 },
  ];

  for (const [index, spec] of ridgeSpecs.entries()) {
    const x = spec.x * spread;
    const z = centerZ + spec.z;
    const stone = block(
      [spec.width, spec.height, spec.depth],
      'stone',
      [x, spec.height * 0.5, z],
      index < 2 ? '#505B56' : '#46514D',
    );
    stone.castShadow = false;
    const grass = block(
      [spec.width + 0.08, 0.24, spec.depth + 0.08],
      'grassTop',
      [x, spec.height + 0.12, z],
      index < 2 ? '#48683D' : '#3E5B37',
    );
    grass.castShadow = false;
    root.add(stone, grass);
  }
}

/**
 * Reusable authored-diorama framing for science explainers.
 *
 * Unlike free scatter this keeps a clean center lane for the hero/effect while
 * using the shared PB1 asset pack to build deliberate left/right visual wings.
 * PB6 adds low stepped background ridges so portrait shots have a real
 * foreground/midground/background stack instead of an infinite flat field.
 */
const createVoxelDioramaFrame: SceneCompositionLayerFactory = (ctx): SceneCompositionLayerInstance => {
  const root = new THREE.Group();
  root.name = `mindforge-composition:voxel.dioramaFrame:${ctx.id}`;
  const rng = createRng(ctx.seed);
  const spread = numberParameter(ctx.parameters, 'spread', 1, 0.72, 1.35);
  const scale = numberParameter(ctx.parameters, 'scale', 1, 0.65, 1.5);
  const jitter = numberParameter(ctx.parameters, 'jitter', 0.32, 0, 1.2);
  const centerZ = numberParameter(ctx.parameters, 'centerZ', 0, -30, 20);

  addDioramaRidge(root, centerZ, spread);

  for (let index = 0; index < DIORAMA_FRAME_SLOTS.length; index++) {
    const slot = DIORAMA_FRAME_SLOTS[index];
    const hasAuthoredAsset = ctx.services.assets.has(slot.assetId);
    const object = hasAuthoredAsset
      ? ctx.services.assets.instantiateModel(slot.assetId).object3d
      : slot.fallback();
    const objectScale = slot.scale * scale * rng.range(0.96, 1.04);
    object.scale.multiplyScalar(objectScale);
    object.position.set(
      slot.position[0] * spread + rng.range(-jitter, jitter),
      slot.position[1],
      centerZ + slot.position[2] + rng.range(-jitter, jitter),
    );
    object.rotation.y += slot.yaw + rng.range(-0.08, 0.08);
    object.userData.mindforgeCompositionSource = hasAuthoredAsset ? 'authored' : 'fallback';
    object.userData.mindforgeAssetId = slot.assetId;
    object.userData.mindforgeDioramaSlot = index;
    root.add(object);
  }

  return {
    object3d: root,
    update(): void {},
    dispose(): void {
      disposeObject3D(root);
      root.removeFromParent();
    },
  };
};

/**
 * Production daylight with per-scene intensity control. PF4 environmentLight
 * can still provide a short reveal lift without washing the whole world out.
 */
const createVoxelDaylight: SceneCompositionLayerFactory = (ctx): SceneCompositionLayerInstance => {
  const root = new THREE.Group();
  root.name = `mindforge-composition:voxel.daylight:${ctx.id}`;
  const intensityScale = numberParameter(ctx.parameters, 'intensityScale', 0.68, 0.25, 1.25);
  const flashBoost = numberParameter(ctx.parameters, 'flashBoost', 0.26, 0, 0.8);
  const rig = createVoxelLighting({ shadowExtent: 20, intensityScale });
  root.add(rig);

  const lights: Array<{ readonly light: THREE.Light; readonly intensity: number }> = [];
  rig.traverse((object) => {
    if (object instanceof THREE.Light) lights.push({ light: object, intensity: object.intensity });
  });

  return {
    object3d: root,
    update(): void {
      const flash = ctx.services.effectInfluences.get('environmentLight');
      for (const entry of lights) {
        entry.light.intensity = entry.intensity * (1 + flash * flashBoost);
      }
    },
    dispose(): void {
      disposeObject3D(root);
      root.removeFromParent();
    },
  };
};

export const VOXEL_PRODUCTION_COMPOSITION_ENVIRONMENTS: Readonly<
  Record<string, EnvironmentFactory>
> = {
  'environment.compositionStage': createVoxelCompositionStage,
};

export const VOXEL_PRODUCTION_COMPOSITION_LAYERS: Readonly<
  Record<string, SceneCompositionLayerFactory>
> = {
  'layer.surface.ground': createVoxelGround,
  'layer.surface.puddles': createVoxelPuddles,
  'layer.setDressing.nature': createVoxelNature,
  'layer.setDressing.dioramaFrame': createVoxelDioramaFrame,
  'layer.setDressing.groundCover': createVoxelGroundCover,
  'layer.foreground.nature': createVoxelForeground,
  'layer.world.clouds': createVoxelClouds,
  'layer.lighting.daylight': createVoxelDaylight,
};
