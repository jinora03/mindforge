import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..', '..');

/** Load an episode + its text sidecar from disk and merge (as the apps do). */
export function loadEpisodeInput(id: string): Record<string, unknown> {
  const dir = join(repoRoot, 'content', 'episodes', id);
  const episode = JSON.parse(readFileSync(join(dir, 'episode.json'), 'utf8')) as Record<string, unknown>;
  const text = JSON.parse(readFileSync(join(dir, 'text.json'), 'utf8')) as { entries: unknown[] };
  return { ...episode, text: text.entries };
}

export const DEMO_EPISODES = ['artifact-001-heat', 'artifact-002-prediction'] as const;
