import { DEFAULT_THEME_ID, listThemes } from '@mindforge/themes';
import { PlayerController } from './player-controller';

const params = new URLSearchParams(window.location.search);
const episodeId = params.get('episode') ?? 'artifact-001-heat';
const requestedThemeId = params.get('theme');
const themeId = requestedThemeId && listThemes().includes(requestedThemeId)
  ? requestedThemeId
  : DEFAULT_THEME_ID;

const stage = document.getElementById('stage');
if (!stage) {
  throw new Error('MindForge Player: #stage element not found');
}

const controller = new PlayerController(stage, themeId);
controller.load(episodeId);
