/**
 * @mindforge/schema — the MindForge Script format and its validation.
 *
 * This package is intentionally free of Three.js and any rendering concern.
 * It defines the shape of episodes, scenes, entities, timelines, and text, and
 * validates them with Zod. Registry-id *existence* is checked by the Engine /
 * CLI against the Library, not here.
 */
export * from './common';
export * from './errors';
export * from './text-schema';
export * from './entity-schema';
export * from './timeline-schema';
export * from './scene-schema';
export * from './episode-schema';

import { z } from 'zod';
import { TextFileSchema, type TextFile } from './text-schema';
import { formatIssues } from './errors';

/** Parse a `text.json` sidecar file. */
export function parseTextFile(data: unknown): TextFile {
  const result = TextFileSchema.safeParse(data);
  if (!result.success) {
    throw new Error(`Invalid text file:\n${formatIssues(result.error.issues)}`);
  }
  return result.data;
}

/** Re-export Zod so consumers can build derived schemas without a direct dep. */
export { z };
