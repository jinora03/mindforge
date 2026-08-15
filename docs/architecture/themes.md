# Visual theme architecture

MindForge episodes describe **meaning and choreography**, not a specific game-art skin.
The same semantic ids must continue to work when the visual theme changes.

Examples:

- `character.observer`
- `environment.dreamGarden`
- `effect.reaction.burst`
- `motion.humanoid.selfTickle`
- `camera.reactionCloseup`

A visual theme supplies the character, prefab, effect, environment, asset, typography, safe-zone,
and post-processing implementations for those semantic ids. Motions and cameras remain
shared by default so changing a theme does not silently change episode meaning or timing.

## Dependency direction

```text
Studio / Player
      |\
      | +--> Themes (presentation values)
      v
   Library ----> Themes ----> Characters / Effects / Environments / Style
      |
      +--------> Motions / Cameras
      |
      v
    Engine ----> Schema
```

The Engine does **not** know which theme is active. `createLibraryForTheme(themeId)` builds a
normal `CapabilityRegistries` object containing the implementations selected by the theme,
and the Engine executes those registries exactly as before.

## Why this boundary exists

Do not add checks such as `if (theme === 'voxel')` to the Engine, timeline, episode JSON, or
shared motion code. That would make every future visual skin leak across the runtime.

Instead, add a new theme definition under `packages/themes/` and provide visual variants for
stable semantic ids. Episodes should remain reusable across themes.

## v0.1 state

`legacy` is the only registered theme during the migration and exists solely to keep the two
prototype episodes runnable. It is **not** the target MindForge identity. Phase 1 adds `voxel`
and makes it the production/default theme; `toybox` follows later. New code must not add new
dependencies on the legacy violet/pink palette.
