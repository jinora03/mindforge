import { describe, expect, it } from 'vitest';
import { parseEpisode, parseScene, safeParseEpisode } from '@mindforge/schema';

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


  it('accepts ordered semantic scene-composition layers', () => {
    const layered = {
      ...validEpisode,
      layers: [
        {
          id: 'rain',
          factory: 'layer.weather.rain',
          role: 'weather',
          parameters: { intensity: 0.8 },
        },
        {
          id: 'mist',
          factory: 'layer.atmosphere.mist',
          role: 'atmosphere',
          enabled: false,
        },
      ],
    };
    const parsed = parseEpisode(layered);
    expect(parsed.layers.map((layer) => layer.id)).toEqual(['rain', 'mist']);
    expect(parsed.layers[0].enabled).toBe(true);
    expect(parsed.layers[1].enabled).toBe(false);
  });

  it('supports the same layer stack in reusable scene presets', () => {
    const scene = parseScene({
      schemaVersion: '0.1',
      id: 'scene.storm-test',
      environment: 'environment.dreamGarden',
      layers: [
        { id: 'storm', factory: 'layer.weather.storm', role: 'weather' },
      ],
      entities: [],
    });
    expect(scene.layers).toHaveLength(1);
    expect(scene.layers[0].factory).toBe('layer.weather.storm');
    expect(scene.layers[0].enabled).toBe(true);
  });

  it('rejects duplicate local scene-layer ids', () => {
    const result = safeParseEpisode({
      ...validEpisode,
      layers: [
        { id: 'weather', factory: 'layer.weather.rain', role: 'weather' },
        { id: 'weather', factory: 'layer.weather.snow', role: 'weather' },
      ],
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.message).toContain('duplicate scene layer id');
  });

  it('accepts semantic prefab entities and effect tones', () => {
    const themed = {
      ...validEpisode,
      entities: [
        { id: 'hand', type: 'prefab', factory: 'prefab.externalHand' },
      ],
      timeline: [
        {
          id: 'reaction',
          type: 'effect',
          at: 1,
          duration: 1,
          effect: 'effect.reaction.burst',
          target: 'hand',
          tone: 'reaction',
        },
      ],
    };
    expect(safeParseEpisode(themed).success).toBe(true);
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
