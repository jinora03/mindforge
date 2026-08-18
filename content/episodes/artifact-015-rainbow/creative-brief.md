# Creative Brief — Artifact 015: The Split — PB5 Rainbow 2.0

**Public title:** _Why does a rainbow appear?_
**Domain:** Signal Ocean · **Artifact type:** Loom · **Duration:** 17.6s (9:16)

## Unforgettable Visual

The signature image is the final rainbow reveal: the camera pulls back from the optical behavior of a single raindrop into a rain-filled meadow as sunlight breaks through the storm and a large, continuous rainbow resolves across the environment. The transition should feel like the microscopic explanation suddenly becoming a real-world phenomenon.

## 1. Production purpose

This is the first flagship assembly after the PF1–PF8 foundation and PB1–PB4 production baselines. The episode must visibly prove that MindForge can combine reusable authored assets, production materials, layered effects, weather and deterministic environment composition into one coherent short.

## 2. The one idea

Sunlight refracts as it enters a raindrop, reflects inside, then refracts again as it leaves. Different wavelengths leave at slightly different angles, and many droplets send those separated colors toward the viewer.

## 3. Production vocabulary

The episode deliberately reuses rather than re-implements:

- PB1 `pack.voxel.nature-production` and `pack.voxel.optics-production`.
- PB2 `layer.utility.productionMaterials` for wet surfaces and optical glass.
- PB3 `effect.light.beam`, `effect.light.refraction`, `effect.light.spectrum`, `effect.reveal.atmospheric`, and `effect.optics.rainbowArc`.
- PF5 heavy rain, mist and fog.
- PB4/PF6 meadow composition layers for clouds, ground, puddles, nature, ground cover and foreground framing.

The Voxel `prefab.prismDrop` should prefer `model.prop.prismDrop.production`; the procedural optical rig remains fallback-only. The many-droplet beat should likewise prefer the PB1 small-droplet asset.

## 4. Visual progression

1. **0–1.45s — Hook:** authored droplet in the production rainy meadow.
2. **1.18–3.6s — Optics macro:** sunlight enters; layered refraction/reflection path becomes readable.
3. **3.3–6.05s — Dispersion:** spectral bands emerge as luminous core + halo, not debug bars.
4. **6.05–7.7s — Angle:** briefly emphasize the wavelength-dependent exit spread.
5. **7.45–10.75s — Scale-up:** one droplet gives way to many authored droplets while camera pulls out.
6. **10.35–17.6s — Payoff:** atmospheric sun break makes the wet meadow/mist react before a continuous landscape rainbow appears.

## 5. Composition rules

- No character; the droplet, light path and weather are the protagonists.
- The hero droplet must not dominate the payoff frame.
- PB4 foreground/midground/background depth remains visible around the hero.
- Spectrum must remain inside portrait framing.
- The final rainbow belongs to the world and should sit behind/among distant environment layers rather than reading like UI.
- Caption clears by 15.93s, leaving the final ~1.7s visually clean.

## 6. What PB5 is not

PB5 is the production assembly, not final cinematic polish. PB6 may still refine camera lenses/paths, exact lighting choreography, effect envelopes, audio and framing after we inspect the real PB5 export.

## 7. Success criteria

- Duration remains under 20 seconds.
- `environment.rainMeadow` is no longer used by Artifact 015.
- No old property-driven `entryBeam` / `refractBeam` / `reflectionBeam` / `exitBeam` animation remains.
- No old prefab rainbow is used for the visible payoff.
- Voxel runtime prefers the PB1 authored hero and small-droplet GLBs when preloaded.
- PB3 layered beam/refraction/spectrum/reveal/rainbow effects are all exercised.
- Rain, mist, wet materials and lighting visibly participate in the final reveal.
- `pnpm check` remains green before PB6 begins.
