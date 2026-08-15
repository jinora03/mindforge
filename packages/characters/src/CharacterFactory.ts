import type {
  CharacterFactory,
  Entity,
  FaceState,
  FrameContext,
  PoseableRig,
} from '@mindforge/engine';
import type * as THREE from 'three';
import { HumanoidRig } from './HumanoidRig';
import { FaceController } from './FaceController';
import type { HumanoidOptions } from './CharacterTypes';

/**
 * A procedural humanoid character (the Observer). Implements the Engine
 * {@link Entity} contract: it exposes anchors and a {@link PoseableRig}, resets
 * to rest each frame, and can express six face states.
 */
export class HumanoidCharacter implements Entity {
  readonly kind = 'character' as const;
  readonly object3d: THREE.Object3D;
  readonly rig: PoseableRig;

  private readonly humanoid: HumanoidRig;
  private readonly face: FaceController;
  private currentFace: FaceState = 'neutral';

  constructor(
    readonly id: string,
    options: HumanoidOptions = {},
  ) {
    this.humanoid = new HumanoidRig(options);
    this.face = new FaceController();
    this.humanoid.attachToHead(this.face.group);
    this.object3d = this.humanoid.object3d;
    this.rig = this.humanoid;
  }

  getAnchor(name: string): THREE.Object3D | undefined {
    return this.humanoid.getAnchor(name);
  }

  anchorNames(): string[] {
    return this.humanoid.anchorNames();
  }

  setFace(state: FaceState, weight?: number): void {
    this.currentFace = state;
    this.face.setFace(state, weight);
  }

  getFace(): FaceState {
    return this.currentFace;
  }

  beginFrame(_ctx: FrameContext): void {
    this.humanoid.resetPose();
  }

  dispose(): void {
    this.face.dispose();
    this.humanoid.dispose();
  }
}

/** Factory for `character.observer`. */
export const createObserver: CharacterFactory = ({ id, parameters }) => {
  const scale = typeof parameters.scale === 'number' ? parameters.scale : undefined;
  return new HumanoidCharacter(id, { scale });
};

/** Character factories keyed by stable registry id. */
export const CHARACTER_FACTORIES: Record<string, CharacterFactory> = {
  'character.observer': createObserver,
};
