import * as THREE from 'three';
import type { PrefabFactory, PrefabInstance, VisualTone } from '@mindforge/engine';
import {
  STUD,
  TOYBOX_PALETTE,
  ballGeometry,
  moulded,
  plastic,
  studGeometry,
  toyGlow,
  toyMetal,
  toyboxToneColor,
  tubeGeometry,
} from './toybox-style';

function part(
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  position: [number, number, number] = [0, 0, 0],
): THREE.Mesh {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/** Row of studs across the top of a part — the fastest toy signal available. */
function studRow(
  parent: THREE.Object3D,
  material: THREE.Material,
  cols: number,
  rows: number,
  y: number,
  spacing = STUD,
): void {
  const mesh = new THREE.InstancedMesh(studGeometry(spacing * 0.3, spacing * 0.2), material, cols * rows);
  const matrix = new THREE.Matrix4();
  let i = 0;
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      matrix.makeTranslation((c - (cols - 1) / 2) * spacing, y, (r - (rows - 1) / 2) * spacing);
      mesh.setMatrixAt(i++, matrix);
    }
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
}

/** Oversized moulded hand. Fingers are capsule-ish tubes, not blocks. */
export const createToyboxExternalHand: PrefabFactory = (): PrefabInstance => {
  const root = new THREE.Group();
  root.name = 'toybox.externalHand';
  const skin = plastic(TOYBOX_PALETTE.toySkin);
  const cuff = plastic(TOYBOX_PALETTE.cobalt);

  const palm = part(moulded(0.28, 0.3, 0.12), skin);
  root.add(palm);
  root.add(part(moulded(0.32, 0.11, 0.16), cuff, [0, -0.19, -0.01]));

  const fingers = new THREE.Group();
  fingers.name = 'fingers';
  fingers.position.set(0, 0.08, 0.08);
  root.add(fingers);

  const xs = [-0.093, -0.031, 0.031, 0.093];
  const lengths = [0.16, 0.2, 0.19, 0.155];
  const contact = new THREE.Object3D();
  contact.name = 'contact';
  for (let i = 0; i < xs.length; i++) {
    const finger = new THREE.Group();
    const tube = part(tubeGeometry(0.028, lengths[i], 10), skin);
    tube.rotation.x = Math.PI / 2;
    tube.position.z = lengths[i] / 2;
    finger.add(tube);
    finger.add(part(ballGeometry(0.028, 10), skin, [0, 0, lengths[i]]));
    finger.position.set(xs[i], 0, 0);
    finger.rotation.x = -0.05;

    if (i === 2) {
      contact.position.set(0, 0, lengths[i]);
      finger.add(contact);
    }
    fingers.add(finger);
  }

  const thumb = new THREE.Group();
  const thumbTube = part(tubeGeometry(0.032, 0.14, 10), skin);
  thumbTube.rotation.x = Math.PI / 2;
  thumbTube.position.z = 0.07;
  thumb.add(thumbTube);
  thumb.position.set(-0.16, -0.03, 0.02);
  thumb.rotation.y = -0.55;
  root.add(thumb);

  return { object3d: root, anchors: { palm, fingers, contact } };
};

/**
 * Toybox Heat Engine — a bright moulded machine, not a furnace.
 *
 * Same three semantic anchors as every other theme's engine. Materials under
 * `core` are created fresh here because the Heat episode animates
 * `machine.core`'s emissiveIntensity and the Engine's property track walks the
 * whole subtree; a shared material would leak that heat across the scene.
 */
export const createToyboxHeatEngine: PrefabFactory = (): PrefabInstance => {
  const root = new THREE.Group();
  root.name = 'toybox.heatEngine';

  const coreMaterial = plastic(TOYBOX_PALETTE.heatBright, {
    roughness: 0.18,
    emissive: TOYBOX_PALETTE.heat,
    emissiveIntensity: 0.15,
    transparent: true,
    opacity: 0.92,
  });
  const core = part(ballGeometry(0.44, 20), coreMaterial);
  core.name = 'core';
  root.add(core);
  // Inner lamp reads through the translucent shell as it heats.
  core.add(part(ballGeometry(0.24, 14), coreMaterial));

  const mechanism = new THREE.Group();
  mechanism.name = 'mechanism';
  const chrome = toyMetal();
  for (const axis of ['x', 'y', 'z'] as const) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.86, 0.055, 8, 28), chrome);
    if (axis === 'x') ring.rotation.y = Math.PI / 2;
    if (axis === 'y') ring.rotation.x = Math.PI / 2;
    ring.castShadow = true;
    mechanism.add(ring);
  }
  const knob = plastic(TOYBOX_PALETTE.tangerine);
  for (const p of [[0.86, 0, 0], [-0.86, 0, 0], [0, 0.86, 0], [0, -0.86, 0]] as [number, number, number][]) {
    mechanism.add(part(moulded(0.26, 0.26, 0.26), knob, p));
  }
  root.add(mechanism);

  const shell = new THREE.Group();
  shell.name = 'shell';
  const panel = plastic(TOYBOX_PALETTE.cobalt);
  const trim = plastic(TOYBOX_PALETTE.chrome, { roughness: 0.22 });
  const specs: Array<[[number, number, number], [number, number, number]]> = [
    [[1.4, 1.4, 0.14], [0, 0, 1.1]],
    [[1.4, 1.4, 0.14], [0, 0, -1.1]],
    [[0.14, 1.4, 1.4], [-1.1, 0, 0]],
    [[0.14, 1.4, 1.4], [1.1, 0, 0]],
  ];
  for (const [size, pos] of specs) {
    const pivot = new THREE.Group();
    const face = part(moulded(size[0], size[1], size[2]), panel, pos);
    pivot.add(face);
    // Studs on the outward face so the panels read as snapped-together plates.
    const studs = new THREE.Group();
    studs.position.set(pos[0] * 1.08, pos[1], pos[2] * 1.08);
    if (Math.abs(pos[2]) > 0) studs.rotation.x = pos[2] > 0 ? Math.PI / 2 : -Math.PI / 2;
    else studs.rotation.z = pos[0] > 0 ? -Math.PI / 2 : Math.PI / 2;
    studRow(studs, trim, 3, 3, 0, 0.42);
    pivot.add(studs);
    shell.add(pivot);
  }
  root.add(shell);

  const base = new THREE.Group();
  base.position.y = -1.15;
  base.add(part(moulded(2.1, 0.32, 2.1), plastic(TOYBOX_PALETTE.stone)));
  studRow(base, plastic(TOYBOX_PALETTE.stone), 5, 5, 0.16, 0.4);
  root.add(base);

  return { object3d: root, anchors: { core, mechanism, shell } };
};

const SHARD_TONES: readonly VisualTone[] = [
  'neutral', 'information', 'prediction', 'suppression', 'reaction', 'insight', 'heat',
];

/** A glossy studded cube — the Toybox stand-in for any semantic token. */
export const createToyboxInformationShard: PrefabFactory = ({ parameters }): PrefabInstance => {
  const requested = parameters.tone;
  const tone: VisualTone =
    typeof requested === 'string' && SHARD_TONES.includes(requested as VisualTone)
      ? (requested as VisualTone)
      : 'information';
  const color = toyboxToneColor(tone);
  const hex = `#${color.getHexString()}`;
  const root = new THREE.Group();
  root.name = 'toybox.informationShard';
  const material = plastic(hex, { roughness: 0.16, emissive: hex, emissiveIntensity: 0.3 });
  root.add(part(moulded(0.3, 0.3, 0.3), material));
  studRow(root, material, 2, 2, 0.15, 0.15);
  root.add(part(ballGeometry(0.08, 10), toyGlow(color, 0.9), [0, 0.26, 0]));
  return { object3d: root };
};

export const createToyboxStoryLight: PrefabFactory = ({ parameters }): PrefabInstance => {
  const intensity = typeof parameters.intensity === 'number' ? parameters.intensity : 8;
  const distance = typeof parameters.distance === 'number' ? parameters.distance : 18;
  const color = parameters.role === 'subject' ? '#FFF3D6' : TOYBOX_PALETTE.cream;
  const light = new THREE.PointLight(new THREE.Color(color), intensity, distance, 2);
  light.name = 'toybox.storyLight';
  return { object3d: light };
};

export const TOYBOX_PREFAB_FACTORIES: Record<string, PrefabFactory> = {
  'prefab.externalHand': createToyboxExternalHand,
  'prefab.heatEngine': createToyboxHeatEngine,
  'prefab.informationShard': createToyboxInformationShard,
  'prefab.storyLight': createToyboxStoryLight,
};
