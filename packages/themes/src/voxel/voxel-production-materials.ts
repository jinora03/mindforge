import * as THREE from 'three';
import type {
  SceneCompositionLayerFactory,
  SceneCompositionLayerInstance,
} from '@mindforge/engine';

/**
 * Voxel production material compatibility layer.
 *
 * PB5A originally restyled authored assets by traversing the entire live scene
 * and replacing/mutating materials after the entities and scene layers had
 * already been attached. In the browser render pipeline that path proved
 * unsafe: enabling this utility layer could corrupt preview/export frames.
 *
 * Production Voxel assets now own their baseline materials at authoring time:
 * block geometry, embedded nearest-filtered pixel textures, safe alpha, and
 * restrained authored emissive accents. This layer intentionally performs no
 * scene-wide material mutation. The semantic layer ID remains registered so
 * existing episodes/composer output stay compatible.
 */
export const createVoxelProductionMaterialLayer: SceneCompositionLayerFactory = (
  ctx,
): SceneCompositionLayerInstance => {
  const root = new THREE.Group();
  root.name = `mindforge-production-materials:${ctx.id}`;
  root.userData.mindforgeProductionMaterialPolicy = 'authoring-owned';

  return {
    object3d: root,
    update(): void {},
    dispose(): void {
      root.removeFromParent();
    },
  };
};

export const VOXEL_PB2_MATERIAL_LAYER_ID = 'layer.utility.productionMaterials' as const;
