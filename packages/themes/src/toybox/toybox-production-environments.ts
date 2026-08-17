import * as THREE from 'three';
import {
  disposeObject3D,
  type CameraState,
  type EnvironmentFactory,
  type EnvironmentInstance,
} from '@mindforge/engine';
import {
  ballGeometry,
  brickGeometry,
  createToyLighting,
  createToySky,
  moulded,
  plastic,
  studGeometry,
  toyMetal,
  tubeGeometry,
} from './toybox-style';

function cameraState(
  position: [number, number, number],
  target: [number, number, number],
  fov: number,
): CameraState {
  return { position: new THREE.Vector3(...position), target: new THREE.Vector3(...target), fov };
}

function mesh(
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  position: [number, number, number],
  castShadow = true,
): THREE.Mesh {
  const value = new THREE.Mesh(geometry, material);
  value.position.set(...position);
  value.castShadow = castShadow;
  value.receiveShadow = true;
  return value;
}

function brick(
  size: [number, number, number],
  color: string,
  position: [number, number, number],
  options: Parameters<typeof plastic>[1] = {},
  castShadow = true,
): THREE.Mesh {
  return mesh(brickGeometry(...size), plastic(color, options), position, castShadow);
}

function studStrip(
  count: number,
  spacing: number,
  color: string,
  position: [number, number, number],
  along: 'x' | 'z' = 'x',
): THREE.InstancedMesh {
  const studs = new THREE.InstancedMesh(studGeometry(0.085, 0.055), plastic(color), count);
  const matrix = new THREE.Matrix4();
  for (let i = 0; i < count; i++) {
    const offset = (i - (count - 1) / 2) * spacing;
    matrix.makeTranslation(position[0] + (along === 'x' ? offset : 0), position[1], position[2] + (along === 'z' ? offset : 0));
    studs.setMatrixAt(i, matrix);
  }
  studs.instanceMatrix.needsUpdate = true;
  studs.castShadow = true;
  studs.receiveShadow = true;
  return studs;
}

function baseFloor(group: THREE.Group, color: string, accent: string): void {
  group.add(brick([28, 0.55, 24], color, [0, -0.31, -2], {}, false));
  for (let x = -12; x <= 12; x += 4) group.add(studStrip(20, 1.0, accent, [x, -0.005, -2], 'z'));
}

function finish(scene: THREE.Scene, group: THREE.Group, camera: CameraState): EnvironmentInstance {
  return {
    object3d: group,
    defaultCamera: camera,
    update(): void {},
    dispose(): void {
      disposeObject3D(group);
      group.removeFromParent();
      scene.fog = null;
      scene.background = null;
    },
  };
}

/** Moulded-plastic science room with a central experiment table. */
export const createToyboxMaterialLab: EnvironmentFactory = ({ services }): EnvironmentInstance => {
  const scene = services.scene;
  const group = new THREE.Group();
  group.name = 'toybox.environment.materialLab';
  scene.background = new THREE.Color('#B7DAEA');
  scene.fog = new THREE.Fog('#B7DAEA', 42, 98);
  group.add(createToySky({ bands: ['#79BFE2', '#9DD5EA', '#C5EAF5', '#E7F7FB'] }));
  baseFloor(group, '#C9D7DA', '#A9BABF');

  group.add(brick([28, 8.8, 0.55], '#E6EEF0', [0, 4.25, -12.15], {}, false));
  group.add(brick([9.6, 0.5, 2.9], '#F4D39A', [0, 1.25, -2.9]));
  for (const x of [-4.15, 4.15]) for (const z of [-3.8, -2.0]) group.add(mesh(tubeGeometry(0.13, 1.3, 10), toyMetal(), [x, 0.62, z]));
  group.add(studStrip(13, 0.62, '#F4D39A', [0, 1.52, -2.9]));

  for (const side of [-1, 1]) {
    const sx = side * 9.6;
    for (let level = 0; level < 3; level++) {
      group.add(brick([5.6, 0.28, 1.5], '#B8D6DE', [sx, 1.1 + level * 1.8, -9.4]));
      group.add(studStrip(8, 0.63, '#B8D6DE', [sx, 1.25 + level * 1.8, -9.4]));
    }
  }

  const screen = plastic('#70DDF4', { emissive: '#47C5E8', emissiveIntensity: 0.5, roughness: 0.18 });
  group.add(mesh(moulded(8.0, 0.15, 0.1), screen, [0, 5.85, -11.8], false));
  for (const x of [-7.2, -2.4, 2.4, 7.2]) group.add(brick([3.1, 2.2, 0.08], '#83CAE5', [x, 6.45, -11.78], { transparent: true, opacity: 0.74 }, false));

  group.add(createToyLighting({ shadowExtent: 18 }));
  return finish(scene, group, cameraState([3.6, 2.7, 7.6], [0, 1.2, -0.8], 44));
};

/** Cheerful classroom/demo room for static, airflow and simple mechanics. */
export const createToyboxClassroomLab: EnvironmentFactory = ({ services }): EnvironmentInstance => {
  const scene = services.scene;
  const group = new THREE.Group();
  group.name = 'toybox.environment.classroomLab';
  scene.background = new THREE.Color('#C7E6F4');
  scene.fog = new THREE.Fog('#C7E6F4', 45, 104);
  group.add(createToySky({ bands: ['#8AC9E6', '#A7DDEF', '#D2EFF7', '#EDF9FC'] }));
  baseFloor(group, '#E5D9BE', '#D0C198');

  group.add(brick([30, 8.8, 0.55], '#F3EBD8', [0, 4.25, -13.15], {}, false));
  group.add(brick([9.4, 3.1, 0.16], '#315F58', [0, 4.45, -12.77], { roughness: 0.7 }, false));
  group.add(brick([10.0, 0.2, 0.3], '#F4D2A0', [0, 2.85, -12.62], {}, false));

  for (let row = 0; row < 3; row++) {
    for (let col = -2; col <= 2; col++) {
      if (row === 2 && Math.abs(col) < 2) continue;
      const x = col * 4.8;
      const z = -5.5 + row * 4.0;
      group.add(brick([3.2, 0.32, 1.35], '#F6CF88', [x, 1.05, z]));
      group.add(studStrip(5, 0.56, '#F6CF88', [x, 1.23, z]));
      for (const dx of [-1.2, 1.2]) for (const dz of [-0.42, 0.42]) group.add(mesh(tubeGeometry(0.07, 0.96, 9), toyMetal(), [x + dx, 0.48, z + dz]));
    }
  }

  for (const x of [-11.0, -7.2, 7.2, 11.0]) group.add(brick([3.0, 2.45, 0.08], '#85CDE9', [x, 6.2, -12.8], { transparent: true, opacity: 0.72 }, false));
  for (const x of [-6, 0, 6]) {
    const lamp = plastic('#FFF0B0', { emissive: '#FFE078', emissiveIntensity: 0.75 });
    group.add(mesh(moulded(3.8, 0.1, 0.7), lamp, [x, 7.85, -2.8], false));
  }

  group.add(createToyLighting({ shadowExtent: 18 }));
  return finish(scene, group, cameraState([3.8, 2.7, 8.4], [0, 1.3, -1.3], 45));
};

/** Warm modular kitchen island suitable for water, pressure and cooking demos. */
export const createToyboxKitchenLab: EnvironmentFactory = ({ services }): EnvironmentInstance => {
  const scene = services.scene;
  const group = new THREE.Group();
  group.name = 'toybox.environment.kitchenLab';
  scene.background = new THREE.Color('#D3E5EC');
  scene.fog = new THREE.Fog('#D3E5EC', 42, 98);
  group.add(createToySky({ bands: ['#9CCFE4', '#B9E0EE', '#DCEFF5', '#F2FAFC'] }));
  baseFloor(group, '#D8C9AE', '#C5B494');

  group.add(brick([28, 8.8, 0.55], '#F1E8D9', [0, 4.25, -12.15], {}, false));
  group.add(brick([17, 0.38, 1.8], '#F3F0E8', [0, 2.5, -10.85]));
  for (let i = -3; i <= 3; i++) {
    group.add(brick([2.25, 2.2, 1.5], i % 2 ? '#F1C57D' : '#E9B868', [i * 2.45, 1.2, -10.9]));
    group.add(studStrip(4, 0.48, i % 2 ? '#F1C57D' : '#E9B868', [i * 2.45, 2.32, -10.9]));
  }

  group.add(brick([8.5, 0.42, 3.05], '#F7F3E9', [0, 1.56, -2.7]));
  group.add(brick([7.6, 1.45, 2.35], '#E9B868', [0, 0.72, -2.7]));
  group.add(studStrip(11, 0.62, '#F7F3E9', [0, 1.79, -2.7]));

  // Sink, taps and cooktop as chunky reusable scenery.
  group.add(brick([3.0, 0.18, 1.3], '#AEBCC1', [-5.6, 2.72, -10.7], { metalness: 0.45, roughness: 0.34 }));
  const tap = mesh(tubeGeometry(0.07, 1.0, 10), toyMetal(), [-5.6, 3.1, -11.05]);
  tap.rotation.z = Math.PI / 2;
  group.add(tap);
  for (const x of [3.8, 5.4]) for (const z of [-10.45, -11.15]) group.add(brick([1.05, 0.08, 0.75], '#30363A', [x, 2.72, z], { roughness: 0.65 }, false));

  group.add(brick([5.2, 3.0, 0.08], '#87D0EC', [0, 6.2, -11.8], { transparent: true, opacity: 0.74 }, false));
  for (const x of [-2.5, 2.5]) {
    const shade = mesh(ballGeometry(0.42, 12), plastic('#FFE39A', { emissive: '#FFD061', emissiveIntensity: 0.68 }), [x, 6.65, -2.7], false);
    shade.scale.y = 0.65;
    group.add(shade);
    group.add(mesh(tubeGeometry(0.04, 1.9, 8), toyMetal(), [x, 7.72, -2.7], false));
  }

  group.add(createToyLighting({ warm: true, shadowExtent: 18 }));
  return finish(scene, group, cameraState([3.5, 2.65, 7.6], [0, 1.35, -1.0], 43));
};

export const TOYBOX_PRODUCTION_ENVIRONMENT_FACTORIES: Record<string, EnvironmentFactory> = {
  'environment.materialLab': createToyboxMaterialLab,
  'environment.classroomLab': createToyboxClassroomLab,
  'environment.kitchenLab': createToyboxKitchenLab,
};
