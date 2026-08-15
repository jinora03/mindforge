import {
  AmbientLight,
  Color,
  DirectionalLight,
  Group,
  HemisphereLight,
  type Vector3Tuple,
} from 'three';
import { PALETTE, type PaletteToken } from './palette';
import type { LightingPreset } from './style-types';

interface PresetSpec {
  key: { color: PaletteToken; intensity: number; position: Vector3Tuple };
  rim: { color: PaletteToken; intensity: number; position: Vector3Tuple };
  ambient: { color: PaletteToken; intensity: number };
  hemisphere?: { sky: PaletteToken; ground: PaletteToken; intensity: number };
}

/**
 * Lighting presets (Design Bible §6). Each has one narrative key light, a
 * silhouette-preserving rim, and restrained fill. Bloom is *not* applied here;
 * white light is earned by the revelation preset only.
 */
const PRESETS: Record<LightingPreset, PresetSpec> = {
  artifact: {
    key: { color: 'insightWhite', intensity: 1.6, position: [3, 5, 4] },
    rim: { color: 'signalPink', intensity: 1.1, position: [-4, 2, -5] },
    ambient: { color: 'deepViolet', intensity: 0.35 },
  },
  character: {
    key: { color: 'insightWhite', intensity: 1.3, position: [2.5, 4, 5] },
    rim: { color: 'forgeViolet', intensity: 1.4, position: [-3, 3, -4] },
    ambient: { color: 'deepViolet', intensity: 0.4 },
    hemisphere: { sky: 'forgeViolet', ground: 'voidInk', intensity: 0.35 },
  },
  mystery: {
    key: { color: 'forgeViolet', intensity: 0.8, position: [2, 3, 4] },
    rim: { color: 'signalPink', intensity: 1.5, position: [-3, 1, -5] },
    ambient: { color: 'voidInk', intensity: 0.15 },
  },
  prediction: {
    key: { color: 'forgeViolet', intensity: 1.4, position: [2, 4, 5] },
    rim: { color: 'plasmaRose', intensity: 1.0, position: [-3, 2, -4] },
    ambient: { color: 'deepViolet', intensity: 0.32 },
    hemisphere: { sky: 'forgeViolet', ground: 'voidInk', intensity: 0.3 },
  },
  heat: {
    key: { color: 'plasmaRose', intensity: 1.5, position: [3, 4, 3] },
    rim: { color: 'signalPink', intensity: 1.3, position: [-4, 2, -4] },
    ambient: { color: 'deepViolet', intensity: 0.3 },
  },
  revelation: {
    key: { color: 'insightWhite', intensity: 2.1, position: [2, 5, 4] },
    rim: { color: 'plasmaRose', intensity: 1.4, position: [-3, 3, -4] },
    ambient: { color: 'forgeViolet', intensity: 0.5 },
  },
};

const c = (token: PaletteToken): Color => new Color(PALETTE[token]);

/** Build a lighting rig for a preset as a Group the environment can add. */
export function createLighting(preset: LightingPreset): Group {
  const spec = PRESETS[preset];
  const group = new Group();
  group.name = `lighting:${preset}`;

  const key = new DirectionalLight(c(spec.key.color), spec.key.intensity);
  key.position.set(...spec.key.position);
  group.add(key);

  const rim = new DirectionalLight(c(spec.rim.color), spec.rim.intensity);
  rim.position.set(...spec.rim.position);
  group.add(rim);

  group.add(new AmbientLight(c(spec.ambient.color), spec.ambient.intensity));

  if (spec.hemisphere) {
    group.add(
      new HemisphereLight(c(spec.hemisphere.sky), c(spec.hemisphere.ground), spec.hemisphere.intensity),
    );
  }
  return group;
}

export const LIGHTING_PRESETS = Object.keys(PRESETS) as LightingPreset[];
