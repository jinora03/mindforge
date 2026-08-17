import { z } from 'zod';
import { EasingSchema, HexColorSchema, RegistryIdSchema, Vec3Schema } from './common';

export const TIMELINE_EVENT_TYPES = [
  'motion',
  'objectMotion',
  'effect',
  'camera',
  'text',
  'visibility',
  'property',
  'face',
  'callback',
  'audio',
] as const;

/** Face states the procedural humanoid can express. */
export const VISUAL_TONES = [
  'neutral',
  'information',
  'prediction',
  'suppression',
  'reaction',
  'insight',
  'heat',
] as const;

export const VisualToneSchema = z.enum(VISUAL_TONES);

export const FACE_STATES = [
  'neutral',
  'confused',
  'focused',
  'disappointed',
  'surprised',
  'laughing',
] as const;

/** Animatable properties for the generic `property` tween event. */
export const PROPERTY_TARGETS = [
  'position',
  'rotation',
  'scale',
  'opacity',
  'color',
  'emissiveIntensity',
  'intensity',
] as const;

export const FaceStateSchema = z.enum(FACE_STATES);

export const AUDIO_BUSES = ['voice', 'music', 'sfx', 'ambience'] as const;
export const AudioBusSchema = z.enum(AUDIO_BUSES);

/** Fields shared by every timeline event. Only `id`, `type`, and `at` are required. */
const baseFields = {
  id: z.string().min(1),
  at: z.number().min(0),
  duration: z.number().min(0).optional(),
  delay: z.number().min(0).optional(),
  easing: EasingSchema.optional(),
  intensity: z.number().optional(),
  repeat: z.number().int().min(0).optional(),
  parameters: z.record(z.unknown()).optional(),
};

const MotionEventSchema = z
  .object({
    ...baseFields,
    type: z.literal('motion'),
    target: z.string().min(1),
    motion: RegistryIdSchema,
    mirror: z.boolean().optional(),
    speed: z.number().positive().optional(),
  })
  .strict();

const ObjectMotionEventSchema = z
  .object({
    ...baseFields,
    type: z.literal('objectMotion'),
    target: z.string().min(1),
    motion: RegistryIdSchema,
    axis: Vec3Schema.optional(),
    from: z.union([z.number(), Vec3Schema]).optional(),
    to: z.union([z.number(), Vec3Schema]).optional(),
  })
  .strict();

const EffectEventSchema = z
  .object({
    ...baseFields,
    type: z.literal('effect'),
    effect: RegistryIdSchema,
    target: z.string().optional(),
    /** Anchor references such as `observer.head` for signal-style effects. */
    from: z.string().optional(),
    to: z.string().optional(),
    through: z.array(z.string()).optional(),
    /** Semantic visual meaning interpreted by the active theme. */
    tone: VisualToneSchema.optional(),
    /** Low-level override retained for tooling/debug content; production episodes should prefer `tone`. */
    color: HexColorSchema.optional(),
  })
  .strict();

const CameraEventSchema = z
  .object({
    ...baseFields,
    type: z.literal('camera'),
    preset: RegistryIdSchema,
    target: z.string().optional(),
    from: Vec3Schema.optional(),
    to: Vec3Schema.optional(),
    fov: z.number().positive().optional(),
    framingOffset: Vec3Schema.optional(),
    shake: z.number().min(0).optional(),
  })
  .strict();

const TextEventSchema = z
  .object({
    ...baseFields,
    type: z.literal('text'),
    /** Reference to an entry in the episode's text file, or inline content. */
    textId: z.string().optional(),
    content: z.string().optional(),
    style: z.enum(['question', 'explanation', 'artifactLabel', 'brandLockup', 'number']).optional(),
    placement: z.enum(['top', 'upper', 'center', 'lower', 'bottom']).optional(),
  })
  .strict();

const VisibilityEventSchema = z
  .object({
    ...baseFields,
    type: z.literal('visibility'),
    target: z.string().min(1),
    visible: z.boolean(),
  })
  .strict();

const PropertyEventSchema = z
  .object({
    ...baseFields,
    type: z.literal('property'),
    target: z.string().min(1),
    property: z.enum(PROPERTY_TARGETS),
    from: z.union([z.number(), Vec3Schema, HexColorSchema]).optional(),
    to: z.union([z.number(), Vec3Schema, HexColorSchema]),
  })
  .strict();

const FaceEventSchema = z
  .object({
    ...baseFields,
    type: z.literal('face'),
    target: z.string().min(1),
    state: FaceStateSchema,
  })
  .strict();

const CallbackEventSchema = z
  .object({
    ...baseFields,
    type: z.literal('callback'),
    name: z.string().min(1),
  })
  .strict();


const AudioEventSchema = z
  .object({
    ...baseFields,
    type: z.literal('audio'),
    /** Stable semantic cue id resolved by the shared audio registry. */
    cue: RegistryIdSchema,
    /** Optional caption/text entry spoken by this cue. Used for narration validation/sync metadata. */
    textId: z.string().min(1).optional(),
    /** Optional per-event routing override. Most cues use their registered default bus. */
    bus: AudioBusSchema.optional(),
    /** Linear gain multiplier for this event. Defaults to 1. */
    volume: z.number().min(0).max(2).optional(),
    /** Loop the cue for the event window. Looping events should provide `duration`. */
    loop: z.boolean().optional(),
  })
  .strict();

export const TimelineEventSchema = z.discriminatedUnion('type', [
  MotionEventSchema,
  ObjectMotionEventSchema,
  EffectEventSchema,
  CameraEventSchema,
  TextEventSchema,
  VisibilityEventSchema,
  PropertyEventSchema,
  FaceEventSchema,
  CallbackEventSchema,
  AudioEventSchema,
]);

export type VisualTone = z.infer<typeof VisualToneSchema>;
export type TimelineEvent = z.infer<typeof TimelineEventSchema>;
export type MotionEvent = z.infer<typeof MotionEventSchema>;
export type ObjectMotionEvent = z.infer<typeof ObjectMotionEventSchema>;
export type EffectEvent = z.infer<typeof EffectEventSchema>;
export type CameraEvent = z.infer<typeof CameraEventSchema>;
export type TextEvent = z.infer<typeof TextEventSchema>;
export type VisibilityEvent = z.infer<typeof VisibilityEventSchema>;
export type PropertyEvent = z.infer<typeof PropertyEventSchema>;
export type FaceEvent = z.infer<typeof FaceEventSchema>;
export type CallbackEvent = z.infer<typeof CallbackEventSchema>;
export type AudioEvent = z.infer<typeof AudioEventSchema>;
export type AudioBus = z.infer<typeof AudioBusSchema>;
export type FaceState = z.infer<typeof FaceStateSchema>;

export {
  MotionEventSchema,
  ObjectMotionEventSchema,
  EffectEventSchema,
  CameraEventSchema,
  TextEventSchema,
  VisibilityEventSchema,
  PropertyEventSchema,
  FaceEventSchema,
  CallbackEventSchema,
  AudioEventSchema,
};
