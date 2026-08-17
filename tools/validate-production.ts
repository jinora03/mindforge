/**
 * Validate the production-facing episode contract: creative brief, storyboard,
 * executable episode and text sidecar. This complements validate:episodes,
 * which owns schema/registry/runtime correctness.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { EpisodeStoryboard, StoryboardShot } from '../content/production-types';

const root = fileURLToPath(new URL('..', import.meta.url));
const episodesDir = join(root, 'content', 'episodes');
const REQUIRED_FILES = ['creative-brief.md', 'storyboard.json', 'episode.json', 'text.json'] as const;
const COVERAGE_EPSILON = 0.05;

let failures = 0;
console.log('MindForge · production workflow validation\n');

for (const folder of listDirs(episodesDir)) {
  const dir = join(episodesDir, folder);
  const missing = REQUIRED_FILES.filter((file) => !existsSync(join(dir, file)));
  if (missing.length) {
    fail(folder, `missing required production file(s): ${missing.join(', ')}`);
    continue;
  }

  try {
    const episode = readJson(join(dir, 'episode.json')) as Record<string, unknown>;
    const text = readJson(join(dir, 'text.json')) as { entries?: unknown[] };
    const storyboard = readJson(join(dir, 'storyboard.json')) as EpisodeStoryboard;
    const brief = readFileSync(join(dir, 'creative-brief.md'), 'utf8');
    validateBrief(folder, brief);
    validateStoryboard(folder, storyboard, episode, text);
    console.log(`  ✓ ${folder} (${storyboard.shots.length} shots · 4/4 production files)`);
  } catch (error) {
    fail(folder, (error as Error).message);
  }
}

console.log('');
if (failures) {
  console.error(`Production validation failed: ${failures} problem(s).`);
  process.exit(1);
}
console.log('All production episode folders satisfy the MindForge four-file workflow.');

function validateBrief(folder: string, brief: string): void {
  const normalized = brief.trim();
  if (normalized.length < 300) throw new Error('creative-brief.md is too short to function as production direction');
  for (const requirement of [
    { label: 'one idea', pattern: /^##\s+.*one idea/im },
    { label: 'unforgettable visual', pattern: /^##\s+.*unforgettable visual/im },
    { label: 'success criteria', pattern: /^##\s+.*success criteria/im },
  ]) {
    if (!requirement.pattern.test(normalized)) {
      throw new Error(`creative-brief.md is missing a "${requirement.label}" section`);
    }
  }
  if (!/^#\s+Creative Brief/im.test(normalized)) {
    throw new Error(`creative-brief.md in ${folder} must start with a Creative Brief heading`);
  }
}

function validateStoryboard(
  folder: string,
  storyboard: EpisodeStoryboard,
  episode: Record<string, unknown>,
  textFile: { entries?: unknown[] },
): void {
  if (!storyboard || typeof storyboard !== 'object') throw new Error('storyboard.json must be an object');
  const episodeId = String(episode.id ?? '');
  const title = String(episode.title ?? '');
  const duration = Number(episode.duration);

  if (storyboard.episode !== episodeId) {
    throw new Error(`storyboard episode "${storyboard.episode}" does not match episode.json id "${episodeId}"`);
  }
  if (storyboard.title !== title) {
    throw new Error(`storyboard title does not match episode.json title for ${folder}`);
  }
  if (storyboard.aspect !== '9:16') throw new Error('storyboard aspect must be "9:16"');
  if (!Number.isFinite(storyboard.durationSeconds) || Math.abs(storyboard.durationSeconds - duration) > 0.001) {
    throw new Error(`storyboard duration ${storyboard.durationSeconds} does not match episode duration ${duration}`);
  }
  if (!Array.isArray(storyboard.shots) || storyboard.shots.length === 0) {
    throw new Error('storyboard must contain at least one shot');
  }

  const textIds = new Set(
    (Array.isArray(textFile.entries) ? textFile.entries : [])
      .map((entry) => entry as Record<string, unknown>)
      .map((entry) => String(entry.id ?? ''))
      .filter(Boolean),
  );
  const timeline = Array.isArray(episode.timeline) ? episode.timeline as Record<string, unknown>[] : [];
  const scheduledTextIds = new Set(
    timeline
      .filter((event) => event.type === 'text' && typeof event.textId === 'string')
      .map((event) => String(event.textId)),
  );

  const shotIds = new Set<string>();
  const intervals: Array<[number, number]> = [];
  for (const shot of storyboard.shots) {
    validateShot(shot, duration, shotIds, intervals);
    for (const ref of shot.text ?? []) {
      if (!textIds.has(ref.id)) throw new Error(`storyboard shot "${shot.id}" references unknown text id "${ref.id}"`);
      if (!scheduledTextIds.has(ref.id)) {
        throw new Error(`storyboard shot "${shot.id}" references text "${ref.id}" that is never scheduled by the episode timeline`);
      }
    }
  }

  validateCoverage(intervals, duration);
}

function validateShot(
  shot: StoryboardShot,
  duration: number,
  ids: Set<string>,
  intervals: Array<[number, number]>,
): void {
  if (!shot.id || typeof shot.id !== 'string') throw new Error('every storyboard shot needs an id');
  if (ids.has(shot.id)) throw new Error(`duplicate storyboard shot id "${shot.id}"`);
  ids.add(shot.id);
  if (!shot.beat || typeof shot.beat !== 'string') throw new Error(`storyboard shot "${shot.id}" needs a beat`);
  if (!Array.isArray(shot.t) || shot.t.length !== 2) throw new Error(`storyboard shot "${shot.id}" needs t: [start, end]`);
  const [start, end] = shot.t;
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end <= start || end > duration + COVERAGE_EPSILON) {
    throw new Error(`storyboard shot "${shot.id}" has invalid range [${start}, ${end}] for ${duration}s episode`);
  }
  intervals.push([start, end]);
}

function validateCoverage(intervals: Array<[number, number]>, duration: number): void {
  const sorted = [...intervals].sort((a, b) => a[0] - b[0]);
  if (sorted[0][0] > COVERAGE_EPSILON) throw new Error(`storyboard leaves ${sorted[0][0].toFixed(2)}s uncovered at the start`);
  let coveredUntil = sorted[0][1];
  for (let i = 1; i < sorted.length; i++) {
    const [start, end] = sorted[i];
    if (start - coveredUntil > COVERAGE_EPSILON) {
      throw new Error(`storyboard has an uncovered gap from ${coveredUntil.toFixed(2)}s to ${start.toFixed(2)}s`);
    }
    coveredUntil = Math.max(coveredUntil, end);
  }
  if (duration - coveredUntil > COVERAGE_EPSILON) {
    throw new Error(`storyboard ends at ${coveredUntil.toFixed(2)}s but episode lasts ${duration.toFixed(2)}s`);
  }
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function listDirs(dir: string): string[] {
  return readdirSync(dir).filter((name) => statSync(join(dir, name)).isDirectory()).sort();
}

function fail(folder: string, message: string): void {
  failures++;
  console.error(`  ✗ ${folder}\n      ${message.replace(/\n/g, '\n      ')}`);
}
