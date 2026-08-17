import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { NARRATION_AUDIO_CUES } from '@mindforge/audio';
import { loadEpisode } from '@mindforge/engine';
import { createDefaultLibrary } from '@mindforge/library';
import { safeParseEpisode } from '@mindforge/schema';

const narrationEpisode = {
  schemaVersion: '0.1',
  id: 'narration-test',
  title: 'Narration Test',
  duration: 3,
  environment: 'environment.dreamGarden',
  entities: [],
  text: [{ id: 'hook', content: 'Why?', style: 'question', placement: 'upper' }],
  timeline: [
    { id: 'caption', type: 'text', at: 0.2, duration: 1.5, textId: 'hook' },
    {
      id: 'voice',
      type: 'audio',
      at: 0.2,
      duration: 1.5,
      cue: 'audio.voice.heat.hook',
      textId: 'hook',
    },
  ],
};

describe('MindForge narration', () => {
  it('keeps narration on the existing audio timeline and Voice bus', () => {
    expect(safeParseEpisode(narrationEpisode).success).toBe(true);
    const cue = createDefaultLibrary().audio.get('audio.voice.heat.hook');
    expect(cue.bus).toBe('voice');
    expect(cue.source.kind).toBe('url');
  });

  it('validates the caption id linked to a narration event', () => {
    const bad = {
      ...narrationEpisode,
      timeline: [
        {
          id: 'voice',
          type: 'audio',
          at: 0.2,
          cue: 'audio.voice.heat.hook',
          textId: 'missing-caption',
        },
      ],
    };
    expect(() => loadEpisode(bad, createDefaultLibrary())).toThrow(/text.*missing-caption/);
  });

  it('ships every registered reference narration asset', () => {
    for (const cue of NARRATION_AUDIO_CUES) {
      expect(cue.source.kind).toBe('url');
      if (cue.source.kind !== 'url') continue;
      const asset = fileURLToPath(new URL(`../public${cue.source.url}`, import.meta.url));
      expect(existsSync(asset), cue.id).toBe(true);
    }
  });
});
