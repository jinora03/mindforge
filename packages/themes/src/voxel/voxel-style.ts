import * as THREE from 'three';
import type { VisualTone } from '@mindforge/engine';
import type { ThemePresentation } from '../ThemeTypes';

/**
 * The canonical MindForge voxel unit. Everything block-built is authored as a
 * multiple (or clean fraction) of this so terrain, props, characters, and
 * effects share one readable scale. The Observer is ~1.9 BLOCK tall and their
 * head is half a BLOCK, which is what makes the world and the character read
 * as belonging to the same game.
 */
export const BLOCK = 1;

/** Texture resolution per block face. Low, square, nearest-filtered. */
const TEXELS = 16;

/**
 * Original MindForge voxel palette. The visual language intentionally leans
 * into bright sandbox-game readability while keeping the actual materials,
 * textures, assets, and color choices original to MindForge.
 */
export const VOXEL_PALETTE = {
  sky: '#79C4F2',
  skyHigh: '#3E8FD4',
  skyHorizon: '#C4E4F5',
  fog: '#BFE0F0',
  grass: '#68AE38',
  grassLight: '#8CCB4B',
  grassDark: '#4D8730',
  earth: '#8A633F',
  earthDark: '#65452D',
  wood: '#8C5D34',
  woodDark: '#684328',
  leaf: '#4E983D',
  leafLight: '#6DB94E',
  leafDark: '#3A7530',
  stone: '#6F7779',
  stoneLight: '#9AA0A0',
  stoneDark: '#4E5658',
  metal: '#465458',
  metalLight: '#6B7A7E',
  water: '#3E8FD8',
  waterDeep: '#2A6BA8',
  sand: '#D9C37B',
  ink: '#171C1D',
  cream: '#F5E8BD',
  skin: '#D69A59',
  skinLight: '#E9B36E',
  cloth: '#21806F',
  clothLight: '#2E9C82',
  clothDark: '#16594E',
  copper: '#B96435',
  ember: '#C4441C',
  information: '#37D5B3',
  prediction: '#44B8FF',
  suppression: '#78868A',
  reaction: '#FFD34D',
  insight: '#FFF0A8',
  heat: '#FF6A2A',
  heatBright: '#FFB12B',
} as const;

const TONE_COLORS: Record<VisualTone, string> = {
  neutral: VOXEL_PALETTE.cream,
  information: VOXEL_PALETTE.information,
  prediction: VOXEL_PALETTE.prediction,
  suppression: VOXEL_PALETTE.suppression,
  reaction: VOXEL_PALETTE.reaction,
  insight: VOXEL_PALETTE.insight,
  heat: VOXEL_PALETTE.heat,
};

export function voxelToneColor(tone: VisualTone): THREE.Color {
  return new THREE.Color(TONE_COLORS[tone]);
}

/* ------------------------------------------------------------- textures --- */

/** Deterministic 2D integer hash in [0,1). No Math.random anywhere in runtime. */
function hash2(x: number, y: number, seed: number): number {
  let n = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 1442695041)) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  n ^= n >>> 16;
  return (n >>> 0) / 4294967296;
}

/**
 * Every block texture is a tiny indexed-palette pixel image: a handful of
 * shades plus a deterministic pattern. That is what gives a block world its
 * material identity — flat tinted boxes never read as grass, stone, or wood no
 * matter how the lighting is tuned.
 */
export type BlockTextureId =
  | 'grassTop'
  | 'grassSide'
  | 'dirt'
  | 'stone'
  | 'cobble'
  | 'stoneBrick'
  | 'sand'
  | 'gravelPath'
  | 'logSide'
  | 'logTop'
  | 'planks'
  | 'leaves'
  | 'water'
  | 'metal'
  | 'metalPlate'
  | 'forgeBrick'
  | 'magma'
  | 'cloud'
  | 'cloth'
  | 'clothDark'
  | 'denim'
  | 'leather'
  | 'skin'
  | 'hair'
  | 'flat';

type Picker = (x: number, y: number, rnd: (seed: number) => number) => number;

/**
 * Pick a palette index that stays constant across 2x2 patches, with occasional
 * single-pixel breakups. Independent per-pixel noise reads as television
 * static once it tiles across a landscape; block textures cluster.
 *
 * Palettes below repeat their mid tones so the weighting stays legible: a
 * uniform pick over the array is the distribution.
 */
function clump(
  x: number,
  y: number,
  seed: number,
  rnd: (seed: number) => number,
  tones: number,
  speckle = 0.14,
): number {
  if (rnd(3) < speckle) return Math.floor(rnd(4) * tones) % tones;
  return Math.floor(hash2(x >> 1, y >> 1, seed) * tones) % tones;
}

interface TextureSpec {
  readonly colors: readonly string[];
  readonly pick: Picker;
}

/** y counts up from the bottom of the face (DataTexture rows are v-ascending). */
const TEXTURE_SPECS: Record<BlockTextureId, TextureSpec> = {
  grassTop: {
    colors: ['#5F9E34', '#6DB03B', '#7CC044', '#68A937', '#74B840', '#5A9931', '#82C74A', '#6DB03B'],
    pick: (x, y, rnd) => clump(x, y, 11, rnd, 8, 0.18),
  },
  grassSide: {
    colors: [VOXEL_PALETTE.earthDark, VOXEL_PALETTE.earth, VOXEL_PALETTE.grass, VOXEL_PALETTE.grassDark],
    pick: (_x, y, rnd) => {
      // Ragged green fringe over dirt — the single most recognisable block face.
      const fringe = TEXELS - 3 - Math.floor(rnd(7) * 3);
      if (y > fringe) return rnd(8) < 0.25 ? 3 : 2;
      if (y === fringe) return rnd(9) < 0.5 ? 3 : 1;
      return rnd(3) < 0.28 ? 0 : 1;
    },
  },
  dirt: {
    colors: ['#7A5636', '#8B6440', '#9A724B', '#6B4A2E', '#836048', '#8B6440', '#74513A', '#93694A'],
    pick: (x, y, rnd) => clump(x, y, 13, rnd, 8, 0.2),
  },
  stone: {
    colors: ['#6E7679', '#7C8487', '#8A9295', '#626A6D', '#757D80', '#7C8487', '#697174', '#828A8D'],
    pick: (x, y, rnd) => clump(x, y, 17, rnd, 8, 0.16),
  },
  cobble: {
    colors: ['#3E4547', VOXEL_PALETTE.stoneDark, VOXEL_PALETTE.stone, VOXEL_PALETTE.stoneLight],
    pick: (x, y, rnd) => {
      // Rounded cobbles separated by dark mortar.
      const jitter = Math.floor(rnd(5) * 2);
      if ((x & 3) === jitter || (y & 3) === 0) return 0;
      const tone = hash2(x >> 2, y >> 2, 21);
      if (rnd(2) < 0.18) return 1;
      return tone < 0.5 ? 2 : 3;
    },
  },
  stoneBrick: {
    colors: ['#3E4547', VOXEL_PALETTE.stoneDark, VOXEL_PALETTE.stone, VOXEL_PALETTE.stoneLight],
    pick: (x, y, rnd) => {
      const offset = ((y >> 3) & 1) * 4;
      if (y % 8 === 0 || (x + offset) % 8 === 0) return 0;
      const fine = rnd(2);
      if (fine < 0.14) return 1;
      return fine < 0.72 ? 2 : 3;
    },
  },
  sand: {
    colors: ['#C4AE68', VOXEL_PALETTE.sand, '#E7D69A', '#CDBA7F', VOXEL_PALETTE.sand, '#DECB8C', '#CDBA7F', VOXEL_PALETTE.sand],
    pick: (x, y, rnd) => clump(x, y, 29, rnd, 8, 0.14),
  },
  gravelPath: {
    colors: ['#5A5F5C', '#7B7F78', '#98988C', '#6B6F68'],
    pick: (x, y, rnd) => {
      const pebble = Math.floor(hash2(x >> 1, y >> 1, 33) * 4);
      return rnd(2) < 0.22 ? 0 : pebble;
    },
  },
  logSide: {
    colors: [VOXEL_PALETTE.woodDark, VOXEL_PALETTE.wood, '#A2714A', '#573520'],
    pick: (x, _y, rnd) => {
      // Vertical grain: the column tone is constant, knots interrupt it.
      const grain = hash2(x, 0, 41);
      if (rnd(4) < 0.06) return 3;
      if (grain < 0.2) return 0;
      return grain < 0.72 ? 1 : 2;
    },
  },
  logTop: {
    colors: [VOXEL_PALETTE.woodDark, VOXEL_PALETTE.wood, '#A2714A', '#573520'],
    pick: (x, y) => {
      const d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5));
      if (d > 6.5) return 0;
      const ring = Math.floor(d) % 3;
      return ring === 0 ? 3 : ring === 1 ? 1 : 2;
    },
  },
  planks: {
    colors: [VOXEL_PALETTE.woodDark, VOXEL_PALETTE.wood, '#A2714A', '#573520'],
    pick: (x, y, rnd) => {
      if (y % 4 === 0) return 3;
      const plank = y >> 2;
      if (x === Math.floor(hash2(plank, 0, 55) * 12) + 2) return 3;
      if (rnd(2) < 0.16) return 0;
      return hash2(plank, 0, 57) < 0.5 ? 1 : 2;
    },
  },
  leaves: {
    // Higher contrast than the ground families, with dark gaps standing in for
    // the holes you see through a canopy — flat mid-greens read as solid slabs.
    colors: ['#2C6524', '#3C8330', '#4E9C3B', '#1E4A19', '#357A2B', '#458F35', '#1A4215', '#3C8330'],
    pick: (x, y, rnd) => clump(x, y, 23, rnd, 8, 0.26),
  },
  water: {
    colors: [VOXEL_PALETTE.waterDeep, VOXEL_PALETTE.water, '#5AA8E8', '#2F7ABE'],
    pick: (x, y, rnd) => {
      const band = (y + Math.floor(hash2(x >> 2, 0, 61) * 3)) % 5;
      if (band === 0) return 0;
      if (band === 2) return 2;
      return rnd(2) < 0.2 ? 3 : 1;
    },
  },
  metal: {
    colors: ['#2E393C', VOXEL_PALETTE.metal, VOXEL_PALETTE.metalLight, '#212A2C'],
    pick: (x, y, rnd) => {
      if (x === 0 || y === 0 || x === TEXELS - 1 || y === TEXELS - 1) return 3;
      const fine = rnd(2);
      if (fine < 0.12) return 0;
      return fine < 0.8 ? 1 : 2;
    },
  },
  metalPlate: {
    colors: ['#2E393C', VOXEL_PALETTE.metal, VOXEL_PALETTE.metalLight, '#212A2C'],
    pick: (x, y, rnd) => {
      if ((x === 3 || x === 12) && (y === 3 || y === 12)) return 2;
      if (x === 0 || y === 0) return 3;
      return rnd(2) < 0.14 ? 0 : 1;
    },
  },
  forgeBrick: {
    colors: ['#57493F', '#6E5C50', '#7E6A5C', '#4A3E36'],
    pick: (x, y, rnd) => {
      const offset = ((y >> 2) & 1) * 4;
      if (y % 4 === 0 || (x + offset) % 8 === 0) return 0;
      const fine = rnd(2);
      if (fine < 0.16) return 3;
      return fine < 0.74 ? 1 : 2;
    },
  },
  magma: {
    colors: ['#3A1408', VOXEL_PALETTE.ember, VOXEL_PALETTE.heat, VOXEL_PALETTE.heatBright],
    pick: (x, y, rnd) => {
      // Dark crust broken by bright veins.
      const vein = hash2(x >> 1, y >> 1, 71);
      if (vein > 0.74) return rnd(2) < 0.5 ? 3 : 2;
      return vein > 0.58 ? 1 : 0;
    },
  },
  cloud: {
    colors: ['#DCE9EF', '#EDF5F8', '#FFFFFF', '#CBDDE6'],
    pick: (_x, _y, rnd) => {
      const fine = rnd(2);
      if (fine < 0.18) return 3;
      if (fine < 0.44) return 0;
      return fine < 0.82 ? 1 : 2;
    },
  },
  cloth: {
    colors: ['#1E7A68', '#2A9C84', '#37B497', '#186B5B'],
    pick: (x, y, rnd) => {
      if ((x + y) % 6 === 0) return 3;
      const fine = rnd(2);
      if (fine < 0.1) return 0;
      return fine < 0.86 ? 1 : 2;
    },
  },
  clothDark: {
    colors: ['#10473E', VOXEL_PALETTE.clothDark, '#1E6B5D', '#0C3830'],
    pick: (x, y, rnd) => {
      if ((x + y) % 7 === 0) return 3;
      const fine = rnd(2);
      if (fine < 0.12) return 0;
      return fine < 0.88 ? 1 : 2;
    },
  },
  denim: {
    colors: ['#2E4664', '#3B5A7E', '#4A6E96', '#263A53'],
    pick: (x, y, rnd) => {
      if ((x + y * 2) % 9 === 0) return 3;
      const fine = rnd(2);
      if (fine < 0.14) return 0;
      return fine < 0.82 ? 1 : 2;
    },
  },
  leather: {
    colors: ['#33291F', '#4A3B2C', '#5C4A36', '#241C15'],
    pick: (_x, y, rnd) => {
      if (y === 0 || y === TEXELS - 1) return 3;
      const fine = rnd(2);
      if (fine < 0.18) return 0;
      return fine < 0.8 ? 1 : 2;
    },
  },
  skin: {
    // Deliberately low contrast: skin is the one surface where visible pixel
    // noise reads as dirt rather than as material.
    colors: ['#C99270', '#D3A07B', '#DCAC86', '#C2896A'],
    pick: (_x, _y, rnd) => {
      const fine = rnd(2);
      if (fine < 0.1) return 3;
      if (fine < 0.24) return 0;
      return fine < 0.9 ? 1 : 2;
    },
  },
  hair: {
    colors: ['#3F2C1A', '#4E3822', '#5E452B', '#33230F'],
    pick: (x, _y, rnd) => {
      const strand = hash2(x, 0, 83);
      if (rnd(2) < 0.14) return 3;
      return strand < 0.4 ? 0 : strand < 0.8 ? 1 : 2;
    },
  },
  flat: {
    colors: ['#FFFFFF'],
    pick: () => 0,
  },
};

/** `#RRGGBB` -> sRGB byte triple, with no colour-space conversion. */
function srgbBytes(hex: string): readonly [number, number, number] {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff] as const;
}

const TEXTURE_CACHE = new Map<BlockTextureId, THREE.DataTexture>();

/**
 * Build (once) the tiny nearest-neighbour texture for a block family. Textures
 * are cached and shared: they carry no per-instance state, so sharing them is
 * safe even for property-animated subtrees (the timeline only ever writes
 * color / opacity / emissiveIntensity, never maps).
 */
export function blockTexture(id: BlockTextureId): THREE.DataTexture {
  const cached = TEXTURE_CACHE.get(id);
  if (cached) return cached;

  const spec = TEXTURE_SPECS[id];
  // Parse the hex literals as the sRGB bytes they are. Going through
  // THREE.Color would hand back *linear* components under three's colour
  // management, and writing those into an sRGB-tagged texture darkens every
  // surface a second time on sampling.
  const palette = spec.colors.map(srgbBytes);

  const data = new Uint8Array(TEXELS * TEXELS * 4);
  for (let y = 0; y < TEXELS; y++) {
    for (let x = 0; x < TEXELS; x++) {
      const rnd = (seed: number): number => hash2(x, y, seed + 1);
      const raw = spec.pick(x, y, rnd) | 0;
      const index = raw < 0 ? 0 : raw > palette.length - 1 ? palette.length - 1 : raw;
      const [r, g, b] = palette[index];
      const i = (y * TEXELS + x) * 4;
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = 255;
    }
  }

  const texture = new THREE.DataTexture(data, TEXELS, TEXELS, THREE.RGBAFormat);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  // Keep pixels crisp nearby while using mip levels at distance. Production
  // camera moves exposed severe shimmer when every far surface sampled the raw
  // 16x16 texture with no mip chain.
  texture.minFilter = THREE.NearestMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.anisotropy = 4;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.needsUpdate = true;

  // The Engine's disposeObject3D() releases every texture reachable from a
  // material when an episode unloads. These textures are shared across
  // materials and across episodes, so evict on disposal and rebuild lazily;
  // otherwise loading a second episode would bind disposed GPU textures.
  texture.addEventListener('dispose', () => {
    if (TEXTURE_CACHE.get(id) === texture) TEXTURE_CACHE.delete(id);
  });

  TEXTURE_CACHE.set(id, texture);
  return texture;
}

/**
 * A texture instance whose `repeat` matches the box it is applied to, so one
 * texture tile always covers exactly one BLOCK of world space. Constant texel
 * density across every object is the difference between "a block world" and
 * "tinted primitives".
 */
function tiledTexture(id: BlockTextureId, repeatX: number, repeatY: number): THREE.Texture {
  const base = blockTexture(id);
  const rx = Math.max(1, Math.round(repeatX));
  const ry = Math.max(1, Math.round(repeatY));
  if (rx === 1 && ry === 1) return base;
  const clone = base.clone();
  clone.needsUpdate = true;
  clone.repeat.set(rx, ry);
  return clone;
}

export interface VoxelMaterialOptions {
  texture?: BlockTextureId;
  /** Box dimensions in world units; used to derive constant texel density. */
  size?: readonly [number, number, number];
  emissive?: string;
  emissiveIntensity?: number;
  roughness?: number;
  metalness?: number;
  transparent?: boolean;
  opacity?: number;
  depthWrite?: boolean;
  /** Legacy escape hatch retained for callers that want an untextured face. */
  pixelVariation?: number;
}

interface VoxelMaterialResponse {
  readonly roughness: number;
  readonly metalness: number;
}

const DEFAULT_MATERIAL_RESPONSE: VoxelMaterialResponse = {
  roughness: 0.86,
  metalness: 0,
};

/**
 * Production response by semantic block family. Colour/pixel identity stays in
 * the texture while roughness and reflectance make stone, foliage, water and
 * metal stop behaving like the same matte material under the same light.
 */
const MATERIAL_RESPONSE: Partial<Record<BlockTextureId, VoxelMaterialResponse>> = {
  grassTop: { roughness: 0.9, metalness: 0 },
  grassSide: { roughness: 0.91, metalness: 0 },
  dirt: { roughness: 0.94, metalness: 0 },
  stone: { roughness: 0.78, metalness: 0.02 },
  cobble: { roughness: 0.82, metalness: 0.01 },
  stoneBrick: { roughness: 0.76, metalness: 0.02 },
  sand: { roughness: 0.92, metalness: 0 },
  gravelPath: { roughness: 0.88, metalness: 0.01 },
  logSide: { roughness: 0.84, metalness: 0 },
  logTop: { roughness: 0.86, metalness: 0 },
  planks: { roughness: 0.8, metalness: 0 },
  leaves: { roughness: 0.88, metalness: 0 },
  water: { roughness: 0.26, metalness: 0.02 },
  metal: { roughness: 0.36, metalness: 0.62 },
  metalPlate: { roughness: 0.3, metalness: 0.72 },
  forgeBrick: { roughness: 0.68, metalness: 0.08 },
  magma: { roughness: 0.56, metalness: 0 },
  cloud: { roughness: 0.98, metalness: 0 },
  cloth: { roughness: 0.94, metalness: 0 },
  clothDark: { roughness: 0.95, metalness: 0 },
  denim: { roughness: 0.92, metalness: 0 },
  leather: { roughness: 0.76, metalness: 0 },
  skin: { roughness: 0.72, metalness: 0 },
  hair: { roughness: 0.84, metalness: 0 },
  flat: DEFAULT_MATERIAL_RESPONSE,
};

/**
 * Create a fresh block material. Deliberately **not** cached: the timeline can
 * animate `color` / `opacity` / `emissiveIntensity` on any subtree, and a
 * shared material would leak that animation across unrelated objects.
 */
export function createVoxelMaterial(
  color: string,
  options: VoxelMaterialOptions = {},
): THREE.MeshStandardMaterial {
  const textureId = options.texture ?? (options.pixelVariation === 0 ? undefined : 'flat');
  const size = options.size;
  const map = textureId
    ? tiledTexture(
        textureId,
        size ? Math.max(size[0], size[2]) / BLOCK : 1,
        size ? size[1] / BLOCK : 1,
      )
    : null;
  const response = (textureId && MATERIAL_RESPONSE[textureId]) ?? DEFAULT_MATERIAL_RESPONSE;
  const opacity = options.opacity ?? 1;
  const transparent = options.transparent ?? opacity < 1;
  return new THREE.MeshStandardMaterial({
    color,
    map,
    emissive: options.emissive ?? '#000000',
    emissiveIntensity: options.emissiveIntensity ?? 0,
    roughness: options.roughness ?? response.roughness,
    metalness: options.metalness ?? response.metalness,
    transparent,
    opacity,
    depthWrite: options.depthWrite ?? !(transparent && opacity < 0.98),
    dithering: true,
  });
}

/**
 * Convenience for the common case: a textured block whose base colour is white
 * so the pixel art itself carries the material identity.
 *
 * `tint` multiplies the texture, so it is only for greyscale/neutral textures
 * (`flat`) or for deliberate darkening. Tinting an already-coloured texture
 * with its own palette colour squares the value and turns the surface muddy.
 */
export function createBlockMaterial(
  texture: BlockTextureId,
  options: Omit<VoxelMaterialOptions, 'texture'> & { tint?: string } = {},
): THREE.MeshStandardMaterial {
  return createVoxelMaterial(options.tint ?? '#FFFFFF', { ...options, texture });
}

export interface VoxelWaterMaterialOptions {
  /** Water-face dimensions used to retain the same texel density as blocks. */
  size?: readonly [number, number, number];
  tint?: string;
  opacity?: number;
  roughness?: number;
  clearcoat?: number;
  clearcoatRoughness?: number;
}

/**
 * Production wet-surface material for puddles and shallow water. It keeps the
 * original voxel water texture, but uses a physical clearcoat response so rain
 * scenes can carry small moving highlights instead of reading as blue glass.
 */
export function createVoxelWaterMaterial(
  options: VoxelWaterMaterialOptions = {},
): THREE.MeshPhysicalMaterial {
  const size = options.size ?? [1, 1, 1];
  const opacity = options.opacity ?? 0.74;
  const material = new THREE.MeshPhysicalMaterial({
    color: options.tint ?? '#D6F1F5',
    map: tiledTexture(
      'water',
      Math.max(size[0], size[2]) / BLOCK,
      Math.max(0.25, size[1] / BLOCK),
    ),
    roughness: options.roughness ?? 0.16,
    metalness: 0,
    clearcoat: options.clearcoat ?? 0.9,
    clearcoatRoughness: options.clearcoatRoughness ?? 0.12,
    transparent: opacity < 1,
    opacity,
    depthWrite: opacity >= 0.98,
    dithering: true,
  });
  material.name = 'voxel-water-physical';
  return material;
}

export function createVoxelGlow(color: THREE.Color | string, opacity = 1): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: opacity < 1,
    opacity,
    toneMapped: false,
    depthWrite: opacity >= 1,
  });
}

/**
 * Lit particle material for block debris. Effects built only from unlit glow
 * read as UI stuck in front of the world; debris that receives scene light
 * reads as part of it.
 */
export function createVoxelDebrisMaterial(
  color: THREE.Color | string,
  options: { emissive?: THREE.Color | string; emissiveIntensity?: number; opacity?: number } = {},
): THREE.MeshLambertMaterial {
  const opacity = options.opacity ?? 1;
  return new THREE.MeshLambertMaterial({
    color,
    emissive: options.emissive ?? '#000000',
    emissiveIntensity: options.emissiveIntensity ?? 0,
    transparent: opacity < 1,
    opacity,
    depthWrite: opacity >= 1,
  });
}

/** Small fake contact shadow retained for scenes that cannot afford a shadow map. */
export function createContactShadow(width: number, depth: number, opacity = 0.18): THREE.Mesh {
  const material = new THREE.MeshBasicMaterial({
    color: '#101718',
    transparent: true,
    opacity,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.006;
  return mesh;
}

/* ------------------------------------------------------------------ sky --- */

/**
 * A vertex-coloured sky dome. A flat `scene.background` colour is one of the
 * strongest "this is a test scene" tells; a graded sky that meets a matching
 * fog colour at the horizon is what makes distant terrain feel far away.
 *
 * Vertex colours are used rather than a custom shader so the theme stays
 * shader-free and remains evaluable headlessly.
 */
export function createSkyDome(options: {
  top: string;
  horizon: string;
  ground?: string;
  radius?: number;
}): THREE.Mesh {
  const radius = options.radius ?? 150;
  const geometry = new THREE.SphereGeometry(radius, 20, 14);
  const position = geometry.getAttribute('position');
  const colors = new Float32Array(position.count * 3);

  const top = new THREE.Color(options.top);
  const horizon = new THREE.Color(options.horizon);
  const ground = new THREE.Color(options.ground ?? options.horizon);
  const scratch = new THREE.Color();

  for (let i = 0; i < position.count; i++) {
    const y = position.getY(i) / radius;
    if (y >= 0) {
      scratch.copy(horizon).lerp(top, Math.pow(Math.min(1, y * 1.35), 0.62));
    } else {
      scratch.copy(horizon).lerp(ground, Math.min(1, -y * 3));
    }
    colors[i * 3] = scratch.r;
    colors[i * 3 + 1] = scratch.g;
    colors[i * 3 + 2] = scratch.b;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.MeshBasicMaterial({
    vertexColors: true,
    side: THREE.BackSide,
    fog: false,
    depthWrite: false,
    toneMapped: false,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'voxel-sky';
  mesh.renderOrder = -1;
  return mesh;
}

/* -------------------------------------------------------------- lighting -- */

export interface VoxelLightingOptions {
  /** Warm interior key instead of open-air sunlight. */
  warm?: boolean;
  /** Half-extent of the shadow frustum in world units. */
  shadowExtent?: number;
  /**
   * Local scene-light multiplier. Keep the default at 1 so existing scenes do
   * not drift; weather/night environments can deliberately darken the shared
   * rig without replacing it with one-off lights.
   */
  intensityScale?: number;
}

/**
 * Sun + sky + bounce. Intensities are chosen so a fully-lit white block lands
 * just under clipping: the previous rig stacked four lights and drove lit
 * surfaces past 1.0, which is what washed the scenes out.
 */
export function createVoxelLighting(options: VoxelLightingOptions = {}): THREE.Group {
  const group = new THREE.Group();
  group.name = 'voxel-lighting';
  const warm = options.warm === true;
  const extent = options.shadowExtent ?? 14;
  const intensityScale = Number.isFinite(options.intensityScale)
    ? THREE.MathUtils.clamp(options.intensityScale ?? 1, 0, 2)
    : 1;

  const hemisphere = new THREE.HemisphereLight(
    new THREE.Color(warm ? '#C29A72' : '#BBDDFF'),
    new THREE.Color(warm ? '#5C4238' : '#5F7A45'),
    (warm ? 0.88 : 0.72) * intensityScale,
  );
  group.add(hemisphere);

  const key = new THREE.DirectionalLight(
    new THREE.Color(warm ? '#FFCE93' : '#FFF6E0'),
    (warm ? 2.7 : 3.4) * intensityScale,
  );
  key.position.set(-9, 15, 8);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -extent;
  key.shadow.camera.right = extent;
  key.shadow.camera.top = extent;
  key.shadow.camera.bottom = -extent;
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 60;
  key.shadow.bias = -0.0006;
  key.shadow.normalBias = 0.02;
  group.add(key);

  // Single cool bounce so shadowed faces keep their material identity.
  const fill = new THREE.DirectionalLight(
    new THREE.Color(warm ? '#7E93A0' : '#9EC9E8'),
    (warm ? 0.28 : 0.22) * intensityScale,
  );
  fill.position.set(7, 5, -9);
  group.add(fill);

  return group;
}

export const VOXEL_PRESENTATION: ThemePresentation = {
  renderer: {
    toneMapping: 'acesFilmic',
    exposure: 1.08,
    shadows: { enabled: true, type: 'pcfSoft' },
    imageBasedLighting: { enabled: true, intensity: 0.42 },
  },
  postProcessing: {
    enabled: true,
    bloom: { strength: 0.22, radius: 0.2, threshold: 0.92 },
    vignette: { offset: 1.08, darkness: 0.34 },
  },
  typography: {
    question: {
      fontFamily: 'Inter, ui-rounded, system-ui, sans-serif',
      fontWeight: 850,
      fontSize: 'clamp(22px, 5.2vh, 42px)',
      lineHeight: 1.06,
      letterSpacing: '-0.02em',
      color: VOXEL_PALETTE.cream,
      textShadow: '0 3px 0 rgba(24,35,38,0.72), 0 6px 16px rgba(24,35,38,0.32)',
      textAlign: 'center',
    },
    explanation: {
      fontFamily: 'Inter, ui-rounded, system-ui, sans-serif',
      fontWeight: 650,
      fontSize: 'clamp(15px, 2.9vh, 24px)',
      lineHeight: 1.24,
      color: '#FFF8DF',
      textShadow: '0 2px 0 rgba(24,35,38,0.72), 0 4px 12px rgba(24,35,38,0.28)',
      textAlign: 'center',
    },
    artifactLabel: {
      fontFamily: 'Inter, ui-rounded, system-ui, sans-serif',
      fontWeight: 800,
      fontSize: 'clamp(11px, 1.7vh, 15px)',
      letterSpacing: '0.24em',
      textTransform: 'uppercase',
      color: VOXEL_PALETTE.reaction,
      textShadow: '0 2px 0 rgba(24,35,38,0.68)',
      textAlign: 'center',
    },
    brandLockup: {
      fontFamily: 'Inter, ui-rounded, system-ui, sans-serif',
      fontWeight: 800,
      fontSize: 'clamp(12px, 1.8vh, 16px)',
      letterSpacing: '0.18em',
      textTransform: 'uppercase',
      color: VOXEL_PALETTE.cream,
      opacity: 0.9,
    },
    number: {
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
      fontWeight: 750,
      fontSize: 'clamp(14px, 2.6vh, 22px)',
      letterSpacing: '0.03em',
      color: VOXEL_PALETTE.heatBright,
      fontVariantNumeric: 'tabular-nums',
    },
  },
  safeZones: {
    topChrome: 0.1,
    bottomCaption: 0.18,
    centralWidth: 0.82,
    placementY: {
      top: 0.12,
      upper: 0.34,
      center: 0.5,
      lower: 0.74,
      bottom: 0.88,
    },
  },
};
