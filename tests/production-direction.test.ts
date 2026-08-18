import { describe, expect, it } from 'vitest';
import { loadEpisodeInput } from './helpers/content';

interface TimelineEvent {
  id: string;
  type: string;
  at: number;
  duration?: number;
  target?: string;
  property?: string;
  parameters?: Record<string, unknown>;
}

describe('PQ6 Rainbow production direction', () => {
  it('ships a 17.6-second cut with a clean final visual hold', () => {
    const input = loadEpisodeInput('artifact-015-rainbow');
    const duration = Number(input.duration);
    expect(duration).toBe(17.6);
    const timeline = input.timeline as TimelineEvent[];
    const answer = timeline.find((event) => event.id === 'answer');
    expect(answer).toBeDefined();
    expect((answer!.at + (answer!.duration ?? 0))).toBeLessThanOrEqual(duration - 1.4);

    for (const event of timeline) {
      const end = event.at + (event.duration ?? 0);
      expect(end, event.id).toBeLessThanOrEqual(duration + 1e-6);
    }
  });

  it('uses short deterministic blends on every production camera change', () => {
    const input = loadEpisodeInput('artifact-015-rainbow');
    const cameras = (input.timeline as TimelineEvent[]).filter((event) => event.type === 'camera');
    expect(cameras.length).toBeGreaterThanOrEqual(6);
    for (const camera of cameras) {
      const blend = camera.parameters?.blendDuration;
      expect(typeof blend, camera.id).toBe('number');
      expect(Number(blend), camera.id).toBeGreaterThan(0);
      expect(Number(blend), camera.id).toBeLessThanOrEqual(0.5);
    }
  });

  it('keeps the hero droplet and the many-drop scale-up moving for explanatory reasons', () => {
    const input = loadEpisodeInput('artifact-015-rainbow');
    const timeline = input.timeline as TimelineEvent[];
    expect(timeline.some((event) => event.id === 'prism-hero-turn' && event.target === 'prism' && event.property === 'rotation')).toBe(true);
    expect(timeline.some((event) => event.id === 'many-droplets-fall' && event.target === 'droplets' && event.property === 'position')).toBe(true);
  });

  it('moves from hook to optics to many drops to payoff without long empty beat gaps', () => {
    const input = loadEpisodeInput('artifact-015-rainbow');
    const timeline = input.timeline as TimelineEvent[];
    const byId = new Map(timeline.map((event) => [event.id, event]));
    const beats = ['hook', 'sun-beam', 'spectrum', 'cam-angle', 'many-droplets-show', 'sun-break', 'rainbow-payoff']
      .map((id) => Number(byId.get(id)?.at));
    for (let i = 1; i < beats.length; i++) {
      expect(beats[i] - beats[i - 1]).toBeLessThanOrEqual(3.3);
    }
  });
});
