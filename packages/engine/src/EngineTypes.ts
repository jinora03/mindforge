import type * as THREE from 'three';
import type {
  AudioBus,
  AudioEvent,
  CameraEvent,
  EffectEvent,
  FaceState,
  MotionEvent,
  ObjectMotionEvent,
  TextPlacement,
  TextStyle,
} from '@mindforge/schema';
import type { PoseableRig } from './humanoid';

/**
 * The single authoritative frame snapshot. Every runtime system derives its
 * state from this — no component owns its own clock. `delta` is 0 on a seek so
 * that scrubbing is deterministic.
 */
export interface FrameContext {
  /** Absolute episode time in seconds. */
  readonly time: number;
  /** Seconds since the previous evaluated frame (0 when seeking). */
  readonly delta: number;
  /** Total episode duration in seconds. */
  readonly duration: number;
  /** `time / duration`, clamped to [0, 1]. */
  readonly normalizedTime: number;
}

export type Phase = 'before' | 'active' | 'after';

/**
 * A {@link FrameContext} narrowed to a single timeline event window. Components
 * that represent a windowed action (motions, effects, cameras) apply state
 * purely as a function of these values, which keeps playback reproducible.
 */
export interface ActionContext extends FrameContext {
  /** Event start time. */
  readonly at: number;
  /** Event duration (0 for instantaneous events). */
  readonly localDuration: number;
  /** `time - at`, clamped to [0, localDuration]. */
  readonly localTime: number;
  /** `time - at`, unclamped (may be negative or beyond the window). */
  readonly rawLocalTime: number;
  /** Eased progress in [0, 1]. Equals 1 for zero-duration events. */
  readonly progress: number;
  /** Whether `time` currently falls inside the event window. */
  readonly active: boolean;
  readonly phase: Phase;
}

/** Anything that must release GPU or scene resources. */
export interface Disposable {
  dispose(): void;
}

export type EntityKind = 'character' | 'prefab' | 'primitive' | 'group' | 'light';

/**
 * A generic scene participant. The Engine never knows what an entity *means*;
 * it only builds it, resets it each frame, resolves its anchors, and disposes
 * it. Characters implement the optional face / frame hooks.
 */
export interface Entity extends Disposable {
  readonly id: string;
  readonly kind: EntityKind;
  readonly object3d: THREE.Object3D;
  /** Present on characters: the additive posing surface motions write to. */
  readonly rig?: PoseableRig;
  /** Resolve a named world-space anchor (e.g. `head`, `handRight`). */
  getAnchor(name: string): THREE.Object3D | undefined;
  /** List anchor names this entity exposes (for debug overlays). */
  anchorNames(): string[];
  /** Set an expression state (characters only). */
  setFace?(state: FaceState, weight?: number): void;
  /** Read the currently-applied expression state (characters only). */
  getFace?(): FaceState | undefined;
  /** Called before the timeline is evaluated — reset to rest pose. */
  beginFrame?(ctx: FrameContext): void;
  /** Called after the timeline is evaluated — finalise pose / expression. */
  endFrame?(ctx: FrameContext): void;
}

/**
 * Services the Engine hands to factories so they can resolve targets and
 * anchors without importing the Engine's concrete classes.
 */
export interface SceneServices {
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  readonly duration: number;
  /** Resolve an entity by id or throw a clear error. */
  getEntity(id: string): Entity;
  tryGetEntity(id: string): Entity | undefined;
  /** Resolve `entityId.anchorName` (or just `entityId`) to a world object. */
  resolveAnchor(ref: string): THREE.Object3D;
  tryResolveAnchor(ref: string): THREE.Object3D | undefined;
}

/* ---------------------------------------------------------------- motions -- */

export interface MotionBuildContext {
  readonly target: Entity;
  readonly event: MotionEvent | ObjectMotionEvent;
  readonly services: SceneServices;
}

export interface MotionInstance {
  /** Apply pose / transform for the given window context (additive-friendly). */
  apply(ctx: ActionContext): void;
  /** Restore the target to its neutral state. */
  reset(): void;
  dispose?(): void;
}

export type MotionFactory = (ctx: MotionBuildContext) => MotionInstance;

/* ---------------------------------------------------------------- effects -- */

export interface EffectBuildContext {
  readonly event: EffectEvent;
  readonly services: SceneServices;
  /**
   * Deterministic per-event seed (derived from episode id + event id). Effects
   * that need randomness must draw from `createRng(seed)` rather than
   * `Math.random()` so playback stays reproducible (see `rng.ts`).
   */
  readonly seed: number;
}

export interface EffectInstance extends Disposable {
  /** Root object; the Engine adds this to the scene and toggles visibility. */
  readonly object3d: THREE.Object3D;
  /** Update visuals from the window context (uses ctx.progress / ctx.active). */
  update(ctx: ActionContext): void;
  /** Return to the pre-activation (hidden / empty) state for seek safety. */
  reset(): void;
}

export type EffectFactory = (ctx: EffectBuildContext) => EffectInstance;

/* ---------------------------------------------------------------- cameras -- */

export interface CameraState {
  readonly position: THREE.Vector3;
  readonly target: THREE.Vector3;
  fov: number;
}

export interface CameraBuildContext {
  readonly event: CameraEvent;
  readonly services: SceneServices;
}

export interface CameraShot {
  /** Write the desired camera state for this window into `out` (reused). */
  evaluate(ctx: ActionContext, out: CameraState): void;
  dispose?(): void;
}

export type CameraFactory = (ctx: CameraBuildContext) => CameraShot;

/* ----------------------------------------------------------- environments -- */

export interface EnvironmentBuildContext {
  readonly services: SceneServices;
  readonly parameters: Readonly<Record<string, unknown>>;
}

export interface EnvironmentInstance extends Disposable {
  readonly object3d: THREE.Object3D;
  /** Camera pose used when no camera events govern the current time. */
  readonly defaultCamera: CameraState;
  /** Optional soft ambient motion; must remain calm, never idle screensaver. */
  update(ctx: FrameContext): void;
}

export type EnvironmentFactory = (ctx: EnvironmentBuildContext) => EnvironmentInstance;

/* ------------------------------------------------------------- characters -- */

export interface CharacterBuildContext {
  readonly id: string;
  readonly parameters: Readonly<Record<string, unknown>>;
}

export type CharacterFactory = (ctx: CharacterBuildContext) => Entity;

/* ---------------------------------------------------------------- prefabs -- */

export interface PrefabBuildContext {
  readonly id: string;
  readonly parameters: Readonly<Record<string, unknown>>;
}

/**
 * Theme-owned visual assembly for a semantic scene object. Anchors are named
 * parts that episode choreography may target without knowing the mesh tree.
 */
export interface PrefabInstance {
  readonly object3d: THREE.Object3D;
  readonly anchors?: Readonly<Record<string, THREE.Object3D>>;
  dispose?(): void;
}

export type PrefabFactory = (ctx: PrefabBuildContext) => PrefabInstance;

/* ---------------------------------------------------------------- assets --- */

/**
 * Describes an asset by stable id. v0.1 content is procedural, so `url` is
 * usually absent; the descriptor exists so episodes reference ids and the
 * Renderer can later load real `.glb` / audio files.
 */
export interface AssetDescriptor {
  readonly id: string;
  readonly kind: 'model' | 'animation' | 'texture' | 'audio' | 'font';
  readonly url?: string;
  readonly procedural?: boolean;
  readonly description?: string;
}

/* ----------------------------------------------------------------- audio --- */

/** PCM returned by a deterministic procedural cue renderer. */
export interface AudioPcmData {
  readonly sampleRate: number;
  readonly channels: readonly Float32Array[];
}

export type AudioCueSource =
  | {
      readonly kind: 'procedural';
      /** Pure PCM generator. It must return the same samples for the same rate. */
      readonly render: (sampleRate: number) => AudioPcmData;
    }
  | {
      readonly kind: 'url';
      readonly url: string;
    };

/** Reusable semantic sound registered in the Library. */
export interface AudioCueDefinition {
  readonly id: string;
  readonly bus: AudioBus;
  /** Guaranteed fallback/source used when no production override is available. */
  readonly source: AudioCueSource;
  /** Optional production asset tried before `source`; failure falls back cleanly. */
  readonly preferredSource?: AudioCueSource;
  readonly defaultGain?: number;
  readonly loop?: boolean;
  /** Short source-level fades used by both live preview and offline export. */
  readonly fadeIn?: number;
  readonly fadeOut?: number;
  readonly description?: string;
}

export type AudioMixerBus = 'master' | AudioBus;
export type AudioSyncReason = 'load' | 'play' | 'pause' | 'seek' | 'restart' | 'speed' | 'tick';

export interface AudioTransportState {
  readonly time: number;
  readonly duration: number;
  readonly playing: boolean;
  readonly speed: number;
}

/**
 * Browser/live audio implementation injected into the Engine. The Engine owns
 * authoritative time; the runtime only mirrors that transport and never owns a
 * separate episode clock. A future offline renderer can implement the same
 * semantic cue contract without Web Audio.
 */
export interface AudioRuntime extends Disposable {
  load(
    events: readonly AudioEvent[],
    cues: ReadonlyRegistry<AudioCueDefinition>,
    duration: number,
  ): void;
  sync(state: AudioTransportState, reason: AudioSyncReason): void;
  unlock(): void;
  setMuted(muted: boolean): void;
  isMuted(): boolean;
  setBusVolume(bus: AudioMixerBus, volume: number): void;
  getBusVolume(bus: AudioMixerBus): number;
}

/* ------------------------------------------------------------- registries -- */

export interface ReadonlyRegistry<T> {
  has(id: string): boolean;
  /** Resolve an id or throw a clear missing-id error. */
  get(id: string): T;
  list(): string[];
}

/** The full set of capability registries the Engine executes against. */
export interface CapabilityRegistries {
  readonly characters: ReadonlyRegistry<CharacterFactory>;
  readonly prefabs: ReadonlyRegistry<PrefabFactory>;
  readonly motions: ReadonlyRegistry<MotionFactory>;
  readonly effects: ReadonlyRegistry<EffectFactory>;
  readonly cameras: ReadonlyRegistry<CameraFactory>;
  readonly environments: ReadonlyRegistry<EnvironmentFactory>;
  readonly assets: ReadonlyRegistry<AssetDescriptor>;
  readonly audio: ReadonlyRegistry<AudioCueDefinition>;
}

/* ---------------------------------------------------------- engine surface -- */

export interface ResolvedText {
  readonly id: string;
  readonly content: string;
  readonly style: TextStyle;
  readonly placement: TextPlacement;
}

/** Applies an expression state to a character (used by the face track). */
export type FaceStateApplier = (state: FaceState) => void;

/** Toggleable render layers, primarily for the Studio inspector. */
export type LayerName = 'text' | 'camera' | 'effects' | 'anchors';

export interface EngineFrameInfo {
  readonly time: number;
  readonly duration: number;
  readonly normalizedTime: number;
  readonly playing: boolean;
  readonly speed: number;
  readonly activeTexts: readonly ResolvedText[];
}

export interface PostProcessingConfig {
  readonly enabled?: boolean;
  readonly bloom?: { strength: number; radius: number; threshold: number };
  readonly vignette?: { offset: number; darkness: number } | null;
}

export interface EngineConfig {
  readonly registries: CapabilityRegistries;
  /** Cap on `devicePixelRatio` to keep fill-rate stable. Defaults to 2. */
  readonly pixelRatioCap?: number;
  readonly postProcessing?: PostProcessingConfig;
  /** Optional live audio backend. Headless/runtime tests may omit it. */
  readonly audioRuntime?: AudioRuntime;
  /** Preserve the WebGL back buffer for exact canvas capture during offline export. */
  readonly preserveDrawingBuffer?: boolean;
  readonly autoResize?: boolean;
  onFrame?(info: EngineFrameInfo): void;
  onLoaded?(episodeId: string): void;
  onEnded?(): void;
  onError?(error: Error): void;
  /** Fired by `callback` timeline events (edge-triggered on forward playback). */
  onCallback?(name: string, time: number): void;
}
