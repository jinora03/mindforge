import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { getTheme, VOXEL_PRODUCTION_BASELINE } from '@mindforge/themes';

const root = fileURLToPath(new URL('..', import.meta.url));

function episode(id: string): Record<string, unknown> {
  return JSON.parse(readFileSync(`${root}/content/episodes/${id}/episode.json`, 'utf8')) as Record<string, unknown>;
}

describe('PB5A reusable Voxel production baseline', () => {
  it('formalizes Heat and Cold Battery as the reference visual episodes', () => {
    expect(VOXEL_PRODUCTION_BASELINE.id).toBe('voxel-block-game-v1');
    expect(VOXEL_PRODUCTION_BASELINE.referenceEpisodes).toEqual([
      'artifact-001-heat',
      'artifact-004-cold-battery',
    ]);

    const heat = episode('artifact-001-heat');
    const cold = episode('artifact-004-cold-battery');
    expect(heat.environment).toBe('environment.artifactStage');
    expect(cold.environment).toBe('environment.cosmicVoid');

    for (const input of [heat, cold]) {
      const factories = (input.entities as Array<Record<string, unknown>>).map((entity) => entity.factory);
      expect(factories).toContain('prefab.heatEngine');
      expect(factories).toContain('prefab.informationShard');
    }
  });

  it('keeps every baseline semantic capability reusable through the Voxel theme registry', () => {
    const theme = getTheme('voxel');
    for (const id of VOXEL_PRODUCTION_BASELINE.environments) expect(theme.environments[id], id).toBeDefined();
    for (const id of VOXEL_PRODUCTION_BASELINE.prefabs) expect(theme.prefabs[id], id).toBeDefined();
    for (const id of VOXEL_PRODUCTION_BASELINE.sceneLayers) expect(theme.sceneLayers[id], id).toBeDefined();
    for (const id of VOXEL_PRODUCTION_BASELINE.effects) expect(theme.effects[id], id).toBeDefined();
    for (const id of VOXEL_PRODUCTION_BASELINE.assetPacks) {
      expect(theme.assetPacks.some((pack) => pack.id === id), id).toBe(true);
    }
  });

  it('locks the art-direction rules that distinguish Voxel from generic low-poly rendering', () => {
    expect(VOXEL_PRODUCTION_BASELINE.style).toEqual({
      geometry: 'orthogonal-block-first',
      textures: 'nearest-filtered-16x16',
      lighting: 'readable-diorama',
      composition: 'framed-hero-diorama',
      emissive: 'semantic-accents-only',
      optics: 'segmented-block-light-no-transmission',
    });
  });
});
