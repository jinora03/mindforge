import { Color, MeshBasicMaterial, MeshStandardMaterial, type Material } from 'three';
import { PALETTE, type PaletteToken } from './palette';
import type { MaterialName, MaterialOverrides } from './style-types';

const c = (token: PaletteToken): Color => new Color(PALETTE[token]);

/**
 * Forge Ceramic — matte faceted dark body with a soft violet edge glow. The
 * default identity for hero artifacts and mechanisms.
 */
export function createForgeCeramic(overrides: MaterialOverrides = {}): MeshStandardMaterial {
  return new MeshStandardMaterial({
    color: overrides.color ? c(overrides.color) : c('deepViolet'),
    emissive: overrides.emissive ? c(overrides.emissive) : c('forgeViolet'),
    emissiveIntensity: overrides.emissiveIntensity ?? 0.08,
    roughness: 0.78,
    metalness: 0.06,
    flatShading: true,
  });
}

/** Dark Structure — near-lightless depth structure that only catches rim light. */
export function createDarkStructure(overrides: MaterialOverrides = {}): MeshStandardMaterial {
  return new MeshStandardMaterial({
    color: overrides.color ? c(overrides.color) : c('voidInk'),
    roughness: 0.92,
    metalness: 0.12,
    flatShading: true,
  });
}

/** Signal Light — emissive pink-violet threads, points, and faces. Bloom bait. */
export function createSignalLight(overrides: MaterialOverrides = {}): MeshBasicMaterial {
  const material = new MeshBasicMaterial({
    color: overrides.color ? c(overrides.color) : c('signalPink'),
    transparent: true,
    opacity: overrides.opacity ?? 1,
    toneMapped: false,
  });
  return material;
}

/** Character Body — stylised, faceted, clearly human — never generic metal. */
export function createCharacterBody(overrides: MaterialOverrides = {}): MeshStandardMaterial {
  return new MeshStandardMaterial({
    color: overrides.color ? c(overrides.color) : new Color('#2c1c58'),
    emissive: overrides.emissive ? c(overrides.emissive) : c('forgeViolet'),
    emissiveIntensity: overrides.emissiveIntensity ?? 0.05,
    roughness: 0.6,
    metalness: 0.0,
    flatShading: true,
  });
}

/** Character Joint — a brighter accent so joints read at phone size. */
export function createCharacterJoint(overrides: MaterialOverrides = {}): MeshStandardMaterial {
  return new MeshStandardMaterial({
    color: overrides.color ? c(overrides.color) : c('forgeViolet'),
    emissive: overrides.emissive ? c(overrides.emissive) : c('signalPink'),
    emissiveIntensity: overrides.emissiveIntensity ?? 0.35,
    roughness: 0.4,
    metalness: 0.1,
    flatShading: true,
  });
}

/** Contour Energy — additive-feeling glow for contour ribbons and fields. */
export function createContourEnergy(overrides: MaterialOverrides = {}): MeshBasicMaterial {
  return new MeshBasicMaterial({
    color: overrides.color ? c(overrides.color) : c('forgeViolet'),
    transparent: true,
    opacity: overrides.opacity ?? 0.6,
    toneMapped: false,
  });
}

const FACTORIES: Record<MaterialName, (o?: MaterialOverrides) => Material> = {
  forgeCeramic: createForgeCeramic,
  darkStructure: createDarkStructure,
  signalLight: createSignalLight,
  characterBody: createCharacterBody,
  characterJoint: createCharacterJoint,
  contourEnergy: createContourEnergy,
};

/** Create a brand material by name. Always returns a fresh instance. */
export function createMaterial(name: MaterialName, overrides?: MaterialOverrides): Material {
  return FACTORIES[name](overrides);
}
