import type { TypographyRole } from './style-types';

export const FONT_STACK = {
  display: "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif",
  mono: "'JetBrains Mono', 'SFMono-Regular', ui-monospace, monospace",
} as const;

/**
 * Typography presets (Design Bible §8). Values are plain style objects the
 * apps spread onto DOM caption overlays so text stays crisp and phone-legible.
 * Text is a quiet guide — the world carries the explanation.
 */
export const TYPOGRAPHY: Record<TypographyRole, Record<string, string | number>> = {
  question: {
    fontFamily: FONT_STACK.display,
    fontWeight: 800,
    fontSize: 'clamp(22px, 5.2vh, 42px)',
    lineHeight: 1.08,
    letterSpacing: '-0.01em',
    color: '#FFF7FC',
    textShadow: '0 2px 18px rgba(103, 55, 255, 0.55)',
    textAlign: 'center',
  },
  explanation: {
    fontFamily: FONT_STACK.display,
    fontWeight: 500,
    fontSize: 'clamp(15px, 2.9vh, 24px)',
    lineHeight: 1.28,
    color: '#F3E9FF',
    textShadow: '0 1px 10px rgba(8, 3, 18, 0.85)',
    textAlign: 'center',
  },
  artifactLabel: {
    fontFamily: FONT_STACK.display,
    fontWeight: 600,
    fontSize: 'clamp(11px, 1.7vh, 15px)',
    letterSpacing: '0.42em',
    textTransform: 'uppercase',
    color: '#FF7ABF',
    textAlign: 'center',
  },
  brandLockup: {
    fontFamily: FONT_STACK.display,
    fontWeight: 700,
    fontSize: 'clamp(12px, 1.8vh, 16px)',
    letterSpacing: '0.24em',
    textTransform: 'uppercase',
    color: '#FFF7FC',
    opacity: 0.85,
  },
  number: {
    fontFamily: FONT_STACK.mono,
    fontWeight: 500,
    fontSize: 'clamp(14px, 2.6vh, 22px)',
    letterSpacing: '0.04em',
    color: '#FFB36B',
    fontVariantNumeric: 'tabular-nums',
  },
};

/**
 * 9:16 safe zones as fractions of the stage (Design Bible §7). Apps position
 * caption placements within these bounds.
 */
export const SAFE_ZONES = {
  topChrome: 0.1,
  bottomCaption: 0.18,
  centralWidth: 0.8,
  /** Where each placement anchors vertically (fraction from the top). */
  placementY: {
    top: 0.12,
    upper: 0.34,
    center: 0.5,
    lower: 0.74,
    bottom: 0.88,
  },
} as const;
