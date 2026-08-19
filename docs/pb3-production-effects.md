# PB3 — Production Effect Baseline

PB3 establishes the first reusable production-grade effect vocabulary used by the Voxel flagship production and available to every MindForge episode.

## Semantic effects

- `effect.light.beam` — layered light core, restrained halo, deterministic scatter, and PF4 light/fog response; Voxel uses rectangular cores and cube particles.
- `effect.light.refraction` — anchor-driven multi-segment optical path; Voxel uses block segments/contact cubes.
- `effect.light.spectrum` — six-band dispersion fan; Voxel uses crisp rectangular bands with thin halos.
- `effect.weather.rainImpact` — deterministic splash particles plus expanding surface ripples.
- `effect.reveal.atmospheric` — localized reveal glow plus PF4 environment-light, fog, wet-reflection, exposure, emissive, and audio-impact influences.
- `effect.optics.rainbowArc` — theme-owned spectral payoff: generic/Toybox may use smooth curves while Voxel uses a deliberately stepped block arc.

## Reuse boundary

The implementation lives in `@mindforge/effects` and is parameterized by theme style. Themes register the same semantic IDs, so episode JSON never contains Voxel/Toybox branches.

These effects are deterministic functions of the Engine-provided `ActionContext`, event parameters, semantic anchors, and per-event seed. They own no playback clock and never use `Math.random()`.

## PB3 does not assemble Rainbow 2.0

PB3 is a reusable effect baseline. The production episode is rebuilt later in PB5 after PB4 establishes the production meadow. Existing Artifact 015 content remains unchanged during this stage.
