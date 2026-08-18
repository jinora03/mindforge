import type { AudioPcmData } from '@mindforge/engine';

export const TAU = Math.PI * 2;

export function deterministicNoise(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return (state / 0x100000000) * 2 - 1;
  };
}

export function envelope(time: number, duration: number, attack: number, release: number): number {
  const attackGain = attack <= 0 ? 1 : Math.min(1, time / attack);
  const remaining = duration - time;
  const releaseGain = release <= 0 ? 1 : Math.min(1, remaining / release);
  return clamp01(Math.min(attackGain, releaseGain));
}

export function expDecay(time: number, rate: number): number {
  return Math.exp(-time * rate);
}

export function equalPowerPan(pan: number): readonly [number, number] {
  const normalized = clamp01((pan + 1) * 0.5);
  const angle = normalized * Math.PI * 0.5;
  return [Math.cos(angle), Math.sin(angle)];
}

export function stereo(
  sampleRate: number,
  duration: number,
  sample: (time: number, index: number) => readonly [number, number],
): AudioPcmData {
  const length = Math.max(1, Math.ceil(sampleRate * duration));
  const left = new Float32Array(length);
  const right = new Float32Array(length);
  let peak = 0;
  for (let i = 0; i < length; i++) {
    const [rawLeft, rawRight] = sample(i / sampleRate, i);
    const l = softClip(rawLeft);
    const r = softClip(rawRight);
    left[i] = l;
    right[i] = r;
    peak = Math.max(peak, Math.abs(l), Math.abs(r));
  }
  if (peak > 0.94) {
    const scale = 0.94 / peak;
    for (let i = 0; i < length; i++) {
      left[i] *= scale;
      right[i] *= scale;
    }
  }
  return { sampleRate, channels: [left, right] };
}

export function softClip(value: number): number {
  return Math.tanh(value * 1.18) / Math.tanh(1.18);
}

export function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}
