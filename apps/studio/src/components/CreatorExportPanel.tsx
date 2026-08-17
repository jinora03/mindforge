import {
  CREATOR_EXPORT_PRESETS,
  resolveCreatorEncodingSettings,
  type CreatorExportFps,
  type CreatorExportLayout,
  type CreatorExportQuality,
  type CreatorExportResolution,
  type ExportPhase,
} from '@mindforge/video-export';
import { activeStoryboardShot, type EpisodeProductionInfo } from '@content/production-types';
import type { ThemeOption } from '../studio-controller';
import {
  applyCreatorPreset,
  type CreatorAudioSelection,
  type StudioCreatorExportOptions,
} from '../creator-export';

export interface CreatorExportPanelProps {
  readonly open: boolean;
  readonly options: StudioCreatorExportOptions;
  readonly themes: readonly ThemeOption[];
  readonly duration: number;
  readonly time: number;
  readonly production?: EpisodeProductionInfo;
  readonly exporting: boolean;
  readonly exportProgress: number;
  readonly exportPhase?: ExportPhase;
  readonly exportReadyFilename?: string;
  readonly exportReadyBytes?: number;
  readonly exportResolvedFormat?: 'mp4' | 'webm';
  readonly onOptionsChange: (options: StudioCreatorExportOptions) => void;
  readonly onClose: () => void;
  readonly onExport: () => void;
  readonly onCancel: () => void;
  readonly onDownload: () => void;
}

const LAYOUTS: readonly { value: CreatorExportLayout; label: string }[] = [
  { value: 'portrait', label: 'Portrait · 9:16' },
  { value: 'landscape', label: 'Landscape · 16:9' },
  { value: 'square', label: 'Square · 1:1' },
];
const RESOLUTIONS: readonly CreatorExportResolution[] = ['1080p', '720p'];
const FPS_VALUES: readonly CreatorExportFps[] = [60, 30];
const QUALITIES: readonly { value: CreatorExportQuality; label: string }[] = [
  { value: 'standard', label: 'Standard' },
  { value: 'high', label: 'High' },
  { value: 'maximum', label: 'Maximum' },
];

export function CreatorExportPanel(props: CreatorExportPanelProps): JSX.Element | null {
  if (!props.open) return null;
  const disabled = props.exporting;
  const settings = resolveCreatorEncodingSettings(props.options);
  const currentShot = props.production
    ? activeStoryboardShot(props.production.storyboard, props.time)
    : undefined;

  const update = (patch: Partial<StudioCreatorExportOptions>): void => {
    props.onOptionsChange({ ...props.options, ...patch });
  };
  const updateAudio = (patch: Partial<CreatorAudioSelection>): void => {
    update({ audio: { ...props.options.audio, ...patch } });
  };

  return (
    <aside className="creator-export-panel" aria-label="Creator export settings">
      <div className="creator-export-heading">
        <div>
          <span className="creator-kicker">Creator tools</span>
          <h2>Export</h2>
        </div>
        <button type="button" className="creator-close" onClick={props.onClose} disabled={disabled} aria-label="Close export panel">
          ×
        </button>
      </div>

      <div className="creator-output-summary">
        <strong>{settings.width} × {settings.height}</strong>
        <span>{settings.fps} FPS · {props.options.quality}</span>
        <span>{props.options.format === 'auto' ? 'Auto · MP4 → WebM' : props.options.format.toUpperCase()}</span>
      </div>

      <section className="creator-section">
        <h3>Output</h3>
        <Field label="Preset">
          <select
            value={props.options.presetId}
            disabled={disabled}
            onChange={(event) => {
              const value = event.target.value;
              if (value === 'custom') update({ presetId: 'custom' });
              else props.onOptionsChange(applyCreatorPreset(props.options, value as Exclude<StudioCreatorExportOptions['presetId'], 'custom'>));
            }}
          >
            {CREATOR_EXPORT_PRESETS.map((preset) => <option key={preset.id} value={preset.id}>{preset.label}</option>)}
            <option value="custom">Custom</option>
          </select>
        </Field>
        <div className="creator-grid two">
          <Field label="Layout">
            <select
              value={props.options.layout}
              disabled={disabled}
              onChange={(event) => update({ layout: event.target.value as CreatorExportLayout, presetId: 'custom' })}
            >
              {LAYOUTS.map((layout) => <option key={layout.value} value={layout.value}>{layout.label}</option>)}
            </select>
          </Field>
          <Field label="Resolution">
            <select
              value={props.options.resolution}
              disabled={disabled}
              onChange={(event) => update({ resolution: event.target.value as CreatorExportResolution, presetId: 'custom' })}
            >
              {RESOLUTIONS.map((resolution) => <option key={resolution}>{resolution}</option>)}
            </select>
          </Field>
        </div>
        <div className="creator-grid three">
          <Field label="FPS">
            <select
              value={props.options.fps}
              disabled={disabled}
              onChange={(event) => update({ fps: Number(event.target.value) as CreatorExportFps, presetId: 'custom' })}
            >
              {FPS_VALUES.map((fps) => <option key={fps} value={fps}>{fps}</option>)}
            </select>
          </Field>
          <Field label="Quality">
            <select
              value={props.options.quality}
              disabled={disabled}
              onChange={(event) => update({ quality: event.target.value as CreatorExportQuality })}
            >
              {QUALITIES.map((quality) => <option key={quality.value} value={quality.value}>{quality.label}</option>)}
            </select>
          </Field>
          <Field label="Format">
            <select
              value={props.options.format}
              disabled={disabled}
              onChange={(event) => update({ format: event.target.value as StudioCreatorExportOptions['format'] })}
            >
              <option value="auto">Auto</option>
              <option value="mp4">MP4</option>
              <option value="webm">WebM</option>
            </select>
          </Field>
        </div>
        <p className="creator-detail">Video ~{formatBitrate(settings.videoBitrate)} · Audio {Math.round(settings.audioBitrate / 1000)} kbps</p>
      </section>

      <section className="creator-section">
        <h3>Content</h3>
        <Field label="Theme">
          <select value={props.options.themeId} disabled={disabled} onChange={(event) => update({ themeId: event.target.value })}>
            {props.themes.map((theme) => <option key={theme.id} value={theme.id}>{theme.label.replace('MindForge ', '')}</option>)}
          </select>
        </Field>

        <div className="creator-radio-group" aria-label="Export range">
          <label><input type="radio" name="export-range" checked={props.options.rangeMode === 'full'} disabled={disabled} onChange={() => update({ rangeMode: 'full' })} />Full episode</label>
          <label title={currentShot ? `${currentShot.beat} · ${currentShot.t[0]}–${currentShot.t[1]}s` : 'No active storyboard shot'}>
            <input type="radio" name="export-range" checked={props.options.rangeMode === 'current-shot'} disabled={disabled || !currentShot} onChange={() => update({ rangeMode: 'current-shot' })} />
            Current shot
          </label>
          <label><input type="radio" name="export-range" checked={props.options.rangeMode === 'custom'} disabled={disabled} onChange={() => update({ rangeMode: 'custom' })} />Custom</label>
        </div>
        {currentShot && props.options.rangeMode === 'current-shot' ? (
          <p className="creator-range-note">{currentShot.beat} · {currentShot.t[0].toFixed(1)}–{currentShot.t[1].toFixed(1)}s</p>
        ) : null}
        {props.options.rangeMode === 'custom' ? (
          <div className="creator-grid two">
            <Field label="Start (s)">
              <input type="number" min={0} max={props.duration} step={0.1} value={props.options.customStart} disabled={disabled} onChange={(event) => update({ customStart: Number(event.target.value) })} />
            </Field>
            <Field label="End (s)">
              <input type="number" min={0} max={props.duration} step={0.1} value={props.options.customEnd} disabled={disabled} onChange={(event) => update({ customEnd: Number(event.target.value) })} />
            </Field>
          </div>
        ) : null}

        <label className="creator-check"><input type="checkbox" checked={props.options.captions} disabled={disabled} onChange={(event) => update({ captions: event.target.checked })} />Include captions</label>
      </section>

      <section className="creator-section">
        <h3>Audio</h3>
        <div className="creator-check-grid">
          <BusCheck label="Voice" checked={props.options.audio.voice} disabled={disabled} onChange={(value) => updateAudio({ voice: value })} />
          <BusCheck label="SFX" checked={props.options.audio.sfx} disabled={disabled} onChange={(value) => updateAudio({ sfx: value })} />
          <BusCheck label="Ambience" checked={props.options.audio.ambience} disabled={disabled} onChange={(value) => updateAudio({ ambience: value })} />
          <BusCheck label="Music" checked={props.options.audio.music} disabled={disabled} onChange={(value) => updateAudio({ music: value })} />
        </div>
        <p className="creator-detail">Enabled buses use the current Studio mixer levels.</p>
      </section>

      <section className="creator-section creator-delivery">
        <h3>Delivery</h3>
        <label className="creator-check"><input type="checkbox" checked={props.options.autoDownload} disabled={disabled} onChange={(event) => update({ autoDownload: event.target.checked })} />Download automatically when ready</label>

        {props.exporting ? (
          <div className="creator-progress" aria-live="polite">
            <div className="creator-progress-copy"><span>{phaseLabel(props.exportPhase)}</span><strong>{Math.round(props.exportProgress * 100)}%</strong></div>
            <div className="creator-progress-track"><span style={{ width: `${Math.max(0, Math.min(100, props.exportProgress * 100))}%` }} /></div>
            <button type="button" className="creator-danger" onClick={props.onCancel}>Cancel export</button>
          </div>
        ) : (
          <button type="button" className="creator-primary" onClick={props.onExport}>Export video</button>
        )}

        {props.exportReadyFilename && !props.exporting ? (
          <div className="creator-ready">
            <span>Ready · {props.exportResolvedFormat?.toUpperCase()} · {formatBytes(props.exportReadyBytes ?? 0)}</span>
            <code>{props.exportReadyFilename}</code>
            <button type="button" onClick={props.onDownload}>{props.options.autoDownload ? 'Download again' : 'Download file'}</button>
          </div>
        ) : null}
      </section>
    </aside>
  );
}

function Field(props: { readonly label: string; readonly children: JSX.Element }): JSX.Element {
  return <label className="creator-field"><span>{props.label}</span>{props.children}</label>;
}

function BusCheck(props: { readonly label: string; readonly checked: boolean; readonly disabled: boolean; readonly onChange: (value: boolean) => void }): JSX.Element {
  return <label className="creator-check"><input type="checkbox" checked={props.checked} disabled={props.disabled} onChange={(event) => props.onChange(event.target.checked)} />{props.label}</label>;
}

function phaseLabel(phase: ExportPhase | undefined): string {
  if (phase === 'audio') return 'Mixing audio';
  if (phase === 'frames') return 'Rendering frames';
  if (phase === 'finalizing') return 'Finalizing file';
  return 'Preparing export';
}

function formatBitrate(value: number): string {
  return value >= 1_000_000 ? `${(value / 1_000_000).toFixed(1)} Mbps` : `${Math.round(value / 1000)} kbps`;
}

function formatBytes(value: number): string {
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}
