import * as THREE from 'three';
import type {
  EffectEvent,
  EffectFactory,
  EffectInstance,
  SceneServices,
  VisualTone,
} from '@mindforge/engine';
import { createVoxelGlow, voxelToneColor } from './voxel-style';

const IDENTITY_QUATERNION = new THREE.Quaternion();
const INSTANCE_MATRIX = new THREE.Matrix4();
const INSTANCE_SCALE = new THREE.Vector3();

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
    : [event.from, event.to].filter(
        (ref: string | undefined): ref is string => Boolean(ref),
      );
  return refs.map((ref: string) => services.resolveAnchor(ref));
}

function samplePath(points: THREE.Vector3[], t: number, out: THREE.Vector3): THREE.Vector3 {
  if (points.length === 0) return out.set(0, 0, 0);
  if (points.length === 1) return out.copy(points[0]);
  const clamped = Math.max(0, Math.min(1, t));
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

/** Segmented luminous signal made from a row of block pulses rather than a thin laser. */
export const createVoxelSignalPath: EffectFactory = ({ event, services }): EffectInstance => {
  const from = services.resolveAnchor(event.from ?? missing('effect.signal.path', 'from'));
  const to = services.resolveAnchor(event.to ?? missing('effect.signal.path', 'to'));
  const thickness = Math.max(0.035, readNumber(event, 'thickness', 0.035));
  const segmentCount = 18;
  const color = eventColor(event, 'information');
  const material = createVoxelGlow(color, 0.9);
  material.transparent = true;
  material.depthWrite = false;
  const mesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(thickness * 1.7, thickness * 1.7, thickness * 1.7),
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
        const wave = 0.58 + 0.42 * Math.sin(ctx.localTime * 6 - i * 0.72);
        setInstance(mesh, i, p, 0.68 + wave * 0.46);
      }
      mesh.instanceMatrix.needsUpdate = true;
      material.opacity = intensity * (0.55 + 0.38 * Math.sin(Math.PI * ctx.progress));
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

/** Fast block pulse travelling through semantic anchors with a dense stepped trail. */
export const createVoxelPredictionSignal: EffectFactory = ({ event, services }): EffectInstance => {
  const anchors = resolvePath(event, services);
  const group = new THREE.Group();
  group.visible = false;
  const color = eventColor(event, 'prediction');
  const nodeMaterial = createVoxelGlow(color, 1);
  const node = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.11, 0.11), nodeMaterial);
  group.add(node);

  const trailCount = 14;
  const trailMaterial = createVoxelGlow(color, 0.78);
  trailMaterial.transparent = true;
  trailMaterial.depthWrite = false;
  const trail = new THREE.InstancedMesh(new THREE.BoxGeometry(0.058, 0.058, 0.058), trailMaterial, trailCount);
  group.add(trail);

  const orbitMaterial = createVoxelGlow(voxelToneColor('insight'), 0.9);
  const orbiters = [
    new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.04), orbitMaterial),
    new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.035, 0.035), orbitMaterial),
  ];
  group.add(...orbiters);

  const points = anchors.map(() => new THREE.Vector3());
  const scratch = new THREE.Vector3();
  const trailPosition = new THREE.Vector3();
  const intensity = event.intensity ?? 1;

  return {
    object3d: group,
    update(ctx): void {
      group.visible = ctx.active;
      if (!ctx.active) return;
      anchors.forEach((anchor, i) => anchor.getWorldPosition(points[i]));
      samplePath(points, ctx.progress, scratch);
      node.position.copy(scratch);
      node.rotation.set(ctx.localTime * 2.8, ctx.localTime * 3.4, ctx.localTime * 1.7);
      const pulse = 0.92 + Math.sin(ctx.localTime * 8) * 0.16;
      node.scale.setScalar(pulse);

      for (let i = 0; i < trailCount; i++) {
        const t = ctx.progress - (i + 1) * 0.042;
        samplePath(points, t, trailPosition);
        const visible = t >= 0 ? 1 : 0.001;
        const scale = visible * Math.max(0.25, 0.95 - i * 0.05);
        setInstance(trail, i, trailPosition, scale);
      }
      trail.instanceMatrix.needsUpdate = true;
      trailMaterial.opacity = intensity * 0.78;

      orbiters[0].position.set(
        scratch.x + Math.cos(ctx.localTime * 7.2) * 0.14,
        scratch.y + Math.sin(ctx.localTime * 7.2) * 0.14,
        scratch.z,
      );
      orbiters[1].position.set(
        scratch.x,
        scratch.y + Math.cos(ctx.localTime * 6.1) * 0.11,
        scratch.z + Math.sin(ctx.localTime * 6.1) * 0.11,
      );
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
      for (const orbiter of orbiters) orbiter.geometry.dispose();
      orbitMaterial.dispose();
      group.removeFromParent();
    },
  };
};

/** Blocky forward-model ghost with three deterministic afterimages. */
export const createVoxelGhostMovement: EffectFactory = ({ event, services }): EffectInstance => {
  const destination = services.resolveAnchor(event.to ?? event.target ?? missing('effect.ghostMovement', 'to or target'));
  const origin = event.from ? services.resolveAnchor(event.from) : undefined;
  const lead = clamp(readNumber(event, 'lead', 0.3), 0, 0.6);
  const size = readNumber(event, 'size', 0.13);
  const materials = [0.48, 0.26, 0.13].map((opacity) => {
    const material = createVoxelGlow(eventColor(event, 'prediction'), opacity);
    material.transparent = true;
    material.depthWrite = false;
    return material;
  });
  const roots = materials.map((material) => event.parameters?.shape === 'hand'
    ? buildGhostHand(size, material)
    : buildGhostLimb(size, material));
  const root = new THREE.Group();
  root.add(...roots);
  root.visible = false;

  const fromPos = new THREE.Vector3();
  const toPos = new THREE.Vector3();
  const intensity = event.intensity ?? 1;

  return {
    object3d: root,
    update(ctx): void {
      root.visible = ctx.active;
      if (!ctx.active) return;
      destination.getWorldPosition(toPos);
      if (origin) origin.getWorldPosition(fromPos);
      else fromPos.copy(toPos);

      const rise = Math.min(1, ctx.progress / 0.16);
      const fall = ctx.progress < 0.72 ? 1 : Math.max(0, 1 - (ctx.progress - 0.72) / 0.28);
      for (let i = 0; i < roots.length; i++) {
        const delayed = clamp(ctx.progress - i * 0.09, 0, 1);
        const ahead = clamp(delayed / (1 - lead), 0, 1);
        roots[i].position.copy(fromPos).lerp(toPos, ahead * (2 - ahead));
        roots[i].rotation.z = Math.sin(ctx.localTime * 3 + i) * 0.08;
        materials[i].opacity = intensity * [0.5, 0.28, 0.14][i] * rise * fall;
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

function createBoxFrame(size: number, thickness: number, material: THREE.Material): THREE.Group {
  const frame = new THREE.Group();
  const half = size / 2;
  const bar = (sx: number, sy: number, sz: number, x: number, y: number, z: number): void => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), material);
    mesh.position.set(x, y, z);
    frame.add(mesh);
  };
  for (const y of [-half, half]) {
    for (const z of [-half, half]) bar(size, thickness, thickness, 0, y, z);
  }
  for (const x of [-half, half]) {
    for (const z of [-half, half]) bar(thickness, size, thickness, x, 0, z);
  }
  for (const x of [-half, half]) {
    for (const y of [-half, half]) bar(thickness, thickness, size, x, y, 0);
  }
  return frame;
}

/** Solid luminous block frames compress around the semantic target then release. */
export const createVoxelContourPressure: EffectFactory = ({ event, services }): EffectInstance => {
  const center = services.resolveAnchor(event.target ?? event.from ?? missing('effect.contour.pressure', 'target or from'));
  const scale = readNumber(event, 'scale', 1);
  const releaseAt = clamp(readNumber(event, 'releaseAt', 0.78), 0.05, 0.99);
  const group = new THREE.Group();
  group.visible = false;
  const frames: THREE.Group[] = [];
  const materials: THREE.MeshBasicMaterial[] = [];
  const base = voxelToneColor(event.tone === 'heat' ? 'information' : 'prediction');
  const active = eventColor(event, event.tone ?? 'suppression');

  for (let i = 0; i < 3; i++) {
    const material = createVoxelGlow(base, 0.3);
    material.transparent = true;
    material.depthWrite = false;
    const frame = createBoxFrame((0.78 + i * 0.38) * scale, 0.035 * scale, material);
    frame.rotation.set(0.08 * i, 0.14 * i, 0.05 * i);
    frames.push(frame);
    materials.push(material);
    group.add(frame);
  }

  const world = new THREE.Vector3();
  const intensity = event.intensity ?? 1;

  return {
    object3d: group,
    update(ctx): void {
      group.visible = ctx.active;
      if (!ctx.active) return;
      center.getWorldPosition(world);
      group.position.copy(world);
      const releasing = ctx.progress >= releaseAt;
      const release = releasing ? (ctx.progress - releaseAt) / (1 - releaseAt) : 0;
      const pressure = releasing ? 1 - release : Math.sin((ctx.progress / releaseAt) * Math.PI * 0.5);
      for (let i = 0; i < frames.length; i++) {
        const start = 1 + i * 0.15;
        const factor = start - pressure * (0.34 + i * 0.055) + release * 0.2;
        frames[i].scale.setScalar(factor);
        frames[i].rotation.y = 0.16 * i + ctx.localTime * (i % 2 === 0 ? 0.36 : -0.3);
        materials[i].color.copy(base).lerp(active, pressure);
        materials[i].opacity = intensity * (releasing ? 0.64 * (1 - release) : 0.35 + pressure * 0.48);
      }
    },
    reset(): void {
      group.visible = false;
    },
    dispose(): void {
      group.traverse((node) => {
        const mesh = node as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
      });
      for (const material of materials) material.dispose();
      group.removeFromParent();
    },
  };
};

function createSquareRing(thickness: number, material: THREE.Material): THREE.Group {
  const ring = new THREE.Group();
  const top = new THREE.Mesh(new THREE.BoxGeometry(1, thickness, thickness), material);
  const bottom = new THREE.Mesh(new THREE.BoxGeometry(1, thickness, thickness), material);
  const left = new THREE.Mesh(new THREE.BoxGeometry(thickness, thickness, 1), material);
  const right = new THREE.Mesh(new THREE.BoxGeometry(thickness, thickness, 1), material);
  top.position.z = 0.5;
  bottom.position.z = -0.5;
  left.position.x = -0.5;
  right.position.x = 0.5;
  ring.add(top, bottom, left, right);
  return ring;
}

/** Layered square shockwave plus tumbling voxel debris. */
export const createVoxelContourShockwave: EffectFactory = ({ event, services }): EffectInstance => {
  const center = services.resolveAnchor(event.target ?? event.from ?? missing('effect.contour.shockwave', 'target or from'));
  const size = readNumber(event, 'size', 2.4);
  const thickness = Math.max(0.045, readNumber(event, 'thickness', 0.05));
  const group = new THREE.Group();
  group.visible = false;
  const color = eventColor(event, 'heat');

  const ringMaterials = [0.95, 0.68, 0.42].map((opacity) => {
    const material = createVoxelGlow(color, opacity);
    material.transparent = true;
    material.depthWrite = false;
    return material;
  });
  const rings = ringMaterials.map((material) => createSquareRing(thickness, material));
  rings.forEach((ring) => {
    ring.rotation.x = Math.PI / 2;
    group.add(ring);
  });

  const debrisCount = 24;
  const debrisMaterial = createVoxelGlow(voxelToneColor('reaction'), 0.85);
  debrisMaterial.transparent = true;
  debrisMaterial.depthWrite = false;
  const debris = new THREE.InstancedMesh(new THREE.BoxGeometry(0.07, 0.07, 0.07), debrisMaterial, debrisCount);
  group.add(debris);
  const world = new THREE.Vector3();
  const position = new THREE.Vector3();
  const euler = new THREE.Euler();
  const rotation = new THREE.Quaternion();
  const scaleVector = new THREE.Vector3();
  const matrix = new THREE.Matrix4();
  const intensity = event.intensity ?? 1;

  return {
    object3d: group,
    update(ctx): void {
      group.visible = ctx.active;
      if (!ctx.active) return;
      center.getWorldPosition(world);
      group.position.copy(world);
      for (let i = 0; i < rings.length; i++) {
        const delayed = clamp((ctx.progress - i * 0.08) / (1 - i * 0.08), 0, 1);
        const spread = Math.max(0.001, delayed * size);
        rings[i].scale.set(spread, spread, spread);
        rings[i].rotation.z = (i % 2 === 0 ? 1 : -1) * ctx.localTime * 0.18;
        ringMaterials[i].opacity = intensity * [0.95, 0.64, 0.4][i] * (1 - delayed);
      }

      for (let i = 0; i < debrisCount; i++) {
        const angle = (i / debrisCount) * Math.PI * 2 + (i % 3) * 0.17;
        const speed = size * (0.35 + (i % 5) * 0.045);
        const radial = ctx.progress * speed;
        position.set(
          Math.cos(angle) * radial,
          Math.sin(Math.PI * ctx.progress) * (0.25 + (i % 4) * 0.08),
          Math.sin(angle) * radial,
        );
        euler.set(ctx.localTime * (1 + i % 3), i * 0.21, ctx.localTime * 0.7);
        rotation.setFromEuler(euler);
        scaleVector.setScalar(Math.max(0.08, 1 - ctx.progress));
        matrix.compose(position, rotation, scaleVector);
        debris.setMatrixAt(i, matrix);
      }
      debris.instanceMatrix.needsUpdate = true;
      debrisMaterial.opacity = intensity * (1 - ctx.progress) * 0.9;
    },
    reset(): void {
      group.visible = false;
    },
    dispose(): void {
      for (const ring of rings) {
        ring.traverse((node) => {
          const mesh = node as THREE.Mesh;
          if (mesh.geometry) mesh.geometry.dispose();
        });
      }
      for (const material of ringMaterials) material.dispose();
      debris.geometry.dispose();
      debrisMaterial.dispose();
      debris.dispose();
      group.removeFromParent();
    },
  };
};

/** Forceful voxel burst with arcing debris instead of a flat radial spray. */
export const createVoxelReactionBurst: EffectFactory = ({ event, services }): EffectInstance => {
  const center = services.resolveAnchor(event.target ?? event.from ?? missing('effect.reaction.burst', 'target or from'));
  const count = Math.max(8, Math.round(readNumber(event, 'count', 32)));
  const radius = readNumber(event, 'radius', 1.1);
  const size = readNumber(event, 'size', 0.05) * 1.45;
  const material = createVoxelGlow(eventColor(event, 'reaction'), 0.95);
  material.transparent = true;
  material.depthWrite = false;
  const geometry = new THREE.BoxGeometry(size, size, size);
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  mesh.visible = false;

  const directions: THREE.Vector3[] = [];
  for (let i = 0; i < count; i++) {
    const angle = i * 2.399963229728653;
    const horizontal = 0.68 + (i % 5) * 0.07;
    const y = 0.22 + (i % 7) * 0.08;
    directions.push(new THREE.Vector3(Math.cos(angle) * horizontal, y, Math.sin(angle) * horizontal).normalize());
  }

  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const rotation = new THREE.Quaternion();
  const euler = new THREE.Euler();
  const scale = new THREE.Vector3(1, 1, 1);
  const world = new THREE.Vector3();
  const start = eventColor(event, 'reaction');
  const end = voxelToneColor(event.tone === 'heat' ? 'heat' : 'insight');
  const intensity = event.intensity ?? 1;

  return {
    object3d: mesh,
    update(ctx): void {
      mesh.visible = ctx.active;
      if (!ctx.active) return;
      center.getWorldPosition(world);
      mesh.position.copy(world);
      for (let i = 0; i < count; i++) {
        const speed = radius * (0.75 + (i % 6) * 0.055);
        const t = ctx.progress;
        position.copy(directions[i]).multiplyScalar(t * speed);
        position.y += Math.sin(Math.PI * t) * (0.24 + (i % 5) * 0.07) - t * t * 0.16;
        euler.set(i * 0.23 + ctx.localTime * 2.6, i * 0.17 + ctx.localTime * 1.9, i * 0.11);
        rotation.setFromEuler(euler);
        const shrink = Math.max(0.06, (1 - t) * (0.7 + (i % 4) * 0.12));
        scale.setScalar(shrink);
        matrix.compose(position, rotation, scale);
        mesh.setMatrixAt(i, matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
      material.color.copy(start).lerp(end, ctx.progress * 0.8);
      material.opacity = intensity * Math.max(0, 1 - ctx.progress * 0.92);
    },
    reset(): void {
      mesh.visible = false;
    },
    dispose(): void {
      geometry.dispose();
      material.dispose();
      mesh.dispose();
      mesh.removeFromParent();
    },
  };
};

/** Deterministic stream of luminous data blocks with a subtle stepped wobble. */
export const createVoxelInformationStream: EffectFactory = ({ event, services }): EffectInstance => {
  const anchors = resolvePath(event, services);
  if (anchors.length < 2) {
    throw new Error('effect.informationStream requires at least two anchors (from/to or through)');
  }
  const density = Math.max(1, Math.round(readNumber(event, 'density', 24)));
  const speed = readNumber(event, 'speed', 0.3);
  const size = readNumber(event, 'size', 0.06) * 1.5;
  const material = createVoxelGlow(eventColor(event, 'information'), 0.92);
  material.transparent = true;
  material.depthWrite = false;
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(size, size, size), material, density);
  mesh.visible = false;

  const points = anchors.map(() => new THREE.Vector3());
  const position = new THREE.Vector3();
  const matrix = new THREE.Matrix4();
  const rotation = new THREE.Quaternion();
  const euler = new THREE.Euler();
  const scale = new THREE.Vector3();
  const intensity = event.intensity ?? 1;

  return {
    object3d: mesh,
    update(ctx): void {
      mesh.visible = ctx.active;
      if (!ctx.active) return;
      anchors.forEach((anchor, i) => anchor.getWorldPosition(points[i]));
      for (let i = 0; i < density; i++) {
        const phase = (i / density + ctx.localTime * speed) % 1;
        samplePath(points, phase, position);
        position.x += Math.sin(phase * Math.PI * 4 + i * 0.7) * size * 0.48;
        position.y += Math.cos(phase * Math.PI * 6 + i * 0.4) * size * 0.3;
        euler.set(i * 0.16 + ctx.localTime, i * 0.42 + ctx.localTime * 1.2, i * 0.1);
        rotation.setFromEuler(euler);
        const pulse = 0.7 + 0.35 * Math.sin(ctx.localTime * 5 + i * 1.1);
        scale.setScalar(pulse);
        matrix.compose(position, rotation, scale);
        mesh.setMatrixAt(i, matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
      material.opacity = intensity * (0.68 + 0.26 * Math.sin(Math.PI * ctx.progress));
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
  const maxOpacity = Math.min(0.32, readNumber(event, 'maxOpacity', 0.28)) * (event.intensity ?? 1);
  const material = new THREE.MeshBasicMaterial({
    color: eventColor(event, 'insight'),
    side: THREE.BackSide,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    depthTest: false,
    toneMapped: false,
  });
  const shell = new THREE.Mesh(new THREE.BoxGeometry(44, 44, 44), material);
  shell.visible = false;

  return {
    object3d: shell,
    update(ctx): void {
      shell.visible = ctx.active;
      if (!ctx.active) return;
      const pulse = Math.sin(Math.PI * ctx.progress) ** 1.7;
      material.opacity = maxOpacity * pulse;
    },
    reset(): void {
      shell.visible = false;
      material.opacity = 0;
    },
    dispose(): void {
      shell.geometry.dispose();
      material.dispose();
      shell.removeFromParent();
    },
  };
};

function buildGhostHand(size: number, material: THREE.Material): THREE.Group {
  const group = new THREE.Group();
  const scale = size / 0.13;
  group.add(new THREE.Mesh(new THREE.BoxGeometry(0.14 * scale, 0.15 * scale, 0.05 * scale), material));
  for (let i = 0; i < 4; i++) {
    const finger = new THREE.Mesh(new THREE.BoxGeometry(0.026 * scale, 0.026 * scale, 0.105 * scale), material);
    finger.position.set((i - 1.5) * 0.034 * scale, 0.038 * scale, 0.078 * scale);
    group.add(finger);
  }
  const thumb = new THREE.Mesh(new THREE.BoxGeometry(0.035 * scale, 0.035 * scale, 0.08 * scale), material);
  thumb.position.set(-0.085 * scale, -0.012 * scale, 0.045 * scale);
  thumb.rotation.y = -0.5;
  group.add(thumb);
  return group;
}

function buildGhostLimb(size: number, material: THREE.Material): THREE.Group {
  const group = new THREE.Group();
  group.add(new THREE.Mesh(new THREE.BoxGeometry(size, size * 1.8, size), material));
  return group;
}

function missing(effect: string, field: string): never {
  throw new Error(`${effect} requires "${field}" anchor`);
}

function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
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
