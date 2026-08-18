# MindForge Model Authoring Standard (PF2)

PF2 defines the contract an authored GLB/GLTF must satisfy before it replaces a procedural fallback. The goal is to make asset acquisition scalable without letting vendor/DCC quirks leak into episode JSON or the Engine.

## Canonical coordinate contract

Production models declare:

- glTF 2.0 (`.glb` preferred; `.gltf` allowed when all referenced files are bundled),
- metres as scene units,
- +Y as up,
- a declared forward axis for characters (`-Z` preferred),
- an explicit origin policy (`ground-center`, `center`, or `authored`),
- applied transforms where practical.

`model.importTransform` is a one-time vendor/DCC normalization escape hatch. Do not use it for shot staging; episodes/entities still own placement.

## Semantic anchors

Any node exposed to choreography uses a unique authored name with the prefix:

```text
MF_Anchor_
```

Example descriptor:

```ts
{
  id: 'model.prop.telescope.standard',
  kind: 'model',
  url: 'assets/voxel/props/telescope-standard.glb',
  anchors: {
    eyepiece: 'MF_Anchor_Eyepiece',
    lens: 'MF_Anchor_Lens',
  },
  model: {
    category: 'prop',
    quality: 'standard',
    units: 'meters',
    upAxis: 'Y',
    origin: 'ground-center',
    materialPolicy: 'embedded-pbr',
    budget: MODEL_BUDGET_PRESETS.standard,
  },
  provenance: {
    source: 'original',
    license: 'MindForge original',
  },
}
```

Episode JSON targets `telescope.eyepiece`, never the authored node name.

## Animation clips

PF2 also reserves semantic animation ids independently from DCC clip names:

```ts
model: {
  // ...
  clips: {
    idle: 'MF_Idle_A',
    walk: 'MF_Walk_Fwd',
    point: 'MF_Point_Right',
  },
}
```

`BrowserAssetRuntime` validates this mapping during preload and exposes detached semantic clips on the runtime model. PF3 will evaluate these clips deterministically from Engine time.

## Materials

`materialPolicy` is explicit:

- `embedded-pbr`: use the GLB's PBR materials under MindForge renderer/tone-mapping/IBL.
- `theme-remap`: authored geometry is retained, but the theme intentionally replaces material treatment.

Avoid baked lighting and uncontrolled emissive values. Lighting belongs to MindForge scenes/layers.

## Budgets

PF2 ships reusable defaults:

```text
background   20k triangles   4 materials   6 textures
standard     60k triangles   8 materials  12 textures
hero        150k triangles  16 materials  24 textures
```

These are upper guardrails, not targets. Voxel assets should usually be far below them.

## Provenance

Every URL-backed production asset records whether it is:

- `original`,
- `licensed`,
- `public-domain`, or
- `generated`.

Licensed assets must record the license. Keep attribution/source details when required. This prevents a future content library from accumulating assets whose reuse rights are unknown.

## Runtime-supported glTF features

Current `BrowserAssetRuntime` uses the stock `GLTFLoader` without Draco, Meshopt, or KTX2 decoder configuration. PF2 validation therefore rejects authored files requiring:

- `KHR_draco_mesh_compression`,
- `EXT_meshopt_compression`,
- `KHR_texture_basisu`.

If MindForge later adds those decoders, update the validator and runtime together.

## Intake workflow

For every new model:

```text
Acquire/create model
      ↓
Normalize in Blender/DCC if needed
      ↓
Add semantic anchors / named animation clips
      ↓
Export GLB
      ↓
pnpm inspect:model <file>
      ↓
Add AssetDescriptor + provenance + model profile
      ↓
Assign it to an asset pack
      ↓
pnpm validate:assets
      ↓
pnpm check
```

A model is not production-ready merely because Three.js can display it.
