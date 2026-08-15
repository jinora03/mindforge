import type { PoseableRig } from '@mindforge/engine';
import type { Pose } from './MotionTypes';

/** Swap a joint's side for mirrored motions. */
export function mirrorJointName(name: string): string {
  if (name.endsWith('Left')) return `${name.slice(0, -4)}Right`;
  if (name.endsWith('Right')) return `${name.slice(0, -5)}Left`;
  return name;
}

/**
 * Apply a {@link Pose} to a rig additively, scaled by `intensity` and
 * optionally mirrored left↔right. Because the rig resets to rest each frame and
 * accumulates offsets, several blended motions compose deterministically.
 */
export function applyPoseToRig(
  rig: PoseableRig,
  pose: Pose,
  intensity: number,
  mirror: boolean,
): void {
  const flip = mirror ? -1 : 1;
  for (const [joint, offset] of pose.joints) {
    const name = mirror ? mirrorJointName(joint) : joint;
    rig.rotateJoint(name, offset[0] * intensity, offset[1] * intensity * flip, offset[2] * intensity * flip);
  }
  rig.offsetRoot(
    pose.rootPos[0] * intensity * flip,
    pose.rootPos[1] * intensity,
    pose.rootPos[2] * intensity,
  );
  rig.rotateRoot(
    pose.rootRot[0] * intensity,
    pose.rootRot[1] * intensity * flip,
    pose.rootRot[2] * intensity * flip,
  );
}
