import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { composeEpisode } from '@mindforge/composer';
import { SceneRuntime, type RuntimeAssetAccess } from '@mindforge/engine';
import { createLibraryForTheme } from '@mindforge/library';
import { getTheme } from '@mindforge/themes';

const root = fileURLToPath(new URL('..', import.meta.url));
const previewEpisode = JSON.parse(
  readFileSync(`${root}/content/episodes/pb4-production-meadow-preview/episode.json`, 'utf8'),
) as Record<string, unknown>;

const PB4_LAYER_IDS = [
  'layer.surface.puddles',
  'layer.setDressing.groundCover',
  'layer.world.clouds',
] as const;

const AUTHORED_IDS = new Set([
  'model.vegetation.treeOakA.production',
  'model.vegetation.treeOakB.production',
  'model.vegetation.treePineA.production',
  'model.vegetation.treeYoungA.production',
  'model.vegetation.bushA.production',
  'model.vegetation.bushB.production',
  'model.rock.meadowA.production',
  'model.rock.meadowB.production',
  'model.rock.clusterA.production',
  'model.vegetation.grassClusterA.production',
  'model.vegetation.grassClusterB.production',
  'model.vegetation.flowerClusterA.production',
  'model.prop.puddleA.production',
  'model.environment.stormCloudA.production',
  'model.environment.stormCloudB.production',
  'model.environment.cloudBreakA.production',
]);

function group(scene: THREE.Scene, prefix: string): THREE.Group {
  let result: THREE.Group | undefined;
  scene.traverse((object) => {
    if (!result && object instanceof THREE.Group && object.name.startsWith(prefix)) result = object;
  });
  if (!result) throw new Error(`Missing group ${prefix}`);
  return result;
}

function transforms(value: THREE.Group): number[][] {
  return value.children.map((child) => [
    child.position.x,
    child.position.y,
    child.position.z,
    child.rotation.y,
    child.scale.x,
    child.scale.y,
    child.scale.z,
  ]);
}

function authoredRuntimeAssets(instantiated: string[]): RuntimeAssetAccess {
  return {
    has: (id) => AUTHORED_IDS.has(id),
    instantiateModel(id) {
      instantiated.push(id);
      const object3d = new THREE.Group();
      object3d.name = `pb4-authored:${id}`;
      return { object3d, anchors: {}, animations: [], clips: {} };
    },
  };
}

describe('PB4 production meadow baseline', () => {
  it.each(['voxel', 'toybox'])('keeps the reusable meadow capability ids theme-portable in %s', (themeId) => {
    const library = createLibraryForTheme(themeId);
    for (const id of PB4_LAYER_IDS) expect(library.sceneLayers.has(id), id).toBe(true);
  });

  it('exposes productionMeadow as a PF8 composition preset instead of a monolithic environment', () => {
    const episode = composeEpisode({
      schemaVersion: '0.1',
      id: 'pb4-composer-meadow',
      title: 'PB4 composer meadow',
      duration: 6,
      world: {
        preset: 'productionMeadow',
        weather: { preset: 'heavyRain', parameters: { intensity: 0.72 } },
        atmosphere: [
          { preset: 'mist', parameters: { density: 0.3 } },
          { preset: 'fog', parameters: { density: 0.22 } },
        ],
      },
      actors: [],
      props: [],
      beats: [],
    });

    expect(episode.environment).toBe('environment.compositionStage');
    expect(episode.layers.map((entry) => entry.factory)).toEqual([
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
    ]);
  });

  it('uses PB1 authored ground cover, puddles, clouds and nature through the normal PF2 bridge', () => {
    const instantiated: string[] = [];
    const runtime = new SceneRuntime();
    runtime.load(
      previewEpisode,
      createLibraryForTheme('voxel'),
      authoredRuntimeAssets(instantiated),
    );

    const groundCover = group(runtime.scene, 'mindforge-composition:voxel.groundCover:groundCover');
    const puddles = group(runtime.scene, 'mindforge-composition:voxel.puddles:puddles');
    const clouds = group(runtime.scene, 'mindforge-composition:voxel.clouds:clouds');
    const nature = group(runtime.scene, 'mindforge-composition:voxel.nature:nature');

    expect(groundCover.children).toHaveLength(46);
    expect(puddles.children).toHaveLength(5);
    expect(clouds.children).toHaveLength(7);
    expect(nature.children).toHaveLength(24);
    expect(instantiated).toHaveLength(87);
    expect(instantiated.every((id) => AUTHORED_IDS.has(id))).toBe(true);

    for (const child of [...groundCover.children, ...puddles.children, ...clouds.children, ...nature.children]) {
      expect(child.userData.mindforgeCompositionSource).toBe('authored');
    }
    for (const child of clouds.children) expect(child.position.y).toBeGreaterThan(10);

    runtime.dispose();
  });

  it('keeps the hero clearing readable and reconstructs exactly after seeks/rebuilds', () => {
    const first = new SceneRuntime();
    first.load(previewEpisode, createLibraryForTheme('voxel'));
    const nature = group(first.scene, 'mindforge-composition:voxel.nature:nature');
    const cover = group(first.scene, 'mindforge-composition:voxel.groundCover:groundCover');
    const initialNature = transforms(nature);
    const initialCover = transforms(cover);

    for (const child of nature.children) {
      expect(Math.hypot(child.position.x, child.position.z + 7)).toBeGreaterThanOrEqual(6);
    }
    for (const child of cover.children) {
      expect(Math.hypot(child.position.x, child.position.z + 7)).toBeGreaterThanOrEqual(3.4);
    }

    first.evaluateAt(6.7);
    first.evaluateAt(1.2);
    expect(transforms(nature)).toEqual(initialNature);
    expect(transforms(cover)).toEqual(initialCover);

    const second = new SceneRuntime();
    second.load(previewEpisode, createLibraryForTheme('voxel'));
    expect(transforms(group(second.scene, 'mindforge-composition:voxel.nature:nature'))).toEqual(initialNature);
    expect(transforms(group(second.scene, 'mindforge-composition:voxel.groundCover:groundCover'))).toEqual(initialCover);

    first.dispose();
    second.dispose();
  });

  it('keeps PB1 production pack declarations intact while exposing the assets PB4 composes', () => {
    const theme = getTheme('voxel');
    const naturePack = theme.assetPacks.find((entry) => entry.id === 'pack.voxel.nature-production');
    expect(naturePack?.maturity).toBe('production');
    expect(naturePack?.assetIds).toContain('model.prop.puddleA.production');
    expect(naturePack?.assetIds).toContain('model.environment.stormCloudA.production');
    expect(naturePack?.assetIds).toContain('model.vegetation.grassClusterA.production');
  });
});
