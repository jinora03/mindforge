import { describe, expect, it } from 'vitest';
import { createDefaultLibrary, createLibraryForTheme } from '@mindforge/library';
import { DEFAULT_THEME_ID, getTheme, listThemes } from '@mindforge/themes';

describe('MindForge visual themes', () => {
  it('keeps Original as the backwards-compatible default', () => {
    expect(DEFAULT_THEME_ID).toBe('original');
    expect(listThemes()).toContain('original');
    expect(getTheme('original').label).toBe('MindForge Original');
    expect(createDefaultLibrary().themeId).toBe('original');
  });

  it('builds the same semantic capability ids through a named theme', () => {
    const library = createLibraryForTheme('original');
    expect(library.characters.has('character.observer')).toBe(true);
    expect(library.effects.has('effect.reaction.burst')).toBe(true);
    expect(library.environments.has('environment.dreamGarden')).toBe(true);
    expect(library.motions.has('motion.humanoid.selfTickle')).toBe(true);
    expect(library.cameras.has('camera.reactionCloseup')).toBe(true);
  });

  it('fails early for an unknown theme id', () => {
    expect(() => getTheme('missing-theme')).toThrow(/Unknown MindForge theme/);
  });
});
