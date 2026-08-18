import * as THREE from 'three';
import type {
  SceneCompositionLayerFactory,
  SceneCompositionLayerInstance,
} from '@mindforge/engine';

/**
 * PB2 keeps material semantics in the Voxel theme rather than in the Engine.
 * Authored GLBs retain their own base colours/material names; this layer only
 * upgrades known MindForge production material families and applies shared
 * wet/light response from PF4.
 */

type SurfaceFamily =
  | 'bark'
  | 'foliage'
  | 'grass'
  | 'flower'
  | 'rock'
  | 'cloud'
  | 'puddle'
  | 'waterGlass'
  | 'prismGlass'
  | 'opticalEdge';

interface SurfaceProfile {
  readonly dryRoughness: number;
  readonly wetRoughness: number;
  readonly baseEnvMapIntensity: number;
  readonly wetEnvBoost: number;
  readonly flashEnvBoost: number;
  readonly wetDarken: number;
}

const SURFACE_PROFILES: Record<Exclude<SurfaceFamily, 'puddle' | 'waterGlass' | 'prismGlass' | 'opticalEdge'>, SurfaceProfile> = {
  bark: {
    dryRoughness: 0.9,
    wetRoughness: 0.58,
    baseEnvMapIntensity: 0.55,
    wetEnvBoost: 0.38,
    flashEnvBoost: 0.28,
    wetDarken: 0.12,
  },
  foliage: {
    dryRoughness: 0.8,
    wetRoughness: 0.43,
    baseEnvMapIntensity: 0.72,
    wetEnvBoost: 0.58,
    flashEnvBoost: 0.38,
    wetDarken: 0.09,
  },
  grass: {
    dryRoughness: 0.84,
    wetRoughness: 0.47,
    baseEnvMapIntensity: 0.68,
    wetEnvBoost: 0.52,
    flashEnvBoost: 0.34,
    wetDarken: 0.08,
  },
  flower: {
    dryRoughness: 0.76,
    wetRoughness: 0.55,
    baseEnvMapIntensity: 0.62,
    wetEnvBoost: 0.3,
    flashEnvBoost: 0.28,
    wetDarken: 0.05,
  },
  rock: {
    dryRoughness: 0.86,
    wetRoughness: 0.42,
    baseEnvMapIntensity: 0.72,
    wetEnvBoost: 0.72,
    flashEnvBoost: 0.46,
    wetDarken: 0.16,
  },
  cloud: {
    dryRoughness: 0.98,
    wetRoughness: 0.92,
    baseEnvMapIntensity: 0.18,
    wetEnvBoost: 0,
    flashEnvBoost: 0.24,
    wetDarken: 0,
  },
};

interface BoundStandardMaterial {
  readonly family: keyof typeof SURFACE_PROFILES;
  readonly material: THREE.MeshStandardMaterial;
  readonly baseColor: THREE.Color;
  readonly baseEmissive: THREE.Color;
  readonly baseEmissiveIntensity: number;
  readonly originalRoughness: number;
  readonly originalMetalness: number;
  readonly originalEnvMapIntensity: number;
}

interface BoundPhysicalMaterial {
  readonly family: 'puddle' | 'waterGlass' | 'prismGlass' | 'opticalEdge';
  readonly material: THREE.MeshPhysicalMaterial;
  readonly baseRoughness: number;
  readonly baseEnvMapIntensity: number;
  readonly baseClearcoatRoughness: number;
  readonly baseEmissiveIntensity: number;
}

interface Replacement {
  readonly mesh: THREE.Mesh;
  readonly index: number | null;
  readonly original: THREE.Material;
  readonly replacement: THREE.Material;
}

function clamp01(value: number): number {
  return THREE.MathUtils.clamp(value, 0, 1);
}

function numberParameter(
  parameters: Readonly<Record<string, unknown>>,
  key: string,
  fallback: number,
): number {
  const value = parameters[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function classifyMaterial(name: string): SurfaceFamily | undefined {
  if (name.startsWith('PB1_Bark')) return 'bark';
  if (name.startsWith('PB1_Leaf') || name === 'PB1_Pine') return 'foliage';
  if (name.startsWith('PB1_Grass') || name === 'MF_VoxelSurface_Grass') return 'grass';
  if (name.startsWith('PB1_Flower')) return 'flower';
  if (name.startsWith('PB1_Rock')) return 'rock';
  if (name.startsWith('PB1_StormCloud') || name === 'PB1_CloudBreak') return 'cloud';
  if (name === 'PB2_PuddleWater' || name === 'PB1_WaterPlaceholder') return 'puddle';
  if (name === 'PB2_OpticalWaterGlass' || name === 'PB1_OpticalGlassPlaceholder') return 'waterGlass';
  if (name === 'PB2_OpticalPrismGlass') return 'prismGlass';
  if (name === 'PB2_OpticalEdge' || name === 'PB1_OpticalEdge') return 'opticalEdge';
  return undefined;
}

function copyCommonMaterialState(
  source: THREE.MeshStandardMaterial,
  target: THREE.MeshPhysicalMaterial,
): void {
  target.name = source.name;
  target.color.copy(source.color);
  target.map = source.map;
  target.normalMap = source.normalMap;
  target.normalScale.copy(source.normalScale);
  target.aoMap = source.aoMap;
  target.aoMapIntensity = source.aoMapIntensity;
  target.emissive.copy(source.emissive);
  target.emissiveMap = source.emissiveMap;
  target.emissiveIntensity = source.emissiveIntensity;
  target.alphaMap = source.alphaMap;
  target.side = source.side;
  target.alphaTest = source.alphaTest;
  target.dithering = true;
}

function physicalReplacement(
  source: THREE.MeshStandardMaterial,
  family: BoundPhysicalMaterial['family'],
): THREE.MeshPhysicalMaterial {
  const material = new THREE.MeshPhysicalMaterial();
  copyCommonMaterialState(source, material);

  if (family === 'puddle') {
    material.color.set('#B5DDEB');
    material.roughness = 0.11;
    material.metalness = 0;
    material.ior = 1.333;
    material.clearcoat = 1;
    material.clearcoatRoughness = 0.065;
    material.transmission = 0.08;
    material.thickness = 0.045;
    material.envMapIntensity = 1.55;
    material.transparent = true;
    material.opacity = 0.78;
    material.depthWrite = false;
  } else if (family === 'waterGlass') {
    material.color.set('#D6F2FA');
    material.roughness = 0.055;
    material.metalness = 0;
    material.ior = 1.333;
    // MindForge renders through EffectComposer. High screen-space transmission
    // can resolve against an incomplete intermediate buffer there and produce
    // large opaque-black rectangles in preview/export. Keep the physical
    // reflection/IOR response, but use deterministic alpha glass for optics.
    material.transmission = 0;
    material.thickness = 0.18;
    material.clearcoat = 0.42;
    material.clearcoatRoughness = 0.045;
    material.envMapIntensity = 1.35;
    material.emissive.set('#8FD9ED');
    material.emissiveIntensity = 0.014;
    material.transparent = true;
    material.opacity = 0.34;
    material.depthWrite = false;
  } else if (family === 'prismGlass') {
    material.color.set('#E0F4FA');
    material.roughness = 0.035;
    material.metalness = 0;
    material.ior = 1.5;
    material.transmission = 0;
    material.thickness = 0.2;
    material.clearcoat = 0.38;
    material.clearcoatRoughness = 0.035;
    material.envMapIntensity = 1.42;
    material.emissive.set('#C4EFF8');
    material.emissiveIntensity = 0.012;
    material.transparent = true;
    material.opacity = 0.38;
    material.depthWrite = false;
  } else {
    material.color.set('#83C5DD');
    material.roughness = 0.13;
    material.metalness = 0;
    material.ior = 1.36;
    material.transmission = 0;
    material.thickness = 0.08;
    material.clearcoat = 0.82;
    material.clearcoatRoughness = 0.06;
    material.envMapIntensity = 1.7;
    material.transparent = true;
    material.opacity = 0.68;
    material.depthWrite = false;
    material.emissive.set('#2B7895');
    material.emissiveIntensity = 0.035;
  }

  material.userData.mindforgeProductionSurface = family;
  material.needsUpdate = true;
  return material;
}

function replaceMaterial(
  mesh: THREE.Mesh,
  index: number | null,
  original: THREE.Material,
  replacement: THREE.Material,
): void {
  if (index === null) {
    mesh.material = replacement;
    return;
  }
  const materials = Array.isArray(mesh.material) ? [...mesh.material] : [mesh.material];
  materials[index] = replacement;
  mesh.material = materials;
}

function captureProductionMaterials(scene: THREE.Scene): {
  readonly standard: BoundStandardMaterial[];
  readonly physical: BoundPhysicalMaterial[];
  readonly replacements: Replacement[];
} {
  const standard: BoundStandardMaterial[] = [];
  const physical: BoundPhysicalMaterial[] = [];
  const replacements: Replacement[] = [];

  scene.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    materials.forEach((candidate, index) => {
      const family = classifyMaterial(candidate.name);
      if (!family) return;

      if (family === 'puddle' || family === 'waterGlass' || family === 'prismGlass' || family === 'opticalEdge') {
        if (!(candidate instanceof THREE.MeshStandardMaterial)) return;
        const replacement = physicalReplacement(candidate, family);
        replaceMaterial(mesh, Array.isArray(mesh.material) ? index : null, candidate, replacement);
        replacements.push({
          mesh,
          index: Array.isArray(mesh.material) ? index : null,
          original: candidate,
          replacement,
        });
        physical.push({
          family,
          material: replacement,
          baseRoughness: replacement.roughness,
          baseEnvMapIntensity: replacement.envMapIntensity,
          baseClearcoatRoughness: replacement.clearcoatRoughness,
          baseEmissiveIntensity: replacement.emissiveIntensity,
        });
        return;
      }

      if (!(candidate instanceof THREE.MeshStandardMaterial)) return;
      const profile = SURFACE_PROFILES[family];
      const originalRoughness = candidate.roughness;
      const originalMetalness = candidate.metalness;
      const originalEnvMapIntensity = candidate.envMapIntensity;
      candidate.roughness = profile.dryRoughness;
      candidate.metalness = 0;
      candidate.envMapIntensity = profile.baseEnvMapIntensity;
      candidate.userData.mindforgeProductionSurface = family;
      standard.push({
        family,
        material: candidate,
        baseColor: candidate.color.clone(),
        baseEmissive: candidate.emissive.clone(),
        baseEmissiveIntensity: candidate.emissiveIntensity,
        originalRoughness,
        originalMetalness,
        originalEnvMapIntensity,
      });
    });
  });

  return { standard, physical, replacements };
}

function restoreStandardMaterials(materials: readonly BoundStandardMaterial[]): void {
  for (const entry of materials) {
    entry.material.color.copy(entry.baseColor);
    entry.material.emissive.copy(entry.baseEmissive);
    entry.material.emissiveIntensity = entry.baseEmissiveIntensity;
    entry.material.roughness = entry.originalRoughness;
    entry.material.metalness = entry.originalMetalness;
    entry.material.envMapIntensity = entry.originalEnvMapIntensity;
    delete entry.material.userData.mindforgeProductionSurface;
  }
}

function restoreReplacements(replacements: readonly Replacement[]): void {
  for (let index = replacements.length - 1; index >= 0; index--) {
    const entry = replacements[index];
    if (entry.index === null) {
      if (entry.mesh.material === entry.replacement) entry.mesh.material = entry.original;
    } else if (Array.isArray(entry.mesh.material)) {
      const materials = [...entry.mesh.material];
      if (materials[entry.index] === entry.replacement) {
        materials[entry.index] = entry.original;
        entry.mesh.material = materials;
      }
    }
    entry.replacement.dispose();
  }
}

/**
 * Reusable PB2 material-response layer.
 *
 * `wetness` is a stable authored scene condition. PF4's frame-local
 * `wetReflection`, `environmentLight`, and `emissiveBoost` add transient world
 * response without any independent material clock.
 */
export const createVoxelProductionMaterialLayer: SceneCompositionLayerFactory = (
  ctx,
): SceneCompositionLayerInstance => {
  const root = new THREE.Group();
  root.name = `mindforge-production-materials:${ctx.id}`;
  const authoredWetness = clamp01(numberParameter(ctx.parameters, 'wetness', 0));
  const wetnessStrength = clamp01(numberParameter(ctx.parameters, 'wetnessStrength', 1));
  let captured: ReturnType<typeof captureProductionMaterials> | undefined;

  return {
    object3d: root,
    update(): void {
      captured ??= captureProductionMaterials(ctx.services.scene);
      const wetReflection = ctx.services.effectInfluences.get('wetReflection');
      const environmentLight = ctx.services.effectInfluences.get('environmentLight');
      const emissiveBoost = ctx.services.effectInfluences.get('emissiveBoost');
      const wet = clamp01(authoredWetness * wetnessStrength + wetReflection * 0.28);

      for (const entry of captured.standard) {
        const profile = SURFACE_PROFILES[entry.family];
        entry.material.roughness = THREE.MathUtils.lerp(
          profile.dryRoughness,
          profile.wetRoughness,
          wet,
        );
        entry.material.envMapIntensity = profile.baseEnvMapIntensity
          + wet * profile.wetEnvBoost
          + wetReflection * profile.wetEnvBoost * 0.75
          + environmentLight * profile.flashEnvBoost;
        entry.material.color.copy(entry.baseColor).multiplyScalar(1 - wet * profile.wetDarken);
        entry.material.emissive.copy(entry.baseEmissive);
        entry.material.emissiveIntensity = entry.baseEmissiveIntensity + emissiveBoost * 0.025;
      }

      for (const entry of captured.physical) {
        const material = entry.material;
        if (entry.family === 'puddle') {
          material.roughness = THREE.MathUtils.lerp(entry.baseRoughness, 0.035, wet);
          material.clearcoatRoughness = THREE.MathUtils.lerp(entry.baseClearcoatRoughness, 0.025, wet);
          material.envMapIntensity = entry.baseEnvMapIntensity
            + wet * 0.75
            + wetReflection * 1.15
            + environmentLight * 0.42;
        } else {
          const opticalPulse = clamp01(environmentLight * 0.6 + emissiveBoost * 0.8);
          material.roughness = Math.max(0.018, entry.baseRoughness - wetReflection * 0.018);
          material.clearcoatRoughness = Math.max(
            0.018,
            entry.baseClearcoatRoughness - wetReflection * 0.02,
          );
          material.envMapIntensity = entry.baseEnvMapIntensity
            + environmentLight * 0.48
            + wetReflection * 0.34;
          material.emissiveIntensity = entry.baseEmissiveIntensity + opticalPulse * 0.09;
        }
      }
    },
    dispose(): void {
      if (captured) {
        restoreStandardMaterials(captured.standard);
        restoreReplacements(captured.replacements);
      }
      root.removeFromParent();
    },
  };
};

export const VOXEL_PB2_MATERIAL_LAYER_ID = 'layer.utility.productionMaterials' as const;
