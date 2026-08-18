import { Registry, type AssetDescriptor } from '@mindforge/engine';

/**
 * Registry of stable asset descriptors. Procedural entries omit `url`; authored
 * production entries may point at GLB/GLTF files that BrowserAssetRuntime
 * preloads before synchronous scene construction.
 */
export class AssetRegistry extends Registry<AssetDescriptor> {
  constructor() {
    super('asset');
  }

  /** Convenience: register by descriptor object. */
  describe(descriptor: AssetDescriptor): this {
    this.register(descriptor.id, descriptor);
    return this;
  }
}
