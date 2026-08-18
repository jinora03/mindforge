import { Registry, type PrefabFactory } from '@mindforge/engine';

/** Registry of theme-owned semantic prefab factories (e.g. `prefab.externalHand`). */
export class PrefabRegistry extends Registry<PrefabFactory> {
  constructor() {
    super('prefab');
  }
}