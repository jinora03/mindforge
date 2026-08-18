import { createProductionEffectFactories, type ProductionEffectStyle } from '@mindforge/effects';

export const VOXEL_PB3_EFFECT_STYLE: ProductionEffectStyle = {
  beamCore: '#FFF7D9',
  beamHalo: '#FFE9A8',
  refractionCore: '#F2FCFF',
  refractionHalo: '#8FE7FF',
  spectrum: ['#F04F55', '#F28A45', '#F1D352', '#5BC66F', '#4E8CE6', '#8B67DB'],
  rain: '#BDEEFF',
  reveal: '#FFF0B7',
  rainbow: ['#F05A60', '#F28C49', '#F0D45A', '#61C873', '#538FE3', '#8C6ADE'],
  radialSegments: 6,
  haloScale: 2.6,
};

export const VOXEL_PB3_EFFECT_FACTORIES = createProductionEffectFactories(VOXEL_PB3_EFFECT_STYLE);
