import type { LayerName } from '@mindforge/engine';

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
  playing: boolean;
  speed: number;
  layers: Record<LayerName, boolean>;
  clean: boolean;
  onSelect: (id: string) => void;
  onPlayPause: () => void;
  onRestart: () => void;
  onSpeed: (speed: number) => void;
  onToggleLayer: (layer: LayerName, enabled: boolean) => void;
  onToggleClean: () => void;
}

export function Toolbar(props: ToolbarProps): JSX.Element {
  return (
    <header className="toolbar">
      <select
        className="episode-select"
        value={props.episodeId ?? ''}
        onChange={(e) => props.onSelect(e.target.value)}
      >
        {props.episodes.map((episode) => (
          <option key={episode.id} value={episode.id}>
            {episode.title}
          </option>
        ))}
      </select>

      <div className="transport">
        <button onClick={props.onPlayPause}>{props.playing ? '❚❚ Pause' : '► Play'}</button>
        <button onClick={props.onRestart}>⟲ Restart</button>
      </div>

      <label className="speed">
        Speed
        <select value={props.speed} onChange={(e) => props.onSpeed(Number(e.target.value))}>
          {SPEEDS.map((s) => (
            <option key={s} value={s}>
              {s}×
            </option>
          ))}
        </select>
      </label>

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
