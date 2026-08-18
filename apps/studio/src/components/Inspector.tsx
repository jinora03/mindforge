import type { EpisodeProductionInfo } from '@content/production-types';
import type { ResolvedText } from '@mindforge/engine';

export interface InspectorProps {
  episodeId?: string;
  error?: string;
  activeTexts: ResolvedText[];
  catalog: Record<string, string[]>;
  production?: EpisodeProductionInfo;
  time: number;
  onSeek: (time: number) => void;
}

export function Inspector(props: InspectorProps): JSX.Element {
  return (
    <aside className="inspector">
      <ProductionPanel production={props.production} time={props.time} onSeek={props.onSeek} />

      <section className={props.error ? 'panel error' : 'panel'}>
        <h3>Errors</h3>
        {props.error ? <pre className="error-text">{props.error}</pre> : <p className="muted">No errors.</p>}
      </section>

      <section className="panel">
        <h3>Active text</h3>
        {props.activeTexts.length ? (
          <ul className="text-list">
            {props.activeTexts.map((text) => (
              <li key={text.id}>
                <span className="tag">{text.style}</span> {text.content}
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">—</p>
        )}
      </section>

      <section className="panel registry">
        <h3>Registry</h3>
        {Object.entries(props.catalog).map(([group, ids]) => (
          <details key={group} open={group === 'motions' || group === 'effects'}>
            <summary>
              {group} <span className="count">{ids.length}</span>
            </summary>
            <ul>
              {ids.map((id) => (
                <li key={id}>
                  <code>{id}</code>
                </li>
              ))}
            </ul>
          </details>
        ))}
      </section>
    </aside>
  );
}

function ProductionPanel(props: {
  production?: EpisodeProductionInfo;
  time: number;
  onSeek: (time: number) => void;
}): JSX.Element {
  if (!props.production) {
    return (
      <section className="panel production-panel">
        <h3>Production</h3>
        <p className="muted">No production package loaded.</p>
      </section>
    );
  }

  const { production } = props;
  const activeId = production.storyboard.shots.find((shot) => props.time >= shot.t[0] && props.time < shot.t[1])?.id;

  return (
    <section className="panel production-panel">
      <div className="production-heading">
        <h3>Production</h3>
        <span className="production-ready">4/4 files</span>
      </div>
      <code className="production-path">content/episodes/{production.folder}/</code>
      <p className="brief-summary">{production.briefSummary}</p>

      <details className="brief-details">
        <summary>Creative brief</summary>
        <pre className="brief-preview">{production.creativeBrief}</pre>
      </details>

      <div className="shot-list-heading">
        <strong>Storyboard</strong>
        <span>{production.storyboard.shots.length} shots · {production.storyboard.durationSeconds}s</span>
      </div>
      <ol className="shot-list">
        {production.storyboard.shots.map((shot) => (
          <li key={shot.id}>
            <button
              type="button"
              className={shot.id === activeId ? 'shot-jump active' : 'shot-jump'}
              onClick={() => props.onSeek(shot.t[0])}
            >
              <span className="shot-time">{shot.t[0].toFixed(1)}–{shot.t[1].toFixed(1)}</span>
              <span className="shot-beat">{shot.beat}</span>
            </button>
            {shot.intent ? <p>{shot.intent}</p> : null}
          </li>
        ))}
      </ol>
    </section>
  );
}
