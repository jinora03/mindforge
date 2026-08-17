# Creative Brief — Artifact 006: The Conductor

**Public title:** _Why does metal feel colder than wood?_
**Domain:** Crucible · **Artifact type:** Mirror · **Duration:** 26s (9:16)

## 1. The one idea

Metal and wood sitting in the same room can be at the same temperature, yet metal usually feels colder because metal conducts thermal energy away from skin much faster. The viewer should leave understanding that the sensation is mainly about **heat-flow rate**, not metal secretly having a lower temperature.

## 2. The unforgettable visual

The same hand reaches toward two samples. A dense, fast stream of heat packets races from the hand into metal and lights the metal sample quickly. The wood comparison uses a visibly sparse, slow stream. The side-by-side difference is the explanation even with captions hidden.

## 3. Composition

- Stage both samples on the reusable material-lab bench so they are always visually comparable.
- Keep the metal on one side and wood on the other for the entire episode; do not swap their screen positions.
- During the transfer beats, keep the hand, sample and packet stream visible in the same frame.
- Both Voxel and Toybox should communicate material identity through theme-owned construction rather than text labels baked into geometry.

## 4. Performance / transformation

The Observer starts puzzled, reaches toward the samples, and settles into a focused expression as the heat-flow comparison becomes obvious. The performance should support the science rather than turn into a comedic reaction.

## 5. Text strategy

This production pass is caption-led until a publish-quality narrator is imported. Keep lines short enough to read during the visual comparison. The narration script should preserve the same structure: same temperature → fast metal transfer → slower wood transfer → sensation explained.

## 6. Reusable production assets

This episode establishes `environment.materialLab`, `prefab.materialSamples`, `audio.ambience.lab`, `audio.sfx.materialTap`, and `audio.sfx.heatTransfer`. These are intentionally generic enough for future magnetism, conductivity, density and material-comparison episodes.

## 7. Success criteria

- The viewer understands that the samples may be the same temperature.
- The faster metal heat stream is unmistakably faster/denser than the wood stream.
- The answer remains understandable with captions disabled.
- Voxel and Toybox both preserve the same semantic sample anchors and heat-transfer timing.
- The episode exports cleanly at 26 seconds in full and shot-range modes.
