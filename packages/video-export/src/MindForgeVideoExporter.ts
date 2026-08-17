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
  canEncodeAudio,
  canEncodeVideo,
} from 'mediabunny';
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
  readonly signal?: AbortSignal;
  readonly onProgress?: (progress: ExportProgress) => void;
}

/**
 * Deterministically evaluates every frame at an exact timeline timestamp and
 * muxes H.264 + AAC into an MP4. This never uses captureStream, MediaRecorder,
 * requestAnimationFrame timing, or the live preview transport.
 */
export async function exportMindForgeMp4(request: MindForgeVideoExportRequest): Promise<Blob> {
  assertBrowserExportApis();
  const width = request.width ?? DEFAULT_EXPORT_WIDTH;
  const height = request.height ?? DEFAULT_EXPORT_HEIGHT;
  const fps = request.fps ?? DEFAULT_EXPORT_FPS;
  const videoBitrate = request.videoBitrate ?? DEFAULT_VIDEO_BITRATE;
  const audioBitrate = request.audioBitrate ?? DEFAULT_AUDIO_BITRATE;
  const audioSampleRate = request.audioSampleRate ?? DEFAULT_AUDIO_SAMPLE_RATE;
  const loaded = loadEpisode(request.episode, request.registries);
  const frames = createFramePlan(loaded.script.duration, fps);
  const progress = (phase: ExportPhase, ratio: number, completedFrames = 0): void =>
    request.onProgress?.({ phase, ratio, completedFrames, totalFrames: frames.length });

  throwIfAborted(request.signal);
  progress('preparing', 0);
  if (!(await canEncodeVideo('avc', { width, height, bitrate: videoBitrate }))) {
    throw new Error('This browser cannot encode H.264/AVC at the requested export resolution. Try current Chrome or Edge with hardware acceleration enabled.');
  }
  if (!(await canEncodeAudio('aac', { numberOfChannels: 2, sampleRate: audioSampleRate, bitrate: audioBitrate }))) {
    registerAacEncoder();
  }
  if (!(await canEncodeAudio('aac', { numberOfChannels: 2, sampleRate: audioSampleRate, bitrate: audioBitrate }))) {
    throw new Error('AAC encoding is unavailable in this browser, including the bundled fallback encoder.');
  }

  progress('audio', 0.02);
  const audioEvents = loaded.script.timeline.filter((event) => event.type === 'audio');
  const mixedAudio = await renderOfflineEpisodeAudio(audioEvents, request.registries, loaded.script.duration, {
    sampleRate: audioSampleRate,
    numberOfChannels: 2,
    volumes: request.audioVolumes,
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
  const output = new Output({ format: new Mp4OutputFormat(), target });
  const videoSource = new CanvasSource(renderCanvas, {
    codec: 'avc',
    bitrate: videoBitrate,
    hardwareAcceleration: 'prefer-hardware',
  });
  const audioSource = new AudioBufferSource({ codec: 'aac', bitrate: audioBitrate });
  output.addVideoTrack(videoSource, { frameRate: fps });
  output.addAudioTrack(audioSource);

  try {
    engine.setRenderSize(width, height, 1);
    engine.loadEpisode(request.episode);
    await output.start();

    const audioDone = audioSource.add(mixedAudio).then(() => audioSource.close());
    for (const frame of frames) {
      throwIfAborted(request.signal);
      engine.seek(frame.timestamp);
      renderContext.clearRect(0, 0, width, height);
      renderContext.drawImage(engine.renderer.domElement, 0, 0, width, height);
      renderExportCaptions(renderContext, engine.getFrameInfo().activeTexts, request.theme.presentation, width, height);
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
  if (!bytes || bytes.byteLength === 0) throw new Error('MP4 export finalized without output bytes.');
  progress('finalizing', 1, frames.length);
  return new Blob([bytes], { type: 'video/mp4' });
}

function assertBrowserExportApis(): void {
  if (typeof document === 'undefined' || typeof OfflineAudioContext === 'undefined') {
    throw new Error('MindForge video export requires a modern browser environment.');
  }
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw new DOMException('Video export cancelled.', 'AbortError');
}
