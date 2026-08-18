import type { AssetDescriptor, AssetPackDescriptor } from '@mindforge/engine';
import type { MindForgeTheme } from './ThemeTypes';
import { TOYBOX_CHARACTER_FACTORIES } from './toybox/ToyboxCharacter';
import { TOYBOX_EFFECT_FACTORIES } from './toybox/toybox-effects';
import { TOYBOX_ENVIRONMENT_FACTORIES } from './toybox/toybox-environments';
import { TOYBOX_PREFAB_FACTORIES } from './toybox/toybox-prefabs';
import { TOYBOX_PRESENTATION } from './toybox/toybox-style';
import { TOYBOX_SCENE_LAYER_FACTORIES } from './toybox/toybox-scene-layers';

export { TOYBOX_PALETTE, toyboxToneColor, plastic, toyMetal } from './toybox/toybox-style';

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
  { id: 'model.prop.prismDrop', kind: 'model', procedural: true, description: 'Production optical rig with refraction, internal reflection and dispersion anchors' },
  { id: 'model.prop.rainDropletField', kind: 'model', procedural: true, description: 'Reusable many-raindrop field for optics scale-up shots' },
  { id: 'model.prop.rainbowArc', kind: 'model', procedural: true, description: 'Reusable landscape-scale spectral arc payoff' },
  { id: 'model.prop.moonPair', kind: 'model', procedural: true, description: 'Reusable equal-size Moon perception comparison rig' },
  { id: 'model.prop.starPlanetPair', kind: 'model', procedural: true, description: 'Reusable star-versus-planet atmosphere comparison rig' },
];

export const TOYBOX_ASSET_PACKS: AssetPackDescriptor[] = [
  {
    id: 'pack.toybox.core-fallback',
    label: 'Toybox Core Fallback',
    maturity: 'fallback',
    description:
      'Current procedural core assets kept as deterministic fallbacks while authored production replacements are onboarded.',
    assetIds: [
      'model.character.observer',
      'model.character.externalHand',
      'model.machine.heatEngine',
      'model.prop.cube',
      'model.prop.lever',
      'model.prop.door',
      'model.environment.laboratory',
    ],
    tags: ['core', 'fallback'],
  },
  {
    id: 'pack.toybox.experiments-fallback',
    label: 'Toybox Experiment Fallbacks',
    maturity: 'fallback',
    description:
      'Reusable experiment props and rooms awaiting authored production-model replacements.',
    assetIds: [
      'model.prop.materialSamples',
      'model.prop.balloon',
      'model.prop.demoPanel',
      'model.prop.floatTank',
      'model.prop.bowlSpoon',
      'model.environment.materialLab',
      'model.environment.classroomLab',
      'model.environment.kitchenLab',
      'model.environment.vehicleCabin',
      'model.environment.dropLab',
      'model.prop.seatRig',
      'model.prop.featherRock',
      'model.prop.paperPlane',
      'model.prop.magnetKit',
    ],
    tags: ['science', 'props', 'fallback'],
  },
  {
    id: 'pack.toybox.worlds-fallback',
    label: 'Toybox World Fallbacks',
    maturity: 'fallback',
    description:
      'Current procedural world and hero assets to replace pack-by-pack with inspected authored models.',
    assetIds: [
      'model.environment.canyon',
      'model.environment.rainMeadow',
      'model.environment.nightOverlook',
      'model.environment.observatory',
      'model.prop.soundRig',
      'model.prop.prismDrop',
      'model.prop.rainDropletField',
      'model.prop.rainbowArc',
      'model.prop.moonPair',
      'model.prop.starPlanetPair',
    ],
    tags: ['world', 'hero', 'fallback'],
  },
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
  sceneLayers: TOYBOX_SCENE_LAYER_FACTORIES,
  assets: TOYBOX_ASSETS,
  assetPacks: TOYBOX_ASSET_PACKS,
  presentation: TOYBOX_PRESENTATION,
};

export { TOYBOX_SCENE_LAYER_FACTORIES };
