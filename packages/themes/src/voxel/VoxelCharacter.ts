import * as THREE from 'three';
import {
  HUMANOID_ANCHORS,
  HUMANOID_JOINTS,
  disposeObject3D,
  type CharacterFactory,
  type Entity,
  type FaceState,
  type FrameContext,
  type HumanoidJoint,
  type PoseableRig,
} from '@mindforge/engine';
import { VOXEL_PALETTE, createVoxelMaterial } from './voxel-style';

interface FacePose {
  browAngle: number;
  browLift: number;
  eyeOpen: number;
  mouthOpen: number;
  mouthWidth: number;
  smile: number;
}

const FACE_POSES: Record<FaceState, FacePose> = {
  neutral: { browAngle: 0, browLift: 0, eyeOpen: 1, mouthOpen: 0.1, mouthWidth: 1, smile: 0 },
  confused: { browAngle: 0.24, browLift: 0.01, eyeOpen: 1, mouthOpen: 0.08, mouthWidth: 0.76, smile: -0.2 },
  focused: { browAngle: -0.1, browLift: -0.008, eyeOpen: 0.72, mouthOpen: 0.04, mouthWidth: 0.82, smile: 0 },
  disappointed: { browAngle: -0.15, browLift: -0.008, eyeOpen: 0.62, mouthOpen: 0.06, mouthWidth: 0.88, smile: -0.36 },
  surprised: { browAngle: 0.06, browLift: 0.024, eyeOpen: 1.42, mouthOpen: 0.82, mouthWidth: 0.68, smile: 0 },
  laughing: { browAngle: 0.12, browLift: 0.014, eyeOpen: 0.44, mouthOpen: 0.62, mouthWidth: 1.16, smile: 0.48 },
};

/**
 * Compact block-game humanoid. The geometry is intentionally simple and chunky
 * while the canonical MindForge joints remain unchanged, so all shared motion
 * continues to work without Voxel-specific logic in the Engine.
 */
class VoxelHumanoidRig implements PoseableRig {
  readonly object3d = new THREE.Group();
  private readonly motionRoot = new THREE.Group();
  private readonly joints = new Map<string, THREE.Object3D>();
  private readonly rest = new Map<string, THREE.Quaternion>();
  private readonly anchors = new Map<string, THREE.Object3D>();
  private readonly headJoint: THREE.Object3D;
  private readonly tmpEuler = new THREE.Euler();
  private readonly tmpQuat = new THREE.Quaternion();

  constructor(scale = 1) {
    this.object3d.name = 'voxel-humanoid';
    this.object3d.scale.setScalar(scale);
    this.object3d.add(this.motionRoot);

    const skin = createVoxelMaterial(VOXEL_PALETTE.skin, { pixelVariation: 0.055 });
    const skinLight = createVoxelMaterial(VOXEL_PALETTE.skinLight, { pixelVariation: 0.045 });
    const cloth = createVoxelMaterial(VOXEL_PALETTE.cloth, { pixelVariation: 0.09 });
    const clothLight = createVoxelMaterial(VOXEL_PALETTE.clothLight, { pixelVariation: 0.07 });
    const clothDark = createVoxelMaterial(VOXEL_PALETTE.clothDark, { pixelVariation: 0.09 });
    const shoe = createVoxelMaterial('#242A2B', { pixelVariation: 0.07 });
    const hair = createVoxelMaterial('#263134', { pixelVariation: 0.08 });
    const badge = createVoxelMaterial(VOXEL_PALETTE.cream, { pixelVariation: 0.04 });

    const hips = this.joint('hips', this.motionRoot, 0, 0.74, 0);
    this.block(hips, clothDark, [0.42, 0.16, 0.23], [0, 0.03, 0]);

    const spine = this.joint('spine', hips, 0, 0.16, 0);
    const chest = this.joint('chest', spine, 0, 0.18, 0);
    this.block(chest, cloth, [0.54, 0.54, 0.25], [0, 0.03, 0]);
    // Collar, belt, and badge make the skin read as an intentional game avatar.
    this.block(chest, clothLight, [0.38, 0.055, 0.012], [0, 0.24, 0.131]);
    this.block(chest, badge, [0.12, 0.07, 0.014], [0, 0.08, 0.133]);
    this.block(chest, clothDark, [0.54, 0.075, 0.012], [0, -0.205, 0.132]);

    const neck = this.joint('neck', chest, 0, 0.31, 0);
    const head = this.joint('head', neck, 0, 0.18, 0);
    this.headJoint = head;
    this.block(head, skin, [0.42, 0.42, 0.42], [0, 0.015, 0]);

    // Layered hair keeps the head cubic while avoiding the "single cap" look.
    this.block(head, hair, [0.43, 0.085, 0.43], [0, 0.185, 0]);
    this.block(head, hair, [0.43, 0.12, 0.055], [0, 0.13, -0.19]);
    this.block(head, hair, [0.075, 0.19, 0.43], [-0.18, 0.105, 0]);
    this.block(head, hair, [0.09, 0.11, 0.06], [0.13, 0.145, 0.205]);

    this.arm('Left', chest, -1, skin, skinLight, cloth, clothLight);
    this.arm('Right', chest, 1, skin, skinLight, cloth, clothLight);
    this.leg('Left', hips, -1, clothDark, shoe);
    this.leg('Right', hips, 1, clothDark, shoe);

    this.anchor('chest', chest, 0, 0.04, 0.15);
    this.anchor('ribLeft', chest, -0.19, -0.02, 0.14);
    this.anchor('ribRight', chest, 0.19, -0.02, 0.14);
    this.anchor('head', head, 0, 0.02, 0.23);

    for (const [name, joint] of this.joints) {
      this.rest.set(name, joint.quaternion.clone());
    }
  }

  hasJoint(name: string): boolean {
    return this.joints.has(name);
  }

  rotateJoint(name: string, x: number, y: number, z: number): void {
    const joint = this.joints.get(name);
    if (!joint) return;
    this.tmpEuler.set(x, y, z);
    this.tmpQuat.setFromEuler(this.tmpEuler);
    joint.quaternion.multiply(this.tmpQuat);
  }

  offsetRoot(x: number, y: number, z: number): void {
    this.motionRoot.position.x += x;
    this.motionRoot.position.y += y;
    this.motionRoot.position.z += z;
  }

  rotateRoot(x: number, y: number, z: number): void {
    this.tmpEuler.set(x, y, z);
    this.tmpQuat.setFromEuler(this.tmpEuler);
    this.motionRoot.quaternion.multiply(this.tmpQuat);
  }

  resetPose(): void {
    this.motionRoot.position.set(0, 0, 0);
    this.motionRoot.quaternion.identity();
    for (const [name, joint] of this.joints) {
      const rest = this.rest.get(name);
      if (rest) joint.quaternion.copy(rest);
    }
  }

  getAnchor(name: string): THREE.Object3D | undefined {
    return this.anchors.get(name);
  }

  anchorNames(): string[] {
    return [...this.anchors.keys()];
  }

  attachToHead(object: THREE.Object3D): void {
    this.headJoint.add(object);
  }

  dispose(): void {
    disposeObject3D(this.object3d);
    this.object3d.removeFromParent();
  }

  private arm(
    side: 'Left' | 'Right',
    chest: THREE.Object3D,
    dir: number,
    skin: THREE.Material,
    skinLight: THREE.Material,
    cloth: THREE.Material,
    clothLight: THREE.Material,
  ): void {
    const shoulder = this.joint(`shoulder${side}`, chest, dir * 0.35, 0.21, 0);
    this.block(shoulder, cloth, [0.16, 0.31, 0.17], [0, -0.155, 0]);
    this.block(shoulder, clothLight, [0.16, 0.055, 0.174], [0, -0.03, 0.002]);

    const elbow = this.joint(`elbow${side}`, shoulder, 0, -0.31, 0);
    this.block(elbow, skin, [0.15, 0.27, 0.16], [0, -0.135, 0]);

    const wrist = this.joint(`wrist${side}`, elbow, 0, -0.28, 0);
    this.block(wrist, skinLight, [0.16, 0.15, 0.17], [0, -0.075, 0.015]);

    this.anchor(`shoulder${side}`, shoulder, 0, -0.03, 0.1);
    this.anchor(`elbow${side}`, elbow, 0, -0.02, 0.09);
    this.anchor(`hand${side}`, wrist, 0, -0.12, 0.07);
  }

  private leg(
    side: 'Left' | 'Right',
    hips: THREE.Object3D,
    dir: number,
    cloth: THREE.Material,
    shoe: THREE.Material,
  ): void {
    const hip = this.joint(`hip${side}`, hips, dir * 0.13, -0.06, 0);
    this.block(hip, cloth, [0.2, 0.34, 0.21], [0, -0.17, 0]);

    const knee = this.joint(`knee${side}`, hip, 0, -0.35, 0);
    this.block(knee, cloth, [0.19, 0.32, 0.2], [0, -0.16, 0]);

    const ankle = this.joint(`ankle${side}`, knee, 0, -0.33, 0);
    this.block(ankle, shoe, [0.2, 0.12, 0.29], [0, -0.06, 0.045]);
    this.anchor(`foot${side}`, ankle, 0, -0.07, 0.1);
  }

  private joint(name: string, parent: THREE.Object3D, x: number, y: number, z: number): THREE.Object3D {
    const object = new THREE.Object3D();
    object.name = name;
    object.position.set(x, y, z);
    parent.add(object);
    if ((HUMANOID_JOINTS as readonly string[]).includes(name)) {
      this.joints.set(name as HumanoidJoint, object);
    }
    return object;
  }

  private anchor(name: string, parent: THREE.Object3D, x: number, y: number, z: number): void {
    if (!(HUMANOID_ANCHORS as readonly string[]).includes(name)) return;
    const anchor = new THREE.Object3D();
    anchor.name = `anchor:${name}`;
    anchor.position.set(x, y, z);
    parent.add(anchor);
    this.anchors.set(name, anchor);
  }

  private block(
    parent: THREE.Object3D,
    material: THREE.Material,
    size: [number, number, number],
    position: [number, number, number],
  ): THREE.Mesh {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
    mesh.position.set(...position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
}

/** Thin pixel-like face plates retain expression without turning into 3D facial sculpture. */
class VoxelFace {
  readonly group = new THREE.Group();
  private readonly leftEye: THREE.Mesh;
  private readonly rightEye: THREE.Mesh;
  private readonly leftBrow: THREE.Mesh;
  private readonly rightBrow: THREE.Mesh;
  private readonly mouth: THREE.Mesh;
  private readonly mouthLeft: THREE.Mesh;
  private readonly mouthRight: THREE.Mesh;
  private readonly browBaseY = 0.066;
  private readonly mouthBaseY = -0.067;

  constructor() {
    this.group.name = 'voxel-face';
    this.group.position.set(0, 0.015, 0.214);

    const ink = createVoxelMaterial(VOXEL_PALETTE.ink, { roughness: 1, pixelVariation: 0 });
    const mouthMaterial = createVoxelMaterial('#743D2B', { roughness: 1, pixelVariation: 0 });
    const eyeGeometry = new THREE.BoxGeometry(0.052, 0.068, 0.012);
    this.leftEye = new THREE.Mesh(eyeGeometry, ink);
    this.rightEye = new THREE.Mesh(eyeGeometry, ink);
    this.leftEye.position.set(-0.085, 0.018, 0);
    this.rightEye.position.set(0.085, 0.018, 0);

    const browGeometry = new THREE.BoxGeometry(0.078, 0.016, 0.012);
    this.leftBrow = new THREE.Mesh(browGeometry, ink);
    this.rightBrow = new THREE.Mesh(browGeometry, ink);
    this.leftBrow.position.set(-0.085, this.browBaseY, 0);
    this.rightBrow.position.set(0.085, this.browBaseY, 0);

    const mouthGeometry = new THREE.BoxGeometry(0.092, 0.018, 0.012);
    this.mouth = new THREE.Mesh(mouthGeometry, mouthMaterial);
    this.mouth.position.set(0, this.mouthBaseY, 0);

    const cornerGeometry = new THREE.BoxGeometry(0.026, 0.018, 0.012);
    this.mouthLeft = new THREE.Mesh(cornerGeometry, mouthMaterial);
    this.mouthRight = new THREE.Mesh(cornerGeometry, mouthMaterial);
    this.mouthLeft.position.set(-0.057, this.mouthBaseY, 0);
    this.mouthRight.position.set(0.057, this.mouthBaseY, 0);

    this.group.add(
      this.leftEye,
      this.rightEye,
      this.leftBrow,
      this.rightBrow,
      this.mouth,
      this.mouthLeft,
      this.mouthRight,
    );
    this.setFace('neutral');
  }

  setFace(state: FaceState, weight = 1): void {
    const base = FACE_POSES.neutral;
    const target = FACE_POSES[state];
    const pose: FacePose = {
      browAngle: lerp(base.browAngle, target.browAngle, weight),
      browLift: lerp(base.browLift, target.browLift, weight),
      eyeOpen: lerp(base.eyeOpen, target.eyeOpen, weight),
      mouthOpen: lerp(base.mouthOpen, target.mouthOpen, weight),
      mouthWidth: lerp(base.mouthWidth, target.mouthWidth, weight),
      smile: lerp(base.smile, target.smile, weight),
    };

    this.leftBrow.rotation.z = pose.browAngle;
    this.rightBrow.rotation.z = -pose.browAngle;
    this.leftBrow.position.y = this.browBaseY + pose.browLift;
    this.rightBrow.position.y = this.browBaseY + pose.browLift;
    this.leftEye.scale.y = pose.eyeOpen;
    this.rightEye.scale.y = pose.eyeOpen;

    this.mouth.scale.set(pose.mouthWidth, 0.5 + pose.mouthOpen * 3.0, 1);
    this.mouthLeft.position.x = -0.057 * pose.mouthWidth;
    this.mouthRight.position.x = 0.057 * pose.mouthWidth;
    this.mouthLeft.position.y = this.mouthBaseY + pose.smile * 0.04;
    this.mouthRight.position.y = this.mouthBaseY + pose.smile * 0.04;
  }
}

class VoxelCharacter implements Entity {
  readonly kind = 'character' as const;
  readonly object3d: THREE.Object3D;
  readonly rig: PoseableRig;
  private readonly rigImpl: VoxelHumanoidRig;
  private readonly face = new VoxelFace();
  private currentFace: FaceState = 'neutral';

  constructor(readonly id: string, scale = 1) {
    this.rigImpl = new VoxelHumanoidRig(scale);
    this.rigImpl.attachToHead(this.face.group);
    this.object3d = this.rigImpl.object3d;
    this.rig = this.rigImpl;
  }

  getAnchor(name: string): THREE.Object3D | undefined {
    return this.rigImpl.getAnchor(name);
  }

  anchorNames(): string[] {
    return this.rigImpl.anchorNames();
  }

  setFace(state: FaceState, weight = 1): void {
    this.currentFace = state;
    this.face.setFace(state, weight);
  }

  getFace(): FaceState {
    return this.currentFace;
  }

  beginFrame(_ctx: FrameContext): void {
    this.rigImpl.resetPose();
  }

  dispose(): void {
    this.rigImpl.dispose();
  }
}

export const createVoxelObserver: CharacterFactory = ({ id, parameters }) => {
  const scale = typeof parameters.scale === 'number' ? parameters.scale : 1;
  return new VoxelCharacter(id, scale);
};

export const VOXEL_CHARACTER_FACTORIES: Record<string, CharacterFactory> = {
  'character.observer': createVoxelObserver,
};

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
