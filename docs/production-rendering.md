# MindForge Production Rendering

PQ2 introduces a renderer/material presentation layer that is independent of episode content and theme ids.
Episodes stay semantic; themes provide plain presentation numbers; the Engine applies those numbers to the shared Three.js renderer.

## Renderer contract

`ThemePresentation.renderer` controls:

- tone mapping (`acesFilmic` or `none`),
- exposure,
- shadow enable/type,
- neutral image-based-lighting intensity.

The Engine owns the implementation. Theme packages never reach into `WebGLRenderer` directly and the Engine never branches on `voxel`, `toybox`, or episode ids.

The neutral PMREM reflection environment is not a visible sky. Environment factories still own background, fog, sun direction, weather and world lighting. The reflection field exists so standard/physical materials have a stable specular response in Studio, Player and deterministic export.

## Material contract

Voxel materials keep their original pixel-art colour identity but no longer share one nearly identical matte response. Material families provide restrained defaults for roughness, metalness and reflection response. Callers may still override those values when a specific prop requires it.

Voxel block textures use nearest-neighbour magnification plus mipmapped minification and moderate anisotropy. This keeps close pixels crisp while reducing shimmer during moving cameras and high-resolution exports.

Toybox plastic uses `MeshPhysicalMaterial` clear coat under the same semantic material factory. Transparent production materials default to `depthWrite=false` when partially transparent so panes, rain and liquid surfaces do not punch incorrect depth holes.

## Production rules

1. Episode JSON never specifies renderer or PBR implementation details.
2. Environment factories may choose material families but do not configure the global renderer.
3. Studio, Player and video export must receive the exact same theme renderer presentation.
4. Imported GLB materials participate in the same tone mapping, shadowing and image-based lighting as procedural assets.
5. Renderer upgrades must remain deterministic: no temporal noise, random exposure, or frame-history-dependent effects.
