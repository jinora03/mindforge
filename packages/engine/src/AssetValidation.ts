import { HUMANOID_ANCHORS, HUMANOID_JOINTS } from './humanoid';
import type {
  AssetDescriptor,
  AssetPackDescriptor,
  ModelAssetBudget,
  ModelAssetProfile,
  ModelQualityTier,
} from './EngineTypes';

export interface AssetCatalogIssue {
  readonly code: string;
  readonly message: string;
  readonly assetId?: string;
  readonly packId?: string;
}

export const MODEL_BUDGET_PRESETS: Readonly<Record<ModelQualityTier, ModelAssetBudget>> = {
  background: { maxTriangles: 20_000, maxMaterials: 4, maxTextures: 6 },
  standard: { maxTriangles: 60_000, maxMaterials: 8, maxTextures: 12 },
  hero: { maxTriangles: 150_000, maxMaterials: 16, maxTextures: 24 },
};

/**
 * Build-time descriptor/pack validation shared by tests and the asset CLI. This
 * deliberately does not read files; `tools/validate-assets.ts` adds GLB/GLTF
 * inspection on top of this pure contract.
 */
export function validateAssetCatalog(
  themeId: string,
  assets: readonly AssetDescriptor[],
  packs: readonly AssetPackDescriptor[],
): AssetCatalogIssue[] {
  const issues: AssetCatalogIssue[] = [];
  const byId = new Map<string, AssetDescriptor>();

  for (const asset of assets) {
    if (byId.has(asset.id)) {
      issues.push(issue('asset.duplicate-id', `duplicate asset id "${asset.id}"`, asset.id));
      continue;
    }
    byId.set(asset.id, asset);
    validateAssetDescriptor(asset, issues);
  }

  const packIds = new Set<string>();
  const covered = new Set<string>();
  for (const pack of packs) {
    if (packIds.has(pack.id)) {
      issues.push({ code: 'pack.duplicate-id', message: `duplicate asset pack id "${pack.id}"`, packId: pack.id });
      continue;
    }
    packIds.add(pack.id);

    if (!pack.id.startsWith(`pack.${themeId}.`)) {
      issues.push({
        code: 'pack.theme-prefix',
        message: `asset pack "${pack.id}" must start with "pack.${themeId}."`,
        packId: pack.id,
      });
    }
    if (pack.assetIds.length === 0) {
      issues.push({ code: 'pack.empty', message: `asset pack "${pack.id}" must contain at least one asset`, packId: pack.id });
    }

    const localIds = new Set<string>();
    for (const assetId of pack.assetIds) {
      if (localIds.has(assetId)) {
        issues.push({
          code: 'pack.duplicate-asset',
          message: `asset pack "${pack.id}" lists "${assetId}" more than once`,
          assetId,
          packId: pack.id,
        });
        continue;
      }
      localIds.add(assetId);
      covered.add(assetId);
      const asset = byId.get(assetId);
      if (!asset) {
        issues.push({
          code: 'pack.unknown-asset',
          message: `asset pack "${pack.id}" references unknown asset "${assetId}"`,
          assetId,
          packId: pack.id,
        });
        continue;
      }
      if (pack.maturity === 'production' && !isProductionAsset(asset)) {
        issues.push({
          code: 'pack.non-production-asset',
          message: `production pack "${pack.id}" contains non-production asset "${assetId}"`,
          assetId,
          packId: pack.id,
        });
      }
    }
  }

  for (const asset of assets) {
    if (!covered.has(asset.id)) {
      issues.push(issue('asset.unpacked', `asset "${asset.id}" is not assigned to any theme asset pack`, asset.id));
    }
  }

  return issues;
}

export function isProductionAsset(asset: AssetDescriptor): boolean {
  if (asset.procedural === true || !asset.url) return false;
  if (asset.kind !== 'model') return asset.provenance !== undefined;
  if (!asset.model || !asset.provenance) return false;
  if (asset.model.category === 'character') return asset.character !== undefined;
  return asset.character === undefined;
}

function validateAssetDescriptor(asset: AssetDescriptor, issues: AssetCatalogIssue[]): void {
  if (!asset.id.trim()) issues.push(issue('asset.empty-id', 'asset id cannot be empty', asset.id));

  if (asset.procedural === true && asset.url) {
    issues.push(issue('asset.procedural-url', `asset "${asset.id}" cannot be both procedural and URL-backed`, asset.id));
  }

  if (asset.kind !== 'model') return;

  if (asset.url) {
    if (!/\.gl(?:b|tf)(?:[?#].*)?$/i.test(asset.url)) {
      issues.push(issue('model.extension', `model asset "${asset.id}" must use a .glb or .gltf URL`, asset.id));
    }
    if (!asset.model) {
      issues.push(issue('model.profile-missing', `URL-backed model "${asset.id}" is missing its PF2 model profile`, asset.id));
    } else {
      validateModelProfile(asset.id, asset.model, issues);
    }
    if (!asset.provenance) {
      issues.push(issue('asset.provenance-missing', `URL-backed model "${asset.id}" is missing provenance metadata`, asset.id));
    } else if (asset.provenance.source === 'licensed' && !asset.provenance.license) {
      issues.push(issue('asset.license-missing', `licensed asset "${asset.id}" must declare its license`, asset.id));
    }

    if (asset.model?.category === 'character') {
      validateCharacterProfile(asset, issues);
    } else if (asset.character) {
      issues.push(issue(
        'character.profile-category',
        `model "${asset.id}" declares PF7 character metadata but its category is not "character"`,
        asset.id,
      ));
    }

    for (const [semanticName, nodeName] of Object.entries(asset.anchors ?? {})) {
      if (!semanticName.trim()) {
        issues.push(issue('model.anchor-semantic-empty', `model "${asset.id}" has an empty semantic anchor name`, asset.id));
      }
      if (!nodeName.startsWith('MF_Anchor_')) {
        issues.push(issue(
          'model.anchor-prefix',
          `authored anchor "${nodeName}" on "${asset.id}" must use the MF_Anchor_ prefix`,
          asset.id,
        ));
      }
    }
  } else if (asset.model || asset.character || asset.provenance) {
    issues.push(issue(
      'model.metadata-without-url',
      `procedural model "${asset.id}" should not carry authored model/provenance metadata until it has a URL-backed replacement`,
      asset.id,
    ));
  }
}

function validateModelProfile(
  assetId: string,
  profile: ModelAssetProfile,
  issues: AssetCatalogIssue[],
): void {
  if (profile.category === 'character' && !profile.forwardAxis) {
    issues.push(issue('model.forward-axis-missing', `character model "${assetId}" must declare a forwardAxis`, assetId));
  }
  const scale = profile.importTransform?.scale;
  if (scale !== undefined && (!Number.isFinite(scale) || scale <= 0)) {
    issues.push(issue('model.import-scale', `model "${assetId}" import scale must be finite and > 0`, assetId));
  }
  for (const [name, value] of Object.entries(profile.budget)) {
    if (!Number.isInteger(value) || value <= 0) {
      issues.push(issue('model.budget', `model "${assetId}" budget ${name} must be a positive integer`, assetId));
    }
  }
  for (const [semanticName, authoredName] of Object.entries(profile.clips ?? {})) {
    if (!semanticName.trim() || !authoredName.trim()) {
      issues.push(issue('model.clip-map', `model "${assetId}" clip mappings cannot contain empty names`, assetId));
    }
  }
}

function validateCharacterProfile(asset: AssetDescriptor, issues: AssetCatalogIssue[]): void {
  const profile = asset.character;
  if (!profile) {
    issues.push(issue(
      'character.profile-missing',
      `production character model "${asset.id}" is missing its PF7 character profile`,
      asset.id,
    ));
    return;
  }

  const anchors = asset.anchors ?? {};
  for (const anchor of HUMANOID_ANCHORS) {
    if (!anchors[anchor]) {
      issues.push(issue(
        'character.anchor-missing',
        `production character "${asset.id}" must expose semantic anchor "${anchor}"`,
        asset.id,
      ));
    }
  }

  const authoredJointNames = new Set<string>();
  for (const joint of HUMANOID_JOINTS) {
    const nodeName = profile.joints[joint];
    if (!nodeName?.trim()) {
      issues.push(issue(
        'character.joint-missing',
        `production character "${asset.id}" must map semantic joint "${joint}"`,
        asset.id,
      ));
      continue;
    }
    if (authoredJointNames.has(nodeName)) {
      issues.push(issue(
        'character.joint-duplicate',
        `production character "${asset.id}" maps multiple semantic joints to authored node "${nodeName}"`,
        asset.id,
      ));
    }
    authoredJointNames.add(nodeName);
  }
}

function issue(code: string, message: string, assetId: string): AssetCatalogIssue {
  return { code, message, assetId };
}
