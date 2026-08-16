import * as THREE from 'three';
import {
  BLOCK,
  VOXEL_PALETTE,
  blockTexture,
  createBlockMaterial,
  type BlockTextureId,
} from './voxel-style';

/**
 * Shared block-world construction for the Voxel theme.
 *
 * The point of this module is *cohesion*. A block world reads as a world (and
 * not as scattered primitives) when every solid thing is the same cubic unit,
 * sits on the same integer grid, exposes correct top/side/bottom faces, and is
 * layered grass → dirt → stone. Individually placed decoration cannot fake
 * that, so terrain, trees, clouds, and architecture are all emitted through one
 * grid here.
 *
 * Everything is deterministic: integer hashes only, never Math.random().
 */

/* ------------------------------------------------------------ block kinds -- */

export interface BlockKindSpec {
  /** Face textures. `side` is used for all four vertical faces. */
  readonly top: BlockTextureId;
  readonly side?: BlockTextureId;
  readonly bottom?: BlockTextureId;
  readonly tint?: string;
  readonly emissive?: string;
  readonly emissiveIntensity?: number;
  readonly opacity?: number;
  readonly roughness?: number;
  readonly metalness?: number;
  readonly castShadow?: boolean;
  readonly receiveShadow?: boolean;
  /** Render flat-shaded, ignoring scene lights (clouds). */
  readonly unlit?: boolean;
}

export const BLOCK_KINDS = {
  grass: { top: 'grassTop', side: 'grassSide', bottom: 'dirt' },
  dirt: { top: 'dirt' },
  stone: { top: 'stone' },
  cobble: { top: 'cobble' },
  stoneBrick: { top: 'stoneBrick' },
  sand: { top: 'sand' },
  path: { top: 'gravelPath' },
  log: { top: 'logTop', side: 'logSide' },
  planks: { top: 'planks' },
  leaves: { top: 'leaves', castShadow: true },
  water: { top: 'water', opacity: 0.78, roughness: 0.3 },
  // Unlit: seen from below, a lit cloud shows only its shadowed underside and
  // turns grey, which drains the sky it is supposed to fill.
  cloud: { top: 'cloud', castShadow: false, receiveShadow: false, unlit: true },
  metal: { top: 'metalPlate', side: 'metal', roughness: 0.62, metalness: 0.25 },
  forgeBrick: { top: 'forgeBrick' },
  magma: {
    top: 'magma',
    emissive: VOXEL_PALETTE.heat,
    emissiveIntensity: 0.9,
    roughness: 0.7,
  },
  lampBlock: {
    top: 'flat',
    tint: VOXEL_PALETTE.heatBright,
    emissive: VOXEL_PALETTE.heat,
    emissiveIntensity: 1.1,
  },
  glowInfo: {
    top: 'flat',
    tint: VOXEL_PALETTE.information,
    emissive: VOXEL_PALETTE.information,
    emissiveIntensity: 0.7,
  },
} as const satisfies Record<string, BlockKindSpec>;

export type BlockKind = keyof typeof BLOCK_KINDS;

/* ------------------------------------------------------------- block field -- */

interface PlacedBlock {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly scale: number;
}

/**
 * Accumulates blocks on an integer grid and emits one InstancedMesh per kind.
 * Draw calls stay proportional to the number of *materials*, not the number of
 * blocks, which is what makes a dense world affordable.
 */
export class BlockField {
  private readonly blocks = new Map<BlockKind, PlacedBlock[]>();
  private readonly occupied = new Set<string>();

  constructor(
    /** World size of one block. Far-field terrain uses a coarser unit. */
    private readonly unit: number = BLOCK,
    /** Grid origin offset in world units. */
    private readonly origin: THREE.Vector3 = new THREE.Vector3(),
  ) {}

  /** Place one block at integer grid coordinates. Later writes win. */
  set(x: number, y: number, z: number, kind: BlockKind, scale = 1): void {
    const key = `${x}|${y}|${z}`;
    if (this.occupied.has(key)) return;
    this.occupied.add(key);
    const list = this.blocks.get(kind);
    if (list) list.push({ x, y, z, scale });
    else this.blocks.set(kind, [{ x, y, z, scale }]);
  }

  has(x: number, y: number, z: number): boolean {
    return this.occupied.has(`${x}|${y}|${z}`);
  }

  /** Fill an inclusive integer box. */
  fill(
    x0: number, y0: number, z0: number,
    x1: number, y1: number, z1: number,
    kind: BlockKind,
  ): void {
    for (let x = x0; x <= x1; x++) {
      for (let y = y0; y <= y1; y++) {
        for (let z = z0; z <= z1; z++) this.set(x, y, z, kind);
      }
    }
  }

  get count(): number {
    let total = 0;
    for (const list of this.blocks.values()) total += list.length;
    return total;
  }

  /** Emit the accumulated grid as instanced meshes grouped by kind. */
  build(name: string): THREE.Group {
    const group = new THREE.Group();
    group.name = name;
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();

    for (const [kind, list] of this.blocks) {
      if (list.length === 0) continue;
      const spec = BLOCK_KINDS[kind] as BlockKindSpec;
      const geometry = new THREE.BoxGeometry(this.unit, this.unit, this.unit);
      const mesh = new THREE.InstancedMesh(geometry, kindMaterial(spec, this.unit), list.length);
      mesh.name = `blocks:${kind}`;
      mesh.castShadow = spec.castShadow ?? true;
      mesh.receiveShadow = spec.receiveShadow ?? true;
      for (let i = 0; i < list.length; i++) {
        const b = list[i];
        position.set(
          this.origin.x + (b.x + 0.5) * this.unit,
          this.origin.y + (b.y + 0.5) * this.unit,
          this.origin.z + (b.z + 0.5) * this.unit,
        );
        scale.setScalar(b.scale);
        matrix.compose(position, quaternion, scale);
        mesh.setMatrixAt(i, matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
      group.add(mesh);
    }
    return group;
  }
}

/**
 * BoxGeometry group order is +X, -X, +Y, -Y, +Z, -Z. Supplying six materials is
 * what allows a grass block to show grass on top, a dirt-with-fringe side, and
 * plain dirt underneath — the single most recognisable block in the genre.
 */
function kindMaterial(spec: BlockKindSpec, unit: number): THREE.Material | THREE.Material[] {
  const size = [unit, unit, unit] as const;
  const shared = {
    size,
    tint: spec.tint,
    emissive: spec.emissive,
    emissiveIntensity: spec.emissiveIntensity,
    roughness: spec.roughness,
    metalness: spec.metalness,
    transparent: spec.opacity !== undefined && spec.opacity < 1,
    opacity: spec.opacity ?? 1,
  };
  if (spec.unlit === true) {
    return new THREE.MeshBasicMaterial({
      map: blockTexture(spec.top),
      color: spec.tint ?? '#FFFFFF',
      fog: false,
    });
  }
  const side = spec.side ?? spec.top;
  const bottom = spec.bottom ?? side;
  if (side === spec.top && bottom === spec.top) {
    return createBlockMaterial(spec.top, shared);
  }
  const sideMaterial = createBlockMaterial(side, shared);
  return [
    sideMaterial,
    sideMaterial,
    createBlockMaterial(spec.top, shared),
    createBlockMaterial(bottom, shared),
    sideMaterial,
    sideMaterial,
  ];
}

/* ------------------------------------------------------------------ noise -- */

/** Deterministic integer hash in [0,1). */
export function hash01(x: number, z: number, seed = 0): number {
  let n = (Math.imul(x, 374761393) + Math.imul(z, 668265263) + Math.imul(seed, 1442695041)) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  n ^= n >>> 16;
  return (n >>> 0) / 4294967296;
}

function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}

/** Smoothly interpolated value noise. Deterministic for a given seed. */
export function valueNoise(x: number, z: number, scale: number, seed: number): number {
  const fx = x / scale;
  const fz = z / scale;
  const x0 = Math.floor(fx);
  const z0 = Math.floor(fz);
  const tx = smooth(fx - x0);
  const tz = smooth(fz - z0);
  const a = hash01(x0, z0, seed);
  const b = hash01(x0 + 1, z0, seed);
  const c = hash01(x0, z0 + 1, seed);
  const d = hash01(x0 + 1, z0 + 1, seed);
  return (a + (b - a) * tx) * (1 - tz) + (c + (d - c) * tx) * tz;
}

/** Two octaves is enough for rolling ground that still reads as hand-placed. */
export function terrainHeight(x: number, z: number, seed: number, amplitude: number): number {
  const base = valueNoise(x, z, 11, seed) * 0.68 + valueNoise(x, z, 4.5, seed + 91) * 0.32;
  return (base - 0.5) * 2 * amplitude;
}

/* -------------------------------------------------------------- terrain ---- */

export interface TerrainOptions {
  readonly halfX: number;
  readonly halfZ: number;
  readonly seed: number;
  readonly amplitude: number;
  /** Radius around the origin flattened to y=0 so staging stays clean. */
  readonly stageRadius: number;
  readonly stageFalloff: number;
  /** Columns at or below this height become water. */
  readonly waterLevel?: number;
  /** How far down exposed cliff faces are filled in. */
  readonly maxExposedDepth?: number;
  /** Bias applied to the height field, e.g. to raise ground toward the back. */
  readonly bias?: (x: number, z: number) => number;
}

export interface TerrainResult {
  readonly heights: Map<string, number>;
  heightAt(x: number, z: number): number;
  /** Grid coordinates of every grass-topped column, for decoration placement. */
  readonly surface: Array<{ x: number; z: number; y: number }>;
}

/**
 * Write a layered terrain into `field`. Only surfaces that can actually be seen
 * are emitted: the top block of each column plus the cliff faces exposed by
 * lower neighbours. Interior blocks are never created.
 */
export function buildTerrain(field: BlockField, options: TerrainOptions): TerrainResult {
  const {
    halfX, halfZ, seed, amplitude, stageRadius, stageFalloff,
    waterLevel, maxExposedDepth = 4, bias,
  } = options;

  const heights = new Map<string, number>();
  const heightAt = (x: number, z: number): number => {
    const key = `${x}|${z}`;
    const cached = heights.get(key);
    if (cached !== undefined) return cached;
    const raw = terrainHeight(x, z, seed, amplitude) + (bias ? bias(x, z) : 0);
    // Flatten the staging area, then blend back into the natural height field.
    const radial = Math.sqrt(x * x + z * z);
    const blend = radial <= stageRadius
      ? 0
      : Math.min(1, (radial - stageRadius) / Math.max(0.0001, stageFalloff));
    const value = Math.round(raw * smooth(blend));
    heights.set(key, value);
    return value;
  };

  const surface: Array<{ x: number; z: number; y: number }> = [];

  for (let x = -halfX; x <= halfX; x++) {
    for (let z = -halfZ; z <= halfZ; z++) {
      const h = heightAt(x, z);
      const submerged = waterLevel !== undefined && h < waterLevel;

      if (submerged) {
        field.set(x, h, z, h < waterLevel - 1 ? 'dirt' : 'sand');
        for (let y = h + 1; y <= waterLevel; y++) field.set(x, y, z, 'water');
      } else {
        field.set(x, h, z, 'grass');
        surface.push({ x, z, y: h });
      }

      // Fill cliff faces down to the lowest neighbour so hills read as solid.
      let lowest = h;
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const nx = x + dx;
        const nz = z + dz;
        const inside = nx >= -halfX && nx <= halfX && nz >= -halfZ && nz <= halfZ;
        lowest = Math.min(lowest, inside ? heightAt(nx, nz) : h - 1);
      }
      const floor = Math.max(lowest, h - maxExposedDepth);
      for (let y = h - 1; y >= floor; y--) {
        const depth = h - y;
        field.set(x, y, z, depth <= 2 ? 'dirt' : 'stone');
      }
    }
  }

  return { heights, heightAt, surface };
}

/* ------------------------------------------------------------------ trees -- */

/**
 * A blocky tree: a log column with a two-tier leaf canopy. Canopy corners are
 * dropped so the silhouette is a rounded mass rather than a cube.
 */
export function addTree(
  field: BlockField,
  x: number,
  y: number,
  z: number,
  seed: number,
  options: { minHeight?: number; maxHeight?: number } = {},
): void {
  const min = options.minHeight ?? 4;
  const max = options.maxHeight ?? 6;
  const trunk = min + Math.floor(hash01(x, z, seed) * (max - min + 1));

  for (let i = 1; i <= trunk; i++) field.set(x, y + i, z, 'log');

  // A broad two-tier canopy: wide where it meets the trunk, tapering to a cap.
  // Narrow crowns read as shrubs on sticks rather than trees.
  const crownBase = y + trunk - 2;
  const radii = [2, 2, 2, 1, 1];
  for (let dy = 0; dy < radii.length; dy++) {
    const radius = radii[dy];
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dz = -radius; dz <= radius; dz++) {
        const corner = Math.abs(dx) === radius && Math.abs(dz) === radius;
        // Drop most corners so the silhouette rounds off instead of reading
        // as a stack of rectangles.
        if (corner && (dy >= 2 || hash01(x + dx, z + dz, seed + dy) < 0.7)) continue;
        if (dx === 0 && dz === 0 && dy < 3) continue; // trunk occupies the core
        field.set(x + dx, crownBase + dy, z + dz, 'leaves');
      }
    }
  }
  field.set(x, crownBase + 3, z, 'leaves');
  field.set(x, crownBase + 4, z, 'leaves');
}

/* ----------------------------------------------------------------- clouds -- */

/**
 * A drifting layer of block clouds. In a 9:16 frame the upper half of the image
 * is mostly sky, so clouds are the main thing standing between "outdoor world"
 * and "flat blue wall". They are spread across the whole layer rather than
 * hand-placed, so any camera angle finds some.
 */
export function buildCloudLayer(options: {
  readonly seed: number;
  readonly count: number;
  readonly spread: number;
  readonly height: number;
  readonly heightJitter?: number;
  readonly unit?: number;
}): THREE.Group {
  const unit = options.unit ?? BLOCK * 2;
  const field = new BlockField(unit);
  const jitter = options.heightJitter ?? 2;
  const half = Math.max(1, Math.round(options.spread / unit / 2));

  for (let i = 0; i < options.count; i++) {
    const cx = Math.round((hash01(i, 3, options.seed) * 2 - 1) * half);
    const cz = Math.round((hash01(i, 7, options.seed + 5) * 2 - 1) * half);
    const cy = Math.round(options.height / unit + (hash01(i, 11, options.seed + 9) * 2 - 1) * jitter);
    const w = 2 + Math.floor(hash01(i, 13, options.seed + 17) * 4);
    const d = 2 + Math.floor(hash01(i, 19, options.seed + 23) * 3);

    for (let dx = 0; dx < w; dx++) {
      for (let dz = 0; dz < d; dz++) {
        // Ragged edges keep clouds from reading as rectangles.
        if (hash01(cx + dx, cz + dz, options.seed + 31) < 0.18) continue;
        field.set(cx + dx, cy, cz + dz, 'cloud');
        if (hash01(cx + dx, cz + dz, options.seed + 37) > 0.72) {
          field.set(cx + dx, cy + 1, cz + dz, 'cloud');
        }
      }
    }
  }

  const group = field.build('voxel-clouds');
  group.traverse((node) => {
    node.castShadow = false;
    node.receiveShadow = false;
    // Clouds sit above the fog band; fogging them turns the sky into mush.
    const mesh = node as THREE.Mesh;
    if (!mesh.isMesh) return;
    const materials = (Array.isArray(mesh.material) ? mesh.material : [mesh.material]) as THREE.MeshBasicMaterial[];
    for (const material of materials) material.fog = false;
  });
  return group;
}

/* ------------------------------------------------- far-field silhouettes --- */

/**
 * Coarse hills far behind the playable area. Rendered at a larger block unit so
 * a wide horizon costs very little, and tinted toward the fog colour so it
 * reads as distance rather than as more scenery.
 */
export function buildDistantHills(options: {
  readonly seed: number;
  readonly innerRadius: number;
  readonly outerRadius: number;
  readonly unit: number;
  readonly amplitude: number;
  readonly baseY: number;
}): THREE.Group {
  const { seed, innerRadius, outerRadius, unit, amplitude, baseY } = options;
  const field = new BlockField(unit, new THREE.Vector3(0, baseY, 0));
  const half = Math.ceil(outerRadius / unit);
  const innerCells = innerRadius / unit;

  for (let x = -half; x <= half; x++) {
    for (let z = -half; z <= half; z++) {
      const radial = Math.sqrt(x * x + z * z);
      if (radial < innerCells || radial > half) continue;
      // Ramp the ridge up with distance so it never crowds the subject.
      const ramp = Math.min(1, (radial - innerCells) / Math.max(1, half - innerCells));
      const n = valueNoise(x, z, 5, seed) * 0.7 + valueNoise(x, z, 2, seed + 13) * 0.3;
      const height = Math.round(n * amplitude * (0.35 + ramp));
      // Grass over dirt only. Exposed stone at this distance reads as masonry
      // on the horizon rather than as land.
      field.set(x, height, z, 'grass');
      if (height > 0) field.set(x, height - 1, z, 'dirt');
    }
  }

  const group = field.build('voxel-distant-hills');
  group.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (mesh.isMesh) {
      mesh.castShadow = false;
      mesh.receiveShadow = false;
    }
  });
  return group;
}
