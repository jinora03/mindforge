# Bible integration

The current MindForge creative documents (`docs/bibles/`) guide the platform. The **v1 Design Bible is retired**; `MindForge_Visual_Direction_v2.md` is the visual authority. They **guide** the
platform's architecture, library design, and episode creation, but they are **never a runtime
dependency**: the generic Engine does not import, parse, or load the Bible documents. Compiled
runtime code uses the resulting style modules, motion systems, effects, environments, schemas,
and episode content.

## Where each Bible lands

| Bible | Primary implementation areas |
| --- | --- |
| Visual Direction v2 | `packages/themes`, theme-owned prefabs/effects/environments, Studio/Player presentation |
| Motion Bible | `packages/motions`, `packages/cameras`, `packages/effects`, `packages/engine/src/Timeline.ts` |
| Universe Bible | `packages/environments`, `content/scenes`, `content/episodes`, episode metadata, artifact naming |
| Implementation Map | Responsibility assignment and enforcement type (this document) |

## Enforcement types

- **Automatic** — the code, schema, registry, or validator enforces the rule directly.
- **Guided** — shared presets/APIs make the right choice easy; a human still applies judgment.
- **Episode-specific** — depends on the topic, metaphor, or choreography of one episode.
- **Human review** — subjective cinematic quality that cannot be encoded.

## Representative rules

| Rule | Implementation | Enforcement |
| --- | --- | --- |
| Theme-owned palette/materials | `packages/themes` (Voxel in Phase 1) | Automatic / Guided |
| Semantic prefab ids instead of episode-authored mesh trees | Schema + `PrefabRegistry` + theme factories | Automatic / Guided |
| Semantic effect tones instead of global color meanings | Effect event `tone` + theme effect implementation | Guided |
| 9:16 aspect and safe zones | Engine viewport + `style/typography.ts` `SAFE_ZONES` | Automatic / Guided |
| Contours reveal hidden forces (never wallpaper) | Effect APIs require a semantic state (pressure, prediction, heat, …) + episode review | Guided |
| Named contour behaviours (compress, rupture, settle) | Effect parameters/presets | Automatic / Guided |
| Camera reveals information (no passive orbit default) | Camera presets + review | Guided |
| One authoritative time source; deterministic scrub/reset | `PlaybackController`, `Timeline`, effect `reset()` contracts | Automatic |
| Verb-driven motion vocabulary (route, compress, unfold, …) | Motion/effect registry ids + timeline event vocabulary | Automatic / Guided |
| Artifact taxonomy + domains | Zod enums in `packages/schema` (`artifactType`, `domain`) | Automatic |
| Internal artifact name vs. public question title | Episode metadata (`artifactName` vs `title`) | Automatic |
| Reuse geometry/materials/instances; no per-frame allocation | Engine/library performance conventions | Automatic / Guided |
| One dominant idea per frame; unforgettable transformation | Episode design + review | Human review / Episode-specific |
| Logo confirms, not creates, recognition | Review checklist | Human review |

## What cannot be enforced by code

Subjective cinematic quality — composition, "one clear focal point", "recognizable with the
logo removed", pacing feel — is **human review**. The platform makes the correct choices easy
and flags obvious problems (the Implementation Map lists suggested Studio warnings), but it
does not pretend to judge whether a frame is beautiful or a metaphor is apt.

## Guardrails already in place

- The schema rejects non-canon `artifactType`/`domain` values and supports semantic prefab and
  effect-tone vocabulary so production episodes do not need to encode a theme palette.
- The `EpisodeLoader` rejects unknown registry ids, missing entities/anchors, duplicate event
  ids, and unsupported event types — so content cannot silently drift from the library.
- `pnpm generate:catalog` regenerates the library catalog from the actual registrations, so
  documentation cannot drift from code.
