import * as THREE from 'three';
import {
  HUMANOID_ANCHORS,
  HUMANOID_JOINTS,
  type PoseableRig,
  type HumanoidJoint,
} from '@mindforge/engine';
import { createCharacterBody, createCharacterJoint } from '@mindforge/style';
import type { HumanoidOptions } from './CharacterTypes';

/**
 * A procedural, faceted, clearly-human rig. It exposes the canonical joints and
 * anchors from the Engine contract and implements {@link PoseableRig}: every
 * frame it resets to a rest pose, then motions layer additive offsets. It keeps
 * a fixed set of reused temporaries so posing allocates nothing per frame.
 */
export class HumanoidRig implements PoseableRig {
  /** Outer group — the episode's transform lives here and is never reset. */
  readonly object3d = new THREE.Group();
  /** Inner group — root offsets/rotations from motions apply here. */
  private readonly motionRoot = new THREE.Group();

  private readonly joints = new Map<string, THREE.Object3D>();
  private readonly rest = new Map<string, THREE.Quaternion>();
  private readonly anchors = new Map<string, THREE.Object3D>();
  private headJoint!: THREE.Object3D;

  private readonly bodyMaterial: THREE.Material;
  private readonly jointMaterial: THREE.Material;
  private readonly geometries: THREE.BufferGeometry[] = [];

  private readonly tmpEuler = new THREE.Euler();
  private readonly tmpQuat = new THREE.Quaternion();

  constructor(options: HumanoidOptions = {}) {
    this.object3d.name = 'humanoid';
    this.object3d.add(this.motionRoot);
    if (options.scale) this.object3d.scale.setScalar(options.scale);

    this.bodyMaterial = createCharacterBody();
    if (options.bodyColor) {
      (this.bodyMaterial as THREE.MeshStandardMaterial).color.copy(options.bodyColor);
    }
    this.jointMaterial = createCharacterJoint();

    this.build();
    // Capture the rest pose after construction.
    for (const [name, joint] of this.joints) {
      this.rest.set(name, joint.quaternion.clone());
    }
  }

  /* --------------------------------------------------------- PoseableRig -- */

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

  /** Reset to the rest pose. Called by the Engine before the timeline poses. */
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
    for (const geometry of this.geometries) geometry.dispose();
    this.bodyMaterial.dispose();
    this.jointMaterial.dispose();
    this.object3d.removeFromParent();
  }

  /* --------------------------------------------------------------- build -- */

  private build(): void {
    const hips = this.joint('hips', this.motionRoot, 0, 0.92, 0);
    this.limb(hips, 0, 0.06, 0, 0.28, 0.18, 0.16); // pelvis block

    const spine = this.joint('spine', hips, 0, 0.12, 0);
    const chest = this.joint('chest', spine, 0, 0.16, 0);
    this.limb(chest, 0, 0.08, 0, 0.34, 0.28, 0.18); // torso block
    this.accent(chest, 0, 0.02, 0, 0.05);

    const neck = this.joint('neck', chest, 0, 0.16, 0);
    const head = this.joint('head', neck, 0, 0.1, 0);
    this.headJoint = head;
    this.limbShape(head, new THREE.IcosahedronGeometry(0.13, 1), 0, 0.02, 0, this.bodyMaterial);

    // Arms.
    this.arm('Left', chest, -1);
    this.arm('Right', chest, 1);

    // Legs.
    this.leg('Left', hips, -1);
    this.leg('Right', hips, 1);

    // Torso anchors.
    this.anchor('chest', chest, 0, 0.08, 0.1);
    this.anchor('ribLeft', chest, -0.14, 0.0, 0.08);
    this.anchor('ribRight', chest, 0.14, 0.0, 0.08);
    this.anchor('head', head, 0, 0.02, 0.12);
  }

  private arm(side: 'Left' | 'Right', chest: THREE.Object3D, dir: number): void {
    const shoulder = this.joint(`shoulder${side}`, chest, dir * 0.2, 0.12, 0);
    // Rest: arms angled slightly outward so they clear the torso.
    shoulder.rotation.z = -dir * 0.14;
    this.accent(shoulder, 0, 0, 0, 0.055);
    this.limb(shoulder, 0, -0.13, 0, 0.07, 0.26, 0.07);

    const elbow = this.joint(`elbow${side}`, shoulder, 0, -0.27, 0);
    this.accent(elbow, 0, 0, 0, 0.045);
    this.limb(elbow, 0, -0.12, 0, 0.06, 0.24, 0.06);

    const wrist = this.joint(`wrist${side}`, elbow, 0, -0.25, 0);
    this.limb(wrist, 0, -0.05, 0.01, 0.06, 0.12, 0.04);

    this.anchor(`shoulder${side}`, shoulder, 0, 0, 0.05);
    this.anchor(`elbow${side}`, elbow, 0, 0, 0.04);
    this.anchor(`hand${side}`, wrist, 0, -0.1, 0.02);
  }

  private leg(side: 'Left' | 'Right', hips: THREE.Object3D, dir: number): void {
    const hip = this.joint(`hip${side}`, hips, dir * 0.1, -0.02, 0);
    this.limb(hip, 0, -0.22, 0, 0.1, 0.44, 0.1);

    const knee = this.joint(`knee${side}`, hip, 0, -0.46, 0);
    this.accent(knee, 0, 0, 0, 0.05);
    this.limb(knee, 0, -0.2, 0, 0.08, 0.4, 0.08);

    const ankle = this.joint(`ankle${side}`, knee, 0, -0.42, 0);
    this.limb(ankle, 0, -0.03, 0.06, 0.09, 0.06, 0.22);

    this.anchor(`foot${side}`, ankle, 0, -0.03, 0.05);
  }

  /* ------------------------------------------------------------- helpers -- */

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

  private limb(
    parent: THREE.Object3D,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
  ): void {
    this.limbShape(parent, new THREE.BoxGeometry(w, h, d), x, y, z, this.bodyMaterial);
  }

  private limbShape(
    parent: THREE.Object3D,
    geometry: THREE.BufferGeometry,
    x: number,
    y: number,
    z: number,
    material: THREE.Material,
  ): void {
    this.geometries.push(geometry);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    parent.add(mesh);
  }

  private accent(parent: THREE.Object3D, x: number, y: number, z: number, r: number): void {
    const geometry = new THREE.IcosahedronGeometry(r, 0);
    this.geometries.push(geometry);
    const mesh = new THREE.Mesh(geometry, this.jointMaterial);
    mesh.position.set(x, y, z);
    parent.add(mesh);
  }

  private anchor(name: string, parent: THREE.Object3D, x: number, y: number, z: number): void {
    if (!(HUMANOID_ANCHORS as readonly string[]).includes(name)) return;
    const object = new THREE.Object3D();
    object.name = `anchor:${name}`;
    object.position.set(x, y, z);
    parent.add(object);
    this.anchors.set(name, object);
  }
}
