import * as THREE from 'three';
import { PALETTE, color, createLighting } from '@mindforge/style';
import { disposeObject3D, type EnvironmentFactory, type EnvironmentInstance } from '@mindforge/engine';
import { createGradientBackdrop, createStarfield, makeCameraState } from './EnvironmentTypes';

/**
 * `environment.cosmicVoid` — the shared violet cosmic atmosphere: a gradient
 * backdrop, controlled fog, and a minimal distant starfield. No contour
 * blanket; contours are earned by effects, not painted everywhere.
 */
export const createCosmicVoid: EnvironmentFactory = ({ services }): EnvironmentInstance => {
  const scene = services.scene;
  const group = new THREE.Group();
  group.name = 'environment.cosmicVoid';

  scene.fog = new THREE.FogExp2(new THREE.Color(PALETTE.voidInk), 0.02);

  const backdrop = createGradientBackdrop(color('voidInk'), color('deepViolet'));
  const stars = createStarfield(120, 46, color('forgeViolet'));
  const lighting = createLighting('mystery');
  group.add(backdrop, stars, lighting);

  return {
    object3d: group,
    defaultCamera: makeCameraState([0, 1.6, 8], [0, 1, 0], 42),
    update(ctx): void {
      stars.rotation.y = ctx.time * 0.01;
    },
    dispose(): void {
      disposeObject3D(group);
      group.removeFromParent();
      scene.fog = null;
      scene.background = null;
    },
  };
};
