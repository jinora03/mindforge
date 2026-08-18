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


function toyTree(group: THREE.Group, x: number, z: number, scale = 1): void {
  group.add(mesh(tubeGeometry(0.19 * scale, 2.45 * scale, 10), plastic('#76543A', { roughness: 0.72 }), [x, 1.18 * scale, z]));
  const leafA = plastic('#4E8B54', { roughness: 0.56 });
  const leafB = plastic('#67A55F', { roughness: 0.5 });
  for (const [dx, dy, dz, radius, material] of [
    [0, 2.65, 0, 0.95, leafA], [-0.55, 3.05, 0.12, 0.72, leafB], [0.58, 3.12, -0.08, 0.75, leafA], [0.05, 3.55, 0.1, 0.68, leafB],
  ] as const) group.add(mesh(ballGeometry(radius * scale, 14), material, [x + dx * scale, dy * scale, z + dz * scale], false));
}

function toyCloud(group: THREE.Group, x: number, y: number, z: number, scale = 1): void {
  const mat = plastic('#C9DCE4', { roughness: 0.48 });
  for (const [dx, dy, radius] of [[-1.3, 0, 1.1], [-0.35, 0.28, 1.35], [0.75, 0.18, 1.2], [1.55, -0.02, 0.92]] as const) {
    const puff = mesh(ballGeometry(radius * scale, 14), mat, [x + dx * scale, y + dy * scale, z], false);
    puff.scale.z = 0.55;
    group.add(puff);
  }
}

function toyRock(group: THREE.Group, x: number, z: number, scale = 1, color = '#818A87'): void {
  const rock = mesh(new THREE.DodecahedronGeometry(0.72 * scale, 0), plastic(color, { roughness: 0.7 }), [x, 0.5 * scale, z], false);
  rock.scale.set(1.1, 0.75, 0.95);
  group.add(rock);
}

function finish(
  scene: THREE.Scene,
  group: THREE.Group,
  camera: CameraState,
  update?: (time: number) => void,
): EnvironmentInstance {
  return {
    object3d: group,
    defaultCamera: camera,
    update(ctx): void {
      update?.(ctx.time);
    },
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



/** Modular toy vehicle interior with deterministic roadside motion. */
export const createToyboxVehicleCabin: EnvironmentFactory = ({ services }): EnvironmentInstance => {
  const scene = services.scene;
  const group = new THREE.Group();
  group.name = 'toybox.environment.vehicleCabin';
  scene.background = new THREE.Color('#95C6DC');
  scene.fog = new THREE.Fog('#95C6DC', 30, 78);
  group.add(createToySky({ bands: ['#72B8D8', '#94CBE2', '#BDE3F0', '#EAF8FC'] }));

  group.add(brick([14, 0.55, 18], '#48555E', [0, -0.28, -1], {}, false));
  group.add(brick([14, 0.38, 2.3], '#677680', [0, 1.3, -7.8], {}, false));
  group.add(brick([13.2, 0.22, 0.35], '#30383E', [0, 3.25, -7.1], {}, false));
  group.add(brick([11.2, 3.0, 0.08], '#91D9F1', [0, 3.7, -8.0], { transparent: true, opacity: 0.34, roughness: 0.08 }, false));

  const stripes = new THREE.Group();
  const stripeMat = plastic('#F6E79C', { emissive: '#E5D268', emissiveIntensity: 0.12, roughness: 0.62 });
  for (let i = 0; i < 9; i++) stripes.add(mesh(moulded(0.18, 0.12, 1.5), stripeMat, [-4.7, 0.72, -7.0 + i * 1.7], false));
  group.add(stripes);

  const dash = plastic('#72DCF5', { emissive: '#3AC1E7', emissiveIntensity: 0.52, roughness: 0.18 });
  for (const x of [-2.1, 0, 2.1]) group.add(mesh(moulded(1.35, 0.12, 0.15), dash, [x, 1.65, -6.55], false));
  group.add(createToyLighting({ warm: true, shadowExtent: 12 }));
  return finish(scene, group, cameraState([3.4, 2.25, 6.8], [0, 1.35, -1.8], 45), (time) => {
    stripes.position.z = (time * 3.4) % 1.7;
  });
};

/** Tall toy-science drop tower with scale marks and a clean central lane. */
export const createToyboxDropLab: EnvironmentFactory = ({ services }): EnvironmentInstance => {
  const scene = services.scene;
  const group = new THREE.Group();
  group.name = 'toybox.environment.dropLab';
  scene.background = new THREE.Color('#C3DCE8');
  scene.fog = new THREE.Fog('#C3DCE8', 44, 104);
  group.add(createToySky({ bands: ['#88C6E1', '#A8D9EB', '#D1EDF6', '#F2FBFD'] }));
  baseFloor(group, '#CCD5D8', '#B1BEC3');
  group.add(brick([24, 11.5, 0.55], '#E8EEF0', [0, 5.5, -10.9], {}, false));

  const metal = toyMetal();
  for (const x of [-3.4, 3.4]) group.add(mesh(tubeGeometry(0.09, 8.2, 12), metal, [x, 4.1, -4.2]));
  const top = mesh(moulded(7.2, 0.22, 1.3), metal, [0, 7.9, -4.2]);
  group.add(top);
  for (let i = 0; i < 8; i++) {
    const y = 0.8 + i * 0.82;
    group.add(mesh(moulded(0.65 + (i % 2) * 0.3, 0.06, 0.08), plastic('#36586B'), [4.25, y, -4.15], false));
  }
  const status = plastic('#75DEF5', { emissive: '#3DC1E5', emissiveIntensity: 0.52, roughness: 0.18 });
  group.add(mesh(moulded(4.2, 0.12, 0.1), status, [0, 8.55, -9.95], false));

  group.add(createToyLighting({ shadowExtent: 15 }));
  return finish(scene, group, cameraState([4.2, 3.2, 9.4], [0, 3.0, -3.1], 42));
};


/** Layered toy canyon for echoes, waves and distance demonstrations. */
export const createToyboxCanyon: EnvironmentFactory = ({ services }): EnvironmentInstance => {
  const scene = services.scene;
  const group = new THREE.Group();
  group.name = 'toybox.environment.canyon';
  scene.background = new THREE.Color('#9CC9DE');
  scene.fog = new THREE.Fog('#9CC9DE', 52, 130);
  group.add(createToySky({ bands: ['#75B8D7', '#98CCE1', '#C5E6F0', '#EDF8FB'] }));
  group.add(brick([36, 0.55, 38], '#C28B5D', [0, -0.31, -9], {}, false));

  // Central trail creates strong depth through the portrait composition.
  for (let i = 0; i < 8; i++) {
    const width = 6.8 - i * 0.42;
    group.add(brick([width, 0.08, 3.4], '#D4A678', [0, 0.02, 4 - i * 4.1], { roughness: 0.68 }, false));
  }

  const colors = ['#A86D4B', '#B67B53', '#895943', '#C18459'];
  for (const side of [-1, 1]) {
    for (let i = 0; i < 7; i++) {
      const x = side * (8.1 + (i % 2) * 1.0);
      const z = -2.2 - i * 3.45;
      const height = 5.7 + (i % 3) * 1.45;
      const width = 5.8 + (i % 2) * 0.7;
      group.add(brick([width, height, 3.8], colors[i % colors.length], [x, height / 2 - 0.02, z], { roughness: 0.72 }, false));
      for (let level = 1; level <= 3; level++) {
        group.add(brick([width + 0.35, 0.16, 4.0], colors[(i + level) % colors.length], [x, (height * level) / 4, z], { roughness: 0.65 }, false));
      }
      group.add(brick([2.2, 0.42, 1.6], '#D39A6B', [x - side * 2.1, height * 0.62, z + 0.4], { roughness: 0.62 }, false));
    }
  }

  group.add(brick([19, 8.8, 1.4], '#936047', [0, 4.2, -26], { roughness: 0.75 }, false));
  group.add(brick([15.5, 1.0, 2.0], '#B67650', [0, 2.4, -25.3], { roughness: 0.7 }, false));
  group.add(brick([12.0, 0.72, 1.8], '#C9885C', [0, 6.15, -25.1], { roughness: 0.68 }, false));

  for (const [x, z] of [[-4.8, -5], [4.4, -8], [-5.2, -15], [5.3, -18], [-6.2, 2], [6.7, -1]] as const) {
    const shrub = mesh(ballGeometry(0.52, 12), plastic('#6F9858', { roughness: 0.55 }), [x, 0.48, z], false);
    shrub.scale.set(1.15, 0.72, 1.0);
    group.add(shrub);
  }
  toyRock(group, -4.4, 1.3, 1.1, '#8B7362');
  toyRock(group, 5.1, -4.8, 0.85, '#977A64');
  toyRock(group, -5.7, -11.5, 0.75, '#806B5D');
  toyCloud(group, -7.5, 10.5, -28, 1.2);
  toyCloud(group, 8.0, 12.0, -31, 0.9);

  group.add(createToyLighting({ warm: true, shadowExtent: 26 }));
  return finish(scene, group, cameraState([5.8, 4.6, 13.8], [0, 2.4, -10], 49));
};

/** Bright rain meadow with deterministic falling droplets and a low sun break. */
export const createToyboxRainMeadow: EnvironmentFactory = ({ services }): EnvironmentInstance => {
  const scene = services.scene;
  const group = new THREE.Group();
  group.name = 'toybox.environment.rainMeadow';
  scene.background = new THREE.Color('#829FAF');
  scene.fog = new THREE.Fog('#829FAF', 48, 116);
  group.add(createToySky({ bands: ['#6E8E9F', '#87A9B9', '#AAC8D4', '#D5E6EC'] }));
  group.add(brick([36, 0.58, 32], '#6F9A55', [0, -0.32, -6], {}, false));

  for (const [x, y, z, sx, sy, sz, color] of [
    [-12, 0.8, -20, 11, 1.8, 9, '#567E49'], [11.5, 1.15, -22, 12, 2.5, 9, '#567E49'], [0, 0.55, -27, 18, 1.25, 7, '#567E49'],
    [-13.5, 0.25, -8, 6, 0.7, 7, '#7CA65E'], [13.5, 0.32, -10, 6, 0.8, 8, '#7CA65E'],
  ] as const) group.add(brick([sx, sy, sz], color, [x, y, z], { roughness: 0.62 }, false));

  for (let i = 0; i < 7; i++) group.add(brick([2.2, 0.13, 1.5], '#95A39E', [-3.2 + i * 0.95, 0.055, 4.2 - i * 2.45], { roughness: 0.5 }, false));
  const puddleMat = plastic('#75BDD1', { transparent: true, opacity: 0.58, roughness: 0.08, metalness: 0.05 });
  for (const [x, z, sx, sz] of [[-7.3, 1.8, 3.8, 1.5], [6.8, -4.2, 4.5, 1.8], [1.8, -12.2, 3.0, 1.25]] as const) {
    const water = mesh(moulded(sx, 0.04, sz), puddleMat, [x, 0.03, z], false);
    group.add(water);
  }

  for (const [x, z, scale] of [[-11.5, -5.5, 1.1], [10.2, -7.5, 0.95], [-8.8, -16.5, 0.85], [8.3, -18.2, 0.9]] as const) toyTree(group, x, z, scale);

  const fence = plastic('#957350', { roughness: 0.65 });
  for (const x of [-9, -6, -3, 0, 3, 6, 9]) group.add(mesh(tubeGeometry(0.08, 1.05, 8), fence, [x, 0.5, -14.2], false));
  group.add(mesh(moulded(18.2, 0.14, 0.14), fence, [0, 0.72, -14.2], false));
  group.add(mesh(moulded(18.2, 0.12, 0.12), fence, [0, 0.28, -14.2], false));

  const flowerColors = ['#FFD769', '#F297A7', '#EFF8FF', '#B1DF7C'];
  for (let i = 0; i < 18; i++) {
    const x = ((i * 7) % 21) - 10;
    const z = 2 - ((i * 11) % 15);
    group.add(mesh(tubeGeometry(0.018, 0.34, 6), plastic('#568448', { roughness: 0.7 }), [x, 0.17, z], false));
    group.add(mesh(ballGeometry(0.12, 8), plastic(flowerColors[i % flowerColors.length], { roughness: 0.38 }), [x, 0.42, z], false));
  }
  toyRock(group, -9.0, -1.5, 0.8, '#818B86');
  toyRock(group, 9.4, -12.5, 1.0, '#727E78');

  toyCloud(group, -8.2, 10.8, -25.5, 1.3);
  toyCloud(group, 0.2, 11.8, -29, 1.55);
  toyCloud(group, 9.0, 10.4, -26, 1.15);
  const sun = mesh(ballGeometry(1.15, 20), plastic('#FFF0A5', { emissive: '#FFE078', emissiveIntensity: 1.1, roughness: 0.16 }), [-10.5, 9.3, -28], false);
  sun.scale.z = 0.18;
  group.add(sun);
  const sunFill = new THREE.DirectionalLight('#FFF0B8', 0.5);
  sunFill.position.set(-8, 12, 4);
  group.add(sunFill);

  const rainMaterial = plastic('#C7EDFC', { transparent: true, opacity: 0.62, roughness: 0.06 });
  rainMaterial.depthWrite = false;
  const count = 88;
  const rain = new THREE.InstancedMesh(moulded(0.035, 0.82, 0.035), rainMaterial, count);
  rain.castShadow = false;
  const bases = Array.from({ length: count }, (_, i) => ({
    x: ((i * 37) % 33) - 16,
    y: 1 + ((i * 19) % 14),
    z: 5 - ((i * 23) % 34),
  }));
  const matrix = new THREE.Matrix4();
  const updateRain = (time: number): void => {
    for (let i = 0; i < count; i++) {
      const base = bases[i];
      const y = ((base.y - time * 8.3 + 28) % 14) + 0.45;
      matrix.makeTranslation(base.x, y, base.z);
      rain.setMatrixAt(i, matrix);
    }
    rain.instanceMatrix.needsUpdate = true;
  };
  updateRain(0);
  group.add(rain);
  group.add(createToyLighting({ shadowExtent: 24 }));
  return finish(scene, group, cameraState([5.4, 4.2, 13.2], [0, 2.0, -7.5], 48), updateRain);
};

/** Night overlook with layered toy ridges and city-like horizon points. */
export const createToyboxNightOverlook: EnvironmentFactory = ({ services }): EnvironmentInstance => {
  const scene = services.scene;
  const group = new THREE.Group();
  group.name = 'toybox.environment.nightOverlook';
  scene.background = new THREE.Color('#132844');
  scene.fog = new THREE.Fog('#132844', 58, 144);
  group.add(createToySky({ bands: ['#10213A', '#172F4E', '#244665', '#355F79'] }));
  group.add(brick([36, 0.58, 30], '#304B41', [0, -0.32, -6], {}, false));

  for (const [x, y, z, sx, sy, color] of [
    [-12, 2.3, -25, 15, 4.8, '#20333D'], [4, 1.7, -27, 17, 3.6, '#20333D'], [15, 2.8, -29, 14, 5.8, '#20333D'],
    [-15, 1.1, -20, 11, 2.5, '#29424A'], [10, 0.9, -22, 13, 2.0, '#29424A'],
  ] as const) group.add(brick([sx, sy, 3.0], color, [x, y, z], {}, false));

  group.add(brick([13, 0.58, 7], '#7C8588', [0, 0.05, -2.0], {}, false));
  for (let i = 0; i < 4; i++) group.add(brick([4.0 + i * 1.0, 0.22, 1.0], '#7C8588', [0, -0.02 + i * 0.18, 2.7 - i * 0.8], {}, false));
  const rail = toyMetal('#65747B');
  for (const x of [-5.8, -3.0, 0, 3.0, 5.8]) group.add(mesh(tubeGeometry(0.055, 1.05, 8), rail, [x, 0.82, -5.0]));
  group.add(mesh(moulded(11.8, 0.12, 0.12), rail, [0, 1.25, -5.0]));

  const city = plastic('#FFD67C', { emissive: '#F6C355', emissiveIntensity: 0.8, roughness: 0.2 });
  for (let i = 0; i < 34; i++) {
    const x = ((i * 17) % 31) - 15;
    const y = 0.55 + ((i * 11) % 6) * 0.22;
    const z = -18.5 - (i % 4) * 0.7;
    group.add(mesh(ballGeometry(0.06 + (i % 3) * 0.015, 8), city, [x, y, z], false));
  }

  const star = plastic('#F2FAFF', { emissive: '#DDF4FF', emissiveIntensity: 0.9, roughness: 0.15 });
  for (let i = 0; i < 52; i++) {
    const x = ((i * 31) % 34) - 17;
    const y = 5.2 + ((i * 17) % 10) * 0.82;
    const z = -26 - (i % 3) * 0.7;
    group.add(mesh(ballGeometry(0.04 + (i % 4) * 0.012, 8), star, [x, y, z], false));
  }

  for (const [x, z, scale] of [[-10.5, -8.5, 0.8], [10.0, -10.5, 0.9], [-13, -16, 0.7]] as const) toyTree(group, x, z, scale);
  const lamp = plastic('#FFD98A', { emissive: '#FFC85A', emissiveIntensity: 0.85, roughness: 0.2 });
  for (const x of [-5.2, 5.2]) {
    group.add(mesh(tubeGeometry(0.045, 2.0, 8), rail, [x, 1.0, -1.2]));
    group.add(mesh(ballGeometry(0.2, 10), lamp, [x, 2.05, -1.2], false));
    const point = new THREE.PointLight('#FFD98A', 0.65, 7, 2);
    point.position.set(x, 2.1, -1.2);
    group.add(point);
  }

  group.add(createToyLighting({ shadowExtent: 20 }));
  return finish(scene, group, cameraState([5.6, 4.0, 13.2], [0, 3.0, -9], 48));
};

/** Modular night observatory with a large telescope and open sky. */
export const createToyboxObservatory: EnvironmentFactory = ({ services }): EnvironmentInstance => {
  const scene = services.scene;
  const group = new THREE.Group();
  group.name = 'toybox.environment.observatory';
  scene.background = new THREE.Color('#0D1C35');
  scene.fog = new THREE.Fog('#0D1C35', 64, 154);
  group.add(createToySky({ bands: ['#09152A', '#102340', '#183453', '#244B6B'] }));
  group.add(brick([34, 0.58, 30], '#425750', [0, -0.32, -6], {}, false));

  group.add(brick([22, 0.58, 15], '#738084', [0, 0.08, -7], {}, false));
  group.add(brick([10, 0.75, 10], '#858E91', [-6.5, 0.3, -8], {}, false));

  // Rounded modular dome gives this environment a distinct silhouette.
  const dome = new THREE.Group();
  dome.position.set(5.7, 0.4, -10.5);
  const domeMat = plastic('#8F9EA4', { roughness: 0.42, metalness: 0.24 });
  for (const [radius, y, scaleY] of [[4.0, 0.65, 0.34], [3.45, 1.45, 0.38], [2.65, 2.2, 0.42], [1.6, 2.9, 0.5]] as const) {
    const shell = mesh(ballGeometry(radius, 18), domeMat, [0, y, 0], false);
    shell.scale.y = scaleY;
    dome.add(shell);
  }
  dome.add(brick([1.4, 3.1, 0.18], '#172A42', [0, 2.0, 3.35], { roughness: 0.7 }, false));
  group.add(dome);

  group.add(mesh(tubeGeometry(0.28, 3.6, 12), toyMetal('#8D9CA3'), [-6.5, 2.0, -8]));
  const tube = new THREE.Group();
  tube.position.set(-6.5, 3.5, -8);
  tube.rotation.z = -0.72;
  tube.add(mesh(tubeGeometry(0.42, 4.8, 14), toyMetal('#64737B'), [0, 0, 0]));
  tube.add(mesh(ballGeometry(0.58, 14), plastic('#9FE1F7', { emissive: '#68C8E8', emissiveIntensity: 0.38 }), [0, -2.45, 0]));
  group.add(tube);

  const screen = plastic('#78DFF4', { emissive: '#38C0E2', emissiveIntensity: 0.65, roughness: 0.16 });
  for (const [x, z] of [[-1.5, -5.0], [1.7, -5.6]] as const) {
    group.add(brick([2.2, 1.2, 1.2], '#4C626B', [x, 0.65, z], {}, false));
    group.add(mesh(moulded(1.45, 0.52, 0.06), screen, [x, 1.05, z + 0.62], false));
    group.add(studStrip(5, 0.28, '#5E7580', [x, 1.3, z]));
  }
  const railing = toyMetal('#71848C');
  for (const x of [-10, -5, 0, 5, 10]) group.add(mesh(tubeGeometry(0.05, 1.1, 8), railing, [x, 0.9, -14.2]));
  group.add(mesh(moulded(20.1, 0.11, 0.11), railing, [0, 1.35, -14.2]));

  const pathLight = plastic('#B9ECFF', { emissive: '#74D7F2', emissiveIntensity: 0.8, roughness: 0.16 });
  for (const [x, z] of [[-9, -1.8], [-5, -2.1], [-1, -2.5], [3, -2.9], [7, -3.3]] as const) {
    group.add(mesh(tubeGeometry(0.04, 0.85, 8), railing, [x, 0.42, z]));
    group.add(mesh(ballGeometry(0.16, 8), pathLight, [x, 0.94, z], false));
  }

  const star = plastic('#F7FBFF', { emissive: '#EAF7FF', emissiveIntensity: 0.92, roughness: 0.12 });
  for (let i = 0; i < 66; i++) {
    const x = ((i * 43) % 36) - 18;
    const y = 5.0 + ((i * 29) % 11) * 0.78;
    group.add(mesh(ballGeometry(0.04 + (i % 4) * 0.01, 8), star, [x, y, -29 - (i % 3) * 0.55], false));
  }
  toyRock(group, 12.0, -3.0, 1.0, '#63726D');
  toyRock(group, -12.2, -8.0, 0.8, '#5D6C67');

  group.add(createToyLighting({ shadowExtent: 22 }));
  return finish(scene, group, cameraState([6.2, 4.8, 14.2], [0, 3.7, -9.5], 49));
};

export const TOYBOX_PRODUCTION_ENVIRONMENT_FACTORIES: Record<string, EnvironmentFactory> = {
  'environment.materialLab': createToyboxMaterialLab,
  'environment.classroomLab': createToyboxClassroomLab,
  'environment.kitchenLab': createToyboxKitchenLab,
  'environment.vehicleCabin': createToyboxVehicleCabin,
  'environment.dropLab': createToyboxDropLab,
  'environment.canyon': createToyboxCanyon,
  'environment.rainMeadow': createToyboxRainMeadow,
  'environment.nightOverlook': createToyboxNightOverlook,
  'environment.observatory': createToyboxObservatory,
};
