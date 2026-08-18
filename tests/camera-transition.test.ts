import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import type { ActionContext, CameraShot, CameraState, FrameContext } from '@mindforge/engine';
import { Timeline } from '@mindforge/engine';

class FixedCameraShot implements CameraShot {
  constructor(
    private readonly position: THREE.Vector3,
    private readonly target: THREE.Vector3,
    private readonly fov: number,
  ) {}

  evaluate(_ctx: ActionContext, out: CameraState): void {
    out.position.copy(this.position);
    out.target.copy(this.target);
    out.fov = this.fov;
  }
}

function frame(time: number): FrameContext {
  return { time, delta: 0, duration: 3, normalizedTime: time / 3 };
}

function state(position: [number, number, number], target: [number, number, number], fov: number): CameraState {
  return {
    position: new THREE.Vector3(...position),
    target: new THREE.Vector3(...target),
    fov,
  };
}

describe('production camera transitions', () => {
  it('blends deterministically from the previous shot without depending on playback history', () => {
    const timeline = new Timeline();
    timeline.addCamera({
      at: 0,
      duration: 1,
      easing: 'linear',
      shot: new FixedCameraShot(new THREE.Vector3(0, 2, 8), new THREE.Vector3(0, 1, 0), 44),
    });
    timeline.addCamera({
      at: 1,
      duration: 1,
      easing: 'linear',
      blendDuration: 0.5,
      shot: new FixedCameraShot(new THREE.Vector3(10, 4, 12), new THREE.Vector3(2, 2, 0), 50),
    });

    const defaultCamera = state([0, 0, 10], [0, 0, 0], 48);
    const out = state([0, 0, 0], [0, 0, 0], 0);

    timeline.evaluateCameraState(frame(1.25), true, defaultCamera, out);
    expect(out.position.x).toBeCloseTo(5);
    expect(out.position.y).toBeCloseTo(3);
    expect(out.position.z).toBeCloseTo(10);

    expect(out.target.x).toBeCloseTo(1);
    expect(out.target.y).toBeCloseTo(1.5);
    expect(out.target.z).toBeCloseTo(0);

    expect(out.fov).toBeCloseTo(47);

    const firstSeek = [...out.position.toArray(), ...out.target.toArray(), out.fov];
    timeline.evaluateCameraState(frame(2.7), true, defaultCamera, out);
    timeline.evaluateCameraState(frame(1.25), true, defaultCamera, out);
    expect([...out.position.toArray(), ...out.target.toArray(), out.fov]).toEqual(firstSeek);
  });

  it('preserves hard-cut behavior when a camera event does not request a blend', () => {
    const timeline = new Timeline();
    timeline.addCamera({
      at: 0,
      duration: 1,
      easing: 'linear',
      shot: new FixedCameraShot(new THREE.Vector3(0, 0, 8), new THREE.Vector3(), 44),
    });
    timeline.addCamera({
      at: 1,
      duration: 1,
      easing: 'linear',
      shot: new FixedCameraShot(new THREE.Vector3(9, 0, 8), new THREE.Vector3(), 50),
    });

    const out = state([0, 0, 0], [0, 0, 0], 0);
    timeline.evaluateCameraState(frame(1), true, state([0, 0, 10], [0, 0, 0], 48), out);
    expect(out.position.x).toBe(9);
    expect(out.fov).toBe(50);
  });
});
