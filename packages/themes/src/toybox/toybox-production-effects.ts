import { createProductionEffectFactories, type ProductionEffectStyle } from '@mindforge/effects';

/**
 * Theme-parity PB3 vocabulary. Toybox keeps smoother/rounder geometry and a
 * softer palette; the current flagship production target remains Voxel.
 */
export const TOYBOX_PB3_EFFECT_STYLE: ProductionEffectStyle = {
  beamCore: '#FFF4D2',
  beamHalo: '#FFDFA4',
  refractionCore: '#F4FDFF',
  refractionHalo: '#A9E7F5',
  spectrum: ['#EC6670', '#F29B5C', '#F0D66E', '#72C982', '#6697DD', '#9176D1'],
  rain: '#C5EDF7',
  reveal: '#FFE8B0',
  rainbow: ['#EC6870', '#F19A59', '#EED46C', '#73C982', '#6596DB', '#9277D0'],
  radialSegments: 12,
  haloScale: 2.9,
};

export const TOYBOX_PB3_EFFECT_FACTORIES = createProductionEffectFactories(TOYBOX_PB3_EFFECT_STYLE);
