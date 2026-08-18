# Visual theme architecture

MindForge episodes describe **meaning and choreography**, not a specific game-art skin.
The same semantic ids must continue to work when the visual theme changes.

Examples:

- `character.observer`
- `prefab.externalHand`
- `prefab.heatEngine`
- `environment.dreamGarden`
- `layer.weather.heavyRain`
- `effect.reaction.burst`
- `motion.humanoid.selfTickle`
- `camera.reactionCloseup`

A visual theme supplies the character, prefab, effect, environment, scene-layer, asset, asset-pack metadata, typography, safe-zone,
and post-processing implementations for those semantic ids. Motions and cameras remain shared by
default so changing a theme does not silently change episode meaning or timing.

## Supported themes

MindForge currently has two production-capable visual systems:

- `voxel` — the default block-built gameplay theme.
- `toybox` — the modular moulded-toy / built-playset theme.

The retired violet/pink prototype is no longer a registered runtime theme. Historical design
files may remain for reference, but production code must not depend on that visual identity.

## Dependency direction

```text
Studio / Player
      |\
      | +--> Themes (presentation values)
      v
   Library ----> Themes ----> theme-owned visual factories
      |
      +--------> Motions / Cameras
      |
      v
    Engine ----> Schema
```

The Engine does **not** know which theme is active. `createLibraryForTheme(themeId)` builds a
normal `CapabilityRegistries` object containing the implementations selected by the theme (including the ordered scene-composition layer registry), and
the Engine executes those registries exactly as before. Asset packs remain theme/build metadata; they organize authored/procedural assets but never become episode-facing Engine capabilities.

## Runtime switching

Studio and Player own theme selection. A theme change is a controlled scene reconstruction:

```text
capture playback state
        ↓
resolve selected Theme
        ↓
build its MindForgeLibrary
        ↓
Engine.reconfigure(registries, postProcessing, rendererPresentation)
        ↓
rebuild the same episode
        ↓
restore timestamp + speed + play/pause state
        ↓
render captions with the selected typography / safe zones
```

The renderer keeps one stable composer chain; generic tone mapping, exposure, shadows, reflection
presentation, and bloom/vignette values are updated when the app reconfigures it. This avoids the
old failure mode where one theme's factories could be active while another theme's renderer or
post-processing presentation remained in use.

A failed switch should restore the previous theme rather than leave the stage half-reconfigured.
Layer flags remain Engine/Studio state and survive the scene rebuild.

## App controls

Studio exposes the actual theme labels in the toolbar selector.

Player supports:

- the on-stage theme button,
- the `T` keyboard shortcut,
- `?theme=voxel` or `?theme=toybox` in the URL.

Switching themes should preserve the current timestamp, playback speed, and paused/playing state.

## Why this boundary exists

Do not add checks such as `if (theme === 'voxel')` or `if (theme === 'toybox')` to the Engine,
timeline, episode JSON, or shared motion code. That would make every future visual skin leak
across the runtime.

Instead, add or change implementations under `packages/themes/` while preserving stable semantic
ids. Episodes should remain reusable across themes.
