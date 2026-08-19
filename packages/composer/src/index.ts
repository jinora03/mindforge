/**
 * @mindforge/composer — PF8 semantic authoring/compiler layer.
 *
 * AI and humans can author world + actors + directing beats here. The compiler
 * emits ordinary @mindforge/schema EpisodeScript; it owns no renderer, clocks,
 * theme branches, or model-specific knowledge.
 */
export {
  composeEpisode,
  compileSceneComposition,
  CompositionResolutionError,
  type ComposeEpisodeOptions,
} from './SceneComposer';
export { DEFAULT_COMPOSITION_VOCABULARY } from './default-vocabulary';
export type {
  CompositionLayerCapability,
  CompositionLayerRecipe,
  CompositionVocabulary,
  CompositionWorldRecipe,
} from './Vocabulary';
