import { Registry, type AudioCueDefinition } from '@mindforge/engine';

/** Registry of semantic audio cues shared across visual themes. */
export class AudioCueRegistry extends Registry<AudioCueDefinition> {
  constructor() {
    super('audio');
  }

  /** Convenience: register by cue descriptor object. */
  describe(cue: AudioCueDefinition): this {
    this.register(cue.id, cue);
    return this;
  }
}
