import { describe, expect, it } from 'vitest';
import { BrowserAudioRuntime, DEFAULT_AUDIO_CUES, effectiveBusGain, mergeAudioWindows } from '@mindforge/audio';
import { loadEpisode, SceneRuntime } from '@mindforge/engine';
import { createDefaultLibrary, createLibraryForTheme } from '@mindforge/library';
import { safeParseEpisode } from '@mindforge/schema';

const audioEpisode = {
  schemaVersion: '0.1',
  id: 'audio-test',
  title: 'Audio Test',
  duration: 4,
  environment: 'environment.dreamGarden',
  entities: [],
  timeline: [
    {
      id: 'ambience',
      type: 'audio',
      at: 0,
      duration: 4,
      cue: 'audio.ambience.garden',
      loop: true,
      volume: 0.5,
    },
    { id: 'ping', type: 'audio', at: 1, cue: 'audio.sfx.information' },
  ],
};

describe('MindForge audio foundation', () => {
  it('accepts semantic audio timeline events', () => {
    expect(safeParseEpisode(audioEpisode).success).toBe(true);
  });

  it('registers the same shared audio surface for every visual theme', () => {
    const voxel = createLibraryForTheme('voxel').audio.list();
    const toybox = createLibraryForTheme('toybox').audio.list();
    expect(voxel).toEqual(toybox);
    expect(voxel).toContain('audio.ambience.garden');
    expect(voxel).toContain('audio.sfx.reaction');
    expect(voxel).toContain('audio.voice.prediction.hook');
  });

  it('rejects an unknown audio cue during episode loading', () => {
    const bad = {
      ...audioEpisode,
      timeline: [{ id: 'bad', type: 'audio', at: 0, cue: 'audio.sfx.missing' }],
    };
    expect(() => loadEpisode(bad, createDefaultLibrary())).toThrow(/audio.*missing/);
  });

  it('keeps audio events outside deterministic scene evaluation but available to the live transport', () => {
    const runtime = new SceneRuntime();
    runtime.load(audioEpisode, createDefaultLibrary());
    expect(runtime.getAudioEvents().map((event) => event.id)).toEqual(['ambience', 'ping']);
    expect(() => runtime.evaluateAt(2.5)).not.toThrow();
    runtime.dispose();
  });

  it('renders procedural cue PCM deterministically without NaN or Infinity', () => {
    const cue = DEFAULT_AUDIO_CUES.find((entry) => entry.id === 'audio.sfx.reaction');
    expect(cue?.source.kind).toBe('procedural');
    if (!cue || cue.source.kind !== 'procedural') throw new Error('reaction cue must be procedural');

    const a = cue.source.render(8_000);
    const b = cue.source.render(8_000);
    expect(a.channels).toHaveLength(2);
    expect(a.channels[0].length).toBeGreaterThan(100);
    expect(Array.from(a.channels[0].slice(0, 128))).toEqual(Array.from(b.channels[0].slice(0, 128)));
    expect(Array.from(a.channels[0]).every(Number.isFinite)).toBe(true);
  });


  it('applies deterministic voice ducking policy and merges overlapping voice windows', () => {
    expect(effectiveBusGain('voice', 0.8, true)).toBe(0.8);
    expect(effectiveBusGain('sfx', 1, true)).toBeLessThan(1);
    expect(effectiveBusGain('ambience', 1, false)).toBe(1);
    expect(mergeAudioWindows([
      { start: 1, end: 2 },
      { start: 1.8, end: 3 },
      { start: 4, end: 5 },
    ])).toEqual([
      { start: 1, end: 3 },
      { start: 4, end: 5 },
    ]);
  });

  it('reconstructs live sources from authoritative time on seek/pause', () => {
    const starts: { offset: number; duration?: number }[] = [];
    let stopCount = 0;

    class FakeParam {
      value = 1;
      setValueAtTime(value: number): void {
        this.value = value;
      }
      cancelScheduledValues(): void {}
      linearRampToValueAtTime(value: number): void {
        this.value = value;
      }
      setTargetAtTime(value: number): void {
        this.value = value;
      }
    }
    class FakeGain {
      gain = new FakeParam();
      connect(): void {}
      disconnect(): void {}
    }
    class FakeSource {
      buffer?: AudioBuffer;
      loop = false;
      playbackRate = new FakeParam();
      onended: (() => void) | null = null;
      connect(): void {}
      disconnect(): void {}
      start(_when: number, offset = 0, duration?: number): void {
        starts.push({ offset, duration });
      }
      stop(): void {
        stopCount++;
      }
    }
    class FakeContext {
      currentTime = 0;
      sampleRate = 8_000;
      destination = {} as AudioDestinationNode;
      createGain(): GainNode {
        return new FakeGain() as unknown as GainNode;
      }
      createBuffer(_channels: number, length: number, rate: number): AudioBuffer {
        return {
          duration: length / rate,
          copyToChannel(): void {},
        } as unknown as AudioBuffer;
      }
      createBufferSource(): AudioBufferSourceNode {
        return new FakeSource() as unknown as AudioBufferSourceNode;
      }
      resume(): Promise<void> {
        return Promise.resolve();
      }
      close(): Promise<void> {
        return Promise.resolve();
      }
    }

    const previous = globalThis.AudioContext;
    globalThis.AudioContext = FakeContext as unknown as typeof AudioContext;
    try {
      const runtime = new BrowserAudioRuntime();
      const library = createDefaultLibrary();
      const events = loadEpisode(audioEpisode, library).script.timeline.filter(
        (event) => event.type === 'audio',
      );
      runtime.load(events, library.audio, 4);
      runtime.sync({ time: 0, duration: 4, playing: true, speed: 1 }, 'play');
      expect(starts[0]?.offset).toBe(0);

      runtime.sync({ time: 1.1, duration: 4, playing: true, speed: 1 }, 'seek');
      expect(stopCount).toBeGreaterThan(0);
      expect(starts.some((entry) => entry.offset > 0.09 && entry.offset < 0.11)).toBe(true);

      runtime.sync({ time: 1.1, duration: 4, playing: false, speed: 1 }, 'pause');
      expect(stopCount).toBeGreaterThan(1);
      runtime.dispose();
    } finally {
      globalThis.AudioContext = previous;
    }
  });

});
