import type * as THREE from 'three';
import type { Disposable } from './EngineTypes';

interface MaybeDisposable {
  dispose?: () => void;
}

/** Dispose every geometry / material / texture reachable from an object tree. */
export function disposeObject3D(root: THREE.Object3D): void {
  root.traverse((node) => {
    const mesh = node as Partial<THREE.Mesh> & THREE.Object3D;
    if (mesh.geometry) {
      (mesh.geometry as THREE.BufferGeometry).dispose();
    }
    if (mesh.material) {
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const material of materials) {
        disposeMaterial(material as THREE.Material);
      }
    }
  });
}

function disposeMaterial(material: THREE.Material): void {
  for (const value of Object.values(material)) {
    if (value && (value as THREE.Texture).isTexture) {
      (value as THREE.Texture).dispose();
    }
  }
  material.dispose();
}

/**
 * Tracks disposables created for the current episode so the Engine can release
 * everything on unload. Shared / cached style resources register their own
 * lifetime and are intentionally *not* tracked here.
 */
export class DisposalManager {
  private readonly disposables = new Set<Disposable>();

  add<T extends Disposable>(disposable: T): T {
    this.disposables.add(disposable);
    return disposable;
  }

  /** Track an arbitrary object that merely exposes an optional dispose(). */
  addRaw(disposable: MaybeDisposable): void {
    if (typeof disposable.dispose === 'function') {
      this.disposables.add(disposable as Disposable);
    }
  }

  disposeAll(): void {
    for (const disposable of this.disposables) {
      try {
        disposable.dispose();
      } catch {
        // Disposal must never throw; a leaked resource is preferable to a crash.
      }
    }
    this.disposables.clear();
  }
}
