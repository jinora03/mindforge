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
    startOffset: readVec3(event.from, new THREE.Vector3(0, 1.25, 2.5)),
    endOffset: readVec3(event.to, new THREE.Vector3(0, 1.2, 2.3)),
    startFov: event.fov ?? 32,
    endFov: event.fov ?? 31,
    framingOffset: readVec3(event.framingOffset, new THREE.Vector3(0, 1.3, 0)),
  });
};
