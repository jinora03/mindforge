import { z } from 'zod';
import { HexColorSchema, RegistryIdSchema, Vec3Schema } from './common';

/** Entity kinds the Engine knows how to build. */
export const ENTITY_TYPES = ['character', 'primitive', 'group', 'light'] as const;

/** Procedural primitive shapes. All default to faceted / flat-shaded forms. */
export const PRIMITIVE_GEOMETRIES = [
  'box',
  'sphere',
  'icosahedron',
  'cylinder',
  'cone',
  'torus',
  'prism',
  'plane',
] as const;

/** Light kinds. */
export const LIGHT_TYPES = ['ambient', 'directional', 'point', 'hemisphere'] as const;

const TransformFields = {
  position: Vec3Schema.optional(),
  rotation: Vec3Schema.optional(),
  scale: z.union([z.number(), Vec3Schema]).optional(),
  visible: z.boolean().optional(),
};

const CharacterEntitySchema = z
  .object({
    id: z.string().min(1),
    type: z.literal('character'),
    /** Registry id of the character factory, e.g. `character.observer`. */
    factory: RegistryIdSchema,
    parameters: z.record(z.unknown()).optional(),
    ...TransformFields,
  })
  .strict();

const PrimitiveEntitySchema = z
  .object({
    id: z.string().min(1),
    type: z.literal('primitive'),
    geometry: z.enum(PRIMITIVE_GEOMETRIES),
    /** Uniform size or explicit dimensions, interpreted per geometry. */
    size: z.union([z.number(), Vec3Schema]).optional(),
    color: HexColorSchema.optional(),
    emissive: HexColorSchema.optional(),
    emissiveIntensity: z.number().min(0).optional(),
    roughness: z.number().min(0).max(1).optional(),
    metalness: z.number().min(0).max(1).optional(),
    opacity: z.number().min(0).max(1).optional(),
    flatShading: z.boolean().optional(),
    ...TransformFields,
  })
  .strict();

const LightEntitySchema = z
  .object({
    id: z.string().min(1),
    type: z.literal('light'),
    light: z.enum(LIGHT_TYPES),
    color: HexColorSchema.optional(),
    groundColor: HexColorSchema.optional(),
    intensity: z.number().min(0).optional(),
    distance: z.number().min(0).optional(),
    ...TransformFields,
  })
  .strict();

/**
 * The type of {@link EntityDefinition}. Declared explicitly because the `group`
 * variant is recursive, which Zod cannot infer on its own.
 */
export interface GroupEntity {
  id: string;
  type: 'group';
  children: EntityDefinition[];
  position?: z.infer<typeof Vec3Schema>;
  rotation?: z.infer<typeof Vec3Schema>;
  scale?: number | z.infer<typeof Vec3Schema>;
  visible?: boolean;
}

export type EntityDefinition =
  | z.infer<typeof CharacterEntitySchema>
  | z.infer<typeof PrimitiveEntitySchema>
  | z.infer<typeof LightEntitySchema>
  | GroupEntity;

export const EntityDefinitionSchema: z.ZodType<EntityDefinition, z.ZodTypeDef, unknown> = z.lazy(
  () =>
    z.discriminatedUnion('type', [
      CharacterEntitySchema,
      PrimitiveEntitySchema,
      LightEntitySchema,
      GroupEntitySchema,
    ]),
);

const GroupEntitySchema = z
  .object({
    id: z.string().min(1),
    type: z.literal('group'),
    children: z.array(EntityDefinitionSchema).default([]),
    ...TransformFields,
  })
  .strict();

export type CharacterEntity = z.infer<typeof CharacterEntitySchema>;
export type PrimitiveEntity = z.infer<typeof PrimitiveEntitySchema>;
export type LightEntity = z.infer<typeof LightEntitySchema>;

export {
  CharacterEntitySchema,
  PrimitiveEntitySchema,
  LightEntitySchema,
  GroupEntitySchema,
};

/** Recursively collect all entity ids in declaration order (parents first). */
export function collectEntityIds(entities: EntityDefinition[]): string[] {
  const ids: string[] = [];
  const walk = (list: EntityDefinition[]): void => {
    for (const entity of list) {
      ids.push(entity.id);
      if (entity.type === 'group') {
        walk(entity.children);
      }
    }
  };
  walk(entities);
  return ids;
}
