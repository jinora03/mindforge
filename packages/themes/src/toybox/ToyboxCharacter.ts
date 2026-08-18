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
import { TOYBOX_PALETTE, moulded, plastic, toyHeadGeometry } from './toybox-style';

interface FacePose {
  eyeOpen: number;
  eyeWide: number;
  mouthOpen: number;
  smile: number;
}

const FACE_POSES: Record<FaceState, FacePose> = {
  neutral: { eyeOpen: 1, eyeWide: 1, mouthOpen: 0, smile: 0.3 },
  confused: { eyeOpen: 1, eyeWide: 1, mouthOpen: 0.05, smile: -0.15 },
  focused: { eyeOpen: 0.74, eyeWide: 0.9, mouthOpen: 0, smile: 0.1 },
  disappointed: { eyeOpen: 0.66, eyeWide: 1, mouthOpen: 0.03, smile: -0.4 },
  surprised: { eyeOpen: 1.35, eyeWide: 1.25, mouthOpen: 0.7, smile: 0 },
  laughing: { eyeOpen: 0.4, eyeWide: 1.1, mouthOpen: 0.5, smile: 0.85 },
};

/**
 * Toybox humanoid — a modular moulded-plastic figure.
 *
 * Where the Voxel character is one continuous blocky body, this one reads as
 * **assembled**: every limb is a separate chamfered part with a deliberate gap
 * at each joint, so the silhouette shows seams the way a toy figure does. The
 * torso is wider and flatter, the head is oversized and wider than it is tall,
 * and the shoulders sit outboard of the body rather than flush against it.
 *
 * Joint *positions* are identical to the Voxel rig on purpose. Episodes encode
 * body-height assumptions directly — `framingOffset: [0, 1.15, 0]` means "chest
 * height", and the external hand is told to reach `[0.52, 1.17, 0.34]` — so any
 * theme that moved those anchors would silently break every camera and reach
 * target in shared content. Toybox therefore expresses its proportions *within*
 * that envelope rather than by rescaling it.
 */
class ToyboxRig implements PoseableRig {
  readonly object3d = new THREE.Group();
  private readonly motionRoot = new THREE.Group();
  private readonly joints = new Map<string, THREE.Object3D>();
  private readonly rest = new Map<string, THREE.Quaternion>();
  private readonly anchors = new Map<string, THREE.Object3D>();
  private readonly headJoint: THREE.Object3D;
  private readonly materials: THREE.Material[] = [];
  private readonly tmpEuler = new THREE.Euler();
  private readonly tmpQuat = new THREE.Quaternion();

  constructor(scale = 1) {
    this.object3d.name = 'toybox-humanoid';
    this.object3d.scale.setScalar(scale);
    this.object3d.add(this.motionRoot);

    const skin = this.material(TOYBOX_PALETTE.toySkin);
    const jacket = this.material(TOYBOX_PALETTE.jacket);
    const jacketDeep = this.material(TOYBOX_PALETTE.jacketDeep);
    const trouser = this.material(TOYBOX_PALETTE.trouser);
    const boot = this.material(TOYBOX_PALETTE.boot, { rubber: true });

    const hips = this.joint('hips', this.motionRoot, 0, 0.74, 0);

    const spine = this.joint('spine', hips, 0, 0.16, 0);
    const chest = this.joint('chest', spine, 0, 0.18, 0);
    // One big square torso spanning 0.72-1.45: the dominant mass of the figure.
    this.part(chest, [0.6, 0.73, 0.34], jacket, [0, 0.005, 0]);
    this.part(chest, [0.44, 0.05, 0.36], jacketDeep, [0, 0.34, 0]);

    // No neck piece: the head sits straight on the torso.
    const neck = this.joint('neck', chest, 0, 0.31, 0);

    const head = this.joint('head', neck, 0, 0.18, 0);
    this.headJoint = head;
    // Toybox uses a broad moulded cylinder: smooth enough to read as a toy,
    // but with a long straight side wall so it never collapses into a sphere.
    const headMesh = this.part(head, toyHeadGeometry(0.26, 0.42, 0.9, 28), skin, [0, 0.08, 0]);
    headMesh.name = 'toybox-head';

    this.arm('Left', chest, -1, skin, jacket);
    this.arm('Right', chest, 1, skin, jacket);
    this.leg('Left', hips, -1, trouser, boot);
    this.leg('Right', hips, 1, trouser, boot);

    this.anchor('chest', chest, 0, 0.02, 0.18);
    this.anchor('ribLeft', chest, -0.19, -0.06, 0.16);
    this.anchor('ribRight', chest, 0.19, -0.06, 0.16);
    this.anchor('head', head, 0, 0.05, 0.28);

    for (const [name, joint] of this.joints) this.rest.set(name, joint.quaternion.clone());
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
   * Arms hang outboard of the torso with a visible gap, and each segment is its
   * own moulded piece. Segment lengths are unchanged from the Voxel rig so the
   * hand anchors stay at the heights episodes reach for.
   */
  private arm(
    side: 'Left' | 'Right',
    chest: THREE.Object3D,
    dir: number,
    skin: THREE.Material,
    jacket: THREE.Material,
  ): void {
    // Arms remain long enough for the existing contact targets, but the upper
    // segment now carries a short coloured sleeve and the wrist has a distinct
    // rounded hand. Those breaks make the silhouette read as an assembled avatar
    // instead of two skin-coloured bars hanging from a box.
    const shoulder = this.joint(`shoulder${side}`, chest, dir * 0.41, 0.21, 0);
    shoulder.rotation.z = -dir * 0.13;
    this.part(shoulder, [0.205, 0.2, 0.245], jacket, [0, -0.015, 0]);
    this.part(shoulder, [0.19, 0.22, 0.23], skin, [0, -0.215, 0]);

    const elbow = this.joint(`elbow${side}`, shoulder, 0, -0.31, 0);
    this.part(elbow, [0.19, 0.34, 0.23], skin, [0, -0.17, 0]);

    const wrist = this.joint(`wrist${side}`, elbow, 0, -0.28, 0);
    this.part(wrist, moulded(0.18, 0.16, 0.21, 0.035, 2), skin, [0, -0.1, 0.015]);

    this.anchor(`shoulder${side}`, shoulder, 0, -0.04, 0.13);
    this.anchor(`elbow${side}`, elbow, 0, -0.02, 0.12);
    this.anchor(`hand${side}`, wrist, 0, -0.1, 0.09);
  }

  private leg(
    side: 'Left' | 'Right',
    hips: THREE.Object3D,
    dir: number,
    trouser: THREE.Material,
    boot: THREE.Material,
  ): void {
    const hip = this.joint(`hip${side}`, hips, dir * 0.135, -0.06, 0);
    this.part(hip, [0.26, 0.36, 0.3], trouser, [0, -0.18, 0]);

    const knee = this.joint(`knee${side}`, hip, 0, -0.35, 0);
    this.part(knee, [0.26, 0.38, 0.3], trouser, [0, -0.17, 0]);

    const ankle = this.joint(`ankle${side}`, knee, 0, -0.33, 0);
    this.part(ankle, moulded(0.27, 0.1, 0.35, 0.025, 1), boot, [0, -0.035, 0.045]);
    this.anchor(`foot${side}`, ankle, 0, -0.04, 0.12);
  }

  private material(color: string, options: { rubber?: boolean } = {}): THREE.Material {
    const material = plastic(color, options);
    this.materials.push(material);
    return material;
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

  private part(
    parent: THREE.Object3D,
    size: [number, number, number] | THREE.BufferGeometry,
    material: THREE.Material,
    position: [number, number, number],
  ): THREE.Mesh {
    const geometry = Array.isArray(size) ? moulded(size[0], size[1], size[2]) : size;
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
}

/**
 * A painted face on the front plate of the head.
 *
 * Thin moulded inlays sit just above the front of the cylindrical head. They
 * stay readable in a Shorts-sized frame without turning the face into a set of
 * floating spheres.
 */
class ToyboxFace {
  readonly group = new THREE.Group();
  private readonly leftEye: THREE.Mesh;
  private readonly rightEye: THREE.Mesh;
  private readonly smile: THREE.Mesh;
  private readonly openMouth: THREE.Mesh;
  private readonly materials: THREE.Material[] = [];
  private readonly eyeX = 0.115;
  private readonly eyeY = 0.055;

  constructor() {
    this.group.name = 'toybox-face';
    this.group.position.set(0, 0.08, 0.239);

    const ink = plastic(TOYBOX_PALETTE.ink, { roughness: 0.5 });
    this.materials.push(ink);

    // Two dots and a curve. Nothing else: this figure family reads entirely
    // from a minimal printed face, and any extra feature (brows, nose, blush)
    // immediately pushes it toward a different, softer toy language.
    const eyeGeometry = moulded(0.072, 0.09, 0.018, 0.009, 2);
    this.leftEye = new THREE.Mesh(eyeGeometry, ink);
    this.rightEye = new THREE.Mesh(eyeGeometry, ink);
    this.leftEye.position.set(-this.eyeX, this.eyeY, 0);
    this.rightEye.position.set(this.eyeX, this.eyeY, 0);
    for (const eye of [this.leftEye, this.rightEye]) eye.scale.set(0.85, 1.15, 1);

    // Smile as a partial torus, which gives a true curve rather than a stack
    // of little segments approximating one.
    const smileGeometry = new THREE.TorusGeometry(0.105, 0.017, 8, 20, Math.PI * 0.82);
    this.smile = new THREE.Mesh(smileGeometry, ink);
    this.smile.rotation.z = Math.PI + Math.PI * 0.09;
    this.smile.position.set(0, -0.035, 0);
    this.smile.scale.z = 0.35;

    this.openMouth = new THREE.Mesh(moulded(0.12, 0.1, 0.018, 0.028, 2), ink);
    this.openMouth.position.set(0, -0.085, 0);
    this.openMouth.scale.set(0.9, 1, 1);
    this.openMouth.visible = false;

    this.group.add(this.leftEye, this.rightEye, this.smile, this.openMouth);
    this.setFace('neutral');
  }

  setFace(state: FaceState, weight = 1): void {
    const base = FACE_POSES.neutral;
    const target = FACE_POSES[state];
    const mix = (a: number, b: number): number => a + (b - a) * weight;
    const eyeOpen = mix(base.eyeOpen, target.eyeOpen);
    const eyeWide = mix(base.eyeWide, target.eyeWide);
    const mouthOpen = mix(base.mouthOpen, target.mouthOpen);
    const smile = mix(base.smile, target.smile);

    for (const eye of [this.leftEye, this.rightEye]) {
      eye.scale.set(0.85 * eyeWide, 1.15 * eyeOpen, 1);
    }

    // The curve flips through flat into a frown, so one shape covers the whole
    // emotional range without adding geometry.
    const curved = Math.abs(smile) > 0.05;
    this.smile.visible = curved && mouthOpen < 0.35;
    this.smile.rotation.z = smile >= 0 ? Math.PI + Math.PI * 0.09 : -Math.PI * 0.09;
    this.smile.scale.set(1, Math.min(1.4, 0.5 + Math.abs(smile)), 0.35);
    this.smile.position.y = smile >= 0 ? -0.035 : -0.085;

    this.openMouth.visible = mouthOpen >= 0.15;
    this.openMouth.scale.set(0.9, 0.6 + mouthOpen * 1.4, 1);
  }
}

class ToyboxCharacter implements Entity {
  readonly kind = 'character' as const;
  readonly object3d: THREE.Object3D;
  readonly rig: PoseableRig;
  private readonly rigImpl: ToyboxRig;
  private readonly face = new ToyboxFace();
  private currentFace: FaceState = 'neutral';

  constructor(
    readonly id: string,
    scale = 1,
  ) {
    this.rigImpl = new ToyboxRig(scale);
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

export const createToyboxObserver: CharacterFactory = ({ id, parameters }) => {
  const scale = typeof parameters.scale === 'number' ? parameters.scale : 1;
  return new ToyboxCharacter(id, scale);
};

export const TOYBOX_CHARACTER_FACTORIES: Record<string, CharacterFactory> = {
  'character.observer': createToyboxObserver,
};
