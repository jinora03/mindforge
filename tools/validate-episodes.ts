/**
 * Validate every episode and scene in `content/` against the schema and the
 * default Library. Reports unknown registry ids, duplicate ids, and bad
 * references with clear, located messages. Exit code is non-zero on failure so
 * this doubles as a CI gate (`pnpm validate:episodes`).
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDefaultLibrary } from '@mindforge/library';
import { loadEpisode, SceneRuntime } from '@mindforge/engine';
import { parseScene, parseTextFile } from '@mindforge/schema';

const root = fileURLToPath(new URL('..', import.meta.url));
const episodesDir = join(root, 'content', 'episodes');
const scenesDir = join(root, 'content', 'scenes');
const library = createDefaultLibrary();

let failures = 0;
const readJson = (path: string): unknown => JSON.parse(readFileSync(path, 'utf8'));

console.log('MindForge · episode validation\n');

for (const entry of listDirs(episodesDir)) {
  const episodePath = join(episodesDir, entry, 'episode.json');
  if (!existsSync(episodePath)) continue;
  try {
    const episode = readJson(episodePath) as Record<string, unknown>;
    const textPath = join(episodesDir, entry, 'text.json');
    if (existsSync(textPath)) {
      episode.text = parseTextFile(readJson(textPath)).entries;
    }
    const loaded = loadEpisode(episode, library);
    const runtime = new SceneRuntime();
    try {
      runtime.load(episode, library);
    } finally {
      runtime.dispose();
    }
    console.log(`  ✓ episode ${loaded.script.id} (${loaded.script.timeline.length} events)`);
  } catch (error) {
    failures++;
    console.error(`  ✗ episode ${entry}\n${indent((error as Error).message)}`);
  }
}

for (const file of existsSync(scenesDir) ? readdirSync(scenesDir) : []) {
  if (!file.endsWith('.json')) continue;
  try {
    const scene = parseScene(readJson(join(scenesDir, file)));
    if (!library.environments.has(scene.environment)) {
      throw new Error(`unknown environment "${scene.environment}"`);
    }
    console.log(`  ✓ scene ${scene.id}`);
  } catch (error) {
    failures++;
    console.error(`  ✗ scene ${file}\n${indent((error as Error).message)}`);
  }
}

console.log('');
if (failures > 0) {
  console.error(`Validation failed: ${failures} problem(s).`);
  process.exit(1);
}
console.log('All content is valid.');

function listDirs(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((name) => statSync(join(dir, name)).isDirectory());
}

function indent(text: string): string {
  return text
    .split('\n')
    .map((line) => `      ${line}`)
    .join('\n');
}
