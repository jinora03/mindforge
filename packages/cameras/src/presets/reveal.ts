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
  const radius = Math.max(5.6, readNumber(event, 'radius', 5.8));
  const height = readNumber(event, 'height', 2.1);
  const startAngle = readNumber(event, 'startAngle', -0.55);
  const endAngle = readNumber(event, 'endAngle', 0.5);

  return new CameraDirector({
    target,
    startOffset: new THREE.Vector3(Math.sin(startAngle) * radius, height, Math.cos(startAngle) * radius),
    endOffset: new THREE.Vector3(Math.sin(endAngle) * radius, height, Math.cos(endAngle) * radius),
    startFov: event.fov ?? 48,
    endFov: event.fov ?? 46,
    framingOffset: readVec3(event.framingOffset, new THREE.Vector3(0, 0.9, 0)),
    fitTarget: true,
    fitPadding: 1.14,
    minDistance: 5.6,
    camera: services.camera,
  });
};
