import { describe, expect, it } from 'vitest';
import { loadEpisode, UnknownRegistryIdError } from '@mindforge/engine';
import { createDefaultLibrary } from '@mindforge/library';

const library = createDefaultLibrary();

const baseEpisode = {
  schemaVersion: '0.1',
  id: 'loader-test',
  title: 'Loader Test',
  duration: 6,
  environment: 'environment.dreamGarden',
  entities: [{ id: 'observer', type: 'character', factory: 'character.observer', position: [0, 0, 0] }],
  timeline: [
    { id: 'idle', type: 'motion', at: 0, duration: 6, target: 'observer', motion: 'motion.humanoid.idle' },
  ],
};

describe('loadEpisode', () => {
  it('loads a valid episode against the default library', () => {
    const loaded = loadEpisode(baseEpisode, library);
    expect(loaded.script.id).toBe('loader-test');
    expect(loaded.entityIds.has('observer')).toBe(true);
  });


  it('loads semantic prefabs and permits object motions on prefab anchors', () => {
    const themed = {
      ...baseEpisode,
      entities: [{ id: 'hand', type: 'prefab', factory: 'prefab.externalHand' }],
      timeline: [
        {
          id: 'curl',
          type: 'objectMotion',
          at: 0,
          duration: 1,
          target: 'hand.fingers',
          motion: 'motion.object.curl',
        },
      ],
    };
    expect(() => loadEpisode(themed, library)).not.toThrow();
  });

  it('reports an unknown prefab id', () => {
    const bad = {
      ...baseEpisode,
      entities: [{ id: 'thing', type: 'prefab', factory: 'prefab.missing' }],
    };
    expect(() => loadEpisode(bad, library)).toThrow(/prefab.*missing/);
  });

  it('reports an unknown motion id', () => {
    const bad = {
      ...baseEpisode,
      timeline: [{ id: 'x', type: 'motion', at: 0, target: 'observer', motion: 'motion.humanoid.moonwalk' }],
    };
    expect(() => loadEpisode(bad, library)).toThrow(UnknownRegistryIdError);
    expect(() => loadEpisode(bad, library)).toThrow(/motion.*moonwalk/);
  });

  it('reports an unknown environment id', () => {
    const bad = { ...baseEpisode, environment: 'environment.atlantis' };
    expect(() => loadEpisode(bad, library)).toThrow(/environment.*atlantis/);
  });

  it('reports a timeline target that is not an entity', () => {
    const bad = {
      ...baseEpisode,
      timeline: [{ id: 'x', type: 'motion', at: 0, target: 'ghost', motion: 'motion.humanoid.idle' }],
    };
    expect(() => loadEpisode(bad, library)).toThrow(/entity id "ghost"/);
  });
});
