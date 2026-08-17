import type { ExportFrame } from './planning';
import type {
  ResolvedExportAudioCodec,
  ResolvedExportContainer,
  ResolvedExportVideoCodec,
} from './codec-selection';

export interface ExportPhaseDurations {
  readonly preparingMs: number;
  readonly audioMs: number;
  readonly framesMs: number;
  readonly finalizingMs: number;
  readonly totalMs: number;
}

export interface ExportDiagnostics {
  readonly container: ResolvedExportContainer;
  readonly videoCodec: ResolvedExportVideoCodec;
  readonly audioCodec: ResolvedExportAudioCodec;
  readonly width: number;
  readonly height: number;
  readonly fps: number;
  readonly totalFrames: number;
  readonly keyFrames: number;
  readonly startTime: number;
  readonly endTime: number;
  readonly duration: number;
  readonly framePlanDuration: number;
  readonly audioDuration: number;
  readonly audioTimelineDeltaMs: number;
  readonly videoBitrate: number;
  readonly audioBitrate: number;
  readonly audioSampleRate: number;
  readonly outputBytes: number;
  readonly timings: ExportPhaseDurations;
}

/**
 * Verify that a fixed-frame plan is contiguous and covers the requested media
 * duration exactly (within floating-point tolerance). This catches missing-last-
 * frame and accidental-gap regressions before an encoder is started.
 */
export function validateFramePlan(frames: readonly ExportFrame[], duration: number): number {
  if (!frames.length) throw new Error('Export frame plan is empty.');
  const epsilon = 1e-6;
  let cursor = 0;
  for (let index = 0; index < frames.length; index += 1) {
    const frame = frames[index];
    if (frame.index !== index) throw new Error(`Export frame plan index mismatch at frame ${index}.`);
    if (!Number.isFinite(frame.timestamp) || !Number.isFinite(frame.duration) || frame.duration <= 0) {
      throw new Error(`Export frame ${index} has an invalid timestamp/duration.`);
    }
    if (Math.abs(frame.timestamp - cursor) > epsilon) {
      throw new Error(`Export frame plan has a gap or overlap before frame ${index}.`);
    }
    cursor = frame.timestamp + frame.duration;
  }
  if (Math.abs(cursor - duration) > epsilon) {
    throw new Error(
      `Export frame plan duration mismatch: expected ${duration.toFixed(6)}s, planned ${cursor.toFixed(6)}s.`,
    );
  }
  return cursor;
}

export function createExportDiagnostics(input: {
  readonly container: ResolvedExportContainer;
  readonly videoCodec: ResolvedExportVideoCodec;
  readonly audioCodec: ResolvedExportAudioCodec;
  readonly width: number;
  readonly height: number;
  readonly fps: number;
  readonly frames: readonly ExportFrame[];
  readonly startTime: number;
  readonly endTime: number;
  readonly framePlanDuration: number;
  readonly audioDuration: number;
  readonly videoBitrate: number;
  readonly audioBitrate: number;
  readonly audioSampleRate: number;
  readonly outputBytes: number;
  readonly timings: ExportPhaseDurations;
}): ExportDiagnostics {
  const duration = input.endTime - input.startTime;
  return {
    container: input.container,
    videoCodec: input.videoCodec,
    audioCodec: input.audioCodec,
    width: input.width,
    height: input.height,
    fps: input.fps,
    totalFrames: input.frames.length,
    keyFrames: input.frames.filter((frame) => frame.keyFrame).length,
    startTime: input.startTime,
    endTime: input.endTime,
    duration,
    framePlanDuration: input.framePlanDuration,
    audioDuration: input.audioDuration,
    audioTimelineDeltaMs: Math.abs(input.audioDuration - duration) * 1000,
    videoBitrate: input.videoBitrate,
    audioBitrate: input.audioBitrate,
    audioSampleRate: input.audioSampleRate,
    outputBytes: input.outputBytes,
    timings: input.timings,
  };
}
