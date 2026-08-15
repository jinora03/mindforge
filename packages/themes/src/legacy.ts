import type { AssetDescriptor } from '@mindforge/engine';
import { CHARACTER_FACTORIES } from '@mindforge/characters';
import { EFFECT_FACTORIES } from '@mindforge/effects';
import { ENVIRONMENT_FACTORIES } from '@mindforge/environments';
import { POST_PROCESSING, SAFE_ZONES, TYPOGRAPHY } from '@mindforge/style';
import type { MindForgeTheme } from './ThemeTypes';
import { LEGACY_PREFAB_FACTORIES } from './legacy-prefabs';

const LEGACY_ASSETS: AssetDescriptor[] = [
  {
    id: 'model.character.observer',
    kind: 'model',
    procedural: true,
    description: 'Legacy prototype Observer humanoid',
  },
  {
    id: 'model.character.externalHand',
    kind: 'model',
    procedural: true,
    description: 'Legacy prototype external touching hand',
  },
  {
    id: 'model.machine.heatEngine',
    kind: 'model',
    procedural: true,
    description: 'Legacy prototype Heat Engine artifact',
  },
  { id: 'model.prop.cube', kind: 'model', procedural: true },
  { id: 'model.prop.lever', kind: 'model', procedural: true },
  { id: 'model.prop.door', kind: 'model', procedural: true },
  { id: 'model.environment.laboratory', kind: 'model', procedural: true },
];

/**
 * Transitional v0.1 visuals. This is not a supported target art direction; it
 * exists only until Phase 1 replaces it with the Voxel theme.
 */
export const LEGACY_THEME: MindForgeTheme = {
  id: 'legacy',
  label: 'Legacy Prototype',
  description: 'Retired violet/pink prototype visuals kept temporarily for migration.',
  characters: CHARACTER_FACTORIES,
  prefabs: LEGACY_PREFAB_FACTORIES,
  effects: EFFECT_FACTORIES,
  environments: ENVIRONMENT_FACTORIES,
  assets: LEGACY_ASSETS,
  presentation: {
    postProcessing: POST_PROCESSING,
    typography: TYPOGRAPHY,
    safeZones: SAFE_ZONES,
  },
};
