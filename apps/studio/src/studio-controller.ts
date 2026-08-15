import { MindForgeEngine, type EngineFrameInfo, type LayerName, type ResolvedText } from '@mindforge/engine';
import { createLibraryForTheme, type MindForgeLibrary } from '@mindforge/library';
import { DEFAULT_THEME_ID, getTheme, type MindForgeTheme } from '@mindforge/themes';
import { EPISODES, getEpisode } from '@content/catalog';

export interface StudioState {
  episodeId?: string;
  time: number;
  duration: number;
  playing: boolean;
  speed: number;
  error?: string;
  activeTexts: ResolvedText[];
}

export type LayerFlags = Record<LayerName, boolean>;
type Listener = (state: StudioState) => void;

/**
 * Framework-agnostic bridge between React and the Engine. It owns one Engine
 * instance, exposes imperative controls, and pushes state snapshots to
 * subscribers each frame. It contains no animation behaviour of its own.
 */
export class StudioController {
  readonly episodes = EPISODES.map((e) => ({ id: e.id, title: e.title }));
  private readonly engine: MindForgeEngine;
  private readonly library: MindForgeLibrary;
  private readonly theme: MindForgeTheme;
  private readonly listeners = new Set<Listener>();
  private captions?: HTMLDivElement;
  private state: StudioState = {
    time: 0,
    duration: 0,
    playing: false,
    speed: 1,
    activeTexts: [],
  };

  constructor() {
    this.theme = getTheme(DEFAULT_THEME_ID);
    this.library = createLibraryForTheme(this.theme.id);
    this.engine = new MindForgeEngine({
      registries: this.library,
      postProcessing: this.theme.presentation.postProcessing,
      onFrame: (info) => this.onFrame(info),
      onError: (error) => this.patch({ error: error.message }),
    });
  }

  mountPreview(frame: HTMLElement): void {
    this.captions = document.createElement('div');
    Object.assign(this.captions.style, {
      position: 'absolute',
      inset: '0',
      pointerEvents: 'none',
      lineHeight: '1.2',
    });
    this.engine.mount(frame);
    frame.appendChild(this.captions);
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  getCatalog(): Record<string, string[]> {
    return this.library.catalog();
  }

  load(episodeId: string): void {
    const entry = getEpisode(episodeId);
    if (!entry) {
      this.patch({ error: `Episode "${episodeId}" not found.` });
      return;
    }
    try {
      this.engine.loadEpisode(entry.input);
      this.patch({ episodeId, error: undefined });
      this.engine.play();
    } catch (error) {
      this.patch({ episodeId, error: (error as Error).message });
    }
  }

  play(): void {
    this.engine.play();
  }
  pause(): void {
    this.engine.pause();
  }
  restart(): void {
    this.engine.restart();
    this.engine.play();
  }
  seek(time: number): void {
    this.engine.seek(time);
  }
  setSpeed(speed: number): void {
    this.engine.setSpeed(speed);
  }
  setLayer(layer: LayerName, enabled: boolean): void {
    this.engine.setLayerEnabled(layer, enabled);
  }
  isLayer(layer: LayerName): boolean {
    return this.engine.isLayerEnabled(layer);
  }

  dispose(): void {
    this.engine.dispose();
  }

  private onFrame(info: EngineFrameInfo): void {
    this.renderCaptions(info.activeTexts);
    this.patch({
      time: info.time,
      duration: info.duration,
      playing: info.playing,
      speed: info.speed,
      activeTexts: [...info.activeTexts],
    });
  }

  private renderCaptions(texts: readonly ResolvedText[]): void {
    if (!this.captions) return;
    this.captions.replaceChildren();
    for (const text of texts) {
      const line = document.createElement('div');
      const { typography, safeZones } = this.theme.presentation;
      Object.assign(line.style, typography[text.style] as Record<string, string>);
      const y = safeZones.placementY[text.placement] * 100;
      Object.assign(line.style, {
        position: 'absolute',
        top: `${y}%`,
        left: '50%',
        width: `${safeZones.centralWidth * 100}%`,
        transform: 'translate(-50%, -50%)',
      });
      line.textContent = text.content;
      this.captions.appendChild(line);
    }
  }

  private patch(partial: Partial<StudioState>): void {
    this.state = { ...this.state, ...partial };
    for (const listener of this.listeners) listener(this.state);
  }
}
