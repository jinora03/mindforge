import { Registry, type AssetDescriptor } from '@mindforge/engine';

/**
 * Registry of asset descriptors. v0.1 content is procedural, so descriptors
 * usually carry no `url`; the registry exists so episodes reference stable
 * asset ids and the future Renderer can resolve real files.
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
