import * as THREE from 'three';
import {
  createRng,
  disposeObject3D,
  type EnvironmentFactory,
  type EnvironmentInstance,
  type SceneCompositionLayerFactory,
  type SceneCompositionLayerInstance,
} from '@mindforge/engine';

const clamp = (value: number, min: number, max: number): number =>
  value < min ? min : value > max ? max : value;

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

export interface CompositionStageStyle {
  readonly name: string;
  readonly background: THREE.ColorRepresentation;
  readonly camera: {
    readonly position: readonly [number, number, number];
    readonly target: readonly [number, number, number];
    readonly fov: number;
  };
  /** Optional theme-owned sky/backdrop geometry; never terrain or set dressing. */
  readonly createBackdrop?: () => THREE.Object3D;
}

/**
 * Minimal PF6 base environment for layer-composed production scenes.
 *
 * It owns presentation background/default camera only. Terrain, dressing,
 * lighting, atmosphere, and weather remain independent PF1 layers.
 */
export function createCompositionStageEnvironmentFactory(
  style: CompositionStageStyle,
): EnvironmentFactory {
  return ({ services }): EnvironmentInstance => {
    const scene = services.scene;
    const previousBackground = scene.background;
    const previousFog = scene.fog;
    const root = new THREE.Group();
    root.name = `mindforge-composition-stage:${style.name}`;
    scene.background = new THREE.Color(style.background);
    if (style.createBackdrop) root.add(style.createBackdrop());

    return {
      object3d: root,
      defaultCamera: {
        position: new THREE.Vector3(...style.camera.position),
        target: new THREE.Vector3(...style.camera.target),
        fov: style.camera.fov,
      },
      update(): void {},
      dispose(): void {
        disposeObject3D(root);
        root.removeFromParent();
        scene.background = previousBackground;
        scene.fog = previousFog;
      },
    };
  };
}

export interface SurfaceLayerStyle {
  readonly name: string;
  readonly defaultWidth: number;
  readonly defaultDepth: number;
  /** Returns a ground-contact object whose local ground surface is y=0. */
  readonly createSurface: (width: number, depth: number) => THREE.Object3D;
}

/** Flat composable surface foundation. More complex authored terrain can replace this later. */
export function createSurfaceLayerFactory(style: SurfaceLayerStyle): SceneCompositionLayerFactory {
  return (ctx): SceneCompositionLayerInstance => {
    const width = numberParameter(ctx.parameters, 'width', style.defaultWidth, 4, 120);
    const depth = numberParameter(ctx.parameters, 'depth', style.defaultDepth, 4, 120);
    const centerX = numberParameter(ctx.parameters, 'centerX', 0, -100, 100);
    const centerZ = numberParameter(ctx.parameters, 'centerZ', -8, -100, 100);
    const y = numberParameter(ctx.parameters, 'y', 0, -30, 30);

    const root = new THREE.Group();
    root.name = `mindforge-composition:${style.name}:${ctx.id}`;
    const surface = style.createSurface(width, depth);
    surface.name ||= `${style.name}.surface`;
    surface.position.set(centerX, y, centerZ);
    root.add(surface);

    return {
      object3d: root,
      update(): void {},
      dispose(): void {
        disposeObject3D(root);
        root.removeFromParent();
      },
    };
  };
}

export interface CompositionScatterVariant {
  readonly id: string;
  readonly weight?: number;
  /** Optional PF2 production model. Falls back explicitly when not available. */
  readonly assetId?: string;
  readonly createFallback: () => THREE.Object3D;
  readonly minScale?: number;
  readonly maxScale?: number;
  readonly yOffset?: number;
}

export interface ScatterLayerStyle {
  readonly name: string;
  readonly variants: readonly CompositionScatterVariant[];
  readonly placement: 'field' | 'sideFrame';
  readonly defaultCount: number;
  readonly defaultHalfWidth: number;
  readonly defaultNearZ: number;
  readonly defaultFarZ: number;
  readonly defaultClearRadius: number;
  readonly defaultMinScale: number;
  readonly defaultMaxScale: number;
  readonly sideFrameInnerX?: number;
  /** Optional deterministic clustering for organic production dressing. Zero preserves uniform PF6 placement. */
  readonly defaultClusterCount?: number;
  readonly defaultClusterRadius?: number;
}

interface WeightedVariant {
  readonly variant: CompositionScatterVariant;
  readonly upperBound: number;
}

function weightedVariants(
  variants: readonly CompositionScatterVariant[],
): { readonly entries: readonly WeightedVariant[]; readonly total: number } {
  let total = 0;
  const entries = variants.map((variant) => {
    const weight = Math.max(0, variant.weight ?? 1);
    total += weight;
    return { variant, upperBound: total };
  });
  return { entries, total };
}

function pickVariant(
  weighted: ReturnType<typeof weightedVariants>,
  value: number,
): CompositionScatterVariant {
  if (weighted.entries.length === 0) {
    throw new Error('Production composition scatter requires at least one variant.');
  }
  if (weighted.total <= 0) return weighted.entries[0].variant;
  const target = value * weighted.total;
  return weighted.entries.find((entry) => target < entry.upperBound)?.variant
    ?? weighted.entries[weighted.entries.length - 1].variant;
}

function createScatterObject(
  variant: CompositionScatterVariant,
  ctx: Parameters<SceneCompositionLayerFactory>[0],
): THREE.Object3D {
  if (variant.assetId && ctx.services.assets.has(variant.assetId)) {
    const authored = ctx.services.assets.instantiateModel(variant.assetId).object3d;
    authored.userData.mindforgeCompositionSource = 'authored';
    authored.userData.mindforgeAssetId = variant.assetId;
    authored.userData.mindforgeVariantId = variant.id;
    return authored;
  }
  const fallback = variant.createFallback();
  fallback.userData.mindforgeCompositionSource = 'fallback';
  fallback.userData.mindforgeVariantId = variant.id;
  if (variant.assetId) fallback.userData.mindforgeMissingAssetId = variant.assetId;
  return fallback;
}

/**
 * Deterministic PF6 set-dressing placement with an explicit authored-asset bridge.
 *
 * Placement is generated once from the PF1 per-layer seed. It never depends on
 * playback order or wall-clock time. A configured PF2 model is instantiated when
 * available; otherwise the theme-provided fallback remains clearly marked.
 */
export function createDeterministicScatterLayerFactory(
  style: ScatterLayerStyle,
): SceneCompositionLayerFactory {
  if (style.variants.length === 0) {
    throw new Error(`Scatter style "${style.name}" requires at least one variant.`);
  }
  const weighted = weightedVariants(style.variants);

  return (ctx): SceneCompositionLayerInstance => {
    const root = new THREE.Group();
    root.name = `mindforge-composition:${style.name}:${ctx.id}`;
    const rng = createRng(ctx.seed);

    const count = Math.round(numberParameter(ctx.parameters, 'count', style.defaultCount, 0, 128));
    const halfWidth = numberParameter(ctx.parameters, 'halfWidth', style.defaultHalfWidth, 2, 60);
    const nearZ = numberParameter(ctx.parameters, 'nearZ', style.defaultNearZ, -100, 100);
    const farZ = numberParameter(ctx.parameters, 'farZ', style.defaultFarZ, -100, 100);
    const clearRadius = numberParameter(ctx.parameters, 'clearRadius', style.defaultClearRadius, 0, 30);
    const centerX = numberParameter(ctx.parameters, 'centerX', 0, -100, 100);
    const centerZ = numberParameter(ctx.parameters, 'centerZ', 0, -100, 100);
    const minScale = numberParameter(ctx.parameters, 'minScale', style.defaultMinScale, 0.1, 8);
    const maxScale = numberParameter(ctx.parameters, 'maxScale', style.defaultMaxScale, minScale, 8);
    const y = numberParameter(ctx.parameters, 'y', 0, -30, 30);
    const sideInner = Math.min(
      halfWidth,
      numberParameter(ctx.parameters, 'sideInnerX', style.sideFrameInnerX ?? halfWidth * 0.62, 0, halfWidth),
    );
    const zMin = Math.min(nearZ, farZ);
    const zMax = Math.max(nearZ, farZ);
    const clusterCount = Math.round(
      numberParameter(ctx.parameters, 'clusterCount', style.defaultClusterCount ?? 0, 0, 24),
    );
    const clusterRadius = numberParameter(
      ctx.parameters,
      'clusterRadius',
      style.defaultClusterRadius ?? Math.max(1, halfWidth * 0.18),
      0.25,
      Math.max(0.25, halfWidth),
    );
    const clusterCenters: Array<{ readonly x: number; readonly z: number }> = [];
    if (style.placement === 'field' && clusterCount > 0) {
      for (let clusterIndex = 0; clusterIndex < clusterCount; clusterIndex++) {
        let clusterX = centerX;
        let clusterZ = centerZ;
        for (let attempt = 0; attempt < 12; attempt++) {
          clusterX = centerX + rng.range(-halfWidth, halfWidth);
          clusterZ = centerZ + rng.range(zMin, zMax);
          if (Math.hypot(clusterX - centerX, clusterZ - centerZ) >= clearRadius + clusterRadius * 0.35) break;
        }
        clusterCenters.push({ x: clusterX, z: clusterZ });
      }
    }

    for (let index = 0; index < count; index++) {
      let x = centerX;
      let z = centerZ;
      if (style.placement === 'sideFrame') {
        const side = rng.next() < 0.5 ? -1 : 1;
        x = centerX + side * rng.range(sideInner, halfWidth);
        z = centerZ + rng.range(zMin, zMax);
      } else {
        // Fixed retry budget keeps generation deterministic while preserving a
        // clear central storytelling stage for characters/hero props.
        for (let attempt = 0; attempt < 12; attempt++) {
          let candidateX: number;
          let candidateZ: number;
          if (clusterCenters.length > 0) {
            const cluster = clusterCenters[Math.floor(rng.next() * clusterCenters.length)];
            const angle = rng.range(-Math.PI, Math.PI);
            const radius = Math.sqrt(rng.next()) * clusterRadius;
            candidateX = clamp(cluster.x + Math.cos(angle) * radius, centerX - halfWidth, centerX + halfWidth);
            candidateZ = clamp(cluster.z + Math.sin(angle) * radius, centerZ + zMin, centerZ + zMax);
          } else {
            candidateX = centerX + rng.range(-halfWidth, halfWidth);
            candidateZ = centerZ + rng.range(zMin, zMax);
          }
          x = candidateX;
          z = candidateZ;
          if (Math.hypot(candidateX - centerX, candidateZ - centerZ) >= clearRadius) break;
        }
        const distanceFromStage = Math.hypot(x - centerX, z - centerZ);
        if (clearRadius > 0 && distanceFromStage < clearRadius) {
          // Extremely constrained authoring ranges can exhaust the retry budget.
          // Project the point onto the clear-radius boundary rather than ever
          // placing dressing inside the hero staging area.
          const angle = distanceFromStage > 1e-6
            ? Math.atan2(z - centerZ, x - centerX)
            : rng.range(-Math.PI, Math.PI);
          x = centerX + Math.cos(angle) * clearRadius;
          z = centerZ + Math.sin(angle) * clearRadius;
        }
      }

      const variant = pickVariant(weighted, rng.next());
      const object = createScatterObject(variant, ctx);
      object.name ||= `${style.name}.${variant.id}.${index}`;
      const variantMin = variant.minScale ?? minScale;
      const variantMax = Math.max(variantMin, variant.maxScale ?? maxScale);
      const scale = rng.range(variantMin, variantMax);
      object.scale.multiplyScalar(scale);
      object.rotation.y += rng.range(-Math.PI, Math.PI);
      object.position.set(x, y + (variant.yOffset ?? 0) * scale, z);
      object.userData.mindforgeCompositionIndex = index;
      root.add(object);
    }

    return {
      object3d: root,
      update(): void {},
      dispose(): void {
        disposeObject3D(root);
        root.removeFromParent();
      },
    };
  };
}

export interface ReactiveLightingLayerStyle {
  readonly name: string;
  readonly flashBoost: number;
  readonly createLighting: () => THREE.Object3D;
}

/** Theme-owned lighting rig whose intensities react to PF4 environmentLight. */
export function createReactiveLightingLayerFactory(
  style: ReactiveLightingLayerStyle,
): SceneCompositionLayerFactory {
  return (ctx): SceneCompositionLayerInstance => {
    const root = new THREE.Group();
    root.name = `mindforge-composition:${style.name}:${ctx.id}`;
    const rig = style.createLighting();
    root.add(rig);
    const lights: { readonly light: THREE.Light; readonly intensity: number }[] = [];
    rig.traverse((object) => {
      if (object instanceof THREE.Light) lights.push({ light: object, intensity: object.intensity });
    });

    return {
      object3d: root,
      update(): void {
        const flash = ctx.services.effectInfluences.get('environmentLight');
        for (const entry of lights) {
          entry.light.intensity = entry.intensity * (1 + flash * style.flashBoost);
        }
      },
      dispose(): void {
        disposeObject3D(root);
        root.removeFromParent();
      },
    };
  };
}
