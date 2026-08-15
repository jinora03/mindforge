/**
 * @mindforge/characters — procedural, faceted, expressive humanoids. The
 * Observer is the only v0.1 character. Characters implement the Engine Entity
 * and PoseableRig contracts so motions can pose them without a direct link.
 */
export * from './CharacterTypes';
export { HumanoidRig } from './HumanoidRig';
export { FaceController } from './FaceController';
export { HumanoidCharacter, createObserver, CHARACTER_FACTORIES } from './CharacterFactory';
