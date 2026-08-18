import * as THREE from 'three';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  BrowserAssetRuntime,
  MODEL_BUDGET_PRESETS,
  validateAssetCatalog,
  type AssetDescriptor,
  type ModelSource,
  type ModelSourceLoader,
} from '@mindforge/engine';
import { getTheme, listThemes } from '@mindforge/themes';
import { inspectGltfFile } from '../tools/lib/gltf-inspector';

class StaticLoader implements ModelSourceLoader {
  constructor(private readonly source: ModelSource) {}

  async load(): Promise<ModelSource> {
    return this.source;
  }
}

function authoredSource(): ModelSource {
  const root = new THREE.Group();
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshStandardMaterial({ color: '#88aacc' }),
  );
  mesh.name = 'Body';
  root.add(mesh);

  const anchor = new THREE.Object3D();
  anchor.name = 'MF_Anchor_Grip';
  root.add(anchor);
  return { scene: root, animations: [new THREE.AnimationClip('WalkCycle', 1, [])] };
}

const AUTHORED_MODEL: AssetDescriptor = {
  id: 'model.test.authoredCharacter',
  kind: 'model',
  url: 'assets/test/authored-character.glb',
  anchors: { grip: 'MF_Anchor_Grip' },
  model: {
    category: 'character',
    quality: 'standard',
    units: 'meters',
    upAxis: 'Y',
    forwardAxis: '-Z',
    origin: 'ground-center',
    materialPolicy: 'embedded-pbr',
    importTransform: { scale: 2, offset: [1, 0, 0] },
    clips: { walk: 'WalkCycle' },
    budget: MODEL_BUDGET_PRESETS.standard,
    castShadow: true,
    receiveShadow: true,
  },
  provenance: { source: 'original', license: 'MindForge original' },
};

describe('PF2 production asset/model standard', () => {
  it('keeps every registered theme asset organized in a valid pack catalogue', () => {
    for (const themeId of listThemes()) {
      const theme = getTheme(themeId);
      expect(validateAssetCatalog(theme.id, theme.assets, theme.assetPacks)).toEqual([]);
    }
  });

  it('accepts a fully-described authored model inside a production pack', () => {
    expect(
      validateAssetCatalog('voxel', [AUTHORED_MODEL], [
        {
          id: 'pack.voxel.test-production',
          label: 'Test production pack',
          maturity: 'production',
          assetIds: [AUTHORED_MODEL.id],
        },
      ]),
    ).toEqual([]);
  });

  it('does not allow procedural fallbacks to be mislabeled as a production pack', () => {
    const asset: AssetDescriptor = { id: 'model.test.fallback', kind: 'model', procedural: true };
    const issues = validateAssetCatalog('voxel', [asset], [
      {
        id: 'pack.voxel.bad-production',
        label: 'Bad production pack',
        maturity: 'production',
        assetIds: [asset.id],
      },
    ]);
    expect(issues.some((entry) => entry.code === 'pack.non-production-asset')).toBe(true);
  });

  it('applies import normalization, shadow policy and semantic animation mappings to authored clones', async () => {
    const assets = new BrowserAssetRuntime({ loader: new StaticLoader(authoredSource()) });
    await assets.preload([AUTHORED_MODEL]);

    const model = assets.instantiateModel(AUTHORED_MODEL.id);
    expect(model.object3d.scale.toArray()).toEqual([2, 2, 2]);
    expect(model.object3d.position.toArray()).toEqual([1, 0, 0]);
    expect(model.anchors.grip?.name).toBe('MF_Anchor_Grip');
    expect(model.clips.walk?.name).toBe('WalkCycle');
    expect(model.clips.walk).toBe(model.animations[0]);

    const mesh = model.object3d.getObjectByName('Body') as THREE.Mesh;
    expect(mesh.castShadow).toBe(true);
    expect(mesh.receiveShadow).toBe(true);
    assets.dispose();
  });

  it('rejects broken semantic anchor/clip contracts during preload instead of during scene construction', async () => {
    const assets = new BrowserAssetRuntime({ loader: new StaticLoader(authoredSource()) });
    await expect(
      assets.preload([
        {
          ...AUTHORED_MODEL,
          id: 'model.test.broken-contract',
          anchors: { missing: 'MF_Anchor_Missing' },
          model: { ...AUTHORED_MODEL.model!, clips: { idle: 'MissingClip' } },
        },
      ]),
    ).rejects.toThrow('failed runtime contract validation');
    assets.dispose();
  });

  it('inspects both glTF JSON and GLB metadata without loading renderer dependencies', () => {
    const dir = mkdtempSync(join(tmpdir(), 'mindforge-gltf-'));
    try {
      const document = {
        asset: { version: '2.0' },
        accessors: [{ count: 6 }],
        meshes: [{ primitives: [{ indices: 0 }] }],
        materials: [{}],
        textures: [{}],
        nodes: [{ name: 'Root' }, { name: 'MF_Anchor_Grip' }],
        animations: [{ name: 'WalkCycle' }],
      };
      const gltfPath = join(dir, 'sample.gltf');
      writeFileSync(gltfPath, JSON.stringify(document));
      expect(inspectGltfFile(gltfPath)).toMatchObject({
        format: 'gltf',
        meshCount: 1,
        materialCount: 1,
        textureCount: 1,
        triangleCount: 2,
        animationNames: ['WalkCycle'],
      });

      const glbPath = join(dir, 'sample.glb');
      writeFileSync(glbPath, createGlb(document));
      expect(inspectGltfFile(glbPath)).toMatchObject({ format: 'glb', triangleCount: 2 });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

function createGlb(document: object): Buffer {
  const json = Buffer.from(JSON.stringify(document), 'utf8');
  const paddedLength = Math.ceil(json.length / 4) * 4;
  const padded = Buffer.alloc(paddedLength, 0x20);
  json.copy(padded);
  const out = Buffer.alloc(12 + 8 + paddedLength);
  out.writeUInt32LE(0x46546c67, 0);
  out.writeUInt32LE(2, 4);
  out.writeUInt32LE(out.length, 8);
  out.writeUInt32LE(paddedLength, 12);
  out.writeUInt32LE(0x4e4f534a, 16);
  padded.copy(out, 20);
  return out;
}
