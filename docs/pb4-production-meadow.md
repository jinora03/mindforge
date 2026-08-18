# PB4 — Production Environment Baseline

PB4 is the first production-quality environment composition built from the PF1–PF8 foundation and the PB1–PB3 reusable production vocabulary. It deliberately does **not** add another monolithic `environment.rainyMeadow` implementation.

## Semantic composition

`productionMeadow` compiles to the generic `environment.compositionStage` plus independent layers:

- `layer.world.clouds`
- `layer.surface.ground`
- `layer.surface.puddles`
- `layer.setDressing.nature`
- `layer.setDressing.groundCover`
- `layer.lighting.daylight`
- `layer.foreground.nature`
- `layer.utility.productionMaterials`

Weather remains independent. A rainy production meadow adds PF5 `heavyRain`, `mist`, and `fog`; a dry meadow can omit them or choose different atmosphere later.

## Authored assets

Voxel PB4 consumes the PB1 production pack through the PF2 preload/clone boundary:

- authored trees, bushes and rocks for structural dressing;
- authored grass and flower clusters for ground-cover breakup;
- authored puddles for PB2 wet/reflection response;
- authored storm/broken-cloud families for far-world depth.

If an authored model is unavailable the factory retains an explicit theme fallback. The fallback is never labeled as production art.

## Composition policy

The meadow protects a central hero clearing. Structural nature uses a larger exclusion radius; small ground cover may approach closer without occupying the exact hero position. Foreground nature uses side-frame placement so portrait shots gain parallax without covering the subject.

Clouds live in the `world` role rather than being mixed into normal set dressing. Puddles live in the `surface` role so material response and later rain impacts can treat them as ground-contact surfaces.

## Determinism

Every placement is derived from the PF1 per-layer seed. Playback time does not drive layout generation. Seeking, restarting and fixed-frame export therefore rebuild the same world.

## Visual gate

`pb4-production-meadow-preview` is a 7.5-second development episode with no hero object and no captions. Its only job is to expose the environment under camera motion. PB4 should not be considered visually accepted just because tests pass; inspect the preview in Voxel and confirm foreground/midground/background separation, an open hero stage, readable wet surfaces, and convincing atmospheric depth before PB5 assembles Rainbow 2.0.
