# MindForge Asset Packs (PF2)

Asset packs organize the visual vocabulary into reusable production sets. They are metadata, not a second runtime registry.

A pack contains stable asset ids and has one of two maturity states:

- `fallback` — may contain current procedural placeholders.
- `production` — every listed asset must be an authored/provenanced production asset.

This lets MindForge migrate gradually without changing semantic episode content.

Example progression:

```text
pack.voxel.worlds-fallback
  model.environment.rainMeadow   procedural
  model.prop.prismDrop           procedural
          ↓
replace descriptors with inspected GLBs
          ↓
pack.voxel.nature-production
  trees / rocks / plants / terrain / props / hero models
```

## First production pack target

The first pack worth sourcing/building should be a small **Voxel Nature Foundation** rather than hundreds of random assets:

```text
8–10 trees
6–8 rocks
6–8 plants / grass clumps
3–4 bushes
3–4 flowers
4–6 terrain/detail modules
2–3 puddle/water-edge props
2–3 cloud/sky-support meshes if useful
```

The pack should emphasize combinations and silhouette variety, not raw asset count.

## Why packs are not Engine capabilities

Episodes should not say `use pack.voxel.nature`. They request semantic environments, layers, prefabs, and effects. Theme implementations may draw from whichever pack fulfills that visual need.

This keeps the Engine and episode JSON independent from art-library organization.
