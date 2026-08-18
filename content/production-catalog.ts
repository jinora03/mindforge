import type { EpisodeProductionInfo, EpisodeStoryboard } from './production-types';
import { summarizeCreativeBrief } from './production-types';

const storyboardModules = import.meta.glob('./episodes/*/storyboard.json', {
  eager: true,
  import: 'default',
}) as Record<string, EpisodeStoryboard>;

const briefModules = import.meta.glob('./episodes/*/creative-brief.md', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>;

function sibling(path: string, filename: string): string {
  return path.replace(/storyboard\.json$/, filename);
}

function episodeFolder(path: string): string {
  return path.match(/\.\/episodes\/([^/]+)\/storyboard\.json$/)?.[1] ?? path;
}

/** Studio-only catalogue for non-runtime creative direction and shot review. */
export const PRODUCTION_EPISODES: readonly EpisodeProductionInfo[] = Object.entries(storyboardModules)
  .map(([storyboardPath, storyboard]) => {
    const creativeBrief = briefModules[sibling(storyboardPath, 'creative-brief.md')];
    if (creativeBrief === undefined) {
      throw new Error(`Production episode "${episodeFolder(storyboardPath)}" is missing creative-brief.md.`);
    }
    return {
      folder: episodeFolder(storyboardPath),
      creativeBrief,
      briefSummary: summarizeCreativeBrief(creativeBrief),
      storyboard,
      files: ['creative-brief.md', 'storyboard.json', 'episode.json', 'text.json'],
    } satisfies EpisodeProductionInfo;
  })
  .sort((a, b) => a.storyboard.episode.localeCompare(b.storyboard.episode));

export function getProductionEpisode(episodeId: string): EpisodeProductionInfo | undefined {
  return PRODUCTION_EPISODES.find((entry) => entry.storyboard.episode === episodeId);
}
