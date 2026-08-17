# Creator export workflow

MindForge Studio exposes deterministic video export through the **Creator Export** drawer. The UI configures the existing offline renderer; it does not record the live preview.

## Output controls

Creator Export supports:

- presets for YouTube Shorts, YouTube landscape, and square video;
- portrait (9:16), landscape (16:9), and square (1:1) layouts;
- 720p and 1080p output;
- 30 or 60 FPS fixed-frame rendering;
- Standard, High, and Maximum bitrate tiers;
- Auto, MP4, or WebM container selection;
- full-episode, current-storyboard-shot, and custom timeline ranges;
- independent export theme selection (Voxel or Toybox);
- captions on/off;
- Voice, SFX, Ambience, and Music bus inclusion;
- automatic download or manual download when encoding finishes;
- progress phases and cancellation.

`Auto` prefers MP4 (H.264 + AAC). If that combination cannot be encoded by the current browser, export falls back to WebM (VP9 or VP8 + Opus). Explicit MP4/WebM choices fail clearly instead of silently changing format.

## Deterministic range rendering

A clip export still uses exact fixed-frame evaluation. For a range `start → end`, output frame zero evaluates the Engine at `start`, while media timestamps begin at zero. Offline audio is clipped to the same absolute timeline window, including cues that began before the selected range.

The exporter never uses `MediaRecorder`, `captureStream()`, or wall-clock frame timing.

## Theme and mixer independence

Choosing a different export theme builds an isolated theme Library for the export. It does not switch the live Studio preview. Audio bus checkboxes zero only the excluded buses for the offline mix; enabled buses use the current Studio mixer volumes.

## Delivery

When **Download automatically when ready** is enabled, Studio downloads the encoded file immediately after finalization. The completed Blob is also retained for the current Studio session so **Download again** works without re-rendering.
