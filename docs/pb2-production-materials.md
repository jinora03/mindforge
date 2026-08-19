# PB2 — Production Material Baseline

PB2 defines the reusable material vocabulary for authored Voxel production assets. PB5A tightened the ownership rule after the Rainbow render regression: **production assets own their baseline surface at authoring time**. The Engine and scene-composition runtime do not scan the live scene and swap materials after attachment.

## Compatibility layer

Voxel still registers:

```text
layer.utility.productionMaterials
```

Existing episodes and composer output can keep this semantic layer id, but the Voxel implementation is intentionally inert. It does not traverse `Scene`, replace materials, or mutate PF2 model instances.

This removes a renderer-sensitive lifecycle path that was proven to corrupt both Studio preview and fixed-frame export when the layer was enabled.

## Authoring-owned surfaces

The PB1/PB5A GLBs now embed their reusable Voxel surface directly:

- 16 × 16 deterministic pixel textures;
- nearest magnification and nearest-mipmap minification;
- repeat wrapping;
- embedded textures only — no remote/external texture dependency;
- rough matte bark, foliage, grass, flower, rock and cloud materials;
- safe alpha puddle/droplet/prism materials;
- restrained emissive optical-core accents only where the story calls for energy/optics.

This means a production model is already visually valid immediately after `BrowserAssetRuntime.instantiateModel(...)`. It does not depend on an unrelated utility layer running later in the frame.

## Renderer-safe optics

Hero droplets and prisms deliberately avoid `KHR_materials_transmission` and Three.js screen-space transmission. Their look comes from block geometry, embedded pixel surface, alpha transparency, and a restrained emissive core/edge.

Puddles are also authored without a runtime physical-material replacement. The production baseline prioritizes deterministic preview/export parity over realistic glass simulation.

## Wetness and PF4

PB2 originally used `wetReflection`, `environmentLight`, and `emissiveBoost` to mutate live materials. That dynamic response is intentionally suspended for the Voxel production-asset path because the scene-wide mutation layer was the confirmed render-corruption boundary.

Weather, light and reveal effects still influence the world through their own reusable PF4/PB3 visuals. If dynamic wet-surface response is reintroduced later, it must be implemented at explicit asset/material ownership boundaries rather than by traversing the complete live scene.

## Deliberate limits

PB2/PB5A does not add:

- scene-wide material remapping;
- screen-space transmission;
- planar reflection cameras;
- dynamic cubemap probes per object;
- wetness accumulation;
- third-party asset auto-restyling;
- episode-specific Rainbow material hacks.

## Validation

Run:

```bash
pnpm vitest run tests/pb1-production-assets.test.ts tests/pb2-production-materials.test.ts --reporter=verbose
pnpm validate:assets
pnpm check
```
