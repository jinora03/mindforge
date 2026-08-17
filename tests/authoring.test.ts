import { describe, expect, it } from 'vitest';
import { getEpisode } from '@content/catalog';
import { getProductionEpisode, PRODUCTION_EPISODES } from '@content/production-catalog';
import {
  createAuthoringDraft,
  createEpisodeAuthoringSource,
  eventsForShot,
  hasAuthoringChanges,
  serializeEpisodeSource,
  serializeStoryboardDraft,
  serializeTextDraft,
  updateDraftShot,
  updateDraftText,
  validateStoryboardDraft,
} from '../apps/studio/src/authoring';

function fixture() {
  const episode = getEpisode('artifact-005-lightning-thunder');
  const production = getProductionEpisode('artifact-005-lightning-thunder');
  if (!episode || !production) throw new Error('Artifact 005 authoring fixture missing.');
  const source = createEpisodeAuthoringSource(episode.input, production);
  return { source, draft: createAuthoringDraft(source) };
}

describe('MindForge authoring workflow', () => {
  it('builds a clean editable draft without mutating discovered source content', () => {
    const { source, draft } = fixture();
    expect(validateStoryboardDraft(draft.storyboard)).toEqual([]);
    expect(hasAuthoringChanges(source, draft)).toBe(false);

    const changed = updateDraftText(draft, 'hook', 'A different hook');
    expect(hasAuthoringChanges(source, changed)).toBe(true);
    expect(source.textEntries.find((entry) => entry.id === 'hook')?.content).toBe('Why do you see lightning before thunder?');
  });

  it('detects storyboard gaps and overlaps while shot boundaries are edited', () => {
    const { draft } = fixture();
    const overlap = updateDraftShot(draft, 's1-question', { t: [0, 3.4] });
    expect(validateStoryboardDraft(overlap.storyboard).some((issue) => issue.message.includes('Overlap'))).toBe(true);

    const gap = updateDraftShot(draft, 's1-question', { t: [0, 3.0] });
    expect(validateStoryboardDraft(gap.storyboard).some((issue) => issue.message.includes('Gap'))).toBe(true);
  });

  it('shows runtime events that start inside the selected storyboard shot', () => {
    const { source, draft } = fixture();
    const shot = draft.storyboard.shots.find((entry) => entry.id === 's2-same-event');
    expect(shot).toBeDefined();
    const ids = eventsForShot(source.timeline, shot!, draft.storyboard.durationSeconds).map((event) => event.id);
    expect(ids).toContain('light-flash');
    expect(ids).toContain('flash-sfx');
    expect(ids).not.toContain('sound-wave');
  });

  it('downloads the four-file contract without embedding text back into episode.json', () => {
    const { source, draft } = fixture();
    const changed = updateDraftText(draft, 'hook', 'Edited in Studio');
    expect(JSON.parse(serializeTextDraft(changed)).entries[0]).toHaveProperty('id');
    expect(serializeTextDraft(changed)).toContain('Edited in Studio');
    expect(JSON.parse(serializeStoryboardDraft(changed)).episode).toBe(source.episodeId);
    expect(JSON.parse(serializeEpisodeSource(source))).not.toHaveProperty('text');
  });

  it('keeps runtime and production discovery in parity as new episodes are added', () => {
    const productionIds = PRODUCTION_EPISODES.map((entry) => entry.storyboard.episode).sort();
    expect(productionIds).toContain('artifact-005-lightning-thunder');
  });
});
