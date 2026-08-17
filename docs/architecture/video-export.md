# Deterministic Video Export

MindForge exports production video by evaluating the same Engine timeline at fixed timestamps. Export does **not** use `captureStream`, `MediaRecorder`, `requestAnimationFrame`, or real-time recording.

Default production target:

- 1080 × 1920
- 60 FPS
- H.264 / AVC video
- AAC audio
- MP4 container

The exporter creates an isolated, unmounted `MindForgeEngine`, sets an exact pixel render size, loads the selected semantic episode/theme, and seeks to `frameIndex / fps` for every encoded frame. Text is composited using the active theme's typography and safe-zone configuration.

Audio is rendered offline from the same semantic audio cue registry used by browser playback. Procedural SFX, ambience, music, and URL-backed narration are mixed from episode time into one deterministic audio track before encoding.

The Studio's live preview transport is separate from export. Export pauses the live preview only to reduce GPU/audio contention, then restores its timestamp, speed, and play/pause state afterwards.

`mediabunny` provides the browser-side encoding/muxing path used by Studio. H.264 uses the browser encoder when available; `@mediabunny/aac-encoder` is registered only when native AAC encoding is unavailable. The fixed-frame plan and offline audio mix remain separate from that muxing layer so a future headless/FFmpeg backend can reuse the same deterministic timeline model.
