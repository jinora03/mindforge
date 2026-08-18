import { registerAacEncoder } from '@mediabunny/aac-encoder';
import type { AudioMixerBus, CapabilityRegistries, RuntimeAssetManager } from '@mindforge/engine';
import { loadEpisode, MindForgeEngine } from '@mindforge/engine';
import type { MindForgeTheme } from '@mindforge/themes';
import {
  AudioBufferSource,
  BufferTarget,
  CanvasSource,
  Mp4OutputFormat,
  Output,
  WebMOutputFormat,
  canEncodeAudio,
  canEncodeVideo,
} from 'mediabunny';
import type { CreatorExportFormat } from './creator-options';
import {
  resolveEncodingPlan,
  type EncodingCapabilityProbe,
  type ResolvedExportAudioCodec,
  type ResolvedExportContainer,
  type ResolvedExportVideoCodec,
} from './codec-selection';
import { renderExportCaptions } from './captions';
import { createExportDiagnostics, validateFramePlan, type ExportDiagnostics, type ExportPhaseDurations } from './diagnostics';
import { renderOfflineEpisodeAudio } from './offline-audio';
import {
  DEFAULT_AUDIO_BITRATE,
  DEFAULT_AUDIO_SAMPLE_RATE,
  DEFAULT_EXPORT_FPS,
  DEFAULT_EXPORT_HEIGHT,
  DEFAULT_EXPORT_WIDTH,
  DEFAULT_VIDEO_BITRATE,
  createFramePlan,
} from './planning';

export type ExportPhase = 'preparing' | 'audio' | 'frames' | 'finalizing';

export interface ExportProgress {
  readonly phase: ExportPhase;
  readonly ratio: number;
  readonly completedFrames: number;
  readonly totalFrames: number;
}

export interface MindForgeVideoExportRequest {
  readonly episode: unknown;
  readonly registries: CapabilityRegistries;
  readonly theme: MindForgeTheme;
  /** Shared preloaded-model runtime used by authored GLB/GLTF theme assets. */
  readonly assetRuntime?: RuntimeAssetManager;
  readonly width?: number;
  readonly height?: number;
  readonly fps?: number;
  readonly videoBitrate?: number;
  readonly audioBitrate?: number;
  readonly audioSampleRate?: number;
  readonly audioVolumes?: Partial<Record<AudioMixerBus, number>>;
  /** Preferred container. Auto tries MP4 first, then WebM. */
  readonly format?: CreatorExportFormat;
  /** Absolute episode time where the exported clip begins. */
  readonly startTime?: number;
  /** Absolute episode time where the exported clip ends. */
  readonly endTime?: number;
  readonly includeCaptions?: boolean;
  readonly signal?: AbortSignal;
  readonly onProgress?: (progress: ExportProgress) => void;
}

export interface MindForgeVideoExportResult {
  readonly blob: Blob;
  readonly container: ResolvedExportContainer;
  readonly extension: 'mp4' | 'webm';
  readonly mimeType: 'video/mp4' | 'video/webm';
  readonly videoCodec: ResolvedExportVideoCodec;
  readonly audioCodec: ResolvedExportAudioCodec;
  readonly startTime: number;
  readonly endTime: number;
  readonly duration: number;
  readonly diagnostics: ExportDiagnostics;
}

let aacFallbackRegistered = false;

/**
 * Deterministically evaluates every frame at an exact timeline timestamp and
 * muxes the selected browser-encodable container. The export path never records
 * the live preview; it feeds exact canvas timestamps to the encoder.
 */
export async function exportMindForgeVideo(
  request: MindForgeVideoExportRequest,
): Promise<MindForgeVideoExportResult> {
  assertBrowserExportApis();
  const totalStarted = nowMs();
  const stageStarted: Partial<Record<ExportPhase, number>> = {};
  const stageElapsed: Partial<Record<ExportPhase, number>> = {};
  const markStage = (phase: ExportPhase): void => {
    const current = nowMs();
    for (const candidate of ['preparing', 'audio', 'frames', 'finalizing'] as const) {
      const started = stageStarted[candidate];
      if (started !== undefined && stageElapsed[candidate] === undefined) stageElapsed[candidate] = current - started;
    }
    stageStarted[phase] = current;
  };

  const width = positiveInteger(request.width ?? DEFAULT_EXPORT_WIDTH, 'Export width');
  const height = positiveInteger(request.height ?? DEFAULT_EXPORT_HEIGHT, 'Export height');
  const fps = positiveNumber(request.fps ?? DEFAULT_EXPORT_FPS, 'Export FPS');
  const videoBitrate = positiveInteger(request.videoBitrate ?? DEFAULT_VIDEO_BITRATE, 'Video bitrate');
  const audioBitrate = positiveInteger(request.audioBitrate ?? DEFAULT_AUDIO_BITRATE, 'Audio bitrate');
  const audioSampleRate = positiveInteger(request.audioSampleRate ?? DEFAULT_AUDIO_SAMPLE_RATE, 'Audio sample rate');
  const loaded = loadEpisode(request.episode, request.registries);
  const startTime = clamp(request.startTime ?? 0, 0, loaded.script.duration);
  const endTime = clamp(request.endTime ?? loaded.script.duration, startTime, loaded.script.duration);
  const exportDuration = endTime - startTime;
  if (exportDuration <= 0) throw new Error('Export range must have a duration greater than zero.');

  const frames = createFramePlan(exportDuration, fps);
  const framePlanDuration = validateFramePlan(frames, exportDuration);
  let lastProgress = 0;
  const progress = (phase: ExportPhase, ratio: number, completedFrames = 0): void => {
    lastProgress = Math.max(lastProgress, clamp(ratio, 0, 1));
    request.onProgress?.({ phase, ratio: lastProgress, completedFrames, totalFrames: frames.length });
  };

  let engine: MindForgeEngine | undefined;
  let renderCanvas: HTMLCanvasElement | undefined;
  let output: Output | undefined;
  let videoSource: CanvasSource | undefined;
  let audioSource: AudioBufferSource | undefined;
  let audioTask: Promise<void> | undefined;
  let outputFinalized = false;

  try {
    throwIfAborted(request.signal);
    markStage('preparing');
    progress('preparing', 0);
    const encoding = await resolveEncodingPlan(
      request.format ?? 'auto',
      { width, height, videoBitrate, audioBitrate, audioSampleRate },
      browserEncodingProbe,
    );
    throwIfAborted(request.signal);

    markStage('audio');
    progress('audio', 0.02);
    const audioEvents = loaded.script.timeline.filter((event) => event.type === 'audio');
    const mixedAudio = await renderOfflineEpisodeAudio(audioEvents, request.registries, exportDuration, {
      sampleRate: audioSampleRate,
      numberOfChannels: 2,
      volumes: request.audioVolumes,
      timelineStart: startTime,
    });
    throwIfAborted(request.signal);

    renderCanvas = document.createElement('canvas');
    renderCanvas.width = width;
    renderCanvas.height = height;
    const renderContext = renderCanvas.getContext('2d', { alpha: false });
    if (!renderContext) throw new Error('Unable to create the export compositor canvas.');

    engine = new MindForgeEngine({
      registries: request.registries,
      assetRuntime: request.assetRuntime,
      postProcessing: request.theme.presentation.postProcessing,
      autoResize: false,
      pixelRatioCap: 1,
      preserveDrawingBuffer: true,
    });
    await engine.prepareAssets();
    engine.setRenderSize(width, height, 1);
    engine.loadEpisode(request.episode);

    const target = new BufferTarget();
    output = new Output({
      format: encoding.container === 'mp4' ? new Mp4OutputFormat() : new WebMOutputFormat(),
      target,
    });
    videoSource = new CanvasSource(renderCanvas, {
      codec: encoding.videoCodec,
      bitrate: videoBitrate,
      hardwareAcceleration: 'prefer-hardware',
    });
    audioSource = new AudioBufferSource({ codec: encoding.audioCodec, bitrate: audioBitrate });
    output.addVideoTrack(videoSource, { frameRate: fps });
    output.addAudioTrack(audioSource);

    throwIfAborted(request.signal);
    await output.start();
    throwIfAborted(request.signal);

    audioTask = audioSource.add(mixedAudio).then(() => audioSource?.close());
    // Attach a rejection handler immediately so a simultaneous frame failure /
    // output cancellation can never leave an unhandled encoder promise behind.
    void audioTask.catch(() => undefined);

    markStage('frames');
    for (const frame of frames) {
      throwIfAborted(request.signal);
      engine.seek(startTime + frame.timestamp);
      renderContext.clearRect(0, 0, width, height);
      renderContext.drawImage(engine.renderer.domElement, 0, 0, width, height);
      if (request.includeCaptions !== false) {
        renderExportCaptions(
          renderContext,
          engine.getFrameInfo().activeTexts,
          request.theme.presentation,
          width,
          height,
        );
      }
      await videoSource.add(frame.timestamp, frame.duration, { keyFrame: frame.keyFrame });
      const completed = frame.index + 1;
      progress('frames', 0.08 + 0.88 * (completed / frames.length), completed);
    }
    videoSource.close();
    await audioTask;
    audioTask = undefined;

    // Finalization is intentionally treated as an atomic tail step. A cancel
    // request is honored immediately before it starts; once mux finalization has
    // begun we finish the valid file instead of discarding already-encoded work.
    throwIfAborted(request.signal);
    markStage('finalizing');
    progress('finalizing', 0.97, frames.length);
    await output.finalize();
    outputFinalized = true;

    const bytes = target.buffer;
    if (!bytes || bytes.byteLength === 0) throw new Error('Video export finalized without output bytes.');
    progress('finalizing', 1, frames.length);

    const finishedAt = nowMs();
    const currentFinalizingStart = stageStarted.finalizing ?? finishedAt;
    stageElapsed.finalizing = finishedAt - currentFinalizingStart;
    const timings: ExportPhaseDurations = {
      preparingMs: stageElapsed.preparing ?? 0,
      audioMs: stageElapsed.audio ?? 0,
      framesMs: stageElapsed.frames ?? 0,
      finalizingMs: stageElapsed.finalizing ?? 0,
      totalMs: finishedAt - totalStarted,
    };
    const diagnostics = createExportDiagnostics({
      container: encoding.container,
      videoCodec: encoding.videoCodec,
      audioCodec: encoding.audioCodec,
      width,
      height,
      fps,
      frames,
      startTime,
      endTime,
      framePlanDuration,
      audioDuration: mixedAudio.duration,
      videoBitrate,
      audioBitrate,
      audioSampleRate,
      outputBytes: bytes.byteLength,
      timings,
    });

    const isMp4 = encoding.container === 'mp4';
    return {
      blob: new Blob([bytes], { type: isMp4 ? 'video/mp4' : 'video/webm' }),
      container: encoding.container,
      extension: isMp4 ? 'mp4' : 'webm',
      mimeType: isMp4 ? 'video/mp4' : 'video/webm',
      videoCodec: encoding.videoCodec,
      audioCodec: encoding.audioCodec,
      startTime,
      endTime,
      duration: exportDuration,
      diagnostics,
    };
  } catch (error) {
    if (!outputFinalized && output && output.state !== 'finalized' && output.state !== 'canceled') {
      await output.cancel().catch(() => undefined);
    }
    if (request.signal?.aborted && (error as Error).name !== 'AbortError') throw abortError();
    throw error;
  } finally {
    // Output owns encoder resources. Engine and compositor are ours and are
    // always released on success, failure, and cancellation.
    engine?.dispose();
    if (renderCanvas) {
      renderCanvas.width = 1;
      renderCanvas.height = 1;
    }
  }
}

/** Backwards-compatible Phase 6 API for callers that explicitly require MP4. */
export async function exportMindForgeMp4(request: MindForgeVideoExportRequest): Promise<Blob> {
  const result = await exportMindForgeVideo({ ...request, format: 'mp4' });
  return result.blob;
}

const browserEncodingProbe: EncodingCapabilityProbe = {
  canEncodeVideo: (codec, options) => canEncodeVideo(codec, options),
  canEncodeAudio: (codec, options) => canEncodeAudio(codec, options),
  enableAacFallback: () => {
    if (aacFallbackRegistered) return;
    registerAacEncoder();
    aacFallbackRegistered = true;
  },
};

function assertBrowserExportApis(): void {
  if (typeof document === 'undefined' || typeof OfflineAudioContext === 'undefined') {
    throw new Error('MindForge video export requires a modern browser environment.');
  }
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw abortError();
}

function abortError(): Error {
  if (typeof DOMException !== 'undefined') return new DOMException('Video export cancelled.', 'AbortError');
  const error = new Error('Video export cancelled.');
  error.name = 'AbortError';
  return error;
}

function positiveInteger(value: number, label: string): number {
  if (!Number.isFinite(value) || value <= 0 || !Number.isInteger(value)) {
    throw new Error(`${label} must be a positive integer.`);
  }
  return value;
}

function positiveNumber(value: number, label: string): number {
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${label} must be greater than zero.`);
  return value;
}

function nowMs(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
