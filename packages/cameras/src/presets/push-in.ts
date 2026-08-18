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
    startOffset: readVec3(event.from, new THREE.Vector3(0, 1.1, 7.2)),
    endOffset: readVec3(event.to, new THREE.Vector3(0, 0.9, 5.2)),
    startFov: event.fov ?? 48,
    endFov: event.fov ?? 43,
    framingOffset: readVec3(event.framingOffset, new THREE.Vector3(0, 0.8, 0)),
    fitTarget: true,
    fitPadding: 1.08,
    minDistance: 4.8,
    camera: services.camera,
  });
};
