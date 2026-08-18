import { describe, expect, it } from 'vitest';
import { DEFAULT_AUDIO_CUES } from '@mindforge/audio';
import { EPISODES } from '@content/catalog';
import { getTheme } from '@mindforge/themes';
import { loadEpisodeInput } from './helpers/content';

const WAVE2_EPISODES = [
  'artifact-010-seatbelts',
  'artifact-011-heavy-fall',
  'artifact-012-paper-plane',
  'artifact-013-magnets',
] as const;

const NEW_ENVIRONMENTS = ['environment.vehicleCabin', 'environment.dropLab'] as const;
const NEW_PREFABS = ['prefab.seatRig', 'prefab.featherRock', 'prefab.paperPlane', 'prefab.magnetKit'] as const;
const WAVE2_AUDIO = [
  'audio.ambience.road',
  'audio.sfx.beltLatch',
  'audio.sfx.brakeImpact',
  'audio.sfx.dropRelease',
  'audio.sfx.dropImpact',
  'audio.sfx.paperLaunch',
  'audio.sfx.airflow',
  'audio.sfx.magnetSnap',
] as const;

describe('production content sprint wave 2', () => {
  it('ships four longer-form forces/mechanics episodes', () => {
    const byId = new Map(EPISODES.map((episode) => [episode.id, episode]));
    for (const id of WAVE2_EPISODES) {
      const episode = byId.get(id);
      expect(episode, id).toBeDefined();
      expect(episode!.input.duration, id).toBeGreaterThan(15);
    }
  });

  it.each(['voxel', 'toybox'] as const)('registers the Wave 2 reusable asset surface in %s', (themeId) => {
    const theme = getTheme(themeId);
    for (const id of NEW_ENVIRONMENTS) expect(theme.environments[id], id).toBeDefined();
    for (const id of NEW_PREFABS) expect(theme.prefabs[id], id).toBeDefined();
  });

  it('directs Wave 2 without idle humanoid entities', () => {
    for (const id of WAVE2_EPISODES) {
      const input = loadEpisodeInput(id);
      const entities = input.entities as Array<Record<string, unknown>>;
      expect(entities.some((entity) => entity.type === 'character'), id).toBe(false);
    }

    const seatbelt = loadEpisodeInput('artifact-010-seatbelts');
    expect((seatbelt.entities as Array<Record<string, unknown>>).some((entity) => entity.factory === 'prefab.seatRig')).toBe(true);

    const plane = loadEpisodeInput('artifact-012-paper-plane');
    expect((plane.timeline as Array<Record<string, unknown>>).some((event) => event.target === 'plane' && event.property === 'position')).toBe(true);

    const magnets = loadEpisodeInput('artifact-013-magnets');
    expect((magnets.timeline as Array<Record<string, unknown>>).some((event) => event.target === 'kit.steel' && event.property === 'position')).toBe(true);
  });

  it('reuses earlier environments instead of cloning more generic rooms', () => {
    expect(loadEpisodeInput('artifact-012-paper-plane').environment).toBe('environment.classroomLab');
    expect(loadEpisodeInput('artifact-013-magnets').environment).toBe('environment.materialLab');
  });

  it('registers Wave 2 semantic ambience and SFX cues', () => {
    const ids = new Set(DEFAULT_AUDIO_CUES.map((cue) => cue.id));
    for (const id of WAVE2_AUDIO) expect(ids.has(id), id).toBe(true);
  });
});
