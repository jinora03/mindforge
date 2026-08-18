# MindForge Production Asset Contract

MindForge production visuals may use authored GLB/GLTF models without leaking file layout, vendor naming, or DCC transforms into episode JSON.

PF1 added reusable scene-composition layers. PF2 makes authored assets safe enough for those layers/environments/effects to reuse at scale.

## Ownership boundary

Episode content stays semantic:

```json
{
  "id": "drop",
  "type": "prefab",
  "factory": "prefab.prismDrop"
}
```

The active theme maps that semantic prefab/environment/layer to procedural fallbacks or authored assets. The Engine never branches on theme ids.

## Authored model descriptor

```ts
{
  id: 'model.prop.prismDrop.production',
  kind: 'model',
  url: 'assets/voxel/props/prism-drop.glb',
  anchors: {
    center: 'MF_Anchor_Center',
    input: 'MF_Anchor_Input',
  },
  model: {
    category: 'prop',
    quality: 'hero',
    units: 'meters',
    upAxis: 'Y',
    origin: 'center',
    materialPolicy: 'embedded-pbr',
    budget: MODEL_BUDGET_PRESETS.hero,
  },
  provenance: {
    source: 'original',
    license: 'MindForge original',
  },
}
```

`anchors` maps stable MindForge semantic names to unique authored GLTF node names. Timeline JSON targets `prism.center`, never `MF_Anchor_Center`.

See [`model-authoring-standard.md`](model-authoring-standard.md) for coordinate, material, animation, provenance, and budget rules.

## Asset packs

Themes also publish asset-pack metadata. Existing procedural visuals are explicitly organized into `fallback` packs; a pack may be marked `production` only when every listed asset is authored/provenanced and passes validation.

Pack ids are art-library organization. They never appear in episode JSON and are not Engine capabilities.

See [`asset-packs.md`](asset-packs.md).

## Runtime lifecycle

Production models have an explicit async preload boundary:

```ts
const assets = new BrowserAssetRuntime({ baseUrl: document.baseURI });
const engine = new MindForgeEngine({ registries, assetRuntime: assets });
await engine.prepareAssets();
engine.loadEpisode(episode);
```

PF2 moves semantic contract failure earlier: preload verifies declared anchor nodes and semantic animation clip mappings before scene construction starts.

Each `instantiateModel()` returns:

```text
scene-owned Object3D clone
semantic anchors
cloned authored animation clips
semantic clip map
```

Geometry, materials, textures, skeleton hierarchy, and clips are detached so disposing one episode cannot invalidate another instance or the cached source.

## Import normalization

`model.importTransform` may normalize a third-party/DCC export once at instantiation:

```ts
importTransform: {
  scale: 0.01,
  rotation: [0, Math.PI, 0],
  offset: [0, 0, 0],
}
```

Use this only to normalize the asset. Shot composition, entity placement, and animation remain timeline responsibilities.

## Validation

PF2 adds two commands:

```bash
pnpm inspect:model public/assets/voxel/props/example.glb
pnpm validate:assets
```

`validate:assets` is part of `pnpm check` and validates:

- asset/pack ids and coverage,
- production-vs-fallback maturity,
- model profiles and provenance,
- local bundled model files,
- semantic anchors and animation clips,
- triangle/material/texture budgets,
- missing external `.gltf` dependencies,
- runtime-incompatible compression extensions.

## Recommended production layout

```text
public/assets/
├── voxel/
│   ├── environments/
│   ├── vegetation/
│   ├── terrain/
│   ├── rocks/
│   ├── props/
│   ├── characters/
│   └── fx/
└── toybox/
    └── ...
```

## PF2 deliberately does not fake production art

The existing procedural assets remain fallbacks. PF2 does **not** generate low-detail GLBs and call them authored production models. Its purpose is to make the next real asset pack safe to acquire/create, inspect, register, version, and reuse.
