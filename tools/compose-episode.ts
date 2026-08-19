/**
 * Compile PF8 semantic composition JSON into executable MindForge episode JSON.
 *
 * Usage:
 *   pnpm compose:episode -- path/to/composition.json
 *   pnpm compose:episode -- path/to/composition.json --text path/to/text.json --out path/to/episode.json
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { composeEpisode } from '@mindforge/composer';
import { loadEpisode } from '@mindforge/engine';
import { createLibraryForTheme } from '@mindforge/library';
import { parseTextFile, type TextDefinition } from '@mindforge/schema';
import { listThemes } from '@mindforge/themes';

const args = process.argv.slice(2);
const input = args.find((arg) => !arg.startsWith('--'));
if (!input) {
  console.error('Usage: pnpm compose:episode -- <composition.json> [--text text.json] [--out episode.json]');
  process.exit(1);
}

function option(name: string): string | undefined {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

const textPath = option('--text');
const outPath = option('--out');
const raw = JSON.parse(readFileSync(resolve(input), 'utf8')) as unknown;
let text: readonly TextDefinition[] | undefined;
if (textPath) {
  text = parseTextFile(JSON.parse(readFileSync(resolve(textPath), 'utf8'))).entries;
}

const episode = composeEpisode(raw, { text });
for (const themeId of listThemes()) {
  loadEpisode(episode, createLibraryForTheme(themeId));
}

const output = `${JSON.stringify(episode, null, 2)}\n`;
if (outPath) {
  writeFileSync(resolve(outPath), output, 'utf8');
  console.log(`Composed ${episode.id} → ${outPath}`);
} else {
  process.stdout.write(output);
}
