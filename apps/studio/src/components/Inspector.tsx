import type { ResolvedText } from '@mindforge/engine';

export interface InspectorProps {
  episodeId?: string;
  error?: string;
  activeTexts: ResolvedText[];
  catalog: Record<string, string[]>;
}

export function Inspector(props: InspectorProps): JSX.Element {
  return (
    <aside className="inspector">
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
