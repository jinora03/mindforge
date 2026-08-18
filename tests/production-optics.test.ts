import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { EntityManager, SceneContext } from '@mindforge/engine';
import { getTheme } from '@mindforge/themes';
import { loadEpisodeInput } from './helpers/content';

const REQUIRED_OPTIC_ANCHORS = [
  'input', 'center', 'bend', 'reflect', 'exit',
  'red', 'orange', 'yellow', 'green', 'blue', 'violet',
] as const;

function createPrism(themeId: 'voxel' | 'toybox') {
  const theme = getTheme(themeId);
  const factory = theme.prefabs['prefab.prismDrop'];
  if (!factory) throw new Error(`Missing prismDrop in ${themeId}`);
  const services = new SceneContext(
    new THREE.Scene(),
    new THREE.PerspectiveCamera(48, 9 / 16, 0.1, 200),
    20,
    new EntityManager(),
    `pq5-${themeId}`,
  );
  return factory({ id: 'prism', parameters: {}, services });
}

describe('PQ5 production rainbow optics', () => {
  it.each(['voxel', 'toybox'] as const)('keeps semantic optical anchor parity in %s', (themeId) => {
    const prism = createPrism(themeId);
    for (const anchor of REQUIRED_OPTIC_ANCHORS) expect(prism.anchors?.[anchor], `${themeId}.${anchor}`).toBeDefined();
  });

  it.each(['voxel', 'toybox'] as const)('registers separate many-drop and rainbow-payoff prefabs in %s', (themeId) => {
    const theme = getTheme(themeId);
    expect(theme.prefabs['prefab.rainbowArc']).toBeDefined();
    expect(theme.prefabs['prefab.rainDropletField']).toBeDefined();
  });

  it('builds a substantial voxel rainbow payoff rather than a single flat beam', () => {
    const theme = getTheme('voxel');
    const services = new SceneContext(new THREE.Scene(), new THREE.PerspectiveCamera(48, 9 / 16, 0.1, 200), 20, new EntityManager(), 'pq5-payoff');
    const arcFactory = theme.prefabs['prefab.rainbowArc'];
    if (!arcFactory) throw new Error('Missing voxel rainbowArc');
    const arc = arcFactory({ id: 'rainbow', parameters: {}, services }).object3d;
    let visibleSegments = 0;
    arc.traverse((node) => {
      if (node instanceof THREE.InstancedMesh) visibleSegments += node.count;
      else if (node instanceof THREE.Mesh) visibleSegments += 1;
    });
    expect(visibleSegments).toBeGreaterThanOrEqual(180);
  });

  it('directs the authored droplet through layered PB3 optics before the many-drop/payoff beats', () => {
    const input = loadEpisodeInput('artifact-015-rainbow');
    expect(input.duration).toBeLessThanOrEqual(20);
    expect(input.environment).toBe('environment.compositionStage');
    expect((input.entities as Array<Record<string, unknown>>).some((entity) => entity.id === 'droplets' && entity.factory === 'prefab.rainDropletField')).toBe(true);
    expect((input.entities as Array<Record<string, unknown>>).some((entity) => entity.factory === 'prefab.rainbowArc')).toBe(false);
    const timeline = input.timeline as Array<Record<string, unknown>>;
    const byId = new Map(timeline.map((event) => [event.id, event]));

    expect(byId.get('sun-beam')?.effect).toBe('effect.light.beam');
    expect(byId.get('refraction-path')?.effect).toBe('effect.light.refraction');
    expect(byId.get('refraction-path')?.through).toEqual([
      'prism.input', 'prism.bend', 'prism.reflect', 'prism.exit',
    ]);
    expect(byId.get('spectrum')?.effect).toBe('effect.light.spectrum');
    expect(byId.get('sun-break')?.effect).toBe('effect.reveal.atmospheric');
    expect(byId.get('rainbow-payoff')?.effect).toBe('effect.optics.rainbowArc');
    expect(timeline.some((event) => event.target === 'droplets' && event.type === 'visibility')).toBe(true);
    expect(timeline.some((event) => typeof event.target === 'string' && /prism\.(entryBeam|refractBeam|reflectionBeam|exitBeam)/.test(event.target))).toBe(false);
    expect(byId.get('cam-hook')?.target).toBe('prism.center');
    expect(byId.get('cam-many')?.target).toBe('droplets');
    expect(byId.get('cam-answer')?.target).toBe('rainbowStage');
  });

  it('uses the reusable spectrum effect rather than six property-driven debug beams', () => {
    const input = loadEpisodeInput('artifact-015-rainbow');
    const timeline = input.timeline as Array<Record<string, unknown>>;
    const spectrum = timeline.find((event) => event.id === 'spectrum');
    expect(spectrum).toMatchObject({
      type: 'effect',
      effect: 'effect.light.spectrum',
      from: 'prism.exit',
    });
    expect(spectrum?.parameters).toMatchObject({ length: 4.5, spread: 1.62 });
    const oldSpectrumTargets = timeline.filter((event) =>
      typeof event.target === 'string' && /^prism\.(red|orange|yellow|green|blue|violet)$/.test(event.target),
    );
    expect(oldSpectrumTargets).toEqual([]);
  });
});
