# Dependency rules

These rules keep the runtime generic, the content declarative, and the creative rules out of
the Engine. They are enforced by package `dependencies` and by code review.

## Allowed

```
Studio ─────┐
            ├──> Engine
Player ─────┘
Engine ─────────> Schema
Library ────────> Themes, Motions, Cameras
Themes ─────────> Characters, Effects, Environments, Style, semantic Prefabs
Applications ──> Library, Content (as data)
Content ───────> Schema ids only (by string; never imports)
```

Component packages (`characters`, `motions`, `effects`, `cameras`, `environments`) depend on
**Engine** for the runtime contract (`FrameContext`, `ActionContext`, `Entity`, `PoseableRig`,
the factory/instance interfaces, `Registry`, `HUMANOID_*`). `characters`, `effects`, and
`environments` also depend on **Style**. This is the intended direction — the Engine is the
kernel that defines the plugin contract; it does not depend on any component package.

## Forbidden

```
Engine → any episode            Engine → any Bible file
Engine → Style / Library / Themes    Motion → Studio
Effect → Player                 Character → a specific episode
Schema → Three.js               Style → episode content
```

## Notes on specific decisions

- **Schema is Three-free.** It validates the MindForge Script shape only; registry-id
  *existence* is checked by the Engine/CLI against the Library, not by the schema.

- **Themes are composition, not runtime state.** A theme chooses character, prefab, effect,
  environment, and presentation implementations for stable semantic ids before an Engine is constructed. The Engine never branches on a theme
  name. See [`themes.md`](themes.md).
- **The Engine never imports the component packages.** The apps build a `MindForgeLibrary`
  (which implements the Engine's `CapabilityRegistries`) and hand it to the Engine.
- **Camera application lives in the Engine.** The Engine owns the authoritative camera, so it
  performs shot *selection* and application. `packages/cameras/CameraDirector` is the reusable
  helper the presets are built from (target resolution, offset interpolation, framing, shake);
  it operates only on Engine types and never touches the renderer.
- **Post-processing config is data.** The current legacy theme still sources bloom/vignette
  numbers from `style`; Phase 1 moves production presentation into the Voxel theme. The app
  passes plain config into the Engine, avoiding `Engine → Theme/Style`.
- **Motions pose characters without depending on `characters`.** The Engine defines
  `PoseableRig`; characters implement it and expose it as `entity.rig`; motions consume it.
- **The Bibles are never a runtime dependency.** Compiled code uses the resulting style
  modules, motion systems, effects, environments, and schemas — not the Markdown.
