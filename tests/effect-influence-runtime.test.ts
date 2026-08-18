import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import {
  EffectInfluenceBus,
  SceneRuntime,
  type ActionContext,
  type EffectFactory,
  type EffectInstance,
  type SceneCompositionLayerBuildContext,
  type SceneCompositionLayerInstance,
} from '@mindforge/engine';
import { createDefaultLibrary } from '@mindforge/library';
import { createInsightFlash } from '@mindforge/effects';

const episode = {
  schemaVersion: '0.1',
  id: 'pf4-influence-runtime-test',
  title: 'PF4 Influence Runtime Test',
  duration: 6,
  environment: 'environment.dreamGarden',
  layers: [
    {
      id: 'probe',
      factory: 'layer.test.effectInfluenceProbe',
      role: 'lighting',
    },
  ],
  entities: [],
  timeline: [
    {
      id: 'pulse',
      type: 'effect',
      at: 1,
      duration: 2,
      effect: 'effect.test.influencePulse',
    },
  ],
};

describe('PF4 layered effect influence runtime', () => {
  it('aggregates normalized influence deterministically and resets every frame', () => {
    const bus = new EffectInfluenceBus();
    bus.beginFrame();
    bus.contribute('environmentLight', 0.6);
    bus.contribute('environmentLight', 0.7);
    bus.contribute('screenExposure', Number.NaN);
    bus.contribute('screenExposure', -1);

    expect(bus.get('environmentLight')).toBe(1);
    expect(bus.get('screenExposure')).toBe(0);

    bus.beginFrame();
    expect(bus.get('environmentLight')).toBe(0);
  });

  it('computes influences before PF1 scene layers update at the same absolute time', () => {
    const library = createDefaultLibrary();
    const observed: Array<{ time: number; light: number }> = [];

    const effectFactory: EffectFactory = (): EffectInstance => ({
      object3d: new THREE.Group(),
      update(): void {},
      contributeInfluence(ctx, sink): void {
        sink.contribute('environmentLight', ctx.progress);
      },
      reset(): void {},
      dispose(): void {},
    });

    library.effects.register('effect.test.influencePulse', effectFactory);
    library.sceneLayers.register(
      'layer.test.effectInfluenceProbe',
      (ctx: SceneCompositionLayerBuildContext): SceneCompositionLayerInstance => ({
        object3d: new THREE.Group(),
        update(frame): void {
          observed.push({
            time: frame.time,
            light: ctx.services.effectInfluences.get('environmentLight'),
          });
        },
        dispose(): void {},
      }),
    );

    const runtime = new SceneRuntime();
    runtime.load(episode, library);

    observed.length = 0;
    runtime.evaluateAt(2);
    expect(observed.at(-1)).toEqual({ time: 2, light: 0.5 });
    expect(runtime.getEffectInfluences()?.environmentLight).toBe(0.5);

    runtime.evaluateAt(4.5);
    expect(runtime.getEffectInfluences()?.environmentLight).toBe(0);

    runtime.evaluateAt(2);
    expect(observed.at(-1)).toEqual({ time: 2, light: 0.5 });
    expect(runtime.getEffectInfluences()?.environmentLight).toBe(0.5);

    runtime.setLayerEnabled('effects', false);
    runtime.evaluateAt(2);
    expect(observed.at(-1)).toEqual({ time: 2, light: 0 });
    expect(runtime.getEffectInfluences()?.environmentLight).toBe(0);

    runtime.dispose();
  });

  it('lets a layered effect recipe publish a deterministic pulse independently of its geometry', () => {
    const shellContext = {
      event: {
        id: 'insight',
        type: 'effect',
        at: 0,
        duration: 2,
        effect: 'effect.insight.flash',
      },
      seed: 123,
    } as const;

    const instance = createInsightFlash(shellContext as never);
    const bus = new EffectInfluenceBus();
    const ctx: ActionContext = {
      time: 1,
      delta: 0,
      duration: 2,
      normalizedTime: 0.5,
      at: 0,
      localDuration: 2,
      localTime: 1,
      rawLocalTime: 1,
      progress: 0.5,
      active: true,
      phase: 'active',
    };

    bus.beginFrame();
    instance.contributeInfluence?.(ctx, bus);
    const first = bus.snapshot();
    expect(first.screenExposure).toBeCloseTo(0.22);
    expect(first.environmentLight).toBeCloseTo(0.14);
    expect(first.emissiveBoost).toBeCloseTo(0.08);

    bus.beginFrame();
    instance.contributeInfluence?.(ctx, bus);
    expect(bus.snapshot()).toEqual(first);

    instance.dispose();
  });
});
