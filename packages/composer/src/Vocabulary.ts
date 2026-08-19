import type { SceneLayerRole } from '@mindforge/schema';

export interface CompositionLayerRecipe {
  readonly id: string;
  readonly factory: string;
  readonly role: SceneLayerRole;
  readonly enabled?: boolean;
  readonly parameters?: Readonly<Record<string, unknown>>;
}

export interface CompositionWorldRecipe {
  readonly environment: string;
  readonly layers?: readonly CompositionLayerRecipe[];
}

export interface CompositionLayerCapability {
  readonly factory: string;
  readonly role: SceneLayerRole;
  readonly parameters?: Readonly<Record<string, unknown>>;
}

/**
 * Declarative semantic vocabulary used by PF8. The compiler depends on this
 * contract, not on themes or Engine registries, so projects can extend the
 * authoring language without adding branches to the Engine.
 */
export interface CompositionVocabulary {
  readonly worlds: Readonly<Record<string, CompositionWorldRecipe>>;
  readonly weather: Readonly<Record<string, CompositionLayerCapability>>;
  readonly atmosphere: Readonly<Record<string, CompositionLayerCapability>>;
  readonly lighting: Readonly<Record<string, CompositionLayerCapability>>;
  readonly characters: Readonly<Record<string, string>>;
  readonly prefabs: Readonly<Record<string, string>>;
  readonly motions: Readonly<Record<string, string>>;
  readonly objectMotions: Readonly<Record<string, string>>;
  readonly effects: Readonly<Record<string, string>>;
  readonly cameras: Readonly<Record<string, string>>;
  readonly audio: Readonly<Record<string, string>>;
}
