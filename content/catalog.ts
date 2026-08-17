type Json = Record<string, unknown>;
interface TextFile {
  entries: unknown[];
}

export interface EpisodeEntry {
  readonly id: string;
  readonly title: string;
  readonly artifactNumber?: number;
  /** Raw, unvalidated episode input (text merged in) for the Engine to load. */
  readonly input: Json;
}

const episodeModules = import.meta.glob('./episodes/*/episode.json', {
  eager: true,
  import: 'default',
}) as Record<string, Json>;

const textModules = import.meta.glob('./episodes/*/text.json', {
  eager: true,
  import: 'default',
}) as Record<string, TextFile>;

/** Merge the sidecar text file into the episode as its `text` list. */
function withText(episode: Json, text: TextFile): Json {
  return { ...episode, text: text.entries };
}

function sibling(path: string, filename: string): string {
  return path.replace(/episode\.json$/, filename);
}

function episodeFolder(path: string): string {
  return path.match(/\.\/episodes\/([^/]+)\/episode\.json$/)?.[1] ?? path;
}

/**
 * Runtime content catalogue. Episodes are discovered automatically from their
 * folder, so adding an episode never requires editing Studio/Player lists.
 * Production-only briefs/storyboards live in production-catalog.ts and are not
 * bundled into Player.
 */
export const EPISODES: readonly EpisodeEntry[] = Object.entries(episodeModules)
  .map(([episodePath, episode]) => {
    const text = textModules[sibling(episodePath, 'text.json')];
    if (!text) throw new Error(`Episode "${episodeFolder(episodePath)}" is missing text.json.`);

    const id = String(episode.id ?? '');
    const title = String(episode.title ?? id);
    const artifactNumber = typeof episode.artifactNumber === 'number' ? episode.artifactNumber : undefined;
    return {
      id,
      title,
      artifactNumber,
      input: withText(episode, text),
    } satisfies EpisodeEntry;
  })
  .sort((a, b) => (a.artifactNumber ?? Number.MAX_SAFE_INTEGER) - (b.artifactNumber ?? Number.MAX_SAFE_INTEGER)
    || a.id.localeCompare(b.id));

export function getEpisode(id: string): EpisodeEntry | undefined {
  return EPISODES.find((entry) => entry.id === id);
}
