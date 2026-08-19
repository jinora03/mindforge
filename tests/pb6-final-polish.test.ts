import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = fileURLToPath(new URL('..', import.meta.url));
const episode = JSON.parse(
  readFileSync(`${root}/content/episodes/artifact-015-rainbow/episode.json`, 'utf8'),
) as Record<string, unknown>;

function timelineById(): Map<string, Record<string, unknown>> {
  return new Map(
    (episode.timeline as Array<Record<string, unknown>>).map((event) => [String(event.id), event]),
  );
}

describe('PB6 final Rainbow polish', () => {
  it('frames the complete spectrum relationship instead of fitting only the droplet', () => {
    const entities = episode.entities as Array<Record<string, unknown>>;
    expect(entities).toContainEqual(
      expect.objectContaining({ id: 'spectrumStage', type: 'group', position: [2.25, 2.65, -5.2] }),
    );

    const byId = timelineById();
    expect(byId.get('cam-spectrum')).toMatchObject({
      target: 'spectrumStage',
      fov: 50,
      parameters: { radius: 11.8, height: 2.9 },
    });
    expect(byId.get('spectrum')?.parameters).toMatchObject({
      length: 4.55,
      spread: 1.52,
      thickness: 0.075,
    });
  });

  it('keeps the storm atmosphere subordinate to the subject', () => {
    const layers = new Map(
      (episode.layers as Array<Record<string, unknown>>).map((layer) => [String(layer.id), layer]),
    );
    expect(layers.get('rain')?.parameters).toMatchObject({ intensity: 0.3 });
    expect(layers.get('mist')?.parameters).toMatchObject({ density: 0.035 });
    expect(layers.get('fog')?.parameters).toMatchObject({ density: 0.015 });
    expect(layers.get('groundCover')?.parameters).toMatchObject({ count: 14, clearRadius: 5 });
    expect(layers.get('foreground')?.parameters).toMatchObject({ count: 0 });
  });

  it('uses semantic cool/warm practical lights rather than lifting the whole scene', () => {
    const entities = episode.entities as Array<Record<string, unknown>>;
    expect(entities).toContainEqual(expect.objectContaining({
      id: 'heroLight',
      factory: 'prefab.storyLight',
      parameters: expect.objectContaining({ color: '#7AD9FF', intensity: 3.2 }),
    }));
    expect(entities).toContainEqual(expect.objectContaining({
      id: 'revealLight',
      factory: 'prefab.storyLight',
      parameters: expect.objectContaining({ color: '#FFD27A', intensity: 0 }),
    }));
  });

  it('fits the entire final rainbow inside the narrow 9:16 horizontal field', () => {
    const byId = timelineById();
    const rainbow = byId.get('rainbow-payoff')!;
    const camera = byId.get('cam-answer')!;
    const rainbowParameters = rainbow.parameters as Record<string, number>;
    const cameraParameters = camera.parameters as Record<string, number>;
    const verticalFov = Number(camera.fov) * Math.PI / 180;
    const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * (9 / 16));
    const horizontalHalfSpan = Math.tan(horizontalFov / 2) * cameraParameters.radius;

    expect(rainbowParameters.radius).toBe(6.2);
    expect(cameraParameters.radius).toBe(24.5);
    expect(horizontalHalfSpan).toBeGreaterThan(rainbowParameters.radius);
  });

  it('places the atmospheric reveal above the horizon instead of at the rainbow origin', () => {
    const sunBreak = timelineById().get('sun-break');
    expect(sunBreak?.parameters).toMatchObject({ radius: 3.2, offsetY: 5.6 });
  });
});
