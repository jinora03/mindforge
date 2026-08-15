import * as THREE from 'three';
import { PALETTE } from '@mindforge/style';
import type { ActionContext, EffectFactory, EffectInstance } from '@mindforge/engine';
import { readNumber } from './EffectTypes';

/**
 * A controlled white flash marking a key answer. Opacity is capped and brief so
 * it never washes out silhouettes (Motion Bible: reserve the insight flash for
 * the answer, not ordinary edits).
 */
export const createInsightFlash: EffectFactory = ({ event }): EffectInstance => {
  const maxOpacity = Math.min(0.55, readNumber(event, 'maxOpacity', 0.45)) * (event.intensity ?? 1);
  const material = new THREE.MeshBasicMaterial({
    color: new THREE.Color(event.color ?? PALETTE.insightWhite),
    side: THREE.BackSide,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    depthTest: false,
    toneMapped: false,
  });
  // A large enclosing shell; the camera sits inside so the flash fills frame.
  const shell = new THREE.Mesh(new THREE.SphereGeometry(40, 16, 12), material);
  shell.visible = false;

  return {
    object3d: shell,
    update(ctx: ActionContext): void {
      shell.visible = ctx.active;
      if (!ctx.active) return;
      // Quick rise, gentle fall.
      const envelope = Math.sin(Math.PI * ctx.progress) ** 1.5;
      material.opacity = maxOpacity * envelope;
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
