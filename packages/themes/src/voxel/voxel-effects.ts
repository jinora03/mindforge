import * as THREE from 'three';
import type {
  EffectEvent,
  EffectFactory,
  EffectInstance,
  SceneServices,
  VisualTone,
} from '@mindforge/engine';
import { composeEffectLayers, createEffectInfluenceLayer, type EffectLayer } from '@mindforge/effects';
import { createVoxelDebrisMaterial, createVoxelGlow, voxelToneColor } from './voxel-style';

/**
 * Effect vocabulary for the Voxel theme.
 *
 * Two rules separate these from generic particle systems. First, motion is
 * **stepped**: positions quantise onto a small grid so energy reads as moving
 * through a block world rather than sliding over it. Second, debris is **lit**
 * — cube fragments use a Lambert material that receives scene light, with a
 * smaller unlit core for the genuinely glowing part. Effects built purely from
 * unlit glow always read as UI floating in front of the world.
 *
 * Everything is a pure function of `ctx.progress` / `ctx.localTime`, so seeking
 * backward and forward reconstructs identical state and nothing can stick.
 */

const IDENTITY_QUATERNION = new THREE.Quaternion();
const INSTANCE_MATRIX = new THREE.Matrix4();
const INSTANCE_SCALE = new THREE.Vector3();

/** Snap a world position onto a block-sized lattice. */
function quantise(v: THREE.Vector3, step: number): THREE.Vector3 {
  if (step <= 0) return v;
  v.set(Math.round(v.x / step) * step, Math.round(v.y / step) * step, Math.round(v.z / step) * step);
  return v;
}

/** Rotation snapped to quarter turns — blocks never tumble smoothly. */
function blockRotation(out: THREE.Quaternion, euler: THREE.Euler, t: number, index: number): THREE.Quaternion {
  const step = Math.PI / 2;
  euler.set(
    Math.floor(t * 3 + index * 0.7) * step,
    Math.floor(t * 2 + index * 1.3) * step,
    Math.floor(t * 1.5 + index) * step,
  );
  return out.setFromEuler(euler);
}

function readNumber(event: EffectEvent, key: string, fallback: number): number {
  const value = event.parameters?.[key];
  return typeof value === 'number' ? value : fallback;
}

function eventColor(event: EffectEvent, fallback: VisualTone): THREE.Color {
  return event.color ? new THREE.Color(event.color) : voxelToneColor(event.tone ?? fallback);
}

function resolvePath(event: EffectEvent, services: SceneServices): THREE.Object3D[] {
  const refs: string[] = event.through
    ? [...event.through]
    : [event.from, event.to].filter((ref: string | undefined): ref is string => Boolean(ref));
  return refs.map((ref: string) => services.resolveAnchor(ref));
}

const WORLD_UP = new THREE.Vector3(0, 1, 0);

/**
 * Direction to bow a body-hugging path out to one side.
 *
 * Effects like the prediction signal travel between semantic anchors that sit
 * *on* the character (`head`, `chest`, `handRight`). Drawing straight along
 * them paints the effect across the face, which in a 9:16 frame is the one
 * thing that has to stay readable. Bowing toward the destination side keeps the
 * chain clear of the head while still starting and ending on its anchors.
 *
 * Derived purely from anchor positions — never the camera. Effects are
 * evaluated *before* camera state each frame, so reading the camera here would
 * sample the previous frame's view and break deterministic seeking.
 */
function lateralBowDirection(
  first: THREE.Vector3,
  last: THREE.Vector3,
  out: THREE.Vector3,
): THREE.Vector3 {
  out.subVectors(last, first);
  out.y = 0;
  if (out.lengthSq() < 1e-6) {
    // Purely vertical path: any consistent horizontal direction will do.
    out.copy(WORLD_UP).cross(new THREE.Vector3(0, 0, 1));
  }
  return out.normalize();
}

/** Bow weight: small at the ends so the chain still meets its anchors. */
function bowWeight(t: number): number {
  const clamped = t < 0 ? 0 : t > 1 ? 1 : t;
  return 0.3 + 0.7 * Math.sin(Math.PI * clamped);
}

/** Total polyline length of a path, used to keep the bow scale-invariant. */
function pathLength(points: THREE.Vector3[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += points[i].distanceTo(points[i - 1]);
  return total;
}

/**
 * How far to bow a path sideways, expressed as a **fraction of the path's own
 * length** rather than an absolute distance.
 *
 * A fixed offset in metres changes character with scene scale: 0.46m across a
 * 1m body path is a deliberate arc, across a 4m machine path it is an invisible
 * lean, and across a 0.3m gap it swings further than the gap itself. Scaling to
 * the path keeps the shape identical at any size. Authors override per event
 * with `parameters.bow` — `0` gives a straight line.
 */
function bowAmount(event: EffectEvent, points: THREE.Vector3[], fallbackFraction: number): number {
  const fraction = readNumber(event, 'bow', fallbackFraction);
  return pathLength(points) * fraction;
}

function samplePath(points: THREE.Vector3[], t: number, out: THREE.Vector3): THREE.Vector3 {
  if (points.length === 0) return out.set(0, 0, 0);
  if (points.length === 1) return out.copy(points[0]);
  const clamped = t < 0 ? 0 : t > 1 ? 1 : t;
  const scaled = clamped * (points.length - 1);
  const i = Math.min(points.length - 2, Math.floor(scaled));
  return out.copy(points[i]).lerp(points[i + 1], scaled - i);
}

function setInstance(
  mesh: THREE.InstancedMesh,
  index: number,
  position: THREE.Vector3,
  scale: number,
  rotation: THREE.Quaternion = IDENTITY_QUATERNION,
): void {
  INSTANCE_SCALE.setScalar(scale);
  INSTANCE_MATRIX.compose(position, rotation, INSTANCE_SCALE);
  mesh.setMatrixAt(index, INSTANCE_MATRIX);
}

function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

function missing(effect: string, field: string): never {
  throw new Error(`${effect} requires "${field}" anchor`);
}

/* --------------------------------------------------------------- signals -- */

/** A row of discrete block pulses stepping along a link, not a thin laser. */
export const createVoxelSignalPath: EffectFactory = ({ event, services }): EffectInstance => {
  const from = services.resolveAnchor(event.from ?? missing('effect.signal.path', 'from'));
  const to = services.resolveAnchor(event.to ?? missing('effect.signal.path', 'to'));
  const thickness = Math.max(0.05, readNumber(event, 'thickness', 0.06));
  const segmentCount = 14;
  const color = eventColor(event, 'information');
  const material = createVoxelGlow(color, 0.9);
  material.transparent = true;
  material.depthWrite = false;
  const mesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(thickness, thickness, thickness),
    material,
    segmentCount,
  );
  mesh.visible = false;
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const p = new THREE.Vector3();
  const intensity = event.intensity ?? 1;

  return {
    object3d: mesh,
    update(ctx): void {
      mesh.visible = ctx.active;
      if (!ctx.active) return;
      from.getWorldPosition(a);
      to.getWorldPosition(b);
      for (let i = 0; i < segmentCount; i++) {
        const t = i / (segmentCount - 1);
        p.copy(a).lerp(b, t);
        // Discrete on/off travelling along the link rather than a sine glow.
        const wave = Math.floor((ctx.localTime * 7 - i * 0.5) % 3) === 0 ? 1.45 : 0.85;
        setInstance(mesh, i, p, wave);
      }
      mesh.instanceMatrix.needsUpdate = true;
      material.opacity = intensity * (0.6 + 0.34 * Math.sin(Math.PI * ctx.progress));
    },
    reset(): void {
      mesh.visible = false;
    },
    dispose(): void {
      mesh.geometry.dispose();
      material.dispose();
      mesh.dispose();
      mesh.removeFromParent();
    },
  };
};

/**
 * A prediction packet travelling through semantic anchors as a chain of
 * information blocks, leaving stepped ghost blocks behind it.
 */
export const createVoxelPredictionSignal: EffectFactory = ({ event, services }): EffectInstance => {
  const anchors = resolvePath(event, services);
  const group = new THREE.Group();
  group.visible = false;
  const color = eventColor(event, 'prediction');

  // Opaque, crisp, and small. The previous version wrapped the core in a
  // translucent 0.32 shell and stacked ten depth-write-disabled trail cubes,
  // which accumulated into a pale blue smear over the face instead of reading
  // as discrete information blocks.
  const nodeMaterial = createVoxelGlow(color, 1);
  const node = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 0.15), nodeMaterial);
  group.add(node);

  const trailCount = 9;
  const trailMaterial = createVoxelGlow(color, 0.85);
  trailMaterial.transparent = true;
  trailMaterial.depthWrite = false;
  const trail = new THREE.InstancedMesh(new THREE.BoxGeometry(0.105, 0.105, 0.105), trailMaterial, trailCount);
  group.add(trail);

  const points = anchors.map(() => new THREE.Vector3());
  const scratch = new THREE.Vector3();
  const trailPosition = new THREE.Vector3();
  const bow = new THREE.Vector3();
  const euler = new THREE.Euler();
  const rotation = new THREE.Quaternion();
  const intensity = event.intensity ?? 1;

  return {
    object3d: group,
    update(ctx): void {
      group.visible = ctx.active;
      if (!ctx.active) return;
      anchors.forEach((anchor, i) => anchor.getWorldPosition(points[i]));
      lateralBowDirection(points[0], points[points.length - 1], bow);
      const bowSize = bowAmount(event, points, 0.45);

      // Stepping the head along the path in discrete hops is what makes this
      // read as information moving through a block world.
      const steps = 20;
      const stepped = Math.round(ctx.progress * steps) / steps;
      samplePath(points, stepped, scratch).addScaledVector(bow, bowSize * bowWeight(stepped));
      node.position.copy(scratch);
      node.quaternion.copy(blockRotation(rotation, euler, ctx.localTime, 0));
      node.scale.setScalar(Math.floor(ctx.localTime * 8) % 2 === 0 ? 1.12 : 0.92);

      for (let i = 0; i < trailCount; i++) {
        // Spaced wider than one step so consecutive blocks read separately
        // instead of merging into a bar.
        const t = stepped - ((i + 1) * 1.5) / steps;
        samplePath(points, t, trailPosition).addScaledVector(bow, bowSize * bowWeight(t));
        quantise(trailPosition, 0.05);
        const scale = t >= 0 ? Math.max(0.28, 1 - i * 0.085) : 0.001;
        setInstance(trail, i, trailPosition, scale, blockRotation(rotation, euler, ctx.localTime, i + 1));
      }
      trail.instanceMatrix.needsUpdate = true;
      trailMaterial.opacity = intensity * 0.85;
    },
    reset(): void {
      group.visible = false;
    },
    dispose(): void {
      node.geometry.dispose();
      nodeMaterial.dispose();
      trail.geometry.dispose();
      trailMaterial.dispose();
      trail.dispose();
      group.removeFromParent();
    },
  };
};

/** Blocky forward-model ghost with three stepped afterimages. */
export const createVoxelGhostMovement: EffectFactory = ({ event, services }): EffectInstance => {
  const destination = services.resolveAnchor(
    event.to ?? event.target ?? missing('effect.ghostMovement', 'to or target'),
  );
  const origin = event.from ? services.resolveAnchor(event.from) : undefined;
  const lead = clamp(readNumber(event, 'lead', 0.3), 0, 0.6);
  const size = readNumber(event, 'size', 0.13);
  const materials = [0.6, 0.34, 0.18].map((opacity) => {
    const material = createVoxelGlow(eventColor(event, 'prediction'), opacity);
    material.transparent = true;
    material.depthWrite = false;
    return material;
  });
  const roots = materials.map((material) => buildGhostBlocks(size, material));
  const root = new THREE.Group();
  root.add(...roots);
  root.visible = false;

  const fromPos = new THREE.Vector3();
  const toPos = new THREE.Vector3();
  const scratch = new THREE.Vector3();
  const bow = new THREE.Vector3();
  const intensity = event.intensity ?? 1;

  return {
    object3d: root,
    update(ctx): void {
      root.visible = ctx.active;
      if (!ctx.active) return;
      destination.getWorldPosition(toPos);
      if (origin) origin.getWorldPosition(fromPos);
      else fromPos.copy(toPos);

      lateralBowDirection(fromPos, toPos, bow);
      const bowSize = bowAmount(event, [fromPos, toPos], 0.5);
      const rise = Math.min(1, ctx.progress / 0.16);
      const fall = ctx.progress < 0.72 ? 1 : Math.max(0, 1 - (ctx.progress - 0.72) / 0.28);
      for (let i = 0; i < roots.length; i++) {
        const delayed = clamp(ctx.progress - i * 0.09, 0, 1);
        const ahead = clamp(delayed / (1 - lead), 0, 1);
        scratch.copy(fromPos).lerp(toPos, ahead * (2 - ahead));
        // Bowed clear of the torso for the same reason as the signal chain.
        scratch.addScaledVector(bow, bowSize * bowWeight(ahead));
        // Afterimages land on a lattice so they read as ghost blocks.
        roots[i].position.copy(quantise(scratch, 0.05));
        materials[i].opacity = intensity * [0.6, 0.34, 0.18][i] * rise * fall;
      }
    },
    reset(): void {
      root.visible = false;
      for (const material of materials) material.opacity = 0;
    },
    dispose(): void {
      root.traverse((node: THREE.Object3D) => {
        const mesh = node as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
      });
      for (const material of materials) material.dispose();
      root.removeFromParent();
    },
  };
};

/* -------------------------------------------------------------- pressure -- */

/**
 * A cage of discrete blocks closing in on the target and releasing. The
 * previous version used nested wireframe frames, which is HUD language; a
 * shrinking ring of solid cubes stays inside the block vocabulary.
 */
export const createVoxelContourPressure: EffectFactory = ({ event, services }): EffectInstance => {
  const center = services.resolveAnchor(
    event.target ?? event.from ?? missing('effect.contour.pressure', 'target or from'),
  );
  const scale = readNumber(event, 'scale', 1);
  const releaseAt = clamp(readNumber(event, 'releaseAt', 0.78), 0.05, 0.99);
  const shellCount = 3;
  const perShell = 12;
  const total = shellCount * perShell;

  const base = voxelToneColor(event.tone === 'heat' ? 'information' : 'prediction');
  const active = eventColor(event, event.tone ?? 'suppression');
  const material = createVoxelDebrisMaterial(base.clone(), {
    emissive: base.clone(),
    emissiveIntensity: 0.4,
    opacity: 0.7,
  });
  const mesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.1 * scale, 0.1 * scale, 0.1 * scale),
    material,
    total,
  );
  mesh.visible = false;

  const world = new THREE.Vector3();
  const position = new THREE.Vector3();
  const euler = new THREE.Euler();
  const rotation = new THREE.Quaternion();
  const intensity = event.intensity ?? 1;

  return {
    object3d: mesh,
    update(ctx): void {
      mesh.visible = ctx.active;
      if (!ctx.active) return;
      center.getWorldPosition(world);
      mesh.position.copy(world);

      const releasing = ctx.progress >= releaseAt;
      const release = releasing ? (ctx.progress - releaseAt) / (1 - releaseAt) : 0;
      const pressure = releasing ? 1 - release : Math.sin((ctx.progress / releaseAt) * Math.PI * 0.5);

      let i = 0;
      for (let s = 0; s < shellCount; s++) {
        const radius = (0.42 + s * 0.2) * scale * (1 - pressure * 0.42 + release * 0.5);
        const tilt = s * 0.5;
        for (let k = 0; k < perShell; k++) {
          const angle = (k / perShell) * Math.PI * 2 + tilt;
          position.set(
            Math.cos(angle) * radius,
            Math.sin(angle * 2 + tilt) * radius * 0.42,
            Math.sin(angle) * radius,
          );
          setInstance(mesh, i, position, 0.7 + pressure * 0.6, blockRotation(rotation, euler, ctx.localTime, i));
          i++;
        }
      }
      mesh.instanceMatrix.needsUpdate = true;
      material.color.copy(base).lerp(active, pressure);
      material.emissive.copy(material.color);
      material.opacity = intensity * (releasing ? 0.7 * (1 - release) : 0.35 + pressure * 0.45);
    },
    reset(): void {
      mesh.visible = false;
    },
    dispose(): void {
      mesh.geometry.dispose();
      material.dispose();
      mesh.dispose();
      mesh.removeFromParent();
    },
  };
};

/* ------------------------------------------------------------ shockwave --- */

/** Expanding square rings built from discrete blocks, plus tumbling debris. */
export const createVoxelContourShockwave: EffectFactory = ({ event, services }): EffectInstance => {
  const center = services.resolveAnchor(
    event.target ?? event.from ?? missing('effect.contour.shockwave', 'target or from'),
  );
  const size = readNumber(event, 'size', 2.4);
  const thickness = Math.max(0.09, readNumber(event, 'thickness', 0.12));
  const group = new THREE.Group();
  group.visible = false;
  const color = eventColor(event, 'heat');

  const ringCount = 3;
  const perRing = 28;
  const ringMaterial = createVoxelGlow(color, 0.9);
  ringMaterial.transparent = true;
  ringMaterial.depthWrite = false;
  const rings = new THREE.InstancedMesh(
    new THREE.BoxGeometry(thickness, thickness, thickness),
    ringMaterial,
    ringCount * perRing,
  );
  group.add(rings);

  const debrisCount = 26;
  const debrisMaterial = createVoxelDebrisMaterial(voxelToneColor('reaction'), {
    emissive: color.clone(),
    emissiveIntensity: 0.5,
    opacity: 0.95,
  });
  const debris = new THREE.InstancedMesh(new THREE.BoxGeometry(0.11, 0.11, 0.11), debrisMaterial, debrisCount);
  group.add(debris);

  const world = new THREE.Vector3();
  const position = new THREE.Vector3();
  const euler = new THREE.Euler();
  const rotation = new THREE.Quaternion();
  const intensity = event.intensity ?? 1;

  return {
    object3d: group,
    update(ctx): void {
      group.visible = ctx.active;
      if (!ctx.active) return;
      center.getWorldPosition(world);
      group.position.copy(world);

      let i = 0;
      for (let r = 0; r < ringCount; r++) {
        const delayed = clamp((ctx.progress - r * 0.09) / (1 - r * 0.09), 0, 1);
        const spread = Math.max(0.02, delayed * size);
        for (let k = 0; k < perRing; k++) {
          // Walk the perimeter of a square, so the wave has flat sides.
          const t = (k / perRing) * 4;
          const leg = Math.floor(t);
          const f = t - leg;
          const a = f * 2 - 1;
          if (leg === 0) position.set(a, 0, -1);
          else if (leg === 1) position.set(1, 0, a);
          else if (leg === 2) position.set(-a, 0, 1);
          else position.set(-1, 0, -a);
          position.multiplyScalar(spread * 0.5);
          position.y = Math.sin(Math.PI * delayed) * 0.12;
          setInstance(rings, i, position, 1 - delayed * 0.35);
          i++;
        }
      }
      rings.instanceMatrix.needsUpdate = true;
      ringMaterial.opacity = intensity * Math.max(0, 1 - ctx.progress) * 0.95;

      for (let k = 0; k < debrisCount; k++) {
        const angle = (k / debrisCount) * Math.PI * 2 + (k % 3) * 0.17;
        const speed = size * (0.32 + (k % 5) * 0.05);
        const radial = ctx.progress * speed;
        position.set(
          Math.cos(angle) * radial,
          Math.sin(Math.PI * ctx.progress) * (0.3 + (k % 4) * 0.09) - ctx.progress * ctx.progress * 0.5,
          Math.sin(angle) * radial,
        );
        setInstance(debris, k, position, Math.max(0.1, 1 - ctx.progress), blockRotation(rotation, euler, ctx.localTime, k));
      }
      debris.instanceMatrix.needsUpdate = true;
      debrisMaterial.opacity = intensity * Math.max(0, 1 - ctx.progress) * 0.95;
    },
    reset(): void {
      group.visible = false;
    },
    dispose(): void {
      rings.geometry.dispose();
      ringMaterial.dispose();
      rings.dispose();
      debris.geometry.dispose();
      debrisMaterial.dispose();
      debris.dispose();
      group.removeFromParent();
    },
  };
};

/* -------------------------------------------------------------- reaction -- */

/**
 * A burst of lit cube fragments on ballistic arcs, with a smaller set of
 * unlit sparks for the hot centre. Fragments shrink in discrete steps so they
 * look like breaking blocks rather than fading sprites.
 */
export const createVoxelReactionBurst: EffectFactory = ({ event, services }): EffectInstance => {
  const center = services.resolveAnchor(
    event.target ?? event.from ?? missing('effect.reaction.burst', 'target or from'),
  );
  const count = Math.max(8, Math.round(readNumber(event, 'count', 32)));
  const radius = readNumber(event, 'radius', 1.1);
  const size = readNumber(event, 'size', 0.05) * 2.1;
  const sparkCount = Math.max(4, Math.round(count * 0.35));

  const group = new THREE.Group();
  group.visible = false;

  const start = eventColor(event, 'reaction');
  const end = voxelToneColor(event.tone === 'heat' ? 'heat' : 'insight');
  const chunkMaterial = createVoxelDebrisMaterial(start.clone(), {
    emissive: start.clone(),
    emissiveIntensity: 0.35,
    opacity: 0.98,
  });
  const chunks = new THREE.InstancedMesh(new THREE.BoxGeometry(size, size, size), chunkMaterial, count);
  group.add(chunks);

  const sparkMaterial = createVoxelGlow(voxelToneColor('insight'), 0.95);
  sparkMaterial.transparent = true;
  sparkMaterial.depthWrite = false;
  const sparks = new THREE.InstancedMesh(
    new THREE.BoxGeometry(size * 0.45, size * 0.45, size * 0.45),
    sparkMaterial,
    sparkCount,
  );
  group.add(sparks);

  const directions: THREE.Vector3[] = [];
  for (let i = 0; i < count; i++) {
    const angle = i * 2.399963229728653;
    const horizontal = 0.68 + (i % 5) * 0.07;
    const y = 0.3 + (i % 7) * 0.08;
    directions.push(
      new THREE.Vector3(Math.cos(angle) * horizontal, y, Math.sin(angle) * horizontal).normalize(),
    );
  }

  const position = new THREE.Vector3();
  const rotation = new THREE.Quaternion();
  const euler = new THREE.Euler();
  const world = new THREE.Vector3();
  const intensity = event.intensity ?? 1;

  return {
    object3d: group,
    update(ctx): void {
      group.visible = ctx.active;
      if (!ctx.active) return;
      center.getWorldPosition(world);
      group.position.copy(world);
      const t = ctx.progress;

      for (let i = 0; i < count; i++) {
        const speed = radius * (0.75 + (i % 6) * 0.055);
        position.copy(directions[i]).multiplyScalar(t * speed);
        // Ballistic arc: rise then fall, so fragments obey the world.
        position.y += Math.sin(Math.PI * t) * (0.26 + (i % 5) * 0.07) - t * t * 0.55;
        // Shrink in four discrete steps — breaking blocks, not fading sprites.
        const stepped = Math.ceil((1 - t) * 4) / 4;
        setInstance(chunks, i, position, Math.max(0.12, stepped * (0.7 + (i % 4) * 0.11)), blockRotation(rotation, euler, ctx.localTime, i));
      }
      chunks.instanceMatrix.needsUpdate = true;

      for (let i = 0; i < sparkCount; i++) {
        const d = directions[(i * 3) % count];
        const speed = radius * (1.15 + (i % 4) * 0.12);
        position.copy(d).multiplyScalar(Math.min(1, t * 1.8) * speed);
        position.y += Math.sin(Math.PI * Math.min(1, t * 1.8)) * 0.34;
        const flicker = Math.floor(ctx.localTime * 18 + i) % 2 === 0 ? 1 : 0.4;
        setInstance(sparks, i, position, Math.max(0.05, (1 - t) * flicker));
      }
      sparks.instanceMatrix.needsUpdate = true;

      chunkMaterial.color.copy(start).lerp(end, t * 0.8);
      chunkMaterial.emissive.copy(chunkMaterial.color);
      chunkMaterial.opacity = intensity * Math.max(0, 1 - t * 0.9);
      sparkMaterial.opacity = intensity * Math.max(0, 1 - t);
    },
    reset(): void {
      group.visible = false;
    },
    dispose(): void {
      chunks.geometry.dispose();
      chunkMaterial.dispose();
      chunks.dispose();
      sparks.geometry.dispose();
      sparkMaterial.dispose();
      sparks.dispose();
      group.removeFromParent();
    },
  };
};

/* ----------------------------------------------------------- information -- */

/** Data blocks travelling a link, hopping between lattice positions. */
export const createVoxelInformationStream: EffectFactory = ({ event, services }): EffectInstance => {
  const anchors = resolvePath(event, services);
  if (anchors.length < 2) {
    throw new Error('effect.informationStream requires at least two anchors (from/to or through)');
  }
  const density = Math.max(1, Math.round(readNumber(event, 'density', 24)));
  const speed = readNumber(event, 'speed', 0.3);
  const size = readNumber(event, 'size', 0.06) * 2;
  const color = eventColor(event, 'information');

  const material = createVoxelDebrisMaterial(color.clone(), {
    emissive: color.clone(),
    emissiveIntensity: 0.75,
    opacity: 0.95,
  });
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(size, size, size), material, density);
  mesh.visible = false;

  const points = anchors.map(() => new THREE.Vector3());
  const position = new THREE.Vector3();
  const bow = new THREE.Vector3();
  const rotation = new THREE.Quaternion();
  const euler = new THREE.Euler();
  const intensity = event.intensity ?? 1;

  return {
    object3d: mesh,
    update(ctx): void {
      mesh.visible = ctx.active;
      if (!ctx.active) return;
      anchors.forEach((anchor, i) => anchor.getWorldPosition(points[i]));
      lateralBowDirection(points[0], points[points.length - 1], bow);
      const bowSize = bowAmount(event, points, 0.04);
      const steps = 24;
      for (let i = 0; i < density; i++) {
        const raw = (i / density + ctx.localTime * speed) % 1;
        const stepped = Math.round(raw * steps) / steps;
        samplePath(points, stepped, position).addScaledVector(bow, bowSize * bowWeight(stepped));
        // Small lateral offsets keep the stream from reading as one line.
        position.x += ((i % 3) - 1) * size * 0.9;
        position.y += (((i * 7) % 3) - 1) * size * 0.7;
        const pulse = Math.floor(ctx.localTime * 6 + i) % 3 === 0 ? 1.25 : 0.85;
        setInstance(mesh, i, position, pulse, blockRotation(rotation, euler, ctx.localTime, i));
      }
      mesh.instanceMatrix.needsUpdate = true;
      material.opacity = intensity * (0.7 + 0.25 * Math.sin(Math.PI * ctx.progress));
    },
    reset(): void {
      mesh.visible = false;
    },
    dispose(): void {
      mesh.geometry.dispose();
      material.dispose();
      mesh.dispose();
      mesh.removeFromParent();
    },
  };
};

/** Warm answer flash with a stepped pulse so silhouettes remain readable. */
export const createVoxelInsightFlash: EffectFactory = ({ event }): EffectInstance => {
  const maxOpacity = Math.min(0.3, readNumber(event, 'maxOpacity', 0.26)) * (event.intensity ?? 1);
  const material = new THREE.MeshBasicMaterial({
    color: eventColor(event, 'insight'),
    side: THREE.BackSide,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    depthTest: false,
    toneMapped: false,
    fog: false,
  });
  const shell = new THREE.Mesh(new THREE.BoxGeometry(44, 44, 44), material);
  shell.visible = false;

  const envelope = (progress: number): number => {
    const pulse = Math.sin(Math.PI * progress) ** 1.7;
    return Math.round(pulse * 4) / 4;
  };
  const visualLayer: EffectLayer = {
    object3d: shell,
    update(ctx): void {
      shell.visible = ctx.active;
      if (!ctx.active) return;
      // Quantised into four steps: a hard flash reads better than a soft bloom.
      material.opacity = maxOpacity * envelope(ctx.progress);
    },
    reset(): void {
      shell.visible = false;
      material.opacity = 0;
    },
    dispose(): void {
      shell.geometry.dispose();
      material.dispose();
    },
  };
  const influenceScale = Math.max(0, event.intensity ?? 1);
  const responseLayer = createEffectInfluenceLayer(
    [
      { channel: 'screenExposure', strength: 0.24 * influenceScale },
      { channel: 'environmentLight', strength: 0.18 * influenceScale },
      { channel: 'emissiveBoost', strength: 0.1 * influenceScale },
    ],
    (ctx) => envelope(ctx.progress),
  );

  return composeEffectLayers([visualLayer, responseLayer]);
};

/* ----------------------------------------------------------------- parts -- */

/**
 * A ghost is a chunky cube with two smaller satellites. Thin fingers and tapered
 * limbs vanish at Shorts size; a clear cubic silhouette survives.
 */
function buildGhostBlocks(size: number, material: THREE.Material): THREE.Group {
  const group = new THREE.Group();
  const core = size * 1.35;
  group.add(new THREE.Mesh(new THREE.BoxGeometry(core, core, core), material));
  const satellite = size * 0.8;
  for (const [dx, dy, dz] of [
    [core * 0.62, -core * 0.34, core * 0.2],
    [-core * 0.5, core * 0.46, -core * 0.24],
  ] as const) {
    const bit = new THREE.Mesh(new THREE.BoxGeometry(satellite, satellite, satellite), material);
    bit.position.set(dx, dy, dz);
    group.add(bit);
  }
  return group;
}

export const VOXEL_EFFECT_FACTORIES: Record<string, EffectFactory> = {
  'effect.signal.path': createVoxelSignalPath,
  'effect.signal.prediction': createVoxelPredictionSignal,
  'effect.ghostMovement': createVoxelGhostMovement,
  'effect.contour.pressure': createVoxelContourPressure,
  'effect.contour.shockwave': createVoxelContourShockwave,
  'effect.reaction.burst': createVoxelReactionBurst,
  'effect.informationStream': createVoxelInformationStream,
  'effect.insight.flash': createVoxelInsightFlash,
};
