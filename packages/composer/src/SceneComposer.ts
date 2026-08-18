import {
  parseEpisode,
  parseSceneComposition,
  SCENE_LAYER_ROLES,
  type CompositionAction,
  type CompositionCapability,
  type CompositionProp,
  type CompositionActor,
  type EntityDefinition,
  type EpisodeScript,
  type SceneCompositionScript,
  type SceneLayerDefinition,
  type TextDefinition,
  type TimelineEvent,
} from '@mindforge/schema';
import { DEFAULT_COMPOSITION_VOCABULARY } from './default-vocabulary';
import type {
  CompositionLayerCapability,
  CompositionVocabulary,
} from './Vocabulary';

const REGISTRY_ID = /^[a-zA-Z][A-Za-z0-9_-]*(\.[a-zA-Z][A-Za-z0-9_-]*)*$/;

export interface ComposeEpisodeOptions {
  readonly vocabulary?: CompositionVocabulary;
  /** Optional production text sidecar entries merged into the executable episode. */
  readonly text?: readonly TextDefinition[];
}

export class CompositionResolutionError extends Error {
  constructor(kind: string, alias: string, available: readonly string[]) {
    super(
      `Unknown composition ${kind} "${alias}". Available aliases: ${available.length > 0 ? available.join(', ') : '(none)'}. `
      + 'A dotted registry id may also be used as an explicit escape hatch.',
    );
    this.name = 'CompositionResolutionError';
  }
}

/** Parse semantic PF8 JSON and deterministically compile it into EpisodeScript. */
export function composeEpisode(
  raw: unknown,
  options: ComposeEpisodeOptions = {},
): EpisodeScript {
  return compileSceneComposition(parseSceneComposition(raw), options);
}

/** Compile an already parsed semantic composition into the trusted executable format. */
export function compileSceneComposition(
  composition: SceneCompositionScript,
  options: ComposeEpisodeOptions = {},
): EpisodeScript {
  const vocabulary = options.vocabulary ?? DEFAULT_COMPOSITION_VOCABULARY;
  const world = resolveWorld(composition, vocabulary);
  const entities = [
    ...composition.actors.map((actor) => compileActor(actor, vocabulary)),
    ...composition.props.map((prop) => compileProp(prop, vocabulary)),
  ];
  const timeline = compileBeats(composition, vocabulary);

  // The existing EpisodeScript parser is deliberately the final compilation
  // gate so PF8 can never create a parallel executable format.
  return parseEpisode({
    schemaVersion: '0.1',
    id: composition.id,
    title: composition.title,
    duration: composition.duration,
    environment: world.environment,
    layers: world.layers,
    entities,
    timeline,
    ...(options.text ? { text: options.text.map((entry) => ({ ...entry })) } : {}),
    ...(composition.metadata ? { metadata: composition.metadata } : {}),
  });
}

function resolveWorld(
  composition: SceneCompositionScript,
  vocabulary: CompositionVocabulary,
): { environment: string; layers: SceneLayerDefinition[] } {
  const recipe = vocabulary.worlds[composition.world.preset];
  if (!recipe) {
    if (REGISTRY_ID.test(composition.world.preset) && composition.world.preset.includes('.')) {
      return {
        environment: composition.world.preset,
        layers: orderLayers(appendWorldCapabilities([], composition, vocabulary)),
      };
    }
    throw new CompositionResolutionError(
      'world preset',
      composition.world.preset,
      Object.keys(vocabulary.worlds),
    );
  }

  let layers = (recipe.layers ?? []).map((layer) => ({
    id: layer.id,
    factory: layer.factory,
    role: layer.role,
    enabled: layer.enabled ?? true,
    ...(layer.parameters ? { parameters: { ...layer.parameters } } : {}),
  } satisfies SceneLayerDefinition));

  if (composition.world.lighting !== undefined) {
    layers = layers.filter((layer) => layer.role !== 'lighting');
  }

  return {
    environment: recipe.environment,
    layers: orderLayers(appendWorldCapabilities(layers, composition, vocabulary)),
  };
}

function appendWorldCapabilities(
  baseLayers: SceneLayerDefinition[],
  composition: SceneCompositionScript,
  vocabulary: CompositionVocabulary,
): SceneLayerDefinition[] {
  const layers = [...baseLayers];
  const { weather, atmosphere, lighting } = composition.world;

  if (weather) {
    layers.push(
      compileCapability(
        weather,
        vocabulary.weather,
        'weather',
        weather.id ?? 'weather',
      ),
    );
  }

  atmosphere.forEach((capability, index) => {
    layers.push(
      compileCapability(
        capability,
        vocabulary.atmosphere,
        'atmosphere',
        capability.id ?? `atmosphere-${index + 1}`,
      ),
    );
  });

  if (lighting) {
    layers.push(
      compileCapability(
        lighting,
        vocabulary.lighting,
        'lighting',
        lighting.id ?? 'lighting',
      ),
    );
  }

  return layers;
}

function orderLayers(layers: SceneLayerDefinition[]): SceneLayerDefinition[] {
  const order = new Map(SCENE_LAYER_ROLES.map((role, index) => [role, index]));
  return [...layers].sort((a, b) => (order.get(a.role) ?? 0) - (order.get(b.role) ?? 0));
}

function compileCapability(
  capability: CompositionCapability,
  table: Readonly<Record<string, CompositionLayerCapability>>,
  kind: string,
  id: string,
): SceneLayerDefinition {
  const resolved = table[capability.preset];
  if (!resolved) {
    const direct = REGISTRY_ID.test(capability.preset) && capability.preset.includes('.')
      ? { factory: capability.preset, role: kind as SceneLayerDefinition['role'] }
      : undefined;
    if (!direct) {
      throw new CompositionResolutionError(`${kind} preset`, capability.preset, Object.keys(table));
    }
    return {
      id,
      factory: direct.factory,
      role: direct.role,
      enabled: capability.enabled,
      ...(capability.parameters ? { parameters: { ...capability.parameters } } : {}),
    };
  }

  const parameters = {
    ...(resolved.parameters ?? {}),
    ...(capability.parameters ?? {}),
  };

  return {
    id,
    factory: resolved.factory,
    role: resolved.role,
    enabled: capability.enabled,
    ...(Object.keys(parameters).length > 0 ? { parameters } : {}),
  };
}

function compileActor(
  actor: CompositionActor,
  vocabulary: CompositionVocabulary,
): EntityDefinition {
  return {
    id: actor.id,
    type: 'character',
    factory: resolveRegistryAlias(vocabulary.characters, actor.character, 'character'),
    ...(actor.parameters ? { parameters: actor.parameters } : {}),
    ...copyTransform(actor),
  };
}

function compileProp(
  prop: CompositionProp,
  vocabulary: CompositionVocabulary,
): EntityDefinition {
  return {
    id: prop.id,
    type: 'prefab',
    factory: resolveRegistryAlias(vocabulary.prefabs, prop.prefab, 'prefab'),
    ...(prop.parameters ? { parameters: prop.parameters } : {}),
    ...copyTransform(prop),
  };
}

function copyTransform(
  value: CompositionActor | CompositionProp,
): Pick<EntityDefinition, 'position' | 'rotation' | 'scale' | 'visible'> {
  return {
    ...(value.position ? { position: [...value.position] as [number, number, number] } : {}),
    ...(value.rotation ? { rotation: [...value.rotation] as [number, number, number] } : {}),
    ...(value.scale !== undefined
      ? { scale: Array.isArray(value.scale) ? [...value.scale] as [number, number, number] : value.scale }
      : {}),
    ...(value.visible !== undefined ? { visible: value.visible } : {}),
  };
}

function compileBeats(
  composition: SceneCompositionScript,
  vocabulary: CompositionVocabulary,
): TimelineEvent[] {
  const timeline: TimelineEvent[] = [];
  const eventIds = new Set<string>();

  composition.beats.forEach((beat) => {
    beat.actions.forEach((action, index) => {
      const suffix = action.id ?? `${action.type}-${index + 1}`;
      const id = `${beat.id}.${suffix}`;
      if (eventIds.has(id)) {
        throw new Error(`Duplicate composed timeline event id "${id}".`);
      }
      eventIds.add(id);
      timeline.push(compileAction(id, beat.at + action.offset, action, vocabulary));
    });
  });

  return timeline;
}

function compileAction(
  id: string,
  at: number,
  action: CompositionAction,
  vocabulary: CompositionVocabulary,
): TimelineEvent {
  const base = {
    id,
    at,
    ...(action.duration !== undefined ? { duration: action.duration } : {}),
    ...(action.easing ? { easing: action.easing } : {}),
    ...(action.intensity !== undefined ? { intensity: action.intensity } : {}),
    ...(action.repeat !== undefined ? { repeat: action.repeat } : {}),
    ...(action.parameters ? { parameters: action.parameters } : {}),
  };

  switch (action.type) {
    case 'animation':
      return {
        ...base,
        type: 'animation',
        target: action.target,
        clip: action.clip,
        ...(action.speed !== undefined ? { speed: action.speed } : {}),
        ...(action.loop !== undefined ? { loop: action.loop } : {}),
        ...(action.startOffset !== undefined ? { startOffset: action.startOffset } : {}),
        ...(action.blendIn !== undefined ? { blendIn: action.blendIn } : {}),
        ...(action.blendOut !== undefined ? { blendOut: action.blendOut } : {}),
      };
    case 'motion':
      return {
        ...base,
        type: 'motion',
        target: action.target,
        motion: resolveRegistryAlias(vocabulary.motions, action.motion, 'motion'),
        ...(action.mirror !== undefined ? { mirror: action.mirror } : {}),
        ...(action.speed !== undefined ? { speed: action.speed } : {}),
      };
    case 'objectMotion':
      return {
        ...base,
        type: 'objectMotion',
        target: action.target,
        motion: resolveRegistryAlias(vocabulary.objectMotions, action.motion, 'object motion'),
        ...(action.axis ? { axis: [...action.axis] as [number, number, number] } : {}),
        ...(action.from !== undefined ? { from: copyScalarOrVec3(action.from) } : {}),
        ...(action.to !== undefined ? { to: copyScalarOrVec3(action.to) } : {}),
      };
    case 'effect':
      return {
        ...base,
        type: 'effect',
        effect: resolveRegistryAlias(vocabulary.effects, action.effect, 'effect'),
        ...(action.target ? { target: action.target } : {}),
        ...(action.from ? { from: action.from } : {}),
        ...(action.to ? { to: action.to } : {}),
        ...(action.through ? { through: [...action.through] } : {}),
        ...(action.tone ? { tone: action.tone } : {}),
        ...(action.color ? { color: action.color } : {}),
      };
    case 'camera':
      return {
        ...base,
        type: 'camera',
        preset: resolveRegistryAlias(vocabulary.cameras, action.shot, 'camera shot'),
        ...(action.target ? { target: action.target } : {}),
        ...(action.from ? { from: [...action.from] as [number, number, number] } : {}),
        ...(action.to ? { to: [...action.to] as [number, number, number] } : {}),
        ...(action.fov !== undefined ? { fov: action.fov } : {}),
        ...(action.framingOffset
          ? { framingOffset: [...action.framingOffset] as [number, number, number] }
          : {}),
        ...(action.shake !== undefined ? { shake: action.shake } : {}),
      };
    case 'text':
      return {
        ...base,
        type: 'text',
        ...(action.textId ? { textId: action.textId } : {}),
        ...(action.content ? { content: action.content } : {}),
        ...(action.style ? { style: action.style } : {}),
        ...(action.placement ? { placement: action.placement } : {}),
      };
    case 'audio':
      return {
        ...base,
        type: 'audio',
        cue: resolveRegistryAlias(vocabulary.audio, action.cue, 'audio cue'),
        ...(action.textId ? { textId: action.textId } : {}),
        ...(action.bus ? { bus: action.bus } : {}),
        ...(action.volume !== undefined ? { volume: action.volume } : {}),
        ...(action.loop !== undefined ? { loop: action.loop } : {}),
      };
    case 'face':
      return { ...base, type: 'face', target: action.target, state: action.state };
    case 'visibility':
      return { ...base, type: 'visibility', target: action.target, visible: action.visible };
    case 'property':
      return {
        ...base,
        type: 'property',
        target: action.target,
        property: action.property,
        ...(action.from !== undefined ? { from: copyPropertyValue(action.from) } : {}),
        to: copyPropertyValue(action.to),
      };
  }
}

function resolveRegistryAlias(
  table: Readonly<Record<string, string>>,
  alias: string,
  kind: string,
): string {
  const resolved = table[alias];
  if (resolved) return resolved;
  if (REGISTRY_ID.test(alias) && alias.includes('.')) return alias;
  throw new CompositionResolutionError(kind, alias, Object.keys(table));
}

function copyScalarOrVec3(value: number | [number, number, number]): number | [number, number, number] {
  return Array.isArray(value) ? [...value] as [number, number, number] : value;
}

function copyPropertyValue(
  value: number | [number, number, number] | string,
): number | [number, number, number] | string {
  return Array.isArray(value) ? [...value] as [number, number, number] : value;
}
