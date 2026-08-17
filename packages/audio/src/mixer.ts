import type { AudioMixerBus } from '@mindforge/engine';

/** Shared live/offline defaults tuned for short-form narration clarity. */
export const DEFAULT_AUDIO_MIXER_VOLUMES: Readonly<Record<AudioMixerBus, number>> = {
  master: 0.88,
  voice: 1,
  music: 0.45,
  sfx: 0.78,
  ambience: 0.32,
};
