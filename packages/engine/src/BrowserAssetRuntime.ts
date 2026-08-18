import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';
import type {
  AssetDescriptor,
  RuntimeAssetManager,
  RuntimeModelAsset,
} from './EngineTypes';
import { disposeObject3D } from './DisposalManager';
import { isExternalModelAsset } from './RuntimeAssets';
import {
  applyModelAssetProfile,
  resolveSemanticModelClips,
  validateRuntimeModelContract,
} from './ModelAssetContract';

/** Loader seam kept public so asset-runtime tests do not require network I/O. */
export interface ModelSourceLoader {
  load(url: string): Promise<ModelSource>;
}

export interface ModelSource {
  readonly scene: THREE.Object3D;
  readonly animations: readonly THREE.AnimationClip[];
}

export interface BrowserAssetRuntimeOptions {
  /** Optional application base used for relative asset URLs. */
  readonly baseUrl?: string;
  readonly loader?: ModelSourceLoader;
}

interface LoadedModel {
  readonly descriptor: AssetDescriptor & { readonly kind: 'model'; readonly url: string };
  readonly source: ModelSource;
}

class GltfSourceLoader implements ModelSourceLoader {
  private readonly loader = new GLTFLoader();

  async load(url: string): Promise<ModelSource> {
    const gltf = await this.loader.loadAsync(url);
    return { scene: gltf.scene, animations: gltf.animations };
  }
}

/**
 * Browser GLB/GLTF cache for production assets.
 *
 * Sources are loaded once, then every scene receives a detached clone with its
 * own disposable geometry/material/texture GPU resources. That deliberately
 * trades a little memory for simple, deterministic scene ownership: disposing
 * one episode can never invalidate a cached source or another model instance.
 */
export class BrowserAssetRuntime implements RuntimeAssetManager {
  private readonly loader: ModelSourceLoader;
  private readonly baseUrl?: string;
  private readonly loaded = new Map<string, LoadedModel>();
  private readonly pending = new Map<
    string,
    { readonly url: string; readonly promise: Promise<void> }
  >();

  constructor(options: BrowserAssetRuntimeOptions = {}) {
    this.loader = options.loader ?? new GltfSourceLoader();
    this.baseUrl = options.baseUrl;
  }

  async preload(descriptors: readonly AssetDescriptor[]): Promise<void> {
    const jobs: Promise<void>[] = [];
    for (const descriptor of descriptors) {
      if (!isExternalModelAsset(descriptor)) continue;
      jobs.push(this.preloadModel(descriptor));
    }
    await Promise.all(jobs);
  }

  has(id: string): boolean {
    return this.loaded.has(id);
  }

  instantiateModel(id: string): RuntimeModelAsset {
    const loaded = this.loaded.get(id);
    if (!loaded) {
      throw new Error(
        `Model asset "${id}" is not preloaded. Call assetRuntime.preload(...) or engine.prepareAssets() before loading the episode.`,
      );
    }

    const object3d = cloneOwnedObject3D(loaded.source.scene);
    applyModelAssetProfile(object3d, loaded.descriptor.model);
    const anchors = resolveAnchors(object3d, loaded.descriptor);
    const animations = loaded.source.animations.map((clip) => clip.clone());
    const clips = resolveSemanticModelClips(loaded.descriptor, animations);
    const characterJoints = resolveCharacterJoints(object3d, loaded.descriptor);
    return { object3d, anchors, animations, clips, characterJoints };
  }

  dispose(): void {
    for (const model of this.loaded.values()) {
      disposeObject3D(model.source.scene);
      model.source.scene.removeFromParent();
    }
    this.loaded.clear();
    this.pending.clear();
  }

  private preloadModel(
    descriptor: AssetDescriptor & { readonly kind: 'model'; readonly url: string },
  ): Promise<void> {
    const existing = this.loaded.get(descriptor.id);
    if (existing) {
      if (existing.descriptor.url !== descriptor.url) {
        throw new Error(
          `Asset "${descriptor.id}" was already loaded from "${existing.descriptor.url}" and cannot be rebound to "${descriptor.url}".`,
        );
      }
      return Promise.resolve();
    }

    const inflight = this.pending.get(descriptor.id);
    if (inflight) {
      if (inflight.url !== descriptor.url) {
        throw new Error(
          `Asset "${descriptor.id}" is already preloading from "${inflight.url}" and cannot be rebound to "${descriptor.url}".`,
        );
      }
      return inflight.promise;
    }

    const job = this.loader
      .load(resolveUrl(descriptor.url, this.baseUrl))
      .then((source) => {
        const problems = validateRuntimeModelContract(descriptor, source.scene, source.animations);
        if (problems.length > 0) {
          disposeObject3D(source.scene);
          source.scene.removeFromParent();
          throw new Error(
            `Model asset "${descriptor.id}" failed runtime contract validation:\n${problems.map((problem) => `- ${problem}`).join('\n')}`,
          );
        }
        this.loaded.set(descriptor.id, { descriptor, source });
      })
      .finally(() => {
        this.pending.delete(descriptor.id);
      });
    this.pending.set(descriptor.id, { url: descriptor.url, promise: job });
    return job;
  }
}

function resolveUrl(url: string, baseUrl?: string): string {
  if (/^(?:[a-z]+:)?\/\//i.test(url) || url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }
  const documentBase = typeof document !== 'undefined' ? document.baseURI : undefined;
  if (baseUrl) {
    if (/^[a-z]+:\/\//i.test(baseUrl)) return new URL(url, baseUrl).toString();
    if (documentBase) return new URL(url, new URL(baseUrl, documentBase)).toString();
  }
  if (documentBase) return new URL(url, documentBase).toString();
  return url;
}

function resolveAnchors(
  root: THREE.Object3D,
  descriptor: AssetDescriptor,
): Readonly<Record<string, THREE.Object3D>> {
  const anchors: Record<string, THREE.Object3D> = {};
  for (const [semanticName, nodeName] of Object.entries(descriptor.anchors ?? {})) {
    const node = root.getObjectByName(nodeName);
    if (!node) {
      throw new Error(
        `Model asset "${descriptor.id}" is missing authored anchor node "${nodeName}" for semantic anchor "${semanticName}".`,
      );
    }
    anchors[semanticName] = node;
  }
  return anchors;
}

function resolveCharacterJoints(
  root: THREE.Object3D,
  descriptor: AssetDescriptor,
): RuntimeModelAsset['characterJoints'] {
  if (!descriptor.character) return undefined;
  const joints: Record<string, THREE.Object3D> = {};
  for (const [semanticName, nodeName] of Object.entries(descriptor.character.joints)) {
    const node = root.getObjectByName(nodeName);
    if (!node) {
      throw new Error(
        `Model asset "${descriptor.id}" is missing authored character joint node "${nodeName}" for semantic joint "${semanticName}".`,
      );
    }
    joints[semanticName] = node;
  }
  return joints as NonNullable<RuntimeModelAsset['characterJoints']>;
}

function cloneOwnedObject3D(source: THREE.Object3D): THREE.Object3D {
  const clone = cloneSkeleton(source);
  clone.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.geometry = mesh.geometry.clone();
    if (Array.isArray(mesh.material)) {
      mesh.material = mesh.material.map(cloneOwnedMaterial);
    } else {
      mesh.material = cloneOwnedMaterial(mesh.material);
    }
  });
  return clone;
}

function cloneOwnedMaterial(material: THREE.Material): THREE.Material {
  const clone = material.clone();
  const fields = clone as unknown as Record<string, unknown>;
  for (const key of Object.keys(fields)) {
    const value = fields[key];
    if (value instanceof THREE.Texture) fields[key] = value.clone();
  }
  return clone;
}
