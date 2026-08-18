import { useEffect, useState } from 'react';
import type { StoryboardShot } from '@content/production-types';
import {
  authoringEventLabel,
  eventsForShot,
  hasAuthoringChanges,
  referencedTextIds,
  serializeEpisodeSource,
  serializeStoryboardDraft,
  serializeTextDraft,
  updateDraftShot,
  updateDraftText,
  validateStoryboardDraft,
  type EpisodeAuthoringDraft,
  type EpisodeAuthoringSource,
} from '../authoring';

export interface AuthoringPanelProps {
  readonly open: boolean;
  readonly source?: EpisodeAuthoringSource;
  readonly draft?: EpisodeAuthoringDraft;
  readonly time: number;
  readonly onDraftChange: (draft: EpisodeAuthoringDraft) => void;
  readonly onClose: () => void;
  readonly onSeek: (time: number) => void;
  readonly onPreviewText: (draft: EpisodeAuthoringDraft) => void;
  readonly onRestorePreview: () => void;
  readonly onResetDraft: () => void;
}

export function AuthoringPanel(props: AuthoringPanelProps): JSX.Element | null {
  const [selectedShotId, setSelectedShotId] = useState<string>();
  const [copiedEventId, setCopiedEventId] = useState<string>();

  const activeTimeShot = props.draft?.storyboard.shots.find((shot) => props.time >= shot.t[0] && props.time < shot.t[1]);

  useEffect(() => {
    if (!props.open || !props.draft) return;
    setSelectedShotId((current) => {
      if (current && props.draft!.storyboard.shots.some((shot) => shot.id === current)) return current;
      return activeTimeShot?.id ?? props.draft!.storyboard.shots[0]?.id;
    });
  }, [props.open, props.source?.episodeId, props.draft, activeTimeShot?.id]);

  if (!props.open) return null;

  if (!props.source || !props.draft) {
    return (
      <aside className="authoring-panel" aria-label="Episode authoring">
        <header className="authoring-header"><div><span>MindForge Studio</span><h2>Authoring</h2></div><button onClick={props.onClose}>×</button></header>
        <p className="authoring-empty">No production episode is loaded.</p>
      </aside>
    );
  }

  const selectedShot = props.draft.storyboard.shots.find((shot) => shot.id === selectedShotId)
    ?? props.draft.storyboard.shots[0];
  const issues = validateStoryboardDraft(props.draft.storyboard);
  const changed = hasAuthoringChanges(props.source, props.draft);
  const shotEvents = selectedShot ? eventsForShot(props.source.timeline, selectedShot, props.draft.storyboard.durationSeconds) : [];
  const textIds = selectedShot ? referencedTextIds(selectedShot) : [];
  const shotTexts = textIds
    .map((id) => props.draft!.textEntries.find((entry) => entry.id === id))
    .filter((entry): entry is NonNullable<typeof entry> => !!entry);

  const download = (filename: string, contents: string): void => {
    const url = URL.createObjectURL(new Blob([contents], { type: 'application/json;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const copyEvent = async (event: Record<string, unknown>): Promise<void> => {
    await navigator.clipboard.writeText(JSON.stringify(event, null, 2));
    setCopiedEventId(String(event.id));
    window.setTimeout(() => setCopiedEventId(undefined), 1200);
  };

  return (
    <>
      <button className="authoring-backdrop" aria-label="Close authoring" onClick={props.onClose} />
      <aside className="authoring-panel" aria-label="Episode authoring">
        <header className="authoring-header">
          <div><span>MindForge Studio</span><h2>Authoring</h2></div>
          <button type="button" onClick={props.onClose}>×</button>
        </header>

        <div className="authoring-status">
          <div><strong>{props.source.episodeId}</strong><code>content/episodes/{props.source.folder}/</code></div>
          <span className={issues.length ? 'authoring-badge warn' : 'authoring-badge'}>{issues.length ? `${issues.length} issue${issues.length === 1 ? '' : 's'}` : 'Valid draft'}</span>
        </div>

        <p className="authoring-note">
          Studio keeps this as a browser draft. Download the changed JSON and replace the files in the episode folder when ready; the Engine remains read-only.
        </p>

        <section className="authoring-section">
          <div className="authoring-section-heading"><h3>Shot</h3><span>{props.draft.storyboard.shots.length} total</span></div>
          <label className="authoring-field">
            <span>Selected shot</span>
            <select value={selectedShot?.id ?? ''} onChange={(event) => { setSelectedShotId(event.target.value); const shot = props.draft!.storyboard.shots.find((entry) => entry.id === event.target.value); if (shot) props.onSeek(shot.t[0]); }}>
              {props.draft.storyboard.shots.map((shot) => <option key={shot.id} value={shot.id}>{shot.id} · {shot.beat}</option>)}
            </select>
          </label>

          {selectedShot ? (
            <ShotEditor shot={selectedShot} onChange={(patch) => props.onDraftChange(updateDraftShot(props.draft!, selectedShot.id, patch))} />
          ) : null}

          {issues.length ? <ul className="authoring-issues">{issues.map((issue, index) => <li key={`${issue.shotId ?? 'story'}-${index}`}>{issue.message}</li>)}</ul> : <p className="authoring-ok">Shot boundaries cover the episode continuously.</p>}
        </section>

        <section className="authoring-section">
          <div className="authoring-section-heading"><h3>Text in shot</h3><span>{shotTexts.length}</span></div>
          {shotTexts.length ? shotTexts.map((entry) => (
            <label className="authoring-text" key={entry.id}>
              <span><code>{entry.id}</code><small>{entry.style ?? 'text'} · {entry.placement ?? 'default'}</small></span>
              <textarea value={entry.content} rows={3} onChange={(event) => props.onDraftChange(updateDraftText(props.draft!, entry.id, event.target.value))} />
            </label>
          )) : <p className="authoring-muted">No text references in this storyboard shot.</p>}
          <button className="authoring-secondary" type="button" onClick={() => props.onPreviewText(props.draft!)}>Preview text draft</button>
        </section>

        <section className="authoring-section">
          <div className="authoring-section-heading"><h3>Runtime events</h3><span>{shotEvents.length}</span></div>
          <div className="authoring-events">
            {shotEvents.map((event) => (
              <div className="authoring-event" key={event.id}>
                <button type="button" className="authoring-event-time" onClick={() => props.onSeek(event.at)}>{event.at.toFixed(2)}s</button>
                <div><strong>{event.type}</strong><code>{authoringEventLabel(event)}</code><small>{event.id}{event.duration !== undefined ? ` · ${event.duration.toFixed(2)}s` : ''}</small></div>
                <button type="button" className="authoring-copy" onClick={() => void copyEvent(event)}>{copiedEventId === event.id ? 'Copied' : 'Copy JSON'}</button>
              </div>
            ))}
          </div>
        </section>

        <section className="authoring-section authoring-delivery">
          <div className="authoring-section-heading"><h3>Files</h3><span>{changed ? 'Draft changed' : 'No changes'}</span></div>
          <div className="authoring-downloads">
            <button type="button" onClick={() => download('storyboard.json', serializeStoryboardDraft(props.draft!))}>Download storyboard.json</button>
            <button type="button" onClick={() => download('text.json', serializeTextDraft(props.draft!))}>Download text.json</button>
            <button type="button" onClick={() => download('episode.json', serializeEpisodeSource(props.source!))}>Download episode.json</button>
          </div>
          <button className="authoring-reset" type="button" disabled={!changed} onClick={() => { props.onResetDraft(); props.onRestorePreview(); }}>Reset authoring draft</button>
        </section>
      </aside>
    </>
  );
}

function ShotEditor(props: {
  shot: StoryboardShot;
  onChange: (patch: Partial<Pick<StoryboardShot, 't' | 'beat' | 'intent'>>) => void;
}): JSX.Element {
  const [start, end] = props.shot.t;
  return (
    <div className="authoring-shot-editor">
      <div className="authoring-grid two">
        <label className="authoring-field"><span>Start</span><input type="number" min={0} step={0.05} value={start} onChange={(event) => props.onChange({ t: [Number(event.target.value), end] })} /></label>
        <label className="authoring-field"><span>End</span><input type="number" min={0} step={0.05} value={end} onChange={(event) => props.onChange({ t: [start, Number(event.target.value)] })} /></label>
      </div>
      <label className="authoring-field"><span>Beat</span><input value={props.shot.beat} onChange={(event) => props.onChange({ beat: event.target.value })} /></label>
      <label className="authoring-field"><span>Intent</span><textarea rows={4} value={props.shot.intent ?? ''} onChange={(event) => props.onChange({ intent: event.target.value })} /></label>
    </div>
  );
}
