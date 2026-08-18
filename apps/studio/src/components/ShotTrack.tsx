import type { EpisodeProductionInfo } from '@content/production-types';

export interface ShotTrackProps {
  readonly production?: EpisodeProductionInfo;
  readonly duration: number;
  readonly time: number;
  readonly disabled?: boolean;
  readonly onSeek: (time: number) => void;
}

export function ShotTrack(props: ShotTrackProps): JSX.Element | null {
  const shots = props.production?.storyboard.shots;
  if (!shots?.length || props.duration <= 0) return null;

  return (
    <div className="shot-track" aria-label="Storyboard shots">
      {shots.map((shot) => {
        const [start, end] = shot.t;
        const active = props.time >= start && (props.time < end || (end === props.duration && props.time === end));
        return (
          <button
            key={shot.id}
            type="button"
            className={active ? 'shot-segment active' : 'shot-segment'}
            style={{
              left: `${(start / props.duration) * 100}%`,
              width: `${((end - start) / props.duration) * 100}%`,
            }}
            onClick={() => props.onSeek(start)}
            disabled={props.disabled}
            title={`${shot.beat} · ${start.toFixed(1)}–${end.toFixed(1)}s`}
            aria-label={`Jump to ${shot.beat} at ${start.toFixed(1)} seconds`}
          >
            <span>{shot.beat}</span>
          </button>
        );
      })}
    </div>
  );
}
