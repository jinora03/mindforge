# PB6 — Final Polish

PB6 is the first MindForge production pass whose acceptance criteria are primarily visual. It does not add a new foundation layer. It makes Artifact 015 publishable by correcting the concrete weaknesses exposed by the PB5 exports while preserving the reusable Voxel production baseline.

## Production corrections

- **Hero silhouette:** the production raindrop is opaque, saturated and block-built with a broad water body, narrow neck, explicit tip, front-face highlight and tiny emissive optical core.
- **Portrait-aware optics:** the spectrum shot uses an explicit semantic framing point so the droplet and complete color fan fit together in 9:16.
- **Optical effects:** beam/refraction/spectrum use fewer longer blocks, restrained additive halos and contact accents instead of thin dashed debug-like lines.
- **Diorama depth:** the reusable diorama frame adds low stepped background ridges while keeping the center open for optics and the rainbow.
- **Payoff framing:** the final camera is placed far enough in front of the rainbow that the full outer radius fits inside the narrow portrait horizontal FOV.
- **Selective lighting:** story lights accept an optional color parameter; Rainbow uses cool subject emphasis and a warm reveal light rather than lifting the entire world.
- **Atmospheric reveal:** target-relative offsets allow the reveal accent to sit high in the sky.
- **Caption parity:** deterministic video export now scales CSS-authored typography from the logical 360×640 stage into the actual export canvas, preventing tiny 1080×1920 captions.

## Reuse

Every technical correction is reusable. No Rainbow-specific branch exists in Engine, cameras or video export. The new asset shape remains behind the existing `model.prop.prismDrop.production` ID, the diorama depth remains inside the shared layer, and optical behavior remains behind the existing semantic effect IDs.

## Visual gate

PB6 is not accepted because tests pass. The final Artifact 015 preview/export must show a readable hero, unclipped spectrum, intentional diorama depth, restrained glow, phone-readable captions and a full-width rainbow that is visibly the strongest frame.
