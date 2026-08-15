import { describe, expect, it } from 'vitest';
import { parseEpisode, safeParseEpisode } from '@mindforge/schema';

const validEpisode = {
  schemaVersion: '0.1',
  id: 'test-episode',
  title: 'A Test',
  duration: 5,
  environment: 'environment.cosmicVoid',
  entities: [{ id: 'box', type: 'primitive', geometry: 'box', size: 1 }],
  timeline: [
    { id: 'spin', type: 'objectMotion', at: 0, duration: 4, target: 'box', motion: 'motion.object.spin' },
    { id: 'caption', type: 'text', at: 1, content: 'hello' },
  ],
};

describe('MindForge Script schema', () => {
  it('accepts a valid episode', () => {
    expect(() => parseEpisode(validEpisode)).not.toThrow();
  });

  it('rejects an episode missing a required field (duration)', () => {
    const { duration: _omit, ...invalid } = validEpisode;
    const result = safeParseEpisode(invalid);
    expect(result.success).toBe(false);
  });

  it('rejects duplicate timeline event ids', () => {
    const invalid = {
      ...validEpisode,
      timeline: [
        { id: 'dupe', type: 'text', at: 0, content: 'a' },
        { id: 'dupe', type: 'text', at: 1, content: 'b' },
      ],
    };
    const result = safeParseEpisode(invalid);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain('duplicate timeline event id');
    }
  });

  it('rejects an unsupported schemaVersion', () => {
    const result = safeParseEpisode({ ...validEpisode, schemaVersion: '9.9' });
    expect(result.success).toBe(false);
  });

  it('rejects a text event with neither textId nor content', () => {
    const invalid = {
      ...validEpisode,
      timeline: [{ id: 'empty', type: 'text', at: 0 }],
    };
    expect(safeParseEpisode(invalid).success).toBe(false);
  });
});
