import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import {
  EntityManager,
  SceneContext,
  SceneRuntime,
  type RuntimeAssetAccess,
} from '@mindforge/engine';
import { createLibraryForTheme } from '@mindforge/library';
import { getTheme } from '@mindforge/themes';
import { loadEpisodeInput } from './helpers/content';

const root = fileURLToPath(new URL('..', import.meta.url));
const episode = JSON.parse(
  readFileSync(`${root}/content/episodes/artifact-015-rainbow/episode.json`, 'utf8'),
) as Record<string, unknown>;

const EXPECTED_PRODUCTION_LAYERS = [
  'layer.world.clouds',
  'layer.surface.ground',
  'layer.surface.puddles',
  'layer.setDressing.nature',
  'layer.setDressing.groundCover',
  'layer.atmosphere.mist',
  'layer.atmosphere.fog',
  'layer.weather.heavyRain',
  'layer.lighting.daylight',
  'layer.foreground.nature',
  'layer.utility.productionMaterials',
] as const;

function productionOpticsRuntime(instantiated: string[]): RuntimeAssetAccess {
  const ids = new Set([
    'model.prop.prismDrop.production',
    'model.prop.rainDropletSmall.production',
  ]);
  return {
    has: (id) => ids.has(id),
    instantiateModel(id) {
      instantiated.push(id);
      const object3d = new THREE.Group();
      object3d.name = `pb5-authored:${id}`;
      const anchors: Record<string, THREE.Object3D> = {};
      if (id === 'model.prop.prismDrop.production') {
        for (const name of ['center', 'input', 'bend', 'reflect', 'exit', 'red', 'orange', 'yellow', 'green', 'blue', 'violet']) {
          const anchor = new THREE.Object3D();
          anchor.name = name;
          object3d.add(anchor);
          anchors[name] = anchor;
        }
      }
      return { object3d, anchors, animations: [], clips: {} };
    },
  };
}

describe('PB5 Rainbow 2.0 assembly', () => {
  it('rebuilds Artifact 015 on the reusable PB4 production meadow instead of the old monolithic rain environment', () => {
    expect(episode.environment).toBe('environment.compositionStage');
    expect(episode.duration).toBe(17.6);
    expect((episode.layers as Array<Record<string, unknown>>).map((layer) => layer.factory)).toEqual(
      EXPECTED_PRODUCTION_LAYERS,
    );
    expect((episode.layers as Array<Record<string, unknown>>).find((layer) => layer.factory === 'layer.utility.productionMaterials')?.parameters)
      .toMatchObject({ wetness: 0.88 });
  });

  it('uses PB3 layered optics and world reveal instead of property-driven debug beams and the old visible rainbow prefab', () => {
    const entities = episode.entities as Array<Record<string, unknown>>;
    const timeline = episode.timeline as Array<Record<string, unknown>>;
    const effects = new Set(timeline.filter((event) => event.type === 'effect').map((event) => event.effect));

    expect(entities).toContainEqual(expect.objectContaining({ id: 'prism', factory: 'prefab.prismDrop' }));
    expect(entities).toContainEqual(expect.objectContaining({ id: 'droplets', factory: 'prefab.rainDropletField' }));
    expect(entities.some((entity) => entity.factory === 'prefab.rainbowArc')).toBe(false);
    for (const id of [
      'effect.light.beam',
      'effect.light.refraction',
      'effect.light.spectrum',
      'effect.reveal.atmospheric',
      'effect.optics.rainbowArc',
    ]) expect(effects.has(id), id).toBe(true);
    expect(timeline.some((event) => typeof event.target === 'string' && /prism\.(entryBeam|refractBeam|reflectionBeam|exitBeam)/.test(event.target))).toBe(false);
    expect(timeline.some((event) => typeof event.target === 'string' && /^prism\.(red|orange|yellow|green|blue|violet)$/.test(event.target))).toBe(false);
  });

  it('prefers the PB1 authored hero droplet and authored small-droplet field when production assets are available', () => {
    const instantiated: string[] = [];
    const services = new SceneContext(
      new THREE.Scene(),
      new THREE.PerspectiveCamera(48, 9 / 16, 0.1, 200),
      17.6,
      new EntityManager(),
      'pb5-authored-optics',
      productionOpticsRuntime(instantiated),
    );
    const theme = getTheme('voxel');
    const heroFactory = theme.prefabs['prefab.prismDrop'];
    const fieldFactory = theme.prefabs['prefab.rainDropletField'];
    if (!heroFactory || !fieldFactory) throw new Error('Missing PB5 optical prefab surface');

    const hero = heroFactory({ id: 'hero', parameters: {}, services });
    const field = fieldFactory({ id: 'field', parameters: {}, services });

    expect(hero.object3d.userData.mindforgeCompositionSource).toBe('authored');
    expect(hero.object3d.userData.mindforgeAssetId).toBe('model.prop.prismDrop.production');
    expect(Object.keys(hero.anchors ?? {}).sort()).toEqual([
      'bend', 'blue', 'center', 'exit', 'green', 'input', 'orange', 'red', 'reflect', 'violet', 'yellow',
    ]);
    expect(field.object3d.children).toHaveLength(18);
    expect(field.object3d.children.every((child) => child.userData.mindforgeCompositionSource === 'authored')).toBe(true);
    expect(instantiated.filter((id) => id === 'model.prop.prismDrop.production')).toHaveLength(1);
    expect(instantiated.filter((id) => id === 'model.prop.rainDropletSmall.production')).toHaveLength(18);
  });

  it('remains deterministic and seek-safe through the normal runtime path before final PB6 polish', () => {
    const runtime = new SceneRuntime();
    runtime.load(loadEpisodeInput('artifact-015-rainbow'), createLibraryForTheme('voxel'));

    runtime.evaluateAt(3.9);
    const first = runtime.getEffectInfluences();
    runtime.evaluateAt(12.1);
    runtime.evaluateAt(3.9);
    expect(runtime.getEffectInfluences()).toEqual(first);
    expect(runtime.currentEpisodeId).toBe('artifact-015-rainbow');

    runtime.dispose();
  });
});
