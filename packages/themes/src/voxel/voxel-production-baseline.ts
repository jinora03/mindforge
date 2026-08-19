/**
 * Canonical reusable production baseline for the Voxel theme.
 *
 * Artifact 001 (Heat) and Artifact 004 (Cold Battery) are the visual reference
 * episodes: orthogonal block construction, crisp nearest-filtered textures,
 * readable diorama staging and selective emissive accents for active systems.
 * This metadata is theme-owned and intentionally has no Engine behavior.
 */
export const VOXEL_PRODUCTION_BASELINE = {
  id: 'voxel-block-game-v1',
  referenceEpisodes: ['artifact-001-heat', 'artifact-004-cold-battery'],
  environments: [
    'environment.artifactStage',
    'environment.cosmicVoid',
    'environment.compositionStage',
  ],
  prefabs: [
    'prefab.heatEngine',
    'prefab.informationShard',
    'prefab.storyLight',
    'prefab.prismDrop',
    'prefab.rainDropletField',
  ],
  sceneLayers: [
    'layer.surface.ground',
    'layer.surface.puddles',
    'layer.setDressing.nature',
    'layer.setDressing.dioramaFrame',
    'layer.setDressing.groundCover',
    'layer.world.clouds',
    'layer.foreground.nature',
    'layer.lighting.daylight',
    'layer.utility.productionMaterials',
  ],
  effects: [
    'effect.light.beam',
    'effect.light.refraction',
    'effect.light.spectrum',
    'effect.weather.rainImpact',
    'effect.reveal.atmospheric',
    'effect.optics.rainbowArc',
  ],
  assetPacks: ['pack.voxel.nature-production', 'pack.voxel.optics-production'],
  style: {
    geometry: 'orthogonal-block-first',
    textures: 'nearest-filtered-16x16',
    lighting: 'readable-diorama',
    composition: 'framed-hero-diorama',
    emissive: 'semantic-accents-only',
    optics: 'segmented-block-light-no-transmission',
  },
} as const;
