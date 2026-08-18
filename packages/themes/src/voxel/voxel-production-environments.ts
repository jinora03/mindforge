import * as THREE from 'three';
import {
  disposeObject3D,
  type CameraState,
  type EnvironmentFactory,
  type EnvironmentInstance,
} from '@mindforge/engine';
import {
  createBlockMaterial,
  createVoxelGlow,
  createVoxelLighting,
  createVoxelMaterial,
} from './voxel-style';
import { createVoxelRainMeadow } from './voxel-rain-meadow';
export { createVoxelRainMeadow };

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


function voxelTree(group: THREE.Group, x: number, z: number, scale = 1): void {
  const trunk = createVoxelMaterial('#6D4B32', { pixelVariation: 0.08, roughness: 1 });
  const leafA = createVoxelMaterial('#3F7141', { pixelVariation: 0.08, roughness: 1 });
  const leafB = createVoxelMaterial('#4E824A', { pixelVariation: 0.07, roughness: 1 });
  group.add(block([0.52 * scale, 2.4 * scale, 0.52 * scale], trunk, [x, 1.15 * scale, z]));
  group.add(block([2.25 * scale, 1.15 * scale, 2.15 * scale], leafA, [x, 2.55 * scale, z], false));
  group.add(block([1.65 * scale, 0.95 * scale, 1.65 * scale], leafB, [x - 0.25 * scale, 3.35 * scale, z + 0.12 * scale], false));
}

function voxelCloud(group: THREE.Group, x: number, y: number, z: number, scale = 1): void {
  const cloud = createVoxelMaterial('#C9D9E0', { pixelVariation: 0.02, roughness: 0.95 });
  group.add(block([3.8 * scale, 0.75 * scale, 1.3 * scale], cloud, [x, y, z], false));
  group.add(block([2.4 * scale, 0.9 * scale, 1.15 * scale], cloud, [x - 1.15 * scale, y + 0.48 * scale, z], false));
  group.add(block([2.0 * scale, 1.0 * scale, 1.0 * scale], cloud, [x + 1.2 * scale, y + 0.58 * scale, z - 0.08 * scale], false));
}

function voxelRock(group: THREE.Group, x: number, z: number, scale = 1, tint = '#7A817E'): void {
  const rock = createVoxelMaterial(tint, { pixelVariation: 0.08, roughness: 1 });
  group.add(block([1.1 * scale, 0.72 * scale, 0.95 * scale], rock, [x, 0.32 * scale, z], false));
  group.add(block([0.72 * scale, 0.48 * scale, 0.7 * scale], rock, [x + 0.22 * scale, 0.78 * scale, z - 0.08 * scale], false));
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



/** Tight vehicle interior with moving roadside cues for inertia/safety demonstrations. */
export const createVoxelVehicleCabin: EnvironmentFactory = ({ services }): EnvironmentInstance => {
  const scene = services.scene;
  const group = new THREE.Group();
  group.name = 'voxel.environment.vehicleCabin';
  scene.background = new THREE.Color('#7FA4B7');
  scene.fog = new THREE.Fog('#7FA4B7', 28, 72);

  const dark = createBlockMaterial('metalPlate', { size: [14, 0.5, 18], tint: '#39434A' });
  group.add(block([14, 0.5, 18], dark, [0, -0.25, -1], false));
  group.add(block([14, 0.35, 2.2], createBlockMaterial('metalPlate', { size: [14, 0.35, 2.2], tint: '#56646D' }), [0, 1.3, -7.8], false));
  group.add(block([13.2, 0.22, 0.35], createBlockMaterial('metalPlate', { size: [13.2, 0.22, 0.35], tint: '#283037' }), [0, 3.25, -7.1], false));

  const glass = createVoxelMaterial('#8FD7F1', { pixelVariation: 0, transparent: true, opacity: 0.34, roughness: 0.08 });
  group.add(block([11.2, 3.0, 0.08], glass, [0, 3.7, -8.0], false));
  for (const x of [-5.9, 5.9]) group.add(block([0.28, 6.5, 10.5], dark, [x, 3.0, -1.4], false));

  const stripes = new THREE.Group();
  stripes.name = 'voxel-road-motion';
  const stripeMat = createVoxelMaterial('#F5E9A4', { pixelVariation: 0, emissive: '#E8D66B', emissiveIntensity: 0.12, roughness: 0.7 });
  for (let i = 0; i < 9; i++) stripes.add(block([0.18, 0.12, 1.5], stripeMat, [-4.7, 0.72, -7.0 + i * 1.7], false));
  group.add(stripes);

  const dashLight = createVoxelMaterial('#7DE3FF', { pixelVariation: 0, emissive: '#3CC2E8', emissiveIntensity: 0.55 });
  for (const x of [-2.1, 0, 2.1]) group.add(block([1.35, 0.12, 0.15], dashLight, [x, 1.65, -6.55], false));

  group.add(createVoxelLighting({ warm: true, shadowExtent: 12 }));
  return finish(scene, group, cameraState([3.4, 2.25, 6.8], [0, 1.35, -1.8], 45), (time) => {
    stripes.position.z = (time * 3.4) % 1.7;
  });
};

/** Tall controlled drop room with a bright vertical test lane and scale marks. */
export const createVoxelDropLab: EnvironmentFactory = ({ services }): EnvironmentInstance => {
  const scene = services.scene;
  const group = new THREE.Group();
  group.name = 'voxel.environment.dropLab';
  scene.background = new THREE.Color('#AFC7D4');
  scene.fog = new THREE.Fog('#AFC7D4', 42, 100);

  floorGrid(group, 24, 22, '#BCC6CB');
  group.add(block([24, 11.5, 0.5], createBlockMaterial('stoneBrick', { size: [24, 11.5, 0.5], tint: '#E1E7E9' }), [0, 5.5, -10.9], false));
  const rail = createBlockMaterial('metalPlate', { size: [0.2, 8.2, 0.2], tint: '#7E8B92' });
  for (const x of [-3.4, 3.4]) group.add(block([0.2, 8.2, 0.2], rail, [x, 4.1, -4.2]));
  group.add(block([7.2, 0.22, 1.3], rail, [0, 7.9, -4.2]));

  const markMat = createVoxelMaterial('#355467', { pixelVariation: 0, roughness: 0.8 });
  for (let i = 0; i < 8; i++) {
    const y = 0.8 + i * 0.82;
    group.add(block([0.65 + (i % 2) * 0.3, 0.05, 0.08], markMat, [4.25, y, -4.15], false));
  }
  const status = createVoxelMaterial('#7EE5FF', { pixelVariation: 0, emissive: '#43C8F2', emissiveIntensity: 0.48 });
  group.add(block([4.2, 0.12, 0.1], status, [0, 8.55, -9.95], false));

  group.add(createVoxelLighting({ shadowExtent: 15 }));
  return finish(scene, group, cameraState([4.2, 3.2, 9.4], [0, 3.0, -3.1], 42));
};


/** Open canyon corridor for echo, wave-propagation and distance demonstrations. */
export const createVoxelCanyon: EnvironmentFactory = ({ services }): EnvironmentInstance => {
  const scene = services.scene;
  const group = new THREE.Group();
  group.name = 'voxel.environment.canyon';
  scene.background = new THREE.Color('#8EB7CF');
  scene.fog = new THREE.Fog('#8EB7CF', 52, 128);

  const ground = createVoxelMaterial('#B98758', { pixelVariation: 0.08, roughness: 0.98 });
  group.add(block([36, 0.48, 38], ground, [0, -0.27, -9], false));

  // A lighter central trail gives the echo path readable depth instead of one flat slab.
  const trail = createVoxelMaterial('#C99A6C', { pixelVariation: 0.06, roughness: 1 });
  for (let i = 0; i < 8; i++) {
    const width = 6.8 - i * 0.42;
    group.add(block([width, 0.07, 3.4], trail, [0, 0.01, 4 - i * 4.1], false));
  }

  const strata = ['#A86F49', '#956142', '#B77950', '#81543C'];
  for (const side of [-1, 1]) {
    for (let i = 0; i < 7; i++) {
      const x = side * (8.1 + (i % 2) * 1.05);
      const z = -2.2 - i * 3.45;
      const height = 5.7 + (i % 3) * 1.45;
      const width = 5.8 + (i % 2) * 0.7;
      group.add(block([width, height, 3.8], createVoxelMaterial(strata[i % strata.length], { pixelVariation: 0.09, roughness: 1 }), [x, height / 2 - 0.02, z], false));
      // Exposed horizontal strata and ledges make the cliffs read as terrain, not walls.
      for (let level = 1; level <= 3; level++) {
        group.add(block([width + 0.35, 0.16, 4.0], createVoxelMaterial(strata[(i + level) % strata.length], { pixelVariation: 0.04, roughness: 1 }), [x, (height * level) / 4, z], false));
      }
      group.add(block([2.2, 0.42, 1.6], createVoxelMaterial('#C28A5F', { pixelVariation: 0.05, roughness: 1 }), [x - side * 2.1, height * 0.62, z + 0.4], false));
    }
  }

  // Far reflector with stepped shelves so the returning sound has a clear destination.
  const farRock = createVoxelMaterial('#875A42', { pixelVariation: 0.08, roughness: 1 });
  group.add(block([19, 8.8, 1.4], farRock, [0, 4.2, -26], false));
  group.add(block([15.5, 1.0, 2.0], createVoxelMaterial('#A66D4A', { pixelVariation: 0.06, roughness: 1 }), [0, 2.4, -25.3], false));
  group.add(block([12.0, 0.72, 1.8], createVoxelMaterial('#BC7C53', { pixelVariation: 0.05, roughness: 1 }), [0, 6.15, -25.1], false));

  const scrub = createVoxelMaterial('#6E8B4E', { pixelVariation: 0.07, roughness: 0.95 });
  for (const [x, z] of [[-4.8, -5], [4.4, -8], [-5.2, -15], [5.3, -18], [-6.2, 2], [6.7, -1]] as const) {
    group.add(block([1.1, 0.7, 1.1], scrub, [x, 0.3, z], false));
  }
  voxelRock(group, -4.4, 1.3, 1.1, '#7E6655');
  voxelRock(group, 5.1, -4.8, 0.85, '#8E705B');
  voxelRock(group, -5.7, -11.5, 0.75, '#7A6253');

  voxelCloud(group, -7.5, 10.5, -28, 1.2);
  voxelCloud(group, 8.0, 12.0, -31, 0.9);

  group.add(createVoxelLighting({ warm: true, shadowExtent: 26 }));
  return finish(scene, group, cameraState([5.8, 4.6, 13.8], [0, 2.4, -10], 49));
};

/** Rainy open meadow with deterministic falling streaks and a low sun break. */
/** Night overlook with layered horizon silhouettes for perception demonstrations. */
export const createVoxelNightOverlook: EnvironmentFactory = ({ services }): EnvironmentInstance => {
  const scene = services.scene;
  const group = new THREE.Group();
  group.name = 'voxel.environment.nightOverlook';
  scene.background = new THREE.Color('#10223C');
  scene.fog = new THREE.Fog('#10223C', 58, 142);

  group.add(block([36, 0.52, 30], createVoxelMaterial('#263D35', { pixelVariation: 0.06, roughness: 1 }), [0, -0.29, -6], false));
  const ridgeA = createVoxelMaterial('#1B2E38', { pixelVariation: 0.03, roughness: 1 });
  const ridgeB = createVoxelMaterial('#243B43', { pixelVariation: 0.03, roughness: 1 });
  for (const [x, y, z, sx, sy, mat] of [
    [-12, 2.3, -25, 15, 4.8, ridgeA], [4, 1.7, -27, 17, 3.6, ridgeA], [15, 2.8, -29, 14, 5.8, ridgeA],
    [-15, 1.1, -20, 11, 2.5, ridgeB], [10, 0.9, -22, 13, 2.0, ridgeB],
  ] as const) group.add(block([sx, sy, 3.0], mat, [x, y, z], false));

  // Stone overlook, stairs and railing establish human scale without an idle character.
  const platform = createBlockMaterial('stoneBrick', { size: [13, 0.55, 7], tint: '#687377' });
  group.add(block([13, 0.55, 7], platform, [0, 0.05, -2.0], false));
  for (let i = 0; i < 4; i++) group.add(block([4.0 + i * 1.0, 0.22, 1.0], platform, [0, -0.02 + i * 0.18, 2.7 - i * 0.8], false));
  const rail = createVoxelMaterial('#535F64', { texture: 'metalPlate', size: [0.16, 1, 0.16], metalness: 0.35, roughness: 0.55 });
  for (const x of [-5.8, -3.0, 0, 3.0, 5.8]) group.add(block([0.16, 1.05, 0.16], rail, [x, 0.82, -5.0]));
  group.add(block([11.8, 0.13, 0.13], rail, [0, 1.25, -5.0]));

  // Warm city lights below the ridge provide the horizon context needed for the Moon illusion.
  const city = createVoxelGlow('#FFD67C', 0.72);
  for (let i = 0; i < 34; i++) {
    const x = ((i * 17) % 31) - 15;
    const y = 0.55 + ((i * 11) % 6) * 0.22;
    const z = -18.5 - (i % 4) * 0.7;
    group.add(block([0.12 + (i % 3) * 0.04, 0.12, 0.06], city, [x, y, z], false));
  }

  const starMat = createVoxelGlow('#EAF5FF', 0.86);
  for (let i = 0; i < 52; i++) {
    const x = ((i * 31) % 34) - 17;
    const y = 5.2 + ((i * 17) % 10) * 0.82;
    const z = -26 - (i % 3) * 0.7;
    const size = 0.055 + (i % 4) * 0.018;
    group.add(block([size, size, 0.05], starMat, [x, y, z], false));
  }

  for (const [x, z, scale] of [[-10.5, -8.5, 0.8], [10.0, -10.5, 0.9], [-13, -16, 0.7]] as const) voxelTree(group, x, z, scale);
  const lampGlow = createVoxelGlow('#FFD98A', 0.8);
  for (const x of [-5.2, 5.2]) {
    group.add(block([0.12, 2.0, 0.12], rail, [x, 1.0, -1.2]));
    group.add(block([0.38, 0.34, 0.38], lampGlow, [x, 2.05, -1.2], false));
    const point = new THREE.PointLight('#FFD98A', 0.65, 7, 2);
    point.position.set(x, 2.1, -1.2);
    group.add(point);
  }

  group.add(createVoxelLighting({ shadowExtent: 20 }));
  return finish(scene, group, cameraState([5.6, 4.0, 13.2], [0, 3.0, -9], 48));
};

/** Outdoor observatory platform for stars, planets and atmosphere demonstrations. */
export const createVoxelObservatory: EnvironmentFactory = ({ services }): EnvironmentInstance => {
  const scene = services.scene;
  const group = new THREE.Group();
  group.name = 'voxel.environment.observatory';
  scene.background = new THREE.Color('#0B1830');
  scene.fog = new THREE.Fog('#0B1830', 64, 152);

  group.add(block([34, 0.48, 30], createVoxelMaterial('#344A43', { pixelVariation: 0.05, roughness: 1 }), [0, -0.27, -6], false));

  // Main observatory terrace, raised telescope pad and block-built dome.
  const terrace = createBlockMaterial('stoneBrick', { size: [22, 0.5, 15], tint: '#66757A' });
  group.add(block([22, 0.5, 15], terrace, [0, 0.08, -7], false));
  group.add(block([10, 0.75, 10], createBlockMaterial('stoneBrick', { size: [10, 0.75, 10], tint: '#778388' }), [-6.5, 0.3, -8], false));
  const domeMat = createVoxelMaterial('#87979E', { texture: 'metalPlate', size: [1, 1, 1], metalness: 0.35, roughness: 0.58 });
  for (const [sx, sy, y] of [[8.5, 0.8, 0.9], [7.3, 0.8, 1.65], [5.8, 0.8, 2.35], [3.8, 0.7, 3.02]] as const) {
    group.add(block([sx, sy, 6.0], domeMat, [5.7, y, -10.5], false));
  }
  const slit = createVoxelMaterial('#13253D', { pixelVariation: 0, roughness: 0.85 });
  group.add(block([1.45, 3.0, 0.22], slit, [5.7, 2.2, -7.45], false));

  const metal = createBlockMaterial('metalPlate', { size: [0.4, 4, 0.4], tint: '#83949C' });
  group.add(block([0.55, 3.6, 0.55], metal, [-6.5, 2.0, -8]));
  const tube = new THREE.Group();
  tube.position.set(-6.5, 3.5, -8);
  tube.rotation.z = -0.72;
  tube.add(block([0.8, 0.8, 4.8], createVoxelMaterial('#5E6C73', { texture: 'metalPlate', size: [0.8, 0.8, 4.8], metalness: 0.45 }), [0, 0, 0]));
  tube.add(block([1.15, 1.15, 0.35], createVoxelMaterial('#9DDFF6', { pixelVariation: 0, emissive: '#6BC8E8', emissiveIntensity: 0.35 }), [0, 0, -2.5], false));
  group.add(tube);

  // Consoles, railings and pathway lights make the observatory feel operational.
  const console = createBlockMaterial('metalPlate', { size: [2.2, 1.2, 1.2], tint: '#44565E' });
  const screen = createVoxelMaterial('#78DFF4', { pixelVariation: 0, emissive: '#38C0E2', emissiveIntensity: 0.65, roughness: 0.18 });
  for (const [x, z] of [[-1.5, -5.0], [1.7, -5.6]] as const) {
    group.add(block([2.2, 1.2, 1.2], console, [x, 0.65, z]));
    group.add(block([1.45, 0.52, 0.06], screen, [x, 1.05, z + 0.62], false));
  }
  const railing = createVoxelMaterial('#6F8088', { texture: 'metalPlate', size: [0.15, 1, 0.15], metalness: 0.4, roughness: 0.5 });
  for (const x of [-10, -5, 0, 5, 10]) group.add(block([0.14, 1.1, 0.14], railing, [x, 0.9, -14.2]));
  group.add(block([20.1, 0.12, 0.12], railing, [0, 1.35, -14.2]));

  const pathLight = createVoxelGlow('#B9ECFF', 0.7);
  for (const [x, z] of [[-9, -1.8], [-5, -2.1], [-1, -2.5], [3, -2.9], [7, -3.3]] as const) {
    group.add(block([0.16, 0.85, 0.16], railing, [x, 0.42, z]));
    group.add(block([0.32, 0.24, 0.32], pathLight, [x, 0.94, z], false));
  }

  const starMat = createVoxelGlow('#F5FAFF', 0.9);
  for (let i = 0; i < 66; i++) {
    const x = ((i * 43) % 36) - 18;
    const y = 5.0 + ((i * 29) % 11) * 0.78;
    const size = 0.05 + (i % 4) * 0.016;
    group.add(block([size, size, 0.05], starMat, [x, y, -29 - (i % 3) * 0.55], false));
  }

  voxelRock(group, 12.0, -3.0, 1.0, '#586761');
  voxelRock(group, -12.2, -8.0, 0.8, '#53625D');
  group.add(createVoxelLighting({ shadowExtent: 22 }));
  return finish(scene, group, cameraState([6.2, 4.8, 14.2], [0, 3.7, -9.5], 49));
};

export const VOXEL_PRODUCTION_ENVIRONMENT_FACTORIES: Record<string, EnvironmentFactory> = {
  'environment.materialLab': createVoxelMaterialLab,
  'environment.classroomLab': createVoxelClassroomLab,
  'environment.kitchenLab': createVoxelKitchenLab,
  'environment.vehicleCabin': createVoxelVehicleCabin,
  'environment.dropLab': createVoxelDropLab,
  'environment.canyon': createVoxelCanyon,
  'environment.rainMeadow': createVoxelRainMeadow,
  'environment.nightOverlook': createVoxelNightOverlook,
  'environment.observatory': createVoxelObservatory,
};
