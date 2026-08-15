import * as THREE from 'three';
import type { ActionContext, CameraShot, CameraState } from '@mindforge/engine';
import { lerp } from './CameraTypes';

export interface CameraDirectorOptions {
  /** Optional entity/anchor the camera frames and (usually) orbits. */
  target?: THREE.Object3D;
  /** Position offset at progress 0 and 1 (relative to the pivot). */
  startOffset: THREE.Vector3;
  endOffset: THREE.Vector3;
  startFov: number;
  endFov: number;
  /** Added to the look-at point (framing composition). */
  framingOffset?: THREE.Vector3;
  /** Look-at point used when there is no target. */
  lookPoint?: THREE.Vector3;
  /** When true, offsets are world-absolute (pivot = origin). */
  absolute?: boolean;
  /** Shake amplitude in metres (0 = none). */
  shake?: number;
  /** When true, shake decays over the window (impact). */
  shakeDecays?: boolean;
}

/**
 * The reusable shot engine every camera preset is built from. It resolves the
 * pivot (a moving target or the origin), interpolates a start→end offset by the
 * already-eased progress, frames a look-at point, and adds deterministic shake
 * derived from time. Presets are thin configurations over this class.
 *
 * Camera application to the authoritative camera is the Engine's job; this
 * class only *computes* a {@link CameraState}, so it stays free of renderer
 * state and content meaning (the Observer's curiosity lives in the presets).
 */
export class CameraDirector implements CameraShot {
  private readonly framing: THREE.Vector3;
  private readonly lookPoint: THREE.Vector3;
  private readonly pivot = new THREE.Vector3();
  private readonly look = new THREE.Vector3();

  constructor(private readonly options: CameraDirectorOptions) {
    this.framing = options.framingOffset ?? new THREE.Vector3();
    this.lookPoint = options.lookPoint ?? new THREE.Vector3();
  }

  evaluate(ctx: ActionContext, out: CameraState): void {
    const { options } = this;
    const t = ctx.progress;

    if (!options.absolute && options.target) {
      options.target.getWorldPosition(this.pivot);
    } else {
      this.pivot.set(0, 0, 0);
    }

    out.position.set(
      this.pivot.x + lerp(options.startOffset.x, options.endOffset.x, t),
      this.pivot.y + lerp(options.startOffset.y, options.endOffset.y, t),
      this.pivot.z + lerp(options.startOffset.z, options.endOffset.z, t),
    );

    if (options.target) {
      options.target.getWorldPosition(this.look);
    } else {
      this.look.copy(this.lookPoint);
    }
    out.target.copy(this.look).add(this.framing);

    out.fov = lerp(options.startFov, options.endFov, t);

    if (options.shake && options.shake > 0) {
      const decay = options.shakeDecays ? 1 - t : 1;
      const amp = options.shake * decay;
      const time = ctx.time;
      out.position.x += Math.sin(time * 37.1) * amp;
      out.position.y += Math.sin(time * 41.7 + 1.3) * amp;
      out.target.x += Math.sin(time * 33.3 + 0.7) * amp * 0.5;
    }
  }
}
