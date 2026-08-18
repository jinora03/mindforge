import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import {
  SceneRuntime,
  type FrameContext,
  type SceneCompositionLayerBuildContext,
  type SceneCompositionLayerInstance,
} from '@mindforge/engine';
import { createDefaultLibrary } from '@mindforge/library';

class ProbeLayer implements SceneCompositionLayerInstance {
  readonly object3d = new THREE.Group();
  disposed = false;

  constructor(
    readonly id: string,
    readonly offset: number,
    readonly updates: string[],
    readonly disposals?: string[],
  ) {
    this.object3d.name = `probe-layer:${id}`;
  }

  update(ctx: FrameContext): void {
    this.updates.push(`${this.id}@${ctx.time.toFixed(2)}`);
    // Pure absolute-time state: no accumulated delta, no independent clock.
    this.object3d.position.set(this.offset + ctx.time * 2, ctx.normalizedTime, 0);
    this.object3d.rotation.y = ctx.time * 0.1;
  }

  dispose(): void {
    this.disposed = true;
    this.disposals?.push(this.id);
  }
}

const episode = {
  schemaVersion: '0.1',
  id: 'scene-layer-runtime-test',
  title: 'Scene Layer Runtime Test',
  duration: 8,
  environment: 'environment.dreamGarden',
  layers: [
    {
      id: 'weather',
      factory: 'layer.test.probe',
      role: 'weather',
      parameters: { offset: 3 },
    },
    {
      id: 'atmosphere',
      factory: 'layer.test.probe',
      role: 'atmosphere',
      parameters: { offset: 7 },
    },
    {
      id: 'disabled',
      factory: 'layer.test.disabled',
      role: 'foreground',
      enabled: false,
    },
  ],
  entities: [],
  timeline: [],
};

describe('PF1 scene composition layers', () => {
  it('builds, orders, evaluates, exposes, and disposes layers generically', () => {
    const library = createDefaultLibrary();
    const updates: string[] = [];
    const seeds = new Map<string, number>();
    const disposals: string[] = [];
    const instances = new Map<string, ProbeLayer>();

    const factory = (ctx: SceneCompositionLayerBuildContext): ProbeLayer => {
      seeds.set(ctx.id, ctx.seed);
      const offset = typeof ctx.parameters.offset === 'number' ? ctx.parameters.offset : 0;
      const instance = new ProbeLayer(ctx.id, offset, updates, disposals);
      instances.set(ctx.id, instance);
      return instance;
    };

    library.sceneLayers.register('layer.test.probe', factory);
    library.sceneLayers.register('layer.test.disabled', factory);

    const runtime = new SceneRuntime();
    runtime.load(episode, library);

    expect(runtime.getCompositionLayers()).toEqual([
      { id: 'weather', factory: 'layer.test.probe', role: 'weather', enabled: true },
      { id: 'atmosphere', factory: 'layer.test.probe', role: 'atmosphere', enabled: true },
      { id: 'disabled', factory: 'layer.test.disabled', role: 'foreground', enabled: false },
    ]);

    expect(seeds.get('weather')).toBeTypeOf('number');
    expect(seeds.get('atmosphere')).toBeTypeOf('number');
    expect(seeds.get('weather')).not.toBe(seeds.get('atmosphere'));
    expect(instances.has('disabled')).toBe(false);

    updates.length = 0;
    runtime.evaluateAt(2.5);
    expect(updates).toEqual(['weather@2.50', 'atmosphere@2.50']);
    expect(instances.get('weather')?.object3d.position.toArray()).toEqual([8, 0.3125, 0]);
    expect(instances.get('atmosphere')?.object3d.position.toArray()).toEqual([12, 0.3125, 0]);

    const weatherObject = instances.get('weather')?.object3d;
    const first = weatherObject
      ? [...weatherObject.position.toArray(), weatherObject.rotation.y]
      : undefined;
    runtime.evaluateAt(6.75);
    runtime.evaluateAt(2.5);
    expect(
      weatherObject ? [...weatherObject.position.toArray(), weatherObject.rotation.y] : undefined,
    ).toEqual(first);

    runtime.dispose();
    expect(instances.get('weather')?.disposed).toBe(true);
    expect(instances.get('atmosphere')?.disposed).toBe(true);
    expect(instances.has('disabled')).toBe(false);
    expect(disposals).toEqual(['atmosphere', 'weather']);
  });

  it('derives the same per-layer seeds in fresh runtimes', () => {
    const collectSeeds = (): number[] => {
      const library = createDefaultLibrary();
      const seeds: number[] = [];
      library.sceneLayers.register('layer.test.probe', (ctx) => {
        seeds.push(ctx.seed);
        return new ProbeLayer(ctx.id, 0, []);
      });
      library.sceneLayers.register('layer.test.disabled', (ctx) => {
        seeds.push(ctx.seed);
        return new ProbeLayer(ctx.id, 0, []);
      });
      const runtime = new SceneRuntime();
      runtime.load(episode, library);
      runtime.dispose();
      return seeds;
    };

    expect(collectSeeds()).toEqual(collectSeeds());
  });
});
