import { describe, expect, it } from 'vitest';
import { EPISODES } from '@content/catalog';
import { getProductionEpisode, PRODUCTION_EPISODES } from '@content/production-catalog';
import { activeStoryboardShot, summarizeCreativeBrief } from '@content/production-types';

describe('MindForge production workflow', () => {
  it('discovers every production episode from the four-file folder contract', () => {
    const runtimeIds = EPISODES.map((episode) => episode.id);
    const productionIds = PRODUCTION_EPISODES.map((entry) => entry.storyboard.episode);
    expect(runtimeIds).toEqual(productionIds);
    expect(runtimeIds).toContain('artifact-005-lightning-thunder');

    for (const episode of EPISODES) {
      const production = getProductionEpisode(episode.id);
      expect(production).toBeDefined();
      expect(production!.files).toEqual([
        'creative-brief.md',
        'storyboard.json',
        'episode.json',
        'text.json',
      ]);
      expect(production!.storyboard.episode).toBe(episode.id);
      expect(production!.storyboard.title).toBe(episode.title);
      expect(production!.storyboard.durationSeconds).toBe(episode.input.duration);
      expect(production!.storyboard.shots.length).toBeGreaterThan(0);
      expect(production!.briefSummary.length).toBeGreaterThan(20);
    }
  });

  it('resolves the active storyboard shot from authoritative preview time', () => {
    const prediction = EPISODES.find((episode) => episode.id === 'artifact-002-prediction');
    expect(prediction).toBeDefined();
    const production = getProductionEpisode(prediction!.id);
    expect(production).toBeDefined();
    expect(activeStoryboardShot(production!.storyboard, 0.5)?.id).toBe('s1-arrival');
    expect(activeStoryboardShot(production!.storyboard, 9.2)?.id).toBe('s5-contact');
    expect(activeStoryboardShot(production!.storyboard, 14.8)?.id).toBe('s8-echo');
  });

  it('extracts the one-idea prose rather than a markdown heading', () => {
    expect(
      summarizeCreativeBrief(
        '# Creative Brief\n\n## 1. The one idea\n\nA useful causal explanation that is long enough.',
      ),
    ).toBe('A useful causal explanation that is long enough.');
  });
});
