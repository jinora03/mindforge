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
  /**
   * Keep the full visual bounds of a target inside the camera frame. This is
   * especially important for portrait output, where horizontal FOV is narrow.
   */
  fitTarget?: boolean;
  /** Extra breathing room around automatically fitted target bounds. */
  fitPadding?: number;
  /** Hard lower bound on camera-to-look distance, even for tiny/empty anchors. */
  minDistance?: number;
  /** Live camera reference used to read the current preview/export aspect. */
  camera?: THREE.PerspectiveCamera;
}

/**
 * The reusable shot engine every camera preset is built from. It resolves the
 * pivot (a moving target or the origin), interpolates a start→end offset by the
 * already-eased progress, frames a look-at point, and adds deterministic shake
 * derived from time. Presets are thin configurations over this class.
 *
 * Production framing is bounds-aware: when a preset opts into `fitTarget`, a
 * tall or wide target is never allowed to spill out of a narrow 9:16 frame just
 * because its origin happens to sit near the bottom or centre. This remains
 * generic camera grammar — no episode/theme knowledge is involved.
 */
export class CameraDirector implements CameraShot {
  private readonly framing: THREE.Vector3;
  private readonly lookPoint: THREE.Vector3;
  private readonly pivot = new THREE.Vector3();
  private readonly look = new THREE.Vector3();
  private readonly bounds = new THREE.Box3();
  private readonly boundsSize = new THREE.Vector3();
  private readonly away = new THREE.Vector3();

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

    let hasBounds = false;
    if (options.target) {
      if (options.fitTarget) {
        this.bounds.setFromObject(options.target);
        if (!this.bounds.isEmpty()) {
          this.bounds.getCenter(this.look);
          this.bounds.getSize(this.boundsSize);
          hasBounds = true;
        }
      }
      if (!hasBounds) options.target.getWorldPosition(this.look);
    } else {
      this.look.copy(this.lookPoint);
    }
    out.target.copy(this.look).add(this.framing);

    out.fov = lerp(options.startFov, options.endFov, t);
    this.enforceReadableDistance(out, hasBounds);

    if (options.shake && options.shake > 0) {
      const decay = options.shakeDecays ? 1 - t : 1;
      const amp = options.shake * decay;
      const time = ctx.time;
      out.position.x += Math.sin(time * 37.1) * amp;
      out.position.y += Math.sin(time * 41.7 + 1.3) * amp;
      out.target.x += Math.sin(time * 33.3 + 0.7) * amp * 0.5;
    }
  }

  private enforceReadableDistance(out: CameraState, hasBounds: boolean): void {
    const { options } = this;
    let required = Math.max(0, options.minDistance ?? 0);

    if (hasBounds && options.fitTarget) {
      const aspect = Math.max(0.2, options.camera?.aspect ?? 9 / 16);
      const verticalFov = THREE.MathUtils.degToRad(Math.max(1, out.fov));
      const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * aspect);
      const halfHeight = this.boundsSize.y * 0.5;
      const halfWidth = this.boundsSize.x * 0.5;
      const halfDepth = this.boundsSize.z * 0.5;
      const verticalFit = halfHeight / Math.max(0.001, Math.tan(verticalFov / 2));
      const horizontalFit = halfWidth / Math.max(0.001, Math.tan(horizontalFov / 2));
      const padding = Math.max(1, options.fitPadding ?? 1.15);
      required = Math.max(required, (Math.max(verticalFit, horizontalFit) + halfDepth * 0.35) * padding);
    }

    if (required <= 0) return;

    this.away.copy(out.position).sub(out.target);
    const current = this.away.length();
    if (current >= required) return;
    if (current < 1e-5) this.away.set(0, 0, 1);
    else this.away.multiplyScalar(1 / current);
    out.position.copy(out.target).addScaledVector(this.away, required);
  }
}
