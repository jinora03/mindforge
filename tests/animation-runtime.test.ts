import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import {
  AnimationTrack,
  MissingAnimationClipError,
  SceneRuntime,
  createModelPrefabFactory,
  type AnimationTrackEvent,
  type RuntimeAssetAccess,
} from '@mindforge/engine';
import { createDefaultLibrary } from '@mindforge/library';

function positionClip(name: string, endX: number): THREE.AnimationClip {
  return new THREE.AnimationClip(name, 1, [
    new THREE.VectorKeyframeTrack('.position', [0, 1], [0, 0, 0, endX, 0, 0]),
  ]);
}

function event(
  clip: THREE.AnimationClip,
  overrides: Partial<AnimationTrackEvent> = {},
): AnimationTrackEvent {
  return {
    id: 'event',
    at: 1,
    duration: 1,
    clip,
    speed: 1,
    loop: false,
    startOffset: 0,
    blendIn: 0,
    blendOut: 0,
    ...overrides,
  };
}

describe('PF3 deterministic animation runtime', () => {
  it('samples an authored clip from absolute time and reconstructs state after backward seeks', () => {
    const root = new THREE.Object3D();
    const track = new AnimationTrack(root, [event(positionClip('Move', 10))]);

    track.evaluate(1.5);
    expect(root.position.x).toBeCloseTo(5);

    track.evaluate(2.5);
    expect(root.position.x).toBeCloseTo(0);

    track.evaluate(1.5);
    expect(root.position.x).toBeCloseTo(5);

    track.dispose();
  });

  it('derives speed, looping, and blend weight from requested time instead of accumulated delta', () => {
    const root = new THREE.Object3D();
    const track = new AnimationTrack(root, [
      event(positionClip('Move', 10), {
        at: 0,
        duration: 3,
        speed: 2,
        loop: true,
        blendIn: 0.5,
      }),
    ]);

    track.evaluate(0.25);
    // Source sample is x=5 at 2x speed, blended 50% from the rest pose.
    expect(root.position.x).toBeCloseTo(2.5);

    track.evaluate(1.25);
    // 2.5 source seconds wraps to the same 0.5-second clip sample.
    expect(root.position.x).toBeCloseTo(5);

    track.evaluate(0.25);
    expect(root.position.x).toBeCloseTo(2.5);

    track.dispose();
  });

  it('connects PF2 semantic model clips to timeline animation events', () => {
    const library = createDefaultLibrary();
    library.prefabs.register('prefab.test.animatedModel', createModelPrefabFactory('model.test.animated'));

    const assets: RuntimeAssetAccess = {
      has: (id) => id === 'model.test.animated',
      instantiateModel: () => {
        const clip = positionClip('WalkCycle', 10);
        return {
          object3d: new THREE.Group(),
          anchors: {},
          animations: [clip],
          clips: { walk: clip },
        };
      },
    };

    const episode = {
      schemaVersion: '0.1',
      id: 'pf3-animation-integration',
      title: 'PF3 Animation Integration',
      duration: 4,
      environment: 'environment.dreamGarden',
      entities: [{ id: 'hero', type: 'prefab', factory: 'prefab.test.animatedModel' }],
      timeline: [
        {
          id: 'hero-walk',
          type: 'animation',
          at: 1,
          target: 'hero',
          clip: 'walk',
        },
      ],
    };

    const runtime = new SceneRuntime();
    runtime.load(episode, library, assets);
    const hero = runtime.getEntities().find((entity) => entity.id === 'hero');
    expect(hero?.animationClips?.walk?.name).toBe('WalkCycle');

    runtime.evaluateAt(1.5);
    expect(hero?.object3d.position.x).toBeCloseTo(5);

    runtime.evaluateAt(3);
    expect(hero?.object3d.position.x).toBeCloseTo(0);

    runtime.evaluateAt(1.5);
    expect(hero?.object3d.position.x).toBeCloseTo(5);
    runtime.dispose();
  });

  it('fails clearly when semantic JSON requests a clip the target does not expose', () => {
    const library = createDefaultLibrary();
    library.prefabs.register('prefab.test.static', () => ({ object3d: new THREE.Group() }));
    const runtime = new SceneRuntime();

    expect(() =>
      runtime.load(
        {
          schemaVersion: '0.1',
          id: 'pf3-missing-clip',
          title: 'PF3 Missing Clip',
          duration: 2,
          environment: 'environment.dreamGarden',
          entities: [{ id: 'prop', type: 'prefab', factory: 'prefab.test.static' }],
          timeline: [
            {
              id: 'bad-animation',
              type: 'animation',
              at: 0,
              target: 'prop',
              clip: 'walk',
            },
          ],
        },
        library,
      ),
    ).toThrow(MissingAnimationClipError);
  });

  it('rejects non-positive animation speed at the schema boundary', () => {
    const library = createDefaultLibrary();
    library.prefabs.register('prefab.test.static', () => ({ object3d: new THREE.Group() }));
    const runtime = new SceneRuntime();

    expect(() =>
      runtime.load(
        {
          schemaVersion: '0.1',
          id: 'pf3-invalid-speed',
          title: 'PF3 Invalid Speed',
          duration: 2,
          environment: 'environment.dreamGarden',
          entities: [{ id: 'prop', type: 'prefab', factory: 'prefab.test.static' }],
          timeline: [
            {
              id: 'bad-speed',
              type: 'animation',
              at: 0,
              target: 'prop',
              clip: 'walk',
              speed: 0,
            },
          ],
        },
        library,
      ),
    ).toThrow(/speed/i);
  });
});
