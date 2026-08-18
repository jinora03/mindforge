import { z } from 'zod';
import { RegistryIdSchema } from './common';
import { EntityDefinitionSchema, collectEntityIds } from './entity-schema';
import { TimelineEventSchema } from './timeline-schema';
import { TextDefinitionSchema } from './text-schema';
import { SceneLayerDefinitionSchema, duplicateSceneLayerIds } from './scene-layer-schema';
import { EpisodeValidationError } from './errors';

/** The current MindForge Script version. */
export const SCHEMA_VERSION = '0.1';

/**
 * Universe Bible domains, expressed as slugs. One dominant domain per episode.
 */
export const DOMAINS = [
  'crucible',
  'signal-ocean',
  'archive',
  'dream-garden',
  'gravity-well',
  'choice-labyrinth',
] as const;

/** Universe Bible artifact taxonomy. */
export const ARTIFACT_TYPES = [
  'core',
  'engine',
  'loom',
  'gate',
  'mirror',
  'garden',
  'well',
  'archive',
  'crown',
  'labyrinth',
] as const;

export const DomainSchema = z.enum(DOMAINS);
export const ArtifactTypeSchema = z.enum(ARTIFACT_TYPES);

export const EpisodeScriptSchema = z
  .object({
    schemaVersion: z.string(),
    id: z.string().min(1),
    /** Public, searchable question title (Universe Bible). */
    title: z.string().min(1),
    /** Optional lore name such as "The Prediction Engine". */
    artifactName: z.string().optional(),
    artifactNumber: z.number().int().positive().optional(),
    artifactType: ArtifactTypeSchema.optional(),
    domain: DomainSchema.optional(),
    duration: z.number().positive(),
    environment: RegistryIdSchema,
    layers: z.array(SceneLayerDefinitionSchema).default([]),
    entities: z.array(EntityDefinitionSchema).default([]),
    timeline: z.array(TimelineEventSchema).default([]),
    text: z.array(TextDefinitionSchema).optional(),
    metadata: z.record(z.unknown()).optional(),
  })
  .strict()
  .superRefine((episode, ctx) => {
    if (episode.schemaVersion !== SCHEMA_VERSION) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['schemaVersion'],
        message: `unsupported schemaVersion "${episode.schemaVersion}"; expected "${SCHEMA_VERSION}"`,
      });
    }

    // Local scene-layer ids must be unique so diagnostics, Studio controls,
    // and deterministic per-layer seeds remain stable.
    for (const id of duplicateSceneLayerIds(episode.layers)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['layers'],
        message: `duplicate scene layer id "${id}"`,
      });
    }

    // Entity ids must be globally unique (including nested group children).
    const entityIds = collectEntityIds(episode.entities);
    const seenEntities = new Set<string>();
    for (const id of entityIds) {
      if (seenEntities.has(id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['entities'],
          message: `duplicate entity id "${id}"`,
        });
      }
      seenEntities.add(id);
    }

    // Timeline event ids must be unique so seeking and diagnostics are stable.
    const seenEvents = new Set<string>();
    episode.timeline.forEach((event, index) => {
      if (seenEvents.has(event.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['timeline', index, 'id'],
          message: `duplicate timeline event id "${event.id}"`,
        });
      }
      seenEvents.add(event.id);

      // Text events need something to show.
      if (event.type === 'text' && !event.textId && !event.content) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['timeline', index],
          message: 'text event must provide either "textId" or "content"',
        });
      }
    });

    // Text definition ids must be unique.
    if (episode.text) {
      const seenText = new Set<string>();
      episode.text.forEach((entry, index) => {
        if (seenText.has(entry.id)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['text', index, 'id'],
            message: `duplicate text id "${entry.id}"`,
          });
        }
        seenText.add(entry.id);
      });
    }
  });

export type EpisodeScript = z.infer<typeof EpisodeScriptSchema>;

/** Validate raw JSON into a typed episode, throwing a readable error on failure. */
export function parseEpisode(data: unknown): EpisodeScript {
  const result = EpisodeScriptSchema.safeParse(data);
  if (!result.success) {
    const id =
      data && typeof data === 'object' && 'id' in data && typeof data.id === 'string'
        ? data.id
        : undefined;
    throw new EpisodeValidationError(result.error.issues, id);
  }
  return result.data;
}

/** Non-throwing variant used by the Studio error panel and the CLI validator. */
export function safeParseEpisode(
  data: unknown,
): { success: true; episode: EpisodeScript } | { success: false; error: EpisodeValidationError } {
  const result = EpisodeScriptSchema.safeParse(data);
  if (result.success) {
    return { success: true, episode: result.data };
  }
  const id =
    data && typeof data === 'object' && 'id' in data && typeof data.id === 'string'
      ? data.id
      : undefined;
  return { success: false, error: new EpisodeValidationError(result.error.issues, id) };
}
