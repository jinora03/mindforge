import { MindForgeEngine, type EngineFrameInfo } from '@mindforge/engine';
import { createLibraryForTheme } from '@mindforge/library';
import { DEFAULT_THEME_ID, getTheme, type MindForgeTheme } from '@mindforge/themes';
import { getEpisode } from '@content/catalog';

/**
 * MindForge Player — a clean host around a single Engine instance. It draws
 * the 9:16 stage, renders timeline captions in their safe zones, and wires the
 * minimal controls (click to restart, space to pause/resume). No editor logic.
 */
export class PlayerController {
  private readonly engine: MindForgeEngine;
  private readonly theme: MindForgeTheme;
  private readonly frame: HTMLDivElement;
  private readonly captions: HTMLDivElement;
  private readonly status: HTMLDivElement;

  constructor(stage: HTMLElement) {
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
      color: '#F3E9FF',
      fontFamily: "system-ui, sans-serif",
      textAlign: 'center',
      padding: '0 12%',
      background: 'rgba(8,3,18,0.6)',
    });
    stage.appendChild(this.frame);

    this.theme = getTheme(DEFAULT_THEME_ID);
    this.engine = new MindForgeEngine({
      registries: createLibraryForTheme(this.theme.id),
      postProcessing: this.theme.presentation.postProcessing,
      onFrame: (info) => this.renderCaptions(info),
      onError: (error) => this.showStatus(error.message),
    });
    this.engine.mount(this.frame);
    this.frame.appendChild(this.captions);
    this.frame.appendChild(this.status);

    this.frame.addEventListener('click', () => this.engine.restart());
    window.addEventListener('keydown', this.onKeyDown);
  }

  load(episodeId: string): void {
    const entry = getEpisode(episodeId);
    if (!entry) {
      this.showStatus(`Episode "${episodeId}" not found.`);
      return;
    }
    this.showStatus('Loading…');
    try {
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
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (event.code === 'Space') {
      event.preventDefault();
      if (this.engine.playing) this.engine.pause();
      else this.engine.resume();
    }
  };

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
        width: `${safeZones.centralWidth * 100}%`,
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
