import * as THREE from 'three';
import type { PrefabFactory, PrefabInstance } from '@mindforge/engine';
import {
  createBlockMaterial,
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

/** Side-by-side metal/wood samples used by conduction and material lessons. */
export const createVoxelMaterialSamples: PrefabFactory = (): PrefabInstance => {
  const root = new THREE.Group();
  root.name = 'voxel.materialSamples';

  const base = block([3.1, 0.28, 1.35], createBlockMaterial('stoneBrick', { size: [3.1, 0.28, 1.35], tint: '#AAB3B7' }), [0, 0.14, 0]);
  root.add(base);

  const metalMat = createVoxelMaterial('#C7D0D5', {
    texture: 'metalPlate',
    size: [1.05, 0.62, 0.9],
    metalness: 0.62,
    roughness: 0.36,
    emissive: '#FF7A35',
    emissiveIntensity: 0,
  });
  const metal = block([1.05, 0.62, 0.9], metalMat, [-0.82, 0.59, 0]);
  metal.name = 'metal';
  root.add(metal);

  const woodMat = createVoxelMaterial('#FFFFFF', {
    texture: 'planks',
    size: [1.05, 0.62, 0.9],
    emissive: '#FF9B54',
    emissiveIntensity: 0,
  });
  const wood = block([1.05, 0.62, 0.9], woodMat, [0.82, 0.59, 0]);
  wood.name = 'wood';
  root.add(wood);

  const metalSurface = new THREE.Object3D();
  metalSurface.name = 'metalSurface';
  metalSurface.position.set(0, 0.34, 0.42);
  metal.add(metalSurface);
  const woodSurface = new THREE.Object3D();
  woodSurface.name = 'woodSurface';
  woodSurface.position.set(0, 0.34, 0.42);
  wood.add(woodSurface);

  return { object3d: root, anchors: { metal, wood, metalSurface, woodSurface } };
};

/** Reusable block balloon with a semantic charge anchor near its surface. */
export const createVoxelBalloon: PrefabFactory = ({ parameters }): PrefabInstance => {
  const root = new THREE.Group();
  root.name = 'voxel.balloon';
  const color = typeof parameters.color === 'string' ? parameters.color : '#E94C67';
  const balloonMat = createVoxelMaterial(color, { pixelVariation: 0, roughness: 0.55 });

  const body = new THREE.Group();
  body.name = 'body';
  body.add(block([0.72, 0.92, 0.72], balloonMat));
  body.add(block([0.9, 0.58, 0.58], balloonMat, [0, 0.05, 0]));
  body.add(block([0.58, 1.12, 0.58], balloonMat, [0, 0.02, 0]));
  root.add(body);

  const knot = block([0.18, 0.16, 0.18], balloonMat, [0, -0.6, 0]);
  root.add(knot);
  const string = block([0.045, 1.55, 0.045], createBlockMaterial('flat', { size: [0.045, 1.55, 0.045], tint: '#EEE7D7' }), [0, -1.42, 0]);
  root.add(string);

  const charge = new THREE.Object3D();
  charge.name = 'charge';
  charge.position.set(0.48, 0.12, 0.22);
  root.add(charge);
  return { object3d: root, anchors: { body, charge, knot } };
};

/** Generic upright experiment panel, useful as a wall/contact/target surface. */
export const createVoxelDemoPanel: PrefabFactory = ({ parameters }): PrefabInstance => {
  const root = new THREE.Group();
  root.name = 'voxel.demoPanel';
  const color = typeof parameters.color === 'string' ? parameters.color : '#D8E0E3';
  const panel = block([0.48, 3.7, 3.2], createVoxelMaterial(color, { texture: 'stoneBrick', size: [0.48, 3.7, 3.2] }), [0, 1.85, 0]);
  root.add(panel);
  const foot = block([1.4, 0.28, 3.5], createBlockMaterial('metalPlate', { size: [1.4, 0.28, 3.5] }), [0, 0.14, 0]);
  root.add(foot);
  const surface = new THREE.Object3D();
  surface.name = 'surface';
  surface.position.set(0.28, 2.0, 0);
  root.add(surface);
  return { object3d: root, anchors: { surface, panel } };
};

/** Transparent tank with water and a movable ice sample. */
export const createVoxelFloatTank: PrefabFactory = (): PrefabInstance => {
  const root = new THREE.Group();
  root.name = 'voxel.floatTank';
  const glass = createVoxelMaterial('#BFEAFF', { pixelVariation: 0, transparent: true, opacity: 0.25, roughness: 0.08 });
  const frame = createBlockMaterial('metalPlate', { size: [0.12, 2.5, 0.12] });
  const waterMat = createVoxelMaterial('#4FAFE0', { pixelVariation: 0, transparent: true, opacity: 0.68, roughness: 0.16, emissive: '#2B8EC7', emissiveIntensity: 0.05 });

  const water = block([2.35, 1.65, 1.65], waterMat, [0, 0.96, 0]);
  water.name = 'water';
  root.add(water);
  for (const x of [-1.25, 1.25]) for (const z of [-0.9, 0.9]) root.add(block([0.12, 2.5, 0.12], frame, [x, 1.25, z]));
  root.add(block([2.55, 0.08, 1.9], glass, [0, 0.05, 0]));
  root.add(block([2.55, 2.45, 0.08], glass, [0, 1.25, -0.94]));
  root.add(block([0.08, 2.45, 1.9], glass, [-1.29, 1.25, 0]));
  root.add(block([0.08, 2.45, 1.9], glass, [1.29, 1.25, 0]));

  const iceMat = createVoxelMaterial('#DDF7FF', { pixelVariation: 0, emissive: '#8FDDF7', emissiveIntensity: 0.12, transparent: true, opacity: 0.9, roughness: 0.2 });
  const ice = block([0.82, 0.7, 0.82], iceMat, [0, 2.55, 0]);
  ice.name = 'ice';
  root.add(ice);
  const surface = new THREE.Object3D();
  surface.name = 'surface';
  surface.position.set(0, 1.8, 0);
  root.add(surface);
  return { object3d: root, anchors: { water, ice, surface } };
};

/** Bowl of soup with a metal spoon and semantic handle/liquid anchors. */
export const createVoxelBowlSpoon: PrefabFactory = (): PrefabInstance => {
  const root = new THREE.Group();
  root.name = 'voxel.bowlSpoon';
  const ceramic = createVoxelMaterial('#F2F5F2', { pixelVariation: 0, roughness: 0.62 });
  const soupMat = createVoxelMaterial('#C9572D', { pixelVariation: 0, emissive: '#FF6A32', emissiveIntensity: 0.13, roughness: 0.5 });
  const spoonMat = createVoxelMaterial('#C9D3D8', { texture: 'metalPlate', size: [0.18, 2.8, 0.18], metalness: 0.62, roughness: 0.34, emissive: '#FF7D38', emissiveIntensity: 0 });

  // Chunky bowl: base + four rim bars.
  root.add(block([2.6, 0.35, 2.2], ceramic, [0, 0.2, 0]));
  root.add(block([2.8, 0.36, 0.28], ceramic, [0, 0.64, 0.98]));
  root.add(block([2.8, 0.36, 0.28], ceramic, [0, 0.64, -0.98]));
  root.add(block([0.28, 0.36, 1.7], ceramic, [-1.26, 0.64, 0]));
  root.add(block([0.28, 0.36, 1.7], ceramic, [1.26, 0.64, 0]));
  const soup = block([2.2, 0.2, 1.6], soupMat, [0, 0.62, 0]);
  soup.name = 'soup';
  root.add(soup);

  const spoon = new THREE.Group();
  spoon.name = 'spoon';
  const handle = block([0.18, 2.75, 0.18], spoonMat, [0, 1.38, 0]);
  handle.name = 'handle';
  spoon.add(handle);
  spoon.add(block([0.58, 0.18, 0.42], spoonMat, [0, -0.04, 0]));
  spoon.rotation.z = -0.42;
  spoon.position.set(0.35, 0.62, 0);
  root.add(spoon);

  const soupSurface = new THREE.Object3D();
  soupSurface.name = 'soupSurface';
  soupSurface.position.set(-0.25, 0.75, 0.2);
  root.add(soupSurface);
  const handleTip = new THREE.Object3D();
  handleTip.name = 'handleTip';
  handleTip.position.set(0, 2.75, 0);
  spoon.add(handleTip);

  // Tiny glow marker gives effects a visually obvious target even before heat ramps.
  const heatMarker = block([0.08, 0.08, 0.08], createVoxelGlow('#FF8A3D', 0.001), [0, 2.5, 0]);
  spoon.add(heatMarker);

  return { object3d: root, anchors: { soup, spoon, handle, soupSurface, handleTip } };
};

export const VOXEL_PRODUCTION_PREFAB_FACTORIES: Record<string, PrefabFactory> = {
  'prefab.materialSamples': createVoxelMaterialSamples,
  'prefab.balloon': createVoxelBalloon,
  'prefab.demoPanel': createVoxelDemoPanel,
  'prefab.floatTank': createVoxelFloatTank,
  'prefab.bowlSpoon': createVoxelBowlSpoon,
};
