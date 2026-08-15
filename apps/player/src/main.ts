import { PlayerController } from './player-controller';

const params = new URLSearchParams(window.location.search);
const episodeId = params.get('episode') ?? 'artifact-001-heat';

const stage = document.getElementById('stage');
if (!stage) {
  throw new Error('MindForge Player: #stage element not found');
}

const controller = new PlayerController(stage);
controller.load(episodeId);
