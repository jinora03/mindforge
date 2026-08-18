import * as THREE from 'three';
import type { CameraFactory, CameraShot } from '@mindforge/engine';
import { CameraDirector } from '../CameraDirector';
import { readVec3 } from '../CameraTypes';

/**
 * Hold a frame and add a decaying shake for an impact beat. Used sparingly —
 * instability must be part of the concept (Motion Bible camera prohibitions).
 */
export const createImpactShakeShot: CameraFactory = ({ event, services }): CameraShot => {
  const target = event.target ? services.resolveAnchor(event.target) : undefined;
  const absolute = Boolean(event.from);
  const hold = readVec3(event.from, new THREE.Vector3(0, 1.4, 5.4));
  return new CameraDirector({
    target: absolute ? undefined : target,
    absolute,
    startOffset: hold,
    endOffset: readVec3(event.to, hold),
    startFov: event.fov ?? 46,
    endFov: event.fov ?? 46,
    framingOffset: readVec3(event.framingOffset, new THREE.Vector3(0, 0.9, 0)),
    fitTarget: true,
    fitPadding: 1.06,
    minDistance: 4.8,
    camera: services.camera,
    shake: event.shake ?? 0.16,
    shakeDecays: true,
  });
};
