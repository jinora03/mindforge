import type { Easing } from '@mindforge/schema';

/**
 * Deterministic easing curves keyed by the names the schema allows. Pure
 * functions of `t ∈ [0, 1]` so timeline evaluation is reproducible on seek.
 */
export type EasingFn = (t: number) => number;

const clamp01 = (t: number): number => (t < 0 ? 0 : t > 1 ? 1 : t);

export const EASING_FNS: Record<Easing, EasingFn> = {
  linear: (t) => t,
  easeIn: (t) => t * t,
  easeOut: (t) => t * (2 - t),
  easeInOut: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  easeInOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  easeInOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  easeOutBack: (t) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  easeOutElastic: (t) => {
    if (t === 0) return 0;
    if (t === 1) return 1;
    const c4 = (2 * Math.PI) / 3;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  },
};

/** Resolve an easing function by name, defaulting to linear. */
export function resolveEasing(name: Easing | undefined): EasingFn {
  return name ? EASING_FNS[name] : EASING_FNS.linear;
}

/** Apply an easing curve to a clamped progress value. */
export function applyEasing(progress: number, name: Easing | undefined): number {
  return resolveEasing(name)(clamp01(progress));
}

export { clamp01 };
