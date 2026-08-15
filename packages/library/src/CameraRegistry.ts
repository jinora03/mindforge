import { Registry, type CameraFactory } from '@mindforge/engine';

/** Registry of camera shot factories. */
export class CameraRegistry extends Registry<CameraFactory> {
  constructor() {
    super('camera');
  }
}
