import * as THREE from 'three';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { EntityManager, SceneContext } from '@mindforge/engine';
import { getTheme } from '@mindforge/themes';

function createEnvironment() {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(48, 9 / 16, 0.1, 200);
  const services = new SceneContext(scene, camera, 20, new EntityManager(), 'pq4-weather-test');
  const factory = getTheme('voxel').environments['environment.rainMeadow'];
  if (!factory) throw new Error('Voxel rain meadow factory is not registered');
  const environment = factory({ services, parameters: {} });
  scene.add(environment.object3d);
  return { scene, environment };
}

function matrixSnapshot(object: THREE.Object3D): number[] {
  if (!(object instanceof THREE.InstancedMesh)) throw new Error(`${object.name} is not instanced`);
  return Array.from(object.instanceMatrix.array);
}

describe('PQ4 production weather, water and atmosphere', () => {
  it('uses restrained rainy-day lighting and exponential atmospheric depth', () => {
    const { scene, environment } = createEnvironment();
    const root = environment.object3d;

    expect(root.userData.weatherQuality).toBe('production');
    expect(scene.fog).toBeInstanceOf(THREE.FogExp2);
    expect((scene.fog as THREE.FogExp2).density).toBeGreaterThan(0.01);

    const sunBreak = root.getObjectByName('voxel-meadow-sun-break');
    expect(sunBreak).toBeInstanceOf(THREE.DirectionalLight);
    expect((sunBreak as THREE.DirectionalLight).intensity).toBeLessThan(0.5);

    const lighting = root.getObjectByName('voxel-lighting');
    expect(lighting).toBeInstanceOf(THREE.Group);
    const key = lighting?.children.find((child: THREE.Object3D) => child instanceof THREE.DirectionalLight && child.castShadow);
    expect(key).toBeInstanceOf(THREE.DirectionalLight);
    expect((key as THREE.DirectionalLight).intensity).toBeLessThan(2.6);

    environment.dispose();
  });

  it('layers rain by depth instead of rendering one uniform streak field', () => {
    const { environment } = createEnvironment();
    const far = environment.object3d.getObjectByName('voxel-rain-far') as THREE.InstancedMesh;
    const mid = environment.object3d.getObjectByName('voxel-rain') as THREE.InstancedMesh;
    const near = environment.object3d.getObjectByName('voxel-rain-near') as THREE.InstancedMesh;

    expect(far).toBeInstanceOf(THREE.InstancedMesh);
    expect(mid).toBeInstanceOf(THREE.InstancedMesh);
    expect(near).toBeInstanceOf(THREE.InstancedMesh);
    expect(far.count).toBeGreaterThan(80);
    expect(mid.count).toBeGreaterThan(far.count);
    expect(near.count).toBeGreaterThan(80);

    const farMaterial = far.material as THREE.MeshStandardMaterial;
    const midMaterial = mid.material as THREE.MeshStandardMaterial;
    const nearMaterial = near.material as THREE.MeshStandardMaterial;
    expect(farMaterial.opacity).toBeLessThan(midMaterial.opacity);
    expect(midMaterial.opacity).toBeLessThan(nearMaterial.opacity);

    expect(environment.object3d.getObjectByName('voxel-rain-splash-x')).toBeInstanceOf(THREE.InstancedMesh);
    expect(environment.object3d.getObjectByName('voxel-rain-splash-z')).toBeInstanceOf(THREE.InstancedMesh);
    expect(environment.object3d.getObjectByName('voxel-meadow-mist-0')).toBeInstanceOf(THREE.Mesh);

    environment.dispose();
  });

  it('keeps weather, vegetation and cloud motion deterministic under direct seeking', () => {
    const { environment } = createEnvironment();
    const rain = environment.object3d.getObjectByName('voxel-rain-near');
    const grass = environment.object3d.getObjectByName('voxel-tall-grass-0');
    const splash = environment.object3d.getObjectByName('voxel-rain-splash-x');
    const cloud = environment.object3d.getObjectByName('voxel-meadow-cloud-1');
    if (!rain || !grass || !splash || !cloud) throw new Error('PQ4 weather object missing');

    const frameA = { time: 2.75, delta: 0, duration: 20, normalizedTime: 2.75 / 20 };
    const frameB = { time: 5.1, delta: 0, duration: 20, normalizedTime: 5.1 / 20 };

    environment.update(frameA);
    const rainA = matrixSnapshot(rain);
    const grassA = matrixSnapshot(grass);
    const splashA = matrixSnapshot(splash);
    const cloudA = cloud.position.clone();

    environment.update(frameB);
    const rainB = matrixSnapshot(rain);
    const grassB = matrixSnapshot(grass);
    const splashB = matrixSnapshot(splash);
    const cloudB = cloud.position.clone();

    expect(rainB).not.toEqual(rainA);
    expect(grassB).not.toEqual(grassA);
    expect(splashB).not.toEqual(splashA);
    expect(cloudB.equals(cloudA)).toBe(false);

    environment.update(frameB);
    expect(matrixSnapshot(rain)).toEqual(rainB);
    expect(matrixSnapshot(grass)).toEqual(grassB);
    expect(matrixSnapshot(splash)).toEqual(splashB);
    expect(cloud.position.toArray()).toEqual(cloudB.toArray());

    environment.dispose();
  });

  it('animates physical puddle highlights deterministically instead of using static blue plates', () => {
    const { environment } = createEnvironment();
    const puddle = environment.object3d.getObjectByName('voxel-meadow-puddle');
    expect(puddle).toBeInstanceOf(THREE.Mesh);
    const material = (puddle as THREE.Mesh).material as THREE.MeshPhysicalMaterial;
    expect(material).toBeInstanceOf(THREE.MeshPhysicalMaterial);
    expect(material.clearcoat).toBeGreaterThan(0.8);
    expect(material.map).not.toBeNull();

    const frame = { time: 4.25, delta: 0, duration: 20, normalizedTime: 4.25 / 20 };
    environment.update(frame);
    const first = material.map?.offset.clone();
    const roughness = material.roughness;
    environment.update(frame);
    expect(material.map?.offset.toArray()).toEqual(first?.toArray());
    expect(material.roughness).toBe(roughness);

    environment.update({ ...frame, time: 6.1, normalizedTime: 6.1 / 20 });
    expect(material.map?.offset.equals(first ?? new THREE.Vector2())).toBe(false);

    environment.dispose();
  });

  it('does not introduce non-deterministic runtime randomness into the hero weather system', () => {
    const source = readFileSync(
      new URL('../packages/themes/src/voxel/voxel-rain-meadow.ts', import.meta.url),
      'utf8',
    );
    expect(source).not.toContain('Math.random');
  });
});
