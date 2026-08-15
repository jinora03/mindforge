/**
 * The humanoid rig contract. Both `@mindforge/characters` (which builds the
 * rig) and `@mindforge/motions` (which poses it) import these names and this
 * interface from the Engine, so neither package depends on the other. The
 * Engine itself stays lore-free: it only knows there is a poseable skeleton.
 */

/** Canonical joint names. Characters must provide these; motions target them. */
export const HUMANOID_JOINTS = [
  'hips',
  'spine',
  'chest',
  'neck',
  'head',
  'shoulderLeft',
  'shoulderRight',
  'elbowLeft',
  'elbowRight',
  'wristLeft',
  'wristRight',
  'hipLeft',
  'hipRight',
  'kneeLeft',
  'kneeRight',
  'ankleLeft',
  'ankleRight',
] as const;

export type HumanoidJoint = (typeof HUMANOID_JOINTS)[number];

/** Canonical world-space anchor names exposed for effects and cameras. */
export const HUMANOID_ANCHORS = [
  'head',
  'chest',
  'ribLeft',
  'ribRight',
  'shoulderLeft',
  'shoulderRight',
  'elbowLeft',
  'elbowRight',
  'handLeft',
  'handRight',
  'footLeft',
  'footRight',
] as const;

export type HumanoidAnchor = (typeof HUMANOID_ANCHORS)[number];

/**
 * Additive posing surface. Every frame the character resets to its rest pose;
 * motions then layer offsets through these methods. Because all offsets are
 * additive and derived purely from playback time, several motions (a base gait
 * plus additive secondary motion) compose deterministically.
 */
export interface PoseableRig {
  hasJoint(name: string): boolean;
  /** Add a local Euler rotation offset (radians) on top of the joint's rest. */
  rotateJoint(name: string, x: number, y: number, z: number): void;
  /** Add a root position offset (metres). */
  offsetRoot(x: number, y: number, z: number): void;
  /** Add a root Euler rotation offset (radians). */
  rotateRoot(x: number, y: number, z: number): void;
}
