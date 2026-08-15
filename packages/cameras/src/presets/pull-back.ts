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
    startOffset: readVec3(event.from, new THREE.Vector3(0, 0.4, 2.8)),
    endOffset: readVec3(event.to, new THREE.Vector3(0, 1.4, 7.4)),
    startFov: event.fov ?? 34,
    endFov: event.fov ?? 44,
    framingOffset: readVec3(event.framingOffset, new THREE.Vector3(0, 0.5, 0)),
  });
};
