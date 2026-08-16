export * from './ThemeTypes';
export * from './toybox';
export * from './voxel';

import type { MindForgeTheme } from './ThemeTypes';
import { TOYBOX_THEME } from './toybox';
import { VOXEL_THEME } from './voxel';

/** Production default. Toybox is a fully-supported alternative art direction. */
export const DEFAULT_THEME_ID = VOXEL_THEME.id;

const THEMES = new Map<string, MindForgeTheme>([
  [TOYBOX_THEME.id, TOYBOX_THEME],
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

/** Stable list for Studio/Player selectors and validation. */
export function listThemes(): string[] {
  return [...THEMES.keys()].sort();
}
