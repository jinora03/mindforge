import * as THREE from 'three';
import {
  disposeObject3D,
  type CameraState,
  type EnvironmentFactory,
  type EnvironmentInstance,
} from '@mindforge/engine';
import {
  STUD,
  TOYBOX_PALETTE,
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

/** Deterministic hash. Toybox owns its own — never borrowed from another theme. */
function hash(x: number, z: number, seed: number): number {
  let n = (Math.imul(x, 526711) + Math.imul(z, 341873) + Math.imul(seed, 132897)) | 0;
  n = Math.imul(n ^ (n >>> 15), 2246822519);
  n ^= n >>> 13;
  return (n >>> 0) / 4294967296;
}

function cameraState(
  position: [number, number, number],
  target: [number, number, number],
  fov: number,
): CameraState {
  return {
    position: new THREE.Vector3(...position),
    target: new THREE.Vector3(...target),
    fov,
  };
}

function brick(
  size: [number, number, number],
  color: string,
  position: [number, number, number],
  options: {
    rubber?: boolean;
    roughness?: number;
    castShadow?: boolean;
    receiveShadow?: boolean;
  } = {},
): THREE.Mesh {
  const mesh = new THREE.Mesh(
    brickGeometry(...size),
    plastic(color, { rubber: options.rubber, roughness: options.roughness }),
  );
  mesh.position.set(...position);
  mesh.castShadow = options.castShadow ?? true;
  mesh.receiveShadow = options.receiveShadow ?? true;
  return mesh;
}

/**
 * A field of studs across a horizontal surface.
 *
 * Studs are the single strongest signal that a surface is built rather than
 * grown, and instancing them costs one draw call for thousands. Bulk scenery
 * uses plain boxes plus studs rather than chamfered parts, which are ~20x the
 * triangles and are reserved for characters and hero props.
 */
function studField(
  color: string,
  cols: number,
  rows: number,
  y: number,
  origin: [number, number] = [0, 0],
  spacing = STUD,
): THREE.InstancedMesh {
  const mesh = new THREE.InstancedMesh(
    studGeometry(spacing * 0.3, spacing * 0.18),
    plastic(color),
    cols * rows,
  );
  const matrix = new THREE.Matrix4();
  let i = 0;
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      matrix.makeTranslation(
        origin[0] + (c - (cols - 1) / 2) * spacing,
        y,
        origin[1] + (r - (rows - 1) / 2) * spacing,
      );
      mesh.setMatrixAt(i++, matrix);
    }
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.receiveShadow = true;
  return mesh;
}

/** Moulded tree: tube trunk, two stacked leaf balls. */
function tree(x: number, z: number, seed: number): THREE.Group {
  const group = new THREE.Group();
  const height = 2.6 + hash(x, z, seed) * 1.4;
  const trunk = new THREE.Mesh(tubeGeometry(0.11, height, 10), plastic(TOYBOX_PALETTE.soil));
  trunk.position.y = height / 2;
  trunk.castShadow = true;
  group.add(trunk);
  const canopy = new THREE.Mesh(ballGeometry(0.95, 14), plastic(TOYBOX_PALETTE.lawnDeep));
  canopy.position.y = height + 0.3;
  canopy.castShadow = true;
  group.add(canopy);
  const top = new THREE.Mesh(ballGeometry(0.66, 12), plastic(TOYBOX_PALETTE.lawn));
  top.position.y = height + 1.2;
  top.castShadow = true;
  group.add(top);
  group.position.set(x, 0, z);
  return group;
}

function toyRotor(radius: number, colors: readonly [string, string]): THREE.Group {
  const rotor = new THREE.Group();
  rotor.name = 'toybox-rotor';
  for (let i = 0; i < 4; i++) {
    const pivot = new THREE.Group();
    pivot.rotation.z = (i * Math.PI) / 2;
    const blade = new THREE.Mesh(
      moulded(radius * 0.24, radius * 0.72, 0.07, 0.018, 2),
      plastic(colors[i % colors.length], { roughness: 0.28 }),
    );
    blade.position.y = radius * 0.42;
    blade.castShadow = true;
    pivot.add(blade);
    rotor.add(pivot);
  }
  const hub = new THREE.Mesh(ballGeometry(radius * 0.16, 12), plastic(TOYBOX_PALETTE.cream));
  hub.position.z = 0.05;
  rotor.add(hub);
  return rotor;
}

function standingSpinner(
  x: number,
  z: number,
  groundY: number,
  colors: readonly [string, string],
): { root: THREE.Group; rotor: THREE.Group } {
  const root = new THREE.Group();
  root.position.set(x, groundY, z);
  const pole = new THREE.Mesh(tubeGeometry(0.055, 2.2, 10), toyMetal());
  pole.position.y = 1.1;
  pole.castShadow = true;
  root.add(pole);
  const rotor = toyRotor(0.62, colors);
  rotor.position.set(0, 2.16, 0.08);
  root.add(rotor);
  return { root, rotor };
}

/* -------------------------------------------------------- dream garden --- */

/**
 * A built outdoor place, not a landscape.
 *
 * Toybox worlds read as assembled: flat plastic ground with visible plate
 * seams, a brick path, stepped platforms, railings and moulded trees — the
 * geometry a player would actually walk around in. Nothing here is generated
 * from a heightmap; every piece is placed.
 */
export const createToyboxDreamGarden: EnvironmentFactory = ({ services }): EnvironmentInstance => {
  const scene = services.scene;
  const group = new THREE.Group();
  group.name = 'toybox.environment.dreamGarden';

  scene.background = new THREE.Color(TOYBOX_PALETTE.skyLow);
  scene.fog = new THREE.Fog(new THREE.Color(TOYBOX_PALETTE.skyHaze), 70, 190);
  group.add(createToySky({}));

  // Ground is smooth, in large panels with visible seams. Studs at ground scale
  // dominated every frame and made the world read as a construction mat rather
  // than a place; they now appear only on built structures, where they belong.
  const GROUND_TOP = -0.04; // the figure's sole height
  const PANEL_HEIGHT = 0.1;
  // The old underlay and panel tops landed on the exact same Y plane, which
  // produced depth fighting as the camera moved. Keep a small volume overlap,
  // but never share a visible surface. Large ground pieces also do not need to
  // cast shadows; disabling those casts removes another source of shimmer.
  group.add(
    brick(
      [70, 0.72, 70],
      TOYBOX_PALETTE.lawnDeep,
      [0, GROUND_TOP - 0.44, 0],
      { castShadow: false },
    ),
  );
  for (let gx = -3; gx <= 3; gx++) {
    for (let gz = -3; gz <= 3; gz++) {
      const shade = (gx + gz) % 2 === 0 ? TOYBOX_PALETTE.lawn : TOYBOX_PALETTE.lawnLight;
      group.add(
        brick(
          [9.6, PANEL_HEIGHT, 9.6],
          shade,
          [gx * 9.8, GROUND_TOP - PANEL_HEIGHT / 2, gz * 9.8],
          { castShadow: false },
        ),
      );
    }
  }

  // A path of stone plates leading to a raised course.
  for (let i = 0; i < 20; i++) {
    const z = -3 - i * 1.05;
    const x = Math.sin(i * 0.26) * 2.2 - 0.4;
    group.add(brick([2.1, 0.12, 1], TOYBOX_PALETTE.stone, [x, GROUND_TOP + 0.01, z]));
  }

  // Stepped obstacle course: platforms climbing away, with a ramp back down.
  const stepColors = [TOYBOX_PALETTE.jacket, TOYBOX_PALETTE.sunflower, TOYBOX_PALETTE.mint, TOYBOX_PALETTE.cobalt];
  for (let s = 0; s < 6; s++) {
    const y = 0.5 + s * 0.75;
    const color = stepColors[s % stepColors.length];
    group.add(brick([3, 0.5, 2.6], color, [9 + s * 0.4, y, -7 - s * 2.4]));
    group.add(studField(color, 4, 3, y + 0.25, [9 + s * 0.4, -7 - s * 2.4], 0.62));
  }
  const ramp = brick([3, 0.4, 9], TOYBOX_PALETTE.stone, [-9, 2.4, -12]);
  ramp.rotation.x = -0.32;
  group.add(ramp);
  for (const rx of [-10.4, -7.6]) {
    const post = new THREE.Mesh(tubeGeometry(0.07, 3.4, 8), toyMetal(TOYBOX_PALETTE.chrome));
    post.position.set(rx, 3.4, -12);
    post.castShadow = true;
    group.add(post);
  }

  // A proper building: walls with a door gap and window bands, not a plain box.
  const wall = TOYBOX_PALETTE.jacket;
  const wallBack = TOYBOX_PALETTE.jacketDeep;
  group.add(brick([9, 3.4, 0.5], wall, [-13, 1.7, -18.6]));
  group.add(brick([0.5, 3.4, 7], wallBack, [-17.3, 1.7, -15.2]));
  group.add(brick([0.5, 3.4, 7], wallBack, [-8.7, 1.7, -15.2]));
  group.add(brick([3.2, 3.4, 0.5], wall, [-15.7, 1.7, -11.8]));
  group.add(brick([3.2, 3.4, 0.5], wall, [-10.3, 1.7, -11.8]));
  group.add(brick([2.4, 0.9, 0.5], wall, [-13, 2.95, -11.8]));
  group.add(brick([9.8, 0.5, 7.8], TOYBOX_PALETTE.cream, [-13, 3.65, -15.2]));
  group.add(studField(TOYBOX_PALETTE.cream, 12, 10, 3.9, [-13, -15.2], 0.78));
  // Window panels sit proud of the side walls. The foundation version placed
  // full-thickness window bricks inside the wall volumes, causing overlapping
  // faces and visible z-fighting during camera movement.
  for (const wz of [-13.4, -17]) {
    group.add(brick([0.08, 1.1, 1.6], TOYBOX_PALETTE.skyMid, [-8.39, 2.1, wz]));
    group.add(brick([0.08, 1.1, 1.6], TOYBOX_PALETTE.skyMid, [-17.61, 2.1, wz]));
  }

  // Fence line along the near edge.
  for (let i = -7; i <= 7; i++) {
    group.add(brick([0.22, 1.1, 0.22], TOYBOX_PALETTE.cream, [i * 1.6, GROUND_TOP + 0.55, 7.5]));
  }
  group.add(brick([23, 0.16, 0.16], TOYBOX_PALETTE.cream, [0, GROUND_TOP + 0.95, 7.5]));
  group.add(brick([23, 0.16, 0.16], TOYBOX_PALETTE.cream, [0, GROUND_TOP + 0.55, 7.5]));

  // Spawn pad the subject stands on, so the staging area reads as built.
  group.add(brick([5.2, 0.08, 5.2], TOYBOX_PALETTE.chrome, [0, GROUND_TOP - 0.03, 0]));
  group.add(brick([3.8, 0.08, 3.8], TOYBOX_PALETTE.lawnLight, [0, GROUND_TOP - 0.02, 0]));

  // Trees: taller trunks and layered canopies rather than single lollipops.
  for (let i = 0; i < 22; i++) {
    const a = i * 2.3999632;
    const r = 11 + (i % 6) * 3.2;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r - 4;
    if (Math.hypot(x, z) < 9) continue;
    group.add(tree(x, z, 41 + i));
  }

  // A couple of slow wind toys give the play-space life without competing with
  // the central interaction. Their motion is derived only from authoritative time.
  const spinnerA = standingSpinner(-6.4, -5.8, GROUND_TOP, [TOYBOX_PALETTE.sunflower, TOYBOX_PALETTE.berry]);
  const spinnerB = standingSpinner(6.8, -13.5, GROUND_TOP, [TOYBOX_PALETTE.mint, TOYBOX_PALETTE.cobalt]);
  group.add(spinnerA.root, spinnerB.root);
  const spinnerRotors = [spinnerA.rotor, spinnerB.rotor];

  // Distant blocks so the horizon has built mass behind the tree line.
  for (let i = 0; i < 9; i++) {
    const a = i * 1.1 + 0.4;
    const r = 40 + (i % 3) * 8;
    const h = 3 + (i % 4) * 2.4;
    group.add(brick([5, h, 5], stepColors[i % stepColors.length], [Math.cos(a) * r, h / 2, Math.sin(a) * r - 10]));
  }

  const clouds = new THREE.Group();
  for (let i = 0; i < 16; i++) {
    const cx = (hash(i, 3, 91) * 2 - 1) * 70;
    const cz = (hash(i, 7, 97) * 2 - 1) * 70;
    const cy = 22 + hash(i, 11, 101) * 9;
    const w = 5 + hash(i, 13, 103) * 6;
    const puff = new THREE.Mesh(brickGeometry(w, 1.2, w * 0.7), plastic(TOYBOX_PALETTE.cream, { roughness: 0.55 }));
    puff.position.set(cx, cy, cz);
    clouds.add(puff);
    const puff2 = new THREE.Mesh(brickGeometry(w * 0.6, 1.2, w * 0.5), plastic(TOYBOX_PALETTE.cream, { roughness: 0.55 }));
    puff2.position.set(cx + w * 0.25, cy + 1.1, cz - 0.4);
    clouds.add(puff2);
  }
  group.add(clouds);
  const cloudOrigin = clouds.position.clone();

  group.add(createToyLighting({ shadowExtent: 16 }));

  return {
    object3d: group,
    defaultCamera: cameraState([2.6, 2.1, 5.8], [0, 1.1, 0], 42),
    update(ctx): void {
      clouds.position.set(cloudOrigin.x + ctx.time * 0.22, cloudOrigin.y, cloudOrigin.z);
      spinnerRotors[0].rotation.z = ctx.time * 0.7;
      spinnerRotors[1].rotation.z = -ctx.time * 0.52 + 0.8;
    },
    dispose(): void {
      disposeObject3D(group);
      group.removeFromParent();
      scene.fog = null;
      scene.background = null;
    },
  };
};

/* ------------------------------------------------------- artifact stage --- */

/**
 * A bright workshop bay rather than a forge.
 *
 * The Heat episode's beats are unchanged — a machine heats, strains, and
 * releases — but the staging is daylit and clean. Warmth is carried by the
 * translucent orange parts and lamp lenses rather than by darkness.
 */
export const createToyboxArtifactStage: EnvironmentFactory = ({ services }): EnvironmentInstance => {
  const scene = services.scene;
  const group = new THREE.Group();
  group.name = 'toybox.environment.artifactStage';

  scene.background = new THREE.Color(TOYBOX_PALETTE.skyLow);
  scene.fog = new THREE.Fog(new THREE.Color(TOYBOX_PALETTE.skyHaze), 40, 130);
  group.add(createToySky({}));

  group.add(brick([34, 0.6, 34], TOYBOX_PALETTE.stone, [0, -0.3, 0]));
  group.add(studField(TOYBOX_PALETTE.stone, 44, 44, 0, [0, 0], 0.72));

  // Bench platform under the machine.
  group.add(brick([7, 0.5, 7], TOYBOX_PALETTE.cobalt, [0, 0.25, 0]));
  group.add(studField(TOYBOX_PALETTE.cobalt, 9, 9, 0.5, [0, 0], 0.72));

  // Back wall of stacked bright bricks, low enough to keep the sky visible.
  const wallColors = [TOYBOX_PALETTE.jacket, TOYBOX_PALETTE.sunflower, TOYBOX_PALETTE.mint, TOYBOX_PALETTE.cobalt];
  for (let row = 0; row < 5; row++) {
    for (let c = -5; c <= 5; c++) {
      const color = wallColors[(Math.abs(c) + row) % wallColors.length];
      group.add(brick([1.5, 0.8, 0.9], color, [c * 1.55 + (row % 2) * 0.4, 0.4 + row * 0.8, -8.5]));
    }
  }

  // Chunky pipework overhead, catching the key light.
  const chrome = toyMetal();
  for (const z of [-5.5, 3.5]) {
    const pipe = new THREE.Mesh(tubeGeometry(0.16, 16, 12), chrome);
    pipe.rotation.z = Math.PI / 2;
    pipe.position.set(0, 6.2, z);
    pipe.castShadow = true;
    group.add(pipe);
  }
  for (const [cx, cz] of [[-6.5, -5.5], [6.5, -5.5], [-6.5, 3.5], [6.5, 3.5]] as const) {
    const post = new THREE.Mesh(tubeGeometry(0.16, 6.4, 10), chrome);
    post.position.set(cx, 3.2, cz);
    post.castShadow = true;
    group.add(post);
  }

  // Two large wall fans make the workshop read as an operating toy factory.
  // Keep them slightly in front of the brick wall to avoid coplanar surfaces.
  const factoryFans: THREE.Group[] = [];
  for (const [fx, phase] of [[-4.4, 0], [4.4, Math.PI / 4]] as const) {
    const casing = new THREE.Mesh(
      new THREE.TorusGeometry(0.88, 0.09, 8, 28),
      toyMetal(TOYBOX_PALETTE.chrome),
    );
    casing.position.set(fx, 2.45, -7.92);
    casing.castShadow = true;
    group.add(casing);

    const fan = toyRotor(0.82, [TOYBOX_PALETTE.mint, TOYBOX_PALETTE.sunflower]);
    fan.position.set(fx, 2.45, -7.78);
    fan.rotation.z = phase;
    factoryFans.push(fan);
    group.add(fan);
  }

  // Warm lamp lenses, kept near the centre line so every shot sees them.
  const lamps: THREE.Mesh[] = [];
  for (const [lx, lz] of [[-2.4, -2], [2.4, -2], [-2.4, 2.4], [2.4, 2.4]] as const) {
    const lamp = new THREE.Mesh(
      ballGeometry(0.28, 12),
      plastic(TOYBOX_PALETTE.heatBright, {
        roughness: 0.14,
        emissive: TOYBOX_PALETTE.heat,
        emissiveIntensity: 1.1,
      }),
    );
    lamp.position.set(lx, 5.4, lz);
    lamps.push(lamp);
    group.add(lamp);
  }

  // Crates and spare parts.
  for (const [cx, cz, color] of [
    [-7, 1, TOYBOX_PALETTE.tangerine],
    [-6, 2.4, TOYBOX_PALETTE.mint],
    [7.2, 0.6, TOYBOX_PALETTE.sunflower],
  ] as const) {
    group.add(brick([1.2, 1.2, 1.2], color, [cx, 0.6, cz]));
    group.add(studField(color, 2, 2, 1.2, [cx, cz], 0.5));
  }

  group.add(createToyLighting({ warm: true, shadowExtent: 13 }));
  const warmFill = new THREE.PointLight(new THREE.Color('#FFB870'), 18, 16, 2);
  warmFill.position.set(0, 4.2, 2.4);
  group.add(warmFill);

  return {
    object3d: group,
    defaultCamera: cameraState([0, 3.6, 10.4], [0, 2.0, 0], 44),
    update(ctx): void {
      for (let i = 0; i < lamps.length; i++) {
        const material = lamps[i].material as THREE.MeshStandardMaterial;
        material.emissiveIntensity = 1.0 + 0.25 * Math.sin(ctx.time * 1.7 + i * 1.2);
      }
      factoryFans[0].rotation.z = ctx.time * 1.15;
      factoryFans[1].rotation.z = -ctx.time * 0.92 + Math.PI / 4;
    },
    dispose(): void {
      disposeObject3D(group);
      group.removeFromParent();
      scene.fog = null;
      scene.background = null;
    },
  };
};

/* ---------------------------------------------------------- cosmic void --- */

/** Floating plastic plates in a pale sky. */
export const createToyboxCosmicVoid: EnvironmentFactory = ({ services }): EnvironmentInstance => {
  const scene = services.scene;
  const group = new THREE.Group();
  group.name = 'toybox.environment.cosmicVoid';

  scene.background = new THREE.Color('#CBE7F7');
  scene.fog = new THREE.Fog(new THREE.Color('#DCF0FA'), 30, 120);
  group.add(createToySky({ bands: ['#7FC5EC', '#A5D9F2', '#C6E8F8', '#E2F4FC'] }));

  // Central platform so anything staged at the origin has ground under it.
  group.add(brick([9, 0.5, 9], TOYBOX_PALETTE.lawn, [0, -0.25, 0]));
  group.add(studField(TOYBOX_PALETTE.lawn, 12, 12, 0, [0, 0], 0.72));
  group.add(brick([7.6, 0.5, 7.6], TOYBOX_PALETTE.stone, [0, -0.7, 0]));
  group.add(brick([5.4, 0.5, 5.4], TOYBOX_PALETTE.stoneDeep, [0, -1.15, 0]));

  const drifting = new THREE.Group();
  drifting.name = 'toybox-plates';
  const colors = [TOYBOX_PALETTE.jacket, TOYBOX_PALETTE.sunflower, TOYBOX_PALETTE.mint, TOYBOX_PALETTE.cobalt];
  for (let i = 0; i < 12; i++) {
    const a = i * 2.3999632;
    const r = 12 + (i % 5) * 3.4;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const y = (i % 6) * 1.4 - 3;
    const size = 2.4 + (i % 4) * 0.9;
    const color = colors[i % colors.length];
    const plate = brick([size, 0.5, size], color, [x, y, z]);
    drifting.add(plate);
    const studs = studField(color, 3, 3, y + 0.25, [x, z], 0.6);
    drifting.add(studs);
  }
  group.add(drifting);

  group.add(createToyLighting({ shadowExtent: 12 }));

  return {
    object3d: group,
    defaultCamera: cameraState([0, 3.0, 11], [0, 1.2, 0], 44),
    update(ctx): void {
      drifting.rotation.y = ctx.time * 0.02;
    },
    dispose(): void {
      disposeObject3D(group);
      group.removeFromParent();
      scene.fog = null;
      scene.background = null;
    },
  };
};

/** Retained helper for scenes wanting a single moulded part. */
export function createToyPart(size: [number, number, number], color: string): THREE.Mesh {
  const mesh = new THREE.Mesh(moulded(size[0], size[1], size[2]), plastic(color));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export const TOYBOX_ENVIRONMENT_FACTORIES: Record<string, EnvironmentFactory> = {
  'environment.cosmicVoid': createToyboxCosmicVoid,
  'environment.artifactStage': createToyboxArtifactStage,
  'environment.dreamGarden': createToyboxDreamGarden,
};
