import { Color } from 'three';

/**
 * The MindForge palette (Design Bible §3). These are the *only* core brand
 * colours; episodes reference them rather than inventing neon. Meaning:
 * violet is dormant depth, pink is active transformation, white is resolved
 * understanding, and Forge Spark is rare discovery (< 5% of a frame).
 */
export const PALETTE = {
  voidInk: '#080312',
  deepViolet: '#1A0B38',
  forgeViolet: '#6737FF',
  signalPink: '#FF4FC8',
  plasmaRose: '#FF7ABF',
  insightWhite: '#FFF7FC',
  forgeSpark: '#FFB36B',
} as const;

export type PaletteToken = keyof typeof PALETTE;

/** Return a fresh THREE.Color for a palette token (never share mutable colours). */
export function color(token: PaletteToken): Color {
  return new Color(PALETTE[token]);
}

/** Numeric hex for a palette token, useful for renderer clear colours. */
export function hex(token: PaletteToken): number {
  return new Color(PALETTE[token]).getHex();
}

/**
 * Gradient recipes (Design Bible §3). Each is an ordered list of palette
 * tokens; environments and effects pick the recipe that matches the current
 * narrative state.
 */
export const GRADIENTS = {
  /** Backgrounds, large negative space, openings. */
  voidField: ['voidInk', 'deepViolet', 'forgeViolet'],
  /** Core activations, decisions, reconfiguration. */
  transformationField: ['deepViolet', 'forgeViolet', 'signalPink'],
  /** Final reveal, solved state, knowledge ignition. */
  revelationFlare: ['signalPink', 'plasmaRose', 'insightWhite'],
  /** Special artifact, major surprise, premium accent. */
  rareDiscovery: ['forgeViolet', 'signalPink', 'forgeSpark'],
} as const satisfies Record<string, PaletteToken[]>;

export type GradientName = keyof typeof GRADIENTS;

/** Resolve a gradient recipe to an ordered list of THREE.Color stops. */
export function gradientColors(name: GradientName): Color[] {
  return GRADIENTS[name].map((token) => color(token));
}

/**
 * The Design Bible colour ratio: ~70% void / deep violet, ~20% violet-pink
 * action, ~10% white or warm accent. Exposed for Studio diagnostics.
 */
export const COLOR_RATIO = { void: 0.7, action: 0.2, accent: 0.1 } as const;
