import * as THREE from 'three';
import type { CameraFactory, CameraShot } from '@mindforge/engine';
import { CameraDirector } from '../CameraDirector';
import { readVec3 } from '../CameraTypes';

/** The pullback answer: reveal the whole relationship after the detail. */
export const createPullBackShot: CameraFactory = ({ event, services }): CameraShot => {
  const target = event.target ? services.resolveAnchor(event.target) : undefined;
  const absolute = Boolean(event.from && event.to);
  return new CameraDirector({
    target: absolute ? undefined : target,
    absolute,
    startOffset: readVec3(event.from, new THREE.Vector3(0, 1.4, 6.4)),
    endOffset: readVec3(event.to, new THREE.Vector3(0, 2.4, 10.2)),
    startFov: event.fov ?? 46,
    endFov: event.fov ?? 50,
    framingOffset: readVec3(event.framingOffset, new THREE.Vector3(0, 0.9, 0)),
    fitTarget: true,
    fitPadding: 1.24,
    minDistance: 6.4,
    camera: services.camera,
  });
};
