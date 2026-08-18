import * as THREE from 'three';
import type { ActionContext, EffectFactory, EffectInstance } from '@mindforge/engine';
import { effectColor, legacyToneColor, readNumber } from './EffectTypes';

/**
 * A semantic reaction/heat burst radiating from a point. Low intensity reads as a
 * playful sensation; high intensity as a strong surprise. Point count is kept
 * modest so the burst stays readable at phone size.
 */
export const createReactionBurst: EffectFactory = ({ event, services }): EffectInstance => {
  const center = services.resolveAnchor(event.target ?? event.from ?? origin());
  const intensity = event.intensity ?? 1;
  const count = Math.round(readNumber(event, 'count', 40));
  const radius = readNumber(event, 'radius', 1.4) * (0.6 + 0.4 * intensity);

  const directions: THREE.Vector3[] = [];
  for (let i = 0; i < count; i++) {
    // Deterministic Fibonacci-sphere directions (no RNG → seek-safe).
    const y = 1 - (i / (count - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = i * 2.399963229728653;
    directions.push(new THREE.Vector3(Math.cos(theta) * r, y, Math.sin(theta) * r));
  }

  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    size: readNumber(event, 'size', 0.06),
    color: effectColor(event, 'reaction'),
    transparent: true,
    toneMapped: false,
    depthWrite: false,
  });
  const points = new THREE.Points(geometry, material);
  points.visible = false;

  const start = effectColor(event, 'reaction');
  const end = legacyToneColor('insight');
  const worldPos = new THREE.Vector3();

  return {
    object3d: points,
    update(ctx: ActionContext): void {
      points.visible = ctx.active;
      if (!ctx.active) return;
      center.getWorldPosition(worldPos);
      points.position.copy(worldPos);
      const reach = ctx.progress * radius;
      for (let i = 0; i < count; i++) {
        positions[i * 3] = directions[i].x * reach;
        positions[i * 3 + 1] = directions[i].y * reach;
        positions[i * 3 + 2] = directions[i].z * reach;
      }
      geometry.attributes.position.needsUpdate = true;
      material.color.copy(start).lerp(end, ctx.progress);
      material.opacity = intensity * (1 - ctx.progress);
    },
    reset(): void {
      points.visible = false;
    },
    dispose(): void {
      geometry.dispose();
      material.dispose();
      points.removeFromParent();
    },
  };
};

function origin(): never {
  throw new Error('effect.reaction.burst requires a "target" or "from" anchor');
}
