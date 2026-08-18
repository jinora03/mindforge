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
  'layer.setDressing.nature': createToyboxNature,
  'layer.foreground.nature': createToyboxForeground,
  'layer.lighting.daylight': createToyboxDaylight,
  'layer.utility.productionMaterials': createToyboxProductionMaterials,
};
