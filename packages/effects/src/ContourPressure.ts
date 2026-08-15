import * as THREE from 'three';
import type { ActionContext, EffectFactory, EffectInstance } from '@mindforge/engine';

import { effectColor, legacyToneColor, readNumber } from './EffectTypes';

const RING_COUNT = 6;

/**
 * Contour rings that surround an object and communicate pressure. As pressure
 * rises the rings compress inward and their colour shifts from baseline → active theme tone; in the
 * final release they expand and rupture outward, then fade. This is a truth
 * layer, not decoration (Design Bible §5, Motion Bible §5).
 */
export const createContourPressure: EffectFactory = ({ event, services }): EffectInstance => {
  const center = services.resolveAnchor(event.target ?? event.from ?? origin());
  const scale = readNumber(event, 'scale', 1);
  const releaseAt = readNumber(event, 'releaseAt', 0.78);

  const group = new THREE.Group();
  group.visible = false;

  const base = legacyToneColor(event.tone === 'heat' ? 'information' : 'prediction');
  const active = effectColor(event, event.tone ?? 'suppression');
  const rings: THREE.Mesh[] = [];
  const materials: THREE.MeshBasicMaterial[] = [];

  for (let i = 0; i < RING_COUNT; i++) {
    const radius = (0.5 + i * 0.22) * scale;
    const material = new THREE.MeshBasicMaterial({ transparent: true, toneMapped: false });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.012 * scale, 8, 48), material);
    ring.rotation.x = Math.PI / 2;
    materials.push(material);
    rings.push(ring);
    group.add(ring);
  }

  const worldPos = new THREE.Vector3();
  const intensity = event.intensity ?? 1;

  return {
    object3d: group,
    update(ctx: ActionContext): void {
      group.visible = ctx.active;
      if (!ctx.active) return;
      center.getWorldPosition(worldPos);
      group.position.copy(worldPos);

      const pressure = Math.min(1, ctx.progress / releaseAt);
      const releasing = ctx.progress > releaseAt;
      const release = releasing ? (ctx.progress - releaseAt) / (1 - releaseAt) : 0;

      for (let i = 0; i < RING_COUNT; i++) {
        // Compress inward with pressure, then expand outward on release.
        const factor = releasing ? 1 + release * 1.4 : 1 - pressure * 0.35;
        rings[i].scale.setScalar(factor);
        materials[i].color.copy(base).lerp(active, pressure);
        materials[i].opacity = intensity * (releasing ? 0.6 * (1 - release) : 0.35 + 0.45 * pressure);
      }
    },
    reset(): void {
      group.visible = false;
    },
    dispose(): void {
      for (const ring of rings) ring.geometry.dispose();
      for (const material of materials) material.dispose();
      group.removeFromParent();
    },
  };
};

function origin(): never {
  throw new Error('effect.contour.pressure requires a "target" or "from" anchor');
}
