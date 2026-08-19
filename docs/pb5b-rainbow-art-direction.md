# PB5B — Rainbow Art Direction

PB5B is a production-quality correction, not a new engine foundation. It takes the reusable Voxel baseline established in PB5A and aligns Artifact 015 with the strongest existing visual references: Artifact 001 (Heat) and Artifact 004 (Cold Battery).

## Reusable additions

- `layer.setDressing.dioramaFrame`: deterministic authored left/right framing built from PB1 trees, bushes and rocks while preserving a clean central storytelling lane.
- Per-scene `intensityScale` / `flashBoost` parameters on `layer.lighting.daylight` so composed outdoor scenes can retain material contrast.
- Segmented block rendering for `effect.light.beam`, `effect.light.refraction` and `effect.light.spectrum`.
- PB1 optical assets retuned to a saturated cyan stepped-water language with emissive energy limited to their optical cores.
- Darker reusable storm-cloud and puddle materials embedded directly in the authored GLBs.

## Art-direction rules

1. Matte world, luminous meaning: grass, stone, bark, foliage and clouds should not glow.
2. Use emission for active systems only: heat, charge, light paths, optical cores and reveal accents.
3. Build scenes as framed dioramas, not unconstrained scatter fields.
4. Preserve a clear hero lane in 9:16 framing.
5. Atmosphere should create depth, not wash the frame toward white.
6. Final payoff effects should own the strongest saturation/value contrast.

## Rainbow application

Artifact 015 uses the reusable diorama frame, lower daylight intensity, fewer/higher clouds, reduced fog/mist/rain wash, two semantic `prefab.storyLight` accents, a smaller cyan hero drop, segmented optics and a larger saturated rainbow payoff.
