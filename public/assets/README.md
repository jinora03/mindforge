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
