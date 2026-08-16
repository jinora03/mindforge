import heatEpisode from './episodes/artifact-001-heat/episode.json';
import heatText from './episodes/artifact-001-heat/text.json';
import predictionEpisode from './episodes/artifact-002-prediction/episode.json';
import predictionText from './episodes/artifact-002-prediction/text.json';
import skyBlueEpisode from './episodes/artifact-003-sky-blue/episode.json';
import skyBlueText from './episodes/artifact-003-sky-blue/text.json';
import coldBatteryEpisode from './episodes/artifact-004-cold-battery/episode.json';
import coldBatteryText from './episodes/artifact-004-cold-battery/text.json';

type Json = Record<string, unknown>;
interface TextFile {
  entries: unknown[];
}

export interface EpisodeEntry {
  readonly id: string;
  readonly title: string;
  /** Raw, unvalidated episode input (text merged in) for the Engine to load. */
  readonly input: Json;
}

/** Merge the sidecar text file into the episode as its `text` list. */
function withText(episode: Json, text: TextFile): Json {
  return { ...episode, text: text.entries };
}

/**
 * Single application-facing content catalogue. Studio and Player both consume
 * this list so adding an episode never requires updating two app-local files.
 */
export const EPISODES: readonly EpisodeEntry[] = [
  {
    id: heatEpisode.id,
    title: heatEpisode.title,
    input: withText(heatEpisode as Json, heatText as TextFile),
  },
  {
    id: predictionEpisode.id,
    title: predictionEpisode.title,
    input: withText(predictionEpisode as Json, predictionText as TextFile),
  },
  {
    id: skyBlueEpisode.id,
    title: skyBlueEpisode.title,
    input: withText(skyBlueEpisode as Json, skyBlueText as TextFile),
  },
  {
    id: coldBatteryEpisode.id,
    title: coldBatteryEpisode.title,
    input: withText(coldBatteryEpisode as Json, coldBatteryText as TextFile),
  },
];

export function getEpisode(id: string): EpisodeEntry | undefined {
  return EPISODES.find((entry) => entry.id === id);
}
