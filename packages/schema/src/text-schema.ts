import { z } from 'zod';

/**
 * Text presets map to the Design Bible typography roles (question / hook,
 * explanation, artifact label, brand lockup, technical numbers).
 * The Engine treats these as opaque style keys; the apps render them as DOM
 * overlays so that captions stay crisp and phone-readable.
 */
export const TEXT_STYLES = [
  'question',
  'explanation',
  'artifactLabel',
  'brandLockup',
  'number',
] as const;

/**
 * Vertical placements follow the Design Bible 9:16 safe zones:
 * top chrome, upper-middle reveal, center, lower thirds, bottom caption band.
 */
export const TEXT_PLACEMENTS = ['top', 'upper', 'center', 'lower', 'bottom'] as const;

export const TextStyleSchema = z.enum(TEXT_STYLES);
export const TextPlacementSchema = z.enum(TEXT_PLACEMENTS);

export const TextDefinitionSchema = z
  .object({
    id: z.string().min(1),
    content: z.string().min(1),
    style: TextStyleSchema.default('explanation'),
    placement: TextPlacementSchema.default('lower'),
  })
  .strict();

/** A `text.json` file is simply a list of reusable text definitions. */
export const TextFileSchema = z.object({
  schemaVersion: z.string(),
  entries: z.array(TextDefinitionSchema),
});

export type TextStyle = z.infer<typeof TextStyleSchema>;
export type TextPlacement = z.infer<typeof TextPlacementSchema>;
export type TextDefinition = z.infer<typeof TextDefinitionSchema>;
export type TextFile = z.infer<typeof TextFileSchema>;
