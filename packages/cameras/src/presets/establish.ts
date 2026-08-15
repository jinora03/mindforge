import * as THREE from 'three';
import type { CameraFactory, CameraShot } from '@mindforge/engine';
import { CameraDirector } from '../CameraDirector';
import { readVec3 } from '../CameraTypes';

/** A wide establishing frame with a gentle push so the shot still reveals. */
export const createEstablishShot: CameraFactory = ({ event, services }): CameraShot => {
  const target = event.target ? services.resolveAnchor(event.target) : undefined;
  const absolute = Boolean(event.from && event.to);
  return new CameraDirector({
    target: absolute ? undefined : target,
    absolute,
    startOffset: readVec3(event.from, new THREE.Vector3(0, 2.2, 9)),
    endOffset: readVec3(event.to, new THREE.Vector3(0, 2.0, 8.2)),
    startFov: event.fov ?? 44,
    endFov: event.fov ?? 42,
    framingOffset: readVec3(event.framingOffset, new THREE.Vector3(0, 1, 0)),
    lookPoint: new THREE.Vector3(0, 0.6, 0),
  });
};
