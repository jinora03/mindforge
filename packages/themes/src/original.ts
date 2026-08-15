import type { AssetDescriptor } from '@mindforge/engine';
import { CHARACTER_FACTORIES } from '@mindforge/characters';
import { EFFECT_FACTORIES } from '@mindforge/effects';
import { ENVIRONMENT_FACTORIES } from '@mindforge/environments';
import { POST_PROCESSING, SAFE_ZONES, TYPOGRAPHY } from '@mindforge/style';
import type { MindForgeTheme } from './ThemeTypes';

const ORIGINAL_ASSETS: AssetDescriptor[] = [
  {
    id: 'model.character.observer',
    kind: 'model',
    procedural: true,
    description: 'MindForge Original Observer humanoid',
  },
  {
    id: 'model.character.externalHand',
    kind: 'model',
    procedural: true,
    description: 'MindForge Original external touching hand',
  },
  {
    id: 'model.machine.heatEngine',
    kind: 'model',
    procedural: true,
    description: 'MindForge Original Heat Engine artifact',
  },
  { id: 'model.prop.cube', kind: 'model', procedural: true },
  { id: 'model.prop.lever', kind: 'model', procedural: true },
  { id: 'model.prop.door', kind: 'model', procedural: true },
  { id: 'model.environment.laboratory', kind: 'model', procedural: true },
];

/** Existing v0.1 visuals, now expressed as the first swappable theme. */
export const ORIGINAL_THEME: MindForgeTheme = {
  id: 'original',
  label: 'MindForge Original',
  description: 'Violet faceted cosmic visual language from the v0.1 Design Bible.',
  characters: CHARACTER_FACTORIES,
  effects: EFFECT_FACTORIES,
  environments: ENVIRONMENT_FACTORIES,
  assets: ORIGINAL_ASSETS,
  presentation: {
    postProcessing: POST_PROCESSING,
    typography: TYPOGRAPHY,
    safeZones: SAFE_ZONES,
  },
};
