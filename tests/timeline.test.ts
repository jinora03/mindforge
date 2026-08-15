import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
  makeActionContext,
  VisibilityTrack,
  PropertyTrack,
  type FrameContext,
  type PropValue,
} from '@mindforge/engine';

const frame = (time: number): FrameContext => ({
  time,
  delta: 0,
  duration: 10,
  normalizedTime: time / 10,
});

describe('makeActionContext', () => {
  it('computes window-local progress and activity', () => {
    const ctx = makeActionContext(frame(3), 2, 4, undefined);
    expect(ctx.localTime).toBeCloseTo(1);
    expect(ctx.progress).toBeCloseTo(0.25);
    expect(ctx.active).toBe(true);
    expect(ctx.phase).toBe('active');
  });

  it('marks before/after phases outside the window', () => {
    expect(makeActionContext(frame(1), 2, 4, undefined).phase).toBe('before');
    expect(makeActionContext(frame(9), 2, 4, undefined).phase).toBe('after');
  });
});

describe('deterministic tracks', () => {
  it('resolves visibility identically regardless of seek direction', () => {
    const object = new THREE.Object3D();
    const track = new VisibilityTrack(object, true, [
      { at: 2, visible: false },
      { at: 6, visible: true },
    ]);

    track.evaluate(5);
    expect(object.visible).toBe(false);
    track.evaluate(7);
    expect(object.visible).toBe(true);
    // Scrub backward: state must reconstruct, not remember.
    track.evaluate(1);
    expect(object.visible).toBe(true);
    track.evaluate(5);
    expect(object.visible).toBe(false);
  });

  it('interpolates a property tween deterministically', () => {
    const object = new THREE.Object3D();
    const base: PropValue = { kind: 'vec3', v: [0, 0, 0] };
    const track = new PropertyTrack(object, 'position', base, [
      {
        at: 0,
        duration: 2,
        easing: undefined,
        from: { kind: 'vec3', v: [0, 0, 0] },
        to: { kind: 'vec3', v: [0, 10, 0] },
      },
    ]);

    track.evaluate(1);
    expect(object.position.y).toBeCloseTo(5);
    track.evaluate(2);
    expect(object.position.y).toBeCloseTo(10);
    // Seeking back returns to the base value exactly.
    track.evaluate(0);
    expect(object.position.y).toBeCloseTo(0);
  });
});
