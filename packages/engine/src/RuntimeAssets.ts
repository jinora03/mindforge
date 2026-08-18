import type {
  AssetDescriptor,
  PrefabFactory,
  RuntimeAssetAccess,
  RuntimeModelAsset,
} from './EngineTypes';

/**
 * SceneServices always exposes an asset surface, even in renderer-free tests or
 * procedural-only projects. Attempting to instantiate an unloaded model gives
 * a focused error instead of an undefined-property crash inside a theme.
 */
export const unavailableRuntimeAssets: RuntimeAssetAccess = {
  has: () => false,
  instantiateModel(id: string): RuntimeModelAsset {
    throw new Error(
      `Runtime model asset "${id}" is unavailable. Preload the asset and provide an assetRuntime to MindForgeEngine.`,
    );
  },
};

/** True when a descriptor represents an authored model that needs preloading. */
export function isExternalModelAsset(
  descriptor: AssetDescriptor,
): descriptor is AssetDescriptor & { readonly kind: 'model'; readonly url: string } {
  return descriptor.kind === 'model' && typeof descriptor.url === 'string' && descriptor.url.length > 0;
}

/**
 * Convenience factory for semantic prefabs backed directly by a production
 * model descriptor. Theme code keeps the semantic prefab id; only the asset id
 * and authored node mapping live in the theme/asset catalogue.
 */
export function createModelPrefabFactory(assetId: string): PrefabFactory {
  return ({ services }) => {
    const instance = services.assets.instantiateModel(assetId);
    return {
      object3d: instance.object3d,
      anchors: instance.anchors,
    };
  };
}
