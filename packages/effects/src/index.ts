/**
 * @mindforge/effects — fields, contours, signals, information, pressure,
 * reaction, and revelation. Every effect expresses a hidden state; none is
 * decorative wallpaper (Design Bible §5). Effects derive all state from the
 * authoritative window context so they reset and seek deterministically.
 */
import type { EffectFactory } from '@mindforge/engine';

export * from './EffectTypes';
export { createSignalPath } from './SignalPath';
export { createPredictionSignal } from './PredictionSignal';
export { createGhostMovement } from './GhostMovement';
export { createContourPressure } from './ContourPressure';
export { createContourShockwave } from './ContourShockwave';
export { createReactionBurst } from './ReactionBurst';
export { createInformationStream } from './InformationStream';
export { createInsightFlash } from './InsightFlash';

import { createSignalPath } from './SignalPath';
import { createPredictionSignal } from './PredictionSignal';
import { createGhostMovement } from './GhostMovement';
import { createContourPressure } from './ContourPressure';
import { createContourShockwave } from './ContourShockwave';
import { createReactionBurst } from './ReactionBurst';
import { createInformationStream } from './InformationStream';
import { createInsightFlash } from './InsightFlash';

/** Effect factories keyed by stable registry id. */
export const EFFECT_FACTORIES: Record<string, EffectFactory> = {
  'effect.signal.path': createSignalPath,
  'effect.signal.prediction': createPredictionSignal,
  'effect.ghostMovement': createGhostMovement,
  'effect.contour.pressure': createContourPressure,
  'effect.contour.shockwave': createContourShockwave,
  'effect.reaction.burst': createReactionBurst,
  'effect.informationStream': createInformationStream,
  'effect.insight.flash': createInsightFlash,
};
