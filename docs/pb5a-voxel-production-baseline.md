# PB5A — Reusable Voxel Production Baseline

PB5A makes the visual language already working in **Artifact 001 — Heat** and **Artifact 004 — Cold Battery** the canonical Voxel production baseline. The goal is not to make Rainbow a one-off good-looking scene; the same asset, material and effect language must be reusable by later episodes.

The theme exports the declarative baseline id:

```text
voxel-block-game-v1
```

This metadata is theme-owned. It does not add behavior to the Engine.

## Reference scenes

The reference look is defined by two existing episodes:

- `artifact-001-heat` / `environment.artifactStage`
- `artifact-004-cold-battery` / `environment.cosmicVoid`

Both already demonstrate the desired production language: orthogonal block construction, crisp tiled/pixel surfaces, compact vertical diorama staging, and selective emissive accents that communicate active energy without making the whole world glow.

The reusable semantic anchors from those scenes remain first-class baseline tools:

- `prefab.heatEngine`
- `prefab.informationShard`
- `prefab.storyLight`
- `environment.artifactStage`
- `environment.cosmicVoid`

They are reference implementations, not episode-private objects.

## Geometry rule: block-built first

Voxel production geometry should read as intentionally constructed from blocks at portrait/mobile scale. PB5A re-authors the existing PB1 Nature and Optics GLBs around orthogonal masses instead of soft faceted blobs:

- trees use rectangular trunks and stepped canopy masses;
- bushes use clustered block foliage;
- rocks use stacked orthogonal stone masses;
- grass and flowers use chunky readable stems/blades;
- clouds use clustered rectangular blocks;
- puddles use stepped tile footprints;
- hero/small droplets use stepped block silhouettes;
- the reusable optical prism is a stepped wedge.

These remain real PF2 URL-backed GLBs with the same semantic asset ids, anchors, provenance and production packs. Episodes do not need new model-specific semantics to consume the upgraded art.

## Surface rule: authoring-owned Voxel pixels

Production GLBs carry their Voxel surface with them instead of depending on a later scene-wide material swap:

```text
16 × 16 deterministic embedded texture
nearest magnification
nearest-mipmap minification
repeat wrapping
block-face UVs
rough, readable surface response
```

Bark, foliage, rock, grass, cloud, water and optical families use small reusable pixel-pattern families tinted by each authored material. The procedural world keeps using `blockTexture(...)`; authored GLBs use the same visual grammar without coupling the asset runtime to a global material scanner.

## Emissive rule: semantic accents only

Glow is not the Voxel base material.

Use emissive treatment when it communicates a state or causal story beat, for example:

- heat / active machinery;
- charge / electricity;
- information tokens;
- active signal paths;
- optics/refraction/spectrum;
- a reveal/payoff accent.

Normal grass, bark, stone, clouds and structural architecture remain matte/readable. PB5A intentionally keeps optical halos thin and low-opacity so a bright subject remains special.

## Renderer-safe optics

The old PB2 hero optical materials used high `MeshPhysicalMaterial.transmission`. In the current Three r169 preview/export path that production layer was proven to cause the large black-frame corruption seen in Rainbow.

PB5A therefore makes the Voxel optical contract explicit:

- no screen-space `transmission` for hero droplets/prisms;
- no runtime `MeshPhysicalMaterial` replacement for production optics/puddles;
- embedded pixel surface + alpha transparency for the main optical mass;
- restrained authored emissive response only on optical cores/edges;
- the compatibility material layer never traverses or mutates the live scene.

This is an art-direction choice as well as a compatibility fix: the target is readable stylized block-game optics, not realistic glass.

## Reusable effect language

The existing semantic PB3 ids remain unchanged, but Voxel now renders the key optical effects with block geometry:

- `effect.light.beam` — rectangular light core + thin halo + cube particles;
- `effect.light.refraction` — block path segments and block contacts;
- `effect.light.spectrum` — six rectangular spectral bands;
- `effect.optics.rainbowArc` — stepped block arc segments;
- `effect.weather.rainImpact` and `effect.reveal.atmospheric` remain reusable shared effects.

Toybox can keep its own geometry while consuming the same semantic effect ids.

## Rainbow as first consumer

Artifact 015 remains the first PB1–PB5 production assembly, but PB5A tunes it to consume the baseline instead of defining a private art style:

- authoring-owned production materials;
- lower wetness/fog/mist so block textures stay readable;
- less crowded meadow composition;
- smaller stepped hero droplet;
- restrained world-light influence;
- thicker/crisper block spectrum and rainbow cores.

PB6 should polish camera, timing and audio only after the PB5A visual gate is accepted.

## Validation

Run:

```bash
pnpm vitest run tests/pb1-production-assets.test.ts tests/pb2-production-materials.test.ts tests/pb3-production-effects.test.ts tests/pb4-production-meadow.test.ts tests/pb5-rainbow-assembly.test.ts tests/pb5a-voxel-production-baseline.test.ts --reporter=verbose
pnpm validate:assets
pnpm check
```

Then preview Artifact 015 in Voxel before exporting. The visual acceptance criteria are: clear block-game identity, no black render corruption, readable 16×16 surface language, and glow reserved for the optical/energy story rather than the whole world.
