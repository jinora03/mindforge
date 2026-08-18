import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import {
  SceneRuntime,
  type EffectFactory,
  type EffectInstance,
} from '@mindforge/engine';
import { createLibraryForTheme } from '@mindforge/library';

const layeredWeatherEpisode = {
  schemaVersion: '0.1',
  id: 'pf5-weather-runtime-test',
  title: 'PF5 Weather Runtime Test',
  duration: 8,
  environment: 'environment.dreamGarden',
  layers: [
    {
      id: 'rain',
      factory: 'layer.weather.heavyRain',
      role: 'weather',
      parameters: { intensity: 0.72, wind: -0.25 },
    },
    {
      id: 'mist',
      factory: 'layer.atmosphere.mist',
      role: 'atmosphere',
      parameters: { density: 0.55, drift: 0.6 },
    },
    {
      id: 'fog',
      factory: 'layer.atmosphere.fog',
      role: 'atmosphere',
      parameters: { density: 0.48 },
    },
  ],
  entities: [],
  timeline: [],
};

function matrixAt(mesh: THREE.InstancedMesh, index: number): number[] {
  const matrix = new THREE.Matrix4();
  mesh.getMatrixAt(index, matrix);
  return matrix.toArray();
}

function findInstanced(scene: THREE.Scene, name: string): THREE.InstancedMesh {
  const object = scene.getObjectByName(name);
  if (!(object instanceof THREE.InstancedMesh)) {
    throw new Error(`Expected InstancedMesh "${name}"`);
  }
  return object;
}

function findMesh(scene: THREE.Scene, name: string): THREE.Mesh {
  const object = scene.getObjectByName(name);
  if (!(object instanceof THREE.Mesh)) {
    throw new Error(`Expected Mesh "${name}"`);
  }
  return object;
}

describe('PF5 weather and atmosphere layers', () => {
  it.each(['voxel', 'toybox'])('registers the same reusable semantic weather surface for %s', (themeId) => {
    const library = createLibraryForTheme(themeId);
    expect(library.sceneLayers.has('layer.weather.rain')).toBe(true);
    expect(library.sceneLayers.has('layer.weather.heavyRain')).toBe(true);
    expect(library.sceneLayers.has('layer.atmosphere.mist')).toBe(true);
    expect(library.sceneLayers.has('layer.atmosphere.fog')).toBe(true);
  });

  it('reconstructs rain, mist, and fog from the same absolute timestamp after seeking', () => {
    const runtime = new SceneRuntime();
    runtime.load(layeredWeatherEpisode, createLibraryForTheme('voxel'));

    const rain = findInstanced(runtime.scene, 'voxel.heavyRain.streaks');
    const mist = findMesh(runtime.scene, 'voxel.mist.plane.0');

    runtime.evaluateAt(2.75);
    const first = {
      rainMatrix: matrixAt(rain, 0),
      rainCount: rain.count,
      mistX: mist.position.x,
      fogDensity: runtime.scene.fog instanceof THREE.FogExp2 ? runtime.scene.fog.density : undefined,
      fogColor: runtime.scene.fog?.color.getHexString(),
    };

    runtime.evaluateAt(6.4);
    runtime.evaluateAt(2.75);

    expect({
      rainMatrix: matrixAt(rain, 0),
      rainCount: rain.count,
      mistX: mist.position.x,
      fogDensity: runtime.scene.fog instanceof THREE.FogExp2 ? runtime.scene.fog.density : undefined,
      fogColor: runtime.scene.fog?.color.getHexString(),
    }).toEqual(first);

    runtime.dispose();
  });

  it('lets PF4 influences brighten/scatter weather and alter wind on the same frame', () => {
    const episode = {
      ...layeredWeatherEpisode,
      id: 'pf5-influence-response-test',
      timeline: [
        {
          id: 'storm-flash',
          type: 'effect',
          at: 1,
          duration: 2,
          effect: 'effect.test.weatherInfluence',
        },
      ],
    };
    const library = createLibraryForTheme('voxel');
    const effectFactory: EffectFactory = (): EffectInstance => ({
      object3d: new THREE.Group(),
      update(): void {},
      contributeInfluence(ctx, sink): void {
        if (!ctx.active) return;
        sink.contribute('environmentLight', 0.8);
        sink.contribute('emissiveBoost', 0.5);
        sink.contribute('fogScattering', 0.75);
        sink.contribute('windImpulse', 0.6);
      },
      reset(): void {},
      dispose(): void {},
    });
    library.effects.register('effect.test.weatherInfluence', effectFactory);

    const runtime = new SceneRuntime();
    runtime.load(episode, library);
    const rain = findInstanced(runtime.scene, 'voxel.heavyRain.streaks');
    const rainMaterial = rain.material as THREE.MeshStandardMaterial;
    const mist = findMesh(runtime.scene, 'voxel.mist.plane.0');
    const mistMaterial = mist.material as THREE.MeshBasicMaterial;

    runtime.setLayerEnabled('effects', false);
    runtime.evaluateAt(2);
    const baseline = {
      rainMatrix: matrixAt(rain, 0),
      rainColor: rainMaterial.color.getHexString(),
      rainOpacity: rainMaterial.opacity,
      mistOpacity: mistMaterial.opacity,
      fogColor: runtime.scene.fog?.color.getHexString(),
    };

    runtime.setLayerEnabled('effects', true);
    runtime.evaluateAt(2);
    expect(runtime.getEffectInfluences()?.environmentLight).toBe(0.8);
    expect(runtime.getEffectInfluences()?.fogScattering).toBe(0.75);
    expect(matrixAt(rain, 0)).not.toEqual(baseline.rainMatrix);
    expect(rainMaterial.color.getHexString()).not.toBe(baseline.rainColor);
    expect(rainMaterial.opacity).toBeGreaterThan(baseline.rainOpacity);
    expect(mistMaterial.opacity).toBeGreaterThan(baseline.mistOpacity);
    expect(runtime.scene.fog?.color.getHexString()).not.toBe(baseline.fogColor);

    runtime.setLayerEnabled('effects', false);
    runtime.evaluateAt(2);
    expect(matrixAt(rain, 0)).toEqual(baseline.rainMatrix);
    expect(rainMaterial.color.getHexString()).toBe(baseline.rainColor);
    expect(rainMaterial.opacity).toBeCloseTo(baseline.rainOpacity);
    expect(mistMaterial.opacity).toBeCloseTo(baseline.mistOpacity);
    expect(runtime.scene.fog?.color.getHexString()).toBe(baseline.fogColor);

    runtime.dispose();
  });

  it('keeps theme styling independent over the same semantic rain declaration', () => {
    const voxel = new SceneRuntime();
    voxel.load(layeredWeatherEpisode, createLibraryForTheme('voxel'));
    const voxelRain = findInstanced(voxel.scene, 'voxel.heavyRain.streaks');

    const toybox = new SceneRuntime();
    toybox.load(layeredWeatherEpisode, createLibraryForTheme('toybox'));
    const toyboxRain = findInstanced(toybox.scene, 'toybox.heavyRain.streaks');

    expect(voxelRain.geometry.type).toBe('BoxGeometry');
    expect(toyboxRain.geometry.type).toBe('CylinderGeometry');
    expect(voxelRain.material).not.toBe(toyboxRain.material);

    voxel.dispose();
    toybox.dispose();
  });
});
