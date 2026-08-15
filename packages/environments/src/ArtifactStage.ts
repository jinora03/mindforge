import * as THREE from 'three';
import { PALETTE, color, createContourEnergy, createDarkStructure, createLighting } from '@mindforge/style';
import { disposeObject3D, type EnvironmentFactory, type EnvironmentInstance } from '@mindforge/engine';
import { createGradientBackdrop, makeCameraState } from './EnvironmentTypes';

/**
 * `environment.artifactStage` — a staging platform for machine / artifact
 * episodes (e.g. The Crucible). Central framing, layered depth structures
 * behind the hero, and the artifact lighting preset.
 */
export const createArtifactStage: EnvironmentFactory = ({ services }): EnvironmentInstance => {
  const scene = services.scene;
  const group = new THREE.Group();
  group.name = 'environment.artifactStage';

  scene.fog = new THREE.FogExp2(new THREE.Color(PALETTE.voidInk), 0.024);

  const backdrop = createGradientBackdrop(color('voidInk'), color('deepViolet'));
  group.add(backdrop);

  // Platform.
  const platform = new THREE.Mesh(
    new THREE.CylinderGeometry(3.1, 3.5, 0.35, 56),
    createDarkStructure({ color: 'deepViolet' }),
  );
  platform.position.y = -0.2;
  group.add(platform);

  // Depth structures: a slow ring of faint pillars behind the hero.
  const pillars = new THREE.Group();
  const pillarGeometry = new THREE.BoxGeometry(0.3, 6, 0.3);
  const pillarMaterial = createDarkStructure({ color: 'voidInk' });
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const pillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
    pillar.position.set(Math.cos(a) * 8, 1, Math.sin(a) * 8 - 2);
    pillars.add(pillar);
  }
  group.add(pillars);

  // A faint ground contour ring to seat the hero.
  const ring = new THREE.Mesh(new THREE.TorusGeometry(3.3, 0.02, 8, 64), createContourEnergy({ opacity: 0.25 }));
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.02;
  group.add(ring);

  const lighting = createLighting('artifact');
  group.add(lighting);

  return {
    object3d: group,
    defaultCamera: makeCameraState([0, 2.8, 10.5], [0, 1.5, 0], 40),
    update(ctx): void {
      pillars.rotation.y = ctx.time * 0.015;
    },
    dispose(): void {
      disposeObject3D(group);
      group.removeFromParent();
      scene.fog = null;
      scene.background = null;
    },
  };
};
