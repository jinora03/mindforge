# Production audio workflow

MindForge separates **semantic timing** from **audio asset quality**. Episodes schedule stable cue IDs such as
`audio.sfx.touch` and `audio.voice.prediction.hook`; the Library decides what sound backs those IDs.

## Current policy

- Narration clips bundled in the repo are **reference/placeholder voice**. They exist so timing, seeking,
  captions and export can be tested in a fresh clone.
- SFX and ambience have deterministic stereo fallbacks, but each cue also exposes a preferred production
  MP3 URL. If a production file is present it is used automatically by live preview and offline export.
- Voice automatically ducks music, SFX and ambience. The same ducking policy is used by preview and export.
- Every cue can apply short source fades to avoid clicks and hard edges.

## Replace a cue with a production MP3

Use one command from the repo root:

```bash
pnpm audio:replace -- --cue audio.voice.prediction.hook --file "C:/audio/prediction-hook.mp3"
```

The command copies the file to the registered public asset path and records it in
`packages/audio/src/production-assets.json`.

The same command works for SFX and ambience:

```bash
pnpm audio:replace -- --cue audio.sfx.handWhoosh --file "C:/audio/hand-whoosh.mp3"
pnpm audio:replace -- --cue audio.ambience.garden --file "C:/audio/garden-loop.mp3"
```

For now replacements must be MP3 so semantic cue URLs stay stable. The episode JSON does not change.

## Validation

```bash
pnpm validate:audio
```

This validates required narration assets and any cue marked as production. It intentionally does **not** fail
because reference narration is still present.

Before publishing final content, use the stricter gate:

```bash
pnpm validate:audio:production
```

That fails while any registered narration/SFX/ambience cue still uses reference/fallback audio.

## Mix controls

Studio exposes Master, Voice, SFX, Ambience and Music levels. These exact bus levels are forwarded to the
offline video exporter. During narration, the audio policy lowers the other buses with a short attack and
release rather than letting SFX/ambience compete with speech.

## Narration quality

The runtime does not synthesize final narration. Generate or record a high-quality MP3 with the provider of
your choice, then replace the semantic cue using `pnpm audio:replace`. This keeps MindForge provider-neutral
and avoids coupling deterministic playback/export to a TTS service.
