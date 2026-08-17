import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  creatorExportPreset,
  exportFilename,
  resolveCreatorDimensions,
  resolveCreatorEncodingSettings,
} from '@mindforge/video-export';
import {
  applyCreatorPreset,
  createDefaultStudioCreatorExportOptions,
  resolveStudioExportRange,
} from '../apps/studio/src/creator-export';
import type { EpisodeProductionInfo } from '../content/production-types';

const production: EpisodeProductionInfo = {
  folder: 'content/episodes/test',
  creativeBrief: '# Test',
  briefSummary: 'Test production episode.',
  files: ['creative-brief.md', 'storyboard.json', 'episode.json', 'text.json'],
  storyboard: {
    episode: 'test',
    title: 'Test',
    aspect: '9:16',
    durationSeconds: 12,
    shots: [
      { id: 'hook', t: [0, 3], beat: 'Hook' },
      { id: 'middle', t: [3, 8], beat: 'Middle' },
      { id: 'answer', t: [8, 12], beat: 'Answer' },
    ],
  },
};

describe('MindForge creator export options', () => {
  it('ships creator presets and deterministic layout dimensions', () => {
    expect(creatorExportPreset('youtube-shorts')).toMatchObject({ layout: 'portrait', resolution: '1080p', fps: 60 });
    expect(resolveCreatorDimensions('portrait', '1080p')).toEqual({ width: 1080, height: 1920 });
    expect(resolveCreatorDimensions('landscape', '720p')).toEqual({ width: 1280, height: 720 });
    expect(resolveCreatorDimensions('square', '1080p')).toEqual({ width: 1080, height: 1080 });
  });

  it('scales bitrate with quality and pixel/frame load', () => {
    const high = resolveCreatorEncodingSettings({ layout: 'portrait', resolution: '1080p', fps: 60, quality: 'high' });
    const compact = resolveCreatorEncodingSettings({ layout: 'portrait', resolution: '720p', fps: 30, quality: 'standard' });
    const max = resolveCreatorEncodingSettings({ layout: 'portrait', resolution: '1080p', fps: 60, quality: 'maximum' });
    expect(high.videoBitrate).toBe(12_000_000);
    expect(compact.videoBitrate).toBeLessThan(high.videoBitrate);
    expect(max.videoBitrate).toBeGreaterThan(high.videoBitrate);
  });

  it('resolves full, current-shot and custom export ranges without changing timeline semantics', () => {
    let options = createDefaultStudioCreatorExportOptions('voxel');
    expect(resolveStudioExportRange(options, 12, production, 4)).toEqual({ startTime: 0, endTime: 12, label: 'Full episode · 12.0s' });

    options = { ...options, rangeMode: 'current-shot' };
    expect(resolveStudioExportRange(options, 12, production, 4)).toMatchObject({ startTime: 3, endTime: 8, filenameSuffix: 'middle' });

    options = { ...options, rangeMode: 'custom', customStart: 2.5, customEnd: 7.25 };
    expect(resolveStudioExportRange(options, 12, production, 4)).toMatchObject({ startTime: 2.5, endTime: 7.25 });
  });

  it('applies presets while retaining creator-specific switches', () => {
    const options = { ...createDefaultStudioCreatorExportOptions('toybox'), captions: false, autoDownload: false };
    const next = applyCreatorPreset(options, 'youtube-landscape');
    expect(next).toMatchObject({ layout: 'landscape', resolution: '1080p', fps: 60, captions: false, autoDownload: false, themeId: 'toybox' });
  });

  it('uses the actual resolved container extension in creator filenames', () => {
    expect(exportFilename('Artifact 005', 'Toybox', 'webm', 'hook')).toBe('artifact-005-toybox-hook.webm');
  });

  it('keeps deterministic export free of captureStream and MediaRecorder', () => {
    const source = readFileSync(new URL('../packages/video-export/src/MindForgeVideoExporter.ts', import.meta.url), 'utf8');
    expect(source).not.toMatch(/\.captureStream\s*\(/);
    expect(source).not.toMatch(/\bnew\s+MediaRecorder\s*\(/);
    expect(source).toContain('engine.seek(startTime + frame.timestamp)');
  });
});
