/**
 * Scaffold a production episode using the four-file MindForge workflow.
 *
 * Example:
 * pnpm create:episode -- --id artifact-005-memory --title "Why do memories fade?"
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const args = parseArgs(process.argv.slice(2));
const id = required(args, 'id');
const title = required(args, 'title');
const duration = numberArg(args, 'duration', 15);
const environment = args.environment ?? 'environment.dreamGarden';

if (!/^artifact-\d{3}-[a-z0-9-]+$/.test(id)) {
  throw new Error('--id must look like artifact-005-topic-name');
}
if (duration <= 2) throw new Error('--duration must be greater than 2 seconds');

const dir = join(root, 'content', 'episodes', id);
if (existsSync(dir)) throw new Error(`Episode folder already exists: ${dir}`);
mkdirSync(dir, { recursive: true });

const answerAt = Math.max(3, duration - 3.4);
const split = Math.max(1, Math.min(duration - 1, duration * 0.55));
const artifactNumber = Number(id.match(/^artifact-(\d{3})-/)?.[1]);

writeJson(join(dir, 'episode.json'), {
  schemaVersion: '0.1',
  id,
  title,
  ...(Number.isFinite(artifactNumber) ? { artifactNumber } : {}),
  duration,
  environment,
  entities: [],
  timeline: [
    { id: 'hook', type: 'text', at: 0.4, duration: 2.6, textId: 'hook' },
    { id: 'answer', type: 'text', at: answerAt, duration: Math.min(3.2, duration - answerAt), textId: 'answer' },
  ],
  metadata: {
    concept: 'TODO: write the single causal idea this episode should teach.',
    productionStatus: 'draft',
  },
});

writeJson(join(dir, 'text.json'), {
  schemaVersion: '0.1',
  entries: [
    { id: 'hook', content: title, style: 'question', placement: 'upper' },
    { id: 'answer', content: 'TODO: write the concise answer.', style: 'explanation', placement: 'lower' },
  ],
});

writeJson(join(dir, 'storyboard.json'), {
  episode: id,
  title,
  aspect: '9:16',
  durationSeconds: duration,
  shots: [
    {
      id: 's1-hook',
      t: [0, split],
      beat: 'Hook / setup',
      intent: 'TODO: define what the viewer should understand visually before the reveal.',
      effects: [],
      text: [{ id: 'hook' }],
    },
    {
      id: 's2-answer',
      t: [split, duration],
      beat: 'Reveal / answer',
      intent: 'TODO: define the memorable transformation that proves the idea.',
      effects: [],
      text: [{ id: 'answer' }],
    },
  ],
});

writeFileSync(join(dir, 'creative-brief.md'), `# Creative Brief — ${title}\n\n**Public title:** _${title}_  \n**Duration:** ${duration}s (9:16)\n\n## 1. The one idea\n\nTODO: State the single causal idea in one or two sentences. The episode should explain this idea visually before the narration confirms it.\n\n## 2. The unforgettable visual\n\nTODO: Describe one transformation, comparison, contact, reveal, or spatial relationship that could carry the episode even with the captions hidden.\n\n## 3. Composition\n\n- TODO: Define subject occupancy and framing.\n- TODO: Define the screen direction / spatial rule.\n- TODO: Identify what must remain visible together.\n\n## 4. Performance / transformation\n\nTODO: Describe the major cause → effect beats. Prefer meaningful changes over decorative motion.\n\n## 5. Text strategy\n\nKeep narration minimal. The action explains first; text confirms.\n\n## 6. Success criteria\n\n- A first-time viewer can infer the core idea from the visual sequence.\n- The subject is readable on a phone.\n- One frame or transformation is memorable enough to function as a thumbnail.\n- The same semantic episode works under every production theme.\n`);

console.log(`Created ${id}`);
console.log(`  content/episodes/${id}/creative-brief.md`);
console.log(`  content/episodes/${id}/storyboard.json`);
console.log(`  content/episodes/${id}/episode.json`);
console.log(`  content/episodes/${id}/text.json`);
console.log('\nNext: replace the TODOs, then run pnpm validate:production && pnpm validate:episodes.');

function parseArgs(tokens: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const value = tokens[i + 1];
    if (!value || value.startsWith('--')) throw new Error(`Missing value for --${key}`);
    out[key] = value;
    i++;
  }
  return out;
}

function required(args: Record<string, string>, key: string): string {
  const value = args[key];
  if (!value) throw new Error(`Missing required --${key}`);
  return value;
}

function numberArg(args: Record<string, string>, key: string, fallback: number): number {
  if (!args[key]) return fallback;
  const value = Number(args[key]);
  if (!Number.isFinite(value)) throw new Error(`--${key} must be a number`);
  return value;
}

function writeJson(path: string, value: unknown): void {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}
