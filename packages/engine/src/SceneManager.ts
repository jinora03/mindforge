import * as THREE from 'three';
import type {
  EntityDefinition,
  EpisodeScript,
  FaceState,
  PropertyEvent,
  TimelineEvent,
  Vec3,
} from '@mindforge/schema';
import type {
  CapabilityRegistries,
  EnvironmentInstance,
  Entity,
  ResolvedText,
} from './EngineTypes';
import { EntityManager } from './EntityManager';
import { SceneContext } from './SceneContext';
import {
  DEFAULT_DURATIONS,
  MotionAction,
  EffectAction,
  TextAction,
  CallbackAction,
  VisibilityTrack,
  FaceTrack,
  PropertyTrack,
  Timeline,
  type PropertyChannel,
  type PropValue,
} from './Timeline';
import {
  GroupEntityImpl,
  LightEntityImpl,
  PrefabEntityImpl,
  PrimitiveEntityImpl,
  applyTransform,
  createLight,
  createPrimitiveGeometry,
  createPrimitiveMaterial,
} from './entities';
import { InstanceCreationError, type ErrorLocation } from './errors';
import { hashSeed } from './rng';
import type { LoadedEpisode } from './EpisodeLoader';

export interface BuiltScene {
  readonly entities: EntityManager;
  readonly environment: EnvironmentInstance;
  readonly timeline: Timeline;
  readonly context: SceneContext;
}

/**
 * Turns a validated {@link LoadedEpisode} into live Three.js objects: the
 * environment, the entity tree, and a fully-wired {@link Timeline}. All
 * content meaning stays in the script; this class only assembles registered
 * capabilities.
 */
export class SceneManager {
  build(
    loaded: LoadedEpisode,
    registries: CapabilityRegistries,
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
  ): BuiltScene {
    const { script } = loaded;
    const entities = new EntityManager();
    const context = new SceneContext(scene, camera, script.duration, entities, script.id);

    const environment = this.buildEnvironment(script, registries, context);
    scene.add(environment.object3d);

    this.buildEntities(script.entities, registries, scene, entities);

    const timeline = this.buildTimeline(loaded, registries, scene, context, entities);

    return { entities, environment, timeline, context };
  }

  private buildEnvironment(
    script: EpisodeScript,
    registries: CapabilityRegistries,
    context: SceneContext,
  ): EnvironmentInstance {
    const factory = registries.environments.get(script.environment);
    try {
      return factory({ services: context, parameters: script.metadata ?? {} });
    } catch (cause) {
      throw new InstanceCreationError(`environment "${script.environment}"`, cause, {
        episodeId: script.id,
      });
    }
  }

  private buildEntities(
    definitions: EntityDefinition[],
    registries: CapabilityRegistries,
    parent: THREE.Object3D,
    entities: EntityManager,
    group?: GroupEntityImpl,
  ): void {
    for (const def of definitions) {
      const entity = this.buildEntity(def, registries, entities);
      parent.add(entity.object3d);
      entities.register(entity);
      if (group) group.registerChildAnchor(def.id, entity.object3d);
      if (def.type === 'group') {
        this.buildEntities(def.children, registries, entity.object3d, entities, entity as GroupEntityImpl);
      }
    }
  }

  private buildEntity(
    def: EntityDefinition,
    registries: CapabilityRegistries,
    _entities: EntityManager,
  ): Entity {
    switch (def.type) {
      case 'character': {
        const factory = registries.characters.get(def.factory);
        let entity: Entity;
        try {
          entity = factory({ id: def.id, parameters: def.parameters ?? {} });
        } catch (cause) {
          throw new InstanceCreationError(`character "${def.factory}"`, cause, {
            entityId: def.id,
          });
        }
        applyTransform(entity.object3d, def);
        return entity;
      }
      case 'prefab': {
        const factory = registries.prefabs.get(def.factory);
        let instance;
        try {
          instance = factory({ id: def.id, parameters: def.parameters ?? {} });
        } catch (cause) {
          throw new InstanceCreationError(`prefab "${def.factory}"`, cause, {
            entityId: def.id,
          });
        }
        const entity = new PrefabEntityImpl(def.id, instance);
        applyTransform(entity.object3d, def);
        return entity;
      }
      case 'primitive': {
        const geometry = createPrimitiveGeometry(def.geometry, def.size);
        const material = createPrimitiveMaterial(def);
        const mesh = new THREE.Mesh(geometry, material);
        applyTransform(mesh, def);
        return new PrimitiveEntityImpl(def.id, mesh);
      }
      case 'light': {
        const light = createLight(def);
        applyTransform(light, { position: def.position });
        return new LightEntityImpl(def.id, light);
      }
      case 'group': {
        const groupObject = new THREE.Group();
        applyTransform(groupObject, def);
        return new GroupEntityImpl(def.id, groupObject);
      }
    }
  }

  private buildTimeline(
    loaded: LoadedEpisode,
    registries: CapabilityRegistries,
    scene: THREE.Scene,
    context: SceneContext,
    entities: EntityManager,
  ): Timeline {
    const timeline = new Timeline();
    const { script } = loaded;

    // Grouped state tracks collected while scanning events.
    const visibilityByTarget = new Map<string, { at: number; visible: boolean }[]>();
    const faceByTarget = new Map<string, { at: number; state: FaceState }[]>();
    const propertyByKey = new Map<string, { target: string; channel: PropertyChannel; events: PropertyEvent[] }>();

    for (const event of script.timeline) {
      const at = event.at + (event.delay ?? 0);
      switch (event.type) {
        case 'motion': {
          const target = entities.get(event.target, { episodeId: script.id, eventId: event.id });
          const factory = registries.motions.get(event.motion);
          const instance = this.tryCreate(
            () => factory({ target, event, services: context }),
            `motion "${event.motion}"`,
            script.id,
            event.id,
          );
          timeline.addMotion(
            new MotionAction(event.id, at, event.duration ?? DEFAULT_DURATIONS.motion, event.easing, instance),
          );
          break;
        }
        case 'objectMotion': {
          const target = resolveObjectMotionTarget(entities, event.target, {
            episodeId: script.id,
            eventId: event.id,
          });
          const factory = registries.motions.get(event.motion);
          const instance = this.tryCreate(
            () => factory({ target, event, services: context }),
            `motion "${event.motion}"`,
            script.id,
            event.id,
          );
          timeline.addMotion(
            new MotionAction(event.id, at, event.duration ?? DEFAULT_DURATIONS.motion, event.easing, instance),
          );
          break;
        }
        case 'effect': {
          const factory = registries.effects.get(event.effect);
          const seed = hashSeed(script.id, event.id);
          const instance = this.tryCreate(
            () => factory({ event, services: context, seed }),
            `effect "${event.effect}"`,
            script.id,
            event.id,
          );
          scene.add(instance.object3d);
          timeline.addEffect(
            new EffectAction(event.id, at, event.duration ?? DEFAULT_DURATIONS.effect, event.easing, instance),
          );
          break;
        }
        case 'camera': {
          const factory = registries.cameras.get(event.preset);
          const shot = this.tryCreate(
            () => factory({ event, services: context }),
            `camera "${event.preset}"`,
            script.id,
            event.id,
          );
          timeline.addCamera({
            at,
            duration: event.duration ?? DEFAULT_DURATIONS.camera,
            easing: event.easing,
            shot,
          });
          break;
        }
        case 'text': {
          const resolved = this.resolveText(event, loaded.textById);
          timeline.addText(new TextAction(event.id, at, event.duration ?? DEFAULT_DURATIONS.text, resolved));
          break;
        }
        case 'visibility': {
          const list = visibilityByTarget.get(event.target) ?? [];
          list.push({ at, visible: event.visible });
          visibilityByTarget.set(event.target, list);
          break;
        }
        case 'face': {
          const list = faceByTarget.get(event.target) ?? [];
          list.push({ at, state: event.state });
          faceByTarget.set(event.target, list);
          break;
        }
        case 'property': {
          const key = `${event.target}:${event.property}`;
          const bucket = propertyByKey.get(key) ?? { target: event.target, channel: event.property, events: [] };
          bucket.events.push({ ...event, at });
          propertyByKey.set(key, bucket);
          break;
        }
        case 'callback': {
          timeline.addCallback(new CallbackAction(event.id, at, event.name));
          break;
        }
      }
    }

    this.buildTracks(timeline, entities, visibilityByTarget, faceByTarget, propertyByKey);
    return timeline;
  }

  private buildTracks(
    timeline: Timeline,
    entities: EntityManager,
    visibilityByTarget: Map<string, { at: number; visible: boolean }[]>,
    faceByTarget: Map<string, { at: number; state: FaceState }[]>,
    propertyByKey: Map<string, { target: string; channel: PropertyChannel; events: PropertyEvent[] }>,
  ): void {
    for (const [target, events] of visibilityByTarget) {
      const object = entities.resolveAnchor(target);
      timeline.addVisibilityTrack(new VisibilityTrack(object, object.visible, events));
    }
    for (const [target, events] of faceByTarget) {
      const entity = entities.get(target);
      timeline.addFaceTrack(new FaceTrack((state) => entity.setFace?.(state), events));
    }
    for (const { target, channel, events } of propertyByKey.values()) {
      const object = entities.resolveAnchor(target);
      const base = readBaseProperty(object, channel);
      const sorted = [...events].sort((a, b) => a.at - b.at);
      let previousTo = base;
      const resolvedEvents = sorted.map((event) => {
        const to = resolvePropValue(event.to, base);
        const from = event.from !== undefined ? resolvePropValue(event.from, base) : previousTo;
        previousTo = to;
        return {
          at: event.at,
          duration: event.duration ?? 1,
          easing: event.easing,
          from,
          to,
        };
      });
      timeline.addPropertyTrack(new PropertyTrack(object, channel, base, resolvedEvents));
    }
  }

  private resolveText(
    event: Extract<TimelineEvent, { type: 'text' }>,
    textById: ReadonlyMap<string, ResolvedText>,
  ): ResolvedText {
    if (event.textId) {
      const found = textById.get(event.textId);
      if (found) {
        return {
          id: found.id,
          content: event.content ?? found.content,
          style: event.style ?? found.style,
          placement: event.placement ?? found.placement,
        };
      }
    }
    return {
      id: event.textId ?? event.id,
      content: event.content ?? '',
      style: event.style ?? 'explanation',
      placement: event.placement ?? 'lower',
    };
  }

  private tryCreate<T>(create: () => T, what: string, episodeId: string, eventId: string): T {
    try {
      return create();
    } catch (cause) {
      throw new InstanceCreationError(what, cause, { episodeId, eventId });
    }
  }
}

/**
 * Object motions may target either a top-level entity id or a semantic prefab
 * anchor such as `machine.core`. Anchor adapters are intentionally non-owning:
 * disposing the parent prefab remains the prefab entity's responsibility.
 */
function resolveObjectMotionTarget(
  entities: EntityManager,
  ref: string,
  location: ErrorLocation,
): Entity {
  const direct = entities.tryGet(ref);
  if (direct) return direct;
  const object3d = entities.resolveAnchor(ref, location);
  return {
    id: ref,
    kind: 'group',
    object3d,
    getAnchor: () => undefined,
    anchorNames: () => [],
    dispose: () => {},
  };
}

/* --------------------------------------------------------- property values */

function readBaseProperty(object: THREE.Object3D, channel: PropertyChannel): PropValue {
  switch (channel) {
    case 'position':
      return { kind: 'vec3', v: object.position.toArray() as Vec3 };
    case 'rotation':
      return { kind: 'vec3', v: [object.rotation.x, object.rotation.y, object.rotation.z] };
    case 'scale':
      return { kind: 'vec3', v: object.scale.toArray() as Vec3 };
    case 'opacity':
      return { kind: 'number', n: firstMaterial(object)?.opacity ?? 1 };
    case 'emissiveIntensity':
      return {
        kind: 'number',
        n: (firstMaterial(object) as THREE.MeshStandardMaterial | undefined)?.emissiveIntensity ?? 1,
      };
    case 'color': {
      const material = firstMaterial(object) as THREE.MeshStandardMaterial | undefined;
      return { kind: 'color', c: (material?.color ?? new THREE.Color('#ffffff')).clone() };
    }
    case 'intensity':
      return { kind: 'number', n: firstLight(object)?.intensity ?? 1 };
  }
}

function resolvePropValue(raw: number | Vec3 | string, base: PropValue): PropValue {
  if (typeof raw === 'number') return { kind: 'number', n: raw };
  if (Array.isArray(raw)) return { kind: 'vec3', v: raw };
  if (typeof raw === 'string') return { kind: 'color', c: new THREE.Color(raw) };
  return base;
}

function firstMaterial(object: THREE.Object3D): THREE.Material | undefined {
  let found: THREE.Material | undefined;
  object.traverse((node) => {
    if (found) return;
    const mesh = node as THREE.Mesh;
    if (mesh.material) found = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
  });
  return found;
}

function firstLight(object: THREE.Object3D): THREE.Light | undefined {
  let found: THREE.Light | undefined;
  object.traverse((node) => {
    const light = node as THREE.Light;
    if (!found && light.isLight) found = light;
  });
  return found;
}
