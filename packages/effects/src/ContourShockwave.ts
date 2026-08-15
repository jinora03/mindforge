import * as THREE from 'three';
import type { ActionContext, EffectFactory, EffectInstance } from '@mindforge/engine';
import { effectColor, readNumber } from './EffectTypes';

/**
 * A single contour ring that expands from a world-space point — heat release,
 * breakthrough, propagation. Supports size, colour, duration (the event
 * window), and intensity.
 */
export const createContourShockwave: EffectFactory = ({ event, services }): EffectInstance => {
  const center = services.resolveAnchor(event.target ?? event.from ?? origin());
  const size = readNumber(event, 'size', 2.4);
  const thickness = readNumber(event, 'thickness', 0.05);

  const material = new THREE.MeshBasicMaterial({
    color: effectColor(event, 'signalPink'),
    transparent: true,
    toneMapped: false,
  });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1, thickness, 10, 64), material);
  ring.rotation.x = Math.PI / 2;
  ring.visible = false;

  const worldPos = new THREE.Vector3();
  const intensity = event.intensity ?? 1;

  return {
    object3d: ring,
    update(ctx: ActionContext): void {
      ring.visible = ctx.active;
      if (!ctx.active) return;
      center.getWorldPosition(worldPos);
      ring.position.copy(worldPos);
      const radius = Math.max(0.001, ctx.progress * size);
      ring.scale.setScalar(radius);
      material.opacity = intensity * (1 - ctx.progress);
    },
    reset(): void {
      ring.visible = false;
    },
    dispose(): void {
      ring.geometry.dispose();
      material.dispose();
      ring.removeFromParent();
    },
  };
};

function origin(): never {
  throw new Error('effect.contour.shockwave requires a "target" or "from" anchor');
}
