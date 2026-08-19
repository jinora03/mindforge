import { z } from 'zod';
import {
  EasingSchema,
  HexColorSchema,
  Vec3Schema,
} from './common';
import {
  AudioBusSchema,
  FaceStateSchema,
  PROPERTY_TARGETS,
  VisualToneSchema,
} from './timeline-schema';
import { TextPlacementSchema, TextStyleSchema } from './text-schema';
import { formatIssues } from './errors';

/** Schema version for the higher-level PF8 authoring format. */
export const COMPOSITION_SCHEMA_VERSION = '0.1';

const AliasSchema = z.string().min(1);
const ParametersSchema = z.record(z.unknown());

const TransformFields = {
  position: Vec3Schema.optional(),
  rotation: Vec3Schema.optional(),
  scale: z.union([z.number(), Vec3Schema]).optional(),
  visible: z.boolean().optional(),
};

/** A semantic layer capability such as `heavyRain`, `mist`, or `daylight`. */
export const CompositionCapabilitySchema = z
  .object({
    id: z.string().min(1).optional(),
    preset: AliasSchema,
    enabled: z.boolean().default(true),
    parameters: ParametersSchema.optional(),
  })
  .strict();

export const CompositionWorldSchema = z
  .object({
    /** Semantic world recipe, resolved by the composer vocabulary. */
    preset: AliasSchema,
    weather: CompositionCapabilitySchema.optional(),
    atmosphere: z.array(CompositionCapabilitySchema).default([]),
    /** Omit to keep the world recipe's lighting; false removes recipe lighting. */
    lighting: z.union([CompositionCapabilitySchema, z.literal(false)]).optional(),
  })
  .strict();

export const CompositionActorSchema = z
  .object({
    id: z.string().min(1),
    /** Semantic character alias, e.g. `observer`. */
    character: AliasSchema,
    parameters: ParametersSchema.optional(),
    ...TransformFields,
  })
  .strict();

export const CompositionPropSchema = z
  .object({
    id: z.string().min(1),
    /** Semantic prefab alias, e.g. `prismDrop`. */
    prefab: AliasSchema,
    parameters: ParametersSchema.optional(),
    ...TransformFields,
  })
  .strict();

const actionBase = {
  /** Optional stable suffix; otherwise generated from action type + declaration index. */
  id: z.string().min(1).optional(),
  /** Seconds relative to the containing beat. */
  offset: z.number().min(0).default(0),
  duration: z.number().min(0).optional(),
  easing: EasingSchema.optional(),
  intensity: z.number().optional(),
  repeat: z.number().int().min(0).optional(),
  parameters: ParametersSchema.optional(),
};

const AnimationActionSchema = z
  .object({
    ...actionBase,
    type: z.literal('animation'),
    target: z.string().min(1),
    /** PF2/PF3 semantic clip id, never an authored GLTF clip name. */
    clip: z.string().min(1),
    speed: z.number().positive().optional(),
    loop: z.boolean().optional(),
    startOffset: z.number().min(0).optional(),
    blendIn: z.number().min(0).optional(),
    blendOut: z.number().min(0).optional(),
  })
  .strict();

const MotionActionSchema = z
  .object({
    ...actionBase,
    type: z.literal('motion'),
    target: z.string().min(1),
    motion: AliasSchema,
    mirror: z.boolean().optional(),
    speed: z.number().positive().optional(),
  })
  .strict();

const ObjectMotionActionSchema = z
  .object({
    ...actionBase,
    type: z.literal('objectMotion'),
    target: z.string().min(1),
    motion: AliasSchema,
    axis: Vec3Schema.optional(),
    from: z.union([z.number(), Vec3Schema]).optional(),
    to: z.union([z.number(), Vec3Schema]).optional(),
  })
  .strict();

const EffectActionSchema = z
  .object({
    ...actionBase,
    type: z.literal('effect'),
    effect: AliasSchema,
    target: z.string().optional(),
    from: z.string().optional(),
    to: z.string().optional(),
    through: z.array(z.string()).optional(),
    tone: VisualToneSchema.optional(),
    color: HexColorSchema.optional(),
  })
  .strict();

const CameraActionSchema = z
  .object({
    ...actionBase,
    type: z.literal('camera'),
    shot: AliasSchema,
    target: z.string().optional(),
    from: Vec3Schema.optional(),
    to: Vec3Schema.optional(),
    fov: z.number().positive().optional(),
    framingOffset: Vec3Schema.optional(),
    shake: z.number().min(0).optional(),
  })
  .strict();

const TextActionSchema = z
  .object({
    ...actionBase,
    type: z.literal('text'),
    textId: z.string().optional(),
    content: z.string().optional(),
    style: TextStyleSchema.optional(),
    placement: TextPlacementSchema.optional(),
  })
  .strict();

const AudioActionSchema = z
  .object({
    ...actionBase,
    type: z.literal('audio'),
    cue: AliasSchema,
    textId: z.string().min(1).optional(),
    bus: AudioBusSchema.optional(),
    volume: z.number().min(0).max(2).optional(),
    loop: z.boolean().optional(),
  })
  .strict();

const FaceActionSchema = z
  .object({
    ...actionBase,
    type: z.literal('face'),
    target: z.string().min(1),
    state: FaceStateSchema,
  })
  .strict();

const VisibilityActionSchema = z
  .object({
    ...actionBase,
    type: z.literal('visibility'),
    target: z.string().min(1),
    visible: z.boolean(),
  })
  .strict();

const PropertyActionSchema = z
  .object({
    ...actionBase,
    type: z.literal('property'),
    target: z.string().min(1),
    property: z.enum(PROPERTY_TARGETS),
    from: z.union([z.number(), Vec3Schema, HexColorSchema]).optional(),
    to: z.union([z.number(), Vec3Schema, HexColorSchema]),
  })
  .strict();

export const CompositionActionSchema = z.discriminatedUnion('type', [
  AnimationActionSchema,
  MotionActionSchema,
  ObjectMotionActionSchema,
  EffectActionSchema,
  CameraActionSchema,
  TextActionSchema,
  AudioActionSchema,
  FaceActionSchema,
  VisibilityActionSchema,
  PropertyActionSchema,
]);

export const CompositionBeatSchema = z
  .object({
    id: z.string().min(1),
    at: z.number().min(0),
    /** Optional semantic/directing description preserved for authoring tools. */
    intent: z.string().min(1).optional(),
    /** Optional beat window used to validate relative action timing. */
    duration: z.number().positive().optional(),
    actions: z.array(CompositionActionSchema).min(1),
  })
  .strict()
  .superRefine((beat, ctx) => {
  const beatDuration = beat.duration;
  if (beatDuration === undefined) return;

  beat.actions.forEach((action, index) => {
    if (action.offset > beatDuration) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['actions', index, 'offset'],
        message: `action offset ${action.offset} exceeds beat duration ${beatDuration}`,
      });
    }

    if (
      action.duration !== undefined &&
      action.offset + action.duration > beatDuration
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['actions', index, 'duration'],
        message: 'action extends beyond the containing beat window',
      });
    }
  });
});

/**
 * PF8 authoring format: semantic production choices and directing beats that
 * compile into the lower-level deterministic EpisodeScript.
 */
export const SceneCompositionScriptSchema = z
  .object({
    schemaVersion: z.string(),
    id: z.string().min(1),
    title: z.string().min(1),
    duration: z.number().positive(),
    world: CompositionWorldSchema,
    actors: z.array(CompositionActorSchema).default([]),
    props: z.array(CompositionPropSchema).default([]),
    beats: z.array(CompositionBeatSchema).default([]),
    metadata: z.record(z.unknown()).optional(),
  })
  .strict()
  .superRefine((script, ctx) => {
    if (script.schemaVersion !== COMPOSITION_SCHEMA_VERSION) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['schemaVersion'],
        message: `unsupported composition schemaVersion "${script.schemaVersion}"; expected "${COMPOSITION_SCHEMA_VERSION}"`,
      });
    }

    const entityIds = new Set<string>();
    [...script.actors, ...script.props].forEach((entity, index) => {
      if (entityIds.has(entity.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [index < script.actors.length ? 'actors' : 'props'],
          message: `duplicate composed entity id "${entity.id}"`,
        });
      }
      entityIds.add(entity.id);
    });

    const beatIds = new Set<string>();
    script.beats.forEach((beat, beatIndex) => {
      if (beatIds.has(beat.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['beats', beatIndex, 'id'],
          message: `duplicate beat id "${beat.id}"`,
        });
      }
      beatIds.add(beat.id);

      if (beat.at > script.duration) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['beats', beatIndex, 'at'],
          message: 'beat starts after the episode duration',
        });
      }
      if (beat.duration !== undefined && beat.at + beat.duration > script.duration) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['beats', beatIndex, 'duration'],
          message: 'beat extends beyond the episode duration',
        });
      }

      beat.actions.forEach((action, actionIndex) => {
        if (action.type === 'text' && !action.textId && !action.content) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['beats', beatIndex, 'actions', actionIndex],
            message: 'text action must provide either "textId" or "content"',
          });
        }

        const eventStart = beat.at + action.offset;
        if (eventStart > script.duration) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['beats', beatIndex, 'actions', actionIndex, 'offset'],
            message: 'action starts after the episode duration',
          });
        }
        if (action.duration !== undefined && eventStart + action.duration > script.duration) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['beats', beatIndex, 'actions', actionIndex, 'duration'],
            message: 'action extends beyond the episode duration',
          });
        }
      });
    });
  });

export type CompositionCapability = z.infer<typeof CompositionCapabilitySchema>;
export type CompositionWorld = z.infer<typeof CompositionWorldSchema>;
export type CompositionActor = z.infer<typeof CompositionActorSchema>;
export type CompositionProp = z.infer<typeof CompositionPropSchema>;
export type CompositionAction = z.infer<typeof CompositionActionSchema>;
export type CompositionBeat = z.infer<typeof CompositionBeatSchema>;
export type SceneCompositionScript = z.infer<typeof SceneCompositionScriptSchema>;

export function parseSceneComposition(data: unknown): SceneCompositionScript {
  const result = SceneCompositionScriptSchema.safeParse(data);
  if (!result.success) {
    throw new Error(`Invalid scene composition:\n${formatIssues(result.error.issues)}`);
  }
  return result.data;
}
