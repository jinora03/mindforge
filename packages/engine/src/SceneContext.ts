import type * as THREE from 'three';
import type { Entity, SceneServices } from './EngineTypes';
import type { EntityManager } from './EntityManager';

/**
 * The concrete {@link SceneServices} implementation handed to every factory.
 * It exposes only what a capability needs — the scene, the camera, the episode
 * duration, and resolvers — never Engine internals or content meaning.
 */
export class SceneContext implements SceneServices {
  constructor(
    readonly scene: THREE.Scene,
    readonly camera: THREE.PerspectiveCamera,
    readonly duration: number,
    private readonly entities: EntityManager,
    private readonly episodeId: string,
  ) {}

  getEntity(id: string): Entity {
    return this.entities.get(id, { episodeId: this.episodeId });
  }

  tryGetEntity(id: string): Entity | undefined {
    return this.entities.tryGet(id);
  }

  resolveAnchor(ref: string): THREE.Object3D {
    return this.entities.resolveAnchor(ref, { episodeId: this.episodeId });
  }

  tryResolveAnchor(ref: string): THREE.Object3D | undefined {
    return this.entities.tryResolveAnchor(ref);
  }
}
