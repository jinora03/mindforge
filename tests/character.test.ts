import { describe, expect, it } from 'vitest';
import { HUMANOID_ANCHORS } from '@mindforge/engine';
import { createObserver } from '@mindforge/characters';

describe('Observer character', () => {
  const observer = createObserver({ id: 'observer', parameters: {} });

  it('exposes every required anchor', () => {
    for (const anchor of HUMANOID_ANCHORS) {
      expect(observer.getAnchor(anchor), `anchor "${anchor}"`).toBeDefined();
    }
  });

  it('exposes a poseable rig', () => {
    expect(observer.rig).toBeDefined();
    expect(observer.rig?.hasJoint('spine')).toBe(true);
  });

  it('accepts all six face states without throwing', () => {
    for (const state of ['neutral', 'confused', 'focused', 'disappointed', 'surprised', 'laughing'] as const) {
      expect(() => observer.setFace?.(state)).not.toThrow();
    }
  });

  it('resets its rig on beginFrame', () => {
    expect(() => observer.beginFrame?.({ time: 0, delta: 0, duration: 1, normalizedTime: 0 })).not.toThrow();
  });
});
