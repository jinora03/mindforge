import * as THREE from 'three';
import type {
  ActionContext,
  EffectInfluenceChannel,
  EffectInfluenceSink,
  EffectInstance,
} from '@mindforge/engine';

/** One composable part of a production effect recipe. */
export interface EffectLayer {
  readonly object3d?: THREE.Object3D;
  update?(ctx: ActionContext): void;
  contributeInfluence?(ctx: ActionContext, sink: EffectInfluenceSink): void;
  reset?(): void;
  dispose?(): void;
}

/**
 * Combine geometry, lighting-response, camera-response, and other effect parts
 * behind the normal Engine EffectInstance contract. Layers are evaluated in
 * declaration order and disposed in reverse order.
 */
export function composeEffectLayers(layers: readonly EffectLayer[]): EffectInstance {
  const root = new THREE.Group();
  root.name = 'mindforge-layered-effect';
  root.visible = false;
  for (const layer of layers) {
    if (layer.object3d) root.add(layer.object3d);
  }

  return {
    object3d: root,
    update(ctx): void {
      root.visible = ctx.active;
      for (const layer of layers) layer.update?.(ctx);
    },
    contributeInfluence(ctx, sink): void {
      for (const layer of layers) layer.contributeInfluence?.(ctx, sink);
    },
    reset(): void {
      root.visible = false;
      for (const layer of layers) layer.reset?.();
    },
    dispose(): void {
      for (let index = layers.length - 1; index >= 0; index--) layers[index].dispose?.();
      root.removeFromParent();
      root.clear();
    },
  };
}

export interface EffectInfluenceSpec {
  readonly channel: EffectInfluenceChannel;
  /** Normalized peak magnitude before the envelope is applied. */
  readonly strength: number;
}

export type EffectInfluenceEnvelope = (ctx: ActionContext) => number;

/** Create a non-visual recipe layer that publishes normalized PF4 influences. */
export function createEffectInfluenceLayer(
  specs: readonly EffectInfluenceSpec[],
  envelope: EffectInfluenceEnvelope = (ctx) => (ctx.active ? 1 : 0),
): EffectLayer {
  return {
    contributeInfluence(ctx, sink): void {
      if (!ctx.active) return;
      const weight = Math.max(0, Math.min(1, envelope(ctx)));
      if (weight <= 0) return;
      for (const spec of specs) sink.contribute(spec.channel, spec.strength * weight);
    },
  };
}
