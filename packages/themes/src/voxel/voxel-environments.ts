import * as THREE from 'three';
import {
  disposeObject3D,
  type CameraState,
  type EnvironmentFactory,
  type EnvironmentInstance,
} from '@mindforge/engine';
import {
  VOXEL_PALETTE,
  createContactShadow,
  createVoxelGlow,
  createVoxelLighting,
  createVoxelMaterial,
} from './voxel-style';

function cameraState(
  position: [number, number, number],
  target: [number, number, number],
  fov: number,
): CameraState {
  return {
    position: new THREE.Vector3(...position),
    target: new THREE.Vector3(...target),
    fov,
  };
}

function block(
  size: [number, number, number],
  color: string,
  position: [number, number, number],
  options: { emissive?: string; emissiveIntensity?: number; roughness?: number; pixelVariation?: number } = {},
): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(...size),
    createVoxelMaterial(color, options),
  );
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function instancedBlocks(
  size: [number, number, number],
  color: string,
  positions: Array<[number, number, number]>,
  options: { emissive?: string; emissiveIntensity?: number; roughness?: number; pixelVariation?: number } = {},
): THREE.InstancedMesh {
  const mesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(...size),
    createVoxelMaterial(color, options),
    positions.length,
  );
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  const matrix = new THREE.Matrix4();
  positions.forEach((position, i) => {
    matrix.makeTranslation(...position);
    mesh.setMatrixAt(i, matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  return mesh;
}

function hash01(x: number, z: number, seed = 0): number {
  let n = (x * 374761393 + z * 668265263 + seed * 1442695041) | 0;
  n = (n ^ (n >>> 13)) * 1274126177;
  n ^= n >>> 16;
  return (n >>> 0) / 4294967295;
}

function terrainLevel(x: number, z: number): number {
  if (Math.abs(x) <= 2 && Math.abs(z) <= 2) return 0;
  const distance = Math.max(Math.abs(x), Math.abs(z));
  const noise = hash01(x, z, 17);
  if (distance >= 6) return noise > 0.42 ? 2 : 1;
  if (distance >= 4) return noise > 0.58 ? 1 : 0;
  return noise > 0.82 ? 1 : 0;
}

function createGardenTerrain(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'voxel-garden-terrain';
  const cell = 0.72;
  const radius = 7;
  const count = (radius * 2 + 1) ** 2;
  const dirtMaterial = createVoxelMaterial(VOXEL_PALETTE.earth, { pixelVariation: 0.16 });
  const grassMaterial = createVoxelMaterial(VOXEL_PALETTE.grass, { pixelVariation: 0.15 });
  const dirtGeometry = new THREE.BoxGeometry(cell, 0.34, cell);
  const capGeometry = new THREE.BoxGeometry(cell * 1.005, 0.1, cell * 1.005);
  const dirt = new THREE.InstancedMesh(dirtGeometry, dirtMaterial, count);
  const caps = new THREE.InstancedMesh(capGeometry, grassMaterial, count);
  dirt.castShadow = true;
  dirt.receiveShadow = true;
  caps.castShadow = true;
  caps.receiveShadow = true;

  const matrix = new THREE.Matrix4();
  let i = 0;
  for (let z = -radius; z <= radius; z++) {
    for (let x = -radius; x <= radius; x++) {
      const level = terrainLevel(x, z);
      const top = level * 0.28;
      matrix.makeTranslation(x * cell, top - 0.22, z * cell);
      dirt.setMatrixAt(i, matrix);
      matrix.makeTranslation(x * cell, top, z * cell);
      caps.setMatrixAt(i, matrix);
      i++;
    }
  }
  dirt.instanceMatrix.needsUpdate = true;
  caps.instanceMatrix.needsUpdate = true;
  group.add(dirt, caps);
  return group;
}

function addBlockTree(group: THREE.Group, x: number, z: number, scale: number, variant: number): void {
  const trunk = createVoxelMaterial(VOXEL_PALETTE.wood, { pixelVariation: 0.14 });
  const trunkDark = createVoxelMaterial(VOXEL_PALETTE.woodDark, { pixelVariation: 0.12 });
  for (let i = 0; i < 4; i++) {
    const piece = new THREE.Mesh(new THREE.BoxGeometry(0.34 * scale, 0.4 * scale, 0.34 * scale), i % 2 === 0 ? trunk : trunkDark);
    piece.position.set(x, (0.2 + i * 0.38) * scale, z);
    piece.castShadow = true;
    piece.receiveShadow = true;
    group.add(piece);
  }

  const leaf = createVoxelMaterial(variant % 2 === 0 ? VOXEL_PALETTE.leaf : VOXEL_PALETTE.leafLight, {
    roughness: 0.98,
    pixelVariation: 0.17,
  });
  const crown = new THREE.Group();
  crown.position.set(x, 1.55 * scale, z);
  const offsets: Array<[number, number, number]> = [
    [-0.42, 0, 0], [0, 0, 0], [0.42, 0, 0],
    [0, 0, -0.42], [0, 0, 0.42],
    [-0.28, 0.38, -0.12], [0.28, 0.38, 0.12], [0, 0.7, 0],
  ];
  for (const [ox, oy, oz] of offsets) {
    const cube = new THREE.Mesh(new THREE.BoxGeometry(0.72 * scale, 0.62 * scale, 0.72 * scale), leaf);
    cube.position.set(ox * scale, oy * scale, oz * scale);
    cube.castShadow = true;
    cube.receiveShadow = true;
    crown.add(cube);
  }
  group.add(crown);
}

function addGrassTuft(group: THREE.Group, x: number, z: number, scale: number): void {
  const material = createVoxelMaterial(VOXEL_PALETTE.grassLight, { pixelVariation: 0.09 });
  const tuft = new THREE.Group();
  tuft.position.set(x, 0.14, z);
  for (let i = 0; i < 3; i++) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.055 * scale, (0.22 + i * 0.07) * scale, 0.055 * scale), material);
    blade.position.set((i - 1) * 0.08 * scale, blade.geometry.parameters.height / 2, (i % 2) * 0.05 * scale);
    blade.castShadow = true;
    tuft.add(blade);
  }
  group.add(tuft);
}

function addFlower(group: THREE.Group, x: number, z: number, color: string): void {
  const stem = block([0.045, 0.28, 0.045], VOXEL_PALETTE.leaf, [x, 0.22, z], { pixelVariation: 0.05 });
  const bloom = block([0.13, 0.13, 0.13], color, [x, 0.41, z], { pixelVariation: 0.04 });
  group.add(stem, bloom);
}

function createCloud(x: number, y: number, z: number, scale: number): THREE.Group {
  const cloud = new THREE.Group();
  cloud.position.set(x, y, z);
  const material = createVoxelMaterial('#F5FAFB', { roughness: 1, pixelVariation: 0.025 });
  const specs: Array<[number, number, number, number, number, number]> = [
    [1.4, 0.32, 0.55, 0, 0, 0],
    [0.7, 0.36, 0.62, -0.48, 0.2, 0],
    [0.82, 0.44, 0.62, 0.35, 0.24, 0],
    [0.55, 0.28, 0.5, 0.85, 0.03, 0.02],
  ];
  for (const [sx, sy, sz, px, py, pz] of specs) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx * scale, sy * scale, sz * scale), material);
    mesh.position.set(px * scale, py * scale, pz * scale);
    cloud.add(mesh);
  }
  return cloud;
}

function createAmbientCubes(
  count: number,
  color: string,
  bounds: { x: number; y: number; z: number },
  seed: number,
): { mesh: THREE.InstancedMesh; bases: THREE.Vector3[] } {
  const geometry = new THREE.BoxGeometry(0.055, 0.055, 0.055);
  const material = createVoxelGlow(color, 0.72);
  material.transparent = true;
  material.depthWrite = false;
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  const bases: THREE.Vector3[] = [];
  for (let i = 0; i < count; i++) {
    bases.push(new THREE.Vector3(
      (hash01(i, seed, 1) * 2 - 1) * bounds.x,
      0.4 + hash01(i, seed, 2) * bounds.y,
      (hash01(i, seed, 3) * 2 - 1) * bounds.z,
    ));
  }
  return { mesh, bases };
}

function updateAmbientCubes(mesh: THREE.InstancedMesh, bases: THREE.Vector3[], time: number, speed: number): void {
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const scale = new THREE.Vector3();
  const rotation = new THREE.Quaternion();
  for (let i = 0; i < bases.length; i++) {
    const base = bases[i];
    position.set(
      base.x + Math.sin(time * speed + i * 1.7) * 0.08,
      base.y + Math.sin(time * speed * 1.35 + i * 0.73) * 0.11,
      base.z + Math.cos(time * speed * 0.82 + i * 1.19) * 0.07,
    );
    const pulse = 0.7 + 0.3 * Math.sin(time * speed * 2 + i * 0.9);
    scale.setScalar(pulse);
    matrix.compose(position, rotation, scale);
    mesh.setMatrixAt(i, matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
}

/**
 * Lively block-built garden. The playable space has stepped terrain, trees,
 * flowers, grass, water, distant blocks, drifting clouds and small ambient
 * cubes so it feels inhabited instead of like a flat demo plane.
 */
export const createVoxelDreamGarden: EnvironmentFactory = ({ services }): EnvironmentInstance => {
  const scene = services.scene;
  const group = new THREE.Group();
  group.name = 'voxel.environment.dreamGarden';

  scene.background = new THREE.Color(VOXEL_PALETTE.sky);
  scene.fog = new THREE.Fog(new THREE.Color(VOXEL_PALETTE.fog), 10, 28);

  group.add(createGardenTerrain());

  // Clear central path with irregular block paving.
  const pathColors = [VOXEL_PALETTE.stoneLight, VOXEL_PALETTE.stone, '#858D8C'];
  for (let i = -6; i <= 6; i++) {
    const x = i % 3 === 0 ? -0.12 : i % 3 === 1 ? 0.1 : 0;
    const color = pathColors[(i + 6) % pathColors.length];
    group.add(block([0.64, 0.11, 0.58], color, [x, 0.12, i * 0.58 + 0.8], { pixelVariation: 0.16 }));
  }

  // Shallow block pond gives a strong blue counterpoint and extra scene depth.
  for (let z = 0; z < 3; z++) {
    for (let x = 0; x < 3; x++) {
      group.add(block([0.64, 0.07, 0.64], VOXEL_PALETTE.water, [-3.55 + x * 0.62, 0.1, 1.4 + z * 0.62], {
        emissive: '#1E6D9E',
        emissiveIntensity: 0.08,
        pixelVariation: 0.08,
      }));
    }
  }
  group.add(block([2.2, 0.22, 0.28], VOXEL_PALETTE.wood, [-2.95, 0.31, 2.0], { pixelVariation: 0.14 }));

  addBlockTree(group, -3.5, -2.5, 1.05, 0);
  addBlockTree(group, 3.7, -2.9, 1.18, 1);
  addBlockTree(group, -4.1, 3.1, 0.92, 2);
  addBlockTree(group, 4.25, 2.7, 0.96, 3);
  addBlockTree(group, 4.6, -0.1, 0.8, 4);

  const grassPositions: Array<[number, number, number]> = [
    [-1.7, -2.0, 1], [-2.25, -1.25, 0.9], [1.8, -1.75, 1], [2.4, -0.85, 0.85],
    [-1.7, 2.7, 1.1], [1.65, 2.45, 0.85], [3.0, 1.6, 0.95], [-3.25, 0.2, 0.9],
    [2.8, 3.6, 1], [-4.2, -0.2, 1.15], [1.1, 3.4, 0.8], [-1.2, -3.3, 0.8],
  ];
  for (const [x, z, scale] of grassPositions) addGrassTuft(group, x, z, scale);

  const flowers: Array<[number, number, string]> = [
    [-1.9, 1.45, '#FFF4D3'], [-2.2, 1.72, '#F8D74B'], [1.9, 1.5, '#F06B49'],
    [2.35, 2.1, '#FFF4D3'], [3.1, 0.8, '#62D9FF'], [-3.4, -0.7, '#F8D74B'],
  ];
  for (const [x, z, color] of flowers) addFlower(group, x, z, color);

  // Small fence and lamp make the world read as a designed place, not terrain noise.
  for (let i = 0; i < 5; i++) {
    const x = -2.0 + i * 0.5;
    group.add(block([0.11, 0.65, 0.11], VOXEL_PALETTE.woodDark, [x, 0.39, -3.7], { pixelVariation: 0.13 }));
  }
  group.add(block([2.2, 0.1, 0.1], VOXEL_PALETTE.wood, [-1.0, 0.5, -3.7], { pixelVariation: 0.12 }));
  group.add(block([2.2, 0.1, 0.1], VOXEL_PALETTE.wood, [-1.0, 0.28, -3.7], { pixelVariation: 0.12 }));
  group.add(block([0.16, 1.5, 0.16], VOXEL_PALETTE.woodDark, [2.7, 0.75, 3.15], { pixelVariation: 0.12 }));
  group.add(block([0.34, 0.34, 0.34], '#FFD66B', [2.7, 1.58, 3.15], {
    emissive: '#FFB13D', emissiveIntensity: 0.9, pixelVariation: 0.04,
  }));

  const clouds = new THREE.Group();
  clouds.add(createCloud(-4.7, 4.5, -7.0, 1));
  clouds.add(createCloud(3.8, 3.9, -8.2, 0.82));
  clouds.add(createCloud(0.4, 5.1, -10.5, 1.18));
  group.add(clouds);

  const sun = block([0.75, 0.75, 0.18], '#FFF1A4', [5.5, 5.5, -10.8], {
    emissive: '#FFD66A', emissiveIntensity: 0.85, pixelVariation: 0.03,
  });
  group.add(sun);

  const ambient = createAmbientCubes(18, '#E8FF99', { x: 4.2, y: 2.2, z: 4.2 }, 31);
  group.add(ambient.mesh);

  const subjectShadow = createContactShadow(1.15, 0.75, 0.2);
  subjectShadow.position.y = 0.16;
  group.add(subjectShadow);
  group.add(createVoxelLighting());

  return {
    object3d: group,
    defaultCamera: cameraState([0, 1.6, 4.9], [0, 1.0, 0], 39),
    update(ctx): void {
      clouds.position.x = Math.sin(ctx.time * 0.12) * 0.42;
      clouds.position.z = Math.cos(ctx.time * 0.065) * 0.08;
      updateAmbientCubes(ambient.mesh, ambient.bases, ctx.time, 0.78);
    },
    dispose(): void {
      disposeObject3D(group);
      group.removeFromParent();
      scene.fog = null;
      scene.background = null;
    },
  };
};

function addCrate(group: THREE.Group, x: number, y: number, z: number, scale = 1): void {
  group.add(block([0.72 * scale, 0.72 * scale, 0.72 * scale], VOXEL_PALETTE.wood, [x, y, z], { pixelVariation: 0.16 }));
  const trim = VOXEL_PALETTE.woodDark;
  group.add(block([0.76 * scale, 0.08 * scale, 0.08 * scale], trim, [x, y + 0.24 * scale, z + 0.37 * scale], { pixelVariation: 0.08 }));
  group.add(block([0.08 * scale, 0.76 * scale, 0.08 * scale], trim, [x - 0.28 * scale, y, z + 0.37 * scale], { pixelVariation: 0.08 }));
}

/**
 * Energetic block workshop / forge. Heat is surrounded by tiled stone, molten
 * channels, lamps, crates, shelving and deterministic drifting embers so the
 * machine feels embedded in an active game world.
 */
export const createVoxelArtifactStage: EnvironmentFactory = ({ services }): EnvironmentInstance => {
  const scene = services.scene;
  const group = new THREE.Group();
  group.name = 'voxel.environment.artifactStage';

  scene.background = new THREE.Color('#6EA6C1');
  scene.fog = new THREE.Fog(new THREE.Color('#7D9FA9'), 13, 34);

  // Tiled stone floor with darker seams. Instancing keeps the richer world cheap.
  const floorDark: Array<[number, number, number]> = [];
  const floorStone: Array<[number, number, number]> = [];
  for (let z = -6; z <= 6; z++) {
    for (let x = -7; x <= 7; x++) {
      const position: [number, number, number] = [x * 0.9, -0.18, z * 0.9];
      ((Math.abs(x) + Math.abs(z)) % 3 === 0 ? floorDark : floorStone).push(position);
    }
  }
  group.add(
    instancedBlocks([0.92, 0.26, 0.92], VOXEL_PALETTE.stoneDark, floorDark, { roughness: 0.98, pixelVariation: 0.16 }),
    instancedBlocks([0.92, 0.26, 0.92], VOXEL_PALETTE.stone, floorStone, { roughness: 0.98, pixelVariation: 0.16 }),
  );

  // Central machine dais.
  group.add(block([5.4, 0.34, 5.4], VOXEL_PALETTE.stoneDark, [0, 0.12, 0], { pixelVariation: 0.14 }));
  group.add(block([4.45, 0.22, 4.45], VOXEL_PALETTE.stoneLight, [0, 0.38, 0], { pixelVariation: 0.15 }));
  const machineShadow = createContactShadow(3.1, 2.4, 0.26);
  machineShadow.position.y = 0.51;
  group.add(machineShadow);

  // Molten side channels: strong moving light and color around the central action.
  const lavaBlocks: THREE.Mesh[] = [];
  for (const x of [-3.5, 3.5]) {
    for (let z = -4; z <= 4; z++) {
      const lava = block([0.64, 0.12, 0.64], z % 2 === 0 ? VOXEL_PALETTE.heat : VOXEL_PALETTE.heatBright, [x, 0.04, z * 0.66], {
        emissive: VOXEL_PALETTE.heat,
        emissiveIntensity: 0.95,
        pixelVariation: 0.08,
      });
      lavaBlocks.push(lava);
      group.add(lava);
    }
    group.add(block([0.18, 0.38, 6.1], VOXEL_PALETTE.stoneDark, [x - 0.45, 0.08, 0], { pixelVariation: 0.15 }));
    group.add(block([0.18, 0.38, 6.1], VOXEL_PALETTE.stoneDark, [x + 0.45, 0.08, 0], { pixelVariation: 0.15 }));
  }

  // Workshop back wall with shelving and glowing furnace apertures.
  const wallDark: Array<[number, number, number]> = [];
  const wallStone: Array<[number, number, number]> = [];
  for (let x = -6; x <= 6; x++) {
    for (let y = 0; y < 4; y++) {
      const position: [number, number, number] = [x * 0.9, 0.44 + y * 0.84, -5.3];
      (y % 2 === 0 ? wallDark : wallStone).push(position);
    }
  }
  group.add(
    instancedBlocks([0.92, 0.88, 0.42], VOXEL_PALETTE.stoneDark, wallDark, { pixelVariation: 0.15 }),
    instancedBlocks([0.92, 0.88, 0.42], VOXEL_PALETTE.stone, wallStone, { pixelVariation: 0.15 }),
  );
  for (const x of [-3.8, 0, 3.8]) {
    group.add(block([1.25, 0.82, 0.12], '#2E383A', [x, 1.15, -5.02], { pixelVariation: 0.12 }));
    group.add(block([0.82, 0.46, 0.13], VOXEL_PALETTE.heatBright, [x, 1.15, -4.95], {
      emissive: VOXEL_PALETTE.heat, emissiveIntensity: 1.25, pixelVariation: 0.06,
    }));
  }

  // Gantry and hanging lamps add vertical depth.
  const gantry = new THREE.Group();
  const metal = createVoxelMaterial(VOXEL_PALETTE.metal, { metalness: 0.1, roughness: 0.82, pixelVariation: 0.12 });
  for (const x of [-4.8, 4.8]) {
    for (const z of [-2.7, 2.2]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.32, 5.2, 0.32), metal);
      post.position.set(x, 2.35, z);
      post.castShadow = true;
      gantry.add(post);
    }
  }
  for (const z of [-2.7, 2.2]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(9.9, 0.28, 0.3), metal);
    rail.position.set(0, 4.82, z);
    rail.castShadow = true;
    gantry.add(rail);
  }
  group.add(gantry);

  const lamps: THREE.Mesh[] = [];
  const lampPositions: Array<[number, number, number]> = [
    [-2.7, 3.3, -1.8], [2.7, 3.3, -1.8], [-2.7, 3.3, 1.4], [2.7, 3.3, 1.4],
  ];
  for (const position of lampPositions) {
    group.add(block([0.12, 0.72, 0.12], VOXEL_PALETTE.metal, [position[0], position[1] + 0.4, position[2]], { pixelVariation: 0.1 }));
    const lamp = block([0.38, 0.38, 0.38], VOXEL_PALETTE.heatBright, position, {
      emissive: VOXEL_PALETTE.heat,
      emissiveIntensity: 1.35,
      pixelVariation: 0.04,
    });
    lamps.push(lamp);
    group.add(lamp);
  }

  addCrate(group, -5.0, 0.36, 2.7, 1);
  addCrate(group, -4.35, 0.3, 3.15, 0.8);
  addCrate(group, 5.0, 0.36, 2.85, 1);
  addCrate(group, 4.35, 0.3, 3.3, 0.8);

  // Block shelves with colorful ingredients/parts.
  for (const x of [-5.1, 5.1]) {
    group.add(block([1.7, 0.12, 0.5], VOXEL_PALETTE.woodDark, [x, 1.4, -2.2], { pixelVariation: 0.12 }));
    group.add(block([1.7, 0.12, 0.5], VOXEL_PALETTE.woodDark, [x, 2.2, -2.2], { pixelVariation: 0.12 }));
    for (let i = 0; i < 3; i++) {
      const color = i === 0 ? VOXEL_PALETTE.information : i === 1 ? '#76D96B' : VOXEL_PALETTE.copper;
      group.add(block([0.28, 0.4, 0.28], color, [x - 0.5 + i * 0.5, 1.68, -2.18], {
        emissive: i === 0 ? VOXEL_PALETTE.information : undefined,
        emissiveIntensity: i === 0 ? 0.3 : 0,
        pixelVariation: 0.08,
      }));
    }
  }

  const embers = createAmbientCubes(32, VOXEL_PALETTE.heatBright, { x: 4.0, y: 3.8, z: 4.0 }, 71);
  group.add(embers.mesh);

  group.add(createVoxelLighting({ warm: true }));
  const warmFill = new THREE.PointLight(new THREE.Color('#FF8A3D'), 24, 11, 2);
  warmFill.position.set(0, 2.8, 2.6);
  group.add(warmFill);
  const furnaceFill = new THREE.PointLight(new THREE.Color('#FFB13D'), 15, 8, 2);
  furnaceFill.position.set(0, 1.4, -4.5);
  group.add(furnaceFill);

  return {
    object3d: group,
    defaultCamera: cameraState([0, 2.65, 10.3], [0, 1.55, 0], 39),
    update(ctx): void {
      gantry.position.x = Math.sin(ctx.time * 0.18) * 0.025;
      for (let i = 0; i < lavaBlocks.length; i++) {
        const material = lavaBlocks[i].material as THREE.MeshStandardMaterial;
        material.emissiveIntensity = 0.78 + 0.28 * Math.sin(ctx.time * 2.2 + i * 0.67);
      }
      for (let i = 0; i < lamps.length; i++) {
        const material = lamps[i].material as THREE.MeshStandardMaterial;
        material.emissiveIntensity = 1.15 + 0.22 * Math.sin(ctx.time * 1.6 + i * 1.1);
      }
      updateAmbientCubes(embers.mesh, embers.bases, ctx.time, 1.3);
    },
    dispose(): void {
      disposeObject3D(group);
      group.removeFromParent();
      scene.fog = null;
      scene.background = null;
    },
  };
};

/** Floating voxel biome retained for semantic environment parity. */
export const createVoxelCosmicVoid: EnvironmentFactory = ({ services }): EnvironmentInstance => {
  const scene = services.scene;
  const group = new THREE.Group();
  group.name = 'voxel.environment.cosmicVoid';

  scene.background = new THREE.Color('#345D78');
  scene.fog = new THREE.Fog(new THREE.Color('#4E7890'), 10, 34);

  const islands = new THREE.Group();
  for (let i = 0; i < 22; i++) {
    const a = i * 2.399963229728653;
    const radius = 4.4 + (i % 5) * 1.15;
    const x = Math.cos(a) * radius;
    const z = Math.sin(a) * radius - 2.5;
    const y = 0.2 + (i % 7) * 0.5;
    islands.add(block([0.7 + (i % 3) * 0.28, 0.5, 0.7 + ((i + 1) % 3) * 0.25], VOXEL_PALETTE.earthDark, [x, y, z], { pixelVariation: 0.15 }));
    islands.add(block([0.72 + (i % 3) * 0.28, 0.12, 0.72 + ((i + 1) % 3) * 0.25], i % 4 === 0 ? VOXEL_PALETTE.grassLight : VOXEL_PALETTE.stone, [x, y + 0.3, z], { pixelVariation: 0.14 }));
    if (i % 5 === 0) {
      islands.add(block([0.18, 0.18, 0.18], VOXEL_PALETTE.information, [x, y + 0.55, z], {
        emissive: VOXEL_PALETTE.information, emissiveIntensity: 0.8, pixelVariation: 0.04,
      }));
    }
  }
  group.add(islands);

  const stars = createAmbientCubes(28, '#D9F2FF', { x: 8, y: 5.5, z: 8 }, 101);
  group.add(stars.mesh, createVoxelLighting());

  return {
    object3d: group,
    defaultCamera: cameraState([0, 1.7, 8.2], [0, 1, 0], 41),
    update(ctx): void {
      islands.rotation.y = ctx.time * 0.018;
      updateAmbientCubes(stars.mesh, stars.bases, ctx.time, 0.34);
    },
    dispose(): void {
      disposeObject3D(group);
      group.removeFromParent();
      scene.fog = null;
      scene.background = null;
    },
  };
};

export const VOXEL_ENVIRONMENT_FACTORIES: Record<string, EnvironmentFactory> = {
  'environment.cosmicVoid': createVoxelCosmicVoid,
  'environment.artifactStage': createVoxelArtifactStage,
  'environment.dreamGarden': createVoxelDreamGarden,
};
