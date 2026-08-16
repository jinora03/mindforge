import * as THREE from 'three';
import type {
  EffectEvent,
  EffectFactory,
  EffectInstance,
  SceneServices,
  VisualTone,
} from '@mindforge/engine';
import { ballGeometry, toyDebris, toyGlow, toyboxToneColor, toyTokenGeometry } from './toybox-style';

/**
 * Toybox effect vocabulary.
 *
 * Deliberately the opposite of Voxel's: where that theme snaps everything to a
 * lattice and breaks into cubes, this one is **rounded and springy** — beads,
 * rings, and capsules moving on smooth arcs with squash-and-stretch. Nothing is
 * quantised, because moulded plastic has no pixel grid to snap to.
 *
 * Every value is a pure function of `ctx.progress` / `ctx.localTime`, so seeking
 * backward reconstructs identical state and nothing can stick.
 */

const IDENTITY = new THREE.Quaternion();
const MATRIX = new THREE.Matrix4();
const SCALE = new THREE.Vector3();
const WORLD_UP = new THREE.Vector3(0, 1, 0);

function readNumber(event: EffectEvent, key: string, fallback: number): number {
  const value = event.parameters?.[key];
  return typeof value === 'number' ? value : fallback;
}

function eventColor(event: EffectEvent, fallback: VisualTone): THREE.Color {
  return event.color ? new THREE.Color(event.color) : toyboxToneColor(event.tone ?? fallback);
}

function resolvePath(event: EffectEvent, services: SceneServices): THREE.Object3D[] {
  const refs: string[] = event.through
    ? [...event.through]
    : [event.from, event.to].filter((r: string | undefined): r is string => Boolean(r));
  return refs.map((ref: string) => services.resolveAnchor(ref));
}

function samplePath(points: THREE.Vector3[], t: number, out: THREE.Vector3): THREE.Vector3 {
  if (points.length === 0) return out.set(0, 0, 0);
  if (points.length === 1) return out.copy(points[0]);
  const c = t < 0 ? 0 : t > 1 ? 1 : t;
  const scaled = c * (points.length - 1);
  const i = Math.min(points.length - 2, Math.floor(scaled));
  return out.copy(points[i]).lerp(points[i + 1], scaled - i);
}

function pathLength(points: THREE.Vector3[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += points[i].distanceTo(points[i - 1]);
  return total;
}

/** Sideways arc so body-anchored paths stay clear of the face. */
function arcDirection(first: THREE.Vector3, last: THREE.Vector3, out: THREE.Vector3): THREE.Vector3 {
  out.subVectors(last, first);
  out.y = 0;
  if (out.lengthSq() < 1e-6) out.set(1, 0, 0);
  return out.normalize();
}

function arcWeight(t: number): number {
  const c = t < 0 ? 0 : t > 1 ? 1 : t;
  return 0.3 + 0.7 * Math.sin(Math.PI * c);
}

function arcAmount(event: EffectEvent, points: THREE.Vector3[], fraction: number): number {
  return pathLength(points) * readNumber(event, 'bow', fraction);
}

function setInstance(
  mesh: THREE.InstancedMesh,
  index: number,
  position: THREE.Vector3,
  scale: number | THREE.Vector3,
  rotation: THREE.Quaternion = IDENTITY,
): void {
  if (typeof scale === 'number') SCALE.setScalar(scale);
  else SCALE.copy(scale);
  MATRIX.compose(position, rotation, SCALE);
  mesh.setMatrixAt(index, MATRIX);
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

function missing(effect: string, field: string): never {
  throw new Error(`${effect} requires "${field}" anchor`);
}

/* ---------------------------------------------------------------- links --- */

/** A string of beads along a link, pulsing in a travelling wave. */
export const createToyboxSignalPath: EffectFactory = ({ event, services }): EffectInstance => {
  const from = services.resolveAnchor(event.from ?? missing('effect.signal.path', 'from'));
  const to = services.resolveAnchor(event.to ?? missing('effect.signal.path', 'to'));
  const radius = Math.max(0.03, readNumber(event, 'thickness', 0.06)) * 0.9;
  const count = 16;
  const color = eventColor(event, 'information');
  const material = toyGlow(color, 0.95);
  material.transparent = true;
  material.depthWrite = false;
  const mesh = new THREE.InstancedMesh(toyTokenGeometry(radius * 1.8, radius * 0.75, radius * 1.8), material, count);
  mesh.visible = false;

  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const p = new THREE.Vector3();
  const intensity = event.intensity ?? 1;
  const rotation = new THREE.Quaternion();

  return {
    object3d: mesh,
    update(ctx): void {
      mesh.visible = ctx.active;
      if (!ctx.active) return;
      from.getWorldPosition(a);
      to.getWorldPosition(b);
      for (let i = 0; i < count; i++) {
        const t = i / (count - 1);
        p.copy(a).lerp(b, t);
        // Smooth travelling swell rather than an on/off lattice pulse.
        const wave = 0.75 + 0.55 * Math.sin(ctx.localTime * 7 - i * 0.7);
        rotation.setFromAxisAngle(WORLD_UP, ctx.localTime * 0.8 + i * 0.42);
        setInstance(mesh, i, p, wave, rotation);
      }
      mesh.instanceMatrix.needsUpdate = true;
      material.opacity = intensity * (0.6 + 0.35 * Math.sin(Math.PI * ctx.progress));
    },
    reset(): void {
      mesh.visible = false;
    },
    dispose(): void {
      material.dispose();
      mesh.dispose();
      mesh.removeFromParent();
    },
  };
};

/** A bead running the path with a comet tail of shrinking beads. */
export const createToyboxPredictionSignal: EffectFactory = ({ event, services }): EffectInstance => {
  const anchors = resolvePath(event, services);
  const group = new THREE.Group();
  group.visible = false;
  const color = eventColor(event, 'prediction');

  const headMaterial = toyGlow(color, 1);
  const head = new THREE.Mesh(toyTokenGeometry(0.18, 0.11, 0.18), headMaterial);
  group.add(head);

  const tailCount = 9;
  const tailMaterial = toyDebris(color, { emissive: color, emissiveIntensity: 0.7, opacity: 0.85 });
  const tail = new THREE.InstancedMesh(toyTokenGeometry(0.115, 0.06, 0.115), tailMaterial, tailCount);
  group.add(tail);

  const points = anchors.map(() => new THREE.Vector3());
  const scratch = new THREE.Vector3();
  const trailPos = new THREE.Vector3();
  const arc = new THREE.Vector3();
  const stretch = new THREE.Vector3();
  const intensity = event.intensity ?? 1;

  return {
    object3d: group,
    update(ctx): void {
      group.visible = ctx.active;
      if (!ctx.active) return;
      anchors.forEach((anchor, i) => anchor.getWorldPosition(points[i]));
      arcDirection(points[0], points[points.length - 1], arc);
      const bow = arcAmount(event, points, 0.45);

      samplePath(points, ctx.progress, scratch).addScaledVector(arc, bow * arcWeight(ctx.progress));
      head.position.copy(scratch);
      // Squash-and-stretch: the bead elongates as it accelerates.
      const speed = Math.sin(Math.PI * ctx.progress);
      head.scale.set(1 - speed * 0.2, 1 + speed * 0.35, 1 - speed * 0.2);

      for (let i = 0; i < tailCount; i++) {
        const t = ctx.progress - (i + 1) * 0.045;
        samplePath(points, t, trailPos).addScaledVector(arc, bow * arcWeight(t));
        const s = t >= 0 ? Math.max(0.2, 1 - i * 0.1) : 0.001;
        stretch.set(s, s, s);
        setInstance(tail, i, trailPos, stretch);
      }
      tail.instanceMatrix.needsUpdate = true;
      tailMaterial.opacity = intensity * 0.8;
    },
    reset(): void {
      group.visible = false;
    },
    dispose(): void {
      headMaterial.dispose();
      tailMaterial.dispose();
      tail.dispose();
      group.removeFromParent();
    },
  };
};

/** Translucent echo blobs trailing the predicted destination. */
export const createToyboxGhostMovement: EffectFactory = ({ event, services }): EffectInstance => {
  const destination = services.resolveAnchor(
    event.to ?? event.target ?? missing('effect.ghostMovement', 'to or target'),
  );
  const origin = event.from ? services.resolveAnchor(event.from) : undefined;
  const lead = clamp(readNumber(event, 'lead', 0.3), 0, 0.6);
  const size = readNumber(event, 'size', 0.13);
  const color = eventColor(event, 'prediction');
  const opacities = [0.6, 0.34, 0.18];
  const materials = opacities.map((o) => toyDebris(color, { emissive: color, emissiveIntensity: 0.4, opacity: o }));
  const root = new THREE.Group();
  const blobs = materials.map((m, i) => {
    const mesh = new THREE.Mesh(ballGeometry(size * (1.5 - i * 0.18), 12), m);
    root.add(mesh);
    return mesh;
  });
  root.visible = false;

  const fromPos = new THREE.Vector3();
  const toPos = new THREE.Vector3();
  const scratch = new THREE.Vector3();
  const arc = new THREE.Vector3();
  const intensity = event.intensity ?? 1;

  return {
    object3d: root,
    update(ctx): void {
      root.visible = ctx.active;
      if (!ctx.active) return;
      destination.getWorldPosition(toPos);
      if (origin) origin.getWorldPosition(fromPos);
      else fromPos.copy(toPos);
      arcDirection(fromPos, toPos, arc);
      const bow = arcAmount(event, [fromPos, toPos], 0.5);

      const rise = Math.min(1, ctx.progress / 0.16);
      const fall = ctx.progress < 0.72 ? 1 : Math.max(0, 1 - (ctx.progress - 0.72) / 0.28);
      for (let i = 0; i < blobs.length; i++) {
        const delayed = clamp(ctx.progress - i * 0.09, 0, 1);
        const ahead = clamp(delayed / (1 - lead), 0, 1);
        scratch.copy(fromPos).lerp(toPos, ahead * (2 - ahead));
        scratch.addScaledVector(arc, bow * arcWeight(ahead));
        blobs[i].position.copy(scratch);
        const wobble = 1 + 0.12 * Math.sin(ctx.localTime * 9 + i);
        blobs[i].scale.set(wobble, 2 - wobble, wobble);
        materials[i].opacity = intensity * opacities[i] * rise * fall;
      }
    },
    reset(): void {
      root.visible = false;
    },
    dispose(): void {
      for (const m of materials) m.dispose();
      root.removeFromParent();
    },
  };
};

/* ------------------------------------------------------------- pressure --- */

/** A cage of beads on orbiting rings, squeezing in then springing out. */
export const createToyboxContourPressure: EffectFactory = ({ event, services }): EffectInstance => {
  const center = services.resolveAnchor(
    event.target ?? event.from ?? missing('effect.contour.pressure', 'target or from'),
  );
  const scale = readNumber(event, 'scale', 1);
  const releaseAt = clamp(readNumber(event, 'releaseAt', 0.78), 0.05, 0.99);
  const shells = 3;
  const perShell = 14;
  const base = toyboxToneColor('prediction');
  const active = eventColor(event, event.tone ?? 'suppression');
  const material = toyDebris(base.clone(), { emissive: base.clone(), emissiveIntensity: 0.35, opacity: 0.8 });
  const mesh = new THREE.InstancedMesh(ballGeometry(0.055 * scale, 10), material, shells * perShell);
  mesh.visible = false;

  const world = new THREE.Vector3();
  const position = new THREE.Vector3();
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
      for (let s = 0; s < shells; s++) {
        const radius = (0.44 + s * 0.2) * scale * (1 - pressure * 0.45 + release * 0.7);
        const spin = ctx.localTime * (0.5 + s * 0.22) + s;
        for (let k = 0; k < perShell; k++) {
          const angle = (k / perShell) * Math.PI * 2 + spin;
          position.set(
            Math.cos(angle) * radius,
            Math.sin(angle * 2 + s) * radius * 0.4,
            Math.sin(angle) * radius,
          );
          setInstance(mesh, i++, position, 0.75 + pressure * 0.55);
        }
      }
      mesh.instanceMatrix.needsUpdate = true;
      material.color.copy(base).lerp(active, pressure);
      material.emissive.copy(material.color);
      material.opacity = intensity * (releasing ? 0.8 * (1 - release) : 0.4 + pressure * 0.45);
    },
    reset(): void {
      mesh.visible = false;
    },
    dispose(): void {
      material.dispose();
      mesh.dispose();
      mesh.removeFromParent();
    },
  };
};

/* ------------------------------------------------------------ shockwave --- */

/** Expanding torus rings plus bouncing beads. */
export const createToyboxContourShockwave: EffectFactory = ({ event, services }): EffectInstance => {
  const center = services.resolveAnchor(
    event.target ?? event.from ?? missing('effect.contour.shockwave', 'target or from'),
  );
  const size = readNumber(event, 'size', 2.4);
  const thickness = Math.max(0.04, readNumber(event, 'thickness', 0.12)) * 0.6;
  const color = eventColor(event, 'heat');
  const group = new THREE.Group();
  group.visible = false;

  const ringCount = 3;
  const ringMaterials: THREE.MeshBasicMaterial[] = [];
  const rings: THREE.Mesh[] = [];
  for (let i = 0; i < ringCount; i++) {
    const m = toyGlow(color, 0.9);
    m.transparent = true;
    m.depthWrite = false;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1, thickness, 8, 32), m);
    ring.rotation.x = Math.PI / 2;
    ringMaterials.push(m);
    rings.push(ring);
    group.add(ring);
  }

  const beadCount = 22;
  const beadMaterial = toyDebris(toyboxToneColor('reaction'), {
    emissive: color.clone(),
    emissiveIntensity: 0.45,
    opacity: 0.95,
  });
  const beads = new THREE.InstancedMesh(ballGeometry(0.07, 10), beadMaterial, beadCount);
  group.add(beads);

  const world = new THREE.Vector3();
  const position = new THREE.Vector3();
  const intensity = event.intensity ?? 1;

  return {
    object3d: group,
    update(ctx): void {
      group.visible = ctx.active;
      if (!ctx.active) return;
      center.getWorldPosition(world);
      group.position.copy(world);

      for (let r = 0; r < ringCount; r++) {
        const delayed = clamp((ctx.progress - r * 0.1) / (1 - r * 0.1), 0, 1);
        const spread = Math.max(0.02, delayed * size * 0.5);
        rings[r].scale.setScalar(spread);
        rings[r].position.y = Math.sin(Math.PI * delayed) * 0.14;
        ringMaterials[r].opacity = intensity * Math.max(0, 1 - delayed) * 0.9;
      }

      for (let k = 0; k < beadCount; k++) {
        const angle = (k / beadCount) * Math.PI * 2 + (k % 3) * 0.2;
        const speed = size * (0.3 + (k % 5) * 0.05);
        const radial = ctx.progress * speed;
        // Beads arc up then fall, and bounce once off the ground plane.
        let y = Math.sin(Math.PI * ctx.progress) * (0.34 + (k % 4) * 0.1) - ctx.progress * ctx.progress * 0.6;
        if (y < -0.4) y = -0.4 - (y + 0.4) * 0.35;
        position.set(Math.cos(angle) * radial, y, Math.sin(angle) * radial);
        setInstance(beads, k, position, Math.max(0.12, 1 - ctx.progress * 0.85));
      }
      beads.instanceMatrix.needsUpdate = true;
      beadMaterial.opacity = intensity * Math.max(0, 1 - ctx.progress) * 0.95;
    },
    reset(): void {
      group.visible = false;
    },
    dispose(): void {
      for (const m of ringMaterials) m.dispose();
      beadMaterial.dispose();
      beads.dispose();
      group.removeFromParent();
    },
  };
};

/* -------------------------------------------------------------- reaction -- */

/** Confetti burst of glossy beads on ballistic arcs. */
export const createToyboxReactionBurst: EffectFactory = ({ event, services }): EffectInstance => {
  const center = services.resolveAnchor(
    event.target ?? event.from ?? missing('effect.reaction.burst', 'target or from'),
  );
  const count = Math.max(8, Math.round(readNumber(event, 'count', 32)));
  const radius = readNumber(event, 'radius', 1.1);
  const size = readNumber(event, 'size', 0.05) * 1.5;

  const start = eventColor(event, 'reaction');
  const end = toyboxToneColor(event.tone === 'heat' ? 'heat' : 'insight');
  const material = toyDebris(start.clone(), { emissive: start.clone(), emissiveIntensity: 0.3, opacity: 0.98 });
  const mesh = new THREE.InstancedMesh(toyTokenGeometry(size * 2.2, size * 0.8, size * 1.25), material, count);
  mesh.visible = false;

  const directions: THREE.Vector3[] = [];
  for (let i = 0; i < count; i++) {
    const angle = i * 2.399963229728653;
    const h = 0.66 + (i % 5) * 0.07;
    directions.push(new THREE.Vector3(Math.cos(angle) * h, 0.32 + (i % 7) * 0.08, Math.sin(angle) * h).normalize());
  }

  const world = new THREE.Vector3();
  const position = new THREE.Vector3();
  const stretch = new THREE.Vector3();
  const rotation = new THREE.Quaternion();
  const euler = new THREE.Euler();
  const intensity = event.intensity ?? 1;

  return {
    object3d: mesh,
    update(ctx): void {
      mesh.visible = ctx.active;
      if (!ctx.active) return;
      center.getWorldPosition(world);
      mesh.position.copy(world);
      const t = ctx.progress;

      for (let i = 0; i < count; i++) {
        const speed = radius * (0.8 + (i % 6) * 0.06);
        position.copy(directions[i]).multiplyScalar(t * speed);
        position.y += Math.sin(Math.PI * t) * (0.3 + (i % 5) * 0.08) - t * t * 0.6;
        // Beads stretch along flight and relax as they slow.
        const s = Math.max(0.12, 1 - t * 0.85);
        const elong = 1 + Math.sin(Math.PI * t) * 0.4;
        stretch.set(s * elong, s, s / elong);
        euler.set(i * 0.37 + t * 2.4, i * 0.61 + t * 3.2, i * 0.23 + t * 4.1);
        rotation.setFromEuler(euler);
        setInstance(mesh, i, position, stretch, rotation);
      }
      mesh.instanceMatrix.needsUpdate = true;
      material.color.copy(start).lerp(end, t * 0.8);
      material.emissive.copy(material.color);
      material.opacity = intensity * Math.max(0, 1 - t * 0.9);
    },
    reset(): void {
      mesh.visible = false;
    },
    dispose(): void {
      material.dispose();
      mesh.dispose();
      mesh.removeFromParent();
    },
  };
};

/* ----------------------------------------------------------- information -- */

/** Beads flowing along a link in a loose braid. */
export const createToyboxInformationStream: EffectFactory = ({ event, services }): EffectInstance => {
  const anchors = resolvePath(event, services);
  if (anchors.length < 2) {
    throw new Error('effect.informationStream requires at least two anchors (from/to or through)');
  }
  const density = Math.max(1, Math.round(readNumber(event, 'density', 24)));
  const speed = readNumber(event, 'speed', 0.3);
  const size = readNumber(event, 'size', 0.06) * 1.5;
  const color = eventColor(event, 'information');
  const material = toyDebris(color.clone(), { emissive: color.clone(), emissiveIntensity: 0.7, opacity: 0.95 });
  const mesh = new THREE.InstancedMesh(toyTokenGeometry(size * 1.7, size * 0.72, size * 1.7), material, density);
  mesh.visible = false;

  const points = anchors.map(() => new THREE.Vector3());
  const position = new THREE.Vector3();
  const arc = new THREE.Vector3();
  const side = new THREE.Vector3();
  const intensity = event.intensity ?? 1;

  return {
    object3d: mesh,
    update(ctx): void {
      mesh.visible = ctx.active;
      if (!ctx.active) return;
      anchors.forEach((a, i) => a.getWorldPosition(points[i]));
      arcDirection(points[0], points[points.length - 1], arc);
      side.copy(arc).cross(WORLD_UP).normalize();
      const bow = arcAmount(event, points, 0.04);

      for (let i = 0; i < density; i++) {
        const t = (i / density + ctx.localTime * speed) % 1;
        samplePath(points, t, position).addScaledVector(arc, bow * arcWeight(t));
        // Braid: each bead spirals around the link line.
        const phase = t * Math.PI * 6 + i;
        position.addScaledVector(side, Math.cos(phase) * size * 1.6);
        position.y += Math.sin(phase) * size * 1.6;
        setInstance(mesh, i, position, 0.85 + 0.3 * Math.sin(ctx.localTime * 5 + i));
      }
      mesh.instanceMatrix.needsUpdate = true;
      material.opacity = intensity * (0.75 + 0.2 * Math.sin(Math.PI * ctx.progress));
    },
    reset(): void {
      mesh.visible = false;
    },
    dispose(): void {
      material.dispose();
      mesh.dispose();
      mesh.removeFromParent();
    },
  };
};

/** Soft warm wash for the answer beat. */
export const createToyboxInsightFlash: EffectFactory = ({ event }): EffectInstance => {
  const maxOpacity = Math.min(0.3, readNumber(event, 'maxOpacity', 0.24)) * (event.intensity ?? 1);
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
  const shell = new THREE.Mesh(ballGeometry(30, 12), material);
  shell.visible = false;

  return {
    object3d: shell,
    update(ctx): void {
      shell.visible = ctx.active;
      if (!ctx.active) return;
      // Smooth swell, unlike Voxel's quantised flash.
      material.opacity = maxOpacity * Math.sin(Math.PI * ctx.progress) ** 1.4;
    },
    reset(): void {
      shell.visible = false;
      material.opacity = 0;
    },
    dispose(): void {
      material.dispose();
      shell.removeFromParent();
    },
  };
};

export const TOYBOX_EFFECT_FACTORIES: Record<string, EffectFactory> = {
  'effect.signal.path': createToyboxSignalPath,
  'effect.signal.prediction': createToyboxPredictionSignal,
  'effect.ghostMovement': createToyboxGhostMovement,
  'effect.contour.pressure': createToyboxContourPressure,
  'effect.contour.shockwave': createToyboxContourShockwave,
  'effect.reaction.burst': createToyboxReactionBurst,
  'effect.informationStream': createToyboxInformationStream,
  'effect.insight.flash': createToyboxInsightFlash,
};
