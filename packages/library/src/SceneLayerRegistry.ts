import { Registry, type SceneCompositionLayerFactory } from '@mindforge/engine';

/** Registry of reusable scene-composition layer factories. */
export class SceneLayerRegistry extends Registry<SceneCompositionLayerFactory> {
  constructor() {
    super('scene layer');
  }
}
