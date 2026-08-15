# Architecture overview

MindForge separates **runtime**, **reusable systems**, **content**, and **tools** so that
future episodes are built by combining validated JSON with registered capabilities — never
by re-implementing renderers, cameras, characters, or timelines.

```
                 ┌───────────────┐        ┌───────────────┐
                 │ MindForge     │        │ MindForge     │
                 │ Studio (React)│        │ Player        │
                 └──────┬────────┘        └──────┬────────┘
                        │  create + drive         │  host
                        └───────────┬─────────────┘
                                    ▼
                        ┌──────────────────────┐
                        │  MindForge Engine     │  time · renderer · scene
                        │  (packages/engine)    │  timeline · entities
                        └───────┬───────────────┘
                                │ executes capabilities via
                                ▼
                        ┌──────────────────────┐
                        │  MindForge Library    │  register / lookup by id
                        │  (packages/library)   │
                        └───────┬───────────────┘
                                │
                    ┌───────────┴───────────┐
                    ▼                       ▼
              shared behavior          visual theme
              motions/cameras         packages/themes
                                            │
                              ┌─────────────┼─────────────┐
                              ▼             ▼             ▼
                         characters      effects     environments/style
```

Content (`content/`) references capabilities by **id**; it never imports implementations.

## MindForge Engine (`packages/engine`)

Owns everything generic and content-agnostic:

- WebGL renderer, `THREE.Scene`, perspective camera, `EffectComposer` (controlled bloom +
  vignette), the animation loop, and 9:16 presentation.
- The single authoritative clock (`PlaybackController`): play, pause, resume, restart, seek,
  playback speed.
- Deterministic timeline evaluation (`Timeline`), entity management (`EntityManager`),
  episode loading + validation gate (`EpisodeLoader`), resource disposal.
- The **plugin contract** every library package implements (`EngineTypes.ts`): `FrameContext`,
  `ActionContext`, `Entity`, `PoseableRig`, and the factory/instance interfaces for motions,
  effects, cameras, environments, and characters.

The Engine knows nothing about Heat, Prediction, artifacts, domains, or the Bibles.

## MindForge Library (`packages/library` + component packages)

- `library` holds the registries (`AssetRegistry`, `CharacterRegistry`, `PrefabRegistry`, `MotionRegistry`,
  `EffectRegistry`, `CameraRegistry`, `EnvironmentRegistry`) and builds a library for a theme.
- Shared `motions` and `cameras` keep choreography stable across visual skins.
- `themes` selects character, prefab, effect, environment, asset, typography, safe-zone, and
  post-processing implementations for the same semantic ids.
- `style` is currently a **legacy prototype implementation dependency**. Its violet/pink tokens
  are retired and will be replaced by theme-owned Voxel presentation in Phase 1.

## MindForge Content (`content/`)

Episodes (`episodes/*/episode.json` + `text.json`) and reusable scene presets
(`scenes/*.json`). Content describes environment, entities, motions, effects, camera events,
text, visibility, property changes, and timeline choreography. It creates no renderer, clock,
or infrastructure.

## MindForge Studio & Player (`apps/`)

Thin hosts around one Engine instance. Studio adds React controls and inspection; Player adds
only a clean stage. Neither owns animation behaviour.

## Authoritative time & determinism

Only the Engine's `PlaybackController` owns time. Every runtime system receives a
`FrameContext { time, delta, duration, normalizedTime }` and derives its state from it, so
playback is reproducible under pause, restart, scrubbing, reverse-seek, and slow motion. See
[`dependency-rules.md`](dependency-rules.md) for the allowed dependency directions.

## Visual-theme boundary

`createLibraryForTheme(themeId)` selects a visual skin before runtime construction. Episodes
continue to say `character.observer`, `prefab.heatEngine`, or
`environment.dreamGarden`; they never say how those objects are drawn. The Engine therefore stays unchanged as Voxel, Toybox, or future themes
are added. See [`themes.md`](themes.md).
