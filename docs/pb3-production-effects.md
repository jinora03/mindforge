# PB3 — Production Effect Baseline

PB3 establishes the first reusable production-grade effect vocabulary used by the Voxel flagship production and available to every MindForge episode.

## Semantic effects

- `effect.light.beam` — layered luminous core, halo, deterministic atmospheric scatter, and PF4 light/fog response.
- `effect.light.refraction` — anchor-driven multi-segment optical path with luminous contact points.
- `effect.light.spectrum` — six-band dispersion fan with independent soft cores and halos.
- `effect.weather.rainImpact` — deterministic splash particles plus expanding surface ripples.
- `effect.reveal.atmospheric` — localized reveal glow plus PF4 environment-light, fog, wet-reflection, exposure, emissive, and audio-impact influences.
- `effect.optics.rainbowArc` — continuous spectral TubeGeometry bands with soft diffusion rather than segmented box strips.

## Reuse boundary

The implementation lives in `@mindforge/effects` and is parameterized by theme style. Themes register the same semantic IDs, so episode JSON never contains Voxel/Toybox branches.

These effects are deterministic functions of the Engine-provided `ActionContext`, event parameters, semantic anchors, and per-event seed. They own no playback clock and never use `Math.random()`.

## PB3 does not assemble Rainbow 2.0

PB3 is a reusable effect baseline. The production episode is rebuilt later in PB5 after PB4 establishes the production meadow. Existing Artifact 015 content remains unchanged during this stage.
