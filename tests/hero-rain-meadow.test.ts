import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { EntityManager, SceneContext } from '@mindforge/engine';
import { getTheme } from '@mindforge/themes';

function createEnvironment() {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(48, 9 / 16, 0.1, 200);
  const services = new SceneContext(scene, camera, 20, new EntityManager(), 'rain-meadow-quality-test');
  const factory = getTheme('voxel').environments['environment.rainMeadow'];
  if (!factory) throw new Error('Voxel rain meadow factory is not registered');
  const environment = factory({ services, parameters: {} });
  scene.add(environment.object3d);
  return { scene, environment };
}

function findByName(root: THREE.Object3D, name: string): THREE.Object3D | undefined {
  return root.getObjectByName(name);
}

describe('PQ3 hero rain meadow', () => {
  it('ships an explicit foreground-to-horizon production composition', () => {
    const { environment } = createEnvironment();
    const root = environment.object3d;

    expect(root.name).toBe('voxel.environment.rainMeadow');
    expect(root.userData.productionQuality).toBe('hero');
    expect(root.userData.composition).toBe('foreground-midground-background');

    for (const layer of [
      'mf.rainMeadow.terrain',
      'mf.rainMeadow.wetGround',
      'mf.rainMeadow.vegetation',
      'mf.rainMeadow.foreground',
      'mf.rainMeadow.horizon',
      'mf.rainMeadow.sky',
      'mf.rainMeadow.weather',
      'mf.rainMeadow.heroClearing',
    ]) {
      expect(findByName(root, layer), layer).toBeDefined();
    }

    environment.dispose();
  });

  it('uses a real voxel terrain surface instead of one tinted floor slab', () => {
    const { environment } = createEnvironment();
    const root = environment.object3d;
    const terrain = findByName(root, 'voxel-meadow-terrain-0');

    expect(terrain).toBeInstanceOf(THREE.InstancedMesh);
    const terrainMesh = terrain as THREE.InstancedMesh;
    expect(terrainMesh.count).toBeGreaterThan(80);
    expect(Array.isArray(terrainMesh.material)).toBe(true);
    expect((terrainMesh.material as THREE.Material[]).length).toBe(6);

    environment.dispose();
  });

  it('keeps enough deterministic scene density for a hero production environment', () => {
    const { environment } = createEnvironment();
    let renderedInstances = 0;
    environment.object3d.traverse((object) => {
      if (object instanceof THREE.InstancedMesh) renderedInstances += object.count;
      else if (object instanceof THREE.Mesh) renderedInstances += 1;
    });

    // This is intentionally a broad quality floor, not an exact art count.
    expect(renderedInstances).toBeGreaterThan(700);
    expect(findByName(environment.object3d, 'voxel-tall-grass-0')).toBeDefined();
    expect(findByName(environment.object3d, 'voxel-meadow-puddle')).toBeDefined();
    expect(findByName(environment.object3d, 'voxel-meadow-sun')).toBeDefined();

    environment.dispose();
  });

  it('reconstructs rain identically when evaluated at the same authoritative time', () => {
    const { environment } = createEnvironment();
    const rain = findByName(environment.object3d, 'voxel-rain');
    expect(rain).toBeInstanceOf(THREE.InstancedMesh);

    const frame = { time: 3.25, delta: 0, duration: 20, normalizedTime: 3.25 / 20 };
    environment.update(frame);
    const first = Array.from((rain as THREE.InstancedMesh).instanceMatrix.array);
    environment.update(frame);
    const second = Array.from((rain as THREE.InstancedMesh).instanceMatrix.array);

    expect(second).toEqual(first);
    environment.dispose();
  });

  it('cleans scene-owned atmosphere on disposal', () => {
    const { scene, environment } = createEnvironment();
    expect(scene.fog).not.toBeNull();
    expect(scene.background).not.toBeNull();

    environment.dispose();

    expect(scene.fog).toBeNull();
    expect(scene.background).toBeNull();
    expect(environment.object3d.parent).toBeNull();
  });
});
