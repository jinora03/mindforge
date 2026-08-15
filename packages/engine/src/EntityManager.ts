import type * as THREE from 'three';
import type { Entity, FrameContext } from './EngineTypes';
import { MissingAnchorError, MissingEntityError, type ErrorLocation } from './errors';

/**
 * Owns the set of entities for the loaded episode. Resolves entities and
 * anchors for factories, and runs the per-frame begin/end hooks that let
 * characters reset to a rest pose before the timeline poses them.
 */
export class EntityManager {
  private readonly entities = new Map<string, Entity>();

  register(entity: Entity): void {
    this.entities.set(entity.id, entity);
  }

  tryGet(id: string): Entity | undefined {
    return this.entities.get(id);
  }

  get(id: string, location: ErrorLocation = {}): Entity {
    const entity = this.entities.get(id);
    if (!entity) {
      throw new MissingEntityError(id, location);
    }
    return entity;
  }

  all(): Entity[] {
    return [...this.entities.values()];
  }

  /** Resolve `entityId.anchorName` (or `entityId`) to a world object, or throw. */
  resolveAnchor(ref: string, location: ErrorLocation = {}): THREE.Object3D {
    const resolved = this.tryResolveAnchor(ref);
    if (!resolved) {
      const [entityId] = splitRef(ref);
      const entity = this.entities.get(entityId);
      if (!entity) throw new MissingEntityError(entityId, location);
      throw new MissingAnchorError(ref, entity.anchorNames(), location);
    }
    return resolved;
  }

  tryResolveAnchor(ref: string): THREE.Object3D | undefined {
    const [entityId, anchorName] = splitRef(ref);
    const entity = this.entities.get(entityId);
    if (!entity) return undefined;
    if (!anchorName) return entity.object3d;
    return entity.getAnchor(anchorName);
  }

  beginFrame(ctx: FrameContext): void {
    for (const entity of this.entities.values()) {
      entity.beginFrame?.(ctx);
    }
  }

  endFrame(ctx: FrameContext): void {
    for (const entity of this.entities.values()) {
      entity.endFrame?.(ctx);
    }
  }

  dispose(): void {
    for (const entity of this.entities.values()) {
      entity.dispose();
    }
    this.entities.clear();
  }
}

/** Split `entity.anchor` into `[entityId, anchorName?]` (only the first dot). */
export function splitRef(ref: string): [string, string | undefined] {
  const dot = ref.indexOf('.');
  if (dot === -1) return [ref, undefined];
  return [ref.slice(0, dot), ref.slice(dot + 1)];
}
