import * as THREE from 'three';
import {
  disposeObject3D,
  type CameraState,
  type EnvironmentFactory,
  type EnvironmentInstance,
} from '@mindforge/engine';
import {
  BLOCK,
  VOXEL_PALETTE,
  createBlockMaterial,
  createSkyDome,
  createVoxelLighting,
  createVoxelMaterial,
} from './voxel-style';
import {
  BlockField,
  addTree,
  buildCloudLayer,
  buildDistantHills,
  buildTerrain,
  hash01,
} from './voxel-world';

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

/** A single free-standing box, sized in world units rather than grid cells. */
function block(
  size: [number, number, number],
  texture: Parameters<typeof createBlockMaterial>[0],
  position: [number, number, number],
  options: {
    tint?: string;
    emissive?: string;
    emissiveIntensity?: number;
    roughness?: number;
    metalness?: number;
  } = {},
): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(...size),
    createBlockMaterial(texture, { ...options, size }),
  );
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/** Find the instanced mesh emitted for a block kind so it can be animated. */
function findBlocks(group: THREE.Object3D, kind: string): THREE.InstancedMesh | undefined {
  let found: THREE.InstancedMesh | undefined;
  group.traverse((node) => {
    if (!found && node.name === `blocks:${kind}`) found = node as THREE.InstancedMesh;
  });
  return found;
}

function firstStandardMaterial(mesh: THREE.Mesh | undefined): THREE.MeshStandardMaterial | undefined {
  if (!mesh) return undefined;
  const material = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
  return material as THREE.MeshStandardMaterial;
}

/* ----------------------------------------------------------- decorations -- */

interface DecorationSpec {
  readonly positions: Array<[number, number, number]>;
  readonly size: [number, number, number];
  readonly texture: Parameters<typeof createBlockMaterial>[0];
  readonly tint?: string;
}

/** Ground clutter at sub-block scale, instanced per family. */
function buildDecorations(specs: DecorationSpec[]): THREE.Group {
  const group = new THREE.Group();
  group.name = 'voxel-ground-detail';
  const matrix = new THREE.Matrix4();
  for (const spec of specs) {
    if (spec.positions.length === 0) continue;
    const mesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(...spec.size),
      createBlockMaterial(spec.texture, { tint: spec.tint, size: spec.size }),
      spec.positions.length,
    );
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    spec.positions.forEach((position, i) => {
      matrix.makeTranslation(...position);
      mesh.setMatrixAt(i, matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    group.add(mesh);
  }
  return group;
}

/* --------------------------------------------------------- dream garden --- */

const GARDEN_SEED = 1207;

/**
 * A continuous block landscape rather than a decorated platform.
 *
 * Composition is driven by where the episode's cameras actually look. In 9:16
 * at the framing this episode uses, the visible background behind the subject
 * is a narrow cone roughly two blocks wide at the tree line and a tall band of
 * sky above it — so the density that matters is *behind and above* the subject,
 * not spread evenly around them. Ground rises toward the back to give the
 * subject something to read against; clouds and distant hills fill the upper
 * band that would otherwise be flat colour.
 */
export const createVoxelDreamGarden: EnvironmentFactory = ({ services }): EnvironmentInstance => {
  const scene = services.scene;
  const group = new THREE.Group();
  group.name = 'voxel.environment.dreamGarden';

  scene.background = new THREE.Color(VOXEL_PALETTE.skyHorizon);
  scene.fog = new THREE.Fog(new THREE.Color(VOXEL_PALETTE.fog), 88, 190);

  group.add(
    createSkyDome({
      top: VOXEL_PALETTE.skyHigh,
      horizon: VOXEL_PALETTE.skyHorizon,
      ground: '#8FB27A',
      radius: 150,
    }),
  );

  // Grid origin is one block below the world floor so block tops land on y=0,
  // which is the plane every episode places characters and props on.
  const terrainField = new BlockField(BLOCK, new THREE.Vector3(0, -1, 0));
  const terrain = buildTerrain(terrainField, {
    halfX: 28,
    halfZ: 28,
    seed: GARDEN_SEED,
    // Low amplitude on purpose: at one-block steps, gentle plains read as
    // terrain, while anything steeper reads as a canyon of cubes around the
    // subject and destroys the staging.
    amplitude: 2.4,
    stageRadius: 6,
    stageFalloff: 15,
    waterLevel: -3,
    // Deeper exposed faces mean cliffs show grass over dirt over stone, which
    // is where a block landscape gets most of its readable structure.
    maxExposedDepth: 6,
    // Ground rises slowly away from camera so the subject has something to
    // read against without being walled in.
    bias: (_x, z) => Math.max(0, -z - 10) * 0.14,
  });
  group.add(terrainField.build('voxel-garden-terrain'));

  // Deterministic tree line, denser on the rising ground behind the subject.
  const propField = new BlockField(BLOCK, new THREE.Vector3(0, -1, 0));
  for (const cell of terrain.surface) {
    const { x, z, y } = cell;
    const radial = Math.sqrt(x * x + z * z);
    // Trees thicken with distance: a forest edge in the mid-ground, open
    // ground where the subject stands.
    if (radial < 13) continue;
    const density = radial > 22 ? 0.04 : radial > 17 ? 0.018 : 0.007;
    if (hash01(x, z, GARDEN_SEED + 3) < density) {
      addTree(propField, x, y, z, GARDEN_SEED + 11, { minHeight: 4, maxHeight: 7 });
    }
  }
  // Hero trees placed at the *edges* of the held closeup's background cone so
  // they frame the subject instead of becoming a flat wall behind them.
  addTree(propField, -11, terrain.heightAt(-11, -14), -14, GARDEN_SEED + 21, { minHeight: 7, maxHeight: 7 });
  addTree(propField, 9, terrain.heightAt(9, -17), -17, GARDEN_SEED + 22, { minHeight: 8, maxHeight: 8 });
  addTree(propField, -17, terrain.heightAt(-17, -20), -20, GARDEN_SEED + 23, { minHeight: 6, maxHeight: 7 });

  // A gravel path leaving the staging area gives the ground direction.
  for (let z = -1; z >= -18; z--) {
    const drift = Math.round(Math.sin(z * 0.28) * 1.4) - 1;
    const y = terrain.heightAt(drift, z);
    propField.set(drift, y, z, 'path');
    if (hash01(drift, z, GARDEN_SEED + 41) > 0.45) propField.set(drift + 1, terrain.heightAt(drift + 1, z), z, 'path');
  }

  // A low fence and a few boulders read as an inhabited place, not raw terrain.
  for (let x = 3; x <= 10; x++) {
    const y = terrain.heightAt(x, -9);
    propField.set(x, y + 1, -9, 'planks');
    if (x % 3 === 0) propField.set(x, y + 2, -9, 'log');
  }
  for (const [rx, rz] of [[8, -7], [-9, -8], [11, -14], [-13, -11]] as const) {
    const y = terrain.heightAt(rx, rz);
    propField.set(rx, y + 1, rz, 'cobble');
    if (hash01(rx, rz, GARDEN_SEED + 51) > 0.5) propField.set(rx + 1, y + 1, rz, 'cobble');
  }
  group.add(propField.build('voxel-garden-props'));

  // Sub-block clutter: tufts and flowers scattered on nearby grass only.
  const tufts: Array<[number, number, number]> = [];
  const stems: Array<[number, number, number]> = [];
  const blooms: Array<[number, number, number]> = [];
  for (const cell of terrain.surface) {
    const radial = Math.sqrt(cell.x * cell.x + cell.z * cell.z);
    if (radial < 1.6 || radial > 14) continue;
    const roll = hash01(cell.x, cell.z, GARDEN_SEED + 61);
    const wx = cell.x + 0.5 + (hash01(cell.x, cell.z, GARDEN_SEED + 63) - 0.5) * 0.6;
    const wz = cell.z + 0.5 + (hash01(cell.x, cell.z, GARDEN_SEED + 67) - 0.5) * 0.6;
    // `cell.y` is already the world height of the column's top face (the grid
    // origin is offset one block down so block tops land on integers). Adding
    // another block here left every tuft and flower hovering at chest height.
    const wy = cell.y;
    if (roll > 0.72) {
      // Grass reads as a small cluster of cubes. A single flat plate has no
      // alpha to hide behind, so it renders as a card standing in a field.
      tufts.push([wx, wy + 0.07, wz]);
      tufts.push([wx + 0.14, wy + 0.05, wz - 0.11]);
      if (roll > 0.86) tufts.push([wx - 0.12, wy + 0.1, wz + 0.13]);
    } else if (roll > 0.68) {
      stems.push([wx, wy + 0.16, wz]);
      blooms.push([wx, wy + 0.36, wz]);
    }
  }
  group.add(
    buildDecorations([
      { positions: tufts, size: [0.15, 0.15, 0.15], texture: 'grassTop' },
      { positions: stems, size: [0.07, 0.32, 0.07], texture: 'flat', tint: VOXEL_PALETTE.leaf },
      { positions: blooms, size: [0.2, 0.2, 0.2], texture: 'flat', tint: '#F2D14B' },
    ]),
  );

  group.add(
    buildDistantHills({
      seed: GARDEN_SEED + 71,
      innerRadius: 42,
      outerRadius: 118,
      unit: 5,
      amplitude: 5,
      baseY: -3,
    }),
  );

  const clouds = buildCloudLayer({
    seed: GARDEN_SEED + 81,
    count: 30,
    spread: 190,
    height: 42,
    heightJitter: 4,
    unit: 4,
  });
  group.add(clouds);
  const cloudOrigin = clouds.position.clone();

  group.add(createVoxelLighting({ shadowExtent: 15 }));

  return {
    object3d: group,
    defaultCamera: cameraState([1.6, 1.8, 5.2], [0, 1.1, 0], 40),
    update(ctx): void {
      // Slow, continuous drift: a pure function of time, so seeking is exact.
      clouds.position.set(cloudOrigin.x + ctx.time * 0.19, cloudOrigin.y, cloudOrigin.z);
    },
    dispose(): void {
      disposeObject3D(group);
      group.removeFromParent();
      scene.fog = null;
      scene.background = null;
    },
  };
};

/* -------------------------------------------------------- artifact stage -- */

const FORGE_SEED = 907;

/**
 * An enclosed block forge. The previous stage put a 4-block wall under an open
 * blue sky, so a third of every frame was daylight above an "interior" — the
 * scene could not read as a furnace hall. This version encloses the space,
 * fills the tall part of the 9:16 frame with a hood, gantry and hanging lamps,
 * and keeps the molten channels inside the measured horizontal frustum instead
 * of out at the edges where no shot ever saw them.
 */
export const createVoxelArtifactStage: EnvironmentFactory = ({ services }): EnvironmentInstance => {
  const scene = services.scene;
  const group = new THREE.Group();
  group.name = 'voxel.environment.artifactStage';

  scene.background = new THREE.Color('#191315');
  scene.fog = new THREE.Fog(new THREE.Color('#2A1E1C'), 12, 42);

  const HALF = 10;
  const CEILING = 9;
  const field = new BlockField(BLOCK, new THREE.Vector3(0, -1, 0));

  // Floor, walls and ceiling — a sealed room, so no sky can leak in.
  for (let x = -HALF; x <= HALF; x++) {
    for (let z = -HALF; z <= HALF; z++) {
      field.set(x, 0, z, (x + z) % 4 === 0 ? 'cobble' : 'forgeBrick');
      field.set(x, CEILING, z, 'forgeBrick');
    }
  }
  for (let y = 1; y < CEILING; y++) {
    for (let i = -HALF; i <= HALF; i++) {
      const pilaster = i % 5 === 0;
      field.set(i, y, -HALF, pilaster ? 'stoneBrick' : 'forgeBrick');
      field.set(i, y, HALF, pilaster ? 'stoneBrick' : 'forgeBrick');
      field.set(-HALF, y, i, pilaster ? 'stoneBrick' : 'forgeBrick');
      field.set(HALF, y, i, pilaster ? 'stoneBrick' : 'forgeBrick');
    }
  }

  // Raised dais under the machine.
  for (let x = -3; x <= 3; x++) {
    for (let z = -3; z <= 3; z++) {
      const edge = Math.abs(x) === 3 || Math.abs(z) === 3;
      field.set(x, 1, z, edge ? 'stoneBrick' : 'metal');
    }
  }

  // Molten channels pulled inboard to x=+-2 so they are inside every shot.
  const magmaA = new BlockField(BLOCK, new THREE.Vector3(0, -1, 0));
  const magmaB = new BlockField(BLOCK, new THREE.Vector3(0, -1, 0));
  for (const x of [-2, 2]) {
    for (let z = -8; z <= 1; z++) {
      if (Math.abs(z) <= 3) continue; // the dais interrupts the channel
      (z % 2 === 0 ? magmaA : magmaB).set(x, 1, z, 'magma');
      field.set(x - 1, 1, z, 'stoneBrick');
      field.set(x + 1, 1, z, 'stoneBrick');
    }
  }
  // A molten pool directly behind the machine fills the mid-ground.
  for (let x = -3; x <= 3; x++) {
    for (let z = -8; z <= -6; z++) {
      ((x + z) % 2 === 0 ? magmaA : magmaB).set(x, 1, z, 'magma');
    }
  }

  // Furnace mouths on the back wall, kept within the framed width. Each is a
  // single glowing block inside a dark metal surround — a continuous band of
  // emissive blocks reads as one lit wall and blows out the whole frame.
  const glow = new BlockField(BLOCK, new THREE.Vector3(0, -1, 0));
  for (const x of [-4, 0, 4]) {
    glow.set(x, 2, -HALF + 1, 'lampBlock');
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, 1], [0, -1], [-1, 1], [1, 1]] as const) {
      field.set(x + dx, 2 + dy, -HALF + 1, 'metal');
    }
  }

  // Extraction hood + chimney straight above the machine. The 9:16 frame is
  // tall, so the volume above the subject is prime real estate.
  for (let x = -4; x <= 4; x++) {
    for (let z = -4; z <= 4; z++) {
      const ring = Math.max(Math.abs(x), Math.abs(z));
      if (ring === 4) field.set(x, 6, z, 'metal');
      if (ring === 3) field.set(x, 7, z, 'metal');
      if (ring === 2) field.set(x, 8, z, 'metal');
    }
  }
  // Gantry beams and support columns.
  for (const z of [-6, 1]) {
    for (let x = -HALF + 1; x <= HALF - 1; x++) field.set(x, CEILING - 1, z, 'metal');
  }
  for (const [cx, cz] of [[-7, -6], [7, -6], [-7, 1], [7, 1]] as const) {
    for (let y = 1; y < CEILING; y++) field.set(cx, y, cz, 'metal');
  }

  // Crates, racks and pipes give the walls depth instead of a flat slab.
  for (const [cx, cz] of [[-7, -1], [-6, -2], [7, -2], [6, -3], [-8, -4]] as const) {
    field.set(cx, 1, cz, 'planks');
    if (hash01(cx, cz, FORGE_SEED) > 0.4) field.set(cx, 2, cz, 'planks');
  }
  for (let y = 2; y <= 5; y++) {
    field.set(-HALF + 1, y, -4, 'metal');
    field.set(HALF - 1, y, -4, 'metal');
  }

  group.add(field.build('voxel-forge'));
  const magmaGroupA = magmaA.build('voxel-forge-magma-a');
  const magmaGroupB = magmaB.build('voxel-forge-magma-b');
  const glowGroup = glow.build('voxel-forge-glow');
  group.add(magmaGroupA, magmaGroupB, glowGroup);

  // Hanging lamps, close enough to the centre line to stay framed.
  const lamps: THREE.Mesh[] = [];
  for (const [lx, lz] of [[-2.5, -1.5], [2.5, -1.5], [-2.5, -5.5], [2.5, -5.5]] as const) {
    for (let i = 0; i < 3; i++) {
      group.add(block([0.16, 0.5, 0.16], 'metal', [lx, 8.4 - i * 0.5, lz]));
    }
    const lamp = block([0.5, 0.5, 0.5], 'flat', [lx, 6.6, lz], {
      tint: VOXEL_PALETTE.heatBright,
      emissive: VOXEL_PALETTE.heat,
      emissiveIntensity: 1.2,
    });
    lamps.push(lamp);
    group.add(lamp);
  }

  group.add(createVoxelLighting({ warm: true, shadowExtent: 12 }));

  const forgeFill = new THREE.PointLight(new THREE.Color('#FF8A3D'), 26, 18, 2);
  forgeFill.position.set(0, 3.2, -5.5);
  group.add(forgeFill);
  const keyFill = new THREE.PointLight(new THREE.Color('#FFC46B'), 20, 15, 2);
  keyFill.position.set(0, 5.4, 2.5);
  group.add(keyFill);

  const magmaMatA = firstStandardMaterial(findBlocks(magmaGroupA, 'magma'));
  const magmaMatB = firstStandardMaterial(findBlocks(magmaGroupB, 'magma'));
  const glowMat = firstStandardMaterial(findBlocks(glowGroup, 'lampBlock'));

  return {
    object3d: group,
    defaultCamera: cameraState([0, 3.4, 9.5], [0, 2.2, 0], 42),
    update(ctx): void {
      // Two interleaved channel sets pulse out of phase so the molten stone
      // reads as flowing rather than as one blinking material.
      if (magmaMatA) magmaMatA.emissiveIntensity = 0.72 + 0.3 * Math.sin(ctx.time * 1.7);
      if (magmaMatB) magmaMatB.emissiveIntensity = 0.72 + 0.3 * Math.sin(ctx.time * 1.7 + 2.1);
      if (glowMat) glowMat.emissiveIntensity = 1.05 + 0.2 * Math.sin(ctx.time * 2.3);
      for (let i = 0; i < lamps.length; i++) {
        const material = lamps[i].material as THREE.MeshStandardMaterial;
        material.emissiveIntensity = 1.1 + 0.22 * Math.sin(ctx.time * 1.6 + i * 1.1);
      }
    },
    dispose(): void {
      disposeObject3D(group);
      group.removeFromParent();
      scene.fog = null;
      scene.background = null;
    },
  };
};

/* ------------------------------------------------------------ cosmic void -- */

/** Floating voxel biome retained for semantic environment parity. */
export const createVoxelCosmicVoid: EnvironmentFactory = ({ services }): EnvironmentInstance => {
  const scene = services.scene;
  const group = new THREE.Group();
  group.name = 'voxel.environment.cosmicVoid';

  scene.background = new THREE.Color('#243C4E');
  scene.fog = new THREE.Fog(new THREE.Color('#31536A'), 18, 70);
  group.add(
    createSkyDome({ top: '#152534', horizon: '#3E6980', ground: '#16222C', radius: 140 }),
  );

  // Every environment must be stageable at the origin: dreamGarden has its flat
  // clearing and artifactStage its dais, but the void had nothing at the centre,
  // so any character placed at [0,0,0] hung in mid-air. This platform is kept
  // out of the rotating group below so it never turns under a subject's feet.
  const platform = new BlockField(BLOCK, new THREE.Vector3(0, -1, 0));
  for (let x = -5; x <= 5; x++) {
    for (let z = -5; z <= 5; z++) {
      const radial = Math.hypot(x, z);
      if (radial > 4.3) continue;
      // A tapering underside is what makes a platform read as a torn-away
      // island rather than a flat green disc floating in space.
      platform.set(x, 0, z, radial > 3.4 && hash01(x, z, 77) > 0.55 ? 'cobble' : 'grass');
      platform.set(x, -1, z, 'dirt');
      if (radial < 3.5) platform.set(x, -2, z, 'dirt');
      if (radial < 2.6) platform.set(x, -3, z, 'stone');
      if (radial < 1.6) platform.set(x, -4, z, 'stone');
      if (radial < 0.8) platform.set(x, -5, z, 'stone');
    }
  }
  // A ring of lanterns marks the edge and gives the void some local light.
  for (const [lx, lz] of [[-3, -2], [3, -2], [-2, 3], [2, 3], [0, -4]] as const) {
    platform.set(lx, 1, lz, 'glowInfo');
  }
  group.add(platform.build('voxel-void-platform'));

  const islands = new THREE.Group();
  islands.name = 'voxel-islands';
  for (let i = 0; i < 14; i++) {
    const angle = i * 2.399963229728653;
    const radius = 11 + (i % 5) * 3.1;
    const cx = Math.round(Math.cos(angle) * radius);
    const cz = Math.round(Math.sin(angle) * radius - 3);
    const cy = Math.round((i % 7) * 0.9) - 2;
    const field = new BlockField(BLOCK, new THREE.Vector3(0, 0, 0));
    const span = 1 + (i % 3);
    for (let dx = -span; dx <= span; dx++) {
      for (let dz = -span; dz <= span; dz++) {
        if (Math.abs(dx) + Math.abs(dz) > span + 1) continue;
        field.set(cx + dx, cy, cz + dz, 'grass');
        field.set(cx + dx, cy - 1, cz + dz, 'dirt');
        if (Math.abs(dx) + Math.abs(dz) <= 1) field.set(cx + dx, cy - 2, cz + dz, 'stone');
      }
    }
    if (i % 4 === 0) field.set(cx, cy + 1, cz, 'glowInfo');
    if (i % 5 === 0) addTree(field, cx, cy, cz, i * 31 + 7, { minHeight: 3, maxHeight: 4 });
    islands.add(field.build(`voxel-island-${i}`));
  }
  group.add(islands);

  group.add(
    buildCloudLayer({ seed: 4211, count: 14, spread: 90, height: 18, heightJitter: 4, unit: 2 }),
  );
  group.add(createVoxelLighting({ shadowExtent: 12 }));

  return {
    object3d: group,
    defaultCamera: cameraState([0, 2.2, 10], [0, 1, 0], 42),
    update(ctx): void {
      islands.rotation.y = ctx.time * 0.018;
    },
    dispose(): void {
      disposeObject3D(group);
      group.removeFromParent();
      scene.fog = null;
      scene.background = null;
    },
  };
};

/** Retained so scenes that want a plain untextured block keep a helper. */
export function createPlainBlock(size: [number, number, number], color: string): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), createVoxelMaterial(color, { size }));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export const VOXEL_ENVIRONMENT_FACTORIES: Record<string, EnvironmentFactory> = {
  'environment.cosmicVoid': createVoxelCosmicVoid,
  'environment.artifactStage': createVoxelArtifactStage,
  'environment.dreamGarden': createVoxelDreamGarden,
};
