# MindForge Visual Direction v2

**Status: CURRENT**
**Supersedes:** the visual identity rules in `MindForge_Design_Bible_v1.0.md`.

MindForge is moving away from the violet/pink cosmic-faceted prototype look. The production
visual system is **theme-based game-like 3D**, rendered with Three.js. Episodes describe
meaning and choreography; themes decide how characters, props, environments, effects,
materials, lighting, and semantic visual states look.

## Theme roadmap

1. **Voxel** — primary production theme. Original block-world / voxel gameplay readability:
   chunky characters, block-built environments and props, crisp silhouettes, geometric
   particles, readable lighting, and cinematic game-camera staging.
2. **Toybox** — later alternative theme. Original modular toy/block-character language with
   smoother, playful proportions and expressive animation.

These themes may evoke broad block-game conventions, but MindForge must not copy Minecraft or
Roblox assets, textures, logos, UI, maps, character skins, or other recognizable proprietary
visual material.

## Shared visual principles

- Read instantly on a vertical phone screen.
- Prefer clean silhouettes over anatomical complexity.
- Stage scenes like understandable gameplay, then use cinematic shots for reveals.
- Every major movement/effect should communicate cause → effect.
- Environments are part of the explanation, not decorative wallpaper.
- Characters should be expressive, readable, and slightly exaggerated.
- Avoid visual noise, random particles, and effects that hide the action.
- The same episode should be able to run under another theme without rewriting its meaning.

## Content/theme boundary

Episode content should use semantic ids such as:

- `prefab.externalHand`
- `prefab.heatEngine`
- `effect.reaction.burst` with `tone: "reaction"`
- `effect.informationStream` with `tone: "information"`

Episode content should **not** choose the production mesh construction, theme palette, material,
or game-art skin. Low-level primitives and explicit colors remain available for tooling and
experiments, but reusable production episodes should prefer semantic prefabs and tones.

## Retired assumptions

The following v1 assumptions are no longer MindForge requirements:

- violet/purple as the default character or world color
- pink as the universal reaction/transformation color
- prediction = violet
- reaction = pink
- cosmic violet gradients as the shared background identity
- faceted cosmic geometry as the mandatory production style

A theme may use any palette that serves its own coherent art direction.
