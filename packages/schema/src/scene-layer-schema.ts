import { z } from 'zod';
import { RegistryIdSchema } from './common';

/**
 * Broad production roles used to organise a scene composition. The Engine does
 * not attach behaviour to these values; they are semantic/editor metadata that
 * lets Studio, validation, and future authoring tools reason about the stack
 * without knowing theme-specific implementations.
 */
export const SCENE_LAYER_ROLES = [
  'world',
  'surface',
  'setDressing',
  'atmosphere',
  'weather',
  'lighting',
  'foreground',
  'utility',
] as const;

export const SceneLayerRoleSchema = z.enum(SCENE_LAYER_ROLES);

/**
 * One reusable scene-composition capability. `factory` is a semantic registry
 * id (for example `layer.weather.heavyRain`); declaration order is preserved by
 * the runtime and is the canonical ordering for deterministic updates.
 */
export const SceneLayerDefinitionSchema = z
  .object({
    /** Local instance id, unique inside the scene/episode. */
    id: z.string().min(1),
    /** Semantic implementation id resolved through the active theme. */
    factory: RegistryIdSchema,
    /** Organisational role only; the generic Engine never branches on it. */
    role: SceneLayerRoleSchema,
    /** Static authoring switch. Disabled layers validate but are not constructed. */
    enabled: z.boolean().default(true),
    parameters: z.record(z.unknown()).optional(),
  })
  .strict();

export type SceneLayerRole = z.infer<typeof SceneLayerRoleSchema>;
export type SceneLayerDefinition = z.infer<typeof SceneLayerDefinitionSchema>;

/** Return duplicate local layer ids in declaration order. */
export function duplicateSceneLayerIds(layers: readonly SceneLayerDefinition[]): string[] {
  const seen = new Set<string>();
  const duplicates: string[] = [];
  for (const layer of layers) {
    if (seen.has(layer.id)) duplicates.push(layer.id);
    seen.add(layer.id);
  }
  return duplicates;
}
