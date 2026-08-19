/**
 * @mindforge/environments — generic reusable environment capabilities and
 * production-composition mechanics. Visual themes own presentation; this
 * package stays renderer/runtime oriented and theme-blind.
 */
import type { EnvironmentFactory } from '@mindforge/engine';

export * from './EnvironmentTypes';
export * from './ProductionComposition';
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
