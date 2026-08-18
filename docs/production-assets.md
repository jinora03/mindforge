# MindForge Production Asset Contract

MindForge production visuals may use authored GLB/GLTF models without leaking file layout or node names into episode JSON.

## Ownership boundary

Episode content stays semantic:

```json
{
  "id": "drop",
  "type": "prefab",
  "factory": "prefab.prismDrop"
}
```

The active theme maps that semantic prefab to either procedural geometry or an authored model asset. The Engine never branches on theme ids.

## Asset descriptor

An authored model is described in the theme/library catalogue:

```ts
{
  id: 'model.prop.prismDrop.production',
  kind: 'model',
  url: 'assets/voxel/props/prism-drop.glb',
  anchors: {
    center: 'MF_Anchor_Center',
    input: 'MF_Anchor_Input',
    red: 'MF_Anchor_Red',
  },
}
```

`anchors` maps stable MindForge semantic names to node names authored inside the GLB. Timeline JSON targets `prism.center`, never `MF_Anchor_Center`.

## Authoring rules

- Export GLB/GLTF with transforms intentionally applied and predictable scene scale.
- Use unique node names for any node exposed as a semantic anchor.
- Prefix production anchor nodes with `MF_Anchor_` for easy inspection in Blender/DCC tools.
- Keep decorative mesh node names private; only mapped anchors become part of the MindForge contract.
- Prefer one reusable kit/model over episode-specific one-off assets.
- Do not embed theme meaning in Engine code. Theme factories own which model id implements a semantic prefab/environment.
- Keep environment motion deterministic. Imported meshes are visual assets; Engine time still drives rain, wind, doors, particles, cameras, and other runtime behavior.

## Runtime lifecycle

Production models have an explicit async preload boundary:

```ts
const assets = new BrowserAssetRuntime({ baseUrl: document.baseURI });
const engine = new MindForgeEngine({ registries, assetRuntime: assets });
await engine.prepareAssets();
engine.loadEpisode(episode);
```

Scene construction remains synchronous after preloading. Each `instantiateModel()` call returns a detached clone with independently disposable geometry, materials, and textures, so unloading one episode cannot corrupt another instance or the cached source.

The application owns `BrowserAssetRuntime` and should dispose it when the production session ends. The Engine only consumes it.

## Recommended production layout

```text
public/assets/
└── voxel/
    ├── environments/
    ├── vegetation/
    ├── terrain/
    ├── rocks/
    ├── props/
    ├── characters/
    └── fx/
```

PQ1 adds the loading/ownership foundation only. Existing procedural assets remain valid and require no migration until a production-quality authored replacement is ready.
