/**
 * Duplicate an existing four-file production episode as a new authoring starting point.
 * Runtime/registry code is never touched; the new folder is auto-discovered by Studio/Player.
 *
 * Example:
 * pnpm duplicate:episode -- --from artifact-005-lightning-thunder --id artifact-006-metal-cold --title "Why does metal feel colder than wood?"
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const args = parseArgs(process.argv.slice(2));
const from = required(args, 'from');
const id = required(args, 'id');
const title = required(args, 'title');

if (!/^artifact-\d{3}-[a-z0-9-]+$/.test(id)) throw new Error('--id must look like artifact-006-topic-name');

const sourceDir = join(root, 'content', 'episodes', from);
const targetDir = join(root, 'content', 'episodes', id);
if (!existsSync(sourceDir)) throw new Error(`Source episode does not exist: content/episodes/${from}`);
if (existsSync(targetDir)) throw new Error(`Target episode already exists: content/episodes/${id}`);

for (const file of ['creative-brief.md', 'storyboard.json', 'episode.json', 'text.json']) {
  if (!existsSync(join(sourceDir, file))) throw new Error(`Source episode is missing ${file}`);
}

const episode = readJson(join(sourceDir, 'episode.json'));
const storyboard = readJson(join(sourceDir, 'storyboard.json'));
const text = readJson(join(sourceDir, 'text.json'));
const artifactNumber = Number(id.match(/^artifact-(\d{3})-/)?.[1]);

const nextEpisode = {
  ...episode,
  id,
  title,
  ...(Number.isFinite(artifactNumber) ? { artifactNumber } : {}),
  metadata: {
    ...(asRecord(episode.metadata)),
    productionStatus: 'draft-from-template',
    templateSource: from,
  },
};

const nextStoryboard = {
  ...storyboard,
  episode: id,
  title,
};

const nextText = {
  ...text,
  entries: Array.isArray(text.entries)
    ? text.entries.map((entry) => {
        const record = asRecord(entry);
        return record.id === 'hook' ? { ...record, content: title } : record;
      })
    : [],
};

let brief = readFileSync(join(sourceDir, 'creative-brief.md'), 'utf8');
brief = brief.replace(/^# Creative Brief.*$/m, `# Creative Brief — ${title}`);
brief = brief.replace(/^\*\*Public title:\*\*.*$/m, `**Public title:** _${title}_`);
brief = `${brief.trim()}\n\n> Duplicated from \`${from}\`. Replace template-specific creative direction before production.\n`;

mkdirSync(targetDir, { recursive: true });
writeJson(join(targetDir, 'episode.json'), nextEpisode);
writeJson(join(targetDir, 'storyboard.json'), nextStoryboard);
writeJson(join(targetDir, 'text.json'), nextText);
writeFileSync(join(targetDir, 'creative-brief.md'), brief);

console.log(`Duplicated ${from} -> ${id}`);
console.log(`  title: ${title}`);
console.log(`  content/episodes/${id}/`);
console.log('\nNext: replace template-specific content, then run pnpm validate:production && pnpm validate:episodes.');

function parseArgs(tokens: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const value = tokens[index + 1];
    if (!value || value.startsWith('--')) throw new Error(`Missing value for --${key}`);
    out[key] = value;
    index++;
  }
  return out;
}

function required(values: Record<string, string>, key: string): string {
  const value = values[key];
  if (!value) throw new Error(`Missing required --${key}`);
  return value;
}

function readJson(path: string): Record<string, unknown> {
  return JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function writeJson(path: string, value: unknown): void {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}
