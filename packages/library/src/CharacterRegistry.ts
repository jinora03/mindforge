import { Registry, type CharacterFactory } from '@mindforge/engine';

/** Registry of character factories (e.g. `character.observer`). */
export class CharacterRegistry extends Registry<CharacterFactory> {
  constructor() {
    super('character');
  }
}
