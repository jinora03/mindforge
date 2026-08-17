import type { LayerName } from '@mindforge/engine';
import type { ThemeOption } from '../studio-controller';

const SPEEDS = [0.25, 0.5, 1, 1.5, 2];
const LAYERS: { key: LayerName; label: string }[] = [
  { key: 'text', label: 'Text' },
  { key: 'camera', label: 'Camera' },
  { key: 'effects', label: 'Effects' },
  { key: 'anchors', label: 'Anchors' },
];

export interface ToolbarProps {
  episodes: { id: string; title: string }[];
  episodeId?: string;
  themes: ThemeOption[];
  themeId: string;
  playing: boolean;
  speed: number;
  audioMuted: boolean;
  masterVolume: number;
  voiceVolume: number;
  musicVolume: number;
  sfxVolume: number;
  ambienceVolume: number;
  exporting: boolean;
  exportProgress: number;
  layers: Record<LayerName, boolean>;
  clean: boolean;
  onSelect: (id: string) => void;
  onSelectTheme: (id: string) => void;
  onPlayPause: () => void;
  onRestart: () => void;
  onSpeed: (speed: number) => void;
  onToggleAudio: () => void;
  onMasterVolume: (volume: number) => void;
  onVoiceVolume: (volume: number) => void;
  onMusicVolume: (volume: number) => void;
  onSfxVolume: (volume: number) => void;
  onAmbienceVolume: (volume: number) => void;
  onExport: () => void;
  onCancelExport: () => void;
  onToggleLayer: (layer: LayerName, enabled: boolean) => void;
  onToggleClean: () => void;
}

export function Toolbar(props: ToolbarProps): JSX.Element {
  const selectedTheme = props.themes.find((theme) => theme.id === props.themeId);

  return (
    <header className="toolbar">
      <select
        className="episode-select"
        value={props.episodeId ?? ''}
        onChange={(e) => props.onSelect(e.target.value)}
        disabled={props.exporting}
      >
        {props.episodes.map((episode) => (
          <option key={episode.id} value={episode.id}>
            {episode.title}
          </option>
        ))}
      </select>

      <label className="theme-control" title={selectedTheme?.description}>
        <span>Theme</span>
        <select
          className="theme-select"
          value={props.themeId}
          onChange={(e) => props.onSelectTheme(e.target.value)}
          disabled={props.exporting}
          aria-label="Visual theme"
        >
          {props.themes.map((theme) => (
            <option key={theme.id} value={theme.id}>
              {theme.label.replace('MindForge ', '')}
            </option>
          ))}
        </select>
      </label>

      <div className="transport">
        <button onClick={props.onPlayPause} disabled={props.exporting}>{props.playing ? '❚❚ Pause' : '► Play'}</button>
        <button onClick={props.onRestart} disabled={props.exporting}>⟲ Restart</button>
      </div>

      <label className="speed">
        Speed
        <select value={props.speed} disabled={props.exporting} onChange={(e) => props.onSpeed(Number(e.target.value))}>
          {SPEEDS.map((s) => (
            <option key={s} value={s}>
              {s}×
            </option>
          ))}
        </select>
      </label>

      <div className="audio-controls">
        <button
          className={props.audioMuted ? 'audio-btn muted' : 'audio-btn'}
          onClick={props.onToggleAudio}
          aria-pressed={props.audioMuted}
          title={props.audioMuted ? 'Enable audio' : 'Mute audio'}
        >
          {props.audioMuted ? '🔇' : '🔊'} Audio
        </button>
        <label className="audio-slider" title="Master volume">
          <span>Master</span>
          <input
            className="volume-slider"
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={props.masterVolume}
            onChange={(e) => props.onMasterVolume(Number(e.target.value))}
            aria-label="Master volume"
          />
        </label>
        <VolumeControl label="Voice" title="Narration volume" value={props.voiceVolume} onChange={props.onVoiceVolume} />
        <VolumeControl label="SFX" title="Sound-effects volume" value={props.sfxVolume} onChange={props.onSfxVolume} />
        <VolumeControl label="Amb" title="Ambience volume" value={props.ambienceVolume} onChange={props.onAmbienceVolume} />
        <VolumeControl label="Music" title="Music volume" value={props.musicVolume} onChange={props.onMusicVolume} />
      </div>

      <button
        className={props.exporting ? 'export-btn active' : 'export-btn'}
        onClick={props.exporting ? props.onCancelExport : props.onExport}
        title={props.exporting ? 'Cancel video export' : 'Export deterministic 1080×1920 H.264/AAC MP4'}
      >
        {props.exporting ? `Cancel ${Math.round(props.exportProgress * 100)}%` : 'Export MP4'}
      </button>

      <div className="layer-toggles">
        {LAYERS.map(({ key, label }) => (
          <label key={key} className="toggle">
            <input
              type="checkbox"
              checked={props.layers[key]}
              onChange={(e) => props.onToggleLayer(key, e.target.checked)}
            />
            {label}
          </label>
        ))}
      </div>

      <button className={props.clean ? 'clean-btn active' : 'clean-btn'} onClick={props.onToggleClean}>
        {props.clean ? 'Exit clean' : 'Clean preview'}
      </button>
    </header>
  );
}

function VolumeControl(props: { label: string; title: string; value: number; onChange: (value: number) => void }): JSX.Element {
  return (
    <label className="audio-slider" title={props.title}>
      <span>{props.label}</span>
      <input
        className="volume-slider"
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={props.value}
        onChange={(event) => props.onChange(Number(event.target.value))}
        aria-label={props.title}
      />
    </label>
  );
}
