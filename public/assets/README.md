# MindForge production assets

URL-backed production assets live under this directory so Studio, Player and deterministic export do not depend on third-party CDNs.

Recommended layout:

```text
assets/
├── voxel/
│   ├── environments/
│   ├── terrain/
│   ├── vegetation/
│   ├── rocks/
│   ├── props/
│   ├── characters/
│   └── fx/
└── toybox/
    └── ...
```

Before registering a GLB/GLTF, follow `docs/model-authoring-standard.md` and run `pnpm inspect:model` plus `pnpm validate:assets`.

## PB1 production baseline

The first authored Voxel packs live in:

```text
voxel/nature/production/
voxel/props/production/
```

They are registered as `pack.voxel.nature-production` and `pack.voxel.optics-production`. See `docs/pb1-production-assets.md`. The checked-in GLBs are production assets; `tools/author-pb1-assets.py` is only an offline source-authoring utility and is never part of runtime playback.
