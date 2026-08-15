export * from './ThemeTypes';
export * from './legacy';

import type { MindForgeTheme } from './ThemeTypes';
import { LEGACY_THEME } from './legacy';

/**
 * Transitional default only. Phase 1 will replace this with `voxel`; callers
 * must not treat `legacy` as a permanent or user-facing MindForge theme.
 */
export const DEFAULT_THEME_ID = LEGACY_THEME.id;

const THEMES = new Map<string, MindForgeTheme>([[LEGACY_THEME.id, LEGACY_THEME]]);

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
