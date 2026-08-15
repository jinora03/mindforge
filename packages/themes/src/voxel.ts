import type { AssetDescriptor } from '@mindforge/engine';
import type { MindForgeTheme } from './ThemeTypes';
import { VOXEL_CHARACTER_FACTORIES } from './voxel/VoxelCharacter';
import { VOXEL_EFFECT_FACTORIES } from './voxel/voxel-effects';
import { VOXEL_ENVIRONMENT_FACTORIES } from './voxel/voxel-environments';
import { VOXEL_PREFAB_FACTORIES } from './voxel/voxel-prefabs';
import { VOXEL_PRESENTATION } from './voxel/voxel-style';

const VOXEL_ASSETS: AssetDescriptor[] = [
  {
    id: 'model.character.observer',
    kind: 'model',
    procedural: true,
    description: 'Original MindForge block-built Observer character',
  },
  {
    id: 'model.character.externalHand',
    kind: 'model',
    procedural: true,
    description: 'Original MindForge block-built external hand',
  },
  {
    id: 'model.machine.heatEngine',
    kind: 'model',
    procedural: true,
    description: 'Original MindForge block-built Heat Engine',
  },
  { id: 'model.prop.cube', kind: 'model', procedural: true },
  { id: 'model.prop.lever', kind: 'model', procedural: true },
  { id: 'model.prop.door', kind: 'model', procedural: true },
  { id: 'model.environment.laboratory', kind: 'model', procedural: true },
];

/**
 * Primary MindForge visual system: an original, block-built gameplay language.
 * It maps the same semantic capability ids as legacy without changing episode
 * meaning, shared motions, cameras, or Engine behavior.
 */
export const VOXEL_THEME: MindForgeTheme = {
  id: 'voxel',
  label: 'MindForge Voxel',
  description: 'Original block-built gameplay visuals with warm materials and chunky semantic effects.',
  characters: VOXEL_CHARACTER_FACTORIES,
  prefabs: VOXEL_PREFAB_FACTORIES,
  effects: VOXEL_EFFECT_FACTORIES,
  environments: VOXEL_ENVIRONMENT_FACTORIES,
  assets: VOXEL_ASSETS,
  presentation: VOXEL_PRESENTATION,
};

export {
  VOXEL_CHARACTER_FACTORIES,
  VOXEL_EFFECT_FACTORIES,
  VOXEL_ENVIRONMENT_FACTORIES,
  VOXEL_PREFAB_FACTORIES,
  VOXEL_PRESENTATION,
};
export { VOXEL_PALETTE, voxelToneColor } from './voxel/voxel-style';
