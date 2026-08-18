import { describe, expect, it } from 'vitest';
import {
  createExportDiagnostics,
  createFramePlan,
  resolveEncodingPlan,
  validateFramePlan,
  type EncodingCapabilityProbe,
} from '@mindforge/video-export';

function probe(options: {
  avc?: boolean;
  aac?: boolean;
  aacAfterFallback?: boolean;
  opus?: boolean;
  vp9?: boolean;
  vp8?: boolean;
}): EncodingCapabilityProbe & { fallbackCalls: number } {
  let fallbackEnabled = false;
  const value = {
    fallbackCalls: 0,
    async canEncodeVideo(codec: 'avc' | 'vp9' | 'vp8'): Promise<boolean> {
      if (codec === 'avc') return options.avc ?? false;
      if (codec === 'vp9') return options.vp9 ?? false;
      return options.vp8 ?? false;
    },
    async canEncodeAudio(codec: 'aac' | 'opus'): Promise<boolean> {
      if (codec === 'opus') return options.opus ?? false;
      return fallbackEnabled ? (options.aacAfterFallback ?? options.aac ?? false) : (options.aac ?? false);
    },
    enableAacFallback(): void {
      value.fallbackCalls += 1;
      fallbackEnabled = true;
    },
  };
  return value;
}

const encodingRequest = {
  width: 1080,
  height: 1920,
  videoBitrate: 12_000_000,
  audioBitrate: 192_000,
  audioSampleRate: 48_000,
};

describe('MindForge export hardening', () => {
  it.each([
    [1, 30],
    [1, 60],
    [12.345, 30],
    [12.345, 60],
  ])('creates a contiguous frame plan covering exactly %ss at %s FPS', (duration, fps) => {
    const frames = createFramePlan(duration, fps);
    expect(validateFramePlan(frames, duration)).toBeCloseTo(duration, 6);
    expect(frames[0].timestamp).toBe(0);
    const last = frames.at(-1)!;
    expect(last.timestamp + last.duration).toBeCloseTo(duration, 6);
  });

  it('prefers AVC/AAC MP4 and can enable AAC fallback once', async () => {
    const capabilities = probe({ avc: true, aac: false, aacAfterFallback: true });
    await expect(resolveEncodingPlan('auto', encodingRequest, capabilities)).resolves.toEqual({
      container: 'mp4', videoCodec: 'avc', audioCodec: 'aac',
    });
    expect(capabilities.fallbackCalls).toBe(1);
  });

  it('falls back from MP4 to VP9/Opus WebM in Auto mode', async () => {
    const capabilities = probe({ avc: false, aac: true, opus: true, vp9: true, vp8: true });
    await expect(resolveEncodingPlan('auto', encodingRequest, capabilities)).resolves.toEqual({
      container: 'webm', videoCodec: 'vp9', audioCodec: 'opus',
    });
    expect(capabilities.fallbackCalls).toBe(0);
  });

  it('uses VP8 when VP9 is unavailable and reports forced MP4 failure clearly', async () => {
    const webm = probe({ opus: true, vp9: false, vp8: true });
    await expect(resolveEncodingPlan('webm', encodingRequest, webm)).resolves.toMatchObject({ videoCodec: 'vp8' });

    const mp4 = probe({ avc: false, aac: true });
    await expect(resolveEncodingPlan('mp4', encodingRequest, mp4)).rejects.toThrow(/Try Auto or WebM/);
  });

  it('reports frame/audio diagnostics without claiming wall-clock timing is media timing', () => {
    const frames = createFramePlan(2, 60);
    const diagnostics = createExportDiagnostics({
      container: 'mp4',
      videoCodec: 'avc',
      audioCodec: 'aac',
      width: 1080,
      height: 1920,
      fps: 60,
      frames,
      startTime: 3,
      endTime: 5,
      framePlanDuration: validateFramePlan(frames, 2),
      audioDuration: 2 + 1 / 48_000,
      videoBitrate: 12_000_000,
      audioBitrate: 192_000,
      audioSampleRate: 48_000,
      outputBytes: 1024,
      timings: { preparingMs: 10, audioMs: 20, framesMs: 100, finalizingMs: 5, totalMs: 135 },
    });
    expect(diagnostics.totalFrames).toBe(120);
    expect(diagnostics.duration).toBe(2);
    expect(diagnostics.framePlanDuration).toBeCloseTo(2, 6);
    expect(diagnostics.audioTimelineDeltaMs).toBeLessThan(0.03);
  });
});
