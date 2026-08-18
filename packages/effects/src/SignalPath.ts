import * as THREE from 'three';
import type { ActionContext, EffectFactory, EffectInstance } from '@mindforge/engine';
import { createSignalLight } from '@mindforge/style';
import { effectColor, readNumber, spanCylinder } from './EffectTypes';

/**
 * A luminous connection between two world-space anchors. It re-spans every
 * frame, so it tracks anchors as they move (Design Bible: thread/beam =
 * information flow, causality, relationship).
 */
export const createSignalPath: EffectFactory = ({ event, services }): EffectInstance => {
  const from = services.resolveAnchor(event.from ?? throwMissing('from'));
  const to = services.resolveAnchor(event.to ?? throwMissing('to'));
  const thickness = readNumber(event, 'thickness', 0.02);
  const material = createSignalLight({});
  material.color = effectColor(event, 'information');

  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(thickness, thickness, 1, 8), material);
  mesh.visible = false;

  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const intensity = event.intensity ?? 1;

  return {
    object3d: mesh,
    update(ctx: ActionContext): void {
      mesh.visible = ctx.active;
      if (!ctx.active) return;
      from.getWorldPosition(a);
      to.getWorldPosition(b);
      spanCylinder(mesh, a, b);
      // Fade in and out at the window edges so the beam never pops.
      const envelope = Math.sin(Math.PI * ctx.progress);
      material.opacity = intensity * (0.35 + 0.65 * envelope);
    },
    reset(): void {
      mesh.visible = false;
    },
    dispose(): void {
      mesh.geometry.dispose();
      material.dispose();
      mesh.removeFromParent();
    },
  };
};

function throwMissing(field: string): never {
  throw new Error(`effect.signal.path requires "${field}" anchor`);
}
