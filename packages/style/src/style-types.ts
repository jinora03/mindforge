import type { PaletteToken } from './palette';

/** Reusable brand material identities (Design Bible §6). */
export type MaterialName =
  | 'forgeCeramic'
  | 'darkStructure'
  | 'signalLight'
  | 'characterBody'
  | 'characterJoint'
  | 'contourEnergy';

/** Named lighting presets keyed to narrative state. */
export type LightingPreset =
  | 'artifact'
  | 'character'
  | 'mystery'
  | 'prediction'
  | 'heat'
  | 'revelation';

/** Typography roles (Design Bible §8). */
export type TypographyRole =
  | 'question'
  | 'explanation'
  | 'artifactLabel'
  | 'brandLockup'
  | 'number';

export interface MaterialOverrides {
  color?: PaletteToken;
  emissive?: PaletteToken;
  emissiveIntensity?: number;
  opacity?: number;
}
