import { registerAacEncoder } from '@mediabunny/aac-encoder';
import type { AudioMixerBus, CapabilityRegistries } from '@mindforge/engine';
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
import { renderExportCaptions } from './captions';
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
export type ResolvedExportContainer = 'mp4' | 'webm';
export type ResolvedExportVideoCodec = 'avc' | 'vp9' | 'vp8';
export type ResolvedExportAudioCodec = 'aac' | 'opus';

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
}

interface EncodingPlan {
  readonly container: ResolvedExportContainer;
  readonly videoCodec: ResolvedExportVideoCodec;
  readonly audioCodec: ResolvedExportAudioCodec;
}

/**
 * Deterministically evaluates every frame at an exact timeline timestamp and
 * muxes the selected browser-encodable container. This never uses
 * captureStream, MediaRecorder, requestAnimationFrame timing, or the live
 * preview transport.
 */
export async function exportMindForgeVideo(
  request: MindForgeVideoExportRequest,
): Promise<MindForgeVideoExportResult> {
  assertBrowserExportApis();
  const width = request.width ?? DEFAULT_EXPORT_WIDTH;
  const height = request.height ?? DEFAULT_EXPORT_HEIGHT;
  const fps = request.fps ?? DEFAULT_EXPORT_FPS;
  const videoBitrate = request.videoBitrate ?? DEFAULT_VIDEO_BITRATE;
  const audioBitrate = request.audioBitrate ?? DEFAULT_AUDIO_BITRATE;
  const audioSampleRate = request.audioSampleRate ?? DEFAULT_AUDIO_SAMPLE_RATE;
  const loaded = loadEpisode(request.episode, request.registries);
  const startTime = clamp(request.startTime ?? 0, 0, loaded.script.duration);
  const endTime = clamp(request.endTime ?? loaded.script.duration, startTime, loaded.script.duration);
  const exportDuration = endTime - startTime;
  if (exportDuration <= 0) throw new Error('Export range must have a duration greater than zero.');

  const frames = createFramePlan(exportDuration, fps);
  const progress = (phase: ExportPhase, ratio: number, completedFrames = 0): void =>
    request.onProgress?.({ phase, ratio, completedFrames, totalFrames: frames.length });

  throwIfAborted(request.signal);
  progress('preparing', 0);
  const encoding = await resolveEncodingPlan(
    request.format ?? 'auto',
    width,
    height,
    videoBitrate,
    audioBitrate,
    audioSampleRate,
  );

  progress('audio', 0.02);
  const audioEvents = loaded.script.timeline.filter((event) => event.type === 'audio');
  const mixedAudio = await renderOfflineEpisodeAudio(audioEvents, request.registries, exportDuration, {
    sampleRate: audioSampleRate,
    numberOfChannels: 2,
    volumes: request.audioVolumes,
    timelineStart: startTime,
  });
  throwIfAborted(request.signal);

  const renderCanvas = document.createElement('canvas');
  renderCanvas.width = width;
  renderCanvas.height = height;
  const renderContext = renderCanvas.getContext('2d', { alpha: false });
  if (!renderContext) throw new Error('Unable to create the export compositor canvas.');

  const engine = new MindForgeEngine({
    registries: request.registries,
    postProcessing: request.theme.presentation.postProcessing,
    autoResize: false,
    pixelRatioCap: 1,
    preserveDrawingBuffer: true,
  });

  const target = new BufferTarget();
  const output = new Output({
    format: encoding.container === 'mp4' ? new Mp4OutputFormat() : new WebMOutputFormat(),
    target,
  });
  const videoSource = new CanvasSource(renderCanvas, {
    codec: encoding.videoCodec,
    bitrate: videoBitrate,
    hardwareAcceleration: 'prefer-hardware',
  });
  const audioSource = new AudioBufferSource({ codec: encoding.audioCodec, bitrate: audioBitrate });
  output.addVideoTrack(videoSource, { frameRate: fps });
  output.addAudioTrack(audioSource);

  try {
    engine.setRenderSize(width, height, 1);
    engine.loadEpisode(request.episode);
    await output.start();

    const audioDone = audioSource.add(mixedAudio).then(() => audioSource.close());
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
    await audioDone;
    progress('finalizing', 0.97, frames.length);
    await output.finalize();
  } catch (error) {
    if (output.state !== 'finalized' && output.state !== 'canceled') {
      await output.cancel().catch(() => undefined);
    }
    throw error;
  } finally {
    engine.dispose();
  }

  throwIfAborted(request.signal);
  const bytes = target.buffer;
  if (!bytes || bytes.byteLength === 0) throw new Error('Video export finalized without output bytes.');
  progress('finalizing', 1, frames.length);

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
  };
}

/** Backwards-compatible Phase 6 API for callers that explicitly require MP4. */
export async function exportMindForgeMp4(request: MindForgeVideoExportRequest): Promise<Blob> {
  const result = await exportMindForgeVideo({ ...request, format: 'mp4' });
  return result.blob;
}

async function resolveEncodingPlan(
  preference: CreatorExportFormat,
  width: number,
  height: number,
  videoBitrate: number,
  audioBitrate: number,
  audioSampleRate: number,
): Promise<EncodingPlan> {
  if (preference === 'auto' || preference === 'mp4') {
    const videoOk = await canEncodeVideo('avc', { width, height, bitrate: videoBitrate });
    let audioOk = await canEncodeAudio('aac', {
      numberOfChannels: 2,
      sampleRate: audioSampleRate,
      bitrate: audioBitrate,
    });
    if (!audioOk) {
      registerAacEncoder();
      audioOk = await canEncodeAudio('aac', {
        numberOfChannels: 2,
        sampleRate: audioSampleRate,
        bitrate: audioBitrate,
      });
    }
    if (videoOk && audioOk) return { container: 'mp4', videoCodec: 'avc', audioCodec: 'aac' };
    if (preference === 'mp4') {
      throw new Error('MP4 export is unavailable in this browser at the selected resolution/quality. Try Auto or WebM.');
    }
  }

  const opusOk = await canEncodeAudio('opus', {
    numberOfChannels: 2,
    sampleRate: audioSampleRate,
    bitrate: audioBitrate,
  });
  // Check WebM video codecs in preferred order.
  let videoCodec: 'vp9' | 'vp8' | undefined;
  for (const codec of ['vp9', 'vp8'] as const) {
    if (await canEncodeVideo(codec, { width, height, bitrate: videoBitrate })) {
      videoCodec = codec;
      break;
    }
  }
  if (videoCodec && opusOk) return { container: 'webm', videoCodec, audioCodec: 'opus' };

  throw new Error(
    preference === 'webm'
      ? 'WebM export is unavailable in this browser at the selected resolution/quality.'
      : 'Neither MP4 nor WebM export is available in this browser at the selected resolution/quality.',
  );
}

function assertBrowserExportApis(): void {
  if (typeof document === 'undefined' || typeof OfflineAudioContext === 'undefined') {
    throw new Error('MindForge video export requires a modern browser environment.');
  }
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw new DOMException('Video export cancelled.', 'AbortError');
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
