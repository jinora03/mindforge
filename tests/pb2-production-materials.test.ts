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
  it('registers the reusable Voxel production-material compatibility layer', () => {
    expect(VOXEL_THEME.sceneLayers[VOXEL_PB2_MATERIAL_LAYER_ID]).toBe(
      createVoxelProductionMaterialLayer,
    );
  });

  it('leaves authored production materials untouched at runtime and disposal', () => {
    const scene = new THREE.Scene();
    const bus = new EffectInfluenceBus();

    const puddleOriginal = new THREE.MeshStandardMaterial({
      color: '#62A4BF',
    });
    puddleOriginal.name = 'PB2_PuddleWater';

    const puddle = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      puddleOriginal,
    );
    scene.add(puddle);

    const dropOriginal = new THREE.MeshStandardMaterial({
      color: '#BCE7F5',
    });
    dropOriginal.name = 'PB2_OpticalWaterGlass';

    const drop = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      dropOriginal,
    );
    scene.add(drop);

    const edgeOriginal = new THREE.MeshStandardMaterial({
      color: '#7DBCD5',
    });
    edgeOriginal.name = 'PB2_OpticalEdge';

    const edge = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.4, 0.4),
      edgeOriginal,
    );
    scene.add(edge);

    const baseline = {
      puddleColor: puddleOriginal.color.getHex(),
      puddleRoughness: puddleOriginal.roughness,
      puddleMetalness: puddleOriginal.metalness,

      dropColor: dropOriginal.color.getHex(),
      dropTransparent: dropOriginal.transparent,
      dropDepthWrite: dropOriginal.depthWrite,
      dropOpacity: dropOriginal.opacity,

      edgeColor: edgeOriginal.color.getHex(),
      edgeEmissiveIntensity: edgeOriginal.emissiveIntensity,
    };

    const layer = createVoxelProductionMaterialLayer({
      id: 'materials',
      role: 'utility',
      parameters: {
        wetness: 0.8,
      },
      services: services(scene, bus),
      seed: 17,
    });

    layer.update(frame);

    expect(puddle.material).toBe(puddleOriginal);
    expect(drop.material).toBe(dropOriginal);
    expect(edge.material).toBe(edgeOriginal);

    expect(puddleOriginal.color.getHex()).toBe(baseline.puddleColor);
    expect(puddleOriginal.roughness).toBe(baseline.puddleRoughness);
    expect(puddleOriginal.metalness).toBe(baseline.puddleMetalness);

    expect(dropOriginal.color.getHex()).toBe(baseline.dropColor);
    expect(dropOriginal.transparent).toBe(baseline.dropTransparent);
    expect(dropOriginal.depthWrite).toBe(baseline.dropDepthWrite);
    expect(dropOriginal.opacity).toBe(baseline.dropOpacity);

    expect(edgeOriginal.color.getHex()).toBe(baseline.edgeColor);
    expect(edgeOriginal.emissiveIntensity).toBe(
      baseline.edgeEmissiveIntensity,
    );

    layer.dispose();

    expect(puddle.material).toBe(puddleOriginal);
    expect(drop.material).toBe(dropOriginal);
    expect(edge.material).toBe(edgeOriginal);
  });

  it('does not replace or restyle authored vegetation, rock, or cloud materials', () => {
    const scene = new THREE.Scene();
    const bus = new EffectInfluenceBus();

    const bark = new THREE.MeshStandardMaterial({
      color: '#704E2F',
    });
    bark.name = 'PB1_BarkWarm';

    const rock = new THREE.MeshStandardMaterial({
      color: '#777F80',
    });
    rock.name = 'PB1_RockMid';

    const cloud = new THREE.MeshStandardMaterial({
      color: '#586876',
    });
    cloud.name = 'PB1_StormCloudDark';

    const barkMesh = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      bark,
    );

    const rockMesh = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      rock,
    );

    const cloudMesh = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      cloud,
    );

    scene.add(barkMesh, rockMesh, cloudMesh);

    const baseline = {
      barkRoughness: bark.roughness,
      barkEnvMapIntensity: bark.envMapIntensity,
      barkColor: bark.color.getHex(),
      barkFlatShading: bark.flatShading,

      rockRoughness: rock.roughness,
      rockEnvMapIntensity: rock.envMapIntensity,
      rockColor: rock.color.getHex(),
      rockFlatShading: rock.flatShading,

      cloudRoughness: cloud.roughness,
      cloudEnvMapIntensity: cloud.envMapIntensity,
      cloudColor: cloud.color.getHex(),
      cloudFlatShading: cloud.flatShading,
    };

    const layer = createVoxelProductionMaterialLayer({
      id: 'materials',
      role: 'utility',
      parameters: {
        wetness: 0.85,
      },
      services: services(scene, bus),
      seed: 9,
    });

    layer.update(frame);

    expect(barkMesh.material).toBe(bark);
    expect(rockMesh.material).toBe(rock);
    expect(cloudMesh.material).toBe(cloud);

    expect(bark.roughness).toBe(baseline.barkRoughness);
    expect(bark.envMapIntensity).toBe(baseline.barkEnvMapIntensity);
    expect(bark.color.getHex()).toBe(baseline.barkColor);
    expect(bark.flatShading).toBe(baseline.barkFlatShading);

    expect(rock.roughness).toBe(baseline.rockRoughness);
    expect(rock.envMapIntensity).toBe(baseline.rockEnvMapIntensity);
    expect(rock.color.getHex()).toBe(baseline.rockColor);
    expect(rock.flatShading).toBe(baseline.rockFlatShading);

    expect(cloud.roughness).toBe(baseline.cloudRoughness);
    expect(cloud.envMapIntensity).toBe(baseline.cloudEnvMapIntensity);
    expect(cloud.color.getHex()).toBe(baseline.cloudColor);
    expect(cloud.flatShading).toBe(baseline.cloudFlatShading);

    layer.dispose();

    expect(barkMesh.material).toBe(bark);
    expect(rockMesh.material).toBe(rock);
    expect(cloudMesh.material).toBe(cloud);
  });

  it('ignores PF4 material influences because authored assets own their surfaces', () => {
    const scene = new THREE.Scene();
    const bus = new EffectInfluenceBus();

    const rock = new THREE.MeshStandardMaterial({
      color: '#777F80',
    });
    rock.name = 'PB1_RockMid';

    const rockMesh = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      rock,
    );

    scene.add(rockMesh);

    const layer = createVoxelProductionMaterialLayer({
      id: 'materials',
      role: 'utility',
      parameters: {
        wetness: 0.55,
      },
      services: services(scene, bus),
      seed: 22,
    });

    const baseline = {
      material: rockMesh.material,
      roughness: rock.roughness,
      envMapIntensity: rock.envMapIntensity,
      color: rock.color.getHex(),
      metalness: rock.metalness,
      flatShading: rock.flatShading,
    };

    bus.beginFrame();
    layer.update(frame);

    bus.beginFrame();
    bus.contribute('wetReflection', 0.9);
    bus.contribute('environmentLight', 0.8);
    bus.contribute('emissiveBoost', 0.7);
    layer.update(frame);

    expect(rockMesh.material).toBe(baseline.material);
    expect(rock.roughness).toBe(baseline.roughness);
    expect(rock.envMapIntensity).toBe(baseline.envMapIntensity);
    expect(rock.color.getHex()).toBe(baseline.color);
    expect(rock.metalness).toBe(baseline.metalness);
    expect(rock.flatShading).toBe(baseline.flatShading);

    bus.beginFrame();
    layer.update(frame);

    expect(rockMesh.material).toBe(baseline.material);
    expect(rock.roughness).toBe(baseline.roughness);
    expect(rock.envMapIntensity).toBe(baseline.envMapIntensity);
    expect(rock.color.getHex()).toBe(baseline.color);
    expect(rock.metalness).toBe(baseline.metalness);
    expect(rock.flatShading).toBe(baseline.flatShading);

    layer.dispose();

    expect(rockMesh.material).toBe(baseline.material);
  });
});