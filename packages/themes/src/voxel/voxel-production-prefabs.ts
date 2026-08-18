import * as THREE from 'three';
import type { PrefabFactory, PrefabInstance } from '@mindforge/engine';
import {
  createBlockMaterial,
  createVoxelGlow,
  createVoxelMaterial,
} from './voxel-style';

function block(
  size: [number, number, number],
  material: THREE.Material,
  position: [number, number, number] = [0, 0, 0],
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/** Side-by-side metal/wood samples used by conduction and material lessons. */
export const createVoxelMaterialSamples: PrefabFactory = (): PrefabInstance => {
  const root = new THREE.Group();
  root.name = 'voxel.materialSamples';

  const base = block([3.1, 0.28, 1.35], createBlockMaterial('stoneBrick', { size: [3.1, 0.28, 1.35], tint: '#AAB3B7' }), [0, 0.14, 0]);
  root.add(base);

  const metalMat = createVoxelMaterial('#C7D0D5', {
    texture: 'metalPlate',
    size: [1.05, 0.62, 0.9],
    metalness: 0.62,
    roughness: 0.36,
    emissive: '#FF7A35',
    emissiveIntensity: 0,
  });
  const metal = block([1.05, 0.62, 0.9], metalMat, [-0.82, 0.59, 0]);
  metal.name = 'metal';
  root.add(metal);

  const woodMat = createVoxelMaterial('#FFFFFF', {
    texture: 'planks',
    size: [1.05, 0.62, 0.9],
    emissive: '#FF9B54',
    emissiveIntensity: 0,
  });
  const wood = block([1.05, 0.62, 0.9], woodMat, [0.82, 0.59, 0]);
  wood.name = 'wood';
  root.add(wood);

  const metalSurface = new THREE.Object3D();
  metalSurface.name = 'metalSurface';
  metalSurface.position.set(0, 0.34, 0.42);
  metal.add(metalSurface);
  const woodSurface = new THREE.Object3D();
  woodSurface.name = 'woodSurface';
  woodSurface.position.set(0, 0.34, 0.42);
  wood.add(woodSurface);

  return { object3d: root, anchors: { metal, wood, metalSurface, woodSurface } };
};

/** Reusable block balloon with a semantic charge anchor near its surface. */
export const createVoxelBalloon: PrefabFactory = ({ parameters }): PrefabInstance => {
  const root = new THREE.Group();
  root.name = 'voxel.balloon';
  const color = typeof parameters.color === 'string' ? parameters.color : '#E94C67';
  const balloonMat = createVoxelMaterial(color, { pixelVariation: 0, roughness: 0.55 });

  const body = new THREE.Group();
  body.name = 'body';
  body.add(block([0.72, 0.92, 0.72], balloonMat));
  body.add(block([0.9, 0.58, 0.58], balloonMat, [0, 0.05, 0]));
  body.add(block([0.58, 1.12, 0.58], balloonMat, [0, 0.02, 0]));
  root.add(body);

  const knot = block([0.18, 0.16, 0.18], balloonMat, [0, -0.6, 0]);
  root.add(knot);
  const string = block([0.045, 1.55, 0.045], createBlockMaterial('flat', { size: [0.045, 1.55, 0.045], tint: '#EEE7D7' }), [0, -1.42, 0]);
  root.add(string);

  const charge = new THREE.Object3D();
  charge.name = 'charge';
  charge.position.set(0.48, 0.12, 0.22);
  root.add(charge);
  return { object3d: root, anchors: { body, charge, knot } };
};

/** Generic upright experiment panel, useful as a wall/contact/target surface. */
export const createVoxelDemoPanel: PrefabFactory = ({ parameters }): PrefabInstance => {
  const root = new THREE.Group();
  root.name = 'voxel.demoPanel';
  const color = typeof parameters.color === 'string' ? parameters.color : '#D8E0E3';
  const panel = block([0.48, 3.7, 3.2], createVoxelMaterial(color, { texture: 'stoneBrick', size: [0.48, 3.7, 3.2] }), [0, 1.85, 0]);
  root.add(panel);
  const foot = block([1.4, 0.28, 3.5], createBlockMaterial('metalPlate', { size: [1.4, 0.28, 3.5] }), [0, 0.14, 0]);
  root.add(foot);
  const surface = new THREE.Object3D();
  surface.name = 'surface';
  surface.position.set(0.28, 2.0, 0);
  root.add(surface);
  return { object3d: root, anchors: { surface, panel } };
};

/** Transparent tank with water and a movable ice sample. */
export const createVoxelFloatTank: PrefabFactory = (): PrefabInstance => {
  const root = new THREE.Group();
  root.name = 'voxel.floatTank';
  const glass = createVoxelMaterial('#BFEAFF', { pixelVariation: 0, transparent: true, opacity: 0.25, roughness: 0.08 });
  const frame = createBlockMaterial('metalPlate', { size: [0.12, 2.5, 0.12] });
  const waterMat = createVoxelMaterial('#4FAFE0', { pixelVariation: 0, transparent: true, opacity: 0.68, roughness: 0.16, emissive: '#2B8EC7', emissiveIntensity: 0.05 });

  const water = block([2.35, 1.65, 1.65], waterMat, [0, 0.96, 0]);
  water.name = 'water';
  root.add(water);
  for (const x of [-1.25, 1.25]) for (const z of [-0.9, 0.9]) root.add(block([0.12, 2.5, 0.12], frame, [x, 1.25, z]));
  root.add(block([2.55, 0.08, 1.9], glass, [0, 0.05, 0]));
  root.add(block([2.55, 2.45, 0.08], glass, [0, 1.25, -0.94]));
  root.add(block([0.08, 2.45, 1.9], glass, [-1.29, 1.25, 0]));
  root.add(block([0.08, 2.45, 1.9], glass, [1.29, 1.25, 0]));

  const iceMat = createVoxelMaterial('#DDF7FF', { pixelVariation: 0, emissive: '#8FDDF7', emissiveIntensity: 0.12, transparent: true, opacity: 0.9, roughness: 0.2 });
  const ice = block([0.82, 0.7, 0.82], iceMat, [0, 2.55, 0]);
  ice.name = 'ice';
  root.add(ice);
  const surface = new THREE.Object3D();
  surface.name = 'surface';
  surface.position.set(0, 1.8, 0);
  root.add(surface);
  return { object3d: root, anchors: { water, ice, surface } };
};

/** Bowl of soup with a metal spoon and semantic handle/liquid anchors. */
export const createVoxelBowlSpoon: PrefabFactory = (): PrefabInstance => {
  const root = new THREE.Group();
  root.name = 'voxel.bowlSpoon';
  const ceramic = createVoxelMaterial('#F2F5F2', { pixelVariation: 0, roughness: 0.62 });
  const soupMat = createVoxelMaterial('#C9572D', { pixelVariation: 0, emissive: '#FF6A32', emissiveIntensity: 0.13, roughness: 0.5 });
  const spoonMat = createVoxelMaterial('#C9D3D8', { texture: 'metalPlate', size: [0.18, 2.8, 0.18], metalness: 0.62, roughness: 0.34, emissive: '#FF7D38', emissiveIntensity: 0 });

  // Chunky bowl: base + four rim bars.
  root.add(block([2.6, 0.35, 2.2], ceramic, [0, 0.2, 0]));
  root.add(block([2.8, 0.36, 0.28], ceramic, [0, 0.64, 0.98]));
  root.add(block([2.8, 0.36, 0.28], ceramic, [0, 0.64, -0.98]));
  root.add(block([0.28, 0.36, 1.7], ceramic, [-1.26, 0.64, 0]));
  root.add(block([0.28, 0.36, 1.7], ceramic, [1.26, 0.64, 0]));
  const soup = block([2.2, 0.2, 1.6], soupMat, [0, 0.62, 0]);
  soup.name = 'soup';
  root.add(soup);

  const spoon = new THREE.Group();
  spoon.name = 'spoon';
  const handle = block([0.18, 2.75, 0.18], spoonMat, [0, 1.38, 0]);
  handle.name = 'handle';
  spoon.add(handle);
  spoon.add(block([0.58, 0.18, 0.42], spoonMat, [0, -0.04, 0]));
  spoon.rotation.z = -0.42;
  spoon.position.set(0.35, 0.62, 0);
  root.add(spoon);

  const soupSurface = new THREE.Object3D();
  soupSurface.name = 'soupSurface';
  soupSurface.position.set(-0.25, 0.75, 0.2);
  root.add(soupSurface);
  const handleTip = new THREE.Object3D();
  handleTip.name = 'handleTip';
  handleTip.position.set(0, 2.75, 0);
  spoon.add(handleTip);

  // Tiny glow marker gives effects a visually obvious target even before heat ramps.
  const heatMarker = block([0.08, 0.08, 0.08], createVoxelGlow('#FF8A3D', 0.001), [0, 2.5, 0]);
  spoon.add(heatMarker);

  return { object3d: root, anchors: { soup, spoon, handle, soupSurface, handleTip } };
};



/** Seat + belt + simplified seated passenger for safety/inertia demonstrations. */
export const createVoxelSeatRig: PrefabFactory = (): PrefabInstance => {
  const root = new THREE.Group();
  root.name = 'voxel.seatRig';
  const seatMat = createBlockMaterial('planks', { size: [2.2, 0.45, 2.2], tint: '#455866' });
  const frameMat = createBlockMaterial('metalPlate', { size: [0.18, 2.8, 0.18], tint: '#77858C' });
  root.add(block([2.25, 0.42, 2.2], seatMat, [0, 0.52, 0]));
  root.add(block([2.25, 2.6, 0.42], seatMat, [0, 1.95, -0.88]));
  for (const x of [-0.95, 0.95]) root.add(block([0.18, 1.1, 0.18], frameMat, [x, 0.15, -0.75]));

  const passenger = new THREE.Group();
  passenger.name = 'passenger';
  const body = createVoxelMaterial('#45A7A1', { texture: 'cloth', size: [1.25, 1.25, 0.65], roughness: 0.9 });
  const skin = createVoxelMaterial('#C88F6F', { pixelVariation: 0.02, roughness: 0.9 });
  const trousers = createVoxelMaterial('#405D78', { texture: 'cloth', size: [0.48, 1.25, 0.48], roughness: 0.95 });
  passenger.add(block([1.25, 1.25, 0.65], body, [0, 1.75, -0.05]));
  passenger.add(block([0.78, 0.78, 0.78], skin, [0, 2.72, -0.02]));
  for (const x of [-0.36, 0.36]) {
    const leg = block([0.46, 1.28, 0.46], trousers, [x, 0.72, 0.62]);
    leg.rotation.x = -0.82;
    passenger.add(leg);
  }
  root.add(passenger);

  const beltMat = createVoxelMaterial('#E6B84A', { pixelVariation: 0, roughness: 0.55, emissive: '#8A5F18', emissiveIntensity: 0.05 });
  const belt = new THREE.Group();
  belt.name = 'belt';
  const strap = block([0.16, 1.85, 0.12], beltMat, [0, 1.8, 0.38]);
  strap.rotation.z = -0.58;
  belt.add(strap);
  belt.add(block([1.35, 0.13, 0.12], beltMat, [0, 1.26, 0.42]));
  root.add(belt);

  const chest = new THREE.Object3D();
  chest.name = 'chest';
  chest.position.set(0, 1.85, 0.36);
  passenger.add(chest);
  const latch = new THREE.Object3D();
  latch.name = 'latch';
  latch.position.set(0.48, 1.26, 0.48);
  root.add(latch);
  return { object3d: root, anchors: { passenger, chest, belt, latch } };
};

/** Paired rock/feather drop rig with separate air and vacuum test objects. */
export const createVoxelFeatherRock: PrefabFactory = (): PrefabInstance => {
  const root = new THREE.Group();
  root.name = 'voxel.featherRock';
  const frame = createBlockMaterial('metalPlate', { size: [0.12, 6.4, 0.12], tint: '#7C8990' });
  for (const x of [-2.4, 2.4]) for (const z of [-0.75, 0.75]) root.add(block([0.12, 6.4, 0.12], frame, [x, 3.2, z]));
  root.add(block([5.0, 0.15, 1.65], frame, [0, 6.35, 0]));
  root.add(block([5.0, 0.18, 1.65], frame, [0, 0.1, 0]));

  const rockMat = createVoxelMaterial('#7D8589', { texture: 'stone', size: [0.72, 0.72, 0.72], roughness: 0.95 });
  const featherMat = createVoxelMaterial('#F1E9D1', { pixelVariation: 0, roughness: 0.86 });
  const makeRock = (name: string, x: number): THREE.Group => {
    const g = new THREE.Group(); g.name = name; g.position.set(x, 5.55, 0);
    const a = block([0.72, 0.62, 0.68], rockMat); a.rotation.set(0.12, 0.22, -0.09); g.add(a);
    return g;
  };
  const makeFeather = (name: string, x: number): THREE.Group => {
    const g = new THREE.Group(); g.name = name; g.position.set(x, 5.55, 0);
    const stem = block([0.08, 0.9, 0.08], featherMat); stem.rotation.z = -0.15; g.add(stem);
    const vane = block([0.48, 0.72, 0.08], featherMat, [0.15, 0.06, 0]); vane.rotation.z = -0.38; g.add(vane);
    return g;
  };
  const airRock = makeRock('airRock', -1.15);
  const airFeather = makeFeather('airFeather', 1.15);
  const vacuumRock = makeRock('vacuumRock', -1.15);
  const vacuumFeather = makeFeather('vacuumFeather', 1.15);
  vacuumRock.visible = false;
  vacuumFeather.visible = false;
  root.add(airRock, airFeather, vacuumRock, vacuumFeather);

  const chamberMaterial = createVoxelMaterial('#BFEAFF', { pixelVariation: 0, transparent: true, opacity: 0.1, roughness: 0.05 });
  chamberMaterial.depthWrite = false;
  const chamber = block([5.25, 6.15, 1.8], chamberMaterial, [0, 3.2, 0]);
  chamber.castShadow = false;
  chamber.receiveShadow = false;
  chamber.name = 'chamber';
  root.add(chamber);
  const floor = new THREE.Object3D(); floor.position.set(0, 0.3, 0); root.add(floor);
  return { object3d: root, anchors: { airRock, airFeather, vacuumRock, vacuumFeather, chamber, floor } };
};

/** Reusable block-built paper glider with semantic aerodynamic anchors. */
export const createVoxelPaperPlane: PrefabFactory = (): PrefabInstance => {
  const root = new THREE.Group();
  root.name = 'voxel.paperPlane';
  const paper = createVoxelMaterial('#F4F2E8', { pixelVariation: 0, roughness: 0.82 });
  root.add(block([0.16, 0.16, 3.0], paper));
  const left = block([1.55, 0.09, 2.15], paper, [-0.72, 0, -0.12]); left.rotation.y = -0.36; root.add(left);
  const right = block([1.55, 0.09, 2.15], paper, [0.72, 0, -0.12]); right.rotation.y = 0.36; root.add(right);
  const tail = block([0.12, 0.72, 0.9], paper, [0, 0.34, -1.05]); tail.rotation.x = 0.05; root.add(tail);
  const nose = new THREE.Object3D(); nose.position.set(0, 0, 1.58); root.add(nose);
  const wingLeft = new THREE.Object3D(); wingLeft.position.set(-1.25, 0, 0); root.add(wingLeft);
  const wingRight = new THREE.Object3D(); wingRight.position.set(1.25, 0, 0); root.add(wingRight);
  const tailAnchor = new THREE.Object3D(); tailAnchor.position.set(0, 0.18, -1.42); root.add(tailAnchor);
  return { object3d: root, anchors: { nose, wingLeft, wingRight, tail: tailAnchor } };
};

/** Horseshoe-style magnet with steel/aluminium/wood targets for material selection demos. */
export const createVoxelMagnetKit: PrefabFactory = (): PrefabInstance => {
  const root = new THREE.Group();
  root.name = 'voxel.magnetKit';
  root.add(block([6.2, 0.24, 2.6], createBlockMaterial('stoneBrick', { size: [6.2, 0.24, 2.6], tint: '#AAB3B7' }), [0, 0.12, 0]));
  const magnet = new THREE.Group(); magnet.name = 'magnet'; magnet.position.set(-2.0, 0.72, 0.9);
  const red = createVoxelMaterial('#E15050', { pixelVariation: 0, roughness: 0.52 });
  const blue = createVoxelMaterial('#4D7FD8', { pixelVariation: 0, roughness: 0.52 });
  magnet.add(block([0.42, 1.4, 0.42], red, [-0.45, 0, 0]));
  magnet.add(block([0.42, 1.4, 0.42], blue, [0.45, 0, 0]));
  magnet.add(block([1.32, 0.42, 0.42], createVoxelMaterial('#C9D2D7', { texture: 'metalPlate', size: [1.32, 0.42, 0.42], metalness: 0.55 }), [0, 0.49, 0]));
  root.add(magnet);
  const target = (name: string, x: number, material: THREE.Material): THREE.Mesh => { const m = block([0.82, 0.7, 0.82], material, [x, 0.59, -0.68]); m.name = name; root.add(m); return m; };
  const steel = target('steel', -1.8, createVoxelMaterial('#AEBBC2', { texture: 'metalPlate', size: [0.82, 0.7, 0.82], metalness: 0.62, emissive: '#5ED9FF', emissiveIntensity: 0 }));
  const aluminium = target('aluminium', 0, createVoxelMaterial('#D4DCE0', { texture: 'metalPlate', size: [0.82, 0.7, 0.82], metalness: 0.42, emissive: '#5ED9FF', emissiveIntensity: 0 }));
  const wood = target('wood', 1.8, createVoxelMaterial('#FFFFFF', { texture: 'planks', size: [0.82, 0.7, 0.82], emissive: '#5ED9FF', emissiveIntensity: 0 }));
  const tip = new THREE.Object3D(); tip.position.set(0, -0.62, -0.3); magnet.add(tip);
  return { object3d: root, anchors: { magnet, magnetTip: tip, steel, aluminium, wood } };
};


/** Sound emitter/listener rig with a far semantic reflector anchor for echo demos. */
export const createVoxelSoundRig: PrefabFactory = (): PrefabInstance => {
  const root = new THREE.Group();
  root.name = 'voxel.soundRig';
  const base = createBlockMaterial('stoneBrick', { size: [4.2, 0.28, 1.6], tint: '#8A9296' });
  root.add(block([4.2, 0.28, 1.6], base, [0, 0.14, 0]));

  const speaker = new THREE.Group();
  speaker.name = 'source';
  speaker.position.set(-1.3, 0.85, 0);
  const speakerMat = createVoxelMaterial('#26323A', { texture: 'metalPlate', size: [0.9, 1.25, 0.7], metalness: 0.32, roughness: 0.62 });
  speaker.add(block([0.9, 1.25, 0.7], speakerMat));
  speaker.add(block([0.48, 0.48, 0.08], createVoxelGlow('#6DDDF7', 0.52), [0, 0, 0.39]));
  root.add(speaker);

  const listener = new THREE.Group();
  listener.name = 'listener';
  listener.position.set(1.3, 0.7, 0);
  listener.add(block([0.55, 1.0, 0.55], createVoxelMaterial('#D7E2E6', { pixelVariation: 0.02, roughness: 0.7 })));
  listener.add(block([0.16, 0.16, 0.16], createVoxelGlow('#FFD875', 0.6), [0, 0.42, 0.3]));
  root.add(listener);

  const reflector = block([0.65, 0.65, 0.18], createVoxelGlow('#82E6FF', 0.62), [0, 3.0, -21.5]);
  reflector.name = 'reflector';
  root.add(reflector);
  return { object3d: root, anchors: { source: speaker, listener, reflector } };
};

/** Production optical rig: faceted raindrop, internal ray path, spectrum, many-droplet field and final rainbow arc. */
export const createVoxelPrismDrop: PrefabFactory = (): PrefabInstance => {
  const root = new THREE.Group();
  root.name = 'voxel.prismDrop';

  const glass = createVoxelMaterial('#D7F7FF', {
    pixelVariation: 0,
    transparent: true,
    opacity: 0.42,
    roughness: 0.08,
    emissive: '#76D7F0',
    emissiveIntensity: 0.08,
  });
  glass.depthWrite = false;

  const core = new THREE.Group();
  core.name = 'voxel-prism-core-shell';
  const coreMain = block([1.22, 1.22, 1.05], glass.clone());
  coreMain.rotation.z = Math.PI / 4;
  core.add(coreMain);
  for (const [x, y, scale] of [
    [-0.52, 0.0, 0.62], [0.52, 0.0, 0.62], [0.0, 0.52, 0.62], [0.0, -0.52, 0.62],
  ] as const) {
    const facet = block([0.72 * scale, 0.72 * scale, 0.88], glass.clone(), [x, y, 0]);
    facet.rotation.z = Math.PI / 4;
    facet.castShadow = false;
    core.add(facet);
  }
  const caustic = block([0.28, 0.28, 0.3], createVoxelGlow('#F3FDFF', 0.5), [0.1, 0.02, 0.1]);
  caustic.name = 'voxel-prism-caustic';
  caustic.castShadow = false;
  core.add(caustic);
  root.add(core);

  const input = new THREE.Object3D(); input.name = 'input'; input.position.set(-1.9, 0.46, 0); root.add(input);
  const center = new THREE.Object3D(); center.name = 'center'; center.position.set(0, 0.04, 0); root.add(center);
  const bend = new THREE.Object3D(); bend.name = 'bend'; bend.position.set(-0.58, 0.30, 0.04); root.add(bend);
  const reflect = new THREE.Object3D(); reflect.name = 'reflect'; reflect.position.set(0.58, -0.34, 0.04); root.add(reflect);
  const exit = new THREE.Object3D(); exit.name = 'exit'; exit.position.set(0.68, 0.46, 0.04); root.add(exit);

  const makeBeam = (
    name: string,
    start: [number, number, number],
    end: [number, number, number],
    color: string,
    thickness: number,
    intensity: number,
    segments = 11,
  ): THREE.Group => {
    const group = new THREE.Group();
    group.name = name;
    group.position.set(...start);
    const direction = new THREE.Vector3(end[0] - start[0], end[1] - start[1], end[2] - start[2]);
    const length = direction.length();
    group.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), direction.normalize());
    const segmentLength = length / segments;
    const material = createVoxelGlow(color, intensity);
    material.transparent = true;
    material.opacity = 0.9;
    material.depthWrite = false;
    const mesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(segmentLength * 0.78, thickness, thickness),
      material,
      segments,
    );
    const matrix = new THREE.Matrix4();
    for (let i = 0; i < segments; i++) {
      matrix.makeTranslation((i + 0.5) * segmentLength, 0, 0);
      mesh.setMatrixAt(i, matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    group.add(mesh);
    group.scale.x = 0.015;
    root.add(group);
    return group;
  };

  const entryBeam = makeBeam('entryBeam', [-1.9, 0.46, 0.05], [-0.58, 0.30, 0.05], '#FFF6D6', 0.085, 0.78, 9);
  const refractBeam = makeBeam('refractBeam', [-0.58, 0.30, 0.05], [0.58, -0.34, 0.05], '#EAFBFF', 0.075, 0.82, 9);
  const reflectionBeam = makeBeam('reflectionBeam', [0.58, -0.34, 0.05], [0.68, 0.46, 0.05], '#F5FDFF', 0.075, 0.9, 7);
  const exitBeam = makeBeam('exitBeam', [0.68, 0.46, 0.05], [1.18, 0.54, 0.05], '#FFFFFF', 0.08, 0.92, 4);

  const colors = [
    ['red', '#F25A5A', 1.45],
    ['orange', '#F28B45', 1.0],
    ['yellow', '#F4D85A', 0.55],
    ['green', '#5FD177', 0.1],
    ['blue', '#5B92E8', -0.35],
    ['violet', '#9470E4', -0.8],
  ] as const;
  const anchors: Record<string, THREE.Object3D> = {
    input, center, bend, reflect, exit, entryBeam, refractBeam, reflectionBeam, exitBeam,
  };

  colors.forEach(([name, color, endY], index) => {
    const beam = makeBeam(name, [0.72, 0.46, 0.03], [2.85, endY, 0.03], color, 0.07, 0.66 + index * 0.025, 13);
    beam.scale.x = 0.015;
    anchors[name] = beam;
  });

  return { object3d: root, anchors };
};

/** Reusable field of stylized raindrops used when one optical path scales to many drops. */
export const createVoxelRainDropletField: PrefabFactory = (): PrefabInstance => {
  const root = new THREE.Group();
  root.name = 'voxel.rainDropletField';
  const fieldGlass = createVoxelMaterial('#CDECF2', { pixelVariation: 0, transparent: true, opacity: 0.34, roughness: 0.12, emissive: '#7ECDE0', emissiveIntensity: 0.05 });
  fieldGlass.depthWrite = false;
  const dropletMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1.35, 1), fieldGlass, 24);
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, Math.PI / 4));
  const position = new THREE.Vector3();
  const scale = new THREE.Vector3();
  for (let i = 0; i < 24; i++) {
    position.set(((i * 37) % 17 - 8) * 0.38, -1.05 + ((i * 19) % 13) * 0.31, -1.4 - (i % 5) * 0.75);
    const size = 0.12 + (i % 4) * 0.025;
    scale.setScalar(size);
    matrix.compose(position, quaternion, scale);
    dropletMesh.setMatrixAt(i, matrix);
  }
  dropletMesh.instanceMatrix.needsUpdate = true;
  dropletMesh.castShadow = false;
  dropletMesh.receiveShadow = false;
  root.add(dropletMesh);
  return { object3d: root };
};

/** Landscape-scale spectral payoff, kept separate from the prism so hidden geometry cannot distort camera fitting. */
export const createVoxelRainbowArc: PrefabFactory = (): PrefabInstance => {
  const root = new THREE.Group();
  root.name = 'voxel.rainbowArc';
  const colors = ['#EF6262', '#F08A4B', '#F0D15B', '#67C978', '#5E91DC', '#8B70D7'] as const;
  colors.forEach((color, band) => {
    const radius = 4.2 - band * 0.13;
    const material = createVoxelGlow(color, 0.24);
    material.transparent = true;
    material.opacity = 0.64;
    material.depthWrite = false;
    const arc = new THREE.InstancedMesh(new THREE.BoxGeometry(0.2, 0.1, 0.08), material, 30);
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3(1, 1, 1);
    const zAxis = new THREE.Vector3(0, 0, 1);
    for (let i = 0; i < 30; i++) {
      const t = i / 29;
      const angle = THREE.MathUtils.lerp(Math.PI * 0.12, Math.PI * 0.88, t);
      position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
      quaternion.setFromAxisAngle(zAxis, angle + Math.PI / 2);
      matrix.compose(position, quaternion, scale);
      arc.setMatrixAt(i, matrix);
    }
    arc.instanceMatrix.needsUpdate = true;
    arc.castShadow = false;
    arc.receiveShadow = false;
    root.add(arc);
  });
  return { object3d: root };
};


/** Two identical moon discs in different sky contexts for perception comparisons. */
export const createVoxelMoonPair: PrefabFactory = (): PrefabInstance => {
  const root = new THREE.Group();
  root.name = 'voxel.moonPair';
  const moonMatA = createVoxelMaterial('#F4E8C3', { pixelVariation: 0.02, emissive: '#EAD89A', emissiveIntensity: 0.55, roughness: 0.72 });
  const moonMatB = moonMatA.clone();
  const horizonMoon = block([1.6, 1.6, 0.32], moonMatA, [-2.6, 1.9, 0]);
  horizonMoon.name = 'horizonMoon';
  const highMoon = block([1.6, 1.6, 0.32], moonMatB, [2.4, 5.8, 0]);
  highMoon.name = 'highMoon';
  root.add(horizonMoon, highMoon);

  const marker = createVoxelMaterial('#8FE8FF', { pixelVariation: 0, emissive: '#5ED4F2', emissiveIntensity: 0.7, transparent: true, opacity: 0.76 });
  const horizonFrame = new THREE.Group();
  horizonFrame.name = 'horizonFrame';
  horizonFrame.position.copy(horizonMoon.position);
  horizonFrame.scale.setScalar(0.001);
  horizonFrame.add(block([2.15, 0.06, 0.08], marker, [0, 1.08, 0.18]));
  horizonFrame.add(block([2.15, 0.06, 0.08], marker, [0, -1.08, 0.18]));
  const highFrame = horizonFrame.clone();
  highFrame.name = 'highFrame';
  highFrame.position.copy(highMoon.position);
  root.add(horizonFrame, highFrame);
  return { object3d: root, anchors: { horizonMoon, highMoon, horizonFrame, highFrame } };
};

/** Star/planet comparison rig with semantic atmosphere checkpoints. */
export const createVoxelStarPlanetPair: PrefabFactory = (): PrefabInstance => {
  const root = new THREE.Group();
  root.name = 'voxel.starPlanetPair';
  const star = block([0.34, 0.34, 0.18], createVoxelGlow('#F8FBFF', 1.05), [-2.4, 5.3, 0]);
  star.name = 'star';
  const planet = block([0.86, 0.86, 0.22], createVoxelMaterial('#B8D9F3', { pixelVariation: 0.02, emissive: '#7EBDE9', emissiveIntensity: 0.52 }), [2.4, 5.3, 0]);
  planet.name = 'planet';
  root.add(star, planet);

  const atmosphere = createVoxelMaterial('#73CFF3', { pixelVariation: 0, transparent: true, opacity: 0.12, emissive: '#4ABCE8', emissiveIntensity: 0.12, roughness: 0.12 });
  atmosphere.depthWrite = false;
  for (const y of [3.9, 3.0, 2.1]) root.add(block([7.5, 0.07, 0.08], atmosphere, [0, y, 0]));

  const starMidA = new THREE.Object3D(); starMidA.position.set(-1.65, 3.9, 0); root.add(starMidA);
  const starMidB = new THREE.Object3D(); starMidB.position.set(-1.0, 2.7, 0); root.add(starMidB);
  const planetMidA = new THREE.Object3D(); planetMidA.position.set(1.65, 3.9, 0); root.add(planetMidA);
  const planetMidB = new THREE.Object3D(); planetMidB.position.set(1.0, 2.7, 0); root.add(planetMidB);
  const viewer = new THREE.Object3D(); viewer.position.set(0, 0.8, 0); root.add(viewer);
  return { object3d: root, anchors: { star, planet, starMidA, starMidB, planetMidA, planetMidB, viewer } };
};

export const VOXEL_PRODUCTION_PREFAB_FACTORIES: Record<string, PrefabFactory> = {
  'prefab.materialSamples': createVoxelMaterialSamples,
  'prefab.balloon': createVoxelBalloon,
  'prefab.demoPanel': createVoxelDemoPanel,
  'prefab.floatTank': createVoxelFloatTank,
  'prefab.bowlSpoon': createVoxelBowlSpoon,
  'prefab.seatRig': createVoxelSeatRig,
  'prefab.featherRock': createVoxelFeatherRock,
  'prefab.paperPlane': createVoxelPaperPlane,
  'prefab.magnetKit': createVoxelMagnetKit,
  'prefab.soundRig': createVoxelSoundRig,
  'prefab.prismDrop': createVoxelPrismDrop,
  'prefab.rainDropletField': createVoxelRainDropletField,
  'prefab.rainbowArc': createVoxelRainbowArc,
  'prefab.moonPair': createVoxelMoonPair,
  'prefab.starPlanetPair': createVoxelStarPlanetPair,
};
