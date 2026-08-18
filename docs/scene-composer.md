# PF8 — Semantic Scene Composer

PF8 adds a higher-level **authoring/compiler layer** above the executable MindForge episode format.
It is intentionally outside the Engine.

The relationship is:

```text
creative brief / storyboard
        ↓
AI or human director
        ↓
semantic composition JSON
        ↓
@mindforge/composer
        ↓
ordinary EpisodeScript
        ↓
existing validation + Engine runtime
```

The composer has no renderer, model loader, playback clock, LLM dependency, or theme branch. It is a pure deterministic transformation from semantic authoring data into the same `EpisodeScript` that Studio, Player, seeking, and fixed-frame export already use.

## Why this exists

Production episodes should not require an AI to emit a giant list of low-level registry ids and absolute timeline events. PF8 lets an author describe the world and directing beats at a more useful level while keeping the compiled runtime format explicit and inspectable.

PF8 does **not** replace:

- `creative-brief.md`
- `storyboard.json`
- `episode.json`
- `text.json`

A composition file is an optional authoring source that can produce `episode.json`. Teams may keep it, generate it temporarily, or let an AI produce it as an intermediate artifact.

## Example

```json
{
  "schemaVersion": "0.1",
  "id": "example-rain-scene",
  "title": "Example rain scene",
  "duration": 8,
  "world": {
    "preset": "nature",
    "weather": {
      "preset": "heavyRain",
      "parameters": { "intensity": 0.8, "wind": 0.25 }
    },
    "atmosphere": [
      { "preset": "mist", "parameters": { "density": 0.35 } },
      { "preset": "fog", "parameters": { "density": 0.2 } }
    ]
  },
  "actors": [
    { "id": "guide", "character": "observer", "position": [-2, 0, 0] }
  ],
  "props": [
    { "id": "prism", "prefab": "prismDrop", "position": [1.5, 1.1, 0] }
  ],
  "beats": [
    {
      "id": "hook",
      "at": 0,
      "duration": 1.5,
      "intent": "Establish the question and hero object immediately.",
      "actions": [
        { "type": "camera", "shot": "establish", "duration": 1.2 },
        {
          "type": "text",
          "content": "What happens inside the drop?",
          "style": "question",
          "placement": "upper",
          "duration": 1.5
        },
        { "type": "effect", "effect": "insightFlash", "offset": 0.4, "duration": 0.6 }
      ]
    },
    {
      "id": "explain",
      "at": 1.5,
      "duration": 2.5,
      "actions": [
        { "type": "motion", "target": "guide", "motion": "reach", "duration": 1.2 },
        { "type": "objectMotion", "target": "prism", "motion": "spin", "duration": 2.2 }
      ]
    }
  ]
}
```

This compiles into the existing registry-backed structures:

```text
nature
→ environment.compositionStage
→ layer.surface.ground
→ layer.setDressing.nature
→ layer.foreground.nature
→ layer.lighting.daylight

heavyRain → layer.weather.heavyRain
mist      → layer.atmosphere.mist
observer  → character.observer
prismDrop → prefab.prismDrop
reach     → motion.humanoid.reach
establish → camera.establish
```

The semantic source never needs to know Three.js object names, GLTF node names, authored clip names, or theme implementation modules.

## Beats, not giant raw timelines

A beat owns an absolute starting time and groups actions around one directing intent. Actions use an optional relative `offset`.

```json
{
  "id": "payoff",
  "at": 5.2,
  "duration": 1.6,
  "intent": "Reveal the answer in one readable visual change.",
  "actions": [
    { "type": "camera", "shot": "pushIn", "duration": 1.4 },
    { "type": "effect", "effect": "insightFlash", "offset": 0.25, "duration": 0.65 },
    { "type": "audio", "cue": "insight", "offset": 0.3 }
  ]
}
```

The compiler creates stable event ids from the beat and action declaration, e.g. `payoff.camera-1`. There is no random id generation.

## Vocabulary

`DEFAULT_COMPOSITION_VOCABULARY` maps short authoring names to the stable semantic registry ids shared by themes. It includes current production worlds, PF5/PF6 layers, characters, prefabs, motions, effects, cameras, and common audio cues.

The vocabulary is declarative and replaceable. A product can provide its own `CompositionVocabulary` without modifying the Engine.

Explicit dotted registry ids are accepted as an escape hatch for advanced/new capabilities. Prefer semantic aliases for normal AI/human authoring.

## Text sidecars

The production `text.json` workflow remains supported. Pass parsed text entries to `composeEpisode(..., { text })`; `textId` actions then compile into normal timeline text references.

## CLI

Compile to stdout:

```bash
pnpm compose:episode -- path/to/composition.json
```

Compile with a production text sidecar and write `episode.json`:

```bash
pnpm compose:episode -- path/to/composition.json \
  --text path/to/text.json \
  --out path/to/episode.json
```

The CLI validates the compiled registry ids against every registered theme before writing output.

## AI integration boundary

An LLM may generate or revise semantic composition JSON, but AI is **not** part of authoritative playback.

The safe production boundary is:

```text
AI output
→ composition schema validation
→ deterministic compiler
→ EpisodeScript validation
→ registry validation
→ normal MindForge runtime
```

This means an AI can make directing choices without being allowed to create runtime clocks, arbitrary JavaScript, renderer mutations, or theme-specific Engine branches.

## Deliberately deferred

PF8 does not implement:

- automatic screenplay generation
- automatic duration optimization
- automatic shot selection from natural language
- LLM API calls
- autonomous agent loops
- semantic asset search/ranking
- automatic character behavior
- automatic layout solving

Those are authoring/polish opportunities on top of this stable compiler boundary, not requirements for the production foundation.
