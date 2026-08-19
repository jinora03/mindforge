# PF5 Weather and Atmosphere Runtime

PF5 turns PF1 scene-composition layers into reusable, deterministic weather and
atmosphere capabilities. The first production surface is intentionally small:

- `layer.weather.rain`
- `layer.weather.heavyRain`
- `layer.atmosphere.mist`
- `layer.atmosphere.fog`

Voxel and Toybox implement the same semantic ids with different geometry,
materials, density, and motion language. Episode JSON remains theme-blind.

## Composition

Weather is composed with a base environment instead of being baked into a new
environment id for every combination:

```json
{
  "environment": "environment.forest",
  "layers": [
    {
      "id": "rain",
      "factory": "layer.weather.heavyRain",
      "role": "weather",
      "parameters": {
        "intensity": 0.82,
        "wind": 0.25
      }
    },
    {
      "id": "mist",
      "factory": "layer.atmosphere.mist",
      "role": "atmosphere",
      "parameters": {
        "density": 0.45,
        "drift": 0.4
      }
    },
    {
      "id": "fog",
      "factory": "layer.atmosphere.fog",
      "role": "atmosphere",
      "parameters": {
        "density": 0.35
      }
    }
  ]
}
```

The existing hero `environment.rainMeadow` is preserved unchanged for regression
safety. PF5 does not pretend that its embedded PQ4 weather has already been
fully decomposed; new scenes should prefer reusable layers where appropriate,
and a later environment-composition phase can migrate hero environments
carefully instead of rewriting a proven production scene during PF5.

## Deterministic contract

Rain and mist generate immutable per-instance variation from the PF1 layer seed.
Their runtime transforms are reconstructed from:

```text
absolute Engine time
+ deterministic particle/base data
+ authored parameters
+ current PF4 influence snapshot
```

They never integrate position from `delta`, frame count, wall-clock time, or
`Math.random()`.

Therefore:

```text
evaluateAt(2.75)
evaluateAt(6.40)
evaluateAt(2.75)
```

reconstructs the same precipitation, mist, and fog state.

## Parameters

### Rain / heavy rain

Common semantic controls:

- `intensity` — normalized `0..1`
- `wind` — signed `-1..1`

Optional spatial controls exist for scene composition where the default world
coverage is not appropriate:

- `radius`
- `height`
- `centerX`
- `centerZ`
- `groundY`

The theme still decides particle count, droplet/streak geometry, material,
opacity, fall speed, and default coverage.

### Mist

- `density` — normalized `0..1`
- `drift` — normalized `0..1`
- `wind` — signed `-1..1`
- optional `centerX`, `centerZ`, `baseY`

### Fog

- `density` — normalized `0..1`

The theme maps that semantic density into its own exponential-fog range and
palette.

## PF4 interaction

PF5 consumes PF4 influence channels without knowing the originating effect.

Rain reads:

- `environmentLight`
- `emissiveBoost`
- `windImpulse`

Mist reads:

- `fogScattering`
- `environmentLight`
- `windImpulse`

Fog reads:

- `fogScattering`
- `environmentLight`

This means a future lightning recipe can illuminate rain and fog on the same
absolute frame, while an explosion can reuse the same response channels with a
different influence profile.

PF5 does not play thunder, shake the camera, or modify renderer exposure merely
because those PF4 channels exist. Each consumer keeps ownership of its own
policy.

## Theme boundary

The shared weather runtime contains deterministic mechanics only. Theme files
supply the visual style.

Current distinction:

- Voxel rain uses thin block streaks and matte/PBR voxel material response.
- Toybox rain uses rounded cylindrical droplets and glossy moulded-plastic
  response.
- Mist/fog use separate palettes and density ranges per theme.

There is no Engine branch for `voxel`, `toybox`, rain, fog, or storm meaning.

## Ownership and disposal

Visual weather layers own only their own `Object3D` resources.

Fog is scene-global, so the fog layer stores the previously active fog object
and restores it on disposal. PF1's reverse disposal order makes stacked
atmosphere ownership deterministic.

## Deliberate PF5 boundaries

PF5 currently does **not** add:

- snow
- hail
- dedicated ambient-wind cross-layer state
- lightning bolt/effect recipes
- thunder audio
- storm-lighting presets
- wet-surface material modification
- puddle accumulation
- snow accumulation
- vegetation bending
- environment/set-dressing composition

Those are intentionally left for later capabilities after the reusable rain /
mist / fog contract is proven by the full repository gate.
