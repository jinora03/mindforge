/**
 * Validate every episode and scene in `content/` against the schema and every
 * registered production theme. Reports unknown registry ids, broken prefab
 * anchors, duplicate ids, and bad references with clear, located messages.
 * Exit code is non-zero on failure so this doubles as a CI gate
 * (`pnpm validate:episodes`).
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createLibraryForTheme } from '@mindforge/library';
import { loadEpisode, SceneRuntime } from '@mindforge/engine';
import { parseScene, parseTextFile } from '@mindforge/schema';
import { listThemes } from '@mindforge/themes';

const root = fileURLToPath(new URL('..', import.meta.url));
const episodesDir = join(root, 'content', 'episodes');
const scenesDir = join(root, 'content', 'scenes');
const themeIds = listThemes();

let failures = 0;
const readJson = (path: string): unknown => JSON.parse(readFileSync(path, 'utf8'));

console.log(`MindForge · episode validation (${themeIds.join(', ')})\n`);

for (const entry of listDirs(episodesDir)) {
  const episodePath = join(episodesDir, entry, 'episode.json');
  if (!existsSync(episodePath)) continue;

  const episode = readJson(episodePath) as Record<string, unknown>;
  const textPath = join(episodesDir, entry, 'text.json');
  if (existsSync(textPath)) {
    try {
      episode.text = parseTextFile(readJson(textPath)).entries;
    } catch (error) {
      failures++;
      console.error(`  ✗ episode ${entry} [text]\n${indent((error as Error).message)}`);
      continue;
    }
  }

  for (const themeId of themeIds) {
    try {
      const library = createLibraryForTheme(themeId);
      const loaded = loadEpisode(episode, library);
      const runtime = new SceneRuntime();
      try {
        // Construction catches theme-specific prefab/anchor problems that the
        // schema/registry pass alone cannot see.
        runtime.load(episode, library);
      } finally {
        runtime.dispose();
      }
      console.log(
        `  ✓ episode ${loaded.script.id} [${themeId}] (${loaded.script.timeline.length} events)`,
      );
    } catch (error) {
      failures++;
      console.error(`  ✗ episode ${entry} [${themeId}]\n${indent((error as Error).message)}`);
    }
  }
}

for (const file of existsSync(scenesDir) ? readdirSync(scenesDir) : []) {
  if (!file.endsWith('.json')) continue;

  let scene: ReturnType<typeof parseScene>;
  try {
    scene = parseScene(readJson(join(scenesDir, file)));
  } catch (error) {
    failures++;
    console.error(`  ✗ scene ${file} [schema]\n${indent((error as Error).message)}`);
    continue;
  }

  for (const themeId of themeIds) {
    try {
      const library = createLibraryForTheme(themeId);
      if (!library.environments.has(scene.environment)) {
        throw new Error(`unknown environment "${scene.environment}"`);
      }
      console.log(`  ✓ scene ${scene.id} [${themeId}]`);
    } catch (error) {
      failures++;
      console.error(`  ✗ scene ${file} [${themeId}]\n${indent((error as Error).message)}`);
    }
  }
}

console.log('');
if (failures > 0) {
  console.error(`Validation failed: ${failures} problem(s).`);
  process.exit(1);
}
console.log('All content is valid across every registered theme.');

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
