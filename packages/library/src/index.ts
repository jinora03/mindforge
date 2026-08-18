/**
 * @mindforge/library — registration and lookup of every reusable capability:
 * assets, audio cues, characters, motions, effects, cameras, environments, and scene layers. Episodes
 * reference the stable ids registered here; they never import implementations.
 */
export { AssetRegistry } from './AssetRegistry';
export { AudioCueRegistry } from './AudioCueRegistry';
export { CharacterRegistry } from './CharacterRegistry';
export { PrefabRegistry } from './PrefabRegistry';
export { MotionRegistry } from './MotionRegistry';
export { EffectRegistry } from './EffectRegistry';
export { CameraRegistry } from './CameraRegistry';
export { EnvironmentRegistry } from './EnvironmentRegistry';
export { SceneLayerRegistry } from './SceneLayerRegistry';
export { MindForgeLibrary } from './MindForgeLibrary';
export {
  registerDefaults,
  createDefaultLibrary,
  createLibraryForTheme,
  SHARED_ASSETS,
  DEFAULT_ASSETS,
} from './register-defaults';
