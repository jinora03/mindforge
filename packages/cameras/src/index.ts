/**
 * @mindforge/cameras — the Observer's curiosity as reusable shot grammar. Every
 * preset reveals information; none is a passive orbit. Selection and
 * application to the authoritative camera happen in the Engine; these presets
 * only describe how to frame a moment.
 */
import type { CameraFactory } from '@mindforge/engine';

export { CameraDirector, type CameraDirectorOptions } from './CameraDirector';
export * from './CameraTypes';
export { createEstablishShot } from './presets/establish';
export { createPushInShot } from './presets/push-in';
export { createPullBackShot } from './presets/pull-back';
export { createRevealShot } from './presets/reveal';
export { createReactionCloseupShot } from './presets/reaction-closeup';
export { createImpactShakeShot } from './presets/impact-shake';

import { createEstablishShot } from './presets/establish';
import { createPushInShot } from './presets/push-in';
import { createPullBackShot } from './presets/pull-back';
import { createRevealShot } from './presets/reveal';
import { createReactionCloseupShot } from './presets/reaction-closeup';
import { createImpactShakeShot } from './presets/impact-shake';

/** Camera factories keyed by stable registry id. */
export const CAMERA_FACTORIES: Record<string, CameraFactory> = {
  'camera.establish': createEstablishShot,
  'camera.pushIn': createPushInShot,
  'camera.pullBack': createPullBackShot,
  'camera.reveal': createRevealShot,
  'camera.reactionCloseup': createReactionCloseupShot,
  'camera.impactShake': createImpactShakeShot,
};
