import * as THREE from 'three';
import {
  createCompositionStageEnvironmentFactory,
  createDeterministicScatterLayerFactory,
  createReactiveLightingLayerFactory,
  createSurfaceLayerFactory,
} from '@mindforge/environments';
import type { EnvironmentFactory, SceneCompositionLayerFactory } from '@mindforge/engine';
import {
  ballGeometry,
  brickGeometry,
  createToyLighting,
  createToySky,
  plastic,
  tubeGeometry,
} from './toybox-style';

function mesh(
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  position: readonly [number, number, number],
): THREE.Mesh {
  const value = new THREE.Mesh(geometry, material);
  value.position.set(...position);
  value.castShadow = true;
  value.receiveShadow = true;
  return value;
}

function fallbackTree(): THREE.Object3D {
  const root = new THREE.Group();
  root.name = 'pf6-fallback:toybox.tree';
  root.add(mesh(tubeGeometry(0.18, 2.4, 10), plastic('#78563D', { roughness: 0.72 }), [0, 1.18, 0]));
  root.add(mesh(ballGeometry(0.95, 12), plastic('#4D8C54', { roughness: 0.55 }), [0, 2.65, 0]));
  root.add(mesh(ballGeometry(0.72, 12), plastic('#68A760', { roughness: 0.5 }), [-0.48, 3.13, 0.08]));
  root.add(mesh(ballGeometry(0.74, 12), plastic('#5B9858', { roughness: 0.52 }), [0.52, 3.18, -0.05]));
  return root;
}

function fallbackRock(): THREE.Object3D {
  const root = new THREE.Group();
  root.name = 'pf6-fallback:toybox.rock';
  const rock = mesh(
    new THREE.DodecahedronGeometry(0.72, 0),
    plastic('#858D8A', { roughness: 0.68 }),
    [0, 0.5, 0],
  );
  rock.scale.set(1.1, 0.75, 0.95);
  root.add(rock);
  return root;
}

function fallbackBush(): THREE.Object3D {
  const root = new THREE.Group();
  root.name = 'pf6-fallback:toybox.bush';
  root.add(mesh(ballGeometry(0.68, 12), plastic('#4F8E50', { roughness: 0.55 }), [-0.38, 0.56, 0]));
  root.add(mesh(ballGeometry(0.76, 12), plastic('#63A15D', { roughness: 0.5 }), [0.28, 0.62, 0.08]));
  root.add(mesh(ballGeometry(0.52, 12), plastic('#76B16A', { roughness: 0.48 }), [0.02, 1.02, -0.06]));
  return root;
}



function fallbackGroundCover(): THREE.Object3D {
  const root = new THREE.Group();
  root.name = 'pf6-fallback:toybox.groundCover';
  for (const [x, z, h] of [[-0.16, 0.02, 0.42], [0.05, -0.04, 0.56], [0.2, 0.08, 0.36]] as const) {
    const blade = mesh(
      brickGeometry(0.08, h, 0.08),
      plastic('#69A85F', { roughness: 0.54 }),
      [x, h * 0.5, z],
    );
    root.add(blade);
  }
  return root;
}

function fallbackPuddle(): THREE.Object3D {
  const root = new THREE.Group();
  root.name = 'pf6-fallback:toybox.puddle';
  const puddle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.78, 0.88, 0.035, 20),
    plastic('#78BDD3', { roughness: 0.16, transparent: true, opacity: 0.72 }),
  );
  puddle.position.y = 0.018;
  puddle.scale.z = 0.62;
  puddle.receiveShadow = true;
  root.add(puddle);
  return root;
}

function fallbackCloud(): THREE.Object3D {
  const root = new THREE.Group();
  root.name = 'pf6-fallback:toybox.cloud';
  const material = plastic('#8797A4', { roughness: 0.78 });
  const specs = [
    [-0.95, 0, 0, 0.82],
    [-0.35, 0.18, 0.02, 1.02],
    [0.35, 0.14, -0.03, 0.92],
    [0.95, -0.02, 0.02, 0.72],
  ] as const;
  for (const [x, y, z, radius] of specs) {
    const cloud = mesh(ballGeometry(radius, 12), material.clone(), [x, y, z]);
    cloud.castShadow = false;
    cloud.receiveShadow = false;
    root.add(cloud);
  }
  return root;
}

const createToyboxCompositionStage = createCompositionStageEnvironmentFactory({
  name: 'toybox',
  background: '#B9DDEA',
  camera: {
    position: [4.2, 2.7, 9.6],
    target: [0, 1.15, -3.2],
    fov: 42,
  },
  createBackdrop: () =>
    createToySky({ bands: ['#76B8DA', '#98D0E6', '#C6E8F2', '#E9F7FA'] }),
});

const createToyboxGround = createSurfaceLayerFactory({
  name: 'toybox.ground',
  defaultWidth: 38,
  defaultDepth: 46,
  createSurface(width: number, depth: number): THREE.Object3D {
    const mesh = new THREE.Mesh(
      brickGeometry(width, 0.55, depth),
      plastic('#78A767', { roughness: 0.62 }),
    );
    mesh.position.y = -0.275;
    mesh.receiveShadow = true;
    mesh.castShadow = false;
    return mesh;
  },
});

const NATURE_VARIANTS = [
  { id: 'tree', weight: 0.48, createFallback: fallbackTree, minScale: 0.78, maxScale: 1.28 },
  { id: 'bush', weight: 0.32, createFallback: fallbackBush, minScale: 0.72, maxScale: 1.18 },
  { id: 'rock', weight: 0.2, createFallback: fallbackRock, minScale: 0.72, maxScale: 1.22 },
] as const;

const createToyboxNature = createDeterministicScatterLayerFactory({
  name: 'toybox.nature',
  variants: NATURE_VARIANTS,
  placement: 'field',
  defaultCount: 22,
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
  { id: 'grass', weight: 0.82, createFallback: fallbackGroundCover, minScale: 0.72, maxScale: 1.2 },
  { id: 'flower', weight: 0.18, createFallback: fallbackGroundCover, minScale: 0.78, maxScale: 1.08 },
] as const;

const createToyboxGroundCover = createDeterministicScatterLayerFactory({
  name: 'toybox.groundCover',
  variants: GROUND_COVER_VARIANTS,
  placement: 'field',
  defaultCount: 38,
  defaultHalfWidth: 16.5,
  defaultNearZ: -1.5,
  defaultFarZ: -27,
  defaultClearRadius: 3.2,
  defaultMinScale: 0.7,
  defaultMaxScale: 1.18,
  defaultClusterCount: 9,
  defaultClusterRadius: 2.1,
});

const createToyboxPuddles = createDeterministicScatterLayerFactory({
  name: 'toybox.puddles',
  variants: [{ id: 'puddle', createFallback: fallbackPuddle, minScale: 0.72, maxScale: 1.32 }],
  placement: 'field',
  defaultCount: 5,
  defaultHalfWidth: 12.5,
  defaultNearZ: -2.5,
  defaultFarZ: -20,
  defaultClearRadius: 2.4,
  defaultMinScale: 0.72,
  defaultMaxScale: 1.32,
});

const createToyboxClouds = createDeterministicScatterLayerFactory({
  name: 'toybox.clouds',
  variants: [{ id: 'stormCloud', createFallback: fallbackCloud, minScale: 2, maxScale: 3.25 }],
  placement: 'field',
  defaultCount: 7,
  defaultHalfWidth: 18,
  defaultNearZ: -16,
  defaultFarZ: -34,
  defaultClearRadius: 0,
  defaultMinScale: 2,
  defaultMaxScale: 3.25,
  defaultClusterCount: 3,
  defaultClusterRadius: 5.4,
});

const createToyboxForeground = createDeterministicScatterLayerFactory({
  name: 'toybox.foreground',
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

const createToyboxDaylight = createReactiveLightingLayerFactory({
  name: 'toybox.daylight',
  flashBoost: 0.36,
  createLighting: () => createToyLighting({ shadowExtent: 20 }),
});

export const TOYBOX_PRODUCTION_COMPOSITION_ENVIRONMENTS: Readonly<Record<string, EnvironmentFactory>> = {
  'environment.compositionStage': createToyboxCompositionStage,
};

const createToyboxProductionMaterials: SceneCompositionLayerFactory = () => {
  const object3d = new THREE.Group();
  object3d.name = 'toybox.productionMaterials';

  return {
    object3d,
    update() {},
    dispose() {},
  };
};

export const TOYBOX_PRODUCTION_COMPOSITION_LAYERS: Readonly<Record<string, SceneCompositionLayerFactory>> = {
  'layer.surface.ground': createToyboxGround,
  'layer.surface.puddles': createToyboxPuddles,
  'layer.setDressing.nature': createToyboxNature,
  'layer.setDressing.groundCover': createToyboxGroundCover,
  'layer.foreground.nature': createToyboxForeground,
  'layer.world.clouds': createToyboxClouds,
  'layer.lighting.daylight': createToyboxDaylight,
  'layer.utility.productionMaterials': createToyboxProductionMaterials,
};
