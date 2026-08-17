import { describe, expect, it } from 'vitest';
import { DEFAULT_AUDIO_CUES } from '@mindforge/audio';
import { EPISODES } from '@content/catalog';
import { getTheme } from '@mindforge/themes';

const WAVE1_EPISODES = [
  'artifact-006-metal-wood',
  'artifact-007-balloon-static',
  'artifact-008-ice-floats',
  'artifact-009-hot-spoon',
] as const;

const WAVE1_ENVIRONMENTS = [
  'environment.materialLab',
  'environment.classroomLab',
  'environment.kitchenLab',
] as const;

const WAVE1_PREFABS = [
  'prefab.materialSamples',
  'prefab.balloon',
  'prefab.demoPanel',
  'prefab.floatTank',
  'prefab.bowlSpoon',
] as const;

const WAVE1_AUDIO = [
  'audio.ambience.lab',
  'audio.ambience.classroom',
  'audio.ambience.kitchen',
  'audio.sfx.materialTap',
  'audio.sfx.balloonRub',
  'audio.sfx.staticCrackle',
  'audio.sfx.waterSplash',
  'audio.sfx.heatTransfer',
] as const;

describe('production content sprint wave 1', () => {
  it('ships the first four post-foundation production episodes without forcing 15-second timing', () => {
    const byId = new Map(EPISODES.map((episode) => [episode.id, episode]));
    for (const id of WAVE1_EPISODES) {
      const episode = byId.get(id);
      expect(episode, id).toBeDefined();
      expect(episode!.input.duration, id).toBeGreaterThan(15);
    }
  });

  it.each(['voxel', 'toybox'] as const)('registers the shared Wave 1 production asset surface in %s', (themeId) => {
    const theme = getTheme(themeId);
    for (const id of WAVE1_ENVIRONMENTS) expect(theme.environments[id], id).toBeDefined();
    for (const id of WAVE1_PREFABS) expect(theme.prefabs[id], id).toBeDefined();
  });

  it('registers reusable semantic ambience and SFX cues for the Wave 1 environments and props', () => {
    const ids = new Set(DEFAULT_AUDIO_CUES.map((cue) => cue.id));
    for (const id of WAVE1_AUDIO) expect(ids.has(id), id).toBe(true);
  });
});
