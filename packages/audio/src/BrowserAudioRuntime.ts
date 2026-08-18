import type {
  AudioCueDefinition,
  AudioCueSource,
  AudioMixerBus,
  AudioRuntime,
  AudioSyncReason,
  AudioTransportState,
  ReadonlyRegistry,
} from '@mindforge/engine';
import type { AudioEvent } from '@mindforge/schema';
import { DEFAULT_AUDIO_MIXER_VOLUMES } from './mixer';
import { effectiveBusGain, VOICE_DUCKING } from './mix-policy';

interface ActiveSource {
  readonly source: AudioBufferSourceNode;
  readonly gain: GainNode;
}

/**
 * Live Web Audio implementation. It never advances its own episode clock:
 * every source is reconstructed from the Engine's authoritative transport on
 * load, seek, restart, speed changes, pause/resume, and normal playback ticks.
 */
export class BrowserAudioRuntime implements AudioRuntime {
  private context?: AudioContext;
  private master?: GainNode;
  private readonly busGains = new Map<Exclude<AudioMixerBus, 'master'>, GainNode>();
  private readonly volumes: Record<AudioMixerBus, number> = { ...DEFAULT_AUDIO_MIXER_VOLUMES };
  private muted = false;
  private voiceDucked = false;
  private events: readonly AudioEvent[] = [];
  private cues?: ReadonlyRegistry<AudioCueDefinition>;
  private readonly buffers = new Map<string, AudioBuffer>();
  private readonly pendingBuffers = new Map<string, Promise<void>>();
  private readonly active = new Map<string, ActiveSource>();
  private lastTime = 0;

  load(
    events: readonly AudioEvent[],
    cues: ReadonlyRegistry<AudioCueDefinition>,
    _duration: number,
  ): void {
    this.stopAll();
    this.events = [...events].sort((a, b) => a.at - b.at || a.id.localeCompare(b.id));
    this.cues = cues;
    this.lastTime = 0;
    this.applyDucking(false, true);

    // Start production-asset fetch/decode before the user presses Play. Missing
    // optional preferred assets fall back to deterministic procedural audio.
    for (const cueId of new Set(this.events.map((event) => event.cue))) {
      const cue = this.cues.get(cueId);
      if (cue.preferredSource?.kind === 'url' || cue.source.kind === 'url') this.getBuffer(cue);
    }
  }

  sync(state: AudioTransportState, reason: AudioSyncReason): void {
    if (!state.playing || state.speed <= 0) {
      this.stopAll();
      this.applyDucking(false, reason !== 'tick');
      this.lastTime = state.time;
      return;
    }

    const context = this.ensureContext();
    void context.resume();

    if (
      reason !== 'tick' ||
      state.time + 0.02 < this.lastTime ||
      Math.abs(state.time - this.lastTime) > 0.3
    ) {
      this.stopAll();
    }

    for (const entry of this.active.values()) {
      entry.source.playbackRate.setValueAtTime(state.speed, context.currentTime);
    }

    let voiceActive = false;
    for (const event of this.events) {
      const cue = this.cues?.get(event.cue);
      if (!cue) continue;
      const buffer = this.getBuffer(cue);
      if (!buffer) continue;

      const start = event.at + (event.delay ?? 0);
      const loop = event.loop ?? cue.loop ?? false;
      const availableDuration = Math.max(0, state.duration - start);
      const activeDuration = loop
        ? Math.min(event.duration ?? availableDuration, availableDuration)
        : Math.min(event.duration ?? buffer.duration, buffer.duration, availableDuration);
      const end = start + activeDuration;
      const inWindow = state.time >= start && state.time < end && activeDuration > 0;

      if (!inWindow) {
        this.stopEvent(event.id);
        continue;
      }

      if ((event.bus ?? cue.bus) === 'voice') voiceActive = true;

      if (!this.active.has(event.id)) {
        const localTime = Math.max(0, state.time - start);
        const offset = loop && buffer.duration > 0 ? localTime % buffer.duration : localTime;
        this.startEvent(event, cue, buffer, offset, localTime, state.speed, activeDuration);
      }
    }

    this.applyDucking(voiceActive, reason !== 'tick');
    this.lastTime = state.time;
  }

  unlock(): void {
    const context = this.ensureContext();
    void context.resume();
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    this.applyMasterGain();
  }

  isMuted(): boolean {
    return this.muted;
  }

  setBusVolume(bus: AudioMixerBus, volume: number): void {
    this.volumes[bus] = Math.max(0, Math.min(1, volume));
    if (bus === 'master') this.applyMasterGain();
    else this.applyBusGain(bus, true);
  }

  getBusVolume(bus: AudioMixerBus): number {
    return this.volumes[bus];
  }

  dispose(): void {
    this.stopAll();
    this.events = [];
    this.cues = undefined;
    this.buffers.clear();
    this.pendingBuffers.clear();
    if (this.context) void this.context.close();
    this.context = undefined;
    this.master = undefined;
    this.busGains.clear();
  }

  private ensureContext(): AudioContext {
    if (this.context) return this.context;
    const context = new AudioContext({ latencyHint: 'interactive' });
    const master = context.createGain();
    master.connect(context.destination);
    this.context = context;
    this.master = master;

    for (const bus of ['voice', 'music', 'sfx', 'ambience'] as const) {
      const gain = context.createGain();
      gain.gain.value = effectiveBusGain(bus, this.volumes[bus], this.voiceDucked);
      gain.connect(master);
      this.busGains.set(bus, gain);
    }
    this.applyMasterGain();
    return context;
  }

  private applyMasterGain(): void {
    if (!this.master || !this.context) return;
    this.master.gain.setValueAtTime(this.muted ? 0 : this.volumes.master, this.context.currentTime);
  }

  private applyDucking(voiceActive: boolean, immediate = false): void {
    if (voiceActive === this.voiceDucked && !immediate) return;
    this.voiceDucked = voiceActive;
    for (const bus of ['music', 'sfx', 'ambience'] as const) this.applyBusGain(bus, immediate);
  }

  private applyBusGain(bus: Exclude<AudioMixerBus, 'master'>, immediate: boolean): void {
    const node = this.busGains.get(bus);
    const context = this.context;
    if (!node || !context) return;
    const target = effectiveBusGain(bus, this.volumes[bus], this.voiceDucked);
    node.gain.cancelScheduledValues(context.currentTime);
    if (immediate || bus === 'voice') {
      node.gain.setValueAtTime(target, context.currentTime);
      return;
    }
    const timeConstant = this.voiceDucked ? VOICE_DUCKING.attack / 3 : VOICE_DUCKING.release / 3;
    node.gain.setTargetAtTime(target, context.currentTime, Math.max(0.005, timeConstant));
  }

  private getBuffer(cue: AudioCueDefinition): AudioBuffer | undefined {
    const cached = this.buffers.get(cue.id);
    if (cached) return cached;
    if (this.pendingBuffers.has(cue.id)) return undefined;

    const context = this.ensureContext();
    const preferred = cue.preferredSource;
    if (preferred?.kind === 'procedural') {
      const buffer = this.sourceToBuffer(context, cue.id, preferred);
      this.buffers.set(cue.id, buffer);
      return buffer;
    }
    if (!preferred && cue.source.kind === 'procedural') {
      const buffer = this.sourceToBuffer(context, cue.id, cue.source);
      this.buffers.set(cue.id, buffer);
      return buffer;
    }

    const pending = this.loadBestSource(context, cue)
      .then((buffer) => {
        if (buffer) this.buffers.set(cue.id, buffer);
      })
      .catch((error: unknown) => {
        console.warn(`MindForge audio: failed to load ${cue.id}:`, error);
      })
      .finally(() => {
        this.pendingBuffers.delete(cue.id);
      });
    this.pendingBuffers.set(cue.id, pending);
    return undefined;
  }

  private async loadBestSource(
    context: AudioContext,
    cue: AudioCueDefinition,
  ): Promise<AudioBuffer | undefined> {
    if (cue.preferredSource) {
      try {
        return await this.loadSource(context, cue.id, cue.preferredSource);
      } catch {
        // Optional production override missing/invalid: use the guaranteed fallback.
      }
    }
    return this.loadSource(context, cue.id, cue.source);
  }

  private async loadSource(
    context: AudioContext,
    cueId: string,
    source: AudioCueSource,
  ): Promise<AudioBuffer> {
    if (source.kind === 'procedural') return this.sourceToBuffer(context, cueId, source);
    const response = await fetch(source.url);
    if (!response.ok) throw new Error(`HTTP ${response.status} for ${source.url}`);
    return context.decodeAudioData(await response.arrayBuffer());
  }

  private sourceToBuffer(
    context: AudioContext,
    cueId: string,
    source: Extract<AudioCueSource, { kind: 'procedural' }>,
  ): AudioBuffer {
    const pcm = source.render(context.sampleRate);
    if (
      !pcm.channels.length ||
      pcm.channels.some((channel) => channel.length !== pcm.channels[0].length)
    ) {
      throw new Error(`Audio cue "${cueId}" returned inconsistent PCM channels.`);
    }
    const buffer = context.createBuffer(
      pcm.channels.length,
      pcm.channels[0].length,
      pcm.sampleRate,
    );
    pcm.channels.forEach((channel, index) => {
      buffer.copyToChannel(new Float32Array(channel), index);
    });
    return buffer;
  }

  private startEvent(
    event: AudioEvent,
    cue: AudioCueDefinition,
    buffer: AudioBuffer,
    offset: number,
    localTime: number,
    speed: number,
    activeDuration: number,
  ): void {
    const context = this.ensureContext();
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.loop = event.loop ?? cue.loop ?? false;
    source.playbackRate.value = speed;

    const gain = context.createGain();
    const baseGain = (cue.defaultGain ?? 1) * (event.volume ?? 1);
    this.scheduleSourceEnvelope(
      gain.gain,
      baseGain,
      localTime,
      activeDuration,
      cue.fadeIn ?? 0,
      cue.fadeOut ?? 0,
      speed,
    );
    source.connect(gain);
    gain.connect(this.busGains.get(event.bus ?? cue.bus) ?? this.master ?? context.destination);

    source.onended = () => {
      const current = this.active.get(event.id);
      if (current?.source === source) this.active.delete(event.id);
    };
    this.active.set(event.id, { source, gain });

    if (source.loop) source.start(0, offset, Math.max(0.001, activeDuration - localTime));
    else source.start(0, Math.min(offset, Math.max(0, buffer.duration - 0.001)));
  }

  private scheduleSourceEnvelope(
    param: AudioParam,
    baseGain: number,
    localTime: number,
    duration: number,
    requestedFadeIn: number,
    requestedFadeOut: number,
    speed: number,
  ): void {
    const context = this.ensureContext();
    const now = context.currentTime;
    const safeSpeed = Math.max(0.001, speed);
    const fadeIn = Math.min(Math.max(0, requestedFadeIn), duration * 0.5);
    const fadeOut = Math.min(Math.max(0, requestedFadeOut), duration * 0.5);
    const fadeOutStart = Math.max(fadeIn, duration - fadeOut);
    const current = envelopeGain(localTime, duration, fadeIn, fadeOut);

    param.cancelScheduledValues(now);
    param.setValueAtTime(baseGain * current, now);
    if (fadeIn > 0 && localTime < fadeIn) {
      param.linearRampToValueAtTime(baseGain, now + (fadeIn - localTime) / safeSpeed);
    }
    if (fadeOut > 0 && localTime < duration) {
      const rampStartDelay = Math.max(0, fadeOutStart - localTime) / safeSpeed;
      if (localTime < fadeOutStart) param.setValueAtTime(baseGain, now + rampStartDelay);
      param.linearRampToValueAtTime(0, now + Math.max(0.001, duration - localTime) / safeSpeed);
    }
  }

  private stopEvent(id: string): void {
    const entry = this.active.get(id);
    if (!entry) return;
    entry.source.onended = null;
    try {
      entry.source.stop();
    } catch {
      // Already ended — deleting below is enough.
    }
    entry.source.disconnect();
    entry.gain.disconnect();
    this.active.delete(id);
  }

  private stopAll(): void {
    for (const id of [...this.active.keys()]) this.stopEvent(id);
  }
}

function envelopeGain(time: number, duration: number, fadeIn: number, fadeOut: number): number {
  if (duration <= 0 || time < 0 || time >= duration) return 0;
  const inGain = fadeIn > 0 ? Math.min(1, time / fadeIn) : 1;
  const remaining = duration - time;
  const outGain = fadeOut > 0 ? Math.min(1, remaining / fadeOut) : 1;
  return Math.max(0, Math.min(inGain, outGain));
}
