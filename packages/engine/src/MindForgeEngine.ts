import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import type {
  AudioMixerBus,
  AudioSyncReason,
  CapabilityRegistries,
  EngineConfig,
  EngineFrameInfo,
  LayerName,
  PostProcessingConfig,
} from './EngineTypes';
import { PlaybackController } from './PlaybackController';
import { SceneRuntime, type SceneLayer } from './SceneRuntime';
import { isExternalModelAsset } from './RuntimeAssets';

/** MindForge renders natively in 9:16. */
export const ASPECT_WIDTH = 9;
export const ASPECT_HEIGHT = 16;

const DEFAULT_POST = {
  bloom: { strength: 0.85, radius: 0.4, threshold: 0.82 },
  vignette: { offset: 1.1, darkness: 1.05 },
};

const VignetteShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    offset: { value: 1.1 },
    darkness: { value: 1.0 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float offset;
    uniform float darkness;
    varying vec2 vUv;
    void main() {
      vec4 texel = texture2D(tDiffuse, vUv);
      vec2 uv = (vUv - 0.5) * offset;
      float vig = clamp(1.0 - dot(uv, uv) * darkness, 0.0, 1.0);
      gl_FragColor = vec4(texel.rgb * vig, texel.a);
    }
  `,
};

/**
 * MindForge Engine — the runtime. Owns the renderer, scene, camera, composer,
 * the authoritative clock, and the animation loop. It executes registered
 * capabilities against validated content and knows nothing about Heat,
 * Prediction, artifacts, or lore.
 */
export class MindForgeEngine {
  readonly renderer: THREE.WebGLRenderer;

  /** The renderer-free evaluation core. Owns the scene, camera, and evaluateAt. */
  private readonly runtime = new SceneRuntime();

  private config: EngineConfig;
  private readonly composer: EffectComposer;
  private readonly renderPass: RenderPass;
  private readonly bloomPass: UnrealBloomPass;
  private readonly vignettePass: ShaderPass;

  private playback = new PlaybackController(0);
  /** Exclusive lower bound of the next forward callback-crossing interval. */
  private callbackBoundary = -Infinity;

  private container?: HTMLElement;
  private resizeObserver?: ResizeObserver;
  private rafId = 0;
  private lastNow = 0;
  private running = false;
  private endedFired = false;
  private anchorsEnabled = false;
  private debugAnchors: THREE.Object3D[] = [];

  constructor(config: EngineConfig) {
    this.config = config;

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      preserveDrawingBuffer: config.preserveDrawingBuffer ?? false,
    });
    this.renderer.setClearColor(0x000000, 1);
    this.renderer.setPixelRatio(this.resolvePixelRatio());
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.renderPass = new RenderPass(this.runtime.scene, this.runtime.camera);
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(720, 1280),
      DEFAULT_POST.bloom.strength,
      DEFAULT_POST.bloom.radius,
      DEFAULT_POST.bloom.threshold,
    );
    this.vignettePass = new ShaderPass(VignetteShader);

    // Keep presentation passes in a stable composer chain. Theme/app code may
    // reconfigure their values at runtime without rebuilding the renderer.
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(this.renderPass);
    this.composer.addPass(this.bloomPass);
    this.composer.addPass(this.vignettePass);
    this.composer.addPass(new OutputPass());
    this.applyPostProcessing(config.postProcessing);
  }

  /** The scene owned by the runtime (public API preserved). */
  get scene(): THREE.Scene {
    return this.runtime.scene;
  }
  /** The camera owned by the runtime (public API preserved). */
  get camera(): THREE.PerspectiveCamera {
    return this.runtime.camera;
  }
  get registries(): CapabilityRegistries {
    return this.config.registries;
  }

  /**
   * Swap the active capability registries — i.e. change theme.
   *
   * The Engine stays theme-blind: it never learns what a theme *is*, only that
   * a different set of factories now backs the same semantic ids. The caller is
   * responsible for reloading the episode afterwards, because scene state must
   * be rebuilt from the new factories.
   */
  setRegistries(registries: CapabilityRegistries): void {
    this.config = { ...this.config, registries };
  }

  /**
   * Atomically replace the mutable visual runtime configuration. This remains
   * theme-blind: callers provide capability factories and plain renderer
   * presentation numbers, then reload the current episode from those factories.
   */
  reconfigure(
    registries: CapabilityRegistries,
    postProcessing?: PostProcessingConfig,
  ): void {
    this.config = { ...this.config, registries, postProcessing };
    this.applyPostProcessing(postProcessing);
  }
  get currentEpisodeId(): string | undefined {
    return this.runtime.currentEpisodeId;
  }
  get time(): number {
    return this.playback.time;
  }
  get duration(): number {
    return this.playback.duration;
  }
  get playing(): boolean {
    return this.playback.playing;
  }
  get speed(): number {
    return this.playback.speed;
  }

  /** Attach the canvas to a container and start the render loop. */
  mount(container: HTMLElement): void {
    this.container = container;
    container.appendChild(this.renderer.domElement);
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.resize();
    if (this.config.autoResize !== false && typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.resize());
      this.resizeObserver.observe(container);
    }
    this.start();
  }

  /** Validate + build an episode from raw JSON, replacing any current one. */
  loadEpisode(raw: unknown): void {
    try {
      const episodeId = this.runtime.load(raw, this.config.registries, this.config.assetRuntime);
      this.playback = new PlaybackController(this.runtime.duration);
      this.config.audioRuntime?.load(
        this.runtime.getAudioEvents(),
        this.config.registries.audio,
        this.runtime.duration,
      );
      this.syncAudio('load');
      this.endedFired = false;
      this.callbackBoundary = -Infinity;
      this.buildDebugAnchors();
      this.renderComposer();
      this.config.onFrame?.(this.getFrameInfo());
      this.config.onLoaded?.(episodeId);
    } catch (error) {
      this.config.onError?.(error as Error);
      throw error;
    }
  }

  /**
   * Preload every authored model descriptor in the active registry. This is an
   * explicit async boundary so deterministic scene construction itself remains
   * synchronous and seek-safe. Procedural-only themes resolve immediately.
   */
  async prepareAssets(): Promise<void> {
    const descriptors = this.config.registries.assets
      .list()
      .map((id) => this.config.registries.assets.get(id));
    const externalModels = descriptors.filter(isExternalModelAsset);
    if (externalModels.length === 0) return;
    if (!this.config.assetRuntime) {
      throw new Error(
        `This MindForge configuration references ${externalModels.length} external model asset(s) but has no assetRuntime.`,
      );
    }
    await this.config.assetRuntime.preload(externalModels);
  }

  play(): void {
    this.playback.play();
    this.config.audioRuntime?.unlock();
    this.syncAudio('play');
    this.endedFired = false;
  }
  pause(): void {
    this.playback.pause();
    this.syncAudio('pause');
  }
  resume(): void {
    this.play();
  }
  restart(): void {
    this.playback.restart();
    this.syncAudio('restart');
    this.endedFired = false;
    this.evaluateAndRender(0);
  }
  seek(time: number): void {
    this.playback.seek(time);
    this.syncAudio('seek');
    this.endedFired = false;
    this.evaluateAndRender(this.playback.time);
  }
  setSpeed(speed: number): void {
    this.playback.setSpeed(speed);
    this.syncAudio('speed');
  }

  /** Resume/unlock browser audio from an explicit user gesture. */
  unlockAudio(): void {
    this.config.audioRuntime?.unlock();
    this.syncAudio('play');
  }

  setAudioMuted(muted: boolean): void {
    this.config.audioRuntime?.setMuted(muted);
  }
  isAudioMuted(): boolean {
    return this.config.audioRuntime?.isMuted() ?? false;
  }
  setAudioBusVolume(bus: AudioMixerBus, volume: number): void {
    this.config.audioRuntime?.setBusVolume(bus, volume);
  }
  getAudioBusVolume(bus: AudioMixerBus): number {
    return this.config.audioRuntime?.getBusVolume(bus) ?? 1;
  }

  setLayerEnabled(layer: LayerName, enabled: boolean): void {
    if (layer === 'anchors') {
      this.anchorsEnabled = enabled;
      for (const helper of this.debugAnchors) helper.visible = enabled;
      this.renderComposer();
      this.config.onFrame?.(this.getFrameInfo());
      return;
    }
    this.runtime.setLayerEnabled(layer as SceneLayer, enabled);
    this.evaluateAndRender(this.playback.time);
  }
  isLayerEnabled(layer: LayerName): boolean {
    return layer === 'anchors' ? this.anchorsEnabled : this.runtime.isLayerEnabled(layer as SceneLayer);
  }

  getFrameInfo(): EngineFrameInfo {
    return {
      time: this.playback.time,
      duration: this.playback.duration,
      normalizedTime: this.playback.normalizedTime,
      playing: this.playback.playing,
      speed: this.playback.speed,
      activeTexts: [...this.runtime.getActiveTexts()],
    };
  }

  /**
   * Set an exact render target size without requiring a mounted DOM container.
   * Offline video export uses pixelRatio=1 so 1080×1920 means exactly that many
   * encoded pixels. Normal mounted playback continues to use resize().
   */
  setRenderSize(width: number, height: number, pixelRatio = 1): void {
    const w = Math.max(1, Math.floor(width));
    const h = Math.max(1, Math.floor(height));
    this.renderer.setPixelRatio(Math.max(0.1, pixelRatio));
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w, h);
    this.bloomPass.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderComposer();
  }

  /**
   * Fill the mount container. The app is responsible for giving the container a
   * 9:16 shape (via CSS `aspect-ratio`); the Engine matches the camera aspect to
   * whatever it is handed so nothing is distorted.
   */
  resize(): void {
    if (!this.container) return;
    const bounds = this.container.getBoundingClientRect();
    const width = Math.max(1, Math.floor(bounds.width));
    const height = Math.max(1, Math.floor(bounds.height));
    this.renderer.setSize(width, height, false);
    this.composer.setSize(width, height);
    this.bloomPass.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    // State is unchanged by a resize; just re-present it.
    this.renderComposer();
  }

  dispose(): void {
    this.stop();
    this.resizeObserver?.disconnect();
    this.resizeObserver = undefined;
    this.runtime.dispose();
    this.config.audioRuntime?.dispose();
    this.debugAnchors = [];
    this.composer.dispose();
    this.bloomPass.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  /* ----------------------------------------------------------- internals -- */

  private start(): void {
    if (this.running) return;
    this.running = true;
    this.lastNow = now();
    const loop = (): void => {
      if (!this.running) return;
      this.rafId = requestAnimationFrame(loop);
      const t = now();
      const realDelta = Math.min((t - this.lastNow) / 1000, 0.1);
      this.lastNow = t;
      this.renderFrame(realDelta);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  private stop(): void {
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = 0;
  }

  private renderFrame(realDelta: number): void {
    const from = this.callbackBoundary;
    this.playback.advance(realDelta);
    const now = this.playback.time;
    try {
      // Deterministic scene state via the single shared evaluation path.
      this.runtime.evaluateAt(now);
      this.syncAudio('tick');
      // Live side effects: fire callbacks crossed while moving forward only.
      if (now > from) {
        for (const cb of this.runtime.callbacksInInterval(from, now)) {
          this.config.onCallback?.(cb.name, cb.time);
        }
      }
      this.callbackBoundary = now;
      this.composer.render();
    } catch (error) {
      this.playback.pause();
      this.config.onError?.(error as Error);
      return;
    }

    this.config.onFrame?.(this.getFrameInfo());
    if (this.playback.hasEnded && !this.endedFired) {
      this.endedFired = true;
      this.config.onEnded?.();
    }
  }

  /**
   * Deterministically resolve scene state at `time` and re-present it, without
   * firing callbacks. Used by load / seek / restart / layer toggles — the
   * editor paths, which must never trigger playback side effects.
   */
  private evaluateAndRender(time: number): void {
    this.callbackBoundary = time;
    this.runtime.evaluateAt(time);
    this.renderComposer();
    this.config.onFrame?.(this.getFrameInfo());
  }

  private renderComposer(): void {
    try {
      this.composer.render();
    } catch (error) {
      this.config.onError?.(error as Error);
    }
  }

  private syncAudio(reason: AudioSyncReason): void {
    this.config.audioRuntime?.sync(
      {
        time: this.playback.time,
        duration: this.playback.duration,
        playing: this.playback.playing,
        speed: this.playback.speed,
      },
      reason,
    );
  }

  private applyPostProcessing(config?: PostProcessingConfig): void {
    const enabled = config?.enabled !== false;
    const bloom = config?.bloom ?? DEFAULT_POST.bloom;
    this.bloomPass.strength = bloom.strength;
    this.bloomPass.radius = bloom.radius;
    this.bloomPass.threshold = bloom.threshold;
    this.bloomPass.enabled = enabled;

    const vignette = config?.vignette === undefined ? DEFAULT_POST.vignette : config.vignette;
    this.vignettePass.enabled = enabled && vignette !== null;
    if (vignette) {
      this.vignettePass.uniforms.offset.value = vignette.offset;
      this.vignettePass.uniforms.darkness.value = vignette.darkness;
    }
  }

  private buildDebugAnchors(): void {
    this.debugAnchors = [];
    const geometry = new THREE.SphereGeometry(0.045, 8, 6);
    const material = new THREE.MeshBasicMaterial({ color: 0xff4fc8, wireframe: true });
    for (const entity of this.runtime.getEntities()) {
      for (const name of entity.anchorNames()) {
        const anchor = entity.getAnchor(name);
        if (!anchor) continue;
        const helper = new THREE.Mesh(geometry, material);
        helper.visible = this.anchorsEnabled;
        helper.name = `anchor:${entity.id}.${name}`;
        anchor.add(helper);
        this.debugAnchors.push(helper);
      }
    }
  }

  private resolvePixelRatio(): number {
    const cap = this.config.pixelRatioCap ?? 2;
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio : 1;
    return Math.min(dpr, cap);
  }
}

/** Fit the largest 9:16 rectangle inside the given bounds. */
export function fit916(boundsWidth: number, boundsHeight: number): { width: number; height: number } {
  const targetRatio = ASPECT_WIDTH / ASPECT_HEIGHT;
  let width = boundsWidth;
  let height = width / targetRatio;
  if (height > boundsHeight) {
    height = boundsHeight;
    width = height * targetRatio;
  }
  return { width: Math.max(1, Math.floor(width)), height: Math.max(1, Math.floor(height)) };
}

function now(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}
