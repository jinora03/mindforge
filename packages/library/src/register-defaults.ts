import { DEFAULT_AUDIO_CUES, NARRATION_AUDIO_CUES } from '@mindforge/audio';
import type { AssetDescriptor } from '@mindforge/engine';
import { CAMERA_FACTORIES } from '@mindforge/cameras';
import { MOTION_FACTORIES } from '@mindforge/motions';
import { DEFAULT_THEME_ID, getTheme, type MindForgeTheme } from '@mindforge/themes';
import { MindForgeLibrary } from './MindForgeLibrary';

/** Theme-neutral descriptors reused by every visual skin. */
export const SHARED_ASSETS: AssetDescriptor[] = [
  { id: 'animation.humanoid.walk', kind: 'animation', procedural: true },
  { id: 'animation.humanoid.run', kind: 'animation', procedural: true },
  { id: 'animation.humanoid.laugh', kind: 'animation', procedural: true },
  { id: 'audio.impact.soft', kind: 'audio' },
  { id: 'audio.transition.rise', kind: 'audio' },
];

/** Compatibility catalogue for whichever visual theme is the production default. */
export const DEFAULT_ASSETS: AssetDescriptor[] = [
  ...SHARED_ASSETS,
  ...getTheme(DEFAULT_THEME_ID).assets,
];

/** Register theme-neutral behavior that should behave identically in every skin. */
function registerSharedCapabilities(library: MindForgeLibrary): void {
  for (const [id, factory] of Object.entries(MOTION_FACTORIES)) {
    library.motions.register(id, factory);
  }
  for (const [id, factory] of Object.entries(CAMERA_FACTORIES)) {
    library.cameras.register(id, factory);
  }
  for (const descriptor of SHARED_ASSETS) {
    library.assets.describe(descriptor);
  }
  for (const cue of [...DEFAULT_AUDIO_CUES, ...NARRATION_AUDIO_CUES]) {
    library.audio.describe(cue);
  }
}

/** Register the visual implementations selected by a theme. */
function registerThemeCapabilities(library: MindForgeLibrary, theme: MindForgeTheme): void {
  for (const [id, factory] of Object.entries(theme.characters)) {
    library.characters.register(id, factory);
  }
  for (const [id, factory] of Object.entries(theme.prefabs)) {
    library.prefabs.register(id, factory);
  }
  for (const [id, factory] of Object.entries(theme.effects)) {
    library.effects.register(id, factory);
  }
  for (const [id, factory] of Object.entries(theme.environments)) {
    library.environments.register(id, factory);
  }
  for (const descriptor of theme.assets) {
    library.assets.describe(descriptor);
  }
}

/** Build a library for a named visual theme. */
export function createLibraryForTheme(themeId: string = DEFAULT_THEME_ID): MindForgeLibrary {
  const theme = getTheme(themeId);
  const library = new MindForgeLibrary(theme.id);
  registerSharedCapabilities(library);
  registerThemeCapabilities(library, theme);
  return library;
}

/** Build the production-default library. Theme selection remains outside the Engine. */
export function createDefaultLibrary(): MindForgeLibrary {
  return createLibraryForTheme(DEFAULT_THEME_ID);
}

/** Backwards-compatible helper retained for callers that populate an instance. */
export function registerDefaults(library: MindForgeLibrary): MindForgeLibrary {
  const theme = getTheme(library.themeId);
  registerSharedCapabilities(library);
  registerThemeCapabilities(library, theme);
  return library;
}
