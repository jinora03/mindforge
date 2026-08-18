import * as THREE from 'three';
import {
  HUMANOID_JOINTS,
  disposeObject3D,
  type CharacterFactory,
  type Entity,
  type FrameContext,
  type HumanoidJoint,
  type PoseableRig,
  type RuntimeModelAsset,
} from '@mindforge/engine';

/**
 * PoseableRig adapter for a PF7 authored humanoid skeleton.
 *
 * The authored clip sampled by PF3 establishes the base pose. Existing
 * deterministic MindForge motions then multiply additive joint/root offsets on
 * top through this adapter. The adapter itself never advances time.
 */
export class AuthoredHumanoidRig implements PoseableRig {
  private readonly restQuaternions = new Map<HumanoidJoint, THREE.Quaternion>();
  private readonly tmpEuler = new THREE.Euler();
  private readonly tmpQuaternion = new THREE.Quaternion();

  constructor(
    private readonly motionRoot: THREE.Object3D,
    private readonly joints: Readonly<Record<HumanoidJoint, THREE.Object3D>>,
  ) {
    for (const joint of HUMANOID_JOINTS) {
      this.restQuaternions.set(joint, joints[joint].quaternion.clone());
    }
  }

  hasJoint(name: string): boolean {
    return Object.prototype.hasOwnProperty.call(this.joints, name);
  }

  rotateJoint(name: string, x: number, y: number, z: number): void {
    const joint = this.joints[name as HumanoidJoint];
    if (!joint) return;
    this.tmpEuler.set(x, y, z);
    this.tmpQuaternion.setFromEuler(this.tmpEuler);
    joint.quaternion.multiply(this.tmpQuaternion);
  }

  offsetRoot(x: number, y: number, z: number): void {
    this.motionRoot.position.x += x;
    this.motionRoot.position.y += y;
    this.motionRoot.position.z += z;
  }

  rotateRoot(x: number, y: number, z: number): void {
    this.tmpEuler.set(x, y, z);
    this.tmpQuaternion.setFromEuler(this.tmpEuler);
    this.motionRoot.quaternion.multiply(this.tmpQuaternion);
  }

  /** Restore the authored rest pose before PF3/motion evaluation for a frame. */
  resetPose(): void {
    this.motionRoot.position.set(0, 0, 0);
    this.motionRoot.quaternion.identity();
    for (const joint of HUMANOID_JOINTS) {
      jointReset(this.joints[joint], this.restQuaternions.get(joint));
    }
  }
}

/**
 * Scene-owned production character backed by a PF2-authored model.
 *
 * `object3d` is an outer staging root so episode transforms never conflict with
 * additive procedural root motion. The loaded model sits below a dedicated
 * motion root while semantic anchors/joints continue to reference authored
 * nodes inside the model clone.
 */
export class ProductionModelCharacter implements Entity {
  readonly kind = 'character' as const;
  readonly object3d = new THREE.Group();
  readonly rig: AuthoredHumanoidRig;
  readonly animationClips: Readonly<Record<string, THREE.AnimationClip>>;

  private readonly motionRoot = new THREE.Group();
  private readonly anchors: Readonly<Record<string, THREE.Object3D>>;

  constructor(
    readonly id: string,
    readonly assetId: string,
    model: RuntimeModelAsset,
  ) {
    if (!model.characterJoints) {
      throw new Error(
        `Production character asset "${assetId}" does not expose PF7 humanoid joints. ` +
          'Declare a character profile and preload it through the production asset runtime.',
      );
    }

    this.object3d.name = `production-character:${assetId}`;
    this.motionRoot.name = 'MF_Runtime_CharacterMotionRoot';
    this.object3d.add(this.motionRoot);
    this.motionRoot.add(model.object3d);

    this.anchors = model.anchors;
    this.animationClips = model.clips;
    this.rig = new AuthoredHumanoidRig(this.motionRoot, model.characterJoints);

    this.object3d.userData.mindforgeCharacterSource = 'authored';
    this.object3d.userData.mindforgeAssetId = assetId;
  }

  getAnchor(name: string): THREE.Object3D | undefined {
    return this.anchors[name];
  }

  anchorNames(): string[] {
    return Object.keys(this.anchors).sort();
  }

  beginFrame(_ctx: FrameContext): void {
    this.rig.resetPose();
  }

  dispose(): void {
    disposeObject3D(this.object3d);
    this.object3d.removeFromParent();
  }
}

/**
 * Create a theme/library character factory backed by one semantic production
 * asset. Episode JSON references the registered character factory id; the asset
 * id remains an implementation detail of the active theme/library.
 */
export function createModelCharacterFactory(assetId: string): CharacterFactory {
  return ({ id, services }) =>
    new ProductionModelCharacter(id, assetId, services.assets.instantiateModel(assetId));
}

function jointReset(joint: THREE.Object3D, rest?: THREE.Quaternion): void {
  if (rest) joint.quaternion.copy(rest);
}
