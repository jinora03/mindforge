import { describe, expect, it } from 'vitest';
import { createDefaultLibrary, createLibraryForTheme } from '@mindforge/library';
import { DEFAULT_THEME_ID, getTheme, listThemes, voxelToneColor } from '@mindforge/themes';

describe('MindForge visual themes', () => {
  it('uses Voxel as production default while retaining legacy only for migration comparison', () => {
    expect(DEFAULT_THEME_ID).toBe('voxel');
    expect(listThemes()).toEqual(['legacy', 'voxel']);
    expect(getTheme('voxel').label).toBe('MindForge Voxel');
    expect(getTheme('legacy').label).toBe('Legacy Prototype');
    expect(createDefaultLibrary().themeId).toBe('voxel');
  });

  it('registers the complete semantic visual surface through Voxel', () => {
    const library = createLibraryForTheme('voxel');
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

  it('keeps Voxel capability ids in parity with the migration theme', () => {
    const legacy = getTheme('legacy');
    const voxel = getTheme('voxel');
    expect(Object.keys(voxel.characters).sort()).toEqual(Object.keys(legacy.characters).sort());
    expect(Object.keys(voxel.prefabs).sort()).toEqual(Object.keys(legacy.prefabs).sort());
    expect(Object.keys(voxel.effects).sort()).toEqual(Object.keys(legacy.effects).sort());
    expect(Object.keys(voxel.environments).sort()).toEqual(Object.keys(legacy.environments).sort());
  });

  it('maps semantic tones to a non-legacy visual palette', () => {
    expect(voxelToneColor('prediction').getHexString()).toBe('44b8ff');
    expect(voxelToneColor('reaction').getHexString()).toBe('ffd34d');
    expect(voxelToneColor('heat').getHexString()).toBe('ff6a2a');
    expect(voxelToneColor('prediction').equals(voxelToneColor('reaction'))).toBe(false);
  });

  it('keeps the legacy theme independently constructible during migration', () => {
    const legacy = createLibraryForTheme('legacy');
    expect(legacy.themeId).toBe('legacy');
    expect(legacy.characters.has('character.observer')).toBe(true);
    expect(legacy.prefabs.has('prefab.heatEngine')).toBe(true);
  });

  it('fails early for an unknown theme id', () => {
    expect(() => getTheme('missing-theme')).toThrow(/Unknown MindForge theme/);
  });
});
