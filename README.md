# MindForge

**MindForge** is a reusable, browser-based animation platform for producing cinematic
vertical (9:16) educational videos. It turns invisible ideas into visual artifacts through
a small runtime engine, a library of reusable systems, and validated JSON content — so new
episodes are mostly *composed* rather than re-coded.

> This is the **v0.1 scaffold**: a small but fully working vertical slice that proves the
> architecture. Current bundled theme visuals are still procedural fallbacks, but authored GLB/GLTF loading, validation, semantic anchors/clips, and asset-pack metadata are production-ready.

## Platform hierarchy

| Concept | Folder | Role |
| --- | --- | --- |
| **MindForge Studio** | `apps/studio/` | Development interface: preview, inspect, debug episodes |
| **MindForge Player** | `apps/player/` | Clean playback application |
| **MindForge Engine** | `packages/engine/` | Runtime: renderer, clock, timeline, entities, playback |
| **MindForge Library** | `packages/{library,characters,motions,effects,cameras,environments,audio}/` | Reusable, registered systems |
| **MindForge Themes** | `packages/{themes,style}/` | Swappable visual skins + presentation values |
| **MindForge Content** | `content/` | Episodes and reusable scenes (MindForge Script JSON) |
| **MindForge Assets** | `public/assets/` | Models, animations, audio, textures, fonts (future) |
| **MindForge Docs** | `docs/` | Bibles, architecture, library catalog |
| **MindForge Renderer** | `packages/video-export/` | Deterministic creator video export |

## The Bibles

The creative source of truth lives in [`docs/bibles/`](docs/bibles/):

- `MindForge_Design_Bible_v1.0.md` — palette, geometry, contours, materials, typography
- `MindForge_Motion_Bible_v1.0.md` — motion grammar, camera, pacing, choreography
- `MindForge_Universe_Bible_v1.0.md` — domains, artifacts, the Observer, lore boundaries
- `MindForge_Bible_Implementation_Map_v1.0.md` — which subsystem implements which rule

The Bibles **guide** the code; the Engine never loads or parses them at runtime. See
[`docs/architecture/bible-integration.md`](docs/architecture/bible-integration.md).

## Install & run

```bash
pnpm install
```

```bash
pnpm dev
```

`pnpm dev` starts **MindForge Studio** (http://localhost:5173).

| Command | What it does |
| --- | --- |
| `pnpm dev` / `pnpm dev:studio` | Run MindForge Studio |
| `pnpm dev:player` | Run MindForge Player (http://localhost:5174) |
| `pnpm build` | Typecheck, then build Player and Studio |
| `pnpm typecheck` | Type-check the whole workspace |
| `pnpm lint` | ESLint |
| `pnpm test` | Vitest |
| `pnpm validate:episodes` | Validate all content against schema + registry |
| `pnpm validate:assets` | Validate model descriptors, packs and authored GLB/GLTF files |
| `pnpm inspect:model <file>` | Inspect GLB/GLTF nodes, clips and budgets before registration |
| `pnpm generate:catalog` | Regenerate `docs/library-catalog/` from the code |

## Studio

An episode selector, transport controls (play / pause / restart), a timeline scrubber with
time/duration readout, a playback-speed selector, audio mixer controls, layer toggles (text, camera, effects,
debug anchors), a clean-preview button, an error panel, a registry inspector, and a Creator Export drawer
with layout, resolution, FPS, range, theme, caption, audio-bus, quality, format, and download controls.

## Player

A clean 9:16 stage on a black background. Select an episode with a query parameter:

```
/player/?episode=artifact-001-heat
```

Click to restart; press space to pause/resume. Press `M` or use the on-stage sound button to mute/unmute. Press `T` (or use the on-stage theme button) to switch between Voxel and Toybox without losing the current playback position. The Player also accepts `?theme=voxel` or `?theme=toybox`.

## Episodes

Episodes are validated **MindForge Script** JSON in `content/episodes/`. Two demonstration
episodes ship in v0.1:

- `artifact-001-heat` — _Why Does Your Computer Get Hot?_ / **The Heat Engine**
- `artifact-002-prediction` — _Why Can't You Tickle Yourself?_ / **The Prediction Engine**

See [`docs/architecture/episode-format.md`](docs/architecture/episode-format.md).

## Visual themes

Episodes use stable semantic ids and do not encode a renderer skin. `packages/themes/` selects
visual implementations for those ids while the Engine stays theme-blind. **Voxel** is the
production/default block-world theme and **Toybox** is the fully-supported modular-toy
alternative. Studio can switch themes from its toolbar; Player can switch in place with the
on-stage control or `T`. Theme changes rebuild the same episode while preserving timestamp,
play/pause state, speed, typography/safe zones, and renderer post-processing. See
[`docs/architecture/themes.md`](docs/architecture/themes.md).

## Library IDs

Episodes reference capabilities by stable id (never by import). The authoritative list is
generated into [`docs/library-catalog/`](docs/library-catalog/). Examples:
`character.observer`, `prefab.externalHand`, `prefab.heatEngine`,
`motion.humanoid.walk`, `effect.contour.pressure`, `camera.reactionCloseup`,
`environment.dreamGarden`, `audio.sfx.reaction`.

## Audio

MindForge audio uses semantic timeline cues with Master / Voice / Music / SFX / Ambience buses.
Production audio supports URL-backed narration, deterministic stereo SFX fallbacks, optional production
asset overrides, source fades, and voice ducking shared by preview and offline export. Browser playback
is reconstructed from Engine time after pause, seek, restart, and speed changes. See
[`docs/architecture/audio.md`](docs/architecture/audio.md) and [`docs/production-audio.md`](docs/production-audio.md).

## Assets

`public/assets/` is the local production-asset root. Theme descriptors may replace procedural fallbacks with inspected `.glb`/`.gltf` models while episodes continue to target stable semantic prefab/environment/layer ids. PF2 adds model coordinate/material/budget/provenance rules, semantic anchor and animation-clip mappings, asset packs, `pnpm inspect:model`, and `pnpm validate:assets`. See [`docs/production-assets.md`](docs/production-assets.md) and [`docs/model-authoring-standard.md`](docs/model-authoring-standard.md).

## Production workflow

Production episodes use a four-file package: `creative-brief.md`, `storyboard.json`, `episode.json`, and `text.json`. Studio discovers complete episode folders automatically and exposes storyboard shot navigation beside the deterministic preview.

Create a new scaffold with:

```bash
pnpm create:episode -- --id artifact-005-topic --title "Why does this happen?"
```

Validate creative/shot structure with `pnpm validate:production`; the full `npm run check` gate includes this automatically. See [`docs/production-workflow.md`](docs/production-workflow.md) — includes the Studio Author drawer, four-file workflow, and episode duplication/scaffolding tools.

The current 14-video production content sprint is defined in [`docs/production-slate-006-019.md`](docs/production-slate-006-019.md), with reusable-asset sequencing in [`docs/content-sprint-implementation-plan.md`](docs/content-sprint-implementation-plan.md).

## Current limitations (v0.1)

- Bundled Voxel/Toybox model descriptors still resolve to procedural fallbacks; PF2 now provides the authored GLB/GLTF contract and validation pipeline, but the first curated production model pack is not bundled yet. Demo SFX/reference narration likewise remain replaceable production assets.
- Deterministic browser video export is available through Studio Creator Export, with MP4/WebM selection, portrait/landscape/square layouts, 720p/1080p, 30/60 FPS, range controls, captions, audio buses, and quality presets. See [`docs/creator-export.md`](docs/creator-export.md).
- The Studio is a previewer/inspector — no timeline editing, keyframe editing, or node graphs.
- One character (`character.observer`); the walk cycle is stationary (in-place).

## Tech

pnpm workspaces · Vite · TypeScript (strict) · Three.js + post-processing · Zod · Vitest ·
ESLint · Prettier. React is used **only** in MindForge Studio.
