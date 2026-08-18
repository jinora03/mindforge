export interface StoryboardTextRef {
  readonly id: string;
  readonly content?: string;
}

export interface StoryboardShot {
  readonly id: string;
  readonly t: readonly [number, number];
  readonly beat: string;
  readonly intent?: string;
  readonly envState?: string;
  readonly camera?: Record<string, unknown>;
  readonly performance?: Record<string, unknown>;
  readonly effects?: readonly Record<string, unknown>[];
  readonly text?: readonly StoryboardTextRef[];
  readonly notes?: string;
}

export interface EpisodeStoryboard {
  readonly episode: string;
  readonly title: string;
  readonly aspect: string;
  readonly durationSeconds: number;
  readonly shots: readonly StoryboardShot[];
  readonly [key: string]: unknown;
}

export interface EpisodeProductionInfo {
  readonly folder: string;
  readonly creativeBrief: string;
  readonly briefSummary: string;
  readonly storyboard: EpisodeStoryboard;
  readonly files: readonly string[];
}

/**
 * Pull the first useful prose paragraph out of a production brief for compact
 * Studio display. Prefer the authored "one idea" section when present.
 */
export function summarizeCreativeBrief(markdown: string): string {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const oneIdeaIndex = lines.findIndex((line) => /^##\s+\d*\.?\s*The one idea/i.test(line.trim()));
  const start = oneIdeaIndex >= 0 ? oneIdeaIndex + 1 : 0;

  for (let i = start; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith('#') || line.startsWith('|') || line.startsWith('```')) continue;
    const cleaned = line
      .replace(/^>\s?/, '')
      .replace(/^[-*]\s+/, '')
      .replace(/\*\*/g, '')
      .replace(/_/g, '')
      .trim();
    if (cleaned.length >= 24) return cleaned;
  }

  return 'Production brief available.';
}

export function activeStoryboardShot(
  storyboard: EpisodeStoryboard,
  time: number,
): StoryboardShot | undefined {
  return storyboard.shots.find((shot) => time >= shot.t[0] && time < shot.t[1])
    ?? (time === storyboard.durationSeconds ? storyboard.shots.at(-1) : undefined);
}
