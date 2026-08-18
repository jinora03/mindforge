import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import {
  EffectInfluenceBus,
  type ActionContext,
  type EffectEvent,
  type SceneServices,
} from '@mindforge/engine';
import { PB3_PRODUCTION_EFFECT_IDS } from '@mindforge/effects';
import { getTheme } from '@mindforge/themes';

function action(time: number, at = 0, duration = 2): ActionContext {
  const raw = time - at;
  const local = Math.max(0, Math.min(duration, raw));
  const progress = duration <= 0 ? 1 : local / duration;
  return {
    time,
    delta: 0,
    duration: 6,
    normalizedTime: time / 6,
    at,
    localDuration: duration,
    localTime: local,
    rawLocalTime: raw,
    progress,
    active: raw >= 0 && raw <= duration,
    phase: raw < 0 ? 'before' : raw > duration ? 'after' : 'active',
  };
}

function createServices(): { services: SceneServices; anchors: Record<string, THREE.Object3D> } {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera();
  const anchors: Record<string, THREE.Object3D> = {};
  for (const [id, position] of Object.entries({
    from: [-1.5, 1.2, 0],
    bend: [-0.4, 1.05, 0],
    reflect: [0.35, 0.55, 0],
    to: [1.6, 1.0, 0],
    ground: [0, 0, 0],
    reveal: [0, 1.8, -2],
  }) as Array<[string, [number, number, number]]>) {
    const object = new THREE.Object3D();
    object.name = id;
    object.position.set(...position);
    scene.add(object);
    anchors[id] = object;
  }
  scene.updateMatrixWorld(true);
  const effectInfluences = new EffectInfluenceBus();
  return {
    anchors,
    services: {
      scene,
      camera,
      duration: 6,
      assets: {} as never,
      effectInfluences,
      getEntity(): never {
        throw new Error('entity lookup not used by PB3 test');
      },
      tryGetEntity(): undefined {
        return undefined;
      },
      resolveAnchor(ref): THREE.Object3D {
        const anchor = anchors[ref];
        if (!anchor) throw new Error(`missing test anchor ${ref}`);
        return anchor;
      },
      tryResolveAnchor(ref): THREE.Object3D | undefined {
        return anchors[ref];
      },
    },
  };
}

function event(effect: string, extra: Partial<EffectEvent> = {}): EffectEvent {
  return {
    id: `pb3-${effect}`,
    type: 'effect',
    at: 0,
    duration: 2,
    effect,
    ...extra,
  } as EffectEvent;
}

function matrixSnapshot(mesh: THREE.InstancedMesh, index = 0): number[] {
  const matrix = new THREE.Matrix4();
  mesh.getMatrixAt(index, matrix);
  return matrix.elements.map((value) => Number(value.toFixed(6)));
}

describe('PB3 production effect baseline', () => {
  it('registers one reusable semantic production-effect vocabulary in every theme', () => {
    for (const themeId of ['voxel', 'toybox']) {
      const theme = getTheme(themeId);
      for (const id of PB3_PRODUCTION_EFFECT_IDS) expect(theme.effects[id], `${themeId}.${id}`).toBeDefined();
    }
  });

  it('builds light as layered core + halo + atmospheric scatter rather than a single debug line', () => {
    const { services } = createServices();
    const factory = getTheme('voxel').effects['effect.light.beam'];
    const instance = factory({ event: event('effect.light.beam', { from: 'from', to: 'to' }), services, seed: 11 });
    instance.update(action(1));

    const core = instance.object3d.getObjectByName('pb3.lightBeam.core') as THREE.Mesh;
    const halo = instance.object3d.getObjectByName('pb3.lightBeam.halo') as THREE.Mesh;
    const scatter = instance.object3d.getObjectByName('pb3.lightBeam.scatter') as THREE.InstancedMesh;
    expect(core).toBeDefined();
    expect(halo).toBeDefined();
    expect(scatter.count).toBe(10);
    expect((core.material as THREE.MeshBasicMaterial).blending).toBe(THREE.AdditiveBlending);
    expect((halo.material as THREE.MeshBasicMaterial).opacity).toBeGreaterThan(0);
    instance.dispose();
  });

  it('reveals an authored refraction path segment-by-segment from semantic anchors', () => {
    const { services } = createServices();
    const factory = getTheme('voxel').effects['effect.light.refraction'];
    const instance = factory({
      event: event('effect.light.refraction', { through: ['from', 'bend', 'reflect', 'to'] }),
      services,
      seed: 22,
    });
    instance.update(action(0.7));
    expect(instance.object3d.getObjectByName('pb3.refraction.core.0')).toBeDefined();
    expect(instance.object3d.getObjectByName('pb3.refraction.contact.0')).toBeDefined();
    const first = instance.object3d.getObjectByName('pb3.refraction.core.0') as THREE.Mesh;
    const third = instance.object3d.getObjectByName('pb3.refraction.core.2') as THREE.Mesh;
    expect((first.material as THREE.MeshBasicMaterial).opacity).toBeGreaterThan(0.5);
    expect((third.material as THREE.MeshBasicMaterial).opacity).toBeLessThan(0.05);
    instance.dispose();
  });

  it('creates a six-band soft spectrum with independent luminous cores and halos', () => {
    const { services } = createServices();
    const factory = getTheme('voxel').effects['effect.light.spectrum'];
    const instance = factory({
      event: event('effect.light.spectrum', { from: 'reflect', to: 'to', parameters: { length: 4, spread: 1.4 } }),
      services,
      seed: 33,
    });
    instance.update(action(1.4));
    for (let band = 0; band < 6; band++) {
      expect(instance.object3d.getObjectByName(`pb3.spectrum.core.${band}`)).toBeDefined();
      expect(instance.object3d.getObjectByName(`pb3.spectrum.halo.${band}`)).toBeDefined();
    }
    instance.dispose();
  });

  it('reconstructs deterministic seeded rain splashes after seeking away and back', () => {
    const { services } = createServices();
    const factory = getTheme('voxel').effects['effect.weather.rainImpact'];
    const instance = factory({
      event: event('effect.weather.rainImpact', { target: 'ground', duration: 1.2 }),
      services,
      seed: 404,
    });
    instance.update(action(0.45, 0, 1.2));
    const splash = instance.object3d.getObjectByName('pb3.rainImpact.splash') as THREE.InstancedMesh;
    const first = matrixSnapshot(splash, 4);
    instance.update(action(1.05, 0, 1.2));
    instance.update(action(0.45, 0, 1.2));
    expect(matrixSnapshot(splash, 4)).toEqual(first);
    instance.dispose();
  });

  it('publishes a layered world response for atmospheric reveals on the same absolute frame', () => {
    const { services } = createServices();
    const factory = getTheme('voxel').effects['effect.reveal.atmospheric'];
    const instance = factory({
      event: event('effect.reveal.atmospheric', { target: 'reveal', intensity: 0.9 }),
      services,
      seed: 55,
    });
    const bus = new EffectInfluenceBus();
    const ctx = action(0.9);
    bus.beginFrame();
    instance.contributeInfluence?.(ctx, bus);
    const snapshot = bus.snapshot();
    expect(snapshot.environmentLight).toBeGreaterThan(0.35);
    expect(snapshot.fogScattering).toBeGreaterThan(0.4);
    expect(snapshot.wetReflection).toBeGreaterThan(0.25);
    expect(snapshot.screenExposure).toBeGreaterThan(0.05);
    instance.dispose();
  });

  it('uses continuous tube geometry for the rainbow payoff instead of segmented box strips', () => {
    const { services } = createServices();
    const factory = getTheme('voxel').effects['effect.optics.rainbowArc'];
    const instance = factory({
      event: event('effect.optics.rainbowArc', { target: 'reveal', parameters: { radius: 5.2 } }),
      services,
      seed: 66,
    });
    instance.update(action(1.2));
    for (let band = 0; band < 6; band++) {
      const core = instance.object3d.getObjectByName(`pb3.rainbowArc.core.${band}`) as THREE.Mesh;
      const halo = instance.object3d.getObjectByName(`pb3.rainbowArc.halo.${band}`) as THREE.Mesh;
      expect(core.geometry).toBeInstanceOf(THREE.TubeGeometry);
      expect(halo.geometry).toBeInstanceOf(THREE.TubeGeometry);
      expect((core.material as THREE.MeshBasicMaterial).opacity).toBeGreaterThan(0);
    }
    instance.dispose();
  });
});
