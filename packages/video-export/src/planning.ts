export const DEFAULT_EXPORT_WIDTH = 1080;
export const DEFAULT_EXPORT_HEIGHT = 1920;
export const DEFAULT_EXPORT_FPS = 60;
export const DEFAULT_VIDEO_BITRATE = 12_000_000;
export const DEFAULT_AUDIO_BITRATE = 192_000;
export const DEFAULT_AUDIO_SAMPLE_RATE = 48_000;

export interface ExportFrame {
  readonly index: number;
  readonly timestamp: number;
  readonly duration: number;
  readonly keyFrame: boolean;
}

/** Exact fixed-frame plan. It never derives timestamps from wall-clock time. */
export function createFramePlan(duration: number, fps = DEFAULT_EXPORT_FPS): ExportFrame[] {
  if (!Number.isFinite(duration) || duration <= 0) throw new Error('Export duration must be > 0.');
  if (!Number.isFinite(fps) || fps <= 0) throw new Error('Export FPS must be > 0.');

  const frameDuration = 1 / fps;
  const frameCount = Math.max(1, Math.ceil(duration * fps - 1e-9));
  const keyFrameEvery = Math.max(1, Math.round(fps * 2));
  return Array.from({ length: frameCount }, (_, index) => {
    const timestamp = index * frameDuration;
    return {
      index,
      timestamp,
      duration: Math.min(frameDuration, Math.max(1e-6, duration - timestamp)),
      keyFrame: index % keyFrameEvery === 0,
    };
  });
}

export function exportFilename(
  episodeId: string,
  themeId: string,
  extension: 'mp4' | 'webm' = 'mp4',
  suffix?: string,
): string {
  const safe = (value: string): string =>
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'mindforge';
  const extra = suffix ? `-${safe(suffix)}` : '';
  return `${safe(episodeId)}-${safe(themeId)}${extra}.${extension}`;
}
