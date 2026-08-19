import * as THREE from 'three';
import type { SceneCompositionLayerFactory } from '@mindforge/engine';
import {
  createFogLayerFactory,
  createMistLayerFactory,
  createRainLayerFactory,
} from '../shared/weather-layer-runtime';
import { plastic } from './toybox-style';

const rainMaterial = (color: THREE.ColorRepresentation, opacity: number) =>
  plastic(new THREE.Color(color).getStyle(), {
    transparent: true,
    opacity,
    roughness: 0.2,
    clearcoat: 0.46,
    clearcoatRoughness: 0.18,
    depthWrite: false,
  });

const rainGeometry = (thickness: number): THREE.BufferGeometry =>
  new THREE.CylinderGeometry(thickness * 0.72, thickness, 1, 6, 1);

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

const createToyboxRain = createRainLayerFactory({
  name: 'toybox.rain',
  color: '#BFE8FA',
  flashColor: '#FFFFFF',
  defaultIntensity: 0.5,
  defaultWind: 0.1,
  baseOpacity: 0.3,
  maxCount: 190,
  radius: 17,
  height: 18,
  centerZ: -5,
  thickness: 0.036,
  length: [0.5, 0.9],
  speed: [6.9, 9.4],
  baseSlant: -0.055,
  material: rainMaterial,
  geometry: rainGeometry,
});

const createToyboxHeavyRain = createRainLayerFactory({
  name: 'toybox.heavyRain',
  color: '#C7ECFA',
  flashColor: '#FFFFFF',
  defaultIntensity: 0.86,
  defaultWind: 0.2,
  baseOpacity: 0.38,
  maxCount: 320,
  radius: 21,
  height: 20,
  centerZ: -6,
  thickness: 0.043,
  length: [0.7, 1.2],
  speed: [8.4, 12.0],
  baseSlant: -0.08,
  material: rainMaterial,
  geometry: rainGeometry,
});

const createToyboxMist = createMistLayerFactory({
  name: 'toybox.mist',
  color: '#C5DDE7',
  flashColor: '#FFFFFF',
  defaultDensity: 0.4,
  defaultDrift: 0.38,
  centerZ: -11,
  planes: [
    { width: 32, height: 4.0, y: 1.8, zOffset: -5, opacity: 0.075, drift: 0.7 },
    { width: 43, height: 5.6, y: 2.9, zOffset: -13, opacity: 0.095, drift: 1.0 },
    { width: 54, height: 7.2, y: 4.1, zOffset: -22, opacity: 0.11, drift: 1.3 },
  ],
  material: mistMaterial,
});

const createToyboxFog = createFogLayerFactory({
  name: 'toybox.fog',
  color: '#AFC9D5',
  flashColor: '#F6FCFF',
  defaultDensity: 0.36,
  densityRange: [0.0028, 0.019],
});

export const TOYBOX_SCENE_LAYER_FACTORIES: Readonly<Record<string, SceneCompositionLayerFactory>> = {
  'layer.weather.rain': createToyboxRain,
  'layer.weather.heavyRain': createToyboxHeavyRain,
  'layer.atmosphere.mist': createToyboxMist,
  'layer.atmosphere.fog': createToyboxFog,
};
