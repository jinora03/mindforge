import { describe, expect, it } from 'vitest';
import { createDefaultLibrary, createLibraryForTheme } from '@mindforge/library';
import { DEFAULT_THEME_ID, getTheme, listThemes } from '@mindforge/themes';

describe('MindForge visual themes', () => {
  it('keeps the retired visuals only as a transitional legacy theme', () => {
    expect(DEFAULT_THEME_ID).toBe('legacy');
    expect(listThemes()).toEqual(['legacy']);
    expect(getTheme('legacy').label).toBe('Legacy Prototype');
    expect(createDefaultLibrary().themeId).toBe('legacy');
  });

  it('registers semantic visual capabilities through the active theme', () => {
    const library = createLibraryForTheme('legacy');
    expect(library.characters.has('character.observer')).toBe(true);
    expect(library.prefabs.has('prefab.externalHand')).toBe(true);
    expect(library.prefabs.has('prefab.heatEngine')).toBe(true);
    expect(library.effects.has('effect.reaction.burst')).toBe(true);
    expect(library.environments.has('environment.dreamGarden')).toBe(true);
    expect(library.motions.has('motion.humanoid.selfTickle')).toBe(true);
    expect(library.cameras.has('camera.reactionCloseup')).toBe(true);
  });

  it('fails early for an unknown theme id', () => {
    expect(() => getTheme('missing-theme')).toThrow(/Unknown MindForge theme/);
  });
});
