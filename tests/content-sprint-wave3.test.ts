import { describe, expect, it } from 'vitest';
import { DEFAULT_AUDIO_CUES } from '@mindforge/audio';
import { EPISODES } from '@content/catalog';
import { getTheme } from '@mindforge/themes';
import { loadEpisodeInput } from './helpers/content';

const WAVE3_EPISODES = [
  'artifact-014-echo',
  'artifact-015-rainbow',
  'artifact-016-moon-horizon',
  'artifact-017-star-twinkle',
] as const;

const NEW_ENVIRONMENTS = [
  'environment.canyon',
  'environment.rainMeadow',
  'environment.nightOverlook',
  'environment.observatory',
] as const;

const NEW_PREFABS = [
  'prefab.soundRig',
  'prefab.prismDrop',
  'prefab.moonPair',
  'prefab.starPlanetPair',
] as const;

const WAVE3_AUDIO = [
  'audio.ambience.canyon',
  'audio.ambience.rain',
  'audio.ambience.night',
  'audio.ambience.observatory',
  'audio.sfx.echoImpulse',
  'audio.sfx.echoReturn',
  'audio.sfx.prismSplit',
  'audio.sfx.compareTick',
  'audio.sfx.twinkle',
] as const;

describe('production content sprint wave 3', () => {
  it('keeps every Wave 3 episode at or under the 20-second production cap', () => {
    const byId = new Map(EPISODES.map((episode) => [episode.id, episode]));
    for (const id of WAVE3_EPISODES) {
      const episode = byId.get(id);
      expect(episode, id).toBeDefined();
      expect(episode!.input.duration, id).toBeGreaterThanOrEqual(15);
      expect(episode!.input.duration, id).toBeLessThanOrEqual(20);
    }
  });

  it.each(['voxel', 'toybox'] as const)('registers the Wave 3 environment and prefab surface in %s', (themeId) => {
    const theme = getTheme(themeId);
    for (const id of NEW_ENVIRONMENTS) expect(theme.environments[id], id).toBeDefined();
    for (const id of NEW_PREFABS) expect(theme.prefabs[id], id).toBeDefined();
  });

  it('directs Wave 3 without idle humanoids', () => {
    for (const id of WAVE3_EPISODES) {
      const input = loadEpisodeInput(id);
      const entities = input.entities as Array<Record<string, unknown>>;
      expect(entities.some((entity) => entity.type === 'character'), id).toBe(false);
    }
  });

  it('makes each concept visibly perform its key explanatory action', () => {
    const echo = loadEpisodeInput('artifact-014-echo');
    expect((echo.timeline as Array<Record<string, unknown>>).some((event) => event.from === 'rig.reflector' && event.to === 'rig.listener')).toBe(true);

    const rainbow = loadEpisodeInput('artifact-015-rainbow');
    const spectrumTargets = new Set((rainbow.timeline as Array<Record<string, unknown>>)
      .filter((event) => event.property === 'scale' && typeof event.target === 'string')
      .map((event) => event.target));
    for (const color of ['red', 'orange', 'yellow', 'green', 'blue', 'violet']) {
      expect(spectrumTargets.has(`prism.${color}`), color).toBe(true);
    }

    const moon = loadEpisodeInput('artifact-016-moon-horizon');
    expect((moon.timeline as Array<Record<string, unknown>>).some((event) => event.target === 'moons.horizonFrame' && event.property === 'scale')).toBe(true);
    expect((moon.timeline as Array<Record<string, unknown>>).some((event) => event.target === 'moons.highFrame' && event.property === 'scale')).toBe(true);

    const stars = loadEpisodeInput('artifact-017-star-twinkle');
    expect((stars.timeline as Array<Record<string, unknown>>).some((event) => event.target === 'sky.star' && event.motion === 'motion.object.pulse')).toBe(true);
  });

  it('registers Wave 3 semantic ambience and SFX cues', () => {
    const ids = new Set(DEFAULT_AUDIO_CUES.map((cue) => cue.id));
    for (const id of WAVE3_AUDIO) expect(ids.has(id), id).toBe(true);
  });
});
