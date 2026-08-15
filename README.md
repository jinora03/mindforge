# MindForge

**MindForge** is a reusable, browser-based animation platform for producing cinematic
vertical (9:16) educational videos. It turns invisible ideas into visual artifacts through
a small runtime engine, a library of reusable systems, and validated JSON content — so new
episodes are mostly *composed* rather than re-coded.

> This is the **v0.1 scaffold**: a small but fully working vertical slice that proves the
> architecture. All visuals are procedural (no downloaded models yet).

## Platform hierarchy

| Concept | Folder | Role |
| --- | --- | --- |
| **MindForge Studio** | `apps/studio/` | Development interface: preview, inspect, debug episodes |
| **MindForge Player** | `apps/player/` | Clean playback application |
| **MindForge Engine** | `packages/engine/` | Runtime: renderer, clock, timeline, entities, playback |
| **MindForge Library** | `packages/{library,characters,motions,effects,cameras,environments}/` | Reusable, registered systems |
| **MindForge Themes** | `packages/{themes,style}/` | Swappable visual skins + presentation values |
| **MindForge Content** | `content/` | Episodes and reusable scenes (MindForge Script JSON) |
| **MindForge Assets** | `public/assets/` | Models, animations, audio, textures, fonts (future) |
| **MindForge Docs** | `docs/` | Bibles, architecture, library catalog |
| _MindForge Renderer_ | _(deferred to v0.2)_ | Offline video export |

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
| `pnpm generate:catalog` | Regenerate `docs/library-catalog/` from the code |

## Studio

An episode selector, transport controls (play / pause / restart), a timeline scrubber with
time/duration readout, a playback-speed selector, layer toggles (text, camera, effects,
debug anchors), a clean-preview button, an error panel, and a registry inspector.

## Player

A clean 9:16 stage on a black background. Select an episode with a query parameter:

```
/player/?episode=artifact-001-heat
```

Click to restart; press space to pause/resume.

## Episodes

Episodes are validated **MindForge Script** JSON in `content/episodes/`. Two demonstration
episodes ship in v0.1:

- `artifact-001-heat` — _Why Does Your Computer Get Hot?_ / **The Heat Engine**
- `artifact-002-prediction` — _Why Can't You Tickle Yourself?_ / **The Prediction Engine**

See [`docs/architecture/episode-format.md`](docs/architecture/episode-format.md).

## Visual themes

Episodes use stable semantic ids and do not encode a renderer skin. `packages/themes/` selects
visual implementations for those ids while the Engine stays theme-blind. The original block-built **Voxel** system is now the production/default theme. The retired
violet/pink prototype remains registered temporarily as `legacy` only for migration/debug
comparison. Toybox follows later. See
[`docs/architecture/themes.md`](docs/architecture/themes.md).

## Library IDs

Episodes reference capabilities by stable id (never by import). The authoritative list is
generated into [`docs/library-catalog/`](docs/library-catalog/). Examples:
`character.observer`, `prefab.externalHand`, `prefab.heatEngine`,
`motion.humanoid.walk`, `effect.contour.pressure`, `camera.reactionCloseup`,
`environment.dreamGarden`.

## Assets

`public/assets/` reserves folders for future `.glb` models, baked animation clips, audio,
textures, and fonts. v0.1 registers asset **ids** (see the catalog) but content is
procedural; the motion and asset systems are designed so an episode does not care whether a
motion is procedural TypeScript or a future baked clip.

## Current limitations (v0.1)

- All geometry, characters, and effects are procedural; no `.glb`/audio loading yet.
- No offline video export (MindForge Renderer is deferred to v0.2).
- The Studio is a previewer/inspector — no timeline editing, keyframe editing, or node graphs.
- One character (`character.observer`); the walk cycle is stationary (in-place).

## Tech

pnpm workspaces · Vite · TypeScript (strict) · Three.js + post-processing · Zod · Vitest ·
ESLint · Prettier. React is used **only** in MindForge Studio.
