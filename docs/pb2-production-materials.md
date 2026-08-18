# PB2 — Production Material Baseline

PB2 turns the first PB1 authored models into a reusable Voxel material vocabulary. It does **not** add a new renderer or move material meaning into the Engine.

## Reusable material response layer

Voxel registers:

```text
layer.utility.productionMaterials
```

The layer recognizes MindForge-authored production material families and evaluates their response from the Engine's current frame plus PF4 influence channels.

A rainy scene can author a stable condition:

```json
{
  "id": "materials",
  "factory": "layer.utility.productionMaterials",
  "role": "utility",
  "parameters": {
    "wetness": 0.85
  }
}
```

`wetness` is a scene condition, not an independent playback clock. The same timestamp and influence snapshot produce the same material state.

## Surface families

PB2 establishes restrained reusable responses for:

- bark
- foliage
- grass / production ground
- flowers
- rock
- storm clouds
- puddle water
- water/droplet optical glass
- prism glass
- optical edge/lens material

Wet vegetation and rock become darker, smoother and more specular, but never turn into mirrors. Clouds intentionally remain highly rough so world flashes illuminate them without making them glossy.

## Physical puddles and optical glass

PB1's embedded placeholder material names are upgraded at runtime to `MeshPhysicalMaterial` when the production-material layer is present.

Puddles use a water-like IOR, clearcoat and the Engine's existing PMREM reflection environment. PF4 `wetReflection` can temporarily lower surface roughness and increase reflection intensity.

Hero rain droplets use water-like IOR/transmission. Optical prisms use a higher glass-like IOR and transmission. The two surfaces therefore no longer share one generic transparent-plastic treatment.

PB2 is still not screen-space or planar reflection. A puddle reflects the environment lighting field, not a second exact render of every nearby tree. True hero planar reflections remain a later production choice only where the shot justifies their cost.

## PF4 response

The layer consumes:

```text
wetReflection
environmentLight
emissiveBoost
```

For example:

```text
Lightning / reveal effect
        ↓
PF4 influence bus
        ↓
wetReflection + environmentLight
        ↓
rock highlight increases
wet leaves catch light
puddle reflection strengthens
optical glass catches the flash
```

The effect never contains `if tree`, `if rock`, or `if puddle` branches. Each material family owns its own response strength.

## Determinism and seeking

PB2 stores no semantic material time and never integrates `delta`. It recomputes material state from:

```text
authored wetness
+
current PF4 influence snapshot
```

Seeking away and back to the same timestamp reconstructs the same values.

## Deliberate limits

PB2 does not add:

- screen-space reflections
- planar reflection cameras
- dynamic cubemap probes per object
- wetness accumulation over time
- snow/dirt accumulation
- global material remapping for third-party assets
- episode-specific Rainbow shading hacks

Those should only be added when a production shot proves they are necessary.

## Validation

Run:

```bash
pnpm vitest run tests/pb2-production-materials.test.ts --reporter=verbose
pnpm check
```
