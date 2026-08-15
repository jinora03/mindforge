import { z } from 'zod';

/** A dotted registry identifier, e.g. `motion.humanoid.walk`. */
export const RegistryIdSchema = z
  .string()
  .regex(
    /^[a-zA-Z][A-Za-z0-9_-]*(\.[a-zA-Z][A-Za-z0-9_-]*)*$/,
    'must be a dotted registry id such as "motion.humanoid.walk"',
  );

/** A three-component vector (position, rotation in radians, scale, colour rgb). */
export const Vec3Schema = z.tuple([z.number(), z.number(), z.number()]);

/** A hex colour string, e.g. `#6737FF`. Palette meaning lives in the Design Bible. */
export const HexColorSchema = z
  .string()
  .regex(/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/, 'must be a hex colour such as "#6737FF"');

/**
 * Named easing curves. The Engine owns the implementations; content only
 * references the name so playback stays deterministic and reproducible.
 */
export const EASINGS = [
  'linear',
  'easeIn',
  'easeOut',
  'easeInOut',
  'easeInOutCubic',
  'easeInOutSine',
  'easeOutBack',
  'easeOutElastic',
] as const;

export const EasingSchema = z.enum(EASINGS);

export type Vec3 = z.infer<typeof Vec3Schema>;
export type Easing = z.infer<typeof EasingSchema>;
