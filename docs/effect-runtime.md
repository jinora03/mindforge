# PF4 Layered Effect Runtime

PF4 makes an effect more than a standalone mesh. A theme effect factory may now
compose visual layers with normalized **production influence** layers that the
rest of the scene can react to on the same deterministic frame.

## Effect influence bus

The Engine exposes these scalar channels through `SceneServices.effectInfluences`:

- `environmentLight`
- `emissiveBoost`
- `fogScattering`
- `wetReflection`
- `windImpulse`
- `cameraImpulse`
- `screenExposure`
- `audioImpact`

Values are normalized to `0..1`. Multiple active effects add together and clamp
at `1`. The bus is cleared and recomputed from the current absolute Engine time
on every evaluation; it owns no playback clock.

A scene layer can react without knowing which effect produced the value:

```ts
const flash = services.effectInfluences.get('environmentLight');
```

That lets future lightning, explosions, energy impacts, and other recipes reuse
the same environment/fog/wet-surface response infrastructure.

## Deterministic evaluation order

For each `SceneRuntime.evaluateAt(time)`:

1. entity pose / authored animation is evaluated;
2. effect influences are recomputed for `time`;
3. environment and PF1 composition layers update and may read those influences;
4. effect geometry updates;
5. camera state is resolved.

The influence pre-pass is intentional. If an effect begins at `4.0s`, seeking
directly to `4.5s` gives weather/lighting layers the same influence value they
would have received through continuous playback. There is no one-frame lag.

## Layered recipes

`@mindforge/effects` exports `composeEffectLayers()` and
`createEffectInfluenceLayer()` so a semantic effect can be assembled from small
parts while still presenting one normal `EffectInstance` to the Engine.

`effect.insight.flash` is the first converted reference recipe. Its existing
flash geometry is preserved and a separate influence layer emits a deterministic
pulse on `screenExposure`, `environmentLight`, and `emissiveBoost`.

PF4 does **not** require every effect to emit every channel. A recipe contributes
only the responses it semantically needs.

## Phase boundary

PF4 establishes the generic recipe/influence runtime. It deliberately does not
implement PF5 weather systems, lightning weather, wet-surface shaders, automatic
thunder playback, camera-shake policy, or renderer exposure policy. Those later
systems consume PF4 channels rather than forcing the Engine to know what a
storm, explosion, Voxel theme, or Toybox theme means.
