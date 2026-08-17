import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, extname, join } from 'node:path';
import { DEFAULT_AUDIO_CUES, NARRATION_AUDIO_CUES } from '@mindforge/audio';
import type { AudioCueDefinition, AudioCueSource } from '@mindforge/engine';

interface ProductionManifest {
  productionCueIds: string[];
}

const args = process.argv.slice(2);
const cueId = valueAfter('--cue');
const sourceFile = valueAfter('--file');
if (!cueId || !sourceFile) {
  throw new Error('Usage: pnpm audio:replace -- --cue <semantic-cue-id> --file <production.mp3>');
}
if (extname(sourceFile).toLowerCase() !== '.mp3') {
  throw new Error('Production replacement currently requires an .mp3 file so the registered URL stays stable.');
}

const cues = [...DEFAULT_AUDIO_CUES, ...NARRATION_AUDIO_CUES];
const cue = cues.find((entry) => entry.id === cueId);
if (!cue) throw new Error(`Unknown audio cue "${cueId}".`);

const targetSource = productionTarget(cue);
if (!targetSource || targetSource.kind !== 'url') {
  throw new Error(`Audio cue "${cueId}" does not expose a production URL.`);
}

const target = join(process.cwd(), 'public', targetSource.url.replace(/^\/assets\//, 'assets/'));
await mkdir(dirname(target), { recursive: true });
await copyFile(sourceFile, target);

const manifestPath = join(process.cwd(), 'packages/audio/src/production-assets.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as ProductionManifest;
manifest.productionCueIds = [...new Set([...manifest.productionCueIds, cue.id])].sort();
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

console.log(`✓ ${cue.id}`);
console.log(`  ${sourceFile}`);
console.log(`  → ${targetSource.url}`);
console.log(`  marked production in packages/audio/src/production-assets.json`);

function valueAfter(name: string): string | undefined {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function productionTarget(cue: AudioCueDefinition): AudioCueSource | undefined {
  if (cue.bus === 'voice') return cue.source;
  if (cue.preferredSource) return cue.preferredSource;
  const category = cue.bus === 'ambience' ? 'ambience' : 'sfx';
  const filename = cue.id.split('.').at(-1)?.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
  return filename ? { kind: 'url', url: `/assets/audio/${category}/${filename}.mp3` } : undefined;
}
