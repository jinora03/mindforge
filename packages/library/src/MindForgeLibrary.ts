import type { CapabilityRegistries } from '@mindforge/engine';
import { AssetRegistry } from './AssetRegistry';
import { AudioCueRegistry } from './AudioCueRegistry';
import { CameraRegistry } from './CameraRegistry';
import { CharacterRegistry } from './CharacterRegistry';
import { EffectRegistry } from './EffectRegistry';
import { EnvironmentRegistry } from './EnvironmentRegistry';
import { MotionRegistry } from './MotionRegistry';
import { PrefabRegistry } from './PrefabRegistry';

/**
 * The MindForge Library: the single object that owns every capability registry
 * and satisfies the Engine's {@link CapabilityRegistries} contract. It exposes
 * stable ids and factories; it never reimplements a system or holds episode
 * content.
 *
 * A library instance is built for exactly one visual theme. The Engine remains
 * theme-blind: it still resolves the same semantic ids (`character.observer`,
 * `effect.reaction.burst`, etc.) regardless of the selected theme.
 */
export class MindForgeLibrary implements CapabilityRegistries {
  readonly assets = new AssetRegistry();
  readonly audio = new AudioCueRegistry();
  readonly characters = new CharacterRegistry();
  readonly prefabs = new PrefabRegistry();
  readonly motions = new MotionRegistry();
  readonly effects = new EffectRegistry();
  readonly cameras = new CameraRegistry();
  readonly environments = new EnvironmentRegistry();

  constructor(readonly themeId: string = 'voxel') {}

  /** A flat catalogue of every registered id, grouped by kind. */
  catalog(): Record<string, string[]> {
    return {
      characters: this.characters.list(),
      prefabs: this.prefabs.list(),
      motions: this.motions.list(),
      effects: this.effects.list(),
      cameras: this.cameras.list(),
      environments: this.environments.list(),
      assets: this.assets.list(),
      audio: this.audio.list(),
    };
  }
}
