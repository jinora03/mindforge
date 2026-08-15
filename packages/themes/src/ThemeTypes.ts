import type {
  AssetDescriptor,
  CharacterFactory,
  EffectFactory,
  EnvironmentFactory,
  PrefabFactory,
  PostProcessingConfig,
} from '@mindforge/engine';
import type { TextPlacement, TextStyle } from '@mindforge/schema';

export interface ThemeSafeZones {
  readonly topChrome: number;
  readonly bottomCaption: number;
  readonly centralWidth: number;
  readonly placementY: Readonly<Record<TextPlacement, number>>;
}

export type ThemeTypography = Readonly<
  Record<TextStyle, Readonly<Record<string, string | number>>>
>;

/**
 * Browser-facing presentation values that belong to a visual theme rather than
 * to the generic Engine. The Engine only receives the post-processing numbers;
 * Studio / Player own DOM typography and safe-zone presentation.
 */
export interface ThemePresentation {
  readonly postProcessing: PostProcessingConfig;
  readonly typography: ThemeTypography;
  readonly safeZones: ThemeSafeZones;
}

/**
 * A complete visual skin for the same semantic MindForge capability ids.
 * Motions and cameras intentionally stay shared: a theme changes how the world
 * looks, not what an episode means or when it moves.
 */
export interface MindForgeTheme {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly characters: Readonly<Record<string, CharacterFactory>>;
  readonly prefabs: Readonly<Record<string, PrefabFactory>>;
  readonly effects: Readonly<Record<string, EffectFactory>>;
  readonly environments: Readonly<Record<string, EnvironmentFactory>>;
  readonly assets: readonly AssetDescriptor[];
  readonly presentation: ThemePresentation;
}
