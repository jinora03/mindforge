import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DEFAULT_AUDIO_MIXER_VOLUMES } from '@mindforge/audio';
import { getTheme } from '@mindforge/themes';
import { renderExportCaptions } from '@mindforge/video-export';
import { createDefaultStudioCreatorExportOptions } from '../apps/studio/src/creator-export';

function fakeCaptionContext() {
  const calls: string[] = [];
  const context = {
    globalAlpha: 1,
    fillStyle: '#fff',
    font: '',
    textBaseline: 'alphabetic',
    textAlign: 'start',
    shadowColor: 'transparent',
    shadowBlur: 0,
    shadowOffsetY: 0,
    save: () => calls.push('save'),
    restore: () => calls.push('restore'),
    measureText: (text: string) => ({ width: text.length * 12 }),
    beginPath: () => calls.push('beginPath'),
    moveTo: () => calls.push('moveTo'),
    lineTo: () => calls.push('lineTo'),
    quadraticCurveTo: () => calls.push('quadraticCurveTo'),
    closePath: () => calls.push('closePath'),
    fill: () => calls.push('fillBackdrop'),
    fillText: () => calls.push('fillText'),
  } as unknown as CanvasRenderingContext2D;
  return { context, calls };
}

describe('PQ7 final production polish', () => {
  it('keeps reference narration opt-in in live playback and creator export', () => {
    expect(DEFAULT_AUDIO_MIXER_VOLUMES.voice).toBe(0);
    expect(createDefaultStudioCreatorExportOptions('voxel').audio.voice).toBe(false);
    expect(createDefaultStudioCreatorExportOptions('voxel').audio).toMatchObject({
      music: true,
      sfx: true,
      ambience: true,
    });
  });

  it('gives production explanation captions a restrained readability surface in both themes', () => {
    for (const themeId of ['voxel', 'toybox']) {
      const style = getTheme(themeId).presentation.typography.explanation;
      expect(style.backgroundColor).toMatch(/^rgba\(/);
      expect(style.padding).toBe('0.38em 0.62em');
      expect(style.borderRadius).toBe('0.58em');
    }
  });

  it('renders the same caption surface into deterministic video export', () => {
    const { context, calls } = fakeCaptionContext();
    renderExportCaptions(
      context,
      [{ id: 'caption', content: 'Millions of droplets do this at once.', style: 'explanation', placement: 'lower' }],
      getTheme('voxel').presentation,
      1080,
      1920,
    );
    expect(calls).toContain('fillBackdrop');
    expect(calls.indexOf('fillBackdrop')).toBeLessThan(calls.indexOf('fillText'));
    const fontPx = Number(/ ([\d.]+)px /.exec(context.font)?.[1] ?? 0);
    expect(fontPx).toBeGreaterThan(48);
  });

  it('keeps the Rainbow mix restrained and lands the reveal accent on the payoff', () => {
    const episode = JSON.parse(
      readFileSync(new URL('../content/episodes/artifact-015-rainbow/episode.json', import.meta.url), 'utf8'),
    ) as { timeline: Array<Record<string, unknown>> };
    const ambience = episode.timeline.find((event) => event.id === 'ambience');
    const split = episode.timeline.find((event) => event.id === 'split-sfx');
    const reveal = episode.timeline.find((event) => event.id === 'answer-sfx');
    expect(ambience).toMatchObject({ cue: 'audio.ambience.rain', volume: 0.3 });
    expect(split).toMatchObject({ cue: 'audio.sfx.prismSplit', volume: 0.66 });
    expect(reveal).toMatchObject({ cue: 'audio.sfx.insight', at: 11.12, volume: 0.48 });
  });

  it('keeps preview caption boxes border-box so padding cannot escape the safe width', () => {
    const studio = readFileSync(new URL('../apps/studio/src/studio-controller.ts', import.meta.url), 'utf8');
    const player = readFileSync(new URL('../apps/player/src/player-controller.ts', import.meta.url), 'utf8');
    expect(studio).toContain("width: 'fit-content'");
    expect(studio).toContain("boxSizing: 'border-box'");
    expect(player).toContain("width: 'fit-content'");
    expect(player).toContain("boxSizing: 'border-box'");
  });
});
