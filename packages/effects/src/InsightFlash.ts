import * as THREE from 'three';
import type { ActionContext, EffectFactory, EffectInstance } from '@mindforge/engine';
import { effectColor, readNumber } from './EffectTypes';
import { composeEffectLayers, createEffectInfluenceLayer, type EffectLayer } from './LayeredEffect';

/**
 * A controlled white flash marking a key answer. Opacity is capped and brief so
 * it never washes out silhouettes (Motion Bible: reserve the insight flash for
 * the answer, not ordinary edits).
 */
export const createInsightFlash: EffectFactory = ({ event }): EffectInstance => {
  const maxOpacity = Math.min(0.55, readNumber(event, 'maxOpacity', 0.45)) * (event.intensity ?? 1);
  const material = new THREE.MeshBasicMaterial({
    color: effectColor(event, 'insight'),
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

  const envelope = (ctx: ActionContext): number => Math.sin(Math.PI * ctx.progress) ** 1.5;
  const visualLayer: EffectLayer = {
    object3d: shell,
    update(ctx): void {
      shell.visible = ctx.active;
      if (!ctx.active) return;
      material.opacity = maxOpacity * envelope(ctx);
    },
    reset(): void {
      shell.visible = false;
      material.opacity = 0;
    },
    dispose(): void {
      shell.geometry.dispose();
      material.dispose();
    },
  };

  const influenceScale = Math.max(0, event.intensity ?? 1);
  const responseLayer = createEffectInfluenceLayer(
    [
      { channel: 'screenExposure', strength: 0.22 * influenceScale },
      { channel: 'environmentLight', strength: 0.14 * influenceScale },
      { channel: 'emissiveBoost', strength: 0.08 * influenceScale },
    ],
    envelope,
  );

  return composeEffectLayers([visualLayer, responseLayer]);
};
