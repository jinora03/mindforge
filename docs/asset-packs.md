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

## First production packs — shipped in PB1

PB1 deliberately starts smaller than the original target and proves the complete authored-asset path before expanding:

```text
pack.voxel.nature-production
  4 trees
  3 rocks / rock clusters
  2 bushes
  2 grass clusters
  1 flower cluster
  1 puddle
  3 cloud families

pack.voxel.optics-production
  hero rain droplet
  small rain droplet
  optical prism
```

These are original checked-in GLBs with PF2 provenance and validation. The next asset additions should be driven by the PB4 meadow composition rather than filling an arbitrary quota.

## Why packs are not Engine capabilities

Episodes should not say `use pack.voxel.nature`. They request semantic environments, layers, prefabs, and effects. Theme implementations may draw from whichever pack fulfills that visual need.

This keeps the Engine and episode JSON independent from art-library organization.
