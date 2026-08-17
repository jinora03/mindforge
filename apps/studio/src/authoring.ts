import type { EpisodeProductionInfo, EpisodeStoryboard, StoryboardShot } from '@content/production-types';

export type AuthoringJson = Record<string, unknown>;

export interface AuthoringTimelineEvent extends AuthoringJson {
  readonly id: string;
  readonly type: string;
  readonly at: number;
  readonly duration?: number;
}

export interface AuthoringTextEntry extends AuthoringJson {
  readonly id: string;
  readonly content: string;
  readonly style?: string;
  readonly placement?: string;
}

export interface EpisodeAuthoringSource {
  readonly episodeId: string;
  readonly folder: string;
  readonly episode: AuthoringJson;
  readonly storyboard: EpisodeStoryboard;
  readonly textEntries: readonly AuthoringTextEntry[];
  readonly timeline: readonly AuthoringTimelineEvent[];
}

export interface EpisodeAuthoringDraft {
  readonly storyboard: EpisodeStoryboard;
  readonly textEntries: readonly AuthoringTextEntry[];
}

export interface AuthoringIssue {
  readonly kind: 'error' | 'warning';
  readonly message: string;
  readonly shotId?: string;
}

export function createEpisodeAuthoringSource(
  episodeInput: AuthoringJson,
  production: EpisodeProductionInfo,
): EpisodeAuthoringSource {
  const textEntries = Array.isArray(episodeInput.text)
    ? episodeInput.text.filter(isTextEntry).map((entry) => ({ ...entry }))
    : [];
  const timeline = Array.isArray(episodeInput.timeline)
    ? episodeInput.timeline.filter(isTimelineEvent).map((event) => ({ ...event }))
    : [];

  return {
    episodeId: String(episodeInput.id ?? production.storyboard.episode),
    folder: production.folder,
    episode: structuredCloneJson(episodeInput),
    storyboard: cloneStoryboard(production.storyboard),
    textEntries,
    timeline,
  };
}

export function createAuthoringDraft(source: EpisodeAuthoringSource): EpisodeAuthoringDraft {
  return {
    storyboard: cloneStoryboard(source.storyboard),
    textEntries: source.textEntries.map((entry) => ({ ...entry })),
  };
}

export function updateDraftShot(
  draft: EpisodeAuthoringDraft,
  shotId: string,
  patch: Partial<Pick<StoryboardShot, 't' | 'beat' | 'intent' | 'notes'>>,
): EpisodeAuthoringDraft {
  return {
    ...draft,
    storyboard: {
      ...draft.storyboard,
      shots: draft.storyboard.shots.map((shot) => shot.id === shotId ? { ...shot, ...patch } : shot),
    },
  };
}

export function updateDraftText(
  draft: EpisodeAuthoringDraft,
  textId: string,
  content: string,
): EpisodeAuthoringDraft {
  return {
    ...draft,
    textEntries: draft.textEntries.map((entry) => entry.id === textId ? { ...entry, content } : entry),
  };
}

export function eventsForShot(
  timeline: readonly AuthoringTimelineEvent[],
  shot: StoryboardShot,
  episodeDuration: number,
): readonly AuthoringTimelineEvent[] {
  const [start, end] = shot.t;
  const isFinal = Math.abs(end - episodeDuration) < 1e-6;
  return timeline
    .filter((event) => event.at >= start && (event.at < end || (isFinal && event.at === end)))
    .sort((a, b) => a.at - b.at || a.id.localeCompare(b.id));
}

export function validateStoryboardDraft(storyboard: EpisodeStoryboard): readonly AuthoringIssue[] {
  const issues: AuthoringIssue[] = [];
  const tolerance = 1e-6;
  const shots = storyboard.shots;

  if (!shots.length) {
    return [{ kind: 'error', message: 'Storyboard must contain at least one shot.' }];
  }

  for (const shot of shots) {
    const [start, end] = shot.t;
    if (!Number.isFinite(start) || !Number.isFinite(end)) {
      issues.push({ kind: 'error', shotId: shot.id, message: `${shot.id}: shot times must be finite numbers.` });
      continue;
    }
    if (start < -tolerance || end > storyboard.durationSeconds + tolerance) {
      issues.push({ kind: 'error', shotId: shot.id, message: `${shot.id}: shot is outside the episode duration.` });
    }
    if (end - start <= tolerance) {
      issues.push({ kind: 'error', shotId: shot.id, message: `${shot.id}: end time must be after start time.` });
    }
  }

  if (Math.abs(shots[0].t[0]) > tolerance) {
    issues.push({ kind: 'error', shotId: shots[0].id, message: `Storyboard starts at ${shots[0].t[0].toFixed(2)}s instead of 0s.` });
  }

  for (let index = 1; index < shots.length; index++) {
    const previous = shots[index - 1];
    const current = shots[index];
    const delta = current.t[0] - previous.t[1];
    if (delta > tolerance) {
      issues.push({ kind: 'error', shotId: current.id, message: `Gap of ${delta.toFixed(2)}s before ${current.id}.` });
    } else if (delta < -tolerance) {
      issues.push({ kind: 'error', shotId: current.id, message: `Overlap of ${Math.abs(delta).toFixed(2)}s at ${current.id}.` });
    }
  }

  const finalEnd = shots.at(-1)!.t[1];
  if (Math.abs(finalEnd - storyboard.durationSeconds) > tolerance) {
    issues.push({
      kind: 'error',
      shotId: shots.at(-1)!.id,
      message: `Storyboard ends at ${finalEnd.toFixed(2)}s instead of ${storyboard.durationSeconds.toFixed(2)}s.`,
    });
  }

  return issues;
}

export function referencedTextIds(shot: StoryboardShot): readonly string[] {
  return [...new Set<string>((shot.text ?? []).map((entry) => entry.id))];
}

export function authoringEventLabel(event: AuthoringTimelineEvent): string {
  const value = (() => {
    switch (event.type) {
      case 'motion': return event.motion;
      case 'objectMotion': return event.motion;
      case 'effect': return event.effect;
      case 'camera': return event.preset;
      case 'audio': return event.cue;
      case 'text': return event.textId ?? event.content;
      case 'property': return `${String(event.target ?? '')}.${String(event.property ?? '')}`;
      case 'face': return event.state;
      case 'visibility': return event.target;
      case 'callback': return event.name;
      default: return undefined;
    }
  })();
  return typeof value === 'string' && value ? value : event.id;
}

export function serializeStoryboardDraft(draft: EpisodeAuthoringDraft): string {
  return `${JSON.stringify(draft.storyboard, null, 2)}\n`;
}

export function serializeTextDraft(draft: EpisodeAuthoringDraft): string {
  return `${JSON.stringify({ schemaVersion: '0.1', entries: draft.textEntries }, null, 2)}\n`;
}

export function serializeEpisodeSource(source: EpisodeAuthoringSource): string {
  const { text: _text, ...episode } = source.episode;
  return `${JSON.stringify(episode, null, 2)}\n`;
}

export function hasAuthoringChanges(source: EpisodeAuthoringSource, draft: EpisodeAuthoringDraft): boolean {
  return JSON.stringify(source.storyboard) !== JSON.stringify(draft.storyboard)
    || JSON.stringify(source.textEntries) !== JSON.stringify(draft.textEntries);
}

function isTextEntry(value: unknown): value is AuthoringTextEntry {
  return !!value && typeof value === 'object'
    && typeof (value as AuthoringJson).id === 'string'
    && typeof (value as AuthoringJson).content === 'string';
}

function isTimelineEvent(value: unknown): value is AuthoringTimelineEvent {
  return !!value && typeof value === 'object'
    && typeof (value as AuthoringJson).id === 'string'
    && typeof (value as AuthoringJson).type === 'string'
    && typeof (value as AuthoringJson).at === 'number';
}

function cloneStoryboard(storyboard: EpisodeStoryboard): EpisodeStoryboard {
  return structuredCloneJson(storyboard) as unknown as EpisodeStoryboard;
}

function structuredCloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
