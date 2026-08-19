import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { SceneRuntime, type RuntimeAssetAccess } from '@mindforge/engine';
import { createLibraryForTheme } from '@mindforge/library';
import { getTheme } from '@mindforge/themes';
import { inspectGltfFile } from '../tools/lib/gltf-inspector';

const root = fileURLToPath(new URL('..', import.meta.url));

function pack(id: string) {
  const found = getTheme('voxel').assetPacks.find((entry) => entry.id === id);
  if (!found) throw new Error(`Missing PB1 asset pack ${id}`);
  return found;
}

function asset(id: string) {
  const found = getTheme('voxel').assets.find((entry) => entry.id === id);
  if (!found) throw new Error(`Missing PB1 asset ${id}`);
  return found;
}

describe('PB1 production asset baseline', () => {
  it('registers the first authored nature and optics packs as real production packs', () => {
    const nature = pack('pack.voxel.nature-production');
    const optics = pack('pack.voxel.optics-production');

    expect(nature.maturity).toBe('production');
    expect(nature.assetIds).toHaveLength(16);
    expect(optics.maturity).toBe('production');
    expect(optics.assetIds).toHaveLength(3);

    for (const id of [...nature.assetIds, ...optics.assetIds]) {
      const descriptor = asset(id);
      expect(descriptor.kind).toBe('model');
      expect(descriptor.procedural).not.toBe(true);
      expect(descriptor.url).toMatch(/^assets\/voxel\/.+\.glb$/);
      expect(descriptor.model).toBeDefined();
      expect(descriptor.provenance?.source).toBe('original');
    }
  });

  it('ships inspectable embedded GLBs whose anchors and budgets satisfy their declarations', () => {
    const ids = [
      ...pack('pack.voxel.nature-production').assetIds,
      ...pack('pack.voxel.optics-production').assetIds,
    ];

    for (const id of ids) {
      const descriptor = asset(id);
      const path = resolve(root, 'public', descriptor.url!);
      expect(existsSync(path), `${id} should ship its GLB`).toBe(true);

      const inspection = inspectGltfFile(path);
      expect(inspection.format).toBe('glb');
      expect(inspection.meshCount, `${id} should contain authored geometry`).toBeGreaterThan(0);
      expect(inspection.materialCount, `${id} should contain embedded material data`).toBeGreaterThan(0);
      expect(inspection.textureCount, `${id} should carry its Voxel pixel surface in the GLB`).toBeGreaterThan(0);
      expect(inspection.externalUris).toEqual([]);
      expect(inspection.remoteUris).toEqual([]);
      expect(inspection.triangleCount).toBeLessThanOrEqual(descriptor.model!.budget.maxTriangles);
      expect(inspection.materialCount).toBeLessThanOrEqual(descriptor.model!.budget.maxMaterials);
      expect(inspection.textureCount).toBeLessThanOrEqual(descriptor.model!.budget.maxTextures);

      for (const nodeName of Object.values(descriptor.anchors ?? {})) {
        expect(
          inspection.nodeNames.filter((name) => name === nodeName),
          `${id} should expose exactly one ${nodeName}`,
        ).toHaveLength(1);
      }
    }
  });

  it('gives the Rainbow hero droplet a stepped block-built silhouette and full optics anchor surface', () => {
    const droplet = asset('model.prop.prismDrop.production');
    const inspection = inspectGltfFile(resolve(root, 'public', droplet.url!));

    expect(droplet.model?.quality).toBe('hero');
    expect(inspection.meshCount).toBeGreaterThanOrEqual(8);
    expect(inspection.triangleCount).toBeGreaterThanOrEqual(80);
    expect(inspection.triangleCount).toBeLessThanOrEqual(180);
    expect(inspection.nodeNames.some((name) => name.startsWith('HeroDroplet_Block_'))).toBe(true);
    expect(Object.keys(droplet.anchors ?? {}).sort()).toEqual([
      'bend',
      'blue',
      'center',
      'exit',
      'green',
      'input',
      'orange',
      'red',
      'reflect',
      'violet',
      'yellow',
    ]);
  });

  it('lets the existing PF6 nature layer consume PB1 authored trees/bushes/rocks without new episode semantics', () => {
    const productionNatureIds = new Set([
      'model.vegetation.treeOakA.production',
      'model.vegetation.treeOakB.production',
      'model.vegetation.treePineA.production',
      'model.vegetation.treeYoungA.production',
      'model.vegetation.bushA.production',
      'model.vegetation.bushB.production',
      'model.rock.meadowA.production',
      'model.rock.meadowB.production',
      'model.rock.clusterA.production',
    ]);

    const instantiated: string[] = [];
    const assets: RuntimeAssetAccess = {
      has: (id) => productionNatureIds.has(id),
      instantiateModel(id) {
        instantiated.push(id);
        const object3d = new THREE.Group();
        object3d.name = `pb1-authored:${id}`;
        return { object3d, anchors: {}, animations: [], clips: {} };
      },
    };

    const runtime = new SceneRuntime();
    runtime.load(
      {
        schemaVersion: '0.1',
        id: 'pb1-authored-nature-bridge',
        title: 'PB1 authored nature bridge',
        duration: 2,
        environment: 'environment.compositionStage',
        layers: [
          {
            id: 'nature',
            factory: 'layer.setDressing.nature',
            role: 'setDressing',
            parameters: { count: 12, clearRadius: 4 },
          },
        ],
        entities: [],
        timeline: [],
      },
      createLibraryForTheme('voxel'),
      assets,
    );

    const authored: THREE.Object3D[] = [];
    runtime.scene.traverse((object) => {
      if (object.userData.mindforgeCompositionSource === 'authored') authored.push(object);
    });

    expect(instantiated).toHaveLength(12);
    expect(authored).toHaveLength(12);
    expect(instantiated.every((id) => productionNatureIds.has(id))).toBe(true);
    runtime.dispose();
  });
});
