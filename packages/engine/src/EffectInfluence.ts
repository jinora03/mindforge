/**
 * Scalar, normalized production responses emitted by timeline effects.
 *
 * Channels describe *what the surrounding production should react to*, not
 * how a theme must render that response. Theme/environment/layer systems read
 * the bus through SceneServices and decide how to express it visually.
 */
export const EFFECT_INFLUENCE_CHANNELS = [
  'environmentLight',
  'emissiveBoost',
  'fogScattering',
  'wetReflection',
  'windImpulse',
  'cameraImpulse',
  'screenExposure',
  'audioImpact',
] as const;

export type EffectInfluenceChannel = (typeof EFFECT_INFLUENCE_CHANNELS)[number];
export type EffectInfluenceSnapshot = Readonly<Record<EffectInfluenceChannel, number>>;

/** Read-only influence surface exposed to scene capabilities. */
export interface EffectInfluenceReader {
  get(channel: EffectInfluenceChannel): number;
  snapshot(): EffectInfluenceSnapshot;
}

/** Write surface used only while the Engine evaluates effect influence recipes. */
export interface EffectInfluenceSink {
  contribute(channel: EffectInfluenceChannel, amount: number): void;
}

function zeroSnapshot(): Record<EffectInfluenceChannel, number> {
  return {
    environmentLight: 0,
    emissiveBoost: 0,
    fogScattering: 0,
    wetReflection: 0,
    windImpulse: 0,
    cameraImpulse: 0,
    screenExposure: 0,
    audioImpact: 0,
  };
}

/**
 * Frame-local deterministic influence accumulator.
 *
 * Contributions are normalized scalar magnitudes. Overlapping effects combine
 * additively and clamp at 1, making overlap deterministic without allowing one
 * recipe to accidentally blow out downstream lighting/exposure systems.
 */
export class EffectInfluenceBus implements EffectInfluenceReader, EffectInfluenceSink {
  private readonly values = zeroSnapshot();

  beginFrame(): void {
    for (const channel of EFFECT_INFLUENCE_CHANNELS) this.values[channel] = 0;
  }

  contribute(channel: EffectInfluenceChannel, amount: number): void {
    if (!Number.isFinite(amount) || amount <= 0) return;
    this.values[channel] = Math.min(1, this.values[channel] + amount);
  }

  get(channel: EffectInfluenceChannel): number {
    return this.values[channel];
  }

  snapshot(): EffectInfluenceSnapshot {
    return { ...this.values };
  }
}

/** Safe zero reader for standalone factory/tests that do not build a full scene. */
export const EMPTY_EFFECT_INFLUENCES: EffectInfluenceReader = Object.freeze({
  get: (_channel: EffectInfluenceChannel): number => 0,
  snapshot: (): EffectInfluenceSnapshot => zeroSnapshot(),
});
