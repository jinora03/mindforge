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
import { createBlockMaterial, createVoxelMaterial } from './voxel-style';

interface FacePose {
  browAngle: number;
  browLift: number;
  eyeOpen: number;
  mouthOpen: number;
  mouthWidth: number;
  smile: number;
}

const FACE_POSES: Record<FaceState, FacePose> = {
  neutral: { browAngle: 0, browLift: 0, eyeOpen: 1, mouthOpen: 0, mouthWidth: 1, smile: 0 },
  confused: { browAngle: 0.16, browLift: 0.008, eyeOpen: 1, mouthOpen: 0.04, mouthWidth: 0.8, smile: -0.1 },
  focused: { browAngle: -0.08, browLift: -0.008, eyeOpen: 0.78, mouthOpen: 0, mouthWidth: 0.86, smile: 0 },
  disappointed: { browAngle: -0.1, browLift: -0.009, eyeOpen: 0.7, mouthOpen: 0.03, mouthWidth: 0.92, smile: -0.18 },
  surprised: { browAngle: 0.05, browLift: 0.026, eyeOpen: 1.4, mouthOpen: 0.62, mouthWidth: 0.68, smile: 0 },
  laughing: { browAngle: 0.08, browLift: 0.016, eyeOpen: 0.42, mouthOpen: 0.44, mouthWidth: 1.1, smile: 0.4 },
};

/**
 * Block-game humanoid.
 *
 * Proportions follow the genre's rules rather than human anatomy: the head is
 * half a BLOCK and a quarter of the total height, limbs are a quarter-BLOCK
 * square, and the shoulder span is one BLOCK. That is what makes the character
 * belong to the same world as the terrain instead of standing on it.
 *
 * Joint *positions* are deliberately unchanged from the previous rig, so every
 * shared humanoid motion, every semantic anchor, and the episodes' camera
 * framing offsets all keep working. Only the geometry hung on those joints
 * changed.
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

    // No tints: each texture palette already carries its final colour, and
    // `map` multiplies `color`, so tinting would square the value.
    const skin = (size: [number, number, number]): THREE.Material =>
      createBlockMaterial('skin', { size });
    const cloth = (size: [number, number, number]): THREE.Material =>
      createBlockMaterial('cloth', { size });
    const trousers = (size: [number, number, number]): THREE.Material =>
      createBlockMaterial('denim', { size });
    const boot = (size: [number, number, number]): THREE.Material =>
      createBlockMaterial('leather', { size });
    const hair = (size: [number, number, number]): THREE.Material =>
      createBlockMaterial('hair', { size });

    const hips = this.joint('hips', this.motionRoot, 0, 0.74, 0);

    const spine = this.joint('spine', hips, 0, 0.16, 0);
    const chest = this.joint('chest', spine, 0, 0.18, 0);
    // One solid torso slab — half a BLOCK wide, a quarter deep. Extend it
    // exactly to the upper-leg top instead of layering a separate belt box
    // over the shirt. The old overlapping waist meshes produced depth/shadow
    // fighting while the camera moved.
    this.block(chest, cloth([0.5, 0.68, 0.26]), [0.5, 0.68, 0.26], [0, -0.06, 0]);
    const neck = this.joint('neck', chest, 0, 0.31, 0);
    const head = this.joint('head', neck, 0, 0.18, 0);
    this.headJoint = head;
    // Genuinely cubic head, sitting directly on the torso.
    this.block(head, skin([0.48, 0.48, 0.48]), [0.48, 0.48, 0.48], [0, 0.03, 0]);

    // Hair as a shell over the cube rather than sculpted strands.
    this.block(head, hair([0.5, 0.05, 0.5]), [0.5, 0.05, 0.5], [0, 0.255, 0]);
    this.block(head, hair([0.5, 0.3, 0.05]), [0.5, 0.3, 0.05], [0, 0.105, -0.245]);
    this.block(head, hair([0.05, 0.24, 0.5]), [0.05, 0.24, 0.5], [-0.245, 0.105, 0]);
    this.block(head, hair([0.05, 0.24, 0.5]), [0.05, 0.24, 0.5], [0.245, 0.105, 0]);
    // Fringe across the forehead, sitting just proud of the face plane.
    this.block(head, hair([0.5, 0.1, 0.05]), [0.5, 0.1, 0.05], [0, 0.18, 0.245]);

    this.arm('Left', chest, -1, skin, cloth);
    this.arm('Right', chest, 1, skin, cloth);
    this.leg('Left', hips, -1, trousers, boot);
    this.leg('Right', hips, 1, trousers, boot);

    this.anchor('chest', chest, 0, 0.02, 0.15);
    this.anchor('ribLeft', chest, -0.19, -0.06, 0.13);
    this.anchor('ribRight', chest, 0.19, -0.06, 0.13);
    this.anchor('head', head, 0, 0.03, 0.26);

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

  /**
   * Shoulder joints sit at +-0.37 so the arms hang flush with the torso and the
   * total shoulder span is one BLOCK. Segment lengths are unchanged, which
   * keeps `handLeft` / `handRight` at the heights the episodes reach for.
   */
  private arm(
    side: 'Left' | 'Right',
    chest: THREE.Object3D,
    dir: number,
    skin: (size: [number, number, number]) => THREE.Material,
    cloth: (size: [number, number, number]) => THREE.Material,
  ): void {
    const shoulder = this.joint(`shoulder${side}`, chest, dir * 0.37, 0.21, 0);
    this.block(shoulder, cloth([0.24, 0.32, 0.24]), [0.24, 0.32, 0.24], [0, -0.16, 0]);

    const elbow = this.joint(`elbow${side}`, shoulder, 0, -0.31, 0);
    this.block(elbow, skin([0.23, 0.29, 0.23]), [0.23, 0.29, 0.23], [0, -0.145, 0]);

    const wrist = this.joint(`wrist${side}`, elbow, 0, -0.28, 0);
    this.block(wrist, skin([0.24, 0.17, 0.25]), [0.24, 0.17, 0.25], [0, -0.085, 0.01]);

    this.anchor(`shoulder${side}`, shoulder, 0, -0.04, 0.11);
    this.anchor(`elbow${side}`, elbow, 0, -0.02, 0.1);
    this.anchor(`hand${side}`, wrist, 0, -0.13, 0.07);
  }

  private leg(
    side: 'Left' | 'Right',
    hips: THREE.Object3D,
    dir: number,
    trousers: (size: [number, number, number]) => THREE.Material,
    boot: (size: [number, number, number]) => THREE.Material,
  ): void {
    const hip = this.joint(`hip${side}`, hips, dir * 0.135, -0.06, 0);
    this.block(hip, trousers([0.25, 0.36, 0.26]), [0.25, 0.36, 0.26], [0, -0.18, 0]);

    const knee = this.joint(`knee${side}`, hip, 0, -0.35, 0);
    this.block(knee, trousers([0.24, 0.34, 0.25]), [0.24, 0.34, 0.25], [0, -0.17, 0]);

    const ankle = this.joint(`ankle${side}`, knee, 0, -0.33, 0);
    this.block(ankle, boot([0.26, 0.14, 0.32]), [0.26, 0.14, 0.32], [0, -0.05, 0.03]);
    this.anchor(`foot${side}`, ankle, 0, -0.06, 0.1);
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

/**
 * Flat pixel plates on the front of the head cube. Eyes are two-tone (sclera
 * plus pupil) because a single dark rectangle reads as a smudge once the frame
 * is phone-sized; everything else stays as thin quads so the head keeps its
 * cubic silhouette from every angle.
 */
class VoxelFace {
  readonly group = new THREE.Group();
  private readonly leftEye: THREE.Mesh;
  private readonly rightEye: THREE.Mesh;
  private readonly leftPupil: THREE.Mesh;
  private readonly rightPupil: THREE.Mesh;
  private readonly leftBrow: THREE.Mesh;
  private readonly rightBrow: THREE.Mesh;
  private readonly mouth: THREE.Mesh;
  private readonly mouthLeft: THREE.Mesh;
  private readonly mouthRight: THREE.Mesh;
  private readonly eyeX = 0.096;
  private readonly eyeY = 0.048;
  private readonly browBaseY = 0.118;
  private readonly mouthBaseY = -0.078;

  constructor() {
    this.group.name = 'voxel-face';
    this.group.position.set(0, 0.03, 0.243);

    const flat = (color: string): THREE.MeshStandardMaterial =>
      createVoxelMaterial(color, { pixelVariation: 0, roughness: 1 });

    const iris = flat('#3A4A5C');
    const brow = flat('#4E3826');
    const sclera = flat('#F2EFE6');
    const mouthMaterial = flat('#8A5A46');

    const eyeGeometry = new THREE.BoxGeometry(0.084, 0.084, 0.012);
    this.leftEye = new THREE.Mesh(eyeGeometry, sclera);
    this.rightEye = new THREE.Mesh(eyeGeometry, sclera);
    this.leftEye.position.set(-this.eyeX, this.eyeY, 0);
    this.rightEye.position.set(this.eyeX, this.eyeY, 0);

    // Iris fills the outer half of each eye, as pixel faces of this scale do.
    const pupilGeometry = new THREE.BoxGeometry(0.042, 0.084, 0.012);
    this.leftPupil = new THREE.Mesh(pupilGeometry, iris);
    this.rightPupil = new THREE.Mesh(pupilGeometry, iris);
    this.leftPupil.position.set(-this.eyeX - 0.021, this.eyeY, 0.004);
    this.rightPupil.position.set(this.eyeX + 0.021, this.eyeY, 0.004);

    const browGeometry = new THREE.BoxGeometry(0.1, 0.018, 0.012);
    this.leftBrow = new THREE.Mesh(browGeometry, brow);
    this.rightBrow = new THREE.Mesh(browGeometry, brow);
    this.leftBrow.position.set(-this.eyeX, this.browBaseY, 0);
    this.rightBrow.position.set(this.eyeX, this.browBaseY, 0);

    const mouthGeometry = new THREE.BoxGeometry(0.085, 0.022, 0.012);
    this.mouth = new THREE.Mesh(mouthGeometry, mouthMaterial);
    this.mouth.position.set(0, this.mouthBaseY, 0);

    const cornerGeometry = new THREE.BoxGeometry(0.026, 0.022, 0.012);
    this.mouthLeft = new THREE.Mesh(cornerGeometry, mouthMaterial);
    this.mouthRight = new THREE.Mesh(cornerGeometry, mouthMaterial);
    this.mouthLeft.position.set(-0.052, this.mouthBaseY, 0);
    this.mouthRight.position.set(0.052, this.mouthBaseY, 0);

    this.group.add(
      this.leftEye,
      this.rightEye,
      this.leftPupil,
      this.rightPupil,
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
    this.leftPupil.scale.y = pose.eyeOpen;
    this.rightPupil.scale.y = pose.eyeOpen;

    this.mouth.scale.set(pose.mouthWidth, 1 + pose.mouthOpen * 4.5, 1);
    this.mouthLeft.position.x = -0.052 * pose.mouthWidth;
    this.mouthRight.position.x = 0.052 * pose.mouthWidth;
    this.mouthLeft.position.y = this.mouthBaseY + pose.smile * 0.038;
    this.mouthRight.position.y = this.mouthBaseY + pose.smile * 0.038;
    // Corners only exist when the expression needs them.
    const showCorners = Math.abs(pose.smile) > 0.04;
    this.mouthLeft.visible = showCorners;
    this.mouthRight.visible = showCorners;
  }
}

class VoxelCharacter implements Entity {
  readonly kind = 'character' as const;
  readonly object3d: THREE.Object3D;
  readonly rig: PoseableRig;
  private readonly rigImpl: VoxelHumanoidRig;
  private readonly face = new VoxelFace();
  private currentFace: FaceState = 'neutral';

  constructor(
    readonly id: string,
    scale = 1,
  ) {
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
