import { describe, expect, it } from 'vitest';
import {
  DEFAULT_COMPOSITION_VOCABULARY,
  CompositionResolutionError,
  composeEpisode,
  type CompositionVocabulary,
} from '@mindforge/composer';
import { SceneRuntime, loadEpisode } from '@mindforge/engine';
import { createLibraryForTheme } from '@mindforge/library';
import { COMPOSITION_SCHEMA_VERSION, parseSceneComposition } from '@mindforge/schema';

const semanticPlan = {
  schemaVersion: COMPOSITION_SCHEMA_VERSION,
  id: 'pf8-semantic-scene',
  title: 'PF8 Semantic Scene',
  duration: 8,
  world: {
    preset: 'nature',
    weather: {
      preset: 'heavyRain',
      parameters: { intensity: 0.72, wind: 0.2 },
    },
    atmosphere: [
      { preset: 'mist', parameters: { density: 0.35 } },
      { preset: 'fog', parameters: { density: 0.2 } },
    ],
  },
  actors: [
    {
      id: 'guide',
      character: 'observer',
      position: [-2, 0, 0],
    },
  ],
  props: [
    {
      id: 'prism',
      prefab: 'prismDrop',
      position: [1.5, 1.1, -0.5],
    },
  ],
  beats: [
    {
      id: 'hook',
      at: 0,
      duration: 1.5,
      intent: 'Establish the question and hero object immediately.',
      actions: [
        { type: 'camera', shot: 'establish', duration: 1.2 },
        {
          type: 'text',
          id: 'question',
          content: 'What happens inside the drop?',
          style: 'question',
          placement: 'upper',
          duration: 1.5,
        },
        { type: 'effect', effect: 'insightFlash', offset: 0.4, duration: 0.6 },
      ],
    },
    {
      id: 'explain',
      at: 1.5,
      duration: 2.5,
      actions: [
        { type: 'motion', target: 'guide', motion: 'reach', duration: 1.2 },
        { type: 'objectMotion', target: 'prism', motion: 'spin', duration: 2.2 },
        { type: 'audio', cue: 'insight', offset: 0.25 },
      ],
    },
  ],
} as const;

describe('PF8 semantic scene composition', () => {
  it('compiles semantic world choices into the PF1/PF5/PF6 executable layer stack', () => {
    const episode = composeEpisode(semanticPlan);

    expect(episode.environment).toBe('environment.compositionStage');
    expect(episode.layers.map((layer) => [layer.id, layer.factory, layer.role])).toEqual([
      ['ground', 'layer.surface.ground', 'surface'],
      ['nature', 'layer.setDressing.nature', 'setDressing'],
      ['atmosphere-1', 'layer.atmosphere.mist', 'atmosphere'],
      ['atmosphere-2', 'layer.atmosphere.fog', 'atmosphere'],
      ['weather', 'layer.weather.heavyRain', 'weather'],
      ['daylight', 'layer.lighting.daylight', 'lighting'],
      ['foreground', 'layer.foreground.nature', 'foreground'],
    ]);
    expect(episode.layers.find((layer) => layer.id === 'weather')?.parameters).toEqual({
      intensity: 0.72,
      wind: 0.2,
    });
  });

  it('resolves semantic actors, props and beat actions without exposing implementation names', () => {
    const episode = composeEpisode(semanticPlan);

    expect(episode.entities).toEqual([
      {
        id: 'guide',
        type: 'character',
        factory: 'character.observer',
        position: [-2, 0, 0],
      },
      {
        id: 'prism',
        type: 'prefab',
        factory: 'prefab.prismDrop',
        position: [1.5, 1.1, -0.5],
      },
    ]);

    expect(episode.timeline.map((event) => [event.id, event.type, event.at])).toEqual([
      ['hook.camera-1', 'camera', 0],
      ['hook.question', 'text', 0],
      ['hook.effect-3', 'effect', 0.4],
      ['explain.motion-1', 'motion', 1.5],
      ['explain.objectMotion-2', 'objectMotion', 1.5],
      ['explain.audio-3', 'audio', 1.75],
    ]);

    expect(episode.timeline.find((event) => event.id === 'explain.motion-1')).toMatchObject({
      motion: 'motion.humanoid.reach',
    });
    expect(episode.timeline.find((event) => event.id === 'explain.objectMotion-2')).toMatchObject({
      motion: 'motion.object.spin',
    });
    expect(episode.timeline.find((event) => event.id === 'hook.effect-3')).toMatchObject({
      effect: 'effect.insight.flash',
    });
  });

  it.each(['voxel', 'toybox'])('produces an episode accepted by the normal %s runtime gate', (themeId) => {
    const episode = composeEpisode(semanticPlan);
    const library = createLibraryForTheme(themeId);
    expect(loadEpisode(episode, library).script.id).toBe(semanticPlan.id);

    const runtime = new SceneRuntime();
    runtime.load(episode, library);
    runtime.evaluateAt(2.25);
    expect(runtime.currentEpisodeId).toBe(semanticPlan.id);
    expect(runtime.getCompositionLayers()).toHaveLength(7);
    runtime.dispose();
  });

  it('is a pure deterministic compiler: identical semantic input produces identical executable JSON', () => {
    const first = composeEpisode(semanticPlan);
    const second = composeEpisode(structuredClone(semanticPlan));
    expect(second).toEqual(first);
  });

  it('preserves the production text sidecar contract for semantic text references', () => {
    const episode = composeEpisode(
      {
        ...semanticPlan,
        id: 'pf8-text-sidecar',
        beats: [
          {
            id: 'caption',
            at: 0,
            duration: 1,
            actions: [{ type: 'text', textId: 'caption.answer', duration: 1 }],
          },
        ],
      },
      {
        text: [
          {
            id: 'caption.answer',
            content: 'The compiled episode still uses the normal text sidecar.',
            style: 'explanation',
            placement: 'lower',
          },
        ],
      },
    );

    expect(episode.text?.[0]?.id).toBe('caption.answer');
    expect(loadEpisode(episode, createLibraryForTheme('voxel')).textById.has('caption.answer')).toBe(true);
  });

  it('supports explicit dotted registry ids and custom vocabulary without changing the Engine', () => {
    const custom: CompositionVocabulary = {
      ...DEFAULT_COMPOSITION_VOCABULARY,
      characters: {
        ...DEFAULT_COMPOSITION_VOCABULARY.characters,
        guide: 'character.observer',
      },
      effects: {
        ...DEFAULT_COMPOSITION_VOCABULARY.effects,
        reveal: 'effect.insight.flash',
      },
    };

    const episode = composeEpisode(
      {
        ...semanticPlan,
        id: 'pf8-custom-vocabulary',
        world: { preset: 'environment.compositionStage', atmosphere: [] },
        actors: [{ id: 'guide', character: 'guide' }],
        props: [],
        beats: [
          {
            id: 'reveal',
            at: 0,
            actions: [{ type: 'effect', effect: 'reveal', duration: 0.5 }],
          },
        ],
      },
      { vocabulary: custom },
    );

    expect(episode.environment).toBe('environment.compositionStage');
    expect(episode.entities[0]).toMatchObject({ factory: 'character.observer' });
    expect(episode.timeline[0]).toMatchObject({ effect: 'effect.insight.flash' });
  });

  it('rejects unknown semantic aliases and malformed beat timing before runtime construction', () => {
    expect(() => composeEpisode({ ...semanticPlan, world: { preset: 'unknown-place' } })).toThrow(
      CompositionResolutionError,
    );

    expect(() =>
      parseSceneComposition({
        ...semanticPlan,
        beats: [
          {
            id: 'bad-beat',
            at: 7,
            duration: 1,
            actions: [{ type: 'effect', effect: 'insightFlash', offset: 0.5, duration: 0.75 }],
          },
        ],
      }),
    ).toThrow('action extends beyond the containing beat window');
  });
});
