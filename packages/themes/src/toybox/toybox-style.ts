import * as THREE from 'three';
import type { VisualTone } from '@mindforge/engine';
import type { ThemePresentation } from '../ThemeTypes';

/**
 * MindForge Toybox — an original modular-toy visual language.
 *
 * Toybox is deliberately the inverse of Voxel in almost every dimension, which
 * is what makes it a real test of the theme boundary rather than a reskin:
 *
 * | Voxel                      | Toybox                                |
 * | -------------------------- | ------------------------------------- |
 * | matte, roughness ~0.94     | glossy plastic, roughness ~0.3        |
 * | 16px nearest-filter pixels | untextured flat saturated colour      |
 * | hard cubic edges           | chamfered, rounded parts              |
 * | texel density carries read | studs and gloss carry the read        |
 * | one continuous block grid  | discrete moulded parts snapped to studs |
 *
 * Per `docs/bibles/MindForge_Visual_Direction_v2.md`, Toybox evokes broad
 * toy/brick conventions using original geometry, palette, and materials only.
 */

/** One stud: the horizontal module all Toybox construction snaps to. */
export const STUD = 0.32;

/** A plate is the shallow vertical module; three plates stack to a full brick. */
export const PLATE = STUD * 0.4;

/**
 * Standard chamfer applied to moulded parts.
 *
 * Deliberately small. A large chamfer relative to part width reads as soft
 * pre-school toy; a thin one keeps parts crisply rectangular while still
 * catching a highlight along every edge, which is the moulded-plastic look.
 */
export const CHAMFER = 0.013;

export const TOYBOX_PALETTE = {
  skyHigh: '#3FA9E8',
  skyMid: '#74C8F2',
  skyLow: '#B7E4F8',
  skyHaze: '#D8F0FB',
  lawn: '#78C043',
  lawnDeep: '#5CA033',
  lawnLight: '#96D45C',
  soil: '#B07A4A',
  soilDeep: '#8C5E36',
  stone: '#B9C2C6',
  stoneDeep: '#8D979C',
  toySkin: '#F2B279',
  toySkinDeep: '#D9945E',
  jacket: '#E8563F',
  jacketDeep: '#C43F2C',
  trouser: '#2E7FD4',
  trouserDeep: '#2263A8',
  boot: '#41484D',
  hair: '#6B4326',
  cream: '#FFF6E2',
  ink: '#26292B',
  sunflower: '#F7D64A',
  tangerine: '#F79A2B',
  mint: '#3FD9B0',
  berry: '#E8476B',
  cobalt: '#3B62D6',
  chrome: '#D3DBDE',
  information: '#3FD9B0',
  prediction: '#37A8F5',
  suppression: '#94A3A8',
  reaction: '#F7D64A',
  insight: '#FFF3B8',
  heat: '#F7642B',
  heatBright: '#FFB03A',
} as const;

const TONE_COLORS: Record<VisualTone, string> = {
  neutral: TOYBOX_PALETTE.cream,
  information: TOYBOX_PALETTE.information,
  prediction: TOYBOX_PALETTE.prediction,
  suppression: TOYBOX_PALETTE.suppression,
  reaction: TOYBOX_PALETTE.reaction,
  insight: TOYBOX_PALETTE.insight,
  heat: TOYBOX_PALETTE.heat,
};

export function toyboxToneColor(tone: VisualTone): THREE.Color {
  return new THREE.Color(TONE_COLORS[tone]);
}

/* ------------------------------------------------------------- geometry --- */

const GEOMETRY_CACHE = new Map<string, THREE.BufferGeometry>();

/**
 * Cache a geometry under a size key, evicting on disposal.
 *
 * The Engine's `disposeObject3D` releases every geometry it reaches when an
 * episode unloads. Shared geometry must therefore drop out of the cache when
 * that happens, or a second episode would bind disposed GPU buffers — the same
 * trap the Voxel texture cache had to handle.
 */
function cacheGeometry<T extends THREE.BufferGeometry>(key: string, build: () => T): T {
  const cached = GEOMETRY_CACHE.get(key);
  if (cached) return cached as T;
  const geometry = build();
  geometry.addEventListener('dispose', () => {
    if (GEOMETRY_CACHE.get(key) === geometry) GEOMETRY_CACHE.delete(key);
  });
  GEOMETRY_CACHE.set(key, geometry);
  return geometry;
}

function roundedRect(width: number, height: number, radius: number): THREE.Shape {
  const shape = new THREE.Shape();
  const x = -width / 2;
  const y = -height / 2;
  const r = Math.max(0.001, Math.min(radius, width / 2 - 0.001, height / 2 - 0.001));
  shape.moveTo(x + r, y);
  shape.lineTo(x + width - r, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + r);
  shape.lineTo(x + width, y + height - r);
  shape.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  shape.lineTo(x + r, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - r);
  shape.lineTo(x, y + r);
  shape.quadraticCurveTo(x, y, x + r, y);
  return shape;
}

/**
 * A chamfered box, centred on the origin.
 *
 * Built by extruding a rounded rectangle with a bevel, so all twelve edges pick
 * up a highlight. That highlight is most of what separates a moulded plastic
 * part from a bare `BoxGeometry`; the shape is otherwise identical.
 *
 * Costs a few hundred triangles, so it is for characters and hero props. Bulk
 * scenery uses `brickGeometry` and lets the studs carry the read instead.
 */
export function moulded(
  width: number,
  height: number,
  depth: number,
  chamfer = CHAMFER,
  smoothness = 1,
): THREE.BufferGeometry {
  const c = Math.max(0.004, Math.min(chamfer, width / 2.6, height / 2.6, depth / 2.6));
  const key = `moulded|${width.toFixed(4)}|${height.toFixed(4)}|${depth.toFixed(4)}|${c.toFixed(4)}|${smoothness}`;
  return cacheGeometry(key, () => {
    // A large chamfer with extra segments produces the rounded-block head this
    // character family uses; a small one with few segments keeps limbs crisp.
    const shape = roundedRect(width - 2 * c, height - 2 * c, c * (smoothness > 1 ? 2.6 : 1.6));
    const extrudeDepth = Math.max(0.004, depth - 2 * c);
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: extrudeDepth,
      bevelEnabled: true,
      bevelThickness: c,
      bevelSize: c,
      bevelOffset: 0,
      bevelSegments: smoothness > 1 ? 5 : 2,
      curveSegments: smoothness > 1 ? 7 : 3,
      steps: 1,
    });
    geometry.translate(0, 0, -extrudeDepth / 2);
    geometry.computeVertexNormals();
    return geometry;
  });
}

/** Plain box for bulk scenery, cached by size. */
export function brickGeometry(width: number, height: number, depth: number): THREE.BufferGeometry {
  const key = `brick|${width.toFixed(4)}|${height.toFixed(4)}|${depth.toFixed(4)}`;
  return cacheGeometry(key, () => new THREE.BoxGeometry(width, height, depth));
}

/** The raised cylinder on top of a brick — the single strongest toy signal. */
export function studGeometry(radius = STUD * 0.3, height = STUD * 0.18): THREE.BufferGeometry {
  const key = `stud|${radius.toFixed(4)}|${height.toFixed(4)}`;
  return cacheGeometry(key, () => {
    const geometry = new THREE.CylinderGeometry(radius, radius * 0.98, height, 12, 1);
    geometry.translate(0, height / 2, 0);
    return geometry;
  });
}

export function tubeGeometry(radius: number, length: number, segments = 14): THREE.BufferGeometry {
  const key = `tube|${radius.toFixed(4)}|${length.toFixed(4)}|${segments}`;
  return cacheGeometry(key, () => new THREE.CylinderGeometry(radius, radius, length, segments, 1));
}

export function ballGeometry(radius: number, segments = 14): THREE.BufferGeometry {
  const key = `ball|${radius.toFixed(4)}|${segments}`;
  return cacheGeometry(key, () => new THREE.SphereGeometry(radius, segments, Math.max(6, segments / 2)));
}

/**
 * A compact moulded cylinder for Toybox heads.
 *
 * The profile keeps a broad straight side wall and only rounds the top/bottom
 * edges. That prevents the character from reading as a sphere while preserving
 * the smooth plastic silhouette that distinguishes Toybox from Voxel.
 */
export function toyHeadGeometry(
  radius = 0.26,
  height = 0.42,
  depthScale = 0.9,
  segments = 24,
): THREE.BufferGeometry {
  const key = `toyHead|${radius.toFixed(4)}|${height.toFixed(4)}|${depthScale.toFixed(4)}|${segments}`;
  return cacheGeometry(key, () => {
    const bevel = Math.min(radius * 0.16, height * 0.12);
    const profile = [
      new THREE.Vector2(0, -height / 2),
      new THREE.Vector2(radius - bevel, -height / 2),
      new THREE.Vector2(radius, -height / 2 + bevel),
      new THREE.Vector2(radius, height / 2 - bevel),
      new THREE.Vector2(radius - bevel, height / 2),
      new THREE.Vector2(0, height / 2),
    ];
    const geometry = new THREE.LatheGeometry(profile, segments);
    geometry.scale(1, 1, depthScale);
    geometry.computeVertexNormals();
    return geometry;
  });
}

/** Rounded plastic token used by Toybox effects instead of generic spheres. */
export function toyTokenGeometry(width: number, height: number, depth: number): THREE.BufferGeometry {
  return moulded(width, height, depth, Math.min(width, height, depth) * 0.22, 2);
}

/* ------------------------------------------------------------ materials --- */

export interface PlasticOptions {
  /** 0 = mirror, 1 = chalk. Toy plastic lives around 0.28-0.4. */
  roughness?: number;
  metalness?: number;
  emissive?: string;
  emissiveIntensity?: number;
  transparent?: boolean;
  opacity?: number;
  /** Matte rubber for tyres, grips, and boots. */
  rubber?: boolean;
  clearcoat?: number;
  clearcoatRoughness?: number;
  depthWrite?: boolean;
}

/**
 * Glossy moulded plastic. Created fresh per call, never cached: the timeline can
 * animate `color`, `opacity`, and `emissiveIntensity` on any subtree, and a
 * shared material would leak that animation across unrelated parts.
 *
 * The Engine supplies a restrained neutral reflection environment, while the
 * Toybox light rig supplies the directional key/rim that gives moulded edges a
 * readable highlight.
 */
export function plastic(color: string, options: PlasticOptions = {}): THREE.MeshStandardMaterial {
  const opacity = options.opacity ?? 1;
  const transparent = options.transparent ?? opacity < 1;
  const rubber = options.rubber === true;
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness: options.roughness ?? (rubber ? 0.82 : 0.31),
    metalness: options.metalness ?? 0,
    emissive: options.emissive ?? '#000000',
    emissiveIntensity: options.emissiveIntensity ?? 0,
    clearcoat: options.clearcoat ?? (rubber ? 0.04 : 0.38),
    clearcoatRoughness: options.clearcoatRoughness ?? (rubber ? 0.65 : 0.24),
    transparent,
    opacity,
    depthWrite: options.depthWrite ?? !(transparent && opacity < 0.98),
    dithering: true,
  });
}

/** Brushed metal for machine parts: stylised PBR with a restrained clear coat. */
export function toyMetal(color: THREE.ColorRepresentation = TOYBOX_PALETTE.chrome): THREE.MeshStandardMaterial {
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.3,
    metalness: 0.68,
    clearcoat: 0.12,
    clearcoatRoughness: 0.34,
    dithering: true,
  });
}

/** Unlit glow for effect cores and lamp lenses. */
export function toyGlow(color: THREE.Color | string, opacity = 1): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: opacity < 1,
    opacity,
    toneMapped: false,
    depthWrite: opacity >= 1,
  });
}

/** Lit debris so effect fragments sit inside the scene's own lighting. */
export function toyDebris(
  color: THREE.Color | string,
  options: { emissive?: THREE.Color | string; emissiveIntensity?: number; opacity?: number } = {},
): THREE.MeshStandardMaterial {
  const opacity = options.opacity ?? 1;
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.3,
    metalness: 0,
    emissive: options.emissive ?? '#000000',
    emissiveIntensity: options.emissiveIntensity ?? 0,
    transparent: opacity < 1,
    opacity,
    depthWrite: opacity >= 1,
    dithering: true,
  });
}

/* ----------------------------------------------------------------- sky ---- */

/**
 * A banded cartoon sky.
 *
 * Voxel uses a smooth vertex-coloured gradient; Toybox steps the same idea into
 * discrete bands, which suits moulded plastic and keeps the two themes visually
 * independent rather than sharing one sky implementation.
 */
export function createToySky(options: {
  bands?: readonly string[];
  radius?: number;
}): THREE.Mesh {
  const bands = options.bands ?? [
    TOYBOX_PALETTE.skyHigh,
    TOYBOX_PALETTE.skyMid,
    TOYBOX_PALETTE.skyLow,
    TOYBOX_PALETTE.skyHaze,
  ];
  const radius = options.radius ?? 150;
  const geometry = new THREE.SphereGeometry(radius, 24, 16);
  const position = geometry.getAttribute('position');
  const colors = new Float32Array(position.count * 3);
  const scratch = new THREE.Color();

  for (let i = 0; i < position.count; i++) {
    const y = position.getY(i) / radius;
    // Quantise height into bands, brightest at the zenith.
    const t = 1 - Math.min(1, Math.max(0, y * 1.15 + 0.06));
    const index = Math.min(bands.length - 1, Math.floor(t * bands.length));
    scratch.set(bands[index]);
    colors[i * 3] = scratch.r;
    colors[i * 3 + 1] = scratch.g;
    colors[i * 3 + 2] = scratch.b;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const mesh = new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({
      vertexColors: true,
      side: THREE.BackSide,
      fog: false,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  mesh.name = 'toybox-sky';
  mesh.renderOrder = -1;
  return mesh;
}

/* ------------------------------------------------------------- lighting --- */

export interface ToyLightingOptions {
  warm?: boolean;
  shadowExtent?: number;
}

/**
 * Toy plastic needs a visible highlight, and without an environment map that
 * highlight can only come from direct light. The key is therefore stronger and
 * more frontal than Voxel's sun, with a bright fill so the shadow side stays
 * candy-coloured instead of going muddy.
 */
export function createToyLighting(options: ToyLightingOptions = {}): THREE.Group {
  const group = new THREE.Group();
  group.name = 'toybox-lighting';
  const warm = options.warm === true;
  const extent = options.shadowExtent ?? 14;

  group.add(
    new THREE.HemisphereLight(
      new THREE.Color(warm ? '#FFC79A' : '#CFEBFF'),
      new THREE.Color(warm ? '#4A3630' : '#7E9A63'),
      warm ? 0.9 : 0.92,
    ),
  );

  const key = new THREE.DirectionalLight(
    new THREE.Color(warm ? '#FFD9A6' : '#FFFDF2'),
    warm ? 2.8 : 3.35,
  );
  key.position.set(-6, 12, 9);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -extent;
  key.shadow.camera.right = extent;
  key.shadow.camera.top = extent;
  key.shadow.camera.bottom = -extent;
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 60;
  key.shadow.bias = -0.0002;
  key.shadow.normalBias = 0.035;
  key.shadow.radius = 2;
  group.add(key);

  // Opposing rim, angled to catch the chamfers along the shadow edge.
  const rim = new THREE.DirectionalLight(
    new THREE.Color(warm ? '#8FA6B8' : '#BFE0FF'),
    warm ? 0.38 : 0.46,
  );
  rim.position.set(8, 6, -7);
  group.add(rim);

  return group;
}

export const TOYBOX_PRESENTATION: ThemePresentation = {
  renderer: {
    toneMapping: 'acesFilmic',
    exposure: 1.02,
    shadows: { enabled: true, type: 'pcfSoft' },
    imageBasedLighting: { enabled: true, intensity: 0.58 },
  },
  postProcessing: {
    enabled: true,
    bloom: { strength: 0.3, radius: 0.26, threshold: 0.88 },
    vignette: { offset: 1.14, darkness: 0.26 },
  },
  typography: {
    question: {
      fontFamily: 'Nunito, ui-rounded, "Segoe UI Rounded", system-ui, sans-serif',
      fontWeight: 900,
      fontSize: 'clamp(23px, 5.4vh, 44px)',
      lineHeight: 1.05,
      letterSpacing: '-0.015em',
      color: TOYBOX_PALETTE.cream,
      textShadow: '0 4px 0 rgba(38,41,43,0.6), 0 8px 18px rgba(38,41,43,0.28)',
      textAlign: 'center',
    },
    explanation: {
      fontFamily: 'Nunito, ui-rounded, "Segoe UI Rounded", system-ui, sans-serif',
      fontWeight: 700,
      fontSize: 'clamp(15px, 3vh, 25px)',
      lineHeight: 1.26,
      color: '#FFFCF0',
      textShadow: '0 3px 0 rgba(38,41,43,0.58), 0 5px 14px rgba(38,41,43,0.24)',
      textAlign: 'center',
    },
    artifactLabel: {
      fontFamily: 'Nunito, ui-rounded, system-ui, sans-serif',
      fontWeight: 800,
      fontSize: 'clamp(11px, 1.8vh, 16px)',
      letterSpacing: '0.22em',
      textTransform: 'uppercase',
      color: TOYBOX_PALETTE.sunflower,
      textShadow: '0 2px 0 rgba(38,41,43,0.55)',
      textAlign: 'center',
    },
    brandLockup: {
      fontFamily: 'Nunito, ui-rounded, system-ui, sans-serif',
      fontWeight: 800,
      fontSize: 'clamp(12px, 1.9vh, 17px)',
      letterSpacing: '0.16em',
      textTransform: 'uppercase',
      color: TOYBOX_PALETTE.cream,
      opacity: 0.92,
    },
    number: {
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
      fontWeight: 700,
      fontSize: 'clamp(14px, 2.7vh, 23px)',
      letterSpacing: '0.02em',
      color: TOYBOX_PALETTE.tangerine,
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
