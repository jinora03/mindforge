import {
  DEFAULT_AUDIO_MIXER_VOLUMES,
  effectiveBusGain,
  mergeAudioWindows,
  VOICE_DUCKING,
} from '@mindforge/audio';
import type {
  AudioCueDefinition,
  AudioCueSource,
  AudioMixerBus,
  CapabilityRegistries,
  ReadonlyRegistry,
} from '@mindforge/engine';
import type { AudioEvent } from '@mindforge/schema';

export interface AudioScheduleEntry {
  readonly eventId: string;
  readonly cueId: string;
  readonly bus: Exclude<AudioMixerBus, 'master'>;
  readonly start: number;
  /** Maximum timeline window; non-looping sources are clamped to buffer duration later. */
  readonly duration: number;
  readonly loop: boolean;
  readonly gain: number;
  readonly fadeIn: number;
  readonly fadeOut: number;
}

interface ResolvedAudioEntry extends AudioScheduleEntry {
  readonly buffer: AudioBuffer;
  readonly duration: number;
}

export interface OfflineAudioOptions {
  readonly sampleRate?: number;
  readonly numberOfChannels?: number;
  readonly volumes?: Partial<Record<AudioMixerBus, number>>;
}

export function buildAudioSchedule(
  events: readonly AudioEvent[],
  cues: ReadonlyRegistry<AudioCueDefinition>,
  episodeDuration: number,
): AudioScheduleEntry[] {
  return [...events]
    .sort((a, b) => a.at - b.at || a.id.localeCompare(b.id))
    .map((event) => {
      const cue = cues.get(event.cue);
      const start = event.at + (event.delay ?? 0);
      const available = Math.max(0, episodeDuration - start);
      const duration = Math.max(0, Math.min(event.duration ?? available, available));
      return {
        eventId: event.id,
        cueId: cue.id,
        bus: event.bus ?? cue.bus,
        start,
        duration,
        loop: event.loop ?? cue.loop ?? false,
        gain: (cue.defaultGain ?? 1) * (event.volume ?? 1),
        fadeIn: cue.fadeIn ?? 0,
        fadeOut: cue.fadeOut ?? 0,
      };
    })
    .filter((entry) => entry.start < episodeDuration && entry.duration > 0);
}

/**
 * Render semantic episode audio into one deterministic stereo AudioBuffer.
 * Preview and export share source preference/fallbacks, fades and voice ducking.
 */
export async function renderOfflineEpisodeAudio(
  events: readonly AudioEvent[],
  registries: CapabilityRegistries,
  duration: number,
  options: OfflineAudioOptions = {},
): Promise<AudioBuffer> {
  const sampleRate = options.sampleRate ?? 48_000;
  const numberOfChannels = options.numberOfChannels ?? 2;
  const frameCount = Math.max(1, Math.ceil(duration * sampleRate));
  const context = new OfflineAudioContext(numberOfChannels, frameCount, sampleRate);
  const volumes: Record<AudioMixerBus, number> = {
    master: options.volumes?.master ?? DEFAULT_AUDIO_MIXER_VOLUMES.master,
    voice: options.volumes?.voice ?? DEFAULT_AUDIO_MIXER_VOLUMES.voice,
    music: options.volumes?.music ?? DEFAULT_AUDIO_MIXER_VOLUMES.music,
    sfx: options.volumes?.sfx ?? DEFAULT_AUDIO_MIXER_VOLUMES.sfx,
    ambience: options.volumes?.ambience ?? DEFAULT_AUDIO_MIXER_VOLUMES.ambience,
  };

  const master = context.createGain();
  master.gain.value = clamp01(volumes.master);
  master.connect(context.destination);

  const buses = new Map<Exclude<AudioMixerBus, 'master'>, GainNode>();
  for (const bus of ['voice', 'music', 'sfx', 'ambience'] as const) {
    const gain = context.createGain();
    gain.gain.value = clamp01(volumes[bus]);
    gain.connect(master);
    buses.set(bus, gain);
  }

  const schedule = buildAudioSchedule(events, registries.audio, duration);
  const buffers = new Map<string, AudioBuffer>();
  await Promise.all(
    [...new Set(schedule.map((entry) => entry.cueId))].map(async (cueId) => {
      buffers.set(cueId, await cueToBuffer(context, registries.audio.get(cueId), sampleRate));
    }),
  );

  const resolved: ResolvedAudioEntry[] = schedule.flatMap((entry) => {
    const buffer = buffers.get(entry.cueId);
    if (!buffer) return [];
    const playableDuration = entry.loop ? entry.duration : Math.min(entry.duration, buffer.duration);
    if (playableDuration <= 0) return [];
    return [{ ...entry, duration: playableDuration, buffer }];
  });

  applyOfflineVoiceDucking(buses, resolved, volumes, duration);

  for (const entry of resolved) {
    const source = context.createBufferSource();
    source.buffer = entry.buffer;
    source.loop = entry.loop;
    const gain = context.createGain();
    scheduleGainEnvelope(gain.gain, entry.gain, entry.start, entry.duration, entry.fadeIn, entry.fadeOut);
    source.connect(gain);
    gain.connect(buses.get(entry.bus) ?? master);
    source.start(entry.start, 0, entry.duration);
  }

  return context.startRendering();
}

function applyOfflineVoiceDucking(
  buses: ReadonlyMap<Exclude<AudioMixerBus, 'master'>, GainNode>,
  entries: readonly ResolvedAudioEntry[],
  volumes: Readonly<Record<AudioMixerBus, number>>,
  episodeDuration: number,
): void {
  const windows = mergeAudioWindows(
    entries
      .filter((entry) => entry.bus === 'voice')
      .map((entry) => ({ start: entry.start, end: entry.start + entry.duration })),
  );
  if (!windows.length) return;

  for (const bus of ['music', 'sfx', 'ambience'] as const) {
    const param = buses.get(bus)?.gain;
    if (!param) continue;
    const normal = clamp01(volumes[bus]);
    const ducked = effectiveBusGain(bus, normal, true);
    param.cancelScheduledValues(0);
    param.setValueAtTime(normal, 0);
    for (const window of windows) {
      const attackStart = Math.max(0, window.start - VOICE_DUCKING.attack);
      const releaseEnd = Math.min(episodeDuration, window.end + VOICE_DUCKING.release);
      param.setValueAtTime(normal, attackStart);
      param.linearRampToValueAtTime(ducked, Math.max(attackStart + 0.001, window.start));
      param.setValueAtTime(ducked, window.end);
      param.linearRampToValueAtTime(normal, Math.max(window.end + 0.001, releaseEnd));
    }
  }
}

function scheduleGainEnvelope(
  param: AudioParam,
  gain: number,
  start: number,
  duration: number,
  requestedFadeIn: number,
  requestedFadeOut: number,
): void {
  const fadeIn = Math.min(Math.max(0, requestedFadeIn), duration * 0.5);
  const fadeOut = Math.min(Math.max(0, requestedFadeOut), duration * 0.5);
  const end = start + duration;
  const fadeOutStart = Math.max(start + fadeIn, end - fadeOut);
  param.setValueAtTime(fadeIn > 0 ? 0 : gain, start);
  if (fadeIn > 0) param.linearRampToValueAtTime(gain, start + fadeIn);
  if (fadeOut > 0) {
    param.setValueAtTime(gain, fadeOutStart);
    param.linearRampToValueAtTime(0, end);
  }
}

async function cueToBuffer(
  context: OfflineAudioContext,
  cue: AudioCueDefinition,
  sampleRate: number,
): Promise<AudioBuffer> {
  if (cue.preferredSource) {
    try {
      return await sourceToBuffer(context, cue.id, cue.preferredSource, sampleRate);
    } catch {
      // Optional production asset not present/decodable; deterministic fallback below.
    }
  }
  return sourceToBuffer(context, cue.id, cue.source, sampleRate);
}

async function sourceToBuffer(
  context: OfflineAudioContext,
  cueId: string,
  source: AudioCueSource,
  sampleRate: number,
): Promise<AudioBuffer> {
  if (source.kind === 'procedural') {
    const pcm = source.render(sampleRate);
    if (!pcm.channels.length || pcm.channels.some((channel) => channel.length !== pcm.channels[0].length)) {
      throw new Error(`Audio cue "${cueId}" returned inconsistent PCM channels.`);
    }
    const buffer = context.createBuffer(pcm.channels.length, pcm.channels[0].length, pcm.sampleRate);
    pcm.channels.forEach((channel, index) => {
      buffer.copyToChannel(new Float32Array(channel), index);
    });
    return buffer;
  }

  const response = await fetch(source.url);
  if (!response.ok) throw new Error(`Failed to load audio cue "${cueId}": HTTP ${response.status}`);
  return context.decodeAudioData(await response.arrayBuffer());
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}
