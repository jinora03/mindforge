# Audio architecture

MindForge audio is timeline-driven and follows the Engine's authoritative playback time.
The live browser implementation is `packages/audio`, but the Engine depends only on the
`AudioRuntime` contract in `EngineTypes.ts`.

## Buses

```
Master
├── Voice
├── Music
├── SFX
└── Ambience
```

Episodes never reference file paths. They use semantic cue ids in `audio` timeline events:

```json
{
  "id": "touch-sfx",
  "type": "audio",
  "at": 9.2,
  "cue": "audio.sfx.touch",
  "volume": 0.9
}
```

Narration uses the same event type and can link to the caption it speaks:

```json
{
  "id": "voice-hook",
  "type": "audio",
  "at": 0.4,
  "duration": 2.2,
  "cue": "audio.voice.prediction.hook",
  "textId": "hook"
}
```

The `textId` is validation/synchronisation metadata; the audio runtime still executes one
normal audio event. This avoids a second narration clock.

## Sources

Cue definitions choose a default bus, gain, source and short source fades. Sources can be deterministic
procedural PCM or URL-backed recordings. SFX/ambience may also declare an optional production source;
when that asset is not present, preview and export use the deterministic stereo fallback. Phase 5B ships
reference MP3 narration under `public/assets/audio/voice/`. Those files are replaceable: a human recording
or external TTS render can use the same path/cue id without changing episode semantics.

Both Player and Studio expose the repository root `public/` directory through Vite so
URL-backed cues are included in production builds.

## Voice intelligibility

When a Voice-bus event is active, preview and offline export apply the same ducking policy to ambience,
music, and SFX while leaving Voice at its configured level. Studio exposes Master, Voice, Music, SFX and
Ambience controls so the mix heard during review is the mix forwarded to export.

## Time and seeking

The audio runtime does **not** own an episode clock. `MindForgeEngine` mirrors its
`PlaybackController` transport into the injected audio runtime on:

- load
- play / pause
- restart
- seek
- playback-speed changes
- normal playback ticks

Pausing stops live sources. Resume/seek/restart reconstruct sources at the correct offset
from authoritative episode time. Looping ambience and narration are likewise rebuilt from
the current timeline offset rather than from update history.

URL-backed cues used by an episode are prefetched/decode-requested on episode load so
narration does not begin with an avoidable network/decode delay.

## Deterministic export path

Procedural cues render pure PCM (`AudioPcmData`) for a requested sample rate. URL-backed
voice/music/SFX assets remain normal registered sources. Phase 6's offline renderer can
decode and mix those same semantic cues alongside generated PCM; it does not need to
record Web Audio or browser speech synthesis in real time.

## Production replacement

Production asset status lives in `packages/audio/src/production-assets.json`. Use `pnpm audio:replace` to copy a
high-quality MP3 into the stable cue path and mark that semantic cue as production-ready. `pnpm validate:audio`
checks required assets; `pnpm validate:audio:production` is the strict pre-publish gate. See
[`docs/production-audio.md`](../production-audio.md).
