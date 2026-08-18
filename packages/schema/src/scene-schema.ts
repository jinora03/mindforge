import { z } from 'zod';
import { RegistryIdSchema } from './common';
import { EntityDefinitionSchema, collectEntityIds } from './entity-schema';
import { formatIssues } from './errors';
import { SceneLayerDefinitionSchema, duplicateSceneLayerIds } from './scene-layer-schema';

/**
 * A reusable Scene preset describes an environment plus a set of entities that
 * multiple episodes can share (for example "The Crucible" staging). Scenes are
 * pure content: no timeline, no renderer, no clocks.
 */
export const SceneScriptSchema = z
  .object({
    schemaVersion: z.string(),
    id: z.string().min(1),
    title: z.string().min(1).optional(),
    environment: RegistryIdSchema,
    layers: z.array(SceneLayerDefinitionSchema).default([]),
    entities: z.array(EntityDefinitionSchema).default([]),
    metadata: z.record(z.unknown()).optional(),
  })
  .strict()
  .superRefine((scene, ctx) => {
    for (const id of duplicateSceneLayerIds(scene.layers)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['layers'],
        message: `duplicate scene layer id "${id}"`,
      });
    }

    const ids = collectEntityIds(scene.entities);
    const seen = new Set<string>();
    for (const id of ids) {
      if (seen.has(id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['entities'],
          message: `duplicate entity id "${id}"`,
        });
      }
      seen.add(id);
    }
  });

export type SceneScript = z.infer<typeof SceneScriptSchema>;

export function parseScene(data: unknown): SceneScript {
  const result = SceneScriptSchema.safeParse(data);
  if (!result.success) {
    throw new Error(`Invalid scene:\n${formatIssues(result.error.issues)}`);
  }
  return result.data;
}
