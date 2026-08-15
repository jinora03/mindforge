/**
 * @mindforge/motions — reusable human and object motion vocabulary. Motions are
 * pure functions of authoritative time; humanoid motions pose a PoseableRig
 * additively, object motions own a single transform channel so they compose.
 */
import type { MotionFactory } from '@mindforge/engine';

export * from './MotionTypes';
export { MotionClip, type Keyframe } from './MotionClip';
export { MotionPlayer, bindHumanoidMotion } from './MotionPlayer';
export { applyPoseToRig, mirrorJointName } from './MotionBlender';

export { createIdleMotion } from './humanoid/idle';
export { createBreatheMotion } from './humanoid/breathe';
export { createWalkMotion } from './humanoid/walk';
export { createReachMotion } from './humanoid/reach';
export { createSelfTickleMotion } from './humanoid/self-tickle';
export { createSurprisedSquirmMotion } from './humanoid/surprised-squirm';

export { createSpinMotion } from './objects/spin';
export { createFloatMotion } from './objects/float';
export { createPulseMotion } from './objects/pulse';
export { createSplitMotion } from './objects/split';
export { createUnfoldMotion } from './objects/unfold';
export { createCurlMotion } from './objects/curl';

import { createIdleMotion } from './humanoid/idle';
import { createBreatheMotion } from './humanoid/breathe';
import { createWalkMotion } from './humanoid/walk';
import { createReachMotion } from './humanoid/reach';
import { createSelfTickleMotion } from './humanoid/self-tickle';
import { createSurprisedSquirmMotion } from './humanoid/surprised-squirm';
import { createSpinMotion } from './objects/spin';
import { createFloatMotion } from './objects/float';
import { createPulseMotion } from './objects/pulse';
import { createSplitMotion } from './objects/split';
import { createUnfoldMotion } from './objects/unfold';
import { createCurlMotion } from './objects/curl';

/** Motion factories keyed by stable registry id. */
export const MOTION_FACTORIES: Record<string, MotionFactory> = {
  'motion.humanoid.idle': createIdleMotion,
  'motion.humanoid.breathe': createBreatheMotion,
  'motion.humanoid.walk': createWalkMotion,
  'motion.humanoid.reach': createReachMotion,
  'motion.humanoid.selfTickle': createSelfTickleMotion,
  'motion.humanoid.surprisedSquirm': createSurprisedSquirmMotion,
  'motion.object.spin': createSpinMotion,
  'motion.object.float': createFloatMotion,
  'motion.object.pulse': createPulseMotion,
  'motion.object.split': createSplitMotion,
  'motion.object.unfold': createUnfoldMotion,
  'motion.object.curl': createCurlMotion,
};
