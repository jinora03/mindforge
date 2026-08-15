import {
  collectEntityIds,
  parseEpisode,
  type EntityDefinition,
  type EpisodeScript,
} from '@mindforge/schema';
import type { CapabilityRegistries, ResolvedText } from './EngineTypes';
import { UnknownRegistryIdError } from './errors';
import { splitRef } from './EntityManager';

export interface LoadedEpisode {
  readonly script: EpisodeScript;
  /** Resolved text entries keyed by id (from the episode's inline text list). */
  readonly textById: ReadonlyMap<string, ResolvedText>;
  /** All entity ids (including nested group children). */
  readonly entityIds: ReadonlySet<string>;
}

/**
 * Validate raw episode JSON against the schema, then confirm every registry id
 * and entity reference resolves. Any failure throws a clear, located error;
 * this is the single gate before the Engine builds a scene.
 */
export function loadEpisode(raw: unknown, registries: CapabilityRegistries): LoadedEpisode {
  const script = parseEpisode(raw);
  const episodeId = script.id;

  if (!registries.environments.has(script.environment)) {
    throw new UnknownRegistryIdError('environment', script.environment, { episodeId });
  }

  const entityIds = new Set(collectEntityIds(script.entities));
  validateEntities(script.entities, registries, episodeId);

  const textById = new Map<string, ResolvedText>();
  for (const entry of script.text ?? []) {
    textById.set(entry.id, entry);
  }

  for (const event of script.timeline) {
    const loc = { episodeId, eventId: event.id };
    switch (event.type) {
      case 'motion':
      case 'objectMotion':
        requireRegistry(registries, 'motion', event.motion, loc);
        requireEntity(entityIds, event.target, loc);
        break;
      case 'effect':
        requireRegistry(registries, 'effect', event.effect, loc);
        if (event.target) requireEntity(entityIds, splitRef(event.target)[0], loc);
        for (const ref of [event.from, event.to, ...(event.through ?? [])]) {
          if (ref) requireEntity(entityIds, splitRef(ref)[0], loc);
        }
        break;
      case 'camera':
        requireRegistry(registries, 'camera', event.preset, loc);
        if (event.target) requireEntity(entityIds, splitRef(event.target)[0], loc);
        break;
      case 'text':
        if (event.textId && !textById.has(event.textId)) {
          throw new UnknownRegistryIdError('text', event.textId, loc);
        }
        break;
      case 'visibility':
      case 'property':
      case 'face':
        requireEntity(entityIds, splitRef(event.target)[0], loc);
        break;
      case 'callback':
        break;
    }
  }

  return { script, textById, entityIds };
}

function validateEntities(
  entities: EntityDefinition[],
  registries: CapabilityRegistries,
  episodeId: string,
): void {
  for (const entity of entities) {
    if (entity.type === 'character' && !registries.characters.has(entity.factory)) {
      throw new UnknownRegistryIdError('character', entity.factory, {
        episodeId,
        entityId: entity.id,
      });
    }
    if (entity.type === 'group') {
      validateEntities(entity.children, registries, episodeId);
    }
  }
}

function requireRegistry(
  registries: CapabilityRegistries,
  kind: 'motion' | 'effect' | 'camera',
  id: string,
  loc: { episodeId: string; eventId: string },
): void {
  const registry =
    kind === 'motion'
      ? registries.motions
      : kind === 'effect'
        ? registries.effects
        : registries.cameras;
  if (!registry.has(id)) {
    throw new UnknownRegistryIdError(kind, id, loc);
  }
}

function requireEntity(
  entityIds: ReadonlySet<string>,
  target: string,
  loc: { episodeId: string; eventId: string },
): void {
  if (!entityIds.has(target)) {
    throw new UnknownRegistryIdError('entity', target, loc);
  }
}
