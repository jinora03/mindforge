# Deterministic Video Export

MindForge exports production video by evaluating the same Engine timeline at fixed timestamps. Export does **not** record the live preview or derive media timing from wall-clock rendering speed.

## Creator pipeline

```text
Creator Export options
        ↓
codec preflight + deterministic range
        ↓
offline semantic audio mix
        ↓
fixed Engine seeks + caption composition
        ↓
MP4 (AVC/AAC) or WebM (VP9/VP8 + Opus)
        ↓
finalize → diagnostics → download
```

Default production target is 1080 × 1920, 60 FPS, H.264/AVC + AAC in MP4. Auto mode prefers that path and falls back to WebM when the browser cannot encode it.

## Reliability rules

- Frame timestamps come only from `createFramePlan`; `validateFramePlan` rejects gaps, overlaps, or a missing final duration before encoding begins.
- Every export creates an isolated Engine and encoder session. Repeated exports never reuse encoder state.
- Success, failure, and cancellation all dispose the isolated Engine and shrink the compositor canvas so large backing stores can be reclaimed.
- Encoder promises attach rejection handlers immediately so simultaneous frame/track failures cannot become unhandled promises.
- Cancellation is checked before expensive stages and on every rendered frame. Container finalization is atomic: cancellation is accepted immediately before finalization, but once mux finalization begins MindForge finishes the valid file instead of discarding completed encoding work.
- Auto codec selection is behind an injectable capability probe and is regression-tested independently from browser WebCodecs.
- The returned artifact contains diagnostics for resolution, codecs, frame count, exact timeline duration, audio/timeline delta, bitrates, output bytes, and phase timings.

## Range semantics

A selected clip keeps **episode time** authoritative while media timestamps begin at zero. For a 3–8 second shot, frame zero evaluates `engine.seek(3)`, while the encoded first frame is timestamped `0`. Offline audio uses the same absolute range and clips/offsets sources accordingly.
