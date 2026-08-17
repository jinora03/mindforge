import type { CreatorExportFormat } from './creator-options';

export type ResolvedExportContainer = 'mp4' | 'webm';
export type ResolvedExportVideoCodec = 'avc' | 'vp9' | 'vp8';
export type ResolvedExportAudioCodec = 'aac' | 'opus';

export interface EncodingPlan {
  readonly container: ResolvedExportContainer;
  readonly videoCodec: ResolvedExportVideoCodec;
  readonly audioCodec: ResolvedExportAudioCodec;
}

export interface EncodingCapabilityRequest {
  readonly width: number;
  readonly height: number;
  readonly videoBitrate: number;
  readonly audioBitrate: number;
  readonly audioSampleRate: number;
}

/**
 * Small adapter boundary around browser codec capability checks. Keeping this
 * injectable makes Auto fallback behaviour deterministic and regression-testable
 * without requiring WebCodecs in the test environment.
 */
export interface EncodingCapabilityProbe {
  canEncodeVideo(
    codec: ResolvedExportVideoCodec,
    options: { readonly width: number; readonly height: number; readonly bitrate: number },
  ): Promise<boolean>;
  canEncodeAudio(
    codec: ResolvedExportAudioCodec,
    options: { readonly numberOfChannels: number; readonly sampleRate: number; readonly bitrate: number },
  ): Promise<boolean>;
  enableAacFallback?(): void;
}

export async function resolveEncodingPlan(
  preference: CreatorExportFormat,
  request: EncodingCapabilityRequest,
  probe: EncodingCapabilityProbe,
): Promise<EncodingPlan> {
  const videoOptions = {
    width: request.width,
    height: request.height,
    bitrate: request.videoBitrate,
  };
  const audioOptions = {
    numberOfChannels: 2,
    sampleRate: request.audioSampleRate,
    bitrate: request.audioBitrate,
  };

  if (preference === 'auto' || preference === 'mp4') {
    const videoOk = await probe.canEncodeVideo('avc', videoOptions);
    let audioOk = false;
    if (videoOk) {
      audioOk = await probe.canEncodeAudio('aac', audioOptions);
      if (!audioOk && probe.enableAacFallback) {
        probe.enableAacFallback();
        audioOk = await probe.canEncodeAudio('aac', audioOptions);
      }
    }
    if (videoOk && audioOk) return { container: 'mp4', videoCodec: 'avc', audioCodec: 'aac' };
    if (preference === 'mp4') {
      throw new Error(
        'MP4 export is unavailable in this browser at the selected resolution/quality. Try Auto or WebM.',
      );
    }
  }

  const opusOk = await probe.canEncodeAudio('opus', audioOptions);
  for (const codec of ['vp9', 'vp8'] as const) {
    if (await probe.canEncodeVideo(codec, videoOptions)) {
      if (opusOk) return { container: 'webm', videoCodec: codec, audioCodec: 'opus' };
      break;
    }
  }

  throw new Error(
    preference === 'webm'
      ? 'WebM export is unavailable in this browser at the selected resolution/quality.'
      : 'Neither MP4 nor WebM export is available in this browser at the selected resolution/quality.',
  );
}
