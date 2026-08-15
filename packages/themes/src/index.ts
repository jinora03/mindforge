export * from './ThemeTypes';
export * from './original';

import type { MindForgeTheme } from './ThemeTypes';
import { ORIGINAL_THEME } from './original';

export const DEFAULT_THEME_ID = ORIGINAL_THEME.id;

const THEMES = new Map<string, MindForgeTheme>([[ORIGINAL_THEME.id, ORIGINAL_THEME]]);

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
