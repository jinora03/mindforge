# PB5 — Rainbow 2.0 Assembly

PB5 is the first flagship assembly built from the Production Foundation 2.0 and PB1–PB4 reusable production vocabulary. It deliberately changes Artifact 015 rather than adding another isolated test scene.

## Assembly contract

Artifact 015 now uses:

- `environment.compositionStage` rather than the monolithic `environment.rainMeadow`.
- PB4 reusable clouds, ground, puddles, nature, ground cover and foreground layers.
- PF5 heavy rain, mist and fog.
- PB2 `layer.utility.productionMaterials` with wetness enabled.
- PB1 authored hero/small-droplet models when those assets are available.
- PB3 layered `effect.light.beam`, `effect.light.refraction`, `effect.light.spectrum`, `effect.reveal.atmospheric`, and `effect.optics.rainbowArc`.

The procedural Voxel optical prefabs remain explicit fallback paths for renderer-free tests or deployments where the authored GLBs were not preloaded.

## Why the hero prefab keeps its semantic ID

Episode JSON still uses `prefab.prismDrop`. The Voxel implementation now prefers `model.prop.prismDrop.production`, while Toybox and no-asset runtimes retain their existing implementation. This keeps episode semantics stable while improving production art.

The same rule applies to `prefab.rainDropletField`: Voxel assembles the field from independent clones of `model.prop.rainDropletSmall.production` when available.

## Removed old visual path

The visible PB5 episode no longer drives:

- `prism.entryBeam`
- `prism.refractBeam`
- `prism.reflectionBeam`
- `prism.exitBeam`
- six property-scaled spectrum meshes
- the old `prefab.rainbowArc` payoff entity

Those are replaced by PB3 layered effects. The fallback prefab may retain legacy geometry for compatibility, but PB5 production direction does not use it.

## Timing

PB5 is 17.6 seconds:

1. 0–1.45 — rainy-meadow hook.
2. 1.18–3.6 — white-light entry/refraction/reflection.
3. 3.3–6.05 — spectrum reveal.
4. 6.05–7.7 — wavelength-angle emphasis.
5. 7.45–10.75 — many-droplet scale-up.
6. 10.35–17.6 — atmospheric sun break and landscape rainbow payoff.

PB5 is intentionally an assembly gate, not final camera/audio polish. PB6 should be driven by inspection of the actual exported PB5 MP4.

## Gate

Run:

```bash
pnpm vitest run tests/pb5-rainbow-assembly.test.ts tests/production-optics.test.ts --reporter=verbose
pnpm check
```

Then export Artifact 015 in Voxel at 1080×1920 / 60 FPS and inspect the real video. The technical gate alone is insufficient for PB5.
