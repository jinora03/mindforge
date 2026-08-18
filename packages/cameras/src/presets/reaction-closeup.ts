import * as THREE from 'three';
import type { CameraFactory, CameraShot } from '@mindforge/engine';
import { CameraDirector } from '../CameraDirector';
import { readVec3 } from '../CameraTypes';

/**
 * A close, deliberately *stable* frame on a character's face/upper body. Held
 * steady during an unexpected touch so the reaction reads clearly (the shot
 * moves almost not at all).
 */
export const createReactionCloseupShot: CameraFactory = ({ event, services }): CameraShot => {
  const target = event.target ? services.resolveAnchor(event.target) : undefined;
  return new CameraDirector({
    target,
    startOffset: readVec3(event.from, new THREE.Vector3(0, 1.55, 4.0)),
    endOffset: readVec3(event.to, new THREE.Vector3(0, 1.45, 3.6)),
    startFov: event.fov ?? 40,
    endFov: event.fov ?? 38,
    framingOffset: readVec3(event.framingOffset, new THREE.Vector3(0, 1.35, 0)),
    minDistance: 3.6,
    camera: services.camera,
  });
};
