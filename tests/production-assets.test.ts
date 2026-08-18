import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import {
  BrowserAssetRuntime,
  SceneRuntime,
  createModelPrefabFactory,
  type AssetDescriptor,
  type ModelSource,
  type ModelSourceLoader,
} from '@mindforge/engine';
import { createLibraryForTheme } from '@mindforge/library';

class FakeModelLoader implements ModelSourceLoader {
  readonly urls: string[] = [];

  constructor(private readonly source: ModelSource) {}

  async load(url: string): Promise<ModelSource> {
    this.urls.push(url);
    return this.source;
  }
}

function sourceModel(): ModelSource {
  const root = new THREE.Group();
  root.name = 'ProductionRoot';

  const pixels = new Uint8Array([80, 160, 220, 255]);
  const texture = new THREE.DataTexture(pixels, 1, 1, THREE.RGBAFormat);
  texture.needsUpdate = true;
  const material = new THREE.MeshStandardMaterial({ color: '#6ea4c8', map: texture });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material);
  mesh.name = 'HeroMesh';
  root.add(mesh);

  const anchor = new THREE.Object3D();
  anchor.name = 'MF_Anchor_Tip';
  anchor.position.set(0, 0.6, 0);
  root.add(anchor);

  return { scene: root, animations: [new THREE.AnimationClip('idle', 1, [])] };
}

const MODEL: AssetDescriptor = {
  id: 'model.test.productionCube',
  kind: 'model',
  url: 'assets/models/production-cube.glb',
  anchors: { tip: 'MF_Anchor_Tip' },
};

describe('production asset runtime', () => {
  it('preloads once and returns independently disposable model instances', async () => {
    const loader = new FakeModelLoader(sourceModel());
    const assets = new BrowserAssetRuntime({ baseUrl: 'https://example.test/mindforge/', loader });

    await Promise.all([assets.preload([MODEL]), assets.preload([MODEL])]);
    expect(loader.urls).toEqual(['https://example.test/mindforge/assets/models/production-cube.glb']);
    expect(assets.has(MODEL.id)).toBe(true);

    const first = assets.instantiateModel(MODEL.id);
    const second = assets.instantiateModel(MODEL.id);
    expect(first.object3d).not.toBe(second.object3d);
    expect(first.anchors.tip).toBe(first.object3d.getObjectByName('MF_Anchor_Tip'));
    expect(second.anchors.tip).toBe(second.object3d.getObjectByName('MF_Anchor_Tip'));

    const firstMesh = first.object3d.getObjectByName('HeroMesh') as THREE.Mesh;
    const secondMesh = second.object3d.getObjectByName('HeroMesh') as THREE.Mesh;
    expect(firstMesh.geometry).not.toBe(secondMesh.geometry);
    expect(firstMesh.material).not.toBe(secondMesh.material);
    expect((firstMesh.material as THREE.MeshStandardMaterial).map).not.toBe(
      (secondMesh.material as THREE.MeshStandardMaterial).map,
    );

    (firstMesh.material as THREE.MeshStandardMaterial).color.set('#ff0000');
    expect((secondMesh.material as THREE.MeshStandardMaterial).color.getHexString()).toBe('6ea4c8');

    assets.dispose();
  });

  it('passes preloaded asset access through SceneServices into prefab factories', async () => {
    const loader = new FakeModelLoader(sourceModel());
    const assets = new BrowserAssetRuntime({ loader });
    await assets.preload([MODEL]);

    const library = createLibraryForTheme('voxel');
    library.assets.describe(MODEL);
    library.prefabs.register('prefab.test.productionCube', createModelPrefabFactory(MODEL.id));

    const runtime = new SceneRuntime();
    runtime.load(
      {
        schemaVersion: '0.1',
        id: 'test-production-assets',
        title: 'Production asset test',
        duration: 1,
        environment: 'environment.artifactStage',
        entities: [
          {
            id: 'hero',
            type: 'prefab',
            factory: 'prefab.test.productionCube',
          },
        ],
        timeline: [],
      },
      library,
      assets,
    );

    const hero = runtime.getEntities()[0];
    expect(hero?.getAnchor('tip')).toBeDefined();
    expect(hero?.anchorNames()).toEqual(['tip']);

    runtime.dispose();
    expect(assets.has(MODEL.id)).toBe(true);
    expect(() => assets.instantiateModel(MODEL.id)).not.toThrow();
    assets.dispose();
  });

  it('fails clearly during preload when a declared semantic anchor is missing from the GLB', async () => {
    const loader = new FakeModelLoader(sourceModel());
    const assets = new BrowserAssetRuntime({ loader });
    await expect(
      assets.preload([
        {
          ...MODEL,
          id: 'model.test.badAnchor',
          anchors: { hand: 'DoesNotExist' },
        },
      ]),
    ).rejects.toThrow('missing authored anchor node "DoesNotExist"');
    assets.dispose();
  });
});
