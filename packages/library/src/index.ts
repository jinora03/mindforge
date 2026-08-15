/**
 * @mindforge/library — registration and lookup of every reusable capability:
 * assets, characters, motions, effects, cameras, and environments. Episodes
 * reference the stable ids registered here; they never import implementations.
 */
export { AssetRegistry } from './AssetRegistry';
export { CharacterRegistry } from './CharacterRegistry';
export { MotionRegistry } from './MotionRegistry';
export { EffectRegistry } from './EffectRegistry';
export { CameraRegistry } from './CameraRegistry';
export { EnvironmentRegistry } from './EnvironmentRegistry';
export { MindForgeLibrary } from './MindForgeLibrary';
export {
  registerDefaults,
  createDefaultLibrary,
  createLibraryForTheme,
  SHARED_ASSETS,
  DEFAULT_ASSETS,
} from './register-defaults';
