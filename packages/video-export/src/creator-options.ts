export type CreatorExportPresetId = 'youtube-shorts' | 'youtube-landscape' | 'square' | 'custom';
export type CreatorExportLayout = 'portrait' | 'landscape' | 'square';
export type CreatorExportResolution = '720p' | '1080p';
export type CreatorExportFps = 30 | 60;
export type CreatorExportQuality = 'standard' | 'high' | 'maximum';
export type CreatorExportFormat = 'auto' | 'mp4' | 'webm';

export interface CreatorExportPreset {
  readonly id: Exclude<CreatorExportPresetId, 'custom'>;
  readonly label: string;
  readonly layout: CreatorExportLayout;
  readonly resolution: CreatorExportResolution;
  readonly fps: CreatorExportFps;
}

export interface CreatorEncodingSettings {
  readonly width: number;
  readonly height: number;
  readonly fps: CreatorExportFps;
  readonly videoBitrate: number;
  readonly audioBitrate: number;
}

export const CREATOR_EXPORT_PRESETS: readonly CreatorExportPreset[] = [
  {
    id: 'youtube-shorts',
    label: 'YouTube Shorts',
    layout: 'portrait',
    resolution: '1080p',
    fps: 60,
  },
  {
    id: 'youtube-landscape',
    label: 'YouTube Landscape',
    layout: 'landscape',
    resolution: '1080p',
    fps: 60,
  },
  {
    id: 'square',
    label: 'Square',
    layout: 'square',
    resolution: '1080p',
    fps: 60,
  },
] as const;

export function creatorExportPreset(id: Exclude<CreatorExportPresetId, 'custom'>): CreatorExportPreset {
  const preset = CREATOR_EXPORT_PRESETS.find((candidate) => candidate.id === id);
  if (!preset) throw new Error(`Unknown creator export preset "${id}".`);
  return preset;
}

export function resolveCreatorDimensions(
  layout: CreatorExportLayout,
  resolution: CreatorExportResolution,
): { readonly width: number; readonly height: number } {
  const edge = resolution === '1080p' ? 1080 : 720;
  const longEdge = resolution === '1080p' ? 1920 : 1280;
  if (layout === 'portrait') return { width: edge, height: longEdge };
  if (layout === 'landscape') return { width: longEdge, height: edge };
  return { width: edge, height: edge };
}

/**
 * Bitrates are scaled from a 1080x1920 @ 60fps reference so square/720p exports
 * do not waste the same bitrate as a full-resolution Shorts render.
 */
export function resolveCreatorEncodingSettings(options: {
  readonly layout: CreatorExportLayout;
  readonly resolution: CreatorExportResolution;
  readonly fps: CreatorExportFps;
  readonly quality: CreatorExportQuality;
}): CreatorEncodingSettings {
  const { width, height } = resolveCreatorDimensions(options.layout, options.resolution);
  const qualityReference = {
    standard: { video: 7_000_000, audio: 128_000 },
    high: { video: 12_000_000, audio: 192_000 },
    maximum: { video: 20_000_000, audio: 256_000 },
  } as const;
  const reference = qualityReference[options.quality];
  const loadScale = (width * height * options.fps) / (1080 * 1920 * 60);
  const videoBitrate = Math.round(Math.max(2_000_000, reference.video * loadScale));
  return {
    width,
    height,
    fps: options.fps,
    videoBitrate,
    audioBitrate: reference.audio,
  };
}
