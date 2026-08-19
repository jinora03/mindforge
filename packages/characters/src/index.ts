/**
 * @mindforge/characters — reusable character implementations and PF7 adapters.
 * Procedural theme characters and authored production characters implement the Engine Entity
 * and PoseableRig contracts so motions can pose them without a direct link.
 */
export * from './CharacterTypes';
export { HumanoidRig } from './HumanoidRig';
export { FaceController } from './FaceController';
export { HumanoidCharacter, createObserver, CHARACTER_FACTORIES } from './CharacterFactory';

export { AuthoredHumanoidRig, ProductionModelCharacter, createModelCharacterFactory } from './ProductionCharacter';
