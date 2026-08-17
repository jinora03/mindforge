import type {
  CreatorExportFormat,
  CreatorExportFps,
  CreatorExportLayout,
  CreatorExportPresetId,
  CreatorExportQuality,
  CreatorExportResolution,
} from '@mindforge/video-export';
import { creatorExportPreset } from '@mindforge/video-export';
import { activeStoryboardShot, type EpisodeProductionInfo } from '@content/production-types';

export type CreatorExportRangeMode = 'full' | 'current-shot' | 'custom';

export interface CreatorAudioSelection {
  readonly voice: boolean;
  readonly music: boolean;
  readonly sfx: boolean;
  readonly ambience: boolean;
}

export interface StudioCreatorExportOptions {
  readonly presetId: CreatorExportPresetId;
  readonly layout: CreatorExportLayout;
  readonly resolution: CreatorExportResolution;
  readonly fps: CreatorExportFps;
  readonly quality: CreatorExportQuality;
  readonly format: CreatorExportFormat;
  readonly rangeMode: CreatorExportRangeMode;
  readonly customStart: number;
  readonly customEnd: number;
  readonly themeId: string;
  readonly captions: boolean;
  readonly audio: CreatorAudioSelection;
  readonly autoDownload: boolean;
}

export interface ResolvedStudioExportRange {
  readonly startTime: number;
  readonly endTime: number;
  readonly label: string;
  readonly filenameSuffix?: string;
}

export function createDefaultStudioCreatorExportOptions(themeId: string): StudioCreatorExportOptions {
  const preset = creatorExportPreset('youtube-shorts');
  return {
    presetId: preset.id,
    layout: preset.layout,
    resolution: preset.resolution,
    fps: preset.fps,
    quality: 'high',
    format: 'auto',
    rangeMode: 'full',
    customStart: 0,
    customEnd: 15,
    themeId,
    captions: true,
    audio: { voice: true, music: true, sfx: true, ambience: true },
    autoDownload: true,
  };
}

export function applyCreatorPreset(
  options: StudioCreatorExportOptions,
  presetId: Exclude<CreatorExportPresetId, 'custom'>,
): StudioCreatorExportOptions {
  const preset = creatorExportPreset(presetId);
  return {
    ...options,
    presetId: preset.id,
    layout: preset.layout,
    resolution: preset.resolution,
    fps: preset.fps,
  };
}

export function resolveStudioExportRange(
  options: StudioCreatorExportOptions,
  duration: number,
  production: EpisodeProductionInfo | undefined,
  currentTime: number,
): ResolvedStudioExportRange {
  if (!Number.isFinite(duration) || duration <= 0) throw new Error('The current episode has no exportable duration.');

  if (options.rangeMode === 'current-shot') {
    const shot = production ? activeStoryboardShot(production.storyboard, currentTime) : undefined;
    if (!shot) throw new Error('No storyboard shot is active at the current preview time.');
    return {
      startTime: clamp(shot.t[0], 0, duration),
      endTime: clamp(shot.t[1], 0, duration),
      label: `${shot.beat} · ${shot.t[0].toFixed(1)}–${shot.t[1].toFixed(1)}s`,
      filenameSuffix: shot.id,
    };
  }

  if (options.rangeMode === 'custom') {
    const startTime = clamp(options.customStart, 0, duration);
    const endTime = clamp(options.customEnd, 0, duration);
    if (endTime <= startTime) throw new Error('Custom export end time must be later than its start time.');
    return {
      startTime,
      endTime,
      label: `Custom · ${startTime.toFixed(1)}–${endTime.toFixed(1)}s`,
      filenameSuffix: `clip-${formatTime(startTime)}-${formatTime(endTime)}`,
    };
  }

  return { startTime: 0, endTime: duration, label: `Full episode · ${duration.toFixed(1)}s` };
}

function formatTime(value: number): string {
  return value.toFixed(1).replace('.', 'p');
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
