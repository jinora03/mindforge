import * as THREE from 'three';
import type { PrefabFactory, PrefabInstance } from '@mindforge/engine';
import { PALETTE } from '@mindforge/style';

const blockMaterial = (
  color: string,
  emissive?: string,
  emissiveIntensity = 0,
  roughness = 0.55,
  metalness = 0.1,
): THREE.MeshStandardMaterial =>
  new THREE.MeshStandardMaterial({
    color,
    emissive: emissive ?? '#000000',
    emissiveIntensity,
    roughness,
    metalness,
    flatShading: true,
  });

/** Transitional faceted hand used only until the Voxel implementation lands. */
export const createLegacyExternalHand: PrefabFactory = (): PrefabInstance => {
  const root = new THREE.Group();
  const material = blockMaterial(PALETTE.plasmaRose, PALETTE.plasmaRose, 0.5);

  const palm = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.16, 0.05), material);
  root.add(palm);

  const fingers = new THREE.Group();
  fingers.position.set(0, 0.02, 0.08);
  root.add(fingers);

  const widths = [-0.045, 0, 0.045];
  const lengths = [0.11, 0.12, 0.11];
  for (let i = 0; i < 3; i++) {
    const finger = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, lengths[i]), material);
    finger.position.set(widths[i], 0, lengths[i] / 2);
    finger.rotation.x = -0.1;
    fingers.add(finger);
  }

  return { object3d: root, anchors: { palm, fingers } };
};

/** Transitional Heat Engine assembly; episode content targets only semantic anchors. */
export const createLegacyHeatEngine: PrefabFactory = (): PrefabInstance => {
  const root = new THREE.Group();

  const coreMaterial = blockMaterial('#2a1a55', PALETTE.signalPink, 0.15, 0.5, 0.1);
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.65, 0), coreMaterial);
  root.add(core);

  const mechanism = new THREE.Group();
  const mechanismMaterial = blockMaterial(PALETTE.forgeViolet, PALETTE.forgeViolet, 0.4);
  const gearSpecs: Array<{ size: [number, number, number]; position: [number, number, number]; rotation?: number }> = [
    { size: [0.22, 0.5, 0.22], position: [0.42, 0, 0] },
    { size: [0.18, 0.4, 0.18], position: [-0.25, 0.32, 0], rotation: 0.6 },
    { size: [0.18, 0.4, 0.18], position: [-0.25, -0.32, 0], rotation: -0.6 },
  ];
  for (const spec of gearSpecs) {
    const gear = new THREE.Mesh(
      new THREE.CylinderGeometry(spec.size[0], spec.size[0], spec.size[1], 6),
      mechanismMaterial,
    );
    gear.position.set(...spec.position);
    if (spec.rotation) gear.rotation.z = spec.rotation;
    mechanism.add(gear);
  }
  root.add(mechanism);

  const shell = new THREE.Group();
  const shellMaterial = blockMaterial('#1A0B38', PALETTE.forgeViolet, 0.08);
  const panelGeometry = new THREE.BoxGeometry(0.95, 0.95, 0.06);
  const panelSpecs: Array<{ position: [number, number, number]; rotation: [number, number, number] }> = [
    { position: [0, 0, 0.78], rotation: [0, 0, 0] },
    { position: [0, 0, -0.78], rotation: [0, Math.PI, 0] },
    { position: [-0.78, 0, 0], rotation: [0, Math.PI / 2, 0] },
    { position: [0.78, 0, 0], rotation: [0, -Math.PI / 2, 0] },
  ];
  for (const spec of panelSpecs) {
    const panel = new THREE.Mesh(panelGeometry, shellMaterial);
    panel.position.set(...spec.position);
    panel.rotation.set(...spec.rotation);
    shell.add(panel);
  }
  root.add(shell);

  return { object3d: root, anchors: { core, mechanism, shell } };
};

/** Semantic information token entering the Heat Engine. */
export const createLegacyInformationShard: PrefabFactory = (): PrefabInstance => {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, 0.24, 0.24),
    blockMaterial(PALETTE.forgeViolet, PALETTE.forgeViolet, 0.8),
  );
  return { object3d: mesh };
};

/** Theme-owned story light so episode content no longer chooses a colour. */
export const createLegacyStoryLight: PrefabFactory = ({ parameters }): PrefabInstance => {
  const intensity = typeof parameters.intensity === 'number' ? parameters.intensity : 8;
  const distance = typeof parameters.distance === 'number' ? parameters.distance : 18;
  const light = new THREE.PointLight(new THREE.Color('#b48cff'), intensity, distance);
  return { object3d: light };
};

export const LEGACY_PREFAB_FACTORIES: Record<string, PrefabFactory> = {
  'prefab.externalHand': createLegacyExternalHand,
  'prefab.heatEngine': createLegacyHeatEngine,
  'prefab.informationShard': createLegacyInformationShard,
  'prefab.storyLight': createLegacyStoryLight,
};
