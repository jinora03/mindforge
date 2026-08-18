# PB1 — Production Asset Baseline

PB1 is the first production-quality content pass after the PF1–PF8 foundation. It intentionally adds a **small reusable authored vocabulary** instead of another runtime architecture layer.

## What shipped

### Voxel Nature Core v1

`pack.voxel.nature-production` contains 16 original GLB assets:

- four tree silhouettes: two broad-canopy trees, one pine, one young tree
- three faceted rock variants
- two bush variants
- two grass clusters
- one flower cluster
- one irregular puddle mesh
- two storm-cloud families
- one broken-cloud / sun-opening family

The existing PF6 `layer.setDressing.nature` now prefers the authored tree, bush and rock models when the asset runtime is available. Episode JSON does **not** change. PF6's explicit procedural fallbacks remain available if a production model cannot be instantiated.

Ground cover, puddles and cloud families are registered now for PB4 environment composition; PB1 does not add episode-specific placement rules for them.

### Voxel Optics Core v1

`pack.voxel.optics-production` contains three original GLBs:

- `model.prop.prismDrop.production` — hero rain droplet with a custom faceted teardrop silhouette, inner lens and semantic optics anchors
- `model.prop.rainDropletSmall.production` — reusable smaller droplet
- `model.prop.opticalPrism.production` — reusable triangular glass prism

The hero droplet exposes:

```text
center
input
bend
reflect
exit
red
orange
yellow
green
blue
violet
```

Episode/effect code continues to use those semantic names rather than authored node names.

## Authorship and licensing

All PB1 models are original MindForge assets authored for this repository. They are not Minecraft, Roblox or third-party proprietary assets. Their PF2 provenance is `source: 'original'`.

The source authoring utility is `tools/author-pb1-assets.py`. It is an **offline DCC-like authoring step only**. MindForge never runs it during Studio preview, Player playback or export. The shipped GLBs are normal URL-backed PF2 production assets, not runtime procedural geometry.

The authoring utility uses fixed construction values so rebuilding the source files is reproducible, but this is distinct from the runtime procedural fallback system.

## Material boundary

PB1 includes embedded baseline PBR material assignments so every GLB is self-contained and inspectable. These are deliberately not presented as final surface quality.

PB2 owns:

- wet/dry material response
- bark/leaf/stone surface refinement
- proper optical glass/transmission treatment
- puddle/water response
- storm-cloud shading
- material reaction to PF4 influence channels

PB1's gate is geometry, silhouette, scale, origin, anchors, provenance, budgets and reusable registration.

## Production rules established by this pack

1. A production asset is a real GLB/GLTF file validated through PF2; it is not a runtime `BoxGeometry` assembly.
2. Every model is reusable outside the Rainbow episode.
3. Nature composition requests semantic layers; it does not reference individual GLB file paths.
4. Optical effects target semantic anchors; they do not know authored mesh/node implementation names.
5. Procedural fallbacks remain explicit and are never mislabeled as production assets.
6. PB1 is intentionally small. New assets should be added only when a real production scene demonstrates the need.

## Validation

Run:

```bash
pnpm validate:assets
pnpm vitest run tests/pb1-production-assets.test.ts --reporter=verbose
pnpm check
```

`validate:assets` verifies the real GLB files, semantic anchor nodes, dependency bundling, material/triangle budgets and production-pack declarations.
