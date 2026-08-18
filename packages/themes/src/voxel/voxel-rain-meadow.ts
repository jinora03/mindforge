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
  createSkyDome,
} from './voxel-style';

const TERRAIN_CELL = 2;
const TERRAIN_X_MIN = -18;
const TERRAIN_X_MAX = 18;
const TERRAIN_Z_MIN = -30;
const TERRAIN_Z_MAX = 8;

function cameraState(
  position: [number, number, number],
  target: [number, number, number],
  fov: number,
): CameraState {
  return { position: new THREE.Vector3(...position), target: new THREE.Vector3(...target), fov };
}

function block(
  size: [number, number, number],
  material: THREE.Material | THREE.Material[],
  position: [number, number, number],
  castShadow = true,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position);
  mesh.castShadow = castShadow;
  mesh.receiveShadow = true;
  return mesh;
}

/** Stable integer hash used for authored-looking procedural scatter. */
function hash01(index: number, salt: number): number {
  let value = (Math.imul(index + 1, 374761393) + Math.imul(salt + 17, 668265263)) | 0;
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  value ^= value >>> 16;
  return (value >>> 0) / 4294967296;
}

function finish(
  scene: THREE.Scene,
  group: THREE.Group,
  defaultCamera: CameraState,
  update: (time: number) => void,
): EnvironmentInstance {
  return {
    object3d: group,
    defaultCamera,
    update(ctx): void {
      update(ctx.time);
    },
    dispose(): void {
      disposeObject3D(group);
      group.removeFromParent();
      scene.fog = null;
      scene.background = null;
    },
  };
}

function layer(name: string): THREE.Group {
  const group = new THREE.Group();
  group.name = name;
  return group;
}

function terrainHeight(x: number, z: number): number {
  // Keep a deliberately calm central science stage around the rainbow prism.
  const dx = x;
  const dz = z + 5.5;
  const stageDistance = Math.hypot(dx * 0.9, dz);
  if (stageDistance < 5.2) return 0;

  const broadSlope = z < -18 ? 0.9 : z < -10 ? 0.45 : 0;
  const sideRise = Math.abs(x) > 12 ? 0.6 : Math.abs(x) > 8 ? 0.25 : 0;
  const steppedNoise = Math.floor(hash01(Math.round(x * 3 + z * 7), 31) * 3) * 0.22;
  return Math.min(2.1, broadSlope + sideRise + steppedNoise);
}

function terrainMaterials(tint = '#FFFFFF'): THREE.Material[] {
  const side = createBlockMaterial('grassSide', { tint, size: [TERRAIN_CELL, 1, TERRAIN_CELL] });
  const top = createBlockMaterial('grassTop', { tint, size: [TERRAIN_CELL, 1, TERRAIN_CELL] });
  const dirt = tint === '#FFFFFF'
    ? createBlockMaterial('dirt', { size: [TERRAIN_CELL, 1, TERRAIN_CELL] })
    : createBlockMaterial('dirt', { tint, size: [TERRAIN_CELL, 1, TERRAIN_CELL] });
  // BoxGeometry group order: +X, -X, +Y, -Y, +Z, -Z.
  return [side, side, top, dirt, side, side];
}

function buildTerrain(parent: THREE.Group): void {
  const geometry = new THREE.BoxGeometry(TERRAIN_CELL, 1, TERRAIN_CELL);
  const palettes = [terrainMaterials(), terrainMaterials('#EAF4E5'), terrainMaterials('#DCEBD6')];
  const buckets = palettes.map((materials, index) => {
    const mesh = new THREE.InstancedMesh(geometry, materials, 512);
    mesh.name = `voxel-meadow-terrain-${index}`;
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    mesh.count = 0;
    return mesh;
  });

  const matrix = new THREE.Matrix4();
  let cellIndex = 0;
  for (let z = TERRAIN_Z_MIN; z <= TERRAIN_Z_MAX; z += TERRAIN_CELL) {
    for (let x = TERRAIN_X_MIN; x <= TERRAIN_X_MAX; x += TERRAIN_CELL) {
      const top = terrainHeight(x, z);
      const height = 0.72 + top;
      matrix.compose(
        new THREE.Vector3(x, top - height * 0.5, z),
        new THREE.Quaternion(),
        new THREE.Vector3(1, height, 1),
      );
      const bucket = buckets[Math.floor(hash01(cellIndex, 43) * buckets.length) % buckets.length];
      bucket.setMatrixAt(bucket.count, matrix);
      bucket.count += 1;
      cellIndex += 1;
    }
  }

  for (const bucket of buckets) {
    bucket.instanceMatrix.needsUpdate = true;
    parent.add(bucket);
  }
}

function buildWetPath(parent: THREE.Group): void {
  const stone = createBlockMaterial('gravelPath', { size: [1.55, 0.14, 1.15] });
  const wetStone = createBlockMaterial('stone', { size: [1.55, 0.12, 1.15], roughness: 0.5 });
  const puddle = createBlockMaterial('water', {
    size: [2.6, 0.045, 1.1],
    transparent: true,
    opacity: 0.72,
    roughness: 0.16,
    depthWrite: false,
  });

  for (let i = 0; i < 11; i++) {
    const z = 6.2 - i * 2.1;
    const x = -4.8 + Math.sin(i * 0.72) * 2.1;
    const y = terrainHeight(x, z) + 0.12;
    const tile = block([1.55, 0.14, 1.15], i % 3 === 0 ? wetStone : stone, [x, y, z], false);
    tile.rotation.y = (i % 2 === 0 ? -1 : 1) * 0.08;
    parent.add(tile);
  }

  for (const [x, z, sx, sz] of [
    [-10.2, 3.5, 3.8, 1.25],
    [7.8, 2.1, 4.4, 1.45],
    [8.4, -8.8, 3.4, 1.25],
    [-7.8, -14.5, 4.2, 1.5],
  ] as const) {
    const y = terrainHeight(x, z) + 0.035;
    const water = block([sx, 0.045, sz], puddle, [x, y, z], false);
    water.name = 'voxel-meadow-puddle';
    parent.add(water);
  }
}

function buildGrassScatter(parent: THREE.Group): THREE.InstancedMesh[] {
  const geometry = new THREE.BoxGeometry(0.09, 0.62, 0.09);
  const materials = [
    createBlockMaterial('grassTop', { tint: '#E3F2D8', size: [0.09, 0.62, 0.09] }),
    createBlockMaterial('grassTop', { tint: '#CFE7C1', size: [0.09, 0.62, 0.09] }),
  ];
  const meshes = materials.map((material, index) => {
    const mesh = new THREE.InstancedMesh(geometry, material, 190);
    mesh.name = `voxel-tall-grass-${index}`;
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    mesh.count = 0;
    return mesh;
  });

  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const position = new THREE.Vector3();
  const scale = new THREE.Vector3();
  for (let i = 0; i < 360; i++) {
    const x = -17 + hash01(i, 101) * 34;
    const z = -27 + hash01(i, 103) * 34;
    const stageDistance = Math.hypot(x * 0.9, z + 5.5);
    if (stageDistance < 4.4 || Math.abs(x + 4.8 + Math.sin(((6.2 - z) / 2.1) * 0.72) * 2.1) < 1.2) continue;
    const height = 0.48 + hash01(i, 107) * 0.78;
    position.set(x, terrainHeight(x, z) + height * 0.5 + 0.05, z);
    quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), hash01(i, 109) * Math.PI);
    scale.set(0.72 + hash01(i, 113) * 0.65, height / 0.62, 0.72 + hash01(i, 127) * 0.65);
    matrix.compose(position, quaternion, scale);
    const mesh = meshes[i % meshes.length];
    if (mesh.count >= mesh.instanceMatrix.count) continue;
    mesh.setMatrixAt(mesh.count, matrix);
    mesh.count += 1;
  }

  for (const mesh of meshes) {
    mesh.instanceMatrix.needsUpdate = true;
    parent.add(mesh);
  }
  return meshes;
}

function buildFern(parent: THREE.Group, x: number, z: number, scale = 1): void {
  const stem = createVoxelMaterial('#426E3A', { pixelVariation: 0, roughness: 0.92 });
  const leaf = createBlockMaterial('leaves', { tint: '#DBEBD1', size: [0.9, 0.12, 0.28] });
  const y = terrainHeight(x, z);
  parent.add(block([0.1, 0.65 * scale, 0.1], stem, [x, y + 0.32 * scale, z], false));
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2;
    const leafMesh = block(
      [0.85 * scale, 0.11 * scale, 0.24 * scale],
      leaf,
      [x + Math.cos(angle) * 0.32 * scale, y + 0.48 * scale, z + Math.sin(angle) * 0.32 * scale],
      false,
    );
    leafMesh.rotation.y = -angle;
    leafMesh.rotation.z = i % 2 === 0 ? 0.12 : -0.08;
    parent.add(leafMesh);
  }
}

function buildTree(parent: THREE.Group, x: number, z: number, scale: number, variant: number): void {
  const y = terrainHeight(x, z);
  const trunk = createBlockMaterial('logSide', { size: [0.58 * scale, 3.3 * scale, 0.58 * scale] });
  const leavesA = createBlockMaterial('leaves', { tint: variant % 2 === 0 ? '#E8F3DD' : '#DCEBD2' });
  const leavesB = createBlockMaterial('leaves', { tint: variant % 3 === 0 ? '#CFE3C2' : '#E1EED8' });

  parent.add(block([0.58 * scale, 3.3 * scale, 0.58 * scale], trunk, [x, y + 1.65 * scale, z]));
  for (const [ox, oy, oz, sx, sy, sz, material] of [
    [0, 3.45, 0, 2.7, 1.45, 2.55, leavesA],
    [-0.8, 3.85, 0.25, 1.85, 1.4, 1.75, leavesB],
    [0.82, 3.95, -0.18, 1.95, 1.35, 1.85, leavesA],
    [0.1, 4.65, 0.1, 1.75, 1.35, 1.65, leavesB],
  ] as const) {
    parent.add(block([sx * scale, sy * scale, sz * scale], material, [x + ox * scale, y + oy * scale, z + oz * scale], false));
  }
}

function buildRockCluster(parent: THREE.Group, x: number, z: number, scale: number): void {
  const y = terrainHeight(x, z);
  const stone = createBlockMaterial('stone', { tint: '#E3E9E5' });
  const moss = createBlockMaterial('grassTop', { tint: '#C7DFBA' });
  parent.add(block([1.25 * scale, 0.65 * scale, 1.05 * scale], stone, [x, y + 0.32 * scale, z], false));
  parent.add(block([0.72 * scale, 0.55 * scale, 0.74 * scale], stone, [x + 0.32 * scale, y + 0.78 * scale, z - 0.12 * scale], false));
  parent.add(block([0.58 * scale, 0.12 * scale, 0.5 * scale], moss, [x + 0.26 * scale, y + 1.1 * scale, z - 0.08 * scale], false));
}

function buildVegetation(parent: THREE.Group): THREE.InstancedMesh[] {
  const grass = buildGrassScatter(parent);
  for (const [x, z, scale, variant] of [
    [-13.5, 1.0, 1.22, 0],
    [12.5, -1.5, 1.05, 1],
    [-14.0, -9.0, 1.0, 2],
    [12.8, -12.0, 0.94, 3],
    [-10.5, -21.0, 0.88, 4],
    [9.5, -23.0, 0.84, 5],
  ] as const) buildTree(parent, x, z, scale, variant);

  for (let i = 0; i < 22; i++) {
    const x = -14 + hash01(i, 151) * 28;
    const z = 4 - hash01(i, 157) * 27;
    if (Math.hypot(x, z + 5.5) < 5) continue;
    buildFern(parent, x, z, 0.68 + hash01(i, 163) * 0.48);
  }

  const flowerStem = createVoxelMaterial('#4E793F', { pixelVariation: 0, roughness: 0.95 });
  const flowerColors = ['#F6D96A', '#F29AA8', '#EEF7FF', '#B7E08A'];
  for (let i = 0; i < 26; i++) {
    const x = -13 + hash01(i, 167) * 26;
    const z = 3 - hash01(i, 173) * 24;
    if (Math.hypot(x, z + 5.5) < 4.8) continue;
    const y = terrainHeight(x, z);
    parent.add(block([0.055, 0.32, 0.055], flowerStem, [x, y + 0.16, z], false));
    parent.add(block([0.2, 0.16, 0.2], createVoxelMaterial(flowerColors[i % flowerColors.length], { pixelVariation: 0, roughness: 0.76 }), [x, y + 0.38, z], false));
  }

  for (const [x, z, scale] of [
    [-11.5, 4.5, 0.95],
    [10.8, 4.0, 0.75],
    [-9.6, -5.5, 0.82],
    [10.2, -16.5, 1.05],
    [-5.0, -22.5, 0.72],
  ] as const) buildRockCluster(parent, x, z, scale);
  return grass;
}

function buildFence(parent: THREE.Group): void {
  const wood = createBlockMaterial('planks', { tint: '#C8A77B' });
  const z = -16.5;
  for (let x = -13.5; x <= 13.5; x += 3) {
    const y = terrainHeight(x, z);
    parent.add(block([0.22, 1.25, 0.22], wood, [x, y + 0.62, z], false));
  }
  for (let x = -12; x <= 12; x += 3) {
    const y = terrainHeight(x, z) + 0.65;
    parent.add(block([3.25, 0.16, 0.16], wood, [x + 1.5, y, z], false));
  }
}

function buildHorizon(parent: THREE.Group): void {
  const hillMaterials = [
    createBlockMaterial('grassSide', { tint: '#A7C49A' }),
    createBlockMaterial('grassSide', { tint: '#8EAF84' }),
    createBlockMaterial('stone', { tint: '#B5C1BD' }),
  ];
  for (let i = 0; i < 18; i++) {
    const x = -23 + i * 2.8;
    const height = 2.2 + hash01(i, 211) * 3.4;
    const depth = 3.2 + hash01(i, 223) * 2.2;
    const z = -34 - (i % 3) * 1.5;
    parent.add(block([3.4, height, depth], hillMaterials[i % hillMaterials.length], [x, height * 0.5 - 0.2, z], false));
  }

  // A distant forest breaks up the horizon silhouette without filling the hero stage.
  const distantTrunk = createVoxelMaterial('#405044', { pixelVariation: 0, roughness: 1 });
  const distantLeaf = createVoxelMaterial('#46664E', { pixelVariation: 0.04, roughness: 1 });
  for (let i = 0; i < 24; i++) {
    const x = -20 + hash01(i, 229) * 40;
    const z = -29 - hash01(i, 233) * 4;
    const scale = 0.42 + hash01(i, 239) * 0.38;
    parent.add(block([0.32 * scale, 2.1 * scale, 0.32 * scale], distantTrunk, [x, 1.05 * scale, z], false));
    parent.add(block([1.45 * scale, 1.25 * scale, 1.35 * scale], distantLeaf, [x, 2.45 * scale, z], false));
    parent.add(block([1.05 * scale, 0.95 * scale, 1.0 * scale], distantLeaf, [x + 0.18 * scale, 3.1 * scale, z], false));
  }
}

function buildCloudBank(parent: THREE.Group, x: number, y: number, z: number, scale: number, tint: string): void {
  const material = createBlockMaterial('cloud', { tint });
  const pieces: ReadonlyArray<readonly [number, number, number, number, number, number]> = [
    [0, 0, 0, 4.8, 1.35, 2.2],
    [-2.3, 0.45, 0.1, 3.2, 1.55, 2.0],
    [2.45, 0.52, -0.15, 3.4, 1.65, 2.15],
    [-0.65, 1.05, -0.08, 3.1, 1.5, 1.8],
    [1.0, 1.15, 0.08, 2.6, 1.35, 1.7],
  ];
  for (const [ox, oy, oz, sx, sy, sz] of pieces) {
    parent.add(block([sx * scale, sy * scale, sz * scale], material, [x + ox * scale, y + oy * scale, z + oz * scale], false));
  }
}

function buildSky(parent: THREE.Group): void {
  parent.add(createSkyDome({ top: '#4F6F82', horizon: '#8BAAB8', ground: '#60786F', radius: 150 }));

  // Dense upper framing + a deliberate sun gap keeps portrait shots from reading as empty blue sky.
  buildCloudBank(parent, -14.5, 12.2, -27, 1.35, '#AEBFC7');
  buildCloudBank(parent, -4.0, 13.6, -31, 1.6, '#C0CED4');
  buildCloudBank(parent, 8.8, 12.8, -29, 1.45, '#B4C5CD');
  buildCloudBank(parent, 17.0, 14.0, -34, 1.25, '#C6D3D8');
  buildCloudBank(parent, 2.5, 9.9, -37, 0.85, '#D5DFE3');

  const sun = block(
    [2.1, 2.1, 0.28],
    createVoxelMaterial('#FFF5B8', {
      pixelVariation: 0,
      emissive: '#FFE483',
      emissiveIntensity: 1.5,
      roughness: 0.18,
    }),
    [-10.2, 9.6, -32.5],
    false,
  );
  sun.name = 'voxel-meadow-sun';
  parent.add(sun);

  const halo = block([4.4, 4.4, 0.08], createVoxelGlow('#FFF0A8', 0.13), [-10.2, 9.6, -33.0], false);
  halo.name = 'voxel-meadow-sun-halo';
  parent.add(halo);
}

function buildRain(parent: THREE.Group): { mesh: THREE.InstancedMesh; update: (time: number) => void } {
  const material = createVoxelMaterial('#C4EBFA', {
    pixelVariation: 0,
    transparent: true,
    opacity: 0.55,
    roughness: 0.08,
    depthWrite: false,
  });
  const count = 144;
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.028, 0.78, 0.028), material, count);
  mesh.name = 'voxel-rain';
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.frustumCulled = false;

  const bases = Array.from({ length: count }, (_, i) => ({
    x: -17 + hash01(i, 251) * 34,
    y: 2 + hash01(i, 257) * 16,
    z: 7 - hash01(i, 263) * 39,
    speed: 7.4 + hash01(i, 269) * 3.1,
  }));
  const matrix = new THREE.Matrix4();
  const update = (time: number): void => {
    for (let i = 0; i < count; i++) {
      const base = bases[i];
      const y = ((base.y - time * base.speed + 32) % 18) + 0.4;
      matrix.makeTranslation(base.x, y, base.z);
      mesh.setMatrixAt(i, matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  };
  update(0);
  parent.add(mesh);
  return { mesh, update };
}

/**
 * MindForge's first hero-production environment. It intentionally uses a
 * foreground → stage → horizon → sky composition instead of treating the world
 * as a decorated floor plane. Everything remains deterministic and theme-owned.
 */
export const createVoxelRainMeadow: EnvironmentFactory = ({ services }): EnvironmentInstance => {
  const scene = services.scene;
  const root = new THREE.Group();
  root.name = 'voxel.environment.rainMeadow';
  root.userData.productionQuality = 'hero';
  root.userData.composition = 'foreground-midground-background';

  scene.background = new THREE.Color('#7698AA');
  scene.fog = new THREE.Fog('#7698AA', 52, 128);

  const terrain = layer('mf.rainMeadow.terrain');
  const wetGround = layer('mf.rainMeadow.wetGround');
  const vegetation = layer('mf.rainMeadow.vegetation');
  const foreground = layer('mf.rainMeadow.foreground');
  const horizon = layer('mf.rainMeadow.horizon');
  const sky = layer('mf.rainMeadow.sky');
  const weather = layer('mf.rainMeadow.weather');
  const heroClearing = layer('mf.rainMeadow.heroClearing');

  buildTerrain(terrain);
  buildWetPath(wetGround);
  buildVegetation(vegetation);
  buildFence(vegetation);
  buildHorizon(horizon);
  buildSky(sky);

  // Foreground framing exists mostly outside the central action lane so it adds
  // depth on 9:16 without hiding the prism or its spectrum beams.
  buildFern(foreground, -7.2, 5.6, 1.35);
  buildFern(foreground, 7.8, 5.2, 1.2);
  buildRockCluster(foreground, -10.8, 6.0, 1.2);
  buildRockCluster(foreground, 11.0, 5.0, 1.0);

  // Semantic empty layer for future authored hero props / optical staging. It
  // also gives tests and tools a stable composition hook without exposing mesh names.
  heroClearing.position.set(0, 0, -5.5);

  const rain = buildRain(weather);

  root.add(terrain, wetGround, vegetation, foreground, horizon, sky, weather, heroClearing);

  const sunBreak = new THREE.DirectionalLight('#FFF1C0', 0.68);
  sunBreak.name = 'voxel-meadow-sun-break';
  sunBreak.position.set(-9, 14, 7);
  sunBreak.target.position.set(1.5, 0, -9);
  sunBreak.castShadow = false;
  root.add(sunBreak, sunBreak.target);
  root.add(createVoxelLighting({ shadowExtent: 28 }));

  return finish(
    scene,
    root,
    cameraState([6.2, 4.8, 15.5], [0, 2.2, -8.5], 48),
    (time) => rain.update(time),
  );
};
