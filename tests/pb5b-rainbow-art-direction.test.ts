import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import {
  EffectInfluenceBus,
  type RuntimeAssetAccess,
  type SceneServices,
} from '@mindforge/engine';
import { getTheme, VOXEL_PRODUCTION_BASELINE } from '@mindforge/themes';

const root = fileURLToPath(new URL('..', import.meta.url));
const episode = JSON.parse(
  readFileSync(`${root}/content/episodes/artifact-015-rainbow/episode.json`, 'utf8'),
) as Record<string, unknown>;

const unavailableAssets: RuntimeAssetAccess = {
  has: () => false,
  instantiateModel(id: string) {
    throw new Error(`unexpected asset request: ${id}`);
  },
};

function services(scene: THREE.Scene): SceneServices {
  return {
    scene,
    camera: new THREE.PerspectiveCamera(42, 9 / 16, 0.1, 200),
    duration: 17.6,
    assets: unavailableAssets,
    effectInfluences: new EffectInfluenceBus(),
    getEntity(id: string): never {
      throw new Error(`unexpected entity request: ${id}`);
    },
    tryGetEntity: () => undefined,
    resolveAnchor(ref: string): never {
      throw new Error(`unexpected anchor request: ${ref}`);
    },
    tryResolveAnchor: () => undefined,
  };
}

describe('PB5B Rainbow art direction', () => {
  it('keeps the reusable production baseline but replaces random meadow staging with a framed diorama', () => {
    const layers = episode.layers as Array<Record<string, unknown>>;
    const factories = layers.map((layer) => layer.factory);
    expect(factories).toContain('layer.setDressing.dioramaFrame');
    expect(factories).not.toContain('layer.setDressing.nature');
    expect(VOXEL_PRODUCTION_BASELINE.sceneLayers).toContain('layer.setDressing.dioramaFrame');
    expect(getTheme('voxel').sceneLayers['layer.setDressing.dioramaFrame']).toBeDefined();
  });

  it('locks the contrast hierarchy instead of returning to the washed-out PB5A meadow', () => {
    const layers = episode.layers as Array<Record<string, unknown>>;
    const byId = new Map(layers.map((layer) => [layer.id, layer]));
    expect(byId.get('clouds')?.parameters).toMatchObject({ count: 3, y: 10.6, maxScale: 1.25 });
    expect(byId.get('mist')?.parameters).toMatchObject({ density: 0.035 });
    expect(byId.get('fog')?.parameters).toMatchObject({ density: 0.015 });
    expect(byId.get('rain')?.parameters).toMatchObject({ intensity: 0.3 });
    expect(byId.get('daylight')?.parameters).toMatchObject({ intensityScale: 0.52 });
  });

  it('uses selective story lights and a smaller authored hero instead of making the whole world glow', () => {
    const entities = episode.entities as Array<Record<string, unknown>>;
    expect(entities).toContainEqual(expect.objectContaining({ id: 'prism', scale: 1.02 }));
    expect(entities).toContainEqual(expect.objectContaining({ id: 'heroLight', factory: 'prefab.storyLight' }));
    expect(entities).toContainEqual(expect.objectContaining({ id: 'revealLight', factory: 'prefab.storyLight' }));
    const timeline = episode.timeline as Array<Record<string, unknown>>;
    expect(timeline).toContainEqual(expect.objectContaining({ id: 'hero-light-dim', target: 'heroLight' }));
    expect(timeline).toContainEqual(expect.objectContaining({ id: 'reveal-light-rise', target: 'revealLight' }));
  });

  it('makes beam and spectrum effects block-segmented reusable Voxel effects', () => {
    const theme = getTheme('voxel');
    const scene = new THREE.Scene();
    const source = new THREE.Object3D();
    const target = new THREE.Object3D();
    source.position.set(-2, 1, 0);
    target.position.set(2, 1, 0);
    scene.add(source, target);
    scene.updateMatrixWorld(true);
    const svc = services(scene);
    const routed: SceneServices = {
      ...svc,
      resolveAnchor(ref) {
        if (ref === 'source') return source;
        if (ref === 'target') return target;
        throw new Error(`missing ${ref}`);
      },
      tryResolveAnchor(ref) {
        return ref === 'source' ? source : ref === 'target' ? target : undefined;
      },
    };
    const beam = theme.effects['effect.light.beam']({
      event: { id: 'beam', type: 'effect', at: 0, duration: 1, effect: 'effect.light.beam', from: 'source', to: 'target' },
      services: routed,
      seed: 11,
    });
    const core = beam.object3d.getObjectByName('pb6.voxelLightBeam.core');
    expect(core).toBeInstanceOf(THREE.InstancedMesh);
    expect((core as THREE.InstancedMesh).count).toBe(8);
    beam.dispose();
  });

  it('makes the final rainbow the dominant payoff rather than a faint background decoration', () => {
    const timeline = episode.timeline as Array<Record<string, unknown>>;
    const byId = new Map(timeline.map((event) => [event.id, event]));
    expect(byId.get('rainbow-payoff')).toMatchObject({
      intensity: 1,
      parameters: { radius: 6.2, heightScale: 1.02, thickness: 0.16, bandGap: 0.22 },
    });
    expect(byId.get('cam-answer')).toMatchObject({
      fov: 50,
      parameters: { radius: 24.5, height: 6.0 },
    });
  });
});
