import * as THREE from 'three';
import {
  SceneManager,
  loadEpisode,
  captureSnapshot,
  type BuiltScene,
  type CameraState,
  type CapabilityRegistries,
  type FrameContext,
  type SceneSnapshot,
} from '@mindforge/engine';

/**
 * A renderer-free oracle that reproduces `MindForgeEngine.evaluateSceneFrame`
 * exactly, so we can characterize the *current* evaluation behavior headlessly
 * and later assert the extracted SceneRuntime matches it byte-for-byte.
 */
export interface Oracle {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  built: BuiltScene;
  duration: number;
}

export function buildOracle(raw: unknown, registries: CapabilityRegistries): Oracle {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 9 / 16, 0.1, 200);
  camera.position.set(0, 1.4, 7);
  const loaded = loadEpisode(raw, registries);
  const built = new SceneManager().build(loaded, registries, scene, camera);
  return { scene, camera, built, duration: loaded.script.duration };
}

const scratch: CameraState = {
  position: new THREE.Vector3(),
  target: new THREE.Vector3(),
  fov: 38,
};

/** Reproduces the exact current two-phase evaluation sequence. */
export function evaluateOracleAt(o: Oracle, time: number): void {
  const d = o.duration;
  const frame: FrameContext = {
    time,
    delta: 0,
    duration: d,
    normalizedTime: d > 0 ? Math.min(Math.max(time / d, 0), 1) : 0,
  };
  o.built.entities.beginFrame(frame);
  o.built.timeline.evaluatePose(frame);
  o.scene.updateMatrixWorld(true);
  o.built.environment.update(frame);
  o.built.compositionLayers.update(frame);
  o.built.timeline.evaluateEffects(frame, { text: true, camera: true, effects: true });
  o.built.entities.endFrame(frame);
  o.built.timeline.evaluateCameraState(frame, true, o.built.environment.defaultCamera, scratch);
  applyCameraState(o.camera, scratch);
}

export function snapshotOracleAt(o: Oracle, time: number): SceneSnapshot {
  evaluateOracleAt(o, time);
  o.scene.updateMatrixWorld(true);
  o.camera.updateMatrixWorld(true);
  return captureSnapshot({
    time,
    entities: o.built.entities.all(),
    camera: o.camera,
    activeText: o.built.timeline.getActiveTexts(),
    effects: o.built.timeline.getEffectStates(),
  });
}

function applyCameraState(camera: THREE.PerspectiveCamera, state: CameraState): void {
  camera.position.copy(state.position);
  camera.up.set(0, 1, 0);
  camera.lookAt(state.target);
  if (Math.abs(camera.fov - state.fov) > 1e-4) {
    camera.fov = state.fov;
    camera.updateProjectionMatrix();
  }
}
