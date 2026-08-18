import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
  EffectInfluenceBus,
  type RuntimeAssetAccess,
  type SceneServices,
} from '@mindforge/engine';
import {
  createVoxelProductionMaterialLayer,
  VOXEL_PB2_MATERIAL_LAYER_ID,
  VOXEL_THEME,
} from '@mindforge/themes';

const unavailableAssets: RuntimeAssetAccess = {
  has: () => false,
  instantiateModel: (id: string) => {
    throw new Error(`unexpected asset request: ${id}`);
  },
};

function services(scene: THREE.Scene, bus: EffectInfluenceBus): SceneServices {
  return {
    scene,
    camera: new THREE.PerspectiveCamera(),
    duration: 4,
    assets: unavailableAssets,
    effectInfluences: bus,
    getEntity: (id: string) => {
      throw new Error(`unexpected entity request: ${id}`);
    },
    tryGetEntity: () => undefined,
    resolveAnchor: (ref: string) => {
      throw new Error(`unexpected anchor request: ${ref}`);
    },
    tryResolveAnchor: () => undefined,
  };
}

const frame = {
  time: 1.25,
  delta: 0,
  duration: 4,
  normalizedTime: 1.25 / 4,
} as const;

describe('PB2 production material baseline', () => {
  it('registers the reusable Voxel production-material response layer', () => {
    expect(VOXEL_THEME.sceneLayers[VOXEL_PB2_MATERIAL_LAYER_ID]).toBe(
      createVoxelProductionMaterialLayer,
    );
  });

  it('upgrades puddle and optical placeholders to physically-based production materials', () => {
    const scene = new THREE.Scene();
    const bus = new EffectInfluenceBus();

    const puddleOriginal = new THREE.MeshStandardMaterial({ color: '#62A4BF' });
    puddleOriginal.name = 'PB2_PuddleWater';
    const puddle = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), puddleOriginal);
    scene.add(puddle);

    const dropOriginal = new THREE.MeshStandardMaterial({ color: '#BCE7F5' });
    dropOriginal.name = 'PB2_OpticalWaterGlass';
    const drop = new THREE.Mesh(new THREE.SphereGeometry(1), dropOriginal);
    scene.add(drop);

    const layer = createVoxelProductionMaterialLayer({
      id: 'materials',
      role: 'utility',
      parameters: { wetness: 0.8 },
      services: services(scene, bus),
      seed: 17,
    });

    layer.update(frame);

    expect(puddle.material).toBeInstanceOf(THREE.MeshPhysicalMaterial);
    expect(drop.material).toBeInstanceOf(THREE.MeshPhysicalMaterial);

    const puddleMaterial = puddle.material as THREE.MeshPhysicalMaterial;
    const dropMaterial = drop.material as THREE.MeshPhysicalMaterial;
    expect(puddleMaterial.clearcoat).toBeCloseTo(1);
    expect(puddleMaterial.ior).toBeCloseTo(1.333);
    expect(puddleMaterial.envMapIntensity).toBeGreaterThan(1.5);
    expect(dropMaterial.transmission).toBe(0);
    expect(dropMaterial.transparent).toBe(true);
    expect(dropMaterial.depthWrite).toBe(false);
    expect(dropMaterial.opacity).toBeGreaterThan(0.25);
    expect(dropMaterial.opacity).toBeLessThan(0.5);
    expect(dropMaterial.ior).toBeCloseTo(1.333);
    expect(dropMaterial.clearcoat).toBeGreaterThan(0.35);

    layer.dispose();
    expect(puddle.material).toBe(puddleOriginal);
    expect(drop.material).toBe(dropOriginal);
  });

  it('makes wet vegetation/rock reflective without turning every surface into a mirror', () => {
    const scene = new THREE.Scene();
    const bus = new EffectInfluenceBus();

    const bark = new THREE.MeshStandardMaterial({ color: '#704E2F' });
    bark.name = 'PB1_BarkWarm';
    const rock = new THREE.MeshStandardMaterial({ color: '#777F80' });
    rock.name = 'PB1_RockMid';
    const cloud = new THREE.MeshStandardMaterial({ color: '#586876' });
    cloud.name = 'PB1_StormCloudDark';

    scene.add(
      new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), bark),
      new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), rock),
      new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), cloud),
    );

    const layer = createVoxelProductionMaterialLayer({
      id: 'materials',
      role: 'utility',
      parameters: { wetness: 0.85 },
      services: services(scene, bus),
      seed: 9,
    });

    layer.update(frame);

    expect(bark.roughness).toBeGreaterThan(0.5);
    expect(bark.roughness).toBeLessThan(0.9);
    expect(rock.roughness).toBeLessThan(0.6);
    expect(rock.envMapIntensity).toBeGreaterThan(bark.envMapIntensity);
    expect(cloud.roughness).toBeGreaterThan(0.9);
    expect(cloud.envMapIntensity).toBeLessThan(0.3);
  });

  it('responds to PF4 reflection/light influences on the same timestamp and reconstructs baseline', () => {
    const scene = new THREE.Scene();
    const bus = new EffectInfluenceBus();
    const rock = new THREE.MeshStandardMaterial({ color: '#777F80' });
    rock.name = 'PB1_RockMid';
    scene.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), rock));

    const layer = createVoxelProductionMaterialLayer({
      id: 'materials',
      role: 'utility',
      parameters: { wetness: 0.55 },
      services: services(scene, bus),
      seed: 22,
    });

    bus.beginFrame();
    layer.update(frame);
    const baseline = {
      roughness: rock.roughness,
      envMapIntensity: rock.envMapIntensity,
      color: rock.color.getHex(),
    };

    bus.beginFrame();
    bus.contribute('wetReflection', 0.9);
    bus.contribute('environmentLight', 0.8);
    layer.update(frame);
    expect(rock.roughness).toBeLessThan(baseline.roughness);
    expect(rock.envMapIntensity).toBeGreaterThan(baseline.envMapIntensity);

    bus.beginFrame();
    layer.update(frame);
    expect(rock.roughness).toBeCloseTo(baseline.roughness);
    expect(rock.envMapIntensity).toBeCloseTo(baseline.envMapIntensity);
    expect(rock.color.getHex()).toBe(baseline.color);
  });
});
