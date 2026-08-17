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
  { id: 'model.prop.materialSamples', kind: 'model', procedural: true, description: 'Reusable paired metal and wood experiment samples' },
  { id: 'model.prop.balloon', kind: 'model', procedural: true, description: 'Reusable balloon prop for static and air-pressure demonstrations' },
  { id: 'model.prop.demoPanel', kind: 'model', procedural: true, description: 'Reusable upright target/wall panel' },
  { id: 'model.prop.floatTank', kind: 'model', procedural: true, description: 'Reusable transparent liquid tank with movable sample' },
  { id: 'model.prop.bowlSpoon', kind: 'model', procedural: true, description: 'Reusable bowl, liquid and spoon kitchen experiment rig' },
  { id: 'model.environment.materialLab', kind: 'model', procedural: true, description: 'Reusable materials and bench laboratory environment' },
  { id: 'model.environment.classroomLab', kind: 'model', procedural: true, description: 'Reusable classroom demonstration environment' },
  { id: 'model.environment.kitchenLab', kind: 'model', procedural: true, description: 'Reusable kitchen-island experiment environment' },
];

/**
 * Primary MindForge visual system: an original, block-built gameplay language.
 * It maps the same semantic capability ids as every other theme without changing episode
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
