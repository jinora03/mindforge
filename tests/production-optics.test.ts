import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { EntityManager, SceneContext } from '@mindforge/engine';
import { getTheme } from '@mindforge/themes';
import { loadEpisodeInput } from './helpers/content';

const REQUIRED_OPTIC_ANCHORS = [
  'input', 'center', 'bend', 'reflect', 'exit',
  'entryBeam', 'refractBeam', 'reflectionBeam', 'exitBeam',
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

  it('directs the internal ray before dispersion and uses real scene objects for the many-drop/payoff beats', () => {
    const input = loadEpisodeInput('artifact-015-rainbow');
    expect(input.duration).toBeLessThanOrEqual(20);
    expect((input.entities as Array<Record<string, unknown>>).some((entity) => entity.id === 'droplets' && entity.factory === 'prefab.rainDropletField')).toBe(true);
    expect((input.entities as Array<Record<string, unknown>>).some((entity) => entity.id === 'rainbow' && entity.factory === 'prefab.rainbowArc')).toBe(true);
    const timeline = input.timeline as Array<Record<string, unknown>>;
    const byId = new Map(timeline.map((event) => [event.id, event]));

    for (const id of ['entry-ray', 'refract-ray', 'reflection-ray', 'exit-ray']) {
      expect(byId.has(id), id).toBe(true);
    }
    expect(Number(byId.get('exit-ray')?.at)).toBeLessThan(Number(byId.get('red-reveal')?.at));
    expect(timeline.some((event) => event.target === 'droplets' && event.type === 'visibility')).toBe(true);
    expect(timeline.some((event) => event.target === 'rainbow' && event.type === 'visibility')).toBe(true);
    expect(timeline.some((event) => event.id === 'rain-spectrum' || event.effect === 'effect.reaction.burst')).toBe(false);
    expect(byId.get('cam-hook')?.target).toBe('prism.center');
    expect(byId.get('cam-many')?.target).toBe('droplets');
    expect(byId.get('cam-answer')?.target).toBe('rainbow');
  });

  it('keeps all six spectrum bands as individually directed timeline targets', () => {
    const input = loadEpisodeInput('artifact-015-rainbow');
    const targets = new Set((input.timeline as Array<Record<string, unknown>>)
      .filter((event) => event.property === 'scale')
      .map((event) => event.target));
    for (const color of ['red', 'orange', 'yellow', 'green', 'blue', 'violet']) {
      expect(targets.has(`prism.${color}`), color).toBe(true);
    }
  });
});
