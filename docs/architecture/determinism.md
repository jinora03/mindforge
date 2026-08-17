# Determinism (Phase 1)

MindForge separates **deterministic scene state** from **playback side effects**.

## `SceneRuntime.evaluateAt(time)`

`packages/engine/src/SceneRuntime.ts` is the single, renderer-free evaluation
path shared by live playback and editor seeking. `evaluateAt(t)` resolves scene
state — pose, motions, properties, visibility, face, environment, effects,
camera, and active text — as a pure function of `t`. It requires no
`WebGLRenderer` / `EffectComposer`, so it runs headlessly in tests.

Invariant (proven in `tests/determinism.test.ts` for both demo episodes):
evaluating a time fresh (A), by stepping forward (B), after a later time (C), or
repeatedly (D) yields equivalent state.

`MindForgeEngine` wraps `SceneRuntime` with the renderer, `PlaybackController`,
and the RAF loop; its public API is unchanged.

## Callbacks are not scene state

`evaluateAt(t)` never fires callbacks. Callbacks are **live forward-crossing
events**: during playback the Engine fires `onCallback` for callbacks in the
open-forward interval `(previousTime, currentTime]` via the pure query
`SceneRuntime.callbacksInInterval`. Seeking, scrubbing backward, and repeated
evaluation of the same time never fire callbacks.

## Runtime RNG contract

Runtime visuals must be reproducible, so deterministic runtime packages must not
call `Math.random()` (enforced by a scoped ESLint rule in `eslint.config.js`;
tooling / editor / app code is exempt). Instead:

- Derive a stable seed from stable identifiers. Effects receive a default
  per-event seed as `EffectBuildContext.seed` (hashed from episode id + event
  id via `hashSeed`).
- Draw values from `createRng(seed)` (`packages/engine/src/rng.ts`).
- Never seed from wall-clock time or frame count.

Effects that are already deterministic through index-based math (e.g. the
Fibonacci-sphere burst) need no change.

## Known non-reproducible-but-non-meaningful state

While an effect is **inactive** it is hidden, and its transform is left at
whatever it last held (history-dependent). This is invisible and therefore not
part of compared scene state — the snapshot records an effect's position only
while it is visible. A future phase may canonicalize hidden-effect transforms
via the existing `EffectInstance.reset()` contract.

## Audio is transport-mirrored side effect state

Live audio is intentionally not part of `SceneRuntime.evaluateAt(t)`: it does not
change scene snapshots. `MindForgeEngine` mirrors the authoritative
`PlaybackController` state into an injected `AudioRuntime` on load, play/pause,
seek, restart, speed changes, and playback ticks. The browser runtime stops and
reconstructs Web Audio sources from the requested episode timestamp instead of
keeping an independent timeline.

Procedural audio cues are also deterministic at the sample level: their PCM
renderers must return the same samples for the same sample rate and may not use
`Math.random()`. This makes the cue layer suitable for the later offline audio
mix used by deterministic video export.
