import { describe, expect, it } from 'vitest';
import { createLibraryForTheme } from '@mindforge/library';
import { loadEpisodeInput } from './helpers/content';
import { buildOracle, snapshotOracleAt } from './helpers/oracle';

const THEME_IDS = ['voxel', 'toybox'] as const;

function distance(a: number[], b: number[]): number {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  const dz = a[2] - b[2];
  return Math.hypot(dx, dy, dz);
}

describe('Phase 4 contact choreography', () => {
  it.each(THEME_IDS)('keeps the self-tickle hand on the semantic rib in %s', (themeId) => {
    const oracle = buildOracle(
      loadEpisodeInput('artifact-002-prediction'),
      createLibraryForTheme(themeId),
    );
    const snapshot = snapshotOracleAt(oracle, 3.46);

    expect(distance(snapshot.anchors['observer.handRight'], snapshot.anchors['observer.ribRight'])).toBeLessThan(0.09);
  });

  it.each(THEME_IDS)('lands the external finger contact on the same rib in %s', (themeId) => {
    const oracle = buildOracle(
      loadEpisodeInput('artifact-002-prediction'),
      createLibraryForTheme(themeId),
    );
    // First curl peak: 9.02 + (0.72 * 0.25) = 9.20s.
    const snapshot = snapshotOracleAt(oracle, 9.2);

    expect(snapshot.anchors['externalHand.contact']).toBeDefined();
    expect(distance(snapshot.anchors['externalHand.contact'], snapshot.anchors['observer.ribRight'])).toBeLessThan(0.075);
  });

  it('keeps a readable cause-before-reaction delay after external contact', () => {
    const oracle = buildOracle(
      loadEpisodeInput('artifact-002-prediction'),
      createLibraryForTheme('voxel'),
    );

    expect(snapshotOracleAt(oracle, 9.2).face.observer).toBe('neutral');
    expect(snapshotOracleAt(oracle, 9.37).face.observer).toBe('surprised');
  });
});
