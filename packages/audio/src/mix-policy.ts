import type { AudioMixerBus } from '@mindforge/engine';

export const VOICE_DUCKING = {
  attack: 0.055,
  release: 0.28,
  music: 0.34,
  ambience: 0.48,
  sfx: 0.74,
} as const;

export type DuckableBus = 'music' | 'sfx' | 'ambience';

export function effectiveBusGain(bus: Exclude<AudioMixerBus, 'master'>, volume: number, voiceActive: boolean): number {
  if (!voiceActive || bus === 'voice') return volume;
  return volume * VOICE_DUCKING[bus];
}

export interface AudioWindow {
  readonly start: number;
  readonly end: number;
}

export function mergeAudioWindows(windows: readonly AudioWindow[]): AudioWindow[] {
  const sorted = windows
    .filter((window) => Number.isFinite(window.start) && Number.isFinite(window.end) && window.end > window.start)
    .map((window) => ({ ...window }))
    .sort((a, b) => a.start - b.start || a.end - b.end);
  const merged: AudioWindow[] = [];
  for (const window of sorted) {
    const previous = merged[merged.length - 1];
    if (!previous || window.start > previous.end) {
      merged.push(window);
      continue;
    }
    merged[merged.length - 1] = { start: previous.start, end: Math.max(previous.end, window.end) };
  }
  return merged;
}
