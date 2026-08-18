import * as THREE from 'three';
import {
  createRng,
  type ActionContext,
  type EffectEvent,
  type EffectFactory,
  type EffectInstance,
  type SceneServices,
} from '@mindforge/engine';
import { composeEffectLayers, createEffectInfluenceLayer, type EffectLayer } from './LayeredEffect';
import { readNumber, spanCylinder } from './EffectTypes';

export const PB3_PRODUCTION_EFFECT_IDS = [
  'effect.light.beam',
  'effect.light.refraction',
  'effect.light.spectrum',
  'effect.weather.rainImpact',
  'effect.reveal.atmospheric',
  'effect.optics.rainbowArc',
] as const;

export interface ProductionEffectStyle {
  readonly beamCore: string;
  readonly beamHalo: string;
  readonly refractionCore: string;
  readonly refractionHalo: string;
  readonly spectrum: readonly [string, string, string, string, string, string];
  readonly rain: string;
  readonly reveal: string;
  readonly rainbow: readonly [string, string, string, string, string, string];
  /** Faceting level. Voxel intentionally stays lower than Toybox. */
  readonly radialSegments: number;
  readonly haloScale: number;
}

const WORLD_UP = new THREE.Vector3(0, 1, 0);
const WORLD_RIGHT = new THREE.Vector3(1, 0, 0);

function clamp01(value: number): number {
  return value <= 0 ? 0 : value >= 1 ? 1 : value;
}

function smoothstep01(value: number): number {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
}

function windowEnvelope(progress: number, fadeIn = 0.12, fadeOut = 0.15): number {
  const p = clamp01(progress);
  const enter = fadeIn <= 0 ? 1 : smoothstep01(p / fadeIn);
  const exit = fadeOut <= 0 ? 1 : smoothstep01((1 - p) / fadeOut);
  return Math.min(enter, exit);
}

function glowMaterial(color: THREE.ColorRepresentation, opacity: number): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false,
    toneMapped: false,
    blending: THREE.AdditiveBlending,
  });
}

function lineMesh(
  color: THREE.ColorRepresentation,
  opacity: number,
  radialSegments: number,
): THREE.Mesh<THREE.CylinderGeometry, THREE.MeshBasicMaterial> {
  const geometry = new THREE.CylinderGeometry(1, 1, 1, Math.max(5, radialSegments), 1, true);
  const mesh = new THREE.Mesh(geometry, glowMaterial(color, opacity));
  mesh.frustumCulled = false;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  return mesh;
}

function setBeamSpan(
  mesh: THREE.Mesh<THREE.CylinderGeometry, THREE.MeshBasicMaterial>,
  a: THREE.Vector3,
  b: THREE.Vector3,
  radius: number,
): void {
  mesh.scale.set(radius, 1, radius);
  spanCylinder(mesh, a, b);
  mesh.scale.x = radius;
  mesh.scale.z = radius;
}

function requiredAnchor(event: EffectEvent, key: 'from' | 'to', services: SceneServices): THREE.Object3D {
  const ref = event[key];
  if (!ref) throw new Error(`${event.effect} requires "${key}" anchor`);
  return services.resolveAnchor(ref);
}

function optionalTarget(event: EffectEvent, services: SceneServices): THREE.Object3D | undefined {
  return event.target ? services.resolveAnchor(event.target) : undefined;
}

function readWorldCenter(event: EffectEvent, target: THREE.Object3D | undefined, out: THREE.Vector3): THREE.Vector3 {
  if (target) return target.getWorldPosition(out);
  return out.set(
    readNumber(event, 'centerX', 0),
    readNumber(event, 'centerY', 0),
    readNumber(event, 'centerZ', 0),
  );
}

function disposeObjectTree(root: THREE.Object3D): void {
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

function createLightBeamFactory(style: ProductionEffectStyle): EffectFactory {
  return ({ event, services, seed }): EffectInstance => {
    const from = requiredAnchor(event, 'from', services);
    const to = requiredAnchor(event, 'to', services);
    const root = new THREE.Group();
    root.name = 'pb3.lightBeam';
    root.visible = false;

    const coreColor = event.color ?? style.beamCore;
    const core = lineMesh(coreColor, 0, style.radialSegments);
    core.name = 'pb3.lightBeam.core';
    const halo = lineMesh(style.beamHalo, 0, style.radialSegments);
    halo.name = 'pb3.lightBeam.halo';
    root.add(halo, core);

    const particleCount = 10;
    const particleMaterial = glowMaterial(coreColor, 0);
    const particles = new THREE.InstancedMesh(
      new THREE.SphereGeometry(1, Math.max(5, style.radialSegments), 4),
      particleMaterial,
      particleCount,
    );
    particles.name = 'pb3.lightBeam.scatter';
    particles.frustumCulled = false;
    root.add(particles);

    const rng = createRng(seed);
    const phases = Array.from({ length: particleCount }, () => rng.next());
    const offsets = Array.from({ length: particleCount }, () => (rng.next() * 2 - 1) * 0.65);
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    const dir = new THREE.Vector3();
    const side = new THREE.Vector3();
    const p = new THREE.Vector3();
    const matrix = new THREE.Matrix4();
    const scale = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const intensity = Math.max(0, event.intensity ?? 1);
    const thickness = Math.max(0.008, readNumber(event, 'thickness', 0.035));
    const scatter = Math.max(0, readNumber(event, 'scatter', 0.05));
    const speed = Math.max(0, readNumber(event, 'particleSpeed', 0.5));

    const visualLayer: EffectLayer = {
      object3d: root,
      update(ctx): void {
        root.visible = ctx.active;
        if (!ctx.active) return;
        from.getWorldPosition(a);
        to.getWorldPosition(b);
        const envelope = windowEnvelope(ctx.progress);
        setBeamSpan(core, a, b, thickness);
        setBeamSpan(halo, a, b, thickness * style.haloScale);
        core.material.opacity = 0.94 * intensity * envelope;
        halo.material.opacity = 0.18 * intensity * envelope;

        dir.subVectors(b, a).normalize();
        side.crossVectors(dir, WORLD_UP);
        if (side.lengthSq() < 1e-5) side.crossVectors(dir, WORLD_RIGHT);
        side.normalize();
        for (let i = 0; i < particleCount; i++) {
          const t = (ctx.localTime * speed + phases[i]) % 1;
          p.copy(a).lerp(b, t).addScaledVector(side, offsets[i] * scatter);
          const particleScale = thickness * (0.65 + (i % 3) * 0.18) * envelope;
          scale.setScalar(Math.max(0.0001, particleScale));
          matrix.compose(p, quaternion, scale);
          particles.setMatrixAt(i, matrix);
        }
        particles.instanceMatrix.needsUpdate = true;
        particleMaterial.opacity = 0.42 * intensity * envelope;
      },
      reset(): void {
        root.visible = false;
        core.material.opacity = 0;
        halo.material.opacity = 0;
        particleMaterial.opacity = 0;
      },
      dispose(): void {
        disposeObjectTree(root);
      },
    };

    const influenceLayer = createEffectInfluenceLayer(
      [
        { channel: 'environmentLight', strength: 0.1 * intensity },
        { channel: 'fogScattering', strength: 0.2 * intensity },
        { channel: 'emissiveBoost', strength: 0.14 * intensity },
      ],
      (ctx) => windowEnvelope(ctx.progress),
    );

    return composeEffectLayers([visualLayer, influenceLayer]);
  };
}

function createRefractionFactory(style: ProductionEffectStyle): EffectFactory {
  return ({ event, services }): EffectInstance => {
    const refs = event.through ?? [event.from, event.to].filter((ref): ref is string => Boolean(ref));
    if (refs.length < 2) throw new Error(`${event.effect} requires at least two anchors via "through" or "from/to"`);
    const anchors = refs.map((ref) => services.resolveAnchor(ref));
    const root = new THREE.Group();
    root.name = 'pb3.refraction';
    root.visible = false;
    const segmentCount = anchors.length - 1;
    const coreMeshes = Array.from({ length: segmentCount }, (_, index) => {
      const mesh = lineMesh(event.color ?? style.refractionCore, 0, style.radialSegments);
      mesh.name = `pb3.refraction.core.${index}`;
      root.add(mesh);
      return mesh;
    });
    const haloMeshes = Array.from({ length: segmentCount }, (_, index) => {
      const mesh = lineMesh(style.refractionHalo, 0, style.radialSegments);
      mesh.name = `pb3.refraction.halo.${index}`;
      root.add(mesh);
      return mesh;
    });
    const contacts = Array.from({ length: Math.max(0, anchors.length - 2) }, (_, index) => {
      const material = glowMaterial(style.refractionCore, 0);
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, style.radialSegments, 5), material);
      mesh.name = `pb3.refraction.contact.${index}`;
      root.add(mesh);
      return mesh;
    });
    const points = anchors.map(() => new THREE.Vector3());
    const partialEnd = new THREE.Vector3();
    const intensity = Math.max(0, event.intensity ?? 1);
    const thickness = Math.max(0.008, readNumber(event, 'thickness', 0.026));

    const visualLayer: EffectLayer = {
      object3d: root,
      update(ctx): void {
        root.visible = ctx.active;
        if (!ctx.active) return;
        anchors.forEach((anchor, index) => anchor.getWorldPosition(points[index]));
        for (let i = 0; i < segmentCount; i++) {
          const segmentProgress = clamp01(ctx.progress * segmentCount - i);
          const eased = smoothstep01(segmentProgress);
          partialEnd.copy(points[i]).lerp(points[i + 1], eased);
          setBeamSpan(coreMeshes[i], points[i], partialEnd, thickness);
          setBeamSpan(haloMeshes[i], points[i], partialEnd, thickness * style.haloScale);
          coreMeshes[i].material.opacity = 0.92 * intensity * eased;
          haloMeshes[i].material.opacity = 0.2 * intensity * eased;
        }
        contacts.forEach((contact, index) => {
          const arrival = clamp01(ctx.progress * segmentCount - (index + 0.85));
          contact.position.copy(points[index + 1]);
          contact.scale.setScalar(0.04 + 0.11 * Math.sin(Math.PI * arrival));
          contact.material.opacity = 0.72 * intensity * Math.sin(Math.PI * arrival);
        });
      },
      reset(): void {
        root.visible = false;
        coreMeshes.forEach((mesh) => (mesh.material.opacity = 0));
        haloMeshes.forEach((mesh) => (mesh.material.opacity = 0));
        contacts.forEach((mesh) => (mesh.material.opacity = 0));
      },
      dispose(): void {
        disposeObjectTree(root);
      },
    };
    const influenceLayer = createEffectInfluenceLayer(
      [
        { channel: 'fogScattering', strength: 0.18 * intensity },
        { channel: 'emissiveBoost', strength: 0.16 * intensity },
        { channel: 'environmentLight', strength: 0.08 * intensity },
      ],
      (ctx) => windowEnvelope(ctx.progress, 0.1, 0.08),
    );
    return composeEffectLayers([visualLayer, influenceLayer]);
  };
}

function createSpectrumFactory(style: ProductionEffectStyle): EffectFactory {
  return ({ event, services }): EffectInstance => {
    const from = requiredAnchor(event, 'from', services);
    const to = event.to ? services.resolveAnchor(event.to) : undefined;
    const root = new THREE.Group();
    root.name = 'pb3.spectrum';
    root.visible = false;
    const cores = style.spectrum.map((color, index) => {
      const mesh = lineMesh(color, 0, style.radialSegments);
      mesh.name = `pb3.spectrum.core.${index}`;
      root.add(mesh);
      return mesh;
    });
    const halos = style.spectrum.map((color, index) => {
      const mesh = lineMesh(color, 0, style.radialSegments);
      mesh.name = `pb3.spectrum.halo.${index}`;
      root.add(mesh);
      return mesh;
    });
    const start = new THREE.Vector3();
    const guide = new THREE.Vector3();
    const dir = new THREE.Vector3();
    const spreadAxis = new THREE.Vector3();
    const end = new THREE.Vector3();
    const partialEnd = new THREE.Vector3();
    const intensity = Math.max(0, event.intensity ?? 1);
    const length = Math.max(0.1, readNumber(event, 'length', 3.8));
    const spread = Math.max(0, readNumber(event, 'spread', 1.15));
    const thickness = Math.max(0.006, readNumber(event, 'thickness', 0.022));

    const visualLayer: EffectLayer = {
      object3d: root,
      update(ctx): void {
        root.visible = ctx.active;
        if (!ctx.active) return;
        from.getWorldPosition(start);
        if (to) {
          to.getWorldPosition(guide);
          dir.subVectors(guide, start);
          if (dir.lengthSq() < 1e-6) dir.set(1, 0, 0);
          else dir.normalize();
        } else {
          dir.set(1, 0, 0);
        }
        spreadAxis.crossVectors(dir, new THREE.Vector3(0, 0, 1));
        if (spreadAxis.lengthSq() < 1e-6) spreadAxis.copy(WORLD_UP);
        spreadAxis.normalize();
        for (let i = 0; i < style.spectrum.length; i++) {
          const normalizedBand = i / (style.spectrum.length - 1) - 0.5;
          end.copy(start).addScaledVector(dir, length).addScaledVector(spreadAxis, normalizedBand * spread);
          const reveal = smoothstep01(ctx.progress * 1.22 - i * 0.035);
          partialEnd.copy(start).lerp(end, reveal);
          setBeamSpan(cores[i], start, partialEnd, thickness);
          setBeamSpan(halos[i], start, partialEnd, thickness * style.haloScale * 1.2);
          cores[i].material.opacity = 0.82 * intensity * reveal;
          halos[i].material.opacity = 0.17 * intensity * reveal;
        }
      },
      reset(): void {
        root.visible = false;
        cores.forEach((mesh) => (mesh.material.opacity = 0));
        halos.forEach((mesh) => (mesh.material.opacity = 0));
      },
      dispose(): void {
        disposeObjectTree(root);
      },
    };
    const influenceLayer = createEffectInfluenceLayer(
      [
        { channel: 'fogScattering', strength: 0.24 * intensity },
        { channel: 'emissiveBoost', strength: 0.18 * intensity },
      ],
      (ctx) => windowEnvelope(ctx.progress, 0.16, 0.08),
    );
    return composeEffectLayers([visualLayer, influenceLayer]);
  };
}

function createRainImpactFactory(style: ProductionEffectStyle): EffectFactory {
  return ({ event, services, seed }): EffectInstance => {
    const target = optionalTarget(event, services) ?? requiredAnchor(event, 'to', services);
    const root = new THREE.Group();
    root.name = 'pb3.rainImpact';
    root.visible = false;
    const rippleMaterial = glowMaterial(style.rain, 0);
    const ripple = new THREE.Mesh(new THREE.RingGeometry(0.7, 1, 40), rippleMaterial);
    ripple.name = 'pb3.rainImpact.ripple';
    ripple.rotation.x = -Math.PI / 2;
    root.add(ripple);
    const innerMaterial = glowMaterial(style.rain, 0);
    const inner = new THREE.Mesh(new THREE.RingGeometry(0.78, 1, 32), innerMaterial);
    inner.name = 'pb3.rainImpact.rippleInner';
    inner.rotation.x = -Math.PI / 2;
    root.add(inner);

    const splashCount = 12;
    const splashMaterial = glowMaterial(style.rain, 0);
    const splash = new THREE.InstancedMesh(
      new THREE.SphereGeometry(1, Math.max(5, style.radialSegments), 4),
      splashMaterial,
      splashCount,
    );
    splash.name = 'pb3.rainImpact.splash';
    splash.frustumCulled = false;
    root.add(splash);
    const rng = createRng(seed);
    const angles = Array.from({ length: splashCount }, () => rng.next() * Math.PI * 2);
    const speeds = Array.from({ length: splashCount }, () => 0.65 + rng.next() * 0.75);
    const heights = Array.from({ length: splashCount }, () => 0.35 + rng.next() * 0.55);
    const center = new THREE.Vector3();
    const matrix = new THREE.Matrix4();
    const p = new THREE.Vector3();
    const scale = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const intensity = Math.max(0, event.intensity ?? 1);
    const radius = Math.max(0.05, readNumber(event, 'radius', 0.42));

    const visualLayer: EffectLayer = {
      object3d: root,
      update(ctx): void {
        root.visible = ctx.active;
        if (!ctx.active) return;
        target.getWorldPosition(center);
        root.position.copy(center);
        const t = clamp01(ctx.progress);
        const rippleT = smoothstep01(t);
        ripple.scale.setScalar(radius * (0.25 + rippleT * 1.85));
        inner.scale.setScalar(radius * (0.15 + rippleT * 1.2));
        rippleMaterial.opacity = 0.42 * intensity * (1 - t);
        innerMaterial.opacity = 0.25 * intensity * (1 - t) ** 1.4;
        for (let i = 0; i < splashCount; i++) {
          const radial = radius * speeds[i] * t;
          p.set(
            Math.cos(angles[i]) * radial,
            heights[i] * Math.sin(Math.PI * t),
            Math.sin(angles[i]) * radial,
          );
          const s = Math.max(0.0001, radius * 0.11 * (1 - t) * (0.7 + (i % 3) * 0.12));
          scale.set(s * 0.6, s * 1.8, s * 0.6);
          matrix.compose(p, quaternion, scale);
          splash.setMatrixAt(i, matrix);
        }
        splash.instanceMatrix.needsUpdate = true;
        splashMaterial.opacity = 0.7 * intensity * (1 - t);
      },
      reset(): void {
        root.visible = false;
        rippleMaterial.opacity = 0;
        innerMaterial.opacity = 0;
        splashMaterial.opacity = 0;
      },
      dispose(): void {
        disposeObjectTree(root);
      },
    };
    const influenceLayer = createEffectInfluenceLayer(
      [
        { channel: 'wetReflection', strength: 0.16 * intensity },
        { channel: 'emissiveBoost', strength: 0.05 * intensity },
      ],
      (ctx) => (ctx.active ? 1 - ctx.progress : 0),
    );
    return composeEffectLayers([visualLayer, influenceLayer]);
  };
}

function createAtmosphericRevealFactory(style: ProductionEffectStyle): EffectFactory {
  return ({ event, services }): EffectInstance => {
    const target = optionalTarget(event, services);
    const root = new THREE.Group();
    root.name = 'pb3.atmosphericReveal';
    root.visible = false;
    const innerMaterial = glowMaterial(event.color ?? style.reveal, 0);
    const inner = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), innerMaterial);
    inner.name = 'pb3.atmosphericReveal.inner';
    const outerMaterial = glowMaterial(style.reveal, 0);
    const outer = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), outerMaterial);
    outer.name = 'pb3.atmosphericReveal.outer';
    outer.material.side = THREE.BackSide;
    const light = new THREE.PointLight(style.reveal, 0, 0, 2);
    light.name = 'pb3.atmosphericReveal.light';
    root.add(outer, inner, light);
    const center = new THREE.Vector3();
    const intensity = Math.max(0, event.intensity ?? 1);
    const radius = Math.max(0.1, readNumber(event, 'radius', 2.6));

    const revealEnvelope = (ctx: ActionContext): number => {
      const p = clamp01(ctx.progress);
      const enter = smoothstep01(p / 0.38);
      const holdExit = smoothstep01((1 - p) / 0.22);
      return Math.min(enter, holdExit);
    };
    const visualLayer: EffectLayer = {
      object3d: root,
      update(ctx): void {
        root.visible = ctx.active;
        if (!ctx.active) return;
        readWorldCenter(event, target, center);
        root.position.copy(center);
        const envelope = revealEnvelope(ctx);
        const growth = radius * (0.7 + smoothstep01(ctx.progress) * 0.55);
        inner.scale.setScalar(growth * 0.42);
        outer.scale.setScalar(growth);
        innerMaterial.opacity = 0.1 * intensity * envelope;
        outerMaterial.opacity = 0.05 * intensity * envelope;
        light.intensity = 2.6 * intensity * envelope;
        light.distance = radius * 4;
      },
      reset(): void {
        root.visible = false;
        innerMaterial.opacity = 0;
        outerMaterial.opacity = 0;
        light.intensity = 0;
      },
      dispose(): void {
        disposeObjectTree(root);
      },
    };
    const influenceLayer = createEffectInfluenceLayer(
      [
        { channel: 'environmentLight', strength: 0.58 * intensity },
        { channel: 'fogScattering', strength: 0.62 * intensity },
        { channel: 'wetReflection', strength: 0.46 * intensity },
        { channel: 'screenExposure', strength: 0.16 * intensity },
        { channel: 'emissiveBoost', strength: 0.24 * intensity },
        { channel: 'audioImpact', strength: 0.18 * intensity },
      ],
      revealEnvelope,
    );
    return composeEffectLayers([visualLayer, influenceLayer]);
  };
}

function createRainbowArcFactory(style: ProductionEffectStyle): EffectFactory {
  return ({ event, services }): EffectInstance => {
    const target = optionalTarget(event, services);
    const root = new THREE.Group();
    root.name = 'pb3.rainbowArc';
    root.visible = false;
    const radius = Math.max(0.5, readNumber(event, 'radius', 5.5));
    const heightScale = Math.max(0.2, readNumber(event, 'heightScale', 0.82));
    const thickness = Math.max(0.008, readNumber(event, 'thickness', 0.055));
    const bandGap = Math.max(0.02, readNumber(event, 'bandGap', 0.14));
    const intensity = Math.max(0, event.intensity ?? 1);
    const segments = 64;
    const startAngle = Math.PI * 0.11;
    const endAngle = Math.PI * 0.89;
    const cores: Array<THREE.Mesh<THREE.TubeGeometry, THREE.MeshBasicMaterial>> = [];
    const halos: Array<THREE.Mesh<THREE.TubeGeometry, THREE.MeshBasicMaterial>> = [];

    for (let band = 0; band < style.rainbow.length; band++) {
      const bandRadius = radius - band * bandGap;
      const points: THREE.Vector3[] = [];
      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const angle = THREE.MathUtils.lerp(startAngle, endAngle, t);
        points.push(new THREE.Vector3(
          Math.cos(angle) * bandRadius,
          Math.sin(angle) * bandRadius * heightScale,
          -band * 0.012,
        ));
      }
      const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
      const coreGeometry = new THREE.TubeGeometry(curve, segments, thickness, Math.max(5, style.radialSegments), false);
      const haloGeometry = new THREE.TubeGeometry(
        curve,
        segments,
        thickness * style.haloScale * 1.35,
        Math.max(5, style.radialSegments),
        false,
      );
      const coreMaterial = glowMaterial(style.rainbow[band], 0);
      const haloMaterial = glowMaterial(style.rainbow[band], 0);
      const core = new THREE.Mesh(coreGeometry, coreMaterial);
      core.name = `pb3.rainbowArc.core.${band}`;
      const halo = new THREE.Mesh(haloGeometry, haloMaterial);
      halo.name = `pb3.rainbowArc.halo.${band}`;
      root.add(halo, core);
      cores.push(core);
      halos.push(halo);
    }
    const center = new THREE.Vector3();
    const revealEnvelope = (ctx: ActionContext): number => {
      const p = clamp01(ctx.progress);
      const enter = smoothstep01(p / 0.55);
      const exit = smoothstep01((1 - p) / 0.12);
      return Math.min(enter, exit);
    };
    const visualLayer: EffectLayer = {
      object3d: root,
      update(ctx): void {
        root.visible = ctx.active;
        if (!ctx.active) return;
        readWorldCenter(event, target, center);
        root.position.copy(center);
        const baseEnvelope = revealEnvelope(ctx);
        const settle = 0.985 + 0.015 * smoothstep01(ctx.progress);
        root.scale.setScalar(settle);
        for (let band = 0; band < cores.length; band++) {
          const stagger = smoothstep01(ctx.progress * 1.25 - band * 0.025);
          cores[band].material.opacity = 0.56 * intensity * baseEnvelope * stagger;
          halos[band].material.opacity = 0.1 * intensity * baseEnvelope * stagger;
        }
      },
      reset(): void {
        root.visible = false;
        cores.forEach((mesh) => (mesh.material.opacity = 0));
        halos.forEach((mesh) => (mesh.material.opacity = 0));
      },
      dispose(): void {
        disposeObjectTree(root);
      },
    };
    const influenceLayer = createEffectInfluenceLayer(
      [
        { channel: 'environmentLight', strength: 0.2 * intensity },
        { channel: 'fogScattering', strength: 0.38 * intensity },
        { channel: 'wetReflection', strength: 0.16 * intensity },
        { channel: 'screenExposure', strength: 0.06 * intensity },
      ],
      revealEnvelope,
    );
    return composeEffectLayers([visualLayer, influenceLayer]);
  };
}

/**
 * Create the PB3 reusable production-effect vocabulary for one theme style.
 * The semantics stay identical across themes; only visual tuning changes.
 */
export function createProductionEffectFactories(style: ProductionEffectStyle): Record<string, EffectFactory> {
  return {
    'effect.light.beam': createLightBeamFactory(style),
    'effect.light.refraction': createRefractionFactory(style),
    'effect.light.spectrum': createSpectrumFactory(style),
    'effect.weather.rainImpact': createRainImpactFactory(style),
    'effect.reveal.atmospheric': createAtmosphericRevealFactory(style),
    'effect.optics.rainbowArc': createRainbowArcFactory(style),
  };
}
