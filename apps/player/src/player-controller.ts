import { BrowserAudioRuntime } from '@mindforge/audio';
import { BrowserAssetRuntime, MindForgeEngine, type EngineFrameInfo } from '@mindforge/engine';
import { createLibraryForTheme } from '@mindforge/library';
import { DEFAULT_THEME_ID, getTheme, listThemes, type MindForgeTheme } from '@mindforge/themes';
import { getEpisode } from '@content/catalog';

interface PlaybackSnapshot {
  readonly time: number;
  readonly playing: boolean;
  readonly speed: number;
}

/**
 * MindForge Player — a clean host around a single Engine instance. It draws
 * the 9:16 stage, renders timeline captions in their safe zones, and wires the
 * minimal controls (click to restart, space to pause/resume). No editor logic.
 */
export class PlayerController {
  private readonly engine: MindForgeEngine;
  private readonly assetRuntime = new BrowserAssetRuntime();
  private theme: MindForgeTheme;
  private currentEpisodeId?: string;
  private readonly frame: HTMLDivElement;
  private readonly captions: HTMLDivElement;
  private readonly status: HTMLDivElement;
  private readonly themeButton: HTMLButtonElement;
  private readonly audioButton: HTMLButtonElement;

  constructor(stage: HTMLElement, initialThemeId: string = DEFAULT_THEME_ID) {
    this.frame = el('div', {
      position: 'relative',
      height: '100%',
      aspectRatio: '9 / 16',
      maxWidth: '100%',
      lineHeight: '0',
      overflow: 'hidden',
    });
    this.captions = el('div', {
      position: 'absolute',
      inset: '0',
      pointerEvents: 'none',
      lineHeight: '1.2',
    });
    this.status = el('div', {
      position: 'absolute',
      inset: '0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#f7f7f4',
      fontFamily: 'system-ui, sans-serif',
      textAlign: 'center',
      padding: '0 12%',
      background: 'rgba(12,14,16,0.64)',
    });
    stage.appendChild(this.frame);

    this.theme = getTheme(initialThemeId);
    this.engine = new MindForgeEngine({
      registries: createLibraryForTheme(this.theme.id),
      assetRuntime: this.assetRuntime,
      postProcessing: this.theme.presentation.postProcessing,
      rendererPresentation: this.theme.presentation.renderer,
      audioRuntime: new BrowserAudioRuntime(),
      onFrame: (info) => this.renderCaptions(info),
      onError: (error) => this.showStatus(error.message),
    });
    this.engine.mount(this.frame);
    this.frame.appendChild(this.captions);
    this.frame.appendChild(this.status);

    this.themeButton = document.createElement('button');
    Object.assign(this.themeButton.style, {
      position: 'absolute',
      top: '10px',
      right: '10px',
      zIndex: '5',
      padding: '6px 12px',
      borderRadius: '999px',
      border: '1px solid rgba(255,255,255,0.35)',
      background: 'rgba(0,0,0,0.45)',
      color: '#fff',
      font: '600 12px system-ui, sans-serif',
      cursor: 'pointer',
    });
    this.updateThemeButton();
    this.themeButton.addEventListener('click', (event: MouseEvent) => {
      event.stopPropagation();
      void this.cycleTheme();
    });
    this.frame.appendChild(this.themeButton);

    this.audioButton = document.createElement('button');
    Object.assign(this.audioButton.style, {
      position: 'absolute',
      top: '10px',
      left: '10px',
      zIndex: '5',
      width: '34px',
      height: '30px',
      borderRadius: '999px',
      border: '1px solid rgba(255,255,255,0.35)',
      background: 'rgba(0,0,0,0.45)',
      color: '#fff',
      font: '600 14px system-ui, sans-serif',
      cursor: 'pointer',
    });
    this.updateAudioButton();
    this.audioButton.addEventListener('click', (event: MouseEvent) => {
      event.stopPropagation();
      this.toggleAudio();
    });
    this.frame.appendChild(this.audioButton);

    this.frame.addEventListener('click', () => {
      this.engine.unlockAudio();
      this.engine.restart();
    });
    window.addEventListener('keydown', this.onKeyDown);
  }

  /** Cycle to the next available visual theme while preserving playback state. */
  async cycleTheme(): Promise<void> {
    const themes = listThemes();
    const next = themes[(themes.indexOf(this.theme.id) + 1) % themes.length];
    await this.setTheme(next);
  }

  /**
   * Rebuild the current episode under `themeId` without changing the viewer's
   * timestamp, speed, or play/pause state. Renderer presentation is swapped in
   * the same transaction as capability registries.
   */
  async setTheme(themeId: string): Promise<void> {
    if (themeId === this.theme.id) return;

    const previousTheme = this.theme;
    const previousRegistries = this.engine.registries;
    const entry = this.currentEpisodeId ? getEpisode(this.currentEpisodeId) : undefined;
    const playback = this.capturePlayback();

    try {
      const nextTheme = getTheme(themeId);
      const nextLibrary = createLibraryForTheme(nextTheme.id);
      this.theme = nextTheme;
      this.engine.reconfigure(
        nextLibrary,
        nextTheme.presentation.postProcessing,
        nextTheme.presentation.renderer,
      );
      await this.engine.prepareAssets();

      if (entry) {
        this.engine.loadEpisode(entry.input);
        this.restorePlayback(playback);
      }

      this.updateThemeButton();
      this.hideStatus();
    } catch (error) {
      this.theme = previousTheme;
      this.engine.reconfigure(
        previousRegistries,
        previousTheme.presentation.postProcessing,
        previousTheme.presentation.renderer,
      );
      if (entry) {
        try {
          this.engine.loadEpisode(entry.input);
          this.restorePlayback(playback);
        } catch {
          // Keep the original switch error visible below.
        }
      }
      this.updateThemeButton();
      this.showStatus((error as Error).message);
    }
  }

  async load(episodeId: string): Promise<void> {
    const entry = getEpisode(episodeId);
    if (!entry) {
      this.showStatus(`Episode "${episodeId}" not found.`);
      return;
    }
    this.currentEpisodeId = episodeId;
    this.showStatus('Loading…');
    try {
      await this.engine.prepareAssets();
      this.engine.loadEpisode(entry.input);
      this.hideStatus();
      this.engine.play();
    } catch (error) {
      this.showStatus((error as Error).message);
    }
  }

  dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    this.engine.dispose();
    this.assetRuntime.dispose();
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (event.code === 'Space') {
      event.preventDefault();
      if (this.engine.playing) this.engine.pause();
      else this.engine.resume();
    }
    if (event.code === 'KeyT') {
      event.preventDefault();
      void this.cycleTheme();
    }
    if (event.code === 'KeyM') {
      event.preventDefault();
      this.toggleAudio();
    }
  };

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

  private updateThemeButton(): void {
    this.themeButton.textContent = this.theme.label.replace('MindForge ', '');
    this.themeButton.title = `${this.theme.description} — click or press T to switch theme`;
  }

  private toggleAudio(): void {
    this.engine.unlockAudio();
    this.engine.setAudioMuted(!this.engine.isAudioMuted());
    this.updateAudioButton();
  }

  private updateAudioButton(): void {
    const muted = this.engine.isAudioMuted();
    this.audioButton.textContent = muted ? '🔇' : '🔊';
    this.audioButton.title = muted ? 'Enable audio (M)' : 'Mute audio (M)';
    this.audioButton.setAttribute('aria-pressed', String(muted));
  }

  private renderCaptions(info: EngineFrameInfo): void {
    this.captions.replaceChildren();
    for (const text of info.activeTexts) {
      const line = document.createElement('div');
      const { typography, safeZones } = this.theme.presentation;
      Object.assign(line.style, typography[text.style] as Record<string, string>);
      const y = safeZones.placementY[text.placement] * 100;
      Object.assign(line.style, {
        position: 'absolute',
        top: `${y}%`,
        left: '50%',
        width: 'fit-content',
        maxWidth: `${safeZones.centralWidth * 100}%`,
        boxSizing: 'border-box',
        transform: 'translate(-50%, -50%)',
      });
      line.textContent = text.content;
      this.captions.appendChild(line);
    }
  }

  private showStatus(message: string): void {
    this.status.textContent = message;
    this.status.style.display = 'flex';
  }

  private hideStatus(): void {
    this.status.style.display = 'none';
  }
}

function el(tag: string, style: Record<string, string>): HTMLDivElement {
  const node = document.createElement(tag) as HTMLDivElement;
  Object.assign(node.style, style);
  return node;
}
