import * as THREE from 'three';
import type { ActionContext, EffectFactory, EffectInstance } from '@mindforge/engine';
import { createContourEnergy } from '@mindforge/style';
import { effectColor, readNumber } from './EffectTypes';

/**
 * A translucent predicted limb that leads the real movement and fades *before*
 * contact — the visual of the brain's forward model. When a `from` anchor is
 * given it *travels* from `from` to `to`, arriving `lead` early (the prediction
 * outrunning the limb); otherwise it hovers at the destination. `shape: "hand"`
 * renders a faceted hand cluster instead of a generic limb block.
 *
 * Deterministic: position and opacity are pure functions of window progress.
 */
export const createGhostMovement: EffectFactory = ({ event, services }): EffectInstance => {
  const destination = services.resolveAnchor(event.to ?? event.target ?? missing());
  const origin = event.from ? services.resolveAnchor(event.from) : undefined;
  const lead = clamp(readNumber(event, 'lead', 0.3), 0, 0.6);
  const size = readNumber(event, 'size', 0.13);
  const shape = event.parameters?.shape === 'hand' ? 'hand' : 'limb';

  const material = createContourEnergy({});
  material.color = effectColor(event, 'prediction');
  material.opacity = 0;

  const root = shape === 'hand' ? buildGhostHand(size, material) : buildGhostLimb(size, material);
  root.visible = false;

  const toPos = new THREE.Vector3();
  const fromPos = new THREE.Vector3();
  const intensity = event.intensity ?? 1;

  return {
    object3d: root,
    update(ctx: ActionContext): void {
      root.visible = ctx.active;
      if (!ctx.active) return;

      destination.getWorldPosition(toPos);
      if (origin) {
        origin.getWorldPosition(fromPos);
        // The prediction outruns the limb: reach `to` early (by `lead`), then
        // linger there so the ghost is clearly *ahead* of the real hand.
        const leadT = clamp(ctx.progress / (1 - lead), 0, 1);
        root.position.copy(fromPos).lerp(toPos, ease(leadT));
      } else {
        root.position.copy(toPos);
      }
      root.lookAt(toPos);

      // Rise in quickly, hold, then dissolve over the last of the window so the
      // ghost has already faded as the real hand lands.
      const rise = Math.min(1, ctx.progress / 0.2);
      const fall = ctx.progress < 0.7 ? 1 : Math.max(0, 1 - (ctx.progress - 0.7) / 0.3);
      material.opacity = intensity * 0.55 * rise * fall;
    },
    reset(): void {
      root.visible = false;
      material.opacity = 0;
    },
    dispose(): void {
      root.traverse((node) => {
        const mesh = node as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
      });
      material.dispose();
      root.removeFromParent();
    },
  };
};

/** A faceted hand: palm + three splayed fingers + a thumb, fingers along +Z. */
function buildGhostHand(size: number, material: THREE.Material): THREE.Group {
  const group = new THREE.Group();
  const s = size / 0.13;
  const palm = new THREE.Mesh(new THREE.BoxGeometry(0.11 * s, 0.12 * s, 0.04 * s), material);
  group.add(palm);
  const fingerGeom = new THREE.BoxGeometry(0.022 * s, 0.02 * s, 0.09 * s);
  for (let i = 0; i < 3; i++) {
    const finger = new THREE.Mesh(fingerGeom, material);
    finger.position.set((i - 1) * 0.035 * s, 0.03 * s, 0.075 * s);
    finger.rotation.x = -0.25;
    group.add(finger);
  }
  const thumb = new THREE.Mesh(new THREE.BoxGeometry(0.02 * s, 0.02 * s, 0.06 * s), material);
  thumb.position.set(-0.06 * s, -0.02 * s, 0.05 * s);
  thumb.rotation.set(0, 0.5, 0);
  group.add(thumb);
  return group;
}

function buildGhostLimb(size: number, material: THREE.Material): THREE.Group {
  const group = new THREE.Group();
  group.add(new THREE.Mesh(new THREE.BoxGeometry(size, size * 1.8, size), material));
  return group;
}

const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);
const ease = (t: number): number => t * (2 - t); // easeOut so it darts ahead early

function missing(): never {
  throw new Error('effect.ghostMovement requires a "to" or "target" anchor');
}
