import { Registry, type MotionFactory } from '@mindforge/engine';

/** Registry of motion factories (humanoid and object). */
export class MotionRegistry extends Registry<MotionFactory> {
  constructor() {
    super('motion');
  }
}
