import type * as THREE from 'three';
import type { SceneLayerDefinition } from '@mindforge/schema';
import type {
  Disposable,
  FrameContext,
  SceneCompositionLayerInfo,
  SceneCompositionLayerInstance,
} from './EngineTypes';

interface LayerEntry {
  readonly definition: SceneLayerDefinition;
  readonly instance?: SceneCompositionLayerInstance;
}

/**
 * Owns the ordered runtime instances declared in `episode.layers`.
 *
 * The stack intentionally has no knowledge of rain, fog, lighting, voxel, or
 * any other visual meaning. It only preserves declaration order, updates every
 * enabled layer from the Engine's authoritative FrameContext, and owns cleanup.
 */
export class SceneCompositionLayerStack implements Disposable {
  private readonly entries: LayerEntry[] = [];

  constructor(private readonly scene: THREE.Scene) {}

  add(definition: SceneLayerDefinition, instance?: SceneCompositionLayerInstance): void {
    if (instance) {
      instance.object3d.name ||= `mindforge-layer:${definition.id}`;
      this.scene.add(instance.object3d);
    }
    this.entries.push({ definition, instance });
  }

  update(ctx: FrameContext): void {
    for (const entry of this.entries) {
      if (entry.instance) entry.instance.update(ctx);
    }
  }

  info(): readonly SceneCompositionLayerInfo[] {
    return this.entries.map(({ definition }) => ({
      id: definition.id,
      factory: definition.factory,
      role: definition.role,
      enabled: definition.enabled,
    }));
  }

  dispose(): void {
    // Reverse construction order so dependent overlay layers are torn down
    // before the foundations they may reference.
    for (let index = this.entries.length - 1; index >= 0; index--) {
      const entry = this.entries[index];
      entry.instance?.object3d.removeFromParent();
      entry.instance?.dispose();
    }
    this.entries.length = 0;
  }
}
