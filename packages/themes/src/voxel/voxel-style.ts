import * as THREE from 'three';
import type { VisualTone } from '@mindforge/engine';
import type { ThemePresentation } from '../ThemeTypes';

/**
 * Original MindForge voxel palette. The visual language intentionally leans
 * into bright sandbox-game readability while keeping the actual materials,
 * textures, assets, and color choices original to MindForge.
 */
export const VOXEL_PALETTE = {
  sky: '#78C8FF',
  skyDeep: '#4DA9E8',
  fog: '#B7E2F6',
  grass: '#68AE38',
  grassLight: '#8CCB4B',
  grassDark: '#4D8730',
  earth: '#8A633F',
  earthDark: '#65452D',
  wood: '#8C5D34',
  woodDark: '#684328',
  leaf: '#4E983D',
  leafLight: '#6DB94E',
  stone: '#6F7779',
  stoneLight: '#9AA0A0',
  stoneDark: '#4E5658',
  metal: '#465458',
  water: '#48A9E6',
  sand: '#D9C37B',
  ink: '#171C1D',
  cream: '#F5E8BD',
  skin: '#D69A59',
  skinLight: '#E9B36E',
  cloth: '#21806F',
  clothLight: '#2E9C82',
  clothDark: '#16594E',
  copper: '#B96435',
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

/**
 * Tiny deterministic nearest-neighbour texture used to keep large box faces
 * from reading as raw Three.js primitives. This is not a copied game texture;
 * every material gets a simple original pixel variation generated in code.
 */
function createPixelVariationTexture(variation = 0.12): THREE.DataTexture {
  const size = 8;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const hash = ((x * 37 + y * 61 + x * y * 17 + 13) % 19) / 18;
      const coarse = ((Math.floor(x / 2) + Math.floor(y / 2) * 3) % 5) / 4;
      const signed = (hash * 0.65 + coarse * 0.35) * 2 - 1;
      const shade = Math.round(255 * (1 - variation * 0.5 + signed * variation * 0.5));
      const clamped = Math.max(0, Math.min(255, shade));
      data[i] = clamped;
      data[i + 1] = clamped;
      data[i + 2] = clamped;
      data[i + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.needsUpdate = true;
  return texture;
}

export function createVoxelMaterial(
  color: string,
  options: {
    emissive?: string;
    emissiveIntensity?: number;
    roughness?: number;
    metalness?: number;
    transparent?: boolean;
    opacity?: number;
    pixelVariation?: number;
  } = {},
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    map: options.pixelVariation === 0
      ? null
      : createPixelVariationTexture(options.pixelVariation ?? 0.1),
    emissive: options.emissive ?? '#000000',
    emissiveIntensity: options.emissiveIntensity ?? 0,
    roughness: options.roughness ?? 0.92,
    metalness: options.metalness ?? 0.01,
    flatShading: true,
    transparent: options.transparent ?? false,
    opacity: options.opacity ?? 1,
  });
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

/** Small fake contact shadow used even when renderer shadows are unavailable. */
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

export function createVoxelLighting(options: { warm?: boolean } = {}): THREE.Group {
  const group = new THREE.Group();
  group.name = 'voxel-lighting';

  const hemisphere = new THREE.HemisphereLight(
    new THREE.Color(options.warm ? '#B8D7E0' : '#C7E9FF'),
    new THREE.Color(options.warm ? '#6A4933' : '#5B7040'),
    options.warm ? 1.35 : 1.55,
  );
  group.add(hemisphere);

  const key = new THREE.DirectionalLight(
    new THREE.Color(options.warm ? '#FFD59A' : '#FFF1C7'),
    options.warm ? 3.15 : 3.0,
  );
  key.position.set(-5.5, 8.5, 6.5);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -8;
  key.shadow.camera.right = 8;
  key.shadow.camera.top = 8;
  key.shadow.camera.bottom = -8;
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 30;
  key.shadow.bias = -0.0005;
  group.add(key);

  const fill = new THREE.DirectionalLight(new THREE.Color('#8ED7FF'), options.warm ? 0.42 : 0.62);
  fill.position.set(5, 4, -4);
  group.add(fill);

  const rim = new THREE.DirectionalLight(new THREE.Color(options.warm ? '#FF9B54' : '#BDE8FF'), 0.48);
  rim.position.set(-4, 2.5, -6);
  group.add(rim);

  return group;
}

export const VOXEL_PRESENTATION: ThemePresentation = {
  postProcessing: {
    enabled: true,
    bloom: { strength: 0.28, radius: 0.16, threshold: 0.88 },
    vignette: { offset: 1.06, darkness: 0.38 },
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
