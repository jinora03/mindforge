import { Registry, type EnvironmentFactory } from '@mindforge/engine';

/** Registry of environment factories (domains / stages). */
export class EnvironmentRegistry extends Registry<EnvironmentFactory> {
  constructor() {
    super('environment');
  }
}
