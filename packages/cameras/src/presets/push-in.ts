import * as THREE from 'three';
import type { CameraFactory, CameraShot } from '@mindforge/engine';
import { CameraDirector } from '../CameraDirector';
import { readVec3 } from '../CameraTypes';

/** Move toward the target so it grows in meaning, not only in size. */
export const createPushInShot: CameraFactory = ({ event, services }): CameraShot => {
  const target = event.target ? services.resolveAnchor(event.target) : undefined;
  const absolute = Boolean(event.from && event.to);
  return new CameraDirector({
    target: absolute ? undefined : target,
    absolute,
    startOffset: readVec3(event.from, new THREE.Vector3(0, 0.6, 4.6)),
    endOffset: readVec3(event.to, new THREE.Vector3(0, 0.3, 2.5)),
    startFov: event.fov ?? 42,
    endFov: event.fov ?? 34,
    framingOffset: readVec3(event.framingOffset, new THREE.Vector3(0, 0.4, 0)),
  });
};
