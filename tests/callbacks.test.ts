import { describe, expect, it } from 'vitest';
import { SceneRuntime } from '@mindforge/engine';
import { createDefaultLibrary } from '@mindforge/library';

/**
 * Post-refactor callback model. Callbacks are NOT part of deterministic
 * `evaluateAt(t)`; they are live forward-crossing events queried via
 * `callbacksInInterval(from, to)`. This suite proves the same semantics the
 * pre-refactor characterization captured (fire once on forward crossing; never
 * on seek, backward, or repeated evaluation), now free of the internal
 * accumulator and never fired by scene evaluation.
 */
const lib = createDefaultLibrary();

const episode = {
  schemaVersion: '0.1',
  id: 'callback-test',
  title: 'Callback Test',
  duration: 3,
  environment: 'environment.cosmicVoid',
  entities: [{ id: 'box', type: 'primitive', geometry: 'box', size: 1 }],
  timeline: [
    { id: 'a', type: 'callback', at: 0.5, name: 'first' },
    { id: 'b', type: 'callback', at: 1.5, name: 'second' },
  ],
};

function loaded(): SceneRuntime {
  const runtime = new SceneRuntime();
  runtime.load(episode, lib);
  return runtime;
}

/** Mirror the Engine's live crossing: fire callbacks in (boundary, now]. */
function stepForward(runtime: SceneRuntime, boundary: number, times: number[]): string[] {
  const fired: string[] = [];
  let from = boundary;
  for (const now of times) {
    if (now > from) {
      for (const cb of runtime.callbacksInInterval(from, now)) fired.push(cb.name);
    }
    from = now;
  }
  return fired;
}

describe('callbacks — live crossing model', () => {
  it('fires each callback once, in order, on forward playback', () => {
    const runtime = loaded();
    // Boundary starts at 0 after load (settled at t=0), as the Engine sets it.
    const fired = stepForward(runtime, 0, [0.3, 0.6, 1.2, 1.6, 2.0]);
    expect(fired).toEqual(['first', 'second']);
  });

  it('does not fire on a backward or zero-width interval (a seek)', () => {
    const runtime = loaded();
    expect(runtime.callbacksInInterval(2.0, 0.5)).toEqual([]); // backward
    expect(runtime.callbacksInInterval(1.0, 1.0)).toEqual([]); // zero width
  });

  it('is a pure query — repeated calls do not consume callbacks', () => {
    const runtime = loaded();
    const first = runtime.callbacksInInterval(0, 1.0);
    const second = runtime.callbacksInInterval(0, 1.0);
    expect(first).toEqual([{ name: 'first', time: 0.5 }]);
    expect(second).toEqual(first);
  });

  it('after a seek, only callbacks strictly after the seek point fire', () => {
    const runtime = loaded();
    // Simulate seek to 1.0 (boundary := 1.0), then play forward to 2.0.
    const fired = stepForward(runtime, 1.0, [1.2, 1.6, 2.0]);
    expect(fired).toEqual(['second']); // 'first' at 0.5 is skipped
  });

  it('evaluateAt never fires callbacks (deterministic state only)', () => {
    const runtime = loaded();
    // Evaluating across the whole timeline must not throw or emit anything;
    // there is simply no fire channel on evaluateAt.
    for (let t = 0; t <= 3; t += 0.1) runtime.evaluateAt(t);
    // Callbacks remain queryable and unchanged afterward.
    expect(runtime.callbacksInInterval(0, 3).map((c) => c.name)).toEqual(['first', 'second']);
  });
});
