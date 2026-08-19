import * as THREE from 'three';
import {
  composeEffectLayers,
  createEffectInfluenceLayer,
  createProductionEffectFactories,
  readNumber,
  type EffectLayer,
  type ProductionEffectStyle,
} from '@mindforge/effects';
import {
  createRng,
  type ActionContext,
  type EffectEvent,
  type EffectFactory,
  type EffectInstance,
  type SceneServices,
} from '@mindforge/engine';

/**
 * Reusable PB3 Voxel effect baseline.
 *
 * The palette intentionally matches the selective-emissive language already
 * working in Heat/Cold Battery: world surfaces stay matte and block-textured;
 * light/energy/optics are allowed to glow, but with a thin restrained halo.
 */
export const VOXEL_PB3_EFFECT_STYLE: ProductionEffectStyle = {
  beamCore: '#FFF1B8',
  beamHalo: '#FFCB55',
  refractionCore: '#D2F7FF',
  refractionHalo: '#4CC8EA',
  spectrum: ['#F04E55', '#F39A43', '#F4DA4D', '#4FC76B', '#3F82E5', '#7B5FE0'],
  rain: '#77CBE1',
  reveal: '#FFD97A',
  rainbow: ['#F04E55', '#F39A43', '#F4DA4D', '#4FC76B', '#3F82E5', '#7B5FE0'],
  radialSegments: 6,
  haloScale: 1.35,
};

const generic = createProductionEffectFactories(VOXEL_PB3_EFFECT_STYLE);
const UP = new THREE.Vector3(0, 1, 0);
const RIGHT = new THREE.Vector3(1, 0, 0);
const FORWARD = new THREE.Vector3(0, 0, 1);

function clamp01(value: number): number {
  return value <= 0 ? 0 : value >= 1 ? 1 : value;
}

function smoothstep01(value: number): number {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
}

function envelope(progress: number, fadeIn = 0.12, fadeOut = 0.12): number {
  const p = clamp01(progress);
  return Math.min(
    fadeIn <= 0 ? 1 : smoothstep01(p / fadeIn),
    fadeOut <= 0 ? 1 : smoothstep01((1 - p) / fadeOut),
  );
}

function accentMaterial(
  color: THREE.ColorRepresentation,
  opacity = 0,
  additive = false,
): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false,
    toneMapped: false,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
  });
}

function segmentedBeam(
  color: THREE.ColorRepresentation,
  segments: number,
  opacity = 0,
  additive = false,
): THREE.InstancedMesh<THREE.BoxGeometry, THREE.MeshBasicMaterial> {
  const mesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 1, 1),
    accentMaterial(color, opacity, additive),
    segments,
  );
  mesh.frustumCulled = false;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  return mesh;
}

const _segmentMatrix = new THREE.Matrix4();
const _segmentPosition = new THREE.Vector3();
const _segmentScale = new THREE.Vector3();
const _segmentQuaternion = new THREE.Quaternion();

/**
 * Pixel/voxel-native light path: a chain of short blocks instead of one long
 * geometry strip.  This keeps semantic rays looking designed rather than like
 * debug lines, and is reusable for beams, internal refraction and spectra.
 */
function spanSegments(
  mesh: THREE.InstancedMesh,
  a: THREE.Vector3,
  b: THREE.Vector3,
  thickness: number,
  reveal = 1,
  gap = 0.18,
): void {
  _dir.subVectors(b, a);
  const length = _dir.length();
  const segments = mesh.count;
  if (length <= 1e-5) {
    for (let i = 0; i < segments; i++) {
      _segmentMatrix.makeScale(0.0001, 0.0001, 0.0001);
      mesh.setMatrixAt(i, _segmentMatrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    return;
  }

  _dir.normalize();
  _segmentQuaternion.setFromUnitVectors(RIGHT, _dir);
  const step = length / segments;
  const segmentLength = Math.max(0.0001, step * (1 - gap));
  const revealed = clamp01(reveal) * segments;

  for (let i = 0; i < segments; i++) {
    const localReveal = clamp01(revealed - i);
    const t = (i + 0.5) / segments;
    _segmentPosition.copy(a).lerp(b, t);
    _segmentScale.set(
      Math.max(0.0001, segmentLength * localReveal),
      Math.max(0.0001, thickness * localReveal),
      Math.max(0.0001, thickness * localReveal),
    );
    _segmentMatrix.compose(_segmentPosition, _segmentQuaternion, _segmentScale);
    mesh.setMatrixAt(i, _segmentMatrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
}

function requiredAnchor(event: EffectEvent, key: 'from' | 'to', services: SceneServices): THREE.Object3D {
  const ref = event[key];
  if (!ref) throw new Error(`${event.effect} requires "${key}" anchor`);
  return services.resolveAnchor(ref);
}

function disposeTree(root: THREE.Object3D): void {
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    const material = mesh.material;
    if (Array.isArray(material)) material.forEach((entry) => entry.dispose());
    else material?.dispose();
  });
  root.removeFromParent();
  root.clear();
}

const createVoxelLightBeam: EffectFactory = ({ event, services, seed }): EffectInstance => {
  const from = requiredAnchor(event, 'from', services);
  const to = requiredAnchor(event, 'to', services);
  const root = new THREE.Group();
  root.name = 'pb6.voxelLightBeam';
  root.visible = false;

  const coreColor = event.color ?? VOXEL_PB3_EFFECT_STYLE.beamCore;
  const core = segmentedBeam(coreColor, 8);
  core.name = 'pb6.voxelLightBeam.core';
  const halo = segmentedBeam(VOXEL_PB3_EFFECT_STYLE.beamHalo, 8, 0, true);
  halo.name = 'pb6.voxelLightBeam.halo';
  const contactMaterial = accentMaterial(coreColor, 0, true);
  const contact = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), contactMaterial);
  contact.name = 'pb6.voxelLightBeam.contact';
  root.add(halo, core, contact);

  const count = 5;
  const particleMaterial = accentMaterial(coreColor, 0, true);
  const particles = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), particleMaterial, count);
  particles.name = 'pb6.voxelLightBeam.particles';
  particles.frustumCulled = false;
  root.add(particles);

  const rng = createRng(seed);
  const phases = Array.from({ length: count }, () => rng.next());
  const offsets = Array.from({ length: count }, () => (rng.next() * 2 - 1) * 0.45);
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const side = new THREE.Vector3();
  const point = new THREE.Vector3();
  const matrix = new THREE.Matrix4();
  const scale = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const intensity = Math.max(0, event.intensity ?? 1);
  const thickness = Math.max(0.024, readNumber(event, 'thickness', 0.06));
  const scatter = Math.max(0, readNumber(event, 'scatter', 0.025));
  const speed = Math.max(0, readNumber(event, 'particleSpeed', 0.42));

  const visual: EffectLayer = {
    object3d: root,
    update(ctx): void {
      root.visible = ctx.active;
      if (!ctx.active) return;
      from.getWorldPosition(a);
      to.getWorldPosition(b);
      const fade = envelope(ctx.progress, 0.14, 0.1);
      spanSegments(core, a, b, thickness, 1, 0.04);
      spanSegments(halo, a, b, thickness * VOXEL_PB3_EFFECT_STYLE.haloScale, 1, 0);
      core.material.opacity = 0.96 * intensity * fade;
      halo.material.opacity = 0.045 * intensity * fade;

      contact.position.copy(b);
      contact.scale.setScalar(Math.max(0.001, thickness * 3.4 * fade));
      contactMaterial.opacity = 0.28 * intensity * fade;

      _dir.subVectors(b, a).normalize();
      side.crossVectors(_dir, UP);
      if (side.lengthSq() < 1e-5) side.crossVectors(_dir, RIGHT);
      side.normalize();
      for (let i = 0; i < count; i++) {
        const t = (ctx.localTime * speed + phases[i]) % 1;
        point.copy(a).lerp(b, t).addScaledVector(side, offsets[i] * scatter);
        const blockSize = Math.max(0.0001, thickness * (0.62 + (i % 2) * 0.18) * fade);
        scale.set(blockSize, blockSize, blockSize);
        matrix.compose(point, quaternion, scale);
        particles.setMatrixAt(i, matrix);
      }
      particles.instanceMatrix.needsUpdate = true;
      particleMaterial.opacity = 0.22 * intensity * fade;
    },
    reset(): void {
      root.visible = false;
      core.material.opacity = 0;
      halo.material.opacity = 0;
      contactMaterial.opacity = 0;
      particleMaterial.opacity = 0;
    },
    dispose(): void { disposeTree(root); },
  };

  const influence = createEffectInfluenceLayer(
    [
      { channel: 'environmentLight', strength: 0.06 * intensity },
      { channel: 'fogScattering', strength: 0.08 * intensity },
      { channel: 'emissiveBoost', strength: 0.08 * intensity },
    ],
    (ctx) => envelope(ctx.progress, 0.14, 0.1),
  );
  return composeEffectLayers([visual, influence]);
};

const createVoxelRefraction: EffectFactory = ({ event, services }): EffectInstance => {
  const refs = event.through ?? [event.from, event.to].filter((ref): ref is string => Boolean(ref));
  if (refs.length < 2) throw new Error(`${event.effect} requires at least two anchors via "through" or "from/to"`);
  const anchors = refs.map((ref) => services.resolveAnchor(ref));
  const root = new THREE.Group();
  root.name = 'pb6.voxelRefraction';
  root.visible = false;
  const count = anchors.length - 1;
  const cores = Array.from({ length: count }, (_, index) => {
    const mesh = segmentedBeam(event.color ?? VOXEL_PB3_EFFECT_STYLE.refractionCore, 6);
    mesh.name = `pb6.voxelRefraction.core.${index}`;
    root.add(mesh);
    return mesh;
  });
  const halos = Array.from({ length: count }, (_, index) => {
    const mesh = segmentedBeam(VOXEL_PB3_EFFECT_STYLE.refractionHalo, 6, 0, true);
    mesh.name = `pb6.voxelRefraction.halo.${index}`;
    root.add(mesh);
    return mesh;
  });
  const contacts = Array.from({ length: Math.max(0, anchors.length - 2) }, (_, index) => {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      accentMaterial(VOXEL_PB3_EFFECT_STYLE.refractionCore, 0, true),
    );
    mesh.name = `pb6.voxelRefraction.contact.${index}`;
    root.add(mesh);
    return mesh;
  });
  const points = anchors.map(() => new THREE.Vector3());
  const intensity = Math.max(0, event.intensity ?? 1);
  const thickness = Math.max(0.024, readNumber(event, 'thickness', 0.055));

  const visual: EffectLayer = {
    object3d: root,
    update(ctx): void {
      root.visible = ctx.active;
      if (!ctx.active) return;
      anchors.forEach((anchor, index) => anchor.getWorldPosition(points[index]));
      for (let i = 0; i < count; i++) {
        const progress = smoothstep01(ctx.progress * count - i);
        spanSegments(cores[i], points[i], points[i + 1], thickness, progress, 0.04);
        spanSegments(halos[i], points[i], points[i + 1], thickness * VOXEL_PB3_EFFECT_STYLE.haloScale, progress, 0);
        cores[i].material.opacity = 0.98 * intensity * progress;
        halos[i].material.opacity = 0.045 * intensity * progress;
      }
      for (let i = 0; i < contacts.length; i++) {
        const reveal = smoothstep01(ctx.progress * count - (i + 0.65));
        contacts[i].position.copy(points[i + 1]);
        contacts[i].scale.setScalar(thickness * 4.2 * Math.max(0.001, reveal));
        (contacts[i].material as THREE.MeshBasicMaterial).opacity = 0.42 * intensity * reveal;
      }
    },
    reset(): void {
      root.visible = false;
      cores.forEach((mesh) => (mesh.material.opacity = 0));
      halos.forEach((mesh) => (mesh.material.opacity = 0));
      contacts.forEach((mesh) => ((mesh.material as THREE.MeshBasicMaterial).opacity = 0));
    },
    dispose(): void { disposeTree(root); },
  };
  const influence = createEffectInfluenceLayer(
    [
      { channel: 'fogScattering', strength: 0.08 * intensity },
      { channel: 'emissiveBoost', strength: 0.1 * intensity },
      { channel: 'environmentLight', strength: 0.04 * intensity },
    ],
    (ctx) => envelope(ctx.progress, 0.1, 0.08),
  );
  return composeEffectLayers([visual, influence]);
};

const createVoxelSpectrum: EffectFactory = ({ event, services }): EffectInstance => {
  const from = requiredAnchor(event, 'from', services);
  const to = event.to ? services.resolveAnchor(event.to) : undefined;
  const root = new THREE.Group();
  root.name = 'pb6.voxelSpectrum';
  root.visible = false;
  const cores = VOXEL_PB3_EFFECT_STYLE.spectrum.map((color, index) => {
    const mesh = segmentedBeam(color, 10);
    mesh.name = `pb6.voxelSpectrum.core.${index}`;
    root.add(mesh);
    return mesh;
  });
  const halos = VOXEL_PB3_EFFECT_STYLE.spectrum.map((color, index) => {
    const mesh = segmentedBeam(color, 10, 0, true);
    mesh.name = `pb6.voxelSpectrum.halo.${index}`;
    root.add(mesh);
    return mesh;
  });
  const splitMaterial = accentMaterial(VOXEL_PB3_EFFECT_STYLE.refractionCore, 0, true);
  const splitContact = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), splitMaterial);
  splitContact.name = 'pb6.voxelSpectrum.splitContact';
  root.add(splitContact);

  const start = new THREE.Vector3();
  const guide = new THREE.Vector3();
  const direction = new THREE.Vector3();
  const spreadAxis = new THREE.Vector3();
  const end = new THREE.Vector3();
  const intensity = Math.max(0, event.intensity ?? 1);
  const length = Math.max(0.1, readNumber(event, 'length', 4.4));
  const spread = Math.max(0, readNumber(event, 'spread', 1.5));
  const thickness = Math.max(0.02, readNumber(event, 'thickness', 0.065));

  const visual: EffectLayer = {
    object3d: root,
    update(ctx): void {
      root.visible = ctx.active;
      if (!ctx.active) return;
      from.getWorldPosition(start);
      if (to) {
        to.getWorldPosition(guide);
        direction.subVectors(guide, start);
        if (direction.lengthSq() < 1e-6) direction.copy(RIGHT);
        else direction.normalize();
      } else {
        direction.copy(RIGHT);
      }
      spreadAxis.crossVectors(direction, FORWARD);
      if (spreadAxis.lengthSq() < 1e-6) spreadAxis.copy(UP);
      spreadAxis.normalize();
      for (let i = 0; i < cores.length; i++) {
        const band = i / (cores.length - 1) - 0.5;
        end.copy(start).addScaledVector(direction, length).addScaledVector(spreadAxis, band * spread);
        const reveal = smoothstep01(ctx.progress * 1.18 - i * 0.03);
        spanSegments(cores[i], start, end, thickness, reveal, 0.03);
        spanSegments(halos[i], start, end, thickness * VOXEL_PB3_EFFECT_STYLE.haloScale, reveal, 0);
        cores[i].material.opacity = 0.98 * intensity * reveal;
        halos[i].material.opacity = 0.03 * intensity * reveal;
      }
      const splitReveal = smoothstep01(ctx.progress / 0.2);
      splitContact.position.copy(start);
      splitContact.scale.setScalar(Math.max(0.001, thickness * 4.6 * splitReveal));
      splitMaterial.opacity = 0.34 * intensity * splitReveal * envelope(ctx.progress, 0.08, 0.2);
    },
    reset(): void {
      root.visible = false;
      cores.forEach((mesh) => (mesh.material.opacity = 0));
      halos.forEach((mesh) => (mesh.material.opacity = 0));
      splitMaterial.opacity = 0;
    },
    dispose(): void { disposeTree(root); },
  };
  const influence = createEffectInfluenceLayer(
    [
      { channel: 'fogScattering', strength: 0.08 * intensity },
      { channel: 'emissiveBoost', strength: 0.12 * intensity },
    ],
    (ctx) => envelope(ctx.progress, 0.16, 0.08),
  );
  return composeEffectLayers([visual, influence]);
};


function setSquareRipple(
  mesh: THREE.InstancedMesh,
  radius: number,
  thickness: number,
  matrix: THREE.Matrix4,
  position: THREE.Vector3,
  scale: THREE.Vector3,
  quaternion: THREE.Quaternion,
): void {
  const span = Math.max(thickness, radius * 2);
  const y = 0.018;
  const specs: Array<readonly [number, number, number, number, number, number]> = [
    [0, y, radius, span, thickness, thickness],
    [0, y, -radius, span, thickness, thickness],
    [radius, y, 0, thickness, thickness, span],
    [-radius, y, 0, thickness, thickness, span],
  ];
  for (let index = 0; index < specs.length; index++) {
    const [x, py, z, sx, sy, sz] = specs[index];
    position.set(x, py, z);
    scale.set(sx, sy, sz);
    matrix.compose(position, quaternion, scale);
    mesh.setMatrixAt(index, matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
}

const createVoxelRainImpact: EffectFactory = ({ event, services, seed }): EffectInstance => {
  const target = event.target
    ? services.resolveAnchor(event.target)
    : requiredAnchor(event, 'to', services);
  const root = new THREE.Group();
  root.name = 'pb5a.voxelRainImpact';
  root.visible = false;

  const outerMaterial = accentMaterial(VOXEL_PB3_EFFECT_STYLE.rain, 0, false);
  const innerMaterial = accentMaterial(VOXEL_PB3_EFFECT_STYLE.rain, 0, true);
  const outer = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), outerMaterial, 4);
  const inner = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), innerMaterial, 4);
  outer.name = 'pb5a.voxelRainImpact.ripple';
  inner.name = 'pb5a.voxelRainImpact.rippleInner';
  outer.frustumCulled = false;
  inner.frustumCulled = false;

  const splashCount = 12;
  const splashMaterial = accentMaterial(VOXEL_PB3_EFFECT_STYLE.rain, 0, false);
  const splash = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), splashMaterial, splashCount);
  splash.name = 'pb5a.voxelRainImpact.splash';
  splash.frustumCulled = false;
  root.add(outer, inner, splash);

  const rng = createRng(seed);
  const angles = Array.from({ length: splashCount }, () => rng.next() * Math.PI * 2);
  const speeds = Array.from({ length: splashCount }, () => 0.65 + rng.next() * 0.75);
  const heights = Array.from({ length: splashCount }, () => 0.35 + rng.next() * 0.55);
  const center = new THREE.Vector3();
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const scale = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const intensity = Math.max(0, event.intensity ?? 1);
  const radius = Math.max(0.05, readNumber(event, 'radius', 0.42));

  const visual: EffectLayer = {
    object3d: root,
    update(ctx): void {
      root.visible = ctx.active;
      if (!ctx.active) return;
      target.getWorldPosition(center);
      root.position.copy(center);
      const t = clamp01(ctx.progress);
      const rippleT = smoothstep01(t);
      setSquareRipple(outer, radius * (0.25 + rippleT * 1.85), radius * 0.075, matrix, position, scale, quaternion);
      setSquareRipple(inner, radius * (0.15 + rippleT * 1.2), radius * 0.055, matrix, position, scale, quaternion);
      outerMaterial.opacity = 0.34 * intensity * (1 - t);
      innerMaterial.opacity = 0.16 * intensity * (1 - t) ** 1.4;

      for (let i = 0; i < splashCount; i++) {
        const radial = radius * speeds[i] * t;
        position.set(
          Math.cos(angles[i]) * radial,
          heights[i] * Math.sin(Math.PI * t),
          Math.sin(angles[i]) * radial,
        );
        const blockSize = Math.max(0.0001, radius * 0.12 * (1 - t) * (0.7 + (i % 3) * 0.12));
        scale.set(blockSize * 0.7, blockSize * 1.8, blockSize * 0.7);
        matrix.compose(position, quaternion, scale);
        splash.setMatrixAt(i, matrix);
      }
      splash.instanceMatrix.needsUpdate = true;
      splashMaterial.opacity = 0.58 * intensity * (1 - t);
    },
    reset(): void {
      root.visible = false;
      outerMaterial.opacity = 0;
      innerMaterial.opacity = 0;
      splashMaterial.opacity = 0;
    },
    dispose(): void { disposeTree(root); },
  };
  const influence = createEffectInfluenceLayer(
    [
      { channel: 'wetReflection', strength: 0.14 * intensity },
      { channel: 'emissiveBoost', strength: 0.035 * intensity },
    ],
    (ctx) => (ctx.active ? 1 - ctx.progress : 0),
  );
  return composeEffectLayers([visual, influence]);
};

const createVoxelAtmosphericReveal: EffectFactory = ({ event, services }): EffectInstance => {
  const target = event.target ? services.resolveAnchor(event.target) : undefined;
  const root = new THREE.Group();
  root.name = 'pb5a.voxelAtmosphericReveal';
  root.visible = false;

  const color = event.color ?? VOXEL_PB3_EFFECT_STYLE.reveal;
  const coreMaterial = accentMaterial(color, 0, false);
  const haloMaterial = accentMaterial(color, 0, true);
  const core = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), coreMaterial);
  core.name = 'pb5a.voxelAtmosphericReveal.core';
  const halo = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), haloMaterial, 6);
  halo.name = 'pb5a.voxelAtmosphericReveal.haloBlocks';
  halo.frustumCulled = false;
  const light = new THREE.PointLight(color, 0, 0, 2);
  light.name = 'pb5a.voxelAtmosphericReveal.light';
  root.add(core, halo, light);

  const center = new THREE.Vector3();
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const scale = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const intensity = Math.max(0, event.intensity ?? 1);
  const radius = Math.max(0.1, readNumber(event, 'radius', 2.6));

  const revealEnvelope = (ctx: ActionContext): number => {
    const p = clamp01(ctx.progress);
    return Math.min(smoothstep01(p / 0.38), smoothstep01((1 - p) / 0.22));
  };

  const visual: EffectLayer = {
    object3d: root,
    update(ctx): void {
      root.visible = ctx.active;
      if (!ctx.active) return;
      if (target) target.getWorldPosition(center);
      else center.set(
        readNumber(event, 'centerX', 0),
        readNumber(event, 'centerY', 0),
        readNumber(event, 'centerZ', 0),
      );
      center.x += readNumber(event, 'offsetX', 0);
      center.y += readNumber(event, 'offsetY', 0);
      center.z += readNumber(event, 'offsetZ', 0);
      root.position.copy(center);
      const env = revealEnvelope(ctx);
      const growth = radius * (0.34 + smoothstep01(ctx.progress) * 0.22);
      core.scale.setScalar(Math.max(0.001, growth * 0.22));
      coreMaterial.opacity = 0.24 * intensity * env;

      const offsets: Array<readonly [number, number, number]> = [
        [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1],
      ];
      for (let i = 0; i < offsets.length; i++) {
        const [x, y, z] = offsets[i];
        position.set(x * growth * 0.52, y * growth * 0.52, z * growth * 0.28);
        scale.setScalar(Math.max(0.001, growth * 0.12));
        matrix.compose(position, quaternion, scale);
        halo.setMatrixAt(i, matrix);
      }
      halo.instanceMatrix.needsUpdate = true;
      haloMaterial.opacity = 0.04 * intensity * env;
      light.intensity = 0.85 * intensity * env;
      light.distance = radius * 3.2;
    },
    reset(): void {
      root.visible = false;
      coreMaterial.opacity = 0;
      haloMaterial.opacity = 0;
      light.intensity = 0;
    },
    dispose(): void { disposeTree(root); },
  };
  const influence = createEffectInfluenceLayer(
    [
      { channel: 'environmentLight', strength: 0.18 * intensity },
      { channel: 'fogScattering', strength: 0.12 * intensity },
      { channel: 'wetReflection', strength: 0.1 * intensity },
      { channel: 'screenExposure', strength: 0.02 * intensity },
      { channel: 'emissiveBoost', strength: 0.08 * intensity },
      { channel: 'audioImpact', strength: 0.12 * intensity },
    ],
    revealEnvelope,
  );
  return composeEffectLayers([visual, influence]);
};

function createArcBand(color: string, bandRadius: number, heightScale: number, thickness: number, z: number) {
  const segments = 24;
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const coreMaterial = accentMaterial(color, 0, false);
  const haloMaterial = accentMaterial(color, 0, true);
  const core = new THREE.InstancedMesh(geometry, coreMaterial, segments);
  const halo = new THREE.InstancedMesh(geometry.clone(), haloMaterial, segments);
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const scale = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const start = Math.PI * 0.1;
  const end = Math.PI * 0.9;
  const step = (end - start) / (segments - 1);
  const segmentLength = Math.max(thickness * 1.6, bandRadius * step * 1.06);

  for (let i = 0; i < segments; i++) {
    const angle = start + i * step;
    position.set(Math.cos(angle) * bandRadius, Math.sin(angle) * bandRadius * heightScale, z);
    const tangentAngle = angle + Math.PI / 2;
    quaternion.setFromAxisAngle(FORWARD, tangentAngle);
    scale.set(segmentLength, thickness, thickness);
    matrix.compose(position, quaternion, scale);
    core.setMatrixAt(i, matrix);
    scale.set(segmentLength * 1.04, thickness * 1.45, thickness * 1.45);
    matrix.compose(position, quaternion, scale);
    halo.setMatrixAt(i, matrix);
  }
  core.instanceMatrix.needsUpdate = true;
  halo.instanceMatrix.needsUpdate = true;
  core.frustumCulled = false;
  halo.frustumCulled = false;
  return { core, halo, coreMaterial, haloMaterial };
}

const createVoxelRainbowArc: EffectFactory = ({ event, services }): EffectInstance => {
  const target = event.target ? services.resolveAnchor(event.target) : undefined;
  const root = new THREE.Group();
  root.name = 'pb5a.voxelRainbowArc';
  root.visible = false;
  const radius = Math.max(0.5, readNumber(event, 'radius', 5.5));
  const heightScale = Math.max(0.2, readNumber(event, 'heightScale', 0.82));
  const thickness = Math.max(0.045, readNumber(event, 'thickness', 0.085));
  const bandGap = Math.max(0.06, readNumber(event, 'bandGap', 0.16));
  const intensity = Math.max(0, event.intensity ?? 1);
  const bands = VOXEL_PB3_EFFECT_STYLE.rainbow.map((color, index) => {
    const band = createArcBand(color, radius - index * bandGap, heightScale, thickness, -index * 0.014);
    band.core.name = `pb5a.voxelRainbowArc.core.${index}`;
    band.halo.name = `pb5a.voxelRainbowArc.halo.${index}`;
    root.add(band.halo, band.core);
    return band;
  });
  const center = new THREE.Vector3();

  const visual: EffectLayer = {
    object3d: root,
    update(ctx): void {
      root.visible = ctx.active;
      if (!ctx.active) return;
      if (target) target.getWorldPosition(center);
      else center.set(
        readNumber(event, 'centerX', 0),
        readNumber(event, 'centerY', 0),
        readNumber(event, 'centerZ', 0),
      );
      center.x += readNumber(event, 'offsetX', 0);
      center.y += readNumber(event, 'offsetY', 0);
      center.z += readNumber(event, 'offsetZ', 0);
      root.position.copy(center);
      const fade = envelope(ctx.progress, 0.3, 0.1);
      root.scale.setScalar(0.97 + smoothstep01(ctx.progress) * 0.03);
      for (let i = 0; i < bands.length; i++) {
        const stagger = smoothstep01(ctx.progress * 1.3 - i * 0.028);
        bands[i].coreMaterial.opacity = 0.96 * intensity * fade * stagger;
        bands[i].haloMaterial.opacity = 0.025 * intensity * fade * stagger;
      }
    },
    reset(): void {
      root.visible = false;
      bands.forEach((band) => {
        band.coreMaterial.opacity = 0;
        band.haloMaterial.opacity = 0;
      });
    },
    dispose(): void { disposeTree(root); },
  };
  const influence = createEffectInfluenceLayer(
    [
      { channel: 'environmentLight', strength: 0.1 * intensity },
      { channel: 'fogScattering', strength: 0.1 * intensity },
      { channel: 'wetReflection', strength: 0.08 * intensity },
      { channel: 'screenExposure', strength: 0.015 * intensity },
    ],
    (ctx) => envelope(ctx.progress, 0.3, 0.1),
  );
  return composeEffectLayers([visual, influence]);
};

export const VOXEL_PB3_EFFECT_FACTORIES: Record<string, EffectFactory> = {
  ...generic,
  'effect.light.beam': createVoxelLightBeam,
  'effect.light.refraction': createVoxelRefraction,
  'effect.light.spectrum': createVoxelSpectrum,
  'effect.weather.rainImpact': createVoxelRainImpact,
  'effect.reveal.atmospheric': createVoxelAtmosphericReveal,
  'effect.optics.rainbowArc': createVoxelRainbowArc,
};

const _dir = new THREE.Vector3();
