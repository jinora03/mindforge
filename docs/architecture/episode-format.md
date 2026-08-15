# MindForge Script (episode format)

A **MindForge Script** is a Zod-validated JSON document describing one episode. Validation
lives in `packages/schema`; registry-id resolution happens in the Engine's `EpisodeLoader`.

## Episode fields

| Field | Type | Notes |
| --- | --- | --- |
| `schemaVersion` | `"0.1"` | Required; must match the current version. |
| `id` | string | Required, unique. |
| `title` | string | Required. Public, searchable question title. |
| `artifactName` | string? | Lore name, e.g. `"The Prediction Engine"`. |
| `artifactNumber` | int? | Optional continuity device. |
| `artifactType` | enum? | `core \| engine \| loom \| gate \| mirror \| garden \| well \| archive \| crown \| labyrinth`. |
| `domain` | enum? | `crucible \| signal-ocean \| archive \| dream-garden \| gravity-well \| choice-labyrinth`. |
| `duration` | number | Required, seconds. |
| `environment` | id | Required registry id, e.g. `environment.dreamGarden`. |
| `entities` | Entity[] | Scene contents (see below). |
| `timeline` | Event[] | Choreography (see below). |
| `text` | TextDef[]? | Usually supplied by the sidecar `text.json` and merged by the app. |
| `metadata` | object? | Free-form (concept, beats, …). |

## Entity types

Every entity has an `id` and `type`, plus optional `position`, `rotation`, `scale`, `visible`.

- **`character`** — `factory` (e.g. `character.observer`), optional `parameters`.
- **`primitive`** — `geometry` (`box | sphere | icosahedron | cylinder | cone | torus | prism | plane`),
  `size`, `color`, `emissive`, `emissiveIntensity`, `roughness`, `metalness`, `opacity`,
  `flatShading`.
- **`group`** — `children: Entity[]` (recursive). Group children are exposed as anchors keyed
  by child id (e.g. target `machine.core`).
- **`light`** — `light` (`ambient | directional | point | hemisphere`), `color`, `intensity`, …

Entity ids must be globally unique (including nested children).

## Timeline event types

Every event has `id`, `type`, and `at` (seconds). Optional shared fields: `duration`, `delay`,
`easing`, `intensity`, `repeat`, `parameters`.

| `type` | Key fields | Meaning |
| --- | --- | --- |
| `motion` | `target`, `motion`, `mirror?`, `speed?` | Pose a character rig. |
| `objectMotion` | `target`, `motion`, `axis?`, `from?`, `to?` | Animate an object transform. |
| `effect` | `effect`, `target?`, `from?`, `to?`, `through?`, `color?` | Spawn a reusable effect. |
| `camera` | `preset`, `target?`, `from?`, `to?`, `fov?`, `framingOffset?`, `shake?` | Frame the shot. |
| `text` | `textId?` or `content`, `style?`, `placement?` | Caption overlay. |
| `visibility` | `target`, `visible` | Show/hide, resolved by governing event. |
| `property` | `target`, `property`, `to`, `from?` | Tween position/rotation/scale/opacity/color/emissiveIntensity/intensity. |
| `face` | `target`, `state` | Set a character expression. |
| `callback` | `name` | Edge-triggered hook (forward playback). |

Anchor references use `entityId.anchorName` (e.g. `observer.handLeft`) or just `entityId`.
`easing` is one of `linear`, `easeIn`, `easeOut`, `easeInOut`, `easeInOutCubic`,
`easeInOutSine`, `easeOutBack`, `easeOutElastic`.

## Example

```json
{
  "schemaVersion": "0.1",
  "id": "artifact-002-prediction",
  "title": "Why Can't You Tickle Yourself?",
  "duration": 15,
  "environment": "environment.dreamGarden",
  "entities": [
    { "id": "observer", "type": "character", "factory": "character.observer", "position": [0, 0, 0] }
  ],
  "timeline": [
    { "id": "self-tickle", "at": 1.2, "duration": 5, "type": "motion", "target": "observer", "motion": "motion.humanoid.selfTickle" },
    { "id": "prediction", "at": 2.4, "duration": 2, "type": "effect", "effect": "effect.signal.prediction", "through": ["observer.head", "observer.handLeft"] },
    { "id": "reaction-cam", "at": 5, "duration": 6, "type": "camera", "preset": "camera.reactionCloseup", "target": "observer" }
  ]
}
```

## Validation errors

`pnpm validate:episodes` (and the Studio error panel) report:

- **Schema errors** with a path, e.g. `timeline[3].motion: must be a dotted registry id`.
- **Duplicate timeline event ids** — hard failure.
- **Unknown registry ids** — e.g. `Unknown motion id "motion.humanoid.moonwalk"
  (episode="…", event="…", id="…")`.
- **Missing entities / anchors** — the error lists the available anchors.
- **Unsupported schemaVersion**, **duplicate entity ids**, and **empty text events**.

Errors always carry the ids that make them actionable (episode, event, entity, registry).
