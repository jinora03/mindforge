import { access, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { DEFAULT_AUDIO_CUES, NARRATION_AUDIO_CUES } from '@mindforge/audio';
import type { AudioCueDefinition, AudioCueSource } from '@mindforge/engine';

interface ProductionManifest {
  productionCueIds: string[];
}

const strictProduction = process.argv.includes('--production');
const manifestPath = join(process.cwd(), 'packages/audio/src/production-assets.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as ProductionManifest;
const cues = [...DEFAULT_AUDIO_CUES, ...NARRATION_AUDIO_CUES];
const byId = new Map(cues.map((cue) => [cue.id, cue]));
const errors: string[] = [];

for (const cue of NARRATION_AUDIO_CUES) {
  if (cue.source.kind !== 'url' || !(await exists(cue.source))) {
    errors.push(`${cue.id}: required narration asset is missing (${cue.source.kind === 'url' ? cue.source.url : 'not URL-backed'})`);
  }
}

for (const id of manifest.productionCueIds) {
  const cue = byId.get(id);
  if (!cue) {
    errors.push(`productionCueIds: unknown cue ${id}`);
    continue;
  }
  const source = productionSource(cue);
  if (!source || source.kind !== 'url' || !(await exists(source))) {
    errors.push(`${id}: marked production but its production asset is missing`);
  }
}

const production = new Set(manifest.productionCueIds);
if (strictProduction) {
  for (const cue of cues) {
    if (!production.has(cue.id)) errors.push(`${cue.id}: still using reference/fallback audio`);
  }
}

if (errors.length) {
  for (const error of errors) console.error(`✗ ${error}`);
  process.exitCode = 1;
} else {
  console.log('Audio assets are valid.');
}

const narrationCount = NARRATION_AUDIO_CUES.filter((cue) => production.has(cue.id)).length;
const sfxCount = DEFAULT_AUDIO_CUES.filter((cue) => cue.bus === 'sfx' && production.has(cue.id)).length;
const ambienceCount = DEFAULT_AUDIO_CUES.filter((cue) => cue.bus === 'ambience' && production.has(cue.id)).length;
console.log(`Narration: ${narrationCount}/${NARRATION_AUDIO_CUES.length} production clips`);
console.log(`SFX: ${sfxCount}/${DEFAULT_AUDIO_CUES.filter((cue) => cue.bus === 'sfx').length} production overrides`);
console.log(`Ambience: ${ambienceCount}/${DEFAULT_AUDIO_CUES.filter((cue) => cue.bus === 'ambience').length} production overrides`);
if (!strictProduction && narrationCount < NARRATION_AUDIO_CUES.length) {
  console.log('Note: bundled narration is reference audio. Replace it with high-quality TTS/human MP3s before final publishing.');
}

function productionSource(cue: AudioCueDefinition): AudioCueSource | undefined {
  if (cue.bus === 'voice') return cue.source;
  if (cue.preferredSource) return cue.preferredSource;
  const category = cue.bus === 'ambience' ? 'ambience' : 'sfx';
  const filename = productionFilename(cue.id);
  return { kind: 'url', url: `/assets/audio/${category}/${filename}.mp3` };
}

function productionFilename(id: string): string {
  return id.split('.').at(-1)?.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`) ?? id;
}

async function exists(source: AudioCueSource): Promise<boolean> {
  if (source.kind !== 'url') return true;
  const path = join(process.cwd(), 'public', source.url.replace(/^\/assets\//, 'assets/'));
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
