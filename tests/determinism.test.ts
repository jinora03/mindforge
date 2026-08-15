import { describe, it } from 'vitest';
import { SceneRuntime } from '@mindforge/engine';
import { createDefaultLibrary } from '@mindforge/library';
import { DEMO_EPISODES, loadEpisodeInput } from './helpers/content';
import { buildOracle, snapshotOracleAt } from './helpers/oracle';
import { expectClose } from './helpers/compare';

const lib = createDefaultLibrary();
const TIMES = [0, 0.5, 2.4, 2.95, 6.2, 8.6, 9.3, 10.5, 12.5, 15];

function fresh(id: string): SceneRuntime {
  const runtime = new SceneRuntime();
  runtime.load(loadEpisodeInput(id), lib);
  return runtime;
}

/**
 * Invariants A/B/C/D: evaluating a time fresh, by stepping, after a later time,
 * or repeatedly must all resolve to equivalent deterministic scene state.
 */
for (const id of DEMO_EPISODES) {
  describe(`determinism — ${id}`, () => {
    for (const t of TIMES) {
      it(`A=B=C=D at t=${t}`, () => {
        // A: fresh → evaluateAt(t)
        const a = fresh(id);
        a.evaluateAt(t);
        const snapA = a.snapshot(t);

        // B: fresh → step forward through times → evaluateAt(t)
        const b = fresh(id);
        for (const step of TIMES.filter((x) => x <= t)) b.evaluateAt(step);
        expectClose(b.snapshot(t), snapA);

        // C: fresh → evaluateAt(later) → evaluateAt(t)
        const c = fresh(id);
        c.evaluateAt(15);
        c.evaluateAt(t);
        expectClose(c.snapshot(t), snapA);

        // D: fresh → evaluateAt(t) repeatedly
        const d = fresh(id);
        d.evaluateAt(t);
        d.evaluateAt(t);
        expectClose(d.snapshot(t), snapA);
      });
    }

    it('reproduces the pre-refactor oracle at every sampled time', () => {
      const oracle = buildOracle(loadEpisodeInput(id), lib);
      const runtime = fresh(id);
      for (const t of TIMES) {
        runtime.evaluateAt(t);
        expectClose(runtime.snapshot(t), snapshotOracleAt(oracle, t));
      }
    });
  });
}
