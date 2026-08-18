import * as THREE from 'three';
import type { ActionContext, EffectFactory, EffectInstance } from '@mindforge/engine';
import { createSignalLight } from '@mindforge/style';
import { effectColor, resolveAnchorPath, samplePath } from './EffectTypes';

const TRAIL = 6;

/**
 * A glowing node that travels through a list of character anchors (head →
 * hand by default) leaving a short trail. Prediction-toned by default: this is the
 * brain's predictive signal reaching the limb before it moves.
 */
export const createPredictionSignal: EffectFactory = ({ event, services }): EffectInstance => {
  const anchors = resolveAnchorPath(event, services);
  const color = effectColor(event, 'prediction');
  const group = new THREE.Group();
  group.visible = false;

  const nodeMaterial = createSignalLight({});
  nodeMaterial.color = color;
  const node = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 8), nodeMaterial);
  group.add(node);

  const trailMaterials: THREE.MeshBasicMaterial[] = [];
  const trail: THREE.Mesh[] = [];
  const trailGeometry = new THREE.SphereGeometry(0.022, 8, 6);
  for (let i = 0; i < TRAIL; i++) {
    const material = createSignalLight({});
    material.color = color;
    const dot = new THREE.Mesh(trailGeometry, material);
    trailMaterials.push(material);
    trail.push(dot);
    group.add(dot);
  }

  const points: THREE.Vector3[] = anchors.map(() => new THREE.Vector3());
  const scratch = new THREE.Vector3();
  const intensity = event.intensity ?? 1;

  return {
    object3d: group,
    update(ctx: ActionContext): void {
      group.visible = ctx.active;
      if (!ctx.active) return;
      anchors.forEach((anchor, i) => anchor.getWorldPosition(points[i]));
      samplePath(points, ctx.progress, scratch);
      node.position.copy(scratch);
      nodeMaterial.opacity = intensity;
      for (let i = 0; i < TRAIL; i++) {
        const t = ctx.progress - (i + 1) * 0.06;
        samplePath(points, t, trail[i].position);
        trailMaterials[i].opacity = Math.max(0, intensity * (1 - (i + 1) / (TRAIL + 1)));
        trail[i].visible = t >= 0;
      }
    },
    reset(): void {
      group.visible = false;
    },
    dispose(): void {
      node.geometry.dispose();
      nodeMaterial.dispose();
      trailGeometry.dispose();
      for (const material of trailMaterials) material.dispose();
      group.removeFromParent();
    },
  };
};
