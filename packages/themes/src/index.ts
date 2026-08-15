export * from './ThemeTypes';
export * from './legacy';
export * from './voxel';

import type { MindForgeTheme } from './ThemeTypes';
import { LEGACY_THEME } from './legacy';
import { VOXEL_THEME } from './voxel';

/** Production default. Legacy remains available only as a migration/debug comparison. */
export const DEFAULT_THEME_ID = VOXEL_THEME.id;

const THEMES = new Map<string, MindForgeTheme>([
  [LEGACY_THEME.id, LEGACY_THEME],
  [VOXEL_THEME.id, VOXEL_THEME],
]);

/** Resolve a theme id or fail early with a readable configuration error. */
export function getTheme(id: string): MindForgeTheme {
  const theme = THEMES.get(id);
  if (!theme) {
    throw new Error(`Unknown MindForge theme "${id}". Available: ${listThemes().join(', ')}`);
  }
  return theme;
}

/** Stable list for Studio selectors and validation. */
export function listThemes(): string[] {
  return [...THEMES.keys()].sort();
}
