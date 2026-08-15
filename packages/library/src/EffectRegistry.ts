import { Registry, type EffectFactory } from '@mindforge/engine';

/** Registry of effect factories (contours, signals, bursts, reveals). */
export class EffectRegistry extends Registry<EffectFactory> {
  constructor() {
    super('effect');
  }
}
