import { BrowserAudioRuntime, DEFAULT_AUDIO_MIXER_VOLUMES } from '@mindforge/audio';
import { BrowserAssetRuntime, MindForgeEngine, type EngineFrameInfo, type LayerName, type ResolvedText } from '@mindforge/engine';
import { createLibraryForTheme, type MindForgeLibrary } from '@mindforge/library';
import { DEFAULT_THEME_ID, getTheme, listThemes, type MindForgeTheme } from '@mindforge/themes';
import {
  exportFilename,
  exportMindForgeVideo,
  resolveCreatorEncodingSettings,
  type ExportDiagnostics,
  type ExportPhase,
} from '@mindforge/video-export';
import { EPISODES, getEpisode } from '@content/catalog';
import { getProductionEpisode } from '@content/production-catalog';
import type { EpisodeProductionInfo } from '@content/production-types';
import { createEpisodeAuthoringSource, type EpisodeAuthoringDraft, type EpisodeAuthoringSource } from './authoring';
import {
  resolveStudioExportRange,
  type ResolvedStudioExportRange,
  type StudioCreatorExportOptions,
} from './creator-export';

export interface StudioState {
  episodeId?: string;
  themeId: string;
  time: number;
  duration: number;
  playing: boolean;
  speed: number;
  error?: string;
  activeTexts: ResolvedText[];
  audioMuted: boolean;
  masterVolume: number;
  voiceVolume: number;
  musicVolume: number;
  sfxVolume: number;
  ambienceVolume: number;
  exporting: boolean;
  exportProgress: number;
  exportPhase?: ExportPhase;
  exportReadyFilename?: string;
  exportReadyBytes?: number;
  exportResolvedFormat?: 'mp4' | 'webm';
  exportDiagnostics?: ExportDiagnostics;
}

export interface ThemeOption {
  readonly id: string;
  readonly label: string;
  readonly description: string;
}

export type LayerFlags = Record<LayerName, boolean>;
type Listener = (state: StudioState) => void;

interface PlaybackSnapshot {
  readonly time: number;
  readonly playing: boolean;
  readonly speed: number;
}

/**
 * Framework-agnostic bridge between React and the Engine. It owns one Engine
 * instance, exposes imperative controls, and pushes state snapshots to
 * subscribers each frame. It contains no animation behaviour of its own.
 */
export class StudioController {
  readonly episodes = EPISODES.map((e) => ({ id: e.id, title: e.title }));
  private readonly engine: MindForgeEngine;
  private readonly assetRuntime = new BrowserAssetRuntime();
  private library: MindForgeLibrary;
  private theme: MindForgeTheme;
  private readonly listeners = new Set<Listener>();
  private captions?: HTMLDivElement;
  private exportAbort?: AbortController;
  private lastExportBlob?: Blob;
  private state: StudioState = {
    themeId: DEFAULT_THEME_ID,
    time: 0,
    duration: 0,
    playing: false,
    speed: 1,
    activeTexts: [],
    audioMuted: false,
    masterVolume: DEFAULT_AUDIO_MIXER_VOLUMES.master,
    voiceVolume: DEFAULT_AUDIO_MIXER_VOLUMES.voice,
    musicVolume: DEFAULT_AUDIO_MIXER_VOLUMES.music,
    sfxVolume: DEFAULT_AUDIO_MIXER_VOLUMES.sfx,
    ambienceVolume: DEFAULT_AUDIO_MIXER_VOLUMES.ambience,
    exporting: false,
    exportProgress: 0,
  };

  constructor() {
    this.theme = getTheme(DEFAULT_THEME_ID);
    this.library = createLibraryForTheme(this.theme.id);
    this.engine = new MindForgeEngine({
      registries: this.library,
      assetRuntime: this.assetRuntime,
      postProcessing: this.theme.presentation.postProcessing,
      audioRuntime: new BrowserAudioRuntime(),
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

  getProduction(episodeId: string | undefined = this.state.episodeId): EpisodeProductionInfo | undefined {
    return episodeId ? getProductionEpisode(episodeId) : undefined;
  }

  getAuthoringSource(episodeId: string | undefined = this.state.episodeId): EpisodeAuthoringSource | undefined {
    if (!episodeId) return undefined;
    const entry = getEpisode(episodeId);
    const production = getProductionEpisode(episodeId);
    return entry && production ? createEpisodeAuthoringSource(entry.input, production) : undefined;
  }

  previewAuthoringText(draft: EpisodeAuthoringDraft): void {
    const episodeId = this.state.episodeId;
    const entry = episodeId ? getEpisode(episodeId) : undefined;
    if (!entry) return;
    const playback = this.capturePlayback();
    try {
      this.engine.loadEpisode({ ...entry.input, text: draft.textEntries.map((entry) => ({ ...entry })) });
      this.restorePlayback(playback);
      this.patch({ error: undefined });
    } catch (error) {
      this.patch({ error: `Authoring preview failed: ${(error as Error).message}` });
    }
  }

  restoreEpisodeSource(): void {
    const episodeId = this.state.episodeId;
    const entry = episodeId ? getEpisode(episodeId) : undefined;
    if (!entry) return;
    const playback = this.capturePlayback();
    try {
      this.engine.loadEpisode(entry.input);
      this.restorePlayback(playback);
      this.patch({ error: undefined });
    } catch (error) {
      this.patch({ error: `Could not restore episode source: ${(error as Error).message}` });
    }
  }

  async load(episodeId: string): Promise<void> {
    const entry = getEpisode(episodeId);
    if (!entry) {
      this.patch({ error: `Episode "${episodeId}" not found.` });
      return;
    }
    try {
      this.lastExportBlob = undefined;
      await this.engine.prepareAssets();
      this.engine.loadEpisode(entry.input);
      this.patch({
        episodeId,
        exportReadyFilename: undefined,
        exportReadyBytes: undefined,
        exportResolvedFormat: undefined,
        exportDiagnostics: undefined,
        error: undefined,
      });
      this.engine.play();
    } catch (error) {
      this.patch({ episodeId, error: (error as Error).message });
    }
  }

  /** Stable metadata for the real Studio theme selector. */
  get themes(): ThemeOption[] {
    return listThemes().map((id) => {
      const theme = getTheme(id);
      return { id: theme.id, label: theme.label, description: theme.description };
    });
  }

  /**
   * Rebuild the current episode under another visual theme while preserving the
   * editor session. Registries and renderer presentation change together; the
   * Engine still receives only generic factories/configuration and never sees a
   * theme id.
   */
  async setTheme(themeId: string): Promise<void> {
    if (themeId === this.state.themeId) return;

    const previousTheme = this.theme;
    const previousLibrary = this.library;
    const episodeId = this.state.episodeId;
    const entry = episodeId ? getEpisode(episodeId) : undefined;
    const playback = this.capturePlayback();

    try {
      const nextTheme = getTheme(themeId);
      const nextLibrary = createLibraryForTheme(nextTheme.id);

      // Update the DOM-facing presentation before loadEpisode emits onFrame so
      // captions from the rebuilt frame immediately use the selected theme.
      this.theme = nextTheme;
      this.library = nextLibrary;
      this.engine.reconfigure(nextLibrary, nextTheme.presentation.postProcessing);
      await this.engine.prepareAssets();

      if (entry) {
        this.engine.loadEpisode(entry.input);
        this.restorePlayback(playback);
      }

      this.patch({
        themeId: nextTheme.id,
        playing: playback.playing,
        speed: playback.speed,
        error: undefined,
      });
    } catch (error) {
      // Theme switching is transactional from the editor's perspective. If a
      // new theme cannot build the episode, restore the previous visual runtime
      // rather than leaving a half-switched or empty stage.
      this.theme = previousTheme;
      this.library = previousLibrary;
      this.engine.reconfigure(previousLibrary, previousTheme.presentation.postProcessing);
      if (entry) {
        try {
          this.engine.loadEpisode(entry.input);
          this.restorePlayback(playback);
        } catch {
          // Preserve the original switch error below. A rollback failure will
          // still be visible through the Engine's onError callback.
        }
      }
      this.patch({
        themeId: previousTheme.id,
        playing: playback.playing,
        speed: playback.speed,
        error: (error as Error).message,
      });
    }
  }

  play(): void {
    this.engine.unlockAudio();
    this.engine.play();
  }
  pause(): void {
    this.engine.pause();
  }
  restart(): void {
    this.engine.unlockAudio();
    this.engine.restart();
    this.engine.play();
  }
  seek(time: number): void {
    this.engine.seek(time);
  }
  setSpeed(speed: number): void {
    this.engine.setSpeed(speed);
  }
  setAudioMuted(muted: boolean): void {
    if (!muted) this.engine.unlockAudio();
    this.engine.setAudioMuted(muted);
    this.patch({ audioMuted: muted });
  }
  setMasterVolume(volume: number): void {
    this.engine.unlockAudio();
    this.engine.setAudioBusVolume('master', volume);
    this.patch({ masterVolume: this.engine.getAudioBusVolume('master') });
  }
  setVoiceVolume(volume: number): void {
    this.setMixerVolume('voice', volume, 'voiceVolume');
  }
  setMusicVolume(volume: number): void {
    this.setMixerVolume('music', volume, 'musicVolume');
  }
  setSfxVolume(volume: number): void {
    this.setMixerVolume('sfx', volume, 'sfxVolume');
  }
  setAmbienceVolume(volume: number): void {
    this.setMixerVolume('ambience', volume, 'ambienceVolume');
  }

  async exportCurrentEpisode(options: StudioCreatorExportOptions): Promise<void> {
    if (this.state.exporting || !this.state.episodeId) return;
    const entry = getEpisode(this.state.episodeId);
    if (!entry) return;

    let range: ResolvedStudioExportRange;
    try {
      range = resolveStudioExportRange(
        options,
        this.state.duration,
        this.getProduction(this.state.episodeId),
        this.state.time,
      );
    } catch (error) {
      this.patch({ error: `Export failed: ${(error as Error).message}` });
      return;
    }

    const exportTheme = getTheme(options.themeId);
    const exportLibrary = createLibraryForTheme(exportTheme.id);
    const encoding = resolveCreatorEncodingSettings(options);
    const playback = this.capturePlayback();
    const abort = new AbortController();
    this.exportAbort = abort;
    this.lastExportBlob = undefined;
    this.engine.pause();
    this.patch({
      exporting: true,
      exportProgress: 0,
      exportPhase: 'preparing',
      exportReadyFilename: undefined,
      exportReadyBytes: undefined,
      exportResolvedFormat: undefined,
      exportDiagnostics: undefined,
      error: undefined,
    });

    try {
      const result = await exportMindForgeVideo({
        episode: entry.input,
        registries: exportLibrary,
        theme: exportTheme,
        assetRuntime: this.assetRuntime,
        width: encoding.width,
        height: encoding.height,
        fps: encoding.fps,
        videoBitrate: encoding.videoBitrate,
        audioBitrate: encoding.audioBitrate,
        format: options.format,
        startTime: range.startTime,
        endTime: range.endTime,
        includeCaptions: options.captions,
        signal: abort.signal,
        audioVolumes: {
          master: this.engine.getAudioBusVolume('master'),
          voice: options.audio.voice ? this.engine.getAudioBusVolume('voice') : 0,
          music: options.audio.music ? this.engine.getAudioBusVolume('music') : 0,
          sfx: options.audio.sfx ? this.engine.getAudioBusVolume('sfx') : 0,
          ambience: options.audio.ambience ? this.engine.getAudioBusVolume('ambience') : 0,
        },
        onProgress: ({ ratio, phase }) => this.patch({ exportProgress: ratio, exportPhase: phase }),
      });
      const filename = exportFilename(entry.id, exportTheme.id, result.extension, range.filenameSuffix);
      this.lastExportBlob = result.blob;
      this.patch({
        exportProgress: 1,
        exportPhase: 'finalizing',
        exportReadyFilename: filename,
        exportReadyBytes: result.blob.size,
        exportResolvedFormat: result.container,
        exportDiagnostics: result.diagnostics,
      });
      if (options.autoDownload) downloadBlob(result.blob, filename);
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        this.patch({ exportProgress: 0, exportPhase: undefined });
      } else {
        this.patch({
          exportProgress: 0,
          exportPhase: undefined,
          error: `Export failed: ${(error as Error).message}`,
        });
      }
    } finally {
      this.exportAbort = undefined;
      this.patch({ exporting: false });
      this.restorePlayback(playback);
    }
  }

  downloadLastExport(): void {
    if (!this.lastExportBlob || !this.state.exportReadyFilename) return;
    downloadBlob(this.lastExportBlob, this.state.exportReadyFilename);
  }

  cancelExport(): void {
    if (this.state.exportPhase === 'finalizing') return;
    this.exportAbort?.abort();
  }
  setLayer(layer: LayerName, enabled: boolean): void {
    this.engine.setLayerEnabled(layer, enabled);
  }
  isLayer(layer: LayerName): boolean {
    return this.engine.isLayerEnabled(layer);
  }

  dispose(): void {
    this.exportAbort?.abort();
    this.engine.dispose();
    this.assetRuntime.dispose();
  }


  private setMixerVolume(
    bus: 'voice' | 'music' | 'sfx' | 'ambience',
    volume: number,
    stateKey: 'voiceVolume' | 'musicVolume' | 'sfxVolume' | 'ambienceVolume',
  ): void {
    this.engine.unlockAudio();
    this.engine.setAudioBusVolume(bus, volume);
    this.patch({ [stateKey]: this.engine.getAudioBusVolume(bus) } as Pick<StudioState, typeof stateKey>);
  }

  private capturePlayback(): PlaybackSnapshot {
    return {
      time: this.engine.time,
      playing: this.engine.playing,
      speed: this.engine.speed,
    };
  }

  private restorePlayback(snapshot: PlaybackSnapshot): void {
    this.engine.setSpeed(snapshot.speed);
    this.engine.seek(snapshot.time);
    if (snapshot.playing) this.engine.play();
    else this.engine.pause();
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

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
}
