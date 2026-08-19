import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import {
  SceneRuntime,
  type EffectFactory,
  type EffectInstance,
  type RuntimeAssetAccess,
} from '@mindforge/engine';
import { createDeterministicScatterLayerFactory } from '@mindforge/environments';
import { createLibraryForTheme } from '@mindforge/library';

const composedNatureEpisode = {
  schemaVersion: '0.1',
  id: 'pf6-composed-nature-test',
  title: 'PF6 Composed Nature Test',
  duration: 8,
  environment: 'environment.compositionStage',
  layers: [
    {
      id: 'ground',
      factory: 'layer.surface.ground',
      role: 'surface',
      parameters: { width: 36, depth: 44, centerZ: -8 },
    },
    {
      id: 'nature',
      factory: 'layer.setDressing.nature',
      role: 'setDressing',
      parameters: { count: 18, clearRadius: 5.5 },
    },
    {
      id: 'foreground',
      factory: 'layer.foreground.nature',
      role: 'foreground',
      parameters: { count: 4 },
    },
    {
      id: 'daylight',
      factory: 'layer.lighting.daylight',
      role: 'lighting',
    },
    {
      id: 'fog',
      factory: 'layer.atmosphere.fog',
      role: 'atmosphere',
      parameters: { density: 0.24 },
    },
  ],
  entities: [],
  timeline: [],
};

function findGroup(scene: THREE.Scene, prefix: string): THREE.Group {
  let result: THREE.Group | undefined;
  scene.traverse((object) => {
    if (!result && object instanceof THREE.Group && object.name.startsWith(prefix)) result = object;
  });
  if (!result) throw new Error(`Expected group starting with "${prefix}"`);
  return result;
}

function compositionTransforms(group: THREE.Group): number[][] {
  return group.children.map((child) => [
    child.position.x,
    child.position.y,
    child.position.z,
    child.rotation.y,
    child.scale.x,
    child.scale.y,
    child.scale.z,
  ]);
}

describe('PF6 production environment composition', () => {
  it.each(['voxel', 'toybox'])('registers the same semantic composition surface for %s', (themeId) => {
    const library = createLibraryForTheme(themeId);
    expect(library.environments.has('environment.compositionStage')).toBe(true);
    expect(library.sceneLayers.has('layer.surface.ground')).toBe(true);
    expect(library.sceneLayers.has('layer.setDressing.nature')).toBe(true);
    expect(library.sceneLayers.has('layer.foreground.nature')).toBe(true);
    expect(library.sceneLayers.has('layer.lighting.daylight')).toBe(true);
  });

  it('rebuilds deterministic dressing from episode id + local layer id and keeps the hero stage clear', () => {
    const first = new SceneRuntime();
    first.load(composedNatureEpisode, createLibraryForTheme('voxel'));
    const firstNature = findGroup(first.scene, 'mindforge-composition:voxel.nature:nature');
    const firstTransforms = compositionTransforms(firstNature);

    first.evaluateAt(6.25);
    first.evaluateAt(1.75);
    expect(compositionTransforms(firstNature)).toEqual(firstTransforms);

    for (const child of firstNature.children) {
      expect(Math.hypot(child.position.x, child.position.z)).toBeGreaterThanOrEqual(5.5);
      expect(child.userData.mindforgeCompositionSource).toBe('fallback');
    }

    const second = new SceneRuntime();
    second.load(composedNatureEpisode, createLibraryForTheme('voxel'));
    const secondNature = findGroup(second.scene, 'mindforge-composition:voxel.nature:nature');
    expect(compositionTransforms(secondNature)).toEqual(firstTransforms);

    first.dispose();
    second.dispose();
  });

  it('uses independent theme presentation over the same composition semantics', () => {
    const voxel = new SceneRuntime();
    voxel.load(composedNatureEpisode, createLibraryForTheme('voxel'));
    const voxelGround = voxel.scene.getObjectByName('voxel.ground.surface') as THREE.Mesh | undefined;
    const voxelNature = findGroup(voxel.scene, 'mindforge-composition:voxel.nature:nature');

    const toybox = new SceneRuntime();
    toybox.load(composedNatureEpisode, createLibraryForTheme('toybox'));
    const toyboxGround = toybox.scene.getObjectByName('toybox.ground.surface') as THREE.Mesh | undefined;
    const toyboxNature = findGroup(toybox.scene, 'mindforge-composition:toybox.nature:nature');

    expect(voxelGround?.geometry.type).toBe('BoxGeometry');
    expect(toyboxGround?.geometry.type).toBe('BoxGeometry');
    expect(voxelGround?.material).not.toBe(toyboxGround?.material);
    expect(voxelNature.children[0]?.name).not.toBe(toyboxNature.children[0]?.name);

    voxel.dispose();
    toybox.dispose();
  });

  it('instantiates PF2 authored models when a composition variant is available and otherwise marks its fallback', () => {
    const library = createLibraryForTheme('voxel');
    library.sceneLayers.register(
      'layer.test.productionScatter',
      createDeterministicScatterLayerFactory({
        name: 'test.productionScatter',
        placement: 'field',
        defaultCount: 3,
        defaultHalfWidth: 8,
        defaultNearZ: -5,
        defaultFarZ: -10,
        defaultClearRadius: 2,
        defaultMinScale: 1,
        defaultMaxScale: 1,
        variants: [
          {
            id: 'tree',
            assetId: 'model.nature.tree.reference',
            createFallback: () => {
              const fallback = new THREE.Group();
              fallback.name = 'fallback-tree';
              return fallback;
            },
          },
        ],
      }),
    );

    let instantiated = 0;
    const assets: RuntimeAssetAccess = {
      has: (id) => id === 'model.nature.tree.reference',
      instantiateModel(id) {
        instantiated++;
        const object3d = new THREE.Group();
        object3d.name = `authored:${id}`;
        return { object3d, anchors: {}, animations: [], clips: {} };
      },
    };

    const runtime = new SceneRuntime();
    runtime.load(
      {
        ...composedNatureEpisode,
        id: 'pf6-authored-bridge-test',
        environment: 'environment.compositionStage',
        layers: [
          {
            id: 'authored',
            factory: 'layer.test.productionScatter',
            role: 'setDressing',
          },
        ],
      },
      library,
      assets,
    );

    const group = findGroup(runtime.scene, 'mindforge-composition:test.productionScatter:authored');
    expect(instantiated).toBe(3);
    expect(group.children).toHaveLength(3);
    for (const child of group.children) {
      expect(child.userData.mindforgeCompositionSource).toBe('authored');
      expect(child.userData.mindforgeAssetId).toBe('model.nature.tree.reference');
    }

    runtime.dispose();
  });

  it('lets PF4 environment light drive PF6 daylight on the same absolute frame', () => {
    const library = createLibraryForTheme('voxel');
    const effectFactory: EffectFactory = (): EffectInstance => ({
      object3d: new THREE.Group(),
      update(): void {},
      contributeInfluence(ctx, sink): void {
        if (ctx.active) sink.contribute('environmentLight', 0.8);
      },
      reset(): void {},
      dispose(): void {},
    });
    library.effects.register('effect.test.compositionLight', effectFactory);

    const runtime = new SceneRuntime();
    runtime.load(
      {
        ...composedNatureEpisode,
        id: 'pf6-light-response-test',
        timeline: [
          {
            id: 'flash',
            type: 'effect',
            at: 1,
            duration: 2,
            effect: 'effect.test.compositionLight',
          },
        ],
      },
      library,
    );

    const lighting = findGroup(runtime.scene, 'mindforge-composition:voxel.daylight:daylight');
    const key = lighting.children[0]?.children.find((child) => child instanceof THREE.DirectionalLight) as THREE.DirectionalLight | undefined;
    if (!key) throw new Error('Expected PF6 daylight directional light');

    runtime.setLayerEnabled('effects', false);
    runtime.evaluateAt(2);
    const baseline = key.intensity;

    runtime.setLayerEnabled('effects', true);
    runtime.evaluateAt(2);
    expect(key.intensity).toBeGreaterThan(baseline);

    runtime.setLayerEnabled('effects', false);
    runtime.evaluateAt(2);
    expect(key.intensity).toBeCloseTo(baseline);

    runtime.dispose();
  });
});
