import * as THREE from 'three';
import type { CameraFactory, CameraShot } from '@mindforge/engine';
import { CameraDirector } from '../CameraDirector';
import { readNumber, readVec3 } from '../CameraTypes';

/**
 * A limited orbit that exposes a relationship hidden from the first angle. It
 * orbits no more than needed (Motion Bible: stop when the new relationship is
 * clear), sweeping a bounded arc rather than spinning.
 */
export const createRevealShot: CameraFactory = ({ event, services }): CameraShot => {
  const target = event.target ? services.resolveAnchor(event.target) : undefined;
  const radius = readNumber(event, 'radius', 4);
  const height = readNumber(event, 'height', 1.4);
  const startAngle = readNumber(event, 'startAngle', -0.55);
  const endAngle = readNumber(event, 'endAngle', 0.5);

  return new CameraDirector({
    target,
    startOffset: new THREE.Vector3(Math.sin(startAngle) * radius, height, Math.cos(startAngle) * radius),
    endOffset: new THREE.Vector3(Math.sin(endAngle) * radius, height, Math.cos(endAngle) * radius),
    startFov: event.fov ?? 40,
    endFov: event.fov ?? 38,
    framingOffset: readVec3(event.framingOffset, new THREE.Vector3(0, 0.6, 0)),
  });
};
