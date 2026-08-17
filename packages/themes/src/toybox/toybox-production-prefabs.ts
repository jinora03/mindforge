import * as THREE from 'three';
import type { PrefabFactory, PrefabInstance } from '@mindforge/engine';
import {
  TOYBOX_PALETTE,
  ballGeometry,
  moulded,
  plastic,
  studGeometry,
  toyMetal,
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

function studs(parent: THREE.Object3D, color: string, cols: number, z: number, y: number): void {
  const mesh = new THREE.InstancedMesh(studGeometry(0.075, 0.05), plastic(color), cols);
  const matrix = new THREE.Matrix4();
  for (let i = 0; i < cols; i++) {
    matrix.makeTranslation((i - (cols - 1) / 2) * 0.32, y, z);
    mesh.setMatrixAt(i, matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = true;
  parent.add(mesh);
}

export const createToyboxMaterialSamples: PrefabFactory = (): PrefabInstance => {
  const root = new THREE.Group();
  root.name = 'toybox.materialSamples';
  root.add(part(moulded(3.1, 0.28, 1.35), plastic(TOYBOX_PALETTE.stone), [0, 0.14, 0]));
  studs(root, TOYBOX_PALETTE.stone, 8, 0, 0.31);

  const metalMaterial = toyMetal('#BECBD1');
  metalMaterial.emissive = new THREE.Color('#FF7A35');
  metalMaterial.emissiveIntensity = 0;
  const metal = part(moulded(1.05, 0.62, 0.9), metalMaterial, [-0.82, 0.59, 0]);
  metal.name = 'metal';
  root.add(metal);
  studs(metal, '#BECBD1', 3, 0, 0.34);

  const woodMaterial = plastic('#C88748', { roughness: 0.62, emissive: '#FF9B54', emissiveIntensity: 0 });
  const wood = part(moulded(1.05, 0.62, 0.9), woodMaterial, [0.82, 0.59, 0]);
  wood.name = 'wood';
  root.add(wood);
  studs(wood, '#D99B59', 3, 0, 0.34);

  const metalSurface = new THREE.Object3D();
  metalSurface.position.set(0, 0.34, 0.42);
  metal.add(metalSurface);
  const woodSurface = new THREE.Object3D();
  woodSurface.position.set(0, 0.34, 0.42);
  wood.add(woodSurface);
  return { object3d: root, anchors: { metal, wood, metalSurface, woodSurface } };
};

export const createToyboxBalloon: PrefabFactory = ({ parameters }): PrefabInstance => {
  const root = new THREE.Group();
  root.name = 'toybox.balloon';
  const color = typeof parameters.color === 'string' ? parameters.color : '#EF5670';
  const material = plastic(color, { roughness: 0.24 });
  const body = part(ballGeometry(0.58, 20), material);
  body.scale.set(0.92, 1.18, 0.92);
  body.name = 'body';
  root.add(body);
  const knot = part(moulded(0.18, 0.16, 0.16), material, [0, -0.68, 0]);
  root.add(knot);
  root.add(part(tubeGeometry(0.018, 1.55, 8), plastic('#EFE6D4', { roughness: 0.7 }), [0, -1.47, 0]));
  const charge = new THREE.Object3D();
  charge.position.set(0.57, 0.12, 0.18);
  root.add(charge);
  return { object3d: root, anchors: { body, charge, knot } };
};

export const createToyboxDemoPanel: PrefabFactory = ({ parameters }): PrefabInstance => {
  const root = new THREE.Group();
  root.name = 'toybox.demoPanel';
  const color = typeof parameters.color === 'string' ? parameters.color : '#E3EBEC';
  const panel = part(moulded(0.48, 3.7, 3.2), plastic(color, { roughness: 0.46 }), [0, 1.85, 0]);
  root.add(panel);
  root.add(part(moulded(1.45, 0.28, 3.5), toyMetal('#AAB8BC'), [0, 0.14, 0]));
  const surface = new THREE.Object3D();
  surface.position.set(0.28, 2.0, 0);
  root.add(surface);
  return { object3d: root, anchors: { surface, panel } };
};

export const createToyboxFloatTank: PrefabFactory = (): PrefabInstance => {
  const root = new THREE.Group();
  root.name = 'toybox.floatTank';
  const glass = plastic('#C8EEFA', { transparent: true, opacity: 0.25, roughness: 0.08 });
  const water = part(moulded(2.35, 1.65, 1.65), plastic('#55B7E5', { transparent: true, opacity: 0.66, roughness: 0.18, emissive: '#2B8EC7', emissiveIntensity: 0.05 }), [0, 0.96, 0]);
  water.name = 'water';
  root.add(water);
  const frame = toyMetal('#9CADB3');
  for (const x of [-1.25, 1.25]) for (const z of [-0.9, 0.9]) root.add(part(moulded(0.12, 2.5, 0.12), frame, [x, 1.25, z]));
  root.add(part(moulded(2.55, 0.08, 1.9), glass, [0, 0.05, 0]));
  root.add(part(moulded(2.55, 2.45, 0.08), glass, [0, 1.25, -0.94]));
  root.add(part(moulded(0.08, 2.45, 1.9), glass, [-1.29, 1.25, 0]));
  root.add(part(moulded(0.08, 2.45, 1.9), glass, [1.29, 1.25, 0]));

  const ice = part(moulded(0.82, 0.7, 0.82), plastic('#DDF8FF', { transparent: true, opacity: 0.9, roughness: 0.16, emissive: '#8FDDF7', emissiveIntensity: 0.12 }), [0, 2.55, 0]);
  ice.name = 'ice';
  root.add(ice);
  studs(ice, '#E9FBFF', 2, 0, 0.37);
  const surface = new THREE.Object3D();
  surface.position.set(0, 1.8, 0);
  root.add(surface);
  return { object3d: root, anchors: { water, ice, surface } };
};

export const createToyboxBowlSpoon: PrefabFactory = (): PrefabInstance => {
  const root = new THREE.Group();
  root.name = 'toybox.bowlSpoon';
  const ceramic = plastic('#F5F6F0', { roughness: 0.34 });
  const soupMaterial = plastic('#C95E35', { roughness: 0.42, emissive: '#FF6A32', emissiveIntensity: 0.13 });
  root.add(part(new THREE.CylinderGeometry(1.35, 1.05, 0.78, 24, 1, true), ceramic, [0, 0.42, 0]));
  root.add(part(new THREE.CylinderGeometry(1.03, 1.03, 0.18, 24), ceramic, [0, 0.12, 0]));
  const soup = part(new THREE.CylinderGeometry(1.18, 1.18, 0.16, 24), soupMaterial, [0, 0.67, 0]);
  soup.name = 'soup';
  root.add(soup);

  const spoonMaterial = toyMetal('#C6D1D7');
  spoonMaterial.emissive = new THREE.Color('#FF7D38');
  spoonMaterial.emissiveIntensity = 0;
  const spoon = new THREE.Group();
  spoon.name = 'spoon';
  const handle = part(moulded(0.17, 2.7, 0.17), spoonMaterial, [0, 1.35, 0]);
  handle.name = 'handle';
  spoon.add(handle);
  const bowl = part(ballGeometry(0.32, 14), spoonMaterial, [0, -0.03, 0]);
  bowl.scale.set(1.0, 0.28, 0.7);
  spoon.add(bowl);
  spoon.rotation.z = -0.42;
  spoon.position.set(0.35, 0.64, 0);
  root.add(spoon);

  const soupSurface = new THREE.Object3D();
  soupSurface.position.set(-0.25, 0.76, 0.2);
  root.add(soupSurface);
  const handleTip = new THREE.Object3D();
  handleTip.position.set(0, 2.72, 0);
  spoon.add(handleTip);
  return { object3d: root, anchors: { soup, spoon, handle, soupSurface, handleTip } };
};

export const TOYBOX_PRODUCTION_PREFAB_FACTORIES: Record<string, PrefabFactory> = {
  'prefab.materialSamples': createToyboxMaterialSamples,
  'prefab.balloon': createToyboxBalloon,
  'prefab.demoPanel': createToyboxDemoPanel,
  'prefab.floatTank': createToyboxFloatTank,
  'prefab.bowlSpoon': createToyboxBowlSpoon,
};
