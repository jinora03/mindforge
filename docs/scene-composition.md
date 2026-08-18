# Scene Composition Layers

PF1 establishes a reusable production-scene composition surface without moving
weather, atmosphere, lighting, or effects into the generic Engine.

## Why this exists

MindForge should not grow by creating a separate monolithic environment for every
combination such as `rainyForest`, `rainyCity`, `stormyForest`, and
`stormyCity`. A production scene is instead composed from an environment plus
ordered reusable layers:

```text
Environment
  + surface
  + set dressing
  + atmosphere
  + weather
  + lighting
  + foreground
```

The active Theme owns the visual implementation of each semantic layer id. The
Engine only validates, constructs, orders, evaluates, and disposes them.

## Script shape

`episode.json` and reusable files in `content/scenes/` may now declare an
optional `layers` array:

```json
{
  "environment": "environment.forest",
  "layers": [
    {
      "id": "rain",
      "factory": "layer.weather.heavyRain",
      "role": "weather",
      "parameters": { "intensity": 0.85, "wind": 0.25 }
    },
    {
      "id": "mist",
      "factory": "layer.atmosphere.mist",
      "role": "atmosphere",
      "parameters": { "density": 0.4 }
    },
    {
      "id": "stormLight",
      "factory": "layer.lighting.storm",
      "role": "lighting"
    }
  ]
}
```

The local `id` is unique inside the scene. `factory` is the stable semantic
capability id. `role` is organisational metadata only: the Engine never branches
on `weather`, `lighting`, Voxel, Toybox, or any other visual meaning.

## Runtime contract

Every registered layer factory receives:

```text
id
role
parameters
SceneServices
seed
```

The `seed` is deterministic per episode + local layer id. Any procedural
variation must use seeded deterministic generation rather than `Math.random()`.

Every runtime layer owns an `object3d`, an `update(FrameContext)` method, and
`dispose()`. `update` must reconstruct its state from the absolute Engine frame;
it must not own an independent playback clock.

Declaration order is preserved for construction and frame evaluation. Disposal
runs in reverse order.

## Theme boundary

PF5 now supplies the first shared semantic weather surface in every production
theme:

```text
layer.weather.rain
layer.weather.heavyRain
layer.atmosphere.mist
layer.atmosphere.fog
```

Voxel and Toybox render those layers differently. Episode JSON does not know how
either implementation is built. PF4's influence bus is evaluated before PF1
layers, so these PF5 systems can react to light, fog-scattering, emissive, and
wind impulses on the same deterministic frame. See
`docs/weather-atmosphere-runtime.md`.

PF1 itself remains only the composition/lifecycle foundation; the Engine still
has no rain, fog, Voxel, Toybox, or weather-specific branches.
