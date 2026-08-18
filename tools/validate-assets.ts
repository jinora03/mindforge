import { existsSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  validateAssetCatalog,
  type AssetDescriptor,
  type ModelAssetProfile,
} from '@mindforge/engine';
import { getTheme, listThemes } from '@mindforge/themes';
import { inspectGltfFile, type GltfInspection } from './lib/gltf-inspector';

const root = fileURLToPath(new URL('..', import.meta.url));
const publicRoot = resolve(root, 'public');
const assetsRoot = resolve(publicRoot, 'assets');
const unsupportedRuntimeExtensions = new Set([
  'KHR_draco_mesh_compression',
  'KHR_texture_basisu',
  'EXT_meshopt_compression',
]);

let failures = 0;
console.log('MindForge · production asset validation\n');

for (const themeId of listThemes()) {
  const failuresBeforeTheme = failures;
  const theme = getTheme(themeId);
  const issues = validateAssetCatalog(theme.id, theme.assets, theme.assetPacks);
  for (const issue of issues) fail(themeId, issue.message);

  let authored = 0;
  for (const asset of theme.assets) {
    if (asset.kind !== 'model' || !asset.url) continue;
    authored++;
    validateAuthoredModel(themeId, asset);
  }

  const productionPacks = theme.assetPacks.filter((pack) => pack.maturity === 'production').length;
  console.log(
    `  ${failures === failuresBeforeTheme ? '✓' : '•'} ${themeId}: ${theme.assets.length} assets · ${theme.assetPacks.length} packs · ${authored} authored models · ${productionPacks} production packs`,
  );
}

console.log('');
if (failures > 0) {
  console.error(`Asset validation failed: ${failures} problem(s).`);
  process.exit(1);
}
console.log('All asset descriptors, packs and authored model files satisfy the PF2 contract.');

function validateAuthoredModel(themeId: string, asset: AssetDescriptor): void {
  const path = resolveLocalModelPath(asset.url ?? '');
  if (!path) {
    fail(
      themeId,
      `${asset.id}: production model URL must resolve under public/assets so preview/export do not depend on a remote CDN`,
    );
    return;
  }
  if (!existsSync(path)) {
    fail(themeId, `${asset.id}: missing model file ${relative(root, path)}`);
    return;
  }

  try {
    const inspection = inspectGltfFile(path);
    validateInspection(themeId, asset, asset.model, inspection, path);
  } catch (error) {
    fail(themeId, `${asset.id}: ${(error as Error).message}`);
  }
}

function validateInspection(
  themeId: string,
  asset: AssetDescriptor,
  profile: ModelAssetProfile | undefined,
  inspection: GltfInspection,
  path: string,
): void {
  if (!profile) return; // Pure descriptor validation already reports this clearly.
  if (inspection.meshCount === 0) fail(themeId, `${asset.id}: authored model contains no meshes`);

  const nodeCounts = count(inspection.nodeNames);
  for (const [semanticName, nodeName] of Object.entries(asset.anchors ?? {})) {
    const matches = nodeCounts.get(nodeName) ?? 0;
    if (matches !== 1) {
      fail(
        themeId,
        `${asset.id}: anchor ${semanticName} -> ${nodeName} must match exactly one GLTF node (found ${matches})`,
      );
    }
  }

  const animationCounts = count(inspection.animationNames);
  for (const [semanticName, clipName] of Object.entries(profile.clips ?? {})) {
    const matches = animationCounts.get(clipName) ?? 0;
    if (matches !== 1) {
      fail(
        themeId,
        `${asset.id}: clip ${semanticName} -> ${clipName} must match exactly one GLTF animation (found ${matches})`,
      );
    }
  }

  if (inspection.triangleCount > profile.budget.maxTriangles) {
    fail(
      themeId,
      `${asset.id}: ${inspection.triangleCount.toLocaleString()} triangles exceeds ${profile.budget.maxTriangles.toLocaleString()} budget`,
    );
  }
  if (inspection.materialCount > profile.budget.maxMaterials) {
    fail(
      themeId,
      `${asset.id}: ${inspection.materialCount} materials exceeds ${profile.budget.maxMaterials} budget`,
    );
  }
  if (inspection.textureCount > profile.budget.maxTextures) {
    fail(
      themeId,
      `${asset.id}: ${inspection.textureCount} textures exceeds ${profile.budget.maxTextures} budget`,
    );
  }

  for (const extension of inspection.extensionsUsed) {
    if (unsupportedRuntimeExtensions.has(extension)) {
      fail(
        themeId,
        `${asset.id}: uses ${extension}, but BrowserAssetRuntime has no decoder configured for it`,
      );
    }
  }

  for (const uri of inspection.remoteUris) {
    fail(themeId, `${asset.id}: GLTF references remote dependency ${uri}; bundle production dependencies locally`);
  }

  for (const uri of inspection.externalUris) {
    const dependency = resolve(dirname(path), uri);
    if (!isInsideAssetsRoot(dependency)) {
      fail(themeId, `${asset.id}: GLTF dependency escapes public/assets (${uri})`);
      continue;
    }
    if (!existsSync(dependency)) {
      fail(themeId, `${asset.id}: GLTF references missing external file ${relative(root, dependency)}`);
    }
  }
}

function resolveLocalModelPath(url: string): string | undefined {
  if (/^(?:[a-z]+:)?\/\//i.test(url) || url.startsWith('data:') || url.startsWith('blob:')) {
    return undefined;
  }
  const normalized = url.replace(/^\//, '');
  if (!normalized.startsWith('assets/')) return undefined;
  const path = resolve(publicRoot, normalized);
  return isInsideAssetsRoot(path) ? path : undefined;
}

function isInsideAssetsRoot(path: string): boolean {
  return path === assetsRoot || path.startsWith(`${assetsRoot}/`) || path.startsWith(`${assetsRoot}\\`);
}

function count(values: readonly string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return counts;
}

function fail(scope: string, message: string): void {
  failures++;
  console.error(`  ✗ ${scope}: ${message}`);
}
