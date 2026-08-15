/**
 * @mindforge/environments — reusable domains from the Universe Bible. The
 * Forge is a dimension, not one place: each environment shares canon laws
 * (violet cosmic identity, meaningful light) while staging different concept
 * families. Environments are not locked to a single topic.
 */
import type { EnvironmentFactory } from '@mindforge/engine';

export * from './EnvironmentTypes';
export { createCosmicVoid } from './CosmicVoid';
export { createArtifactStage } from './ArtifactStage';
export { createDreamGarden } from './DreamGarden';

import { createCosmicVoid } from './CosmicVoid';
import { createArtifactStage } from './ArtifactStage';
import { createDreamGarden } from './DreamGarden';

/** Environment factories keyed by stable registry id. */
export const ENVIRONMENT_FACTORIES: Record<string, EnvironmentFactory> = {
  'environment.cosmicVoid': createCosmicVoid,
  'environment.artifactStage': createArtifactStage,
  'environment.dreamGarden': createDreamGarden,
};
