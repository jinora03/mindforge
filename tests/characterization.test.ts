import { describe, expect, it } from 'vitest';
import { createDefaultLibrary } from '@mindforge/library';
import { loadEpisodeInput } from './helpers/content';
import { buildOracle, snapshotOracleAt } from './helpers/oracle';

/**
 * CHARACTERIZATION of current scene-state evaluation for the demo episodes.
 * These assertions lock present behavior before SceneRuntime is extracted; the
 * determinism suite later proves SceneRuntime reproduces them exactly.
 */
describe('characterization — Heat scene state', () => {
  const heat = buildOracle(loadEpisodeInput('artifact-001-heat'), createDefaultLibrary());

  it('opens on the hook with the core present', () => {
    const s = snapshotOracleAt(heat, 0.5);
    expect(s.activeText).toContain('hook');
    expect(s.entities.core).toBeDefined();
  });

  it('reaches the answer + a heated core in the back half', () => {
    const s = snapshotOracleAt(heat, 12.5);
    expect(s.activeText).toContain('answer');
    expect(s.materials.core.emissiveIntensity).toBeGreaterThan(0.15);
  });

  it('is identical when evaluated at the same time twice', () => {
    expect(snapshotOracleAt(heat, 6.2)).toEqual(snapshotOracleAt(heat, 6.2));
  });
});

describe('characterization — Prediction scene state', () => {
  const pred = buildOracle(loadEpisodeInput('artifact-002-prediction'), createDefaultLibrary());

  it('hides the external hand before entry and reveals it after', () => {
    expect(snapshotOracleAt(pred, 1).entities.externalHand.visible).toBe(false);
    expect(snapshotOracleAt(pred, 8.6).entities.externalHand.visible).toBe(true);
  });

  it('drives the face from focused to laughing', () => {
    expect(snapshotOracleAt(pred, 0).face.observer).toBe('focused');
    expect(snapshotOracleAt(pred, 10.5).face.observer).toBe('laughing');
  });

  it('exposes character anchors as world positions', () => {
    const s = snapshotOracleAt(pred, 3);
    expect(s.anchors['observer.handRight']).toBeDefined();
    expect(s.anchors['observer.ribRight']).toBeDefined();
    expect(s.anchors['observer.handRight']).toHaveLength(3);
  });
});
