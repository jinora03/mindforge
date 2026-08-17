# MindForge Production Workflow

MindForge production content is authored as a small package of creative direction plus deterministic runtime data. The runtime should never be the first place an episode idea is designed.

## Episode folder contract

Every production episode lives at:

```text
content/episodes/<episode-id>/
├── creative-brief.md
├── storyboard.json
├── episode.json
└── text.json
```

The responsibilities are intentionally separate:

| File | Responsibility |
| --- | --- |
| `creative-brief.md` | The single idea, unforgettable visual, composition, performance and success criteria. Human creative direction; never loaded by the Engine. |
| `storyboard.json` | Shot/beat timing and review plan. Used by Studio production navigation, not by the Engine as authoritative animation state. |
| `episode.json` | Executable deterministic scene/timeline. This is the runtime source of truth. |
| `text.json` | Caption/narration copy referenced by semantic text IDs. |

The same `episode.json` must remain theme-safe. Voxel and Toybox should render the same semantic content without episode-specific theme branches.

## Recommended production loop

```text
Topic
  ↓
Creative brief
  ↓
Storyboard
  ↓
Review the causal visual sequence
  ↓
Executable episode + text
  ↓
Studio preview
  ↓
Voxel/Toybox review
  ↓
Audio / narration review
  ↓
Deterministic MP4 export
  ↓
Final visual review
```

Do not skip directly from a topic to a dense timeline unless the work is explicitly an architecture prototype.

## Creating a new episode

Use the scaffold command:

```bash
pnpm create:episode -- --id artifact-005-memory --title "Why do memories fade?"
```

Optional arguments:

```bash
--duration 15
--environment environment.dreamGarden
```

The command creates all four production files. Replace the generated `TODO` creative direction before treating the episode as production-ready.

The content catalogue is folder-driven: a complete episode package is discovered automatically by Studio and Player. You do not edit app-local episode lists.

## Production validation

Run:

```bash
pnpm validate:production
```

This checks the production contract rather than rendering/runtime correctness:

- all four files exist;
- the creative brief contains the one idea, unforgettable visual and success criteria;
- storyboard episode/title/duration match `episode.json`;
- storyboard shot IDs are unique;
- shot ranges are valid and collectively cover the full episode;
- storyboard text references exist in `text.json`;
- storyboard text references are actually scheduled by the executable timeline.

Runtime/theme validation remains separate:

```bash
pnpm validate:episodes
```

The full required gate is:

```bash
npm run check
```

which now runs:

```text
lint
→ tests
→ production workflow validation
→ episode/theme/runtime validation
→ typecheck
→ Player build
→ Studio build
```

## Studio production review

Studio exposes the non-runtime production package beside the preview:

- the creative-brief summary and full brief;
- the episode folder path;
- storyboard shots with exact time ranges;
- one-click jump to any shot;
- an active-shot highlight based on authoritative playback time;
- a shot strip above the scrubber for fast visual navigation.

The storyboard is a review/navigation layer only. Clicking a shot seeks the normal Engine. It does not create an independent playback clock.

## What "production-ready" means

Automated validation is necessary but not sufficient. Before exporting a Short, manually verify:

1. **Hook** — the subject/question reads immediately on a phone.
2. **Causality** — each major movement/effect exists because something caused it.
3. **Composition** — the subject occupies enough of the 9:16 frame; no accidental dead space.
4. **Transformation** — at least one visual beat is memorable without captions.
5. **Performance/contact** — character and object interactions visibly connect.
6. **Theme parity** — Voxel and Toybox preserve the explanation.
7. **Seeking** — backward/forward jumps reconstruct the same state.
8. **Audio** — narration/SFX/ambience follow the authoritative timeline.
9. **Export** — MP4 begins at 0, includes the full episode and remains synchronized.

## Architectural boundary

Production tooling may know about briefs and storyboards. The Engine must not.

```text
creative brief / storyboard
        ↓ review + authoring
episode.json + text.json
        ↓
Library + Theme
        ↓
Generic Engine
        ↓
Preview / deterministic exporter
```

This keeps creative workflow improvements from turning into runtime dependencies.

## Studio authoring drawer

Phase 9 adds an **Author** drawer to Studio. It is intentionally a production-layer tool rather than an Engine editor:

- edit storyboard shot start/end, beat, and intent with immediate gap/overlap diagnostics;
- edit text referenced by the selected shot and preview that text through the normal Engine timeline;
- inspect the exact runtime events that start inside a shot, jump to their timestamps, and copy their JSON;
- download `storyboard.json`, `text.json`, or the source `episode.json` after editing.

The browser does not silently write into the repository. Downloaded drafts are explicit artifacts that you replace in `content/episodes/<id>/`, then run the normal validation gate. This keeps the runtime deployable as a static web app while avoiding a hidden filesystem/server dependency in Studio.

To start from an existing visual grammar instead of an empty scaffold:

```bash
pnpm duplicate:episode -- \
  --from artifact-005-lightning-thunder \
  --id artifact-006-metal-cold \
  --title "Why does metal feel colder than wood?"
```

The new folder is automatically discovered. Replace the copied creative direction/content before production, then run `pnpm validate:production && pnpm validate:episodes`.
