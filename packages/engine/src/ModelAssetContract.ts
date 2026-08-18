import * as THREE from 'three';
import type { AssetDescriptor, ModelAssetProfile } from './EngineTypes';

/**
 * Validate only the authored semantic surface needed by runtime construction.
 * Heavier mesh/material/triangle budget checks live in the PF2 build-time asset
 * validator so browser preload remains inexpensive.
 */
export function validateRuntimeModelContract(
  descriptor: AssetDescriptor,
  root: THREE.Object3D,
  animations: readonly THREE.AnimationClip[],
): string[] {
  const errors: string[] = [];
  const nodeCounts = countNodeNames(root);

  for (const [semanticName, nodeName] of Object.entries(descriptor.anchors ?? {})) {
    const count = nodeCounts.get(nodeName) ?? 0;
    if (count === 0) {
      errors.push(
        `missing authored anchor node "${nodeName}" for semantic anchor "${semanticName}"`,
      );
    } else if (count > 1) {
      errors.push(
        `authored anchor node "${nodeName}" for semantic anchor "${semanticName}" is not unique (${count} matches)`,
      );
    }
  }

  const clipCounts = countClipNames(animations);
  for (const [semanticName, clipName] of Object.entries(descriptor.model?.clips ?? {})) {
    const count = clipCounts.get(clipName) ?? 0;
    if (count === 0) {
      errors.push(
        `missing authored animation clip "${clipName}" for semantic clip "${semanticName}"`,
      );
    } else if (count > 1) {
      errors.push(
        `authored animation clip "${clipName}" for semantic clip "${semanticName}" is not unique (${count} matches)`,
      );
    }
  }

  return errors;
}

/** Apply DCC/vendor normalization plus theme-independent shadow policy. */
export function applyModelAssetProfile(root: THREE.Object3D, profile?: ModelAssetProfile): void {
  if (!profile) return;

  const transform = profile.importTransform;
  if (transform?.scale !== undefined) root.scale.multiplyScalar(transform.scale);
  if (transform?.rotation) root.rotation.set(...transform.rotation);
  if (transform?.offset) root.position.add(new THREE.Vector3(...transform.offset));

  if (profile.castShadow === undefined && profile.receiveShadow === undefined) return;
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    if (profile.castShadow !== undefined) mesh.castShadow = profile.castShadow;
    if (profile.receiveShadow !== undefined) mesh.receiveShadow = profile.receiveShadow;
  });
}

/** Resolve semantic animation ids against already-cloned scene-owned clips. */
export function resolveSemanticModelClips(
  descriptor: AssetDescriptor,
  animations: readonly THREE.AnimationClip[],
): Readonly<Record<string, THREE.AnimationClip>> {
  const byAuthoredName = new Map(animations.map((clip) => [clip.name, clip]));
  const clips: Record<string, THREE.AnimationClip> = {};
  for (const [semanticName, authoredName] of Object.entries(descriptor.model?.clips ?? {})) {
    const clip = byAuthoredName.get(authoredName);
    if (!clip) {
      throw new Error(
        `Model asset "${descriptor.id}" is missing authored animation clip "${authoredName}" for semantic clip "${semanticName}".`,
      );
    }
    clips[semanticName] = clip;
  }
  return clips;
}

function countNodeNames(root: THREE.Object3D): Map<string, number> {
  const counts = new Map<string, number>();
  root.traverse((object) => {
    if (!object.name) return;
    counts.set(object.name, (counts.get(object.name) ?? 0) + 1);
  });
  return counts;
}

function countClipNames(animations: readonly THREE.AnimationClip[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const clip of animations) {
    if (!clip.name) continue;
    counts.set(clip.name, (counts.get(clip.name) ?? 0) + 1);
  }
  return counts;
}
