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
  { id: 'model.environment.vehicleCabin', kind: 'model', procedural: true, description: 'Reusable vehicle interior for inertia and safety demonstrations' },
  { id: 'model.environment.dropLab', kind: 'model', procedural: true, description: 'Reusable vertical drop-test laboratory' },
  { id: 'model.prop.seatRig', kind: 'model', procedural: true, description: 'Reusable seatbelt/inertia passenger rig' },
  { id: 'model.prop.featherRock', kind: 'model', procedural: true, description: 'Reusable paired rock/feather drop rig' },
  { id: 'model.prop.paperPlane', kind: 'model', procedural: true, description: 'Reusable paper glider with aerodynamic anchors' },
  { id: 'model.prop.magnetKit', kind: 'model', procedural: true, description: 'Reusable magnet and material-target kit' },
  { id: 'model.environment.canyon', kind: 'model', procedural: true, description: 'Reusable canyon corridor for echoes and wave travel' },
  { id: 'model.environment.rainMeadow', kind: 'model', procedural: true, description: 'Reusable rainy meadow for optics and weather demonstrations' },
  { id: 'model.environment.nightOverlook', kind: 'model', procedural: true, description: 'Reusable night overlook for horizon and perception scenes' },
  { id: 'model.environment.observatory', kind: 'model', procedural: true, description: 'Reusable observatory for astronomy and atmosphere scenes' },
  { id: 'model.prop.soundRig', kind: 'model', procedural: true, description: 'Reusable sound source/listener/reflector rig' },
  { id: 'model.prop.prismDrop', kind: 'model', procedural: true, description: 'Reusable optical splitter with spectrum anchors' },
  { id: 'model.prop.moonPair', kind: 'model', procedural: true, description: 'Reusable equal-size Moon perception comparison rig' },
  { id: 'model.prop.starPlanetPair', kind: 'model', procedural: true, description: 'Reusable star-versus-planet atmosphere comparison rig' },
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
