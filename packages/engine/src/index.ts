/**
 * @mindforge/engine — the MindForge Engine runtime and its plugin contracts.
 *
 * The Engine owns time, rendering, the scene lifecycle, entity management, and
 * deterministic timeline evaluation. Library packages implement the exported
 * contracts (MotionFactory, EffectFactory, CameraFactory, EnvironmentFactory,
 * CharacterFactory, AudioRuntime, PoseableRig). The Engine imports no content and no Bible.
 */
export * from './EngineTypes';
export * from './humanoid';
// Re-export the schema types the plugin contracts reference, so library
// packages can depend on the Engine alone for the runtime surface.
export type {
  Vec3,
  Easing,
  FaceState,
  TextStyle,
  TextPlacement,
  TimelineEvent,
  MotionEvent,
  ObjectMotionEvent,
  EffectEvent,
  AudioBus,
  AudioEvent,
  CameraEvent,
  TextEvent,
  VisibilityEvent,
  PropertyEvent,
  FaceEvent,
  CallbackEvent,
  EntityDefinition,
  PrefabEntity,
  VisualTone,
  EpisodeScript,
} from '@mindforge/schema';
export * from './errors';
export * from './easing';
export { Registry } from './Registry';
export { PlaybackController } from './PlaybackController';
export { DisposalManager, disposeObject3D } from './DisposalManager';
export { EntityManager, splitRef } from './EntityManager';
export { SceneContext } from './SceneContext';
export {
  Timeline,
  makeActionContext,
  DEFAULT_DURATIONS,
  MotionAction,
  EffectAction,
  TextAction,
  CallbackAction,
  VisibilityTrack,
  FaceTrack,
  PropertyTrack,
  type TimelineLayers,
  type PropValue,
  type PropertyChannel,
} from './Timeline';
export { SceneManager, type BuiltScene } from './SceneManager';
export { loadEpisode, type LoadedEpisode } from './EpisodeLoader';
export {
  captureSnapshot,
  type SceneSnapshot,
  type SnapshotInput,
  type EntitySnapshot,
  type MaterialSnapshot,
} from './snapshot';
export { SceneRuntime, type SceneLayer } from './SceneRuntime';
export { createRng, hashSeed, type Rng } from './rng';
export {
  MindForgeEngine,
  fit916,
  ASPECT_WIDTH,
  ASPECT_HEIGHT,
} from './MindForgeEngine';
