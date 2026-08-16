import type { AssetDescriptor } from '@mindforge/engine';
import type { MindForgeTheme } from './ThemeTypes';
import { TOYBOX_CHARACTER_FACTORIES } from './toybox/ToyboxCharacter';
import { TOYBOX_EFFECT_FACTORIES } from './toybox/toybox-effects';
import { TOYBOX_ENVIRONMENT_FACTORIES } from './toybox/toybox-environments';
import { TOYBOX_PREFAB_FACTORIES } from './toybox/toybox-prefabs';
import { TOYBOX_PRESENTATION } from './toybox/toybox-style';

export { TOYBOX_PALETTE, toyboxToneColor } from './toybox/toybox-style';

const TOYBOX_ASSETS: AssetDescriptor[] = [
  {
    id: 'model.character.observer',
    kind: 'model',
    procedural: true,
    description: 'Original MindForge modular moulded-plastic Observer figure',
  },
  {
    id: 'model.character.externalHand',
    kind: 'model',
    procedural: true,
    description: 'Original MindForge moulded external hand',
  },
  {
    id: 'model.machine.heatEngine',
    kind: 'model',
    procedural: true,
    description: 'Original MindForge moulded Heat Engine',
  },
  { id: 'model.prop.cube', kind: 'model', procedural: true },
  { id: 'model.prop.lever', kind: 'model', procedural: true },
  { id: 'model.prop.door', kind: 'model', procedural: true },
  { id: 'model.environment.laboratory', kind: 'model', procedural: true },
];

/**
 * Alternative MindForge visual system: an original modular toy language of
 * glossy moulded parts, studded plates, and built places.
 *
 * It maps exactly the same semantic capability ids as Voxel without changing
 * episode meaning, shared motions, cameras, or Engine behaviour — which is the
 * point. Two unrelated art directions over one content surface is the proof
 * that the theme boundary holds.
 */
export const TOYBOX_THEME: MindForgeTheme = {
  id: 'toybox',
  label: 'MindForge Toybox',
  description:
    'Original modular toy language: glossy moulded parts, studded plates, and built places.',
  characters: TOYBOX_CHARACTER_FACTORIES,
  prefabs: TOYBOX_PREFAB_FACTORIES,
  effects: TOYBOX_EFFECT_FACTORIES,
  environments: TOYBOX_ENVIRONMENT_FACTORIES,
  assets: TOYBOX_ASSETS,
  presentation: TOYBOX_PRESENTATION,
};
