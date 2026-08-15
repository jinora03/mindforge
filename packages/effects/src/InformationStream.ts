import * as THREE from 'three';
import type { ActionContext, EffectFactory, EffectInstance } from '@mindforge/engine';
import { createSignalLight } from '@mindforge/style';
import { effectColor, readNumber, resolveAnchorPath, samplePath } from './EffectTypes';

/**
 * A stream of instanced tiles flowing along an anchor path — information /
 * causality following a route (Motion Bible verb: route). Uses InstancedMesh
 * for performance; density and speed are configurable.
 */
export const createInformationStream: EffectFactory = ({ event, services }): EffectInstance => {
  const anchors = resolveAnchorPath(event, services);
  if (anchors.length < 2) {
    throw new Error('effect.informationStream requires at least two anchors (from/to or through)');
  }
  const density = Math.max(1, Math.round(readNumber(event, 'density', 24)));
  const speed = readNumber(event, 'speed', 0.3);
  const tile = readNumber(event, 'size', 0.06);

  const material = createSignalLight({});
  material.color = effectColor(event, 'signalPink');
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(tile, tile, tile), material, density);
  mesh.visible = false;

  const points: THREE.Vector3[] = anchors.map(() => new THREE.Vector3());
  const position = new THREE.Vector3();
  const matrix = new THREE.Matrix4();
  const intensity = event.intensity ?? 1;

  return {
    object3d: mesh,
    update(ctx: ActionContext): void {
      mesh.visible = ctx.active;
      if (!ctx.active) return;
      anchors.forEach((anchor, i) => anchor.getWorldPosition(points[i]));
      for (let i = 0; i < density; i++) {
        const phase = (i / density + ctx.localTime * speed) % 1;
        samplePath(points, phase, position);
        matrix.makeTranslation(position.x, position.y, position.z);
        mesh.setMatrixAt(i, matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
      material.opacity = intensity * (0.5 + 0.5 * Math.sin(Math.PI * ctx.progress));
    },
    reset(): void {
      mesh.visible = false;
    },
    dispose(): void {
      mesh.geometry.dispose();
      material.dispose();
      mesh.dispose();
      mesh.removeFromParent();
    },
  };
};
