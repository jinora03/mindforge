import { describe, expect, it } from 'vitest';
import { createDefaultLibrary, createLibraryForTheme } from '@mindforge/library';
import { DEFAULT_THEME_ID, getTheme, listThemes, voxelToneColor } from '@mindforge/themes';
import { toyboxToneColor } from '@mindforge/themes';

const THEME_IDS = ['toybox', 'voxel'] as const;

describe('MindForge visual themes', () => {
  it('ships Voxel as production default alongside Toybox', () => {
    expect(DEFAULT_THEME_ID).toBe('voxel');
    expect(listThemes()).toEqual(['toybox', 'voxel']);
    expect(getTheme('voxel').label).toBe('MindForge Voxel');
    expect(getTheme('toybox').label).toBe('MindForge Toybox');
    expect(createDefaultLibrary().themeId).toBe('voxel');
  });

  it.each(THEME_IDS)('registers the complete semantic visual surface through %s', (themeId) => {
    const library = createLibraryForTheme(themeId);
    expect(library.themeId).toBe(themeId);
    expect(library.characters.has('character.observer')).toBe(true);
    expect(library.prefabs.has('prefab.externalHand')).toBe(true);
    expect(library.prefabs.has('prefab.heatEngine')).toBe(true);
    expect(library.prefabs.has('prefab.informationShard')).toBe(true);
    expect(library.prefabs.has('prefab.storyLight')).toBe(true);
    expect(library.effects.has('effect.signal.prediction')).toBe(true);
    expect(library.effects.has('effect.reaction.burst')).toBe(true);
    expect(library.effects.has('effect.informationStream')).toBe(true);
    expect(library.environments.has('environment.dreamGarden')).toBe(true);
    expect(library.environments.has('environment.artifactStage')).toBe(true);
    expect(library.motions.has('motion.humanoid.selfTickle')).toBe(true);
    expect(library.cameras.has('camera.reactionCloseup')).toBe(true);
  });

  // This is the guardrail that keeps "episodes are theme-blind" true: any theme
  // that drops or renames a capability id fails here rather than at runtime.
  it('keeps every theme in capability-id parity', () => {
    const voxel = getTheme('voxel');
    for (const themeId of THEME_IDS) {
      const theme = getTheme(themeId);
      expect(Object.keys(theme.characters).sort()).toEqual(Object.keys(voxel.characters).sort());
      expect(Object.keys(theme.prefabs).sort()).toEqual(Object.keys(voxel.prefabs).sort());
      expect(Object.keys(theme.effects).sort()).toEqual(Object.keys(voxel.effects).sort());
      expect(Object.keys(theme.environments).sort()).toEqual(Object.keys(voxel.environments).sort());
    }
  });

  it('gives each theme its own independent tone palette', () => {
    expect(voxelToneColor('prediction').getHexString()).toBe('44b8ff');
    expect(voxelToneColor('reaction').getHexString()).toBe('ffd34d');
    expect(voxelToneColor('heat').getHexString()).toBe('ff6a2a');
    expect(voxelToneColor('prediction').equals(voxelToneColor('reaction'))).toBe(false);
    expect(toyboxToneColor('prediction').equals(toyboxToneColor('reaction'))).toBe(false);
    // Themes are separate art directions, not palette variants of each other.
    expect(toyboxToneColor('prediction').equals(voxelToneColor('prediction'))).toBe(false);
  });

  it('fails early for an unknown theme id', () => {
    expect(() => getTheme('missing-theme')).toThrow(/Unknown MindForge theme/);
  });
});
