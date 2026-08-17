import * as THREE from 'three';
import {
  disposeObject3D,
  type CameraState,
  type EnvironmentFactory,
  type EnvironmentInstance,
} from '@mindforge/engine';
import {
  createBlockMaterial,
  createVoxelLighting,
  createVoxelMaterial,
} from './voxel-style';

function cameraState(
  position: [number, number, number],
  target: [number, number, number],
  fov: number,
): CameraState {
  return { position: new THREE.Vector3(...position), target: new THREE.Vector3(...target), fov };
}

function block(
  size: [number, number, number],
  material: THREE.Material,
  position: [number, number, number],
  castShadow = true,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position);
  mesh.castShadow = castShadow;
  mesh.receiveShadow = true;
  return mesh;
}

function finish(
  scene: THREE.Scene,
  group: THREE.Group,
  defaultCamera: CameraState,
  update?: (time: number) => void,
): EnvironmentInstance {
  return {
    object3d: group,
    defaultCamera,
    update(ctx): void {
      update?.(ctx.time);
    },
    dispose(): void {
      disposeObject3D(group);
      group.removeFromParent();
      scene.fog = null;
      scene.background = null;
    },
  };
}

function floorGrid(group: THREE.Group, width: number, depth: number, color = '#C9D1D8'): void {
  group.add(block([width, 0.34, depth], createBlockMaterial('stoneBrick', { size: [width, 0.34, depth], tint: color }), [0, -0.19, -2], false));
  const grout = createVoxelMaterial('#7B8790', { pixelVariation: 0, roughness: 0.95 });
  for (let x = -Math.floor(width / 2); x <= Math.floor(width / 2); x += 2) {
    group.add(block([0.028, 0.015, depth - 0.3], grout, [x, 0.001, -2], false));
  }
  for (let z = -Math.floor(depth / 2) - 2; z <= Math.floor(depth / 2) - 2; z += 2) {
    group.add(block([width - 0.3, 0.015, 0.028], grout, [0, 0.001, z], false));
  }
}

/** Reusable indoor bench/laboratory space for material and magnet experiments. */
export const createVoxelMaterialLab: EnvironmentFactory = ({ services }): EnvironmentInstance => {
  const scene = services.scene;
  const group = new THREE.Group();
  group.name = 'voxel.environment.materialLab';
  scene.background = new THREE.Color('#A8C6D8');
  scene.fog = new THREE.Fog('#A8C6D8', 36, 88);

  floorGrid(group, 28, 24, '#BAC6CE');
  const wallMat = createBlockMaterial('stoneBrick', { size: [28, 9, 0.5], tint: '#DCE4E7' });
  group.add(block([28, 9, 0.5], wallMat, [0, 4.3, -12.2], false));

  // Central experiment bench plus side shelving. These deliberately leave the
  // middle vertical composition open for the Observer + current experiment.
  const benchTop = createBlockMaterial('planks', { size: [9.5, 0.42, 2.7] });
  group.add(block([9.5, 0.42, 2.7], benchTop, [0, 1.25, -2.9]));
  const metal = createBlockMaterial('metalPlate', { size: [0.4, 1.25, 0.4] });
  for (const x of [-4.1, 4.1]) {
    for (const z of [-3.75, -2.05]) group.add(block([0.4, 1.25, 0.4], metal, [x, 0.62, z]));
  }

  for (const side of [-1, 1]) {
    const sx = side * 9.7;
    for (let level = 0; level < 3; level++) {
      group.add(block([5.6, 0.28, 1.5], createBlockMaterial('planks', { size: [5.6, 0.28, 1.5] }), [sx, 1.1 + level * 1.8, -9.4]));
    }
    for (const x of [sx - 2.45, sx + 2.45]) {
      group.add(block([0.3, 5.2, 0.3], metal, [x, 2.6, -9.4]));
    }
  }

  // Instrument blocks and a glowing status strip keep the lab visually alive.
  const statusMat = createVoxelMaterial('#7EE5FF', { pixelVariation: 0, emissive: '#43C8F2', emissiveIntensity: 0.55 });
  for (let i = 0; i < 7; i++) {
    group.add(block([0.58, 0.58 + (i % 3) * 0.16, 0.58], createBlockMaterial(i % 2 ? 'metal' : 'metalPlate', { size: [0.58, 0.8, 0.58] }), [-7.8 + i * 2.55, 0.35, -8.4]));
  }
  group.add(block([8.2, 0.12, 0.08], statusMat, [0, 5.8, -11.86], false));

  // High windows distinguish this from the warm kitchen and outdoor sets.
  const glass = createVoxelMaterial('#8FD7F3', { pixelVariation: 0, emissive: '#67C7E8', emissiveIntensity: 0.08, transparent: true, opacity: 0.72, roughness: 0.18 });
  for (const x of [-7.2, -2.4, 2.4, 7.2]) group.add(block([3.2, 2.25, 0.06], glass, [x, 6.6, -11.9], false));

  group.add(createVoxelLighting({ shadowExtent: 18 }));
  return finish(scene, group, cameraState([3.6, 2.7, 7.6], [0, 1.2, -0.8], 44));
};

/** Bright reusable classroom / demonstration space for static and airflow lessons. */
export const createVoxelClassroomLab: EnvironmentFactory = ({ services }): EnvironmentInstance => {
  const scene = services.scene;
  const group = new THREE.Group();
  group.name = 'voxel.environment.classroomLab';
  scene.background = new THREE.Color('#B6D9EC');
  scene.fog = new THREE.Fog('#B6D9EC', 42, 96);
  floorGrid(group, 30, 26, '#D8D3C8');

  const wall = createBlockMaterial('stoneBrick', { size: [30, 9, 0.5], tint: '#F0E9D7' });
  group.add(block([30, 9, 0.5], wall, [0, 4.3, -13.2], false));
  const board = createVoxelMaterial('#264A45', { pixelVariation: 0, roughness: 0.88 });
  group.add(block([9.2, 3.0, 0.12], board, [0, 4.45, -12.84], false));
  const trim = createBlockMaterial('planks', { size: [10, 0.22, 0.18] });
  group.add(block([10, 0.22, 0.18], trim, [0, 2.86, -12.73], false));

  const deskMat = createBlockMaterial('planks', { size: [3.1, 0.28, 1.3] });
  const legs = createBlockMaterial('metal', { size: [0.18, 1.2, 0.18] });
  for (let row = 0; row < 3; row++) {
    for (let col = -2; col <= 2; col++) {
      const x = col * 4.8;
      const z = -5.4 + row * 4.0;
      if (row === 2 && Math.abs(col) < 2) continue; // open demo zone near camera
      group.add(block([3.1, 0.28, 1.3], deskMat, [x, 1.05, z]));
      for (const dx of [-1.25, 1.25]) for (const dz of [-0.42, 0.42]) group.add(block([0.18, 1.0, 0.18], legs, [x + dx, 0.5, z + dz]));
    }
  }

  // Side windows and ceiling light bars.
  const glass = createVoxelMaterial('#9ADDF4', { pixelVariation: 0, transparent: true, opacity: 0.72, roughness: 0.12 });
  for (const x of [-11.2, -7.3, 7.3, 11.2]) group.add(block([3.0, 2.4, 0.06], glass, [x, 6.2, -12.9], false));
  const lightMat = createVoxelMaterial('#FFF4C2', { pixelVariation: 0, emissive: '#FFF0A8', emissiveIntensity: 0.7 });
  for (const x of [-6, 0, 6]) group.add(block([3.8, 0.09, 0.7], lightMat, [x, 7.9, -2.8], false));

  group.add(createVoxelLighting({ shadowExtent: 18 }));
  return finish(scene, group, cameraState([3.8, 2.7, 8.4], [0, 1.3, -1.3], 45));
};

/** Warm kitchen-island set reused by water, cooking, pressure and food episodes. */
export const createVoxelKitchenLab: EnvironmentFactory = ({ services }): EnvironmentInstance => {
  const scene = services.scene;
  const group = new THREE.Group();
  group.name = 'voxel.environment.kitchenLab';
  scene.background = new THREE.Color('#C9DCE5');
  scene.fog = new THREE.Fog('#C9DCE5', 38, 90);
  floorGrid(group, 28, 24, '#D5C8B5');

  const wallMat = createBlockMaterial('stoneBrick', { size: [28, 9, 0.5], tint: '#EEE6D9' });
  group.add(block([28, 9, 0.5], wallMat, [0, 4.3, -12.2], false));

  // Back cabinets + countertop.
  const cabinet = createBlockMaterial('planks', { size: [2.8, 2.4, 1.25] });
  const counter = createBlockMaterial('stoneBrick', { size: [17, 0.36, 1.75], tint: '#E4E1DB' });
  group.add(block([17, 0.36, 1.75], counter, [0, 2.5, -10.9]));
  for (let i = -3; i <= 3; i++) {
    group.add(block([2.25, 2.2, 1.5], cabinet, [i * 2.45, 1.2, -10.9]));
    if (i % 2 === 0) group.add(block([2.15, 1.85, 1.1], cabinet, [i * 2.45, 6.2, -11.1]));
  }

  // Central island: where almost all kitchen experiments stage their props.
  group.add(block([8.4, 0.38, 3.0], createBlockMaterial('stoneBrick', { size: [8.4, 0.38, 3.0], tint: '#F1EEE7' }), [0, 1.55, -2.7]));
  group.add(block([7.5, 1.45, 2.3], createBlockMaterial('planks', { size: [7.5, 1.45, 2.3] }), [0, 0.72, -2.7]));

  // Sink and stove cues for visual identity.
  const steel = createVoxelMaterial('#9CA8AE', { texture: 'metalPlate', size: [3, 0.16, 1.3], roughness: 0.4, metalness: 0.55 });
  group.add(block([3.0, 0.16, 1.3], steel, [-5.6, 2.72, -10.7]));
  const burner = createVoxelMaterial('#252A2C', { pixelVariation: 0, roughness: 0.7 });
  for (const x of [3.8, 5.4]) for (const z of [-10.45, -11.15]) group.add(block([1.1, 0.08, 0.78], burner, [x, 2.72, z], false));

  // Window + pendant lights give the kitchen a warmer composition than lab/classroom.
  const glass = createVoxelMaterial('#93D6F0', { pixelVariation: 0, transparent: true, opacity: 0.75, roughness: 0.1 });
  group.add(block([5.2, 3.0, 0.06], glass, [0, 6.2, -11.9], false));
  const lamp = createVoxelMaterial('#FFE7A0', { pixelVariation: 0, emissive: '#FFD775', emissiveIntensity: 0.8 });
  for (const x of [-2.5, 2.5]) {
    group.add(block([0.7, 0.42, 0.7], lamp, [x, 6.7, -2.7], false));
    group.add(block([0.12, 2.1, 0.12], createBlockMaterial('metal', { size: [0.12, 2.1, 0.12] }), [x, 7.9, -2.7]));
  }

  group.add(createVoxelLighting({ warm: true, shadowExtent: 18 }));
  return finish(scene, group, cameraState([3.5, 2.65, 7.6], [0, 1.35, -1.0], 43));
};

export const VOXEL_PRODUCTION_ENVIRONMENT_FACTORIES: Record<string, EnvironmentFactory> = {
  'environment.materialLab': createVoxelMaterialLab,
  'environment.classroomLab': createVoxelClassroomLab,
  'environment.kitchenLab': createVoxelKitchenLab,
};
