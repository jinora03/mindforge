# PF6 Production Environment Composition

PF6 turns MindForge's PF1 layer stack into reusable world composition. It does
not replace authored environments such as the Rainbow Rain Meadow. It provides
a second path for scenes that should be assembled from reusable capabilities.

## Composition model

A composed scene keeps the generic Engine contract:

```text
environment.compositionStage
+ layer.surface.ground
+ layer.setDressing.nature
+ layer.foreground.nature
+ layer.lighting.daylight
+ PF5 weather / atmosphere
+ actors / props
+ camera / audio
```

The Engine resolves only semantic registry ids. Voxel and Toybox implement the
same ids with different presentation.

## Minimal base environment

`environment.compositionStage` owns only:

- a theme backdrop / sky,
- a background colour,
- a default camera pose.

It deliberately does **not** own terrain, dressing, lighting, rain, fog, or
actors. Those stay composable PF1 layers.

## Production composition layers

PF6 currently establishes these semantic capabilities in both visual themes:

| Semantic id | Role | Purpose |
| --- | --- | --- |
| `layer.surface.ground` | `surface` | Flat stageable ground foundation |
| `layer.setDressing.nature` | `setDressing` | Deterministic mid/background nature placement |
| `layer.foreground.nature` | `foreground` | Side-framing foreground elements |
| `layer.lighting.daylight` | `lighting` | Theme-owned daylight rig with PF4 light response |

PF5 capabilities compose directly with them, for example
`layer.weather.heavyRain`, `layer.atmosphere.mist`, and
`layer.atmosphere.fog`.

## Deterministic placement

Set dressing is generated from PF1's per-layer seed:

```text
episode id + local layer id -> seed -> immutable placement
```

Placement does not depend on frame count, wall-clock time, playback direction,
or `Math.random()`. Rebuilding the same episode/layer produces the same layout.

The field placement keeps a configurable central clear radius so hero actors
and explanatory props have readable staging space. Foreground placement uses
side bands so framing elements do not cover the main subject by default.

Useful parameters include:

```json
{
  "id": "nature",
  "factory": "layer.setDressing.nature",
  "role": "setDressing",
  "parameters": {
    "count": 24,
    "halfWidth": 17,
    "nearZ": -5,
    "farZ": -28,
    "clearRadius": 5.5,
    "minScale": 0.75,
    "maxScale": 1.25
  }
}
```

## PF2 authored-asset bridge

The shared PF6 scatter runtime supports a production-model id per visual
variant. When the active `RuntimeAssetAccess` has that PF2 model preloaded, PF6
instantiates the authored model. Otherwise the theme's declared fallback is
used.

This means a future nature pack can replace fallback geometry without changing
scene semantics:

```text
layer.setDressing.nature
        |
        +-- model.nature.tree.* available -> authored GLB clone
        |
        +-- not available -> explicit theme fallback
```

Fallback instances are marked in `Object3D.userData` with
`mindforgeCompositionSource = "fallback"`. Authored instances are marked
`"authored"` and record their asset id for Studio/debug inspection.

The current repository has no production nature GLBs, so the built-in PF6
Voxel/Toybox nature variants intentionally remain fallback geometry. PF6 is the
composition and integration foundation; it does not claim those placeholders
meet the final art bar.

## PF4 integration

`layer.lighting.daylight` reads PF4's `environmentLight` influence during the
same absolute frame. Lightning/explosion recipes can therefore brighten a PF6
world without the lighting layer knowing what produced the signal.

## What PF6 does not do

PF6 intentionally does not introduce:

- automatic biome generation,
- giant procedural terrain worlds,
- automatic LOD generation,
- navigation meshes,
- character spawning or behavior,
- PF7 character production,
- PF8 AI scene planning,
- fake authored asset packs.

Complex authored hero environments remain valid. PF6 is for scenes that benefit
from reusable composition rather than one-off monolithic environment code.
