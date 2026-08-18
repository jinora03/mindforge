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



export const createToyboxSeatRig: PrefabFactory = (): PrefabInstance => {
  const root = new THREE.Group();
  root.name = 'toybox.seatRig';
  const seat = plastic('#526D7C', { roughness: 0.42 });
  root.add(part(moulded(2.25, 0.42, 2.2), seat, [0, 0.52, 0]));
  root.add(part(moulded(2.25, 2.6, 0.42), seat, [0, 1.95, -0.88]));
  const passenger = new THREE.Group(); passenger.name = 'passenger';
  passenger.add(part(moulded(1.25, 1.25, 0.65), plastic(TOYBOX_PALETTE.mint, { roughness: 0.3 }), [0, 1.75, -0.05]));
  passenger.add(part(ballGeometry(0.44, 18), plastic('#C98F70', { roughness: 0.48 }), [0, 2.72, -0.02]));
  for (const x of [-0.36, 0.36]) { const leg = part(moulded(0.46, 1.28, 0.46), plastic(TOYBOX_PALETTE.cobalt), [x, 0.72, 0.62]); leg.rotation.x = -0.82; passenger.add(leg); }
  root.add(passenger);
  const belt = new THREE.Group(); belt.name = 'belt';
  const beltMat = plastic('#F0C24F', { roughness: 0.38 });
  const strap = part(moulded(0.16, 1.85, 0.12), beltMat, [0, 1.8, 0.38]); strap.rotation.z = -0.58; belt.add(strap);
  belt.add(part(moulded(1.35, 0.13, 0.12), beltMat, [0, 1.26, 0.42])); root.add(belt);
  const chest = new THREE.Object3D(); chest.position.set(0, 1.85, 0.36); passenger.add(chest);
  const latch = new THREE.Object3D(); latch.position.set(0.48, 1.26, 0.48); root.add(latch);
  return { object3d: root, anchors: { passenger, chest, belt, latch } };
};

export const createToyboxFeatherRock: PrefabFactory = (): PrefabInstance => {
  const root = new THREE.Group(); root.name = 'toybox.featherRock';
  const frame = toyMetal('#9AA9B0');
  for (const x of [-2.4, 2.4]) for (const z of [-0.75, 0.75]) root.add(part(moulded(0.12, 6.4, 0.12), frame, [x, 3.2, z]));
  root.add(part(moulded(5.0, 0.15, 1.65), frame, [0, 6.35, 0]));
  root.add(part(moulded(5.0, 0.18, 1.65), frame, [0, 0.1, 0]));
  const rockMat = plastic('#858D91', { roughness: 0.72 });
  const featherMat = plastic('#F2EAD4', { roughness: 0.58 });
  const makeRock = (name: string, x: number): THREE.Group => { const g = new THREE.Group(); g.name=name; g.position.set(x,5.55,0); const m=part(ballGeometry(0.42,12),rockMat); m.scale.set(1.05,0.82,0.98); g.add(m); return g; };
  const makeFeather = (name: string, x: number): THREE.Group => { const g = new THREE.Group(); g.name=name; g.position.set(x,5.55,0); const stem=part(tubeGeometry(0.035,0.95,8),featherMat); stem.rotation.z=-0.15; g.add(stem); const vane=part(moulded(0.44,0.72,0.06),featherMat,[0.15,0.06,0]); vane.rotation.z=-0.38; g.add(vane); return g; };
  const airRock=makeRock('airRock',-1.15), airFeather=makeFeather('airFeather',1.15), vacuumRock=makeRock('vacuumRock',-1.15), vacuumFeather=makeFeather('vacuumFeather',1.15);
  vacuumRock.visible=false; vacuumFeather.visible=false; root.add(airRock,airFeather,vacuumRock,vacuumFeather);
  const chamberMaterial = plastic('#C9F0FB', { transparent: true, opacity: 0.1, roughness: 0.05 });
  chamberMaterial.depthWrite = false;
  const chamber = part(moulded(5.25, 6.15, 1.8), chamberMaterial, [0, 3.2, 0]);
  chamber.castShadow = false;
  chamber.receiveShadow = false;
  chamber.name = 'chamber';
  root.add(chamber);
  const floor=new THREE.Object3D(); floor.position.set(0,0.3,0); root.add(floor);
  return { object3d: root, anchors: { airRock, airFeather, vacuumRock, vacuumFeather, chamber, floor } };
};

export const createToyboxPaperPlane: PrefabFactory = (): PrefabInstance => {
  const root = new THREE.Group(); root.name='toybox.paperPlane';
  const paper=plastic('#F7F4E9',{roughness:0.34});
  root.add(part(moulded(0.16,0.12,3.0),paper));
  const left=part(moulded(1.55,0.08,2.15),paper,[-0.72,0,-0.12]); left.rotation.y=-0.36; root.add(left);
  const right=part(moulded(1.55,0.08,2.15),paper,[0.72,0,-0.12]); right.rotation.y=0.36; root.add(right);
  const tailMesh=part(moulded(0.12,0.72,0.9),paper,[0,0.34,-1.05]); root.add(tailMesh);
  const nose=new THREE.Object3D(); nose.position.set(0,0,1.58); root.add(nose);
  const wingLeft=new THREE.Object3D(); wingLeft.position.set(-1.25,0,0); root.add(wingLeft);
  const wingRight=new THREE.Object3D(); wingRight.position.set(1.25,0,0); root.add(wingRight);
  const tail=new THREE.Object3D(); tail.position.set(0,0.18,-1.42); root.add(tail);
  return { object3d: root, anchors: { nose, wingLeft, wingRight, tail } };
};

export const createToyboxMagnetKit: PrefabFactory = (): PrefabInstance => {
  const root=new THREE.Group(); root.name='toybox.magnetKit';
  root.add(part(moulded(6.2,0.24,2.6),plastic(TOYBOX_PALETTE.stone),[0,0.12,0]));
  const magnet=new THREE.Group(); magnet.name='magnet'; magnet.position.set(-2.0,0.72,0.9);
  magnet.add(part(moulded(0.42,1.4,0.42),plastic('#E65B58'),[-0.45,0,0]));
  magnet.add(part(moulded(0.42,1.4,0.42),plastic('#527FD8'),[0.45,0,0]));
  magnet.add(part(moulded(1.32,0.42,0.42),toyMetal('#C9D2D7'),[0,0.49,0])); root.add(magnet);
  const target=(name:string,x:number,material:THREE.MeshStandardMaterial):THREE.Mesh=>{const m=part(moulded(0.82,0.7,0.82),material,[x,0.59,-0.68]);m.name=name;root.add(m);return m;};
  const steelMat=toyMetal('#AEBBC2'); steelMat.emissive=new THREE.Color('#5ED9FF'); steelMat.emissiveIntensity=0;
  const aluminiumMat=toyMetal('#D4DCE0'); aluminiumMat.emissive=new THREE.Color('#5ED9FF'); aluminiumMat.emissiveIntensity=0;
  const woodMat=plastic('#C88A4F',{roughness:0.6,emissive:'#5ED9FF',emissiveIntensity:0});
  const steel=target('steel',-1.8,steelMat), aluminium=target('aluminium',0,aluminiumMat), wood=target('wood',1.8,woodMat);
  const tip=new THREE.Object3D(); tip.position.set(0,-0.62,-0.3); magnet.add(tip);
  return { object3d: root, anchors: { magnet, magnetTip: tip, steel, aluminium, wood } };
};


/** Toy sound emitter/listener rig with a far semantic reflector anchor. */
export const createToyboxSoundRig: PrefabFactory = (): PrefabInstance => {
  const root = new THREE.Group();
  root.name = 'toybox.soundRig';
  root.add(part(moulded(4.2, 0.28, 1.6), plastic(TOYBOX_PALETTE.stone), [0, 0.14, 0]));
  studs(root, TOYBOX_PALETTE.stone, 10, 0, 0.31);

  const source = new THREE.Group();
  source.name = 'source';
  source.position.set(-1.3, 0.85, 0);
  source.add(part(moulded(0.9, 1.25, 0.7), plastic('#31424B', { roughness: 0.48 })));
  source.add(part(ballGeometry(0.25, 12), plastic('#77E2F8', { emissive: '#53CBEA', emissiveIntensity: 0.62 }), [0, 0, 0.38]));
  root.add(source);

  const listener = new THREE.Group();
  listener.name = 'listener';
  listener.position.set(1.3, 0.7, 0);
  listener.add(part(moulded(0.55, 1.0, 0.55), plastic('#DDE7E9', { roughness: 0.38 })));
  listener.add(part(ballGeometry(0.11, 10), plastic('#FFE083', { emissive: '#FFD15A', emissiveIntensity: 0.7 }), [0, 0.42, 0.3]));
  root.add(listener);

  const reflector = part(ballGeometry(0.34, 12), plastic('#83E6FA', { emissive: '#5FD4F0', emissiveIntensity: 0.7 }), [0, 3.0, -21.5]);
  reflector.name = 'reflector';
  root.add(reflector);
  return { object3d: root, anchors: { source, listener, reflector } };
};

/** Production optical rig with theme-parity anchors for refraction, reflection, dispersion and payoff. */
export const createToyboxPrismDrop: PrefabFactory = (): PrefabInstance => {
  const root = new THREE.Group();
  root.name = 'toybox.prismDrop';
  const glass = plastic('#D9F7FF', { transparent: true, opacity: 0.43, roughness: 0.07, emissive: '#7ED8EC', emissiveIntensity: 0.09 });
  glass.depthWrite = false;
  const core = part(new THREE.OctahedronGeometry(0.95, 1), glass);
  core.name = 'toybox-prism-core-shell';
  core.scale.set(0.92, 1.28, 0.92);
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
    segments = 10,
  ): THREE.Group => {
    const group = new THREE.Group();
    group.name = name;
    group.position.set(...start);
    const direction = new THREE.Vector3(end[0] - start[0], end[1] - start[1], end[2] - start[2]);
    const length = direction.length();
    group.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), direction.normalize());
    const segmentLength = length / segments;
    const material = plastic(color, { emissive: color, emissiveIntensity: intensity, roughness: 0.08, transparent: true, opacity: 0.88 });
    material.depthWrite = false;
    const mesh = new THREE.InstancedMesh(moulded(segmentLength * 0.82, thickness, thickness), material, segments);
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

  const entryBeam = makeBeam('entryBeam', [-1.9, 0.46, 0.05], [-0.58, 0.30, 0.05], '#FFF5D6', 0.08, 0.74, 8);
  const refractBeam = makeBeam('refractBeam', [-0.58, 0.30, 0.05], [0.58, -0.34, 0.05], '#EAFBFF', 0.07, 0.78, 8);
  const reflectionBeam = makeBeam('reflectionBeam', [0.58, -0.34, 0.05], [0.68, 0.46, 0.05], '#F7FDFF', 0.07, 0.86, 7);
  const exitBeam = makeBeam('exitBeam', [0.68, 0.46, 0.05], [1.18, 0.54, 0.05], '#FFFFFF', 0.075, 0.88, 4);

  const colors = [
    ['red', '#F25A5A', 1.45], ['orange', '#F28B45', 1.0], ['yellow', '#F4D85A', 0.55],
    ['green', '#5FD177', 0.1], ['blue', '#5B92E8', -0.35], ['violet', '#9470E4', -0.8],
  ] as const;
  const anchors: Record<string, THREE.Object3D> = { input, center, bend, reflect, exit, entryBeam, refractBeam, reflectionBeam, exitBeam };
  colors.forEach(([name, color, endY], index) => {
    const beam = makeBeam(name, [0.72, 0.46, 0.03], [2.85, endY, 0.03], color, 0.065, 0.64 + index * 0.025, 12);
    anchors[name] = beam;
  });

  return { object3d: root, anchors };
};

export const createToyboxRainDropletField: PrefabFactory = (): PrefabInstance => {
  const root = new THREE.Group();
  root.name = 'toybox.rainDropletField';
  const dropMaterial = plastic('#D2EEF4', { transparent: true, opacity: 0.3, roughness: 0.08, emissive: '#85D1E1', emissiveIntensity: 0.05 });
  dropMaterial.depthWrite = false;
  const dropletMesh = new THREE.InstancedMesh(ballGeometry(1, 10), dropMaterial, 24);
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const scale = new THREE.Vector3();
  const identity = new THREE.Quaternion();
  for (let i = 0; i < 24; i++) {
    position.set(((i * 37) % 17 - 8) * 0.38, -1.05 + ((i * 19) % 13) * 0.31, -1.4 - (i % 5) * 0.75);
    const size = 0.09 + (i % 4) * 0.018;
    scale.set(size, size * 1.35, size);
    matrix.compose(position, identity, scale);
    dropletMesh.setMatrixAt(i, matrix);
  }
  dropletMesh.instanceMatrix.needsUpdate = true;
  dropletMesh.castShadow = false;
  root.add(dropletMesh);
  return { object3d: root };
};

export const createToyboxRainbowArc: PrefabFactory = (): PrefabInstance => {
  const root = new THREE.Group();
  root.name = 'toybox.rainbowArc';
  const colors = ['#EF6262', '#F08A4B', '#F0D15B', '#67C978', '#5E91DC', '#8B70D7'] as const;
  colors.forEach((color, band) => {
    const radius = 4.2 - band * 0.13;
    const material = plastic(color, { emissive: color, emissiveIntensity: 0.2, transparent: true, opacity: 0.58, roughness: 0.12 });
    material.depthWrite = false;
    const arc = new THREE.InstancedMesh(moulded(0.2, 0.095, 0.08), material, 30);
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
    root.add(arc);
  });
  return { object3d: root };
};


/** Two equal toy moon discs placed in different sky contexts. */
export const createToyboxMoonPair: PrefabFactory = (): PrefabInstance => {
  const root = new THREE.Group();
  root.name = 'toybox.moonPair';
  const moonMaterial = plastic('#F6EAC6', { emissive: '#EBD99E', emissiveIntensity: 0.58, roughness: 0.34 });
  const makeMoon = (name: string, position: [number, number, number]): THREE.Mesh => {
    const moon = part(new THREE.CylinderGeometry(0.8, 0.8, 0.28, 24), moonMaterial.clone(), position);
    moon.rotation.x = Math.PI / 2;
    moon.name = name;
    return moon;
  };
  const horizonMoon = makeMoon('horizonMoon', [-2.6, 1.9, 0]);
  const highMoon = makeMoon('highMoon', [2.4, 5.8, 0]);
  root.add(horizonMoon, highMoon);

  const frameMaterial = plastic('#8FE8FF', { emissive: '#5ED4F2', emissiveIntensity: 0.72, transparent: true, opacity: 0.78, roughness: 0.18 });
  const makeFrame = (name: string, position: THREE.Vector3): THREE.Group => {
    const frame = new THREE.Group(); frame.name = name; frame.position.copy(position);
    frame.add(part(moulded(2.15, 0.06, 0.08), frameMaterial, [0, 1.08, 0.18]));
    frame.add(part(moulded(2.15, 0.06, 0.08), frameMaterial, [0, -1.08, 0.18]));
    return frame;
  };
  const horizonFrame = makeFrame('horizonFrame', horizonMoon.position);
  const highFrame = makeFrame('highFrame', highMoon.position);
  horizonFrame.scale.setScalar(0.001);
  highFrame.scale.setScalar(0.001);
  root.add(horizonFrame, highFrame);
  return { object3d: root, anchors: { horizonMoon, highMoon, horizonFrame, highFrame } };
};

/** Toy star/planet comparison rig with semantic atmosphere checkpoints. */
export const createToyboxStarPlanetPair: PrefabFactory = (): PrefabInstance => {
  const root = new THREE.Group();
  root.name = 'toybox.starPlanetPair';
  const star = part(ballGeometry(0.2, 12), plastic('#F8FBFF', { emissive: '#F0FAFF', emissiveIntensity: 1.05, roughness: 0.12 }), [-2.4, 5.3, 0]);
  star.name = 'star';
  const planet = part(ballGeometry(0.44, 18), plastic('#B9DCF5', { emissive: '#7FC0EA', emissiveIntensity: 0.55, roughness: 0.2 }), [2.4, 5.3, 0]);
  planet.name = 'planet';
  root.add(star, planet);

  const atmosphere = plastic('#73CFF3', { transparent: true, opacity: 0.11, emissive: '#4ABCE8', emissiveIntensity: 0.12, roughness: 0.08 });
  atmosphere.depthWrite = false;
  for (const y of [3.9, 3.0, 2.1]) {
    const layer = part(moulded(7.5, 0.07, 0.08), atmosphere, [0, y, 0]);
    layer.castShadow = false;
    root.add(layer);
  }
  const starMidA = new THREE.Object3D(); starMidA.position.set(-1.65, 3.9, 0); root.add(starMidA);
  const starMidB = new THREE.Object3D(); starMidB.position.set(-1.0, 2.7, 0); root.add(starMidB);
  const planetMidA = new THREE.Object3D(); planetMidA.position.set(1.65, 3.9, 0); root.add(planetMidA);
  const planetMidB = new THREE.Object3D(); planetMidB.position.set(1.0, 2.7, 0); root.add(planetMidB);
  const viewer = new THREE.Object3D(); viewer.position.set(0, 0.8, 0); root.add(viewer);
  return { object3d: root, anchors: { star, planet, starMidA, starMidB, planetMidA, planetMidB, viewer } };
};

export const TOYBOX_PRODUCTION_PREFAB_FACTORIES: Record<string, PrefabFactory> = {
  'prefab.materialSamples': createToyboxMaterialSamples,
  'prefab.balloon': createToyboxBalloon,
  'prefab.demoPanel': createToyboxDemoPanel,
  'prefab.floatTank': createToyboxFloatTank,
  'prefab.bowlSpoon': createToyboxBowlSpoon,
  'prefab.seatRig': createToyboxSeatRig,
  'prefab.featherRock': createToyboxFeatherRock,
  'prefab.paperPlane': createToyboxPaperPlane,
  'prefab.magnetKit': createToyboxMagnetKit,
  'prefab.soundRig': createToyboxSoundRig,
  'prefab.prismDrop': createToyboxPrismDrop,
  'prefab.rainDropletField': createToyboxRainDropletField,
  'prefab.rainbowArc': createToyboxRainbowArc,
  'prefab.moonPair': createToyboxMoonPair,
  'prefab.starPlanetPair': createToyboxStarPlanetPair,
};
