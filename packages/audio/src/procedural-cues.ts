import type { AudioCueDefinition, AudioPcmData } from '@mindforge/engine';
import productionAssets from './production-assets.json';
import { deterministicNoise, envelope, equalPowerPan, expDecay, stereo, TAU } from './production-dsp';

function gardenAmbience(sampleRate: number): AudioPcmData {
  const duration = 6;
  const leftNoise = deterministicNoise(0x6d696e64);
  const rightNoise = deterministicNoise(0x67617264);
  let leftAir = 0;
  let rightAir = 0;
  return stereo(sampleRate, duration, (time) => {
    leftAir += (leftNoise() - leftAir) * 0.012;
    rightAir += (rightNoise() - rightAir) * 0.012;
    const breezeL = leftAir * (0.075 + 0.018 * Math.sin(TAU * 0.11 * time));
    const breezeR = rightAir * (0.075 + 0.018 * Math.sin(TAU * 0.09 * time + 1.2));
    const bed = Math.sin(TAU * 146.83 * time) * 0.006 + Math.sin(TAU * 220 * time) * 0.004;
    const chirpPhase = time % 2.8;
    const chirpEnv = chirpPhase < 0.24 ? envelope(chirpPhase, 0.24, 0.02, 0.16) : 0;
    const chirp = Math.sin(TAU * (1180 + chirpPhase * 680) * time) * chirpEnv * 0.018;
    return [breezeL + bed + chirp * 0.55, breezeR + bed * 0.8 + chirp];
  });
}

function factoryAmbience(sampleRate: number): AudioPcmData {
  const duration = 4;
  const leftNoise = deterministicNoise(0x66616374);
  const rightNoise = deterministicNoise(0x6f727931);
  let leftAir = 0;
  let rightAir = 0;
  return stereo(sampleRate, duration, (time) => {
    leftAir += (leftNoise() - leftAir) * 0.016;
    rightAir += (rightNoise() - rightAir) * 0.014;
    const hum = Math.sin(TAU * 48 * time) * 0.055 + Math.sin(TAU * 96 * time) * 0.016;
    const motor = Math.sin(TAU * (132 + 5 * Math.sin(TAU * 0.42 * time)) * time) * 0.015;
    const clankPhase = time % 1.73;
    const clankEnv = clankPhase < 0.09 ? expDecay(clankPhase, 35) : 0;
    const clank = Math.sin(TAU * 610 * time) * clankEnv * 0.025;
    return [hum + motor + leftAir * 0.035 + clank, hum * 0.93 + motor * 0.8 + rightAir * 0.035 + clank * 0.55];
  });
}

function informationPing(sampleRate: number): AudioPcmData {
  const duration = 0.58;
  return stereo(sampleRate, duration, (time) => {
    const env = envelope(time, duration, 0.004, 0.28) * expDecay(time, 3.3);
    const body =
      Math.sin(TAU * 704 * time) * 0.18 +
      Math.sin(TAU * 1056 * time) * 0.095 +
      Math.sin(TAU * 1408 * time) * 0.035;
    const echoTime = Math.max(0, time - 0.12);
    const echo = time >= 0.12 ? Math.sin(TAU * 880 * echoTime) * expDecay(echoTime, 6) * 0.055 : 0;
    return [(body + echo * 0.35) * env, (body * 0.82 + echo) * env];
  });
}

function handWhoosh(sampleRate: number): AudioPcmData {
  const duration = 0.68;
  const noise = deterministicNoise(0x68616e64);
  let low = 0;
  let previousLow = 0;
  return stereo(sampleRate, duration, (time) => {
    const raw = noise();
    low += (raw - low) * (0.045 + time * 0.11);
    const band = low - previousLow * 0.72;
    previousLow = low;
    const env = envelope(time, duration, 0.065, 0.18);
    const pan = -0.72 + 1.44 * (time / duration);
    const [lPan, rPan] = equalPowerPan(pan);
    const sweep = Math.sin(TAU * (95 + 360 * time) * time) * 0.035;
    const signal = (band * 0.48 + sweep) * env;
    return [signal * lPan, signal * rPan];
  });
}

function touchTick(sampleRate: number): AudioPcmData {
  const duration = 0.24;
  const noise = deterministicNoise(0x746f7563);
  return stereo(sampleRate, duration, (time) => {
    const click = noise() * expDecay(time, 70) * 0.19;
    const softBody = Math.sin(TAU * (280 - 90 * time) * time) * expDecay(time, 18) * 0.16;
    const sparkle = Math.sin(TAU * 1220 * time) * expDecay(time, 22) * 0.055;
    const env = envelope(time, duration, 0.002, 0.08);
    return [(click + softBody + sparkle * 0.55) * env, (click * 0.72 + softBody + sparkle) * env];
  });
}

function reactionBurst(sampleRate: number): AudioPcmData {
  const duration = 0.62;
  const noiseL = deterministicNoise(0x72656163);
  const noiseR = deterministicNoise(0x74696f6e);
  let airL = 0;
  let airR = 0;
  return stereo(sampleRate, duration, (time) => {
    airL += (noiseL() - airL) * 0.12;
    airR += (noiseR() - airR) * 0.12;
    const thump = Math.sin(TAU * (155 - 82 * time) * time) * expDecay(time, 7.5) * 0.28;
    const snap = Math.sin(TAU * 760 * time) * expDecay(time, 19) * 0.08;
    const airEnv = envelope(time, duration, 0.012, 0.22) * expDecay(time, 4.2);
    return [thump + snap * 0.6 + airL * airEnv * 0.12, thump * 0.94 + snap + airR * airEnv * 0.12];
  });
}

function machineStart(sampleRate: number): AudioPcmData {
  const duration = 1.16;
  const noise = deterministicNoise(0x6d616368);
  let grit = 0;
  let phase = 0;
  return stereo(sampleRate, duration, (time) => {
    const normalized = time / duration;
    const freq = 58 + 245 * normalized * normalized;
    phase += (TAU * freq) / sampleRate;
    grit += (noise() - grit) * 0.07;
    const env = envelope(time, duration, 0.025, 0.18);
    const motor = Math.sin(phase) * 0.19 + Math.sin(phase * 2.01) * 0.065 + Math.sin(phase * 3.98) * 0.025;
    const startup = noise() * expDecay(time, 25) * 0.09;
    const texture = grit * (0.03 + normalized * 0.055);
    return [(motor + startup + texture) * env, (motor * 0.96 + startup * 0.7 - texture * 0.7) * env];
  });
}

function machinePulse(sampleRate: number): AudioPcmData {
  const duration = 0.46;
  const noise = deterministicNoise(0x70756c73);
  return stereo(sampleRate, duration, (time) => {
    const env = envelope(time, duration, 0.003, 0.17) * expDecay(time, 5.8);
    const body = Math.sin(TAU * (138 - 58 * time) * time) * 0.28;
    const click = noise() * expDecay(time, 38) * 0.08;
    const overtone = Math.sin(TAU * 414 * time) * expDecay(time, 12) * 0.055;
    return [(body + click + overtone * 0.6) * env, (body + click * 0.65 + overtone) * env];
  });
}

function heatRelease(sampleRate: number): AudioPcmData {
  const duration = 1.18;
  const noiseL = deterministicNoise(0x68656174);
  const noiseR = deterministicNoise(0x73746561);
  let steamL = 0;
  let steamR = 0;
  return stereo(sampleRate, duration, (time) => {
    steamL += (noiseL() - steamL) * 0.22;
    steamR += (noiseR() - steamR) * 0.2;
    const env = envelope(time, duration, 0.006, 0.38) * expDecay(time, 2.15);
    const boom = Math.sin(TAU * (92 - 33 * time) * time) * expDecay(time, 5.2) * 0.26;
    const hissRise = Math.min(1, time / 0.08);
    const hiss = hissRise * env * 0.22;
    return [boom + steamL * hiss, boom * 0.94 + steamR * hiss];
  });
}

function insightChime(sampleRate: number): AudioPcmData {
  const duration = 1.28;
  return stereo(sampleRate, duration, (time) => {
    const env = envelope(time, duration, 0.004, 0.5) * expDecay(time, 1.85);
    const root = Math.sin(TAU * 523.25 * time) * 0.135;
    const third = Math.sin(TAU * 659.25 * time) * 0.105;
    const fifth = Math.sin(TAU * 783.99 * time) * 0.08;
    const shimmer = Math.sin(TAU * 1567.98 * time) * 0.022;
    const delayed = time > 0.145 ? Math.sin(TAU * 1046.5 * (time - 0.145)) * expDecay(time - 0.145, 3.7) * 0.05 : 0;
    return [(root + third + fifth * 0.6 + shimmer + delayed * 0.35) * env, (root + third * 0.78 + fifth + shimmer * 0.75 + delayed) * env];
  });
}

const PRODUCTION_CUE_IDS = new Set<string>(productionAssets.productionCueIds);

function productionCue(
  id: string,
  filename: string,
  render: (sampleRate: number) => AudioPcmData,
  defaultGain: number,
  description: string,
  options: { loop?: boolean; fadeIn?: number; fadeOut?: number } = {},
): AudioCueDefinition {
  return {
    id,
    bus: id.startsWith('audio.ambience.') ? 'ambience' : 'sfx',
    source: { kind: 'procedural', render },
    preferredSource: PRODUCTION_CUE_IDS.has(id)
      ? { kind: 'url', url: `/assets/audio/${id.startsWith('audio.ambience.') ? 'ambience' : 'sfx'}/${filename}.mp3` }
      : undefined,
    defaultGain,
    loop: options.loop,
    fadeIn: options.fadeIn,
    fadeOut: options.fadeOut,
    description,
  };
}

/**
 * Production-oriented defaults. Real MP3 assets at the preferred URLs win
 * automatically; the deterministic stereo renderers remain high-quality-enough
 * fallbacks for a fresh clone and for tests.
 */
export const DEFAULT_AUDIO_CUES: readonly AudioCueDefinition[] = [
  productionCue('audio.ambience.garden', 'garden', gardenAmbience, 0.48, 'Outdoor breeze/room tone.', {
    loop: true,
    fadeIn: 0.3,
    fadeOut: 0.35,
  }),
  productionCue('audio.ambience.factory', 'factory', factoryAmbience, 0.5, 'Low workshop and machinery room tone.', {
    loop: true,
    fadeIn: 0.25,
    fadeOut: 0.35,
  }),
  productionCue('audio.sfx.information', 'information', informationPing, 0.7, 'Glassy information/data accent.', { fadeIn: 0.004, fadeOut: 0.08 }),
  productionCue('audio.sfx.handWhoosh', 'hand-whoosh', handWhoosh, 0.78, 'Directional external-hand approach whoosh.', { fadeIn: 0.012, fadeOut: 0.1 }),
  productionCue('audio.sfx.touch', 'touch', touchTick, 0.75, 'Soft tactile contact transient.', { fadeIn: 0.002, fadeOut: 0.055 }),
  productionCue('audio.sfx.reaction', 'reaction', reactionBurst, 0.82, 'Body-led playful reaction accent.', { fadeIn: 0.002, fadeOut: 0.15 }),
  productionCue('audio.sfx.machineStart', 'machine-start', machineStart, 0.76, 'Layered mechanical spin-up.', { fadeIn: 0.01, fadeOut: 0.13 }),
  productionCue('audio.sfx.machinePulse', 'machine-pulse', machinePulse, 0.76, 'Mechanical/core pulse.', { fadeIn: 0.002, fadeOut: 0.11 }),
  productionCue('audio.sfx.heatRelease', 'heat-release', heatRelease, 0.82, 'Pressure release with low impact and steam tail.', { fadeIn: 0.004, fadeOut: 0.24 }),
  productionCue('audio.sfx.insight', 'insight', insightChime, 0.68, 'Warm answer/reveal chime.', { fadeIn: 0.003, fadeOut: 0.34 }),
];
