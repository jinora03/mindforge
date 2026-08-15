import { describe, expect, it } from 'vitest';
import { PlaybackController } from '@mindforge/engine';

describe('PlaybackController', () => {
  it('advances while playing and holds while paused', () => {
    const playback = new PlaybackController(10);
    playback.play();
    playback.advance(1);
    expect(playback.time).toBeCloseTo(1);

    playback.pause();
    playback.advance(1);
    expect(playback.time).toBeCloseTo(1);

    playback.resume();
    playback.advance(0.5);
    expect(playback.time).toBeCloseTo(1.5);
  });

  it('scales time by playback speed', () => {
    const playback = new PlaybackController(10);
    playback.setSpeed(2);
    playback.play();
    playback.advance(1);
    expect(playback.time).toBeCloseTo(2);
  });

  it('seeks directly with zero delta', () => {
    const playback = new PlaybackController(10);
    playback.seek(4.2);
    expect(playback.time).toBeCloseTo(4.2);
    expect(playback.frame().delta).toBe(0);
  });

  it('restarts to zero', () => {
    const playback = new PlaybackController(10);
    playback.seek(7);
    playback.restart();
    expect(playback.time).toBe(0);
  });

  it('clamps and stops at the duration boundary', () => {
    const playback = new PlaybackController(10);
    playback.seek(9.8);
    playback.play();
    playback.advance(1);
    expect(playback.time).toBe(10);
    expect(playback.playing).toBe(false);
    expect(playback.hasEnded).toBe(true);
  });
});
