import { describe, expect, it } from 'vitest';
import type { AudioCueDefinition, ReadonlyRegistry } from '@mindforge/engine';
import { buildAudioSchedule } from '../packages/video-export/src/offline-audio';
import { createFramePlan, exportFilename } from '../packages/video-export/src/planning';

class CueRegistry implements ReadonlyRegistry<AudioCueDefinition> {
  constructor(private readonly cues: Record<string, AudioCueDefinition>) {}
  has(id: string): boolean { return id in this.cues; }
  get(id: string): AudioCueDefinition {
    const cue = this.cues[id];
    if (!cue) throw new Error(`missing ${id}`);
    return cue;
  }
  list(): string[] { return Object.keys(this.cues); }
}

describe('MindForge deterministic video export', () => {
  it('plans exact fixed timestamps without wall-clock accumulation', () => {
    const frames = createFramePlan(2, 60);
    expect(frames).toHaveLength(120);
    expect(frames[0]).toMatchObject({ index: 0, timestamp: 0, keyFrame: true });
    expect(frames[59].timestamp).toBeCloseTo(59 / 60, 10);
    expect(frames[119].timestamp).toBeCloseTo(119 / 60, 10);
    expect(frames.every((frame, i) => Math.abs(frame.timestamp - i / 60) < 1e-10)).toBe(true);
  });

  it('clips semantic audio events to episode duration and keeps cue gain/bus semantics', () => {
    const cues = new CueRegistry({
      ambience: {
        id: 'ambience',
        bus: 'ambience',
        source: { kind: 'procedural', render: () => ({ sampleRate: 48_000, channels: [new Float32Array(1)] }) },
        defaultGain: 0.5,
        loop: true,
      },
    });
    const schedule = buildAudioSchedule([
      { id: 'a', type: 'audio', at: 1, cue: 'ambience', duration: 10, volume: 0.8 },
    ], cues, 4);
    expect(schedule).toEqual([
      expect.objectContaining({ eventId: 'a', start: 1, duration: 3, loop: true, bus: 'ambience', gain: 0.4 }),
    ]);
  });

  it('creates short deterministic export filenames', () => {
    expect(exportFilename('Artifact 002: Prediction', 'MindForge Toybox')).toBe(
      'artifact-002-prediction-mindforge-toybox.mp4',
    );
  });
});
