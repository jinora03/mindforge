import type { ReadonlyRegistry } from './EngineTypes';
import { DuplicateRegistryIdError, UnknownRegistryIdError } from './errors';

/**
 * A generic id → value registry with duplicate protection and clear
 * missing-id errors. The Library builds typed registries on top of this; the
 * Engine only ever sees the {@link ReadonlyRegistry} surface.
 */
export class Registry<T> implements ReadonlyRegistry<T> {
  private readonly entries = new Map<string, T>();

  constructor(private readonly registryName: string) {}

  get name(): string {
    return this.registryName;
  }

  get size(): number {
    return this.entries.size;
  }

  register(id: string, value: T): this {
    if (this.entries.has(id)) {
      throw new DuplicateRegistryIdError(this.registryName, id);
    }
    this.entries.set(id, value);
    return this;
  }

  has(id: string): boolean {
    return this.entries.has(id);
  }

  get(id: string): T {
    const value = this.entries.get(id);
    if (value === undefined) {
      throw new UnknownRegistryIdError(this.registryName, id);
    }
    return value;
  }

  list(): string[] {
    return [...this.entries.keys()].sort();
  }
}
