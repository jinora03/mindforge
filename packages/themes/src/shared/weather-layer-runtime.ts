import * as THREE from 'three';
import {
  createRng,
  disposeObject3D,
  type SceneCompositionLayerBuildContext,
  type SceneCompositionLayerFactory,
  type SceneCompositionLayerInstance,
} from '@mindforge/engine';

type WeatherMaterial = THREE.MeshBasicMaterial | THREE.MeshStandardMaterial;

const clamp = (value: number, min: number, max: number): number =>
  value < min ? min : value > max ? max : value;

const positiveModulo = (value: number, modulus: number): number =>
  ((value % modulus) + modulus) % modulus;

function numberParameter(
  parameters: Readonly<Record<string, unknown>>,
  key: string,
  fallback: number,
  min: number,
  max: number,
): number {
  const value = parameters[key];
  return typeof value === 'number' && Number.isFinite(value)
    ? clamp(value, min, max)
    : fallback;
}

function setWeatherMaterialResponse(
  material: WeatherMaterial,
  baseColor: THREE.Color,
  flashColor: THREE.Color,
  baseOpacity: number,
  intensity: number,
  environmentLight: number,
  emissiveBoost: number,
): void {
  const response = clamp(environmentLight * 0.72 + emissiveBoost * 0.28, 0, 1);
  material.color.copy(baseColor).lerp(flashColor, response * 0.82);
  material.opacity = clamp(baseOpacity * (0.58 + intensity * 0.42) * (1 + response * 0.28), 0, 1);

  if (material instanceof THREE.MeshStandardMaterial) {
    material.emissive.copy(flashColor);
    material.emissiveIntensity = response * 0.34;
  }
}

export interface RainLayerStyle {
  readonly name: string;
  readonly color: THREE.ColorRepresentation;
  readonly flashColor: THREE.ColorRepresentation;
  readonly defaultIntensity: number;
  readonly defaultWind: number;
  readonly baseOpacity: number;
  readonly maxCount: number;
  readonly radius: number;
  readonly height: number;
  readonly centerZ: number;
  readonly thickness: number;
  readonly length: readonly [number, number];
  readonly speed: readonly [number, number];
  readonly baseSlant: number;
  readonly material: (color: THREE.ColorRepresentation, opacity: number) => WeatherMaterial;
  readonly geometry: (thickness: number) => THREE.BufferGeometry;
}

/**
 * Theme-styled but mechanically shared deterministic rain field.
 *
 * Every particle has immutable seeded base data. Runtime state is reconstructed
 * from absolute FrameContext.time plus PF4's frame-local influence snapshot;
 * no particle position is accumulated from delta time.
 */
export function createRainLayerFactory(style: RainLayerStyle): SceneCompositionLayerFactory {
  return (ctx: SceneCompositionLayerBuildContext): SceneCompositionLayerInstance => {
    const root = new THREE.Group();
    root.name = `mindforge-weather:${style.name}:${ctx.id}`;

    const intensity = numberParameter(ctx.parameters, 'intensity', style.defaultIntensity, 0, 1);
    const authoredWind = numberParameter(ctx.parameters, 'wind', style.defaultWind, -1, 1);
    const radius = numberParameter(ctx.parameters, 'radius', style.radius, 4, 60);
    const centerX = numberParameter(ctx.parameters, 'centerX', 0, -100, 100);
    const centerZ = numberParameter(ctx.parameters, 'centerZ', style.centerZ, -100, 100);
    const groundY = numberParameter(ctx.parameters, 'groundY', 0, -30, 30);
    const height = numberParameter(ctx.parameters, 'height', style.height, 4, 60);

    const geometry = style.geometry(style.thickness);
    const material = style.material(style.color, style.baseOpacity);
    material.transparent = true;
    material.depthWrite = false;

    const mesh = new THREE.InstancedMesh(geometry, material, style.maxCount);
    mesh.name = `${style.name}.streaks`;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.frustumCulled = false;
    root.add(mesh);

    const rng = createRng(ctx.seed);
    const particles = Array.from({ length: style.maxCount }, () => ({
      x: rng.range(-radius, radius),
      y: rng.range(0, height),
      z: rng.range(-radius, radius),
      speed: rng.range(style.speed[0], style.speed[1]),
      length: rng.range(style.length[0], style.length[1]),
      phase: rng.range(0, Math.PI * 2),
    }));

    const baseColor = new THREE.Color(style.color);
    const flashColor = new THREE.Color(style.flashColor);
    const matrix = new THREE.Matrix4();
    const quaternion = new THREE.Quaternion();
    const euler = new THREE.Euler();
    const position = new THREE.Vector3();
    const scale = new THREE.Vector3();

    return {
      object3d: root,
      update(frame): void {
        const influences = ctx.services.effectInfluences;
        const windImpulse = influences.get('windImpulse');
        const environmentLight = influences.get('environmentLight');
        const emissiveBoost = influences.get('emissiveBoost');
        const windDirection = authoredWind < 0 ? -1 : 1;
        const effectiveWind = clamp(
          authoredWind + windDirection * windImpulse * 0.42,
          -1,
          1,
        );
        const lateralSpeed = effectiveWind * 3.2;
        const visibleCount = Math.round(style.maxCount * intensity);
        mesh.count = visibleCount;

        euler.set(0.018, 0, style.baseSlant + effectiveWind * 0.19, 'XYZ');
        quaternion.setFromEuler(euler);

        for (let index = 0; index < visibleCount; index++) {
          const particle = particles[index];
          const x = centerX + positiveModulo(
            particle.x + radius + frame.time * lateralSpeed + Math.sin(frame.time * 0.55 + particle.phase) * 0.12,
            radius * 2,
          ) - radius;
          const y = groundY + positiveModulo(particle.y - frame.time * particle.speed, height);
          position.set(x, y, centerZ + particle.z);
          scale.set(1, particle.length, 1);
          matrix.compose(position, quaternion, scale);
          mesh.setMatrixAt(index, matrix);
        }
        mesh.instanceMatrix.needsUpdate = true;

        setWeatherMaterialResponse(
          material,
          baseColor,
          flashColor,
          style.baseOpacity,
          intensity,
          environmentLight,
          emissiveBoost,
        );
      },
      dispose(): void {
        disposeObject3D(root);
        root.removeFromParent();
      },
    };
  };
}

export interface MistLayerStyle {
  readonly name: string;
  readonly color: THREE.ColorRepresentation;
  readonly flashColor: THREE.ColorRepresentation;
  readonly defaultDensity: number;
  readonly defaultDrift: number;
  readonly centerZ: number;
  readonly planes: readonly {
    readonly width: number;
    readonly height: number;
    readonly y: number;
    readonly zOffset: number;
    readonly opacity: number;
    readonly drift: number;
  }[];
  readonly material: (color: THREE.ColorRepresentation, opacity: number) => THREE.MeshBasicMaterial;
}

/** Deterministic layered mist that reacts to PF4 fog/light/wind influences. */
export function createMistLayerFactory(style: MistLayerStyle): SceneCompositionLayerFactory {
  return (ctx: SceneCompositionLayerBuildContext): SceneCompositionLayerInstance => {
    const root = new THREE.Group();
    root.name = `mindforge-atmosphere:${style.name}:${ctx.id}`;

    const density = numberParameter(ctx.parameters, 'density', style.defaultDensity, 0, 1);
    const drift = numberParameter(ctx.parameters, 'drift', style.defaultDrift, 0, 1);
    const authoredWind = numberParameter(ctx.parameters, 'wind', 0, -1, 1);
    const centerX = numberParameter(ctx.parameters, 'centerX', 0, -100, 100);
    const centerZ = numberParameter(ctx.parameters, 'centerZ', style.centerZ, -100, 100);
    const baseY = numberParameter(ctx.parameters, 'baseY', 0, -30, 30);

    const rng = createRng(ctx.seed);
    const baseColor = new THREE.Color(style.color);
    const flashColor = new THREE.Color(style.flashColor);
    const entries = style.planes.map((spec, index) => {
      const material = style.material(style.color, spec.opacity * density);
      material.transparent = true;
      material.depthWrite = false;
      material.fog = false;
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(spec.width, spec.height), material);
      plane.name = `${style.name}.plane.${index}`;
      const phase = rng.range(0, Math.PI * 2);
      const xOffset = rng.range(-0.7, 0.7);
      plane.position.set(centerX + xOffset, baseY + spec.y, centerZ + spec.zOffset);
      plane.renderOrder = 1;
      root.add(plane);
      return { plane, material, spec, phase, xOffset };
    });

    return {
      object3d: root,
      update(frame): void {
        const influences = ctx.services.effectInfluences;
        const fogScattering = influences.get('fogScattering');
        const environmentLight = influences.get('environmentLight');
        const windImpulse = influences.get('windImpulse');
        const response = clamp(fogScattering * 0.76 + environmentLight * 0.24, 0, 1);
        const gust = clamp(Math.abs(authoredWind) * 0.4 + windImpulse, 0, 1);
        const signedWind = authoredWind === 0 ? 1 : Math.sign(authoredWind);

        for (const { plane, material, spec, phase, xOffset } of entries) {
          const motion = Math.sin(frame.time * (0.045 + drift * 0.11) + phase)
            * spec.drift
            * (0.45 + drift * 0.8 + gust * 0.45);
          plane.position.x = centerX + xOffset + motion + signedWind * gust * 0.22;
          material.opacity = clamp(
            spec.opacity * density * (1 + fogScattering * 0.58),
            0,
            0.72,
          );
          material.color.copy(baseColor).lerp(flashColor, response * 0.72);
        }
      },
      dispose(): void {
        disposeObject3D(root);
        root.removeFromParent();
      },
    };
  };
}

export interface FogLayerStyle {
  readonly name: string;
  readonly color: THREE.ColorRepresentation;
  readonly flashColor: THREE.ColorRepresentation;
  readonly defaultDensity: number;
  readonly densityRange: readonly [number, number];
}

/**
 * Scene-global exponential fog with safe ownership/restoration semantics.
 * Declaration order defines precedence when multiple fog-like layers exist;
 * PF1 reverse disposal restores the previous fog chain correctly.
 */
export function createFogLayerFactory(style: FogLayerStyle): SceneCompositionLayerFactory {
  return (ctx: SceneCompositionLayerBuildContext): SceneCompositionLayerInstance => {
    const root = new THREE.Group();
    root.name = `mindforge-atmosphere:${style.name}:${ctx.id}`;

    const scene = ctx.services.scene;
    const previousFog = scene.fog;
    const densityParameter = numberParameter(
      ctx.parameters,
      'density',
      style.defaultDensity,
      0,
      1,
    );
    const density = THREE.MathUtils.lerp(
      style.densityRange[0],
      style.densityRange[1],
      densityParameter,
    );
    const baseColor = new THREE.Color(style.color);
    const flashColor = new THREE.Color(style.flashColor);
    const fog = new THREE.FogExp2(baseColor.clone(), density);
    scene.fog = fog;

    return {
      object3d: root,
      update(): void {
        const influences = ctx.services.effectInfluences;
        const fogScattering = influences.get('fogScattering');
        const environmentLight = influences.get('environmentLight');
        const response = clamp(fogScattering * 0.78 + environmentLight * 0.22, 0, 1);
        fog.color.copy(baseColor).lerp(flashColor, response * 0.78);
        fog.density = density * (1 + fogScattering * 0.08);
        // Reassert this layer's state during its ordered PF1 update. If another
        // fog layer follows, that later declaration deterministically wins.
        scene.fog = fog;
      },
      dispose(): void {
        if (scene.fog === fog) scene.fog = previousFog;
        root.removeFromParent();
      },
    };
  };
}
