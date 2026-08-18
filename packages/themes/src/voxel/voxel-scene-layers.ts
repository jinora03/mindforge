import * as THREE from 'three';
import type { SceneCompositionLayerFactory } from '@mindforge/engine';
import {
  createFogLayerFactory,
  createMistLayerFactory,
  createRainLayerFactory,
} from '../shared/weather-layer-runtime';
import { createVoxelMaterial } from './voxel-style';
import {
  createVoxelProductionMaterialLayer,
  VOXEL_PB2_MATERIAL_LAYER_ID,
} from './voxel-production-materials';

const rainMaterial = (color: THREE.ColorRepresentation, opacity: number) =>
  createVoxelMaterial(new THREE.Color(color).getStyle(), {
    pixelVariation: 0,
    transparent: true,
    opacity,
    roughness: 0.12,
    depthWrite: false,
  });

const rainGeometry = (thickness: number): THREE.BufferGeometry =>
  new THREE.BoxGeometry(thickness, 1, thickness);

const mistMaterial = (color: THREE.ColorRepresentation, opacity: number) =>
  new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: false,
    toneMapped: true,
  });

const createVoxelRain = createRainLayerFactory({
  name: 'voxel.rain',
  color: '#C5E6F0',
  flashColor: '#F4FBFF',
  defaultIntensity: 0.52,
  defaultWind: 0.12,
  baseOpacity: 0.32,
  maxCount: 220,
  radius: 18,
  height: 19,
  centerZ: -6,
  thickness: 0.024,
  length: [0.58, 1.0],
  speed: [7.4, 10.1],
  baseSlant: -0.07,
  material: rainMaterial,
  geometry: rainGeometry,
});

const createVoxelHeavyRain = createRainLayerFactory({
  name: 'voxel.heavyRain',
  color: '#C9EAF4',
  flashColor: '#FFFFFF',
  defaultIntensity: 0.88,
  defaultWind: 0.22,
  baseOpacity: 0.4,
  maxCount: 360,
  radius: 22,
  height: 21,
  centerZ: -7,
  thickness: 0.029,
  length: [0.78, 1.34],
  speed: [9.0, 13.0],
  baseSlant: -0.09,
  material: rainMaterial,
  geometry: rainGeometry,
});

const createVoxelMist = createMistLayerFactory({
  name: 'voxel.mist',
  color: '#9EB2B9',
  flashColor: '#EEF7FA',
  defaultDensity: 0.46,
  defaultDrift: 0.45,
  centerZ: -12,
  planes: [
    { width: 34, height: 4.6, y: 2.0, zOffset: -5, opacity: 0.09, drift: 0.8 },
    { width: 46, height: 6.2, y: 3.1, zOffset: -14, opacity: 0.11, drift: 1.15 },
    { width: 58, height: 8.0, y: 4.4, zOffset: -24, opacity: 0.13, drift: 1.45 },
  ],
  material: mistMaterial,
});

const createVoxelFog = createFogLayerFactory({
  name: 'voxel.fog',
  color: '#718994',
  flashColor: '#DDECF0',
  defaultDensity: 0.42,
  densityRange: [0.0035, 0.024],
});

/** Same semantic layer ids are implemented by every supported visual theme. */
export const VOXEL_SCENE_LAYER_FACTORIES: Readonly<Record<string, SceneCompositionLayerFactory>> = {
  'layer.weather.rain': createVoxelRain,
  'layer.weather.heavyRain': createVoxelHeavyRain,
  'layer.atmosphere.mist': createVoxelMist,
  'layer.atmosphere.fog': createVoxelFog,
  [VOXEL_PB2_MATERIAL_LAYER_ID]: createVoxelProductionMaterialLayer,
};
