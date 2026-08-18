import type { AudioMixerBus } from '@mindforge/engine';

/** Shared live/offline defaults. Reference narration stays opt-in for production review. */
export const DEFAULT_AUDIO_MIXER_VOLUMES: Readonly<Record<AudioMixerBus, number>> = {
  master: 0.88,
  voice: 0,
  music: 0.45,
  sfx: 0.78,
  ambience: 0.32,
};
