import * as THREE from 'three';
import { PALETTE, color, createDarkStructure, createLighting } from '@mindforge/style';
import { disposeObject3D, type EnvironmentFactory, type EnvironmentInstance } from '@mindforge/engine';
import { createGradientBackdrop, makeCameraState } from './EnvironmentTypes';

const MOTE_COUNT = 34;

/**
 * `environment.dreamGarden` — a soft stage for mind / perception / prediction
 * episodes. Character-readable lighting, a gentle ground, and slow drifting
 * motes. Motion here is calm, never idle screensaver.
 */
export const createDreamGarden: EnvironmentFactory = ({ services }): EnvironmentInstance => {
  const scene = services.scene;
  const group = new THREE.Group();
  group.name = 'environment.dreamGarden';

  scene.fog = new THREE.FogExp2(new THREE.Color(PALETTE.deepViolet), 0.03);

  const backdrop = createGradientBackdrop(color('voidInk'), color('forgeViolet'));
  group.add(backdrop);

  // Soft ground the character stands on.
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(9, 48),
    createDarkStructure({ color: 'deepViolet' }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0;
  group.add(ground);

  // Drifting motes.
  const positions = new Float32Array(MOTE_COUNT * 3);
  const phases: number[] = [];
  for (let i = 0; i < MOTE_COUNT; i++) {
    const a = i * 2.399963229728653;
    const r = 1.5 + (i % 7) * 0.6;
    positions[i * 3] = Math.cos(a) * r;
    positions[i * 3 + 1] = 0.6 + (i % 5) * 0.5;
    positions[i * 3 + 2] = Math.sin(a) * r;
    phases.push((i / MOTE_COUNT) * Math.PI * 2);
  }
  const moteGeometry = new THREE.BufferGeometry();
  moteGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const moteMaterial = new THREE.PointsMaterial({
    size: 0.07,
    color: new THREE.Color(PALETTE.plasmaRose),
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
    toneMapped: false,
  });
  const motes = new THREE.Points(moteGeometry, moteMaterial);
  group.add(motes);

  const baseY = Float32Array.from(positions);
  const lighting = createLighting('character');
  group.add(lighting);

  return {
    object3d: group,
    defaultCamera: makeCameraState([0, 1.5, 4.8], [0, 1.15, 0], 40),
    update(ctx): void {
      const attr = moteGeometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < MOTE_COUNT; i++) {
        positions[i * 3 + 1] = baseY[i * 3 + 1] + Math.sin(ctx.time * 0.4 + phases[i]) * 0.18;
      }
      attr.needsUpdate = true;
      motes.rotation.y = ctx.time * 0.02;
    },
    dispose(): void {
      disposeObject3D(group);
      group.removeFromParent();
      scene.fog = null;
      scene.background = null;
    },
  };
};
