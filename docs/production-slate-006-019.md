# MindForge Production Content Sprint — Artifacts 006–019

This slate adds **14 new production episodes** after Artifact 005. It is intentionally not a set of isolated one-off scenes: each episode either reuses an existing production capability or introduces an environment, prop/prefab, or semantic audio cue designed to be useful again later.

The duration target is **20–45 seconds**, not a fixed 15-second template. All episodes remain authored as deterministic MindForge timelines and must work in both Voxel and Toybox without Engine theme branching.

## Slate

| Artifact | Public title | Target duration | Primary environment | New/reused production assets | Audio direction | Difficulty | Reuse value |
|---|---|---:|---|---|---|---|---|
| 006 — The Conductor | Why does metal feel colder than wood? | 26s | `environment.materialLab` | `prefab.materialSamples` | lab ambience, material tap, thermal transfer | Medium | Very high: conductivity/material comparisons |
| 007 — The Charge | Why does a balloon stick to the wall? | 28s | `environment.classroomLab` | `prefab.balloon`, `prefab.demoPanel` | classroom ambience, balloon rub, static crackle | Medium | High: electrostatics, pressure, elasticity |
| 008 — The Float | Why does ice float on water? | 30s | `environment.kitchenLab` | `prefab.floatTank` | kitchen ambience, water splash | Medium | Very high: density, displacement, dissolving |
| 009 — The Conduction Line | Why does a spoon get hot in soup? | 27s | `environment.kitchenLab` | `prefab.bowlSpoon` | kitchen ambience, thermal transfer | Medium | Very high: cooking, conduction, convection |
| 010 — The Restraint | Why do seatbelts save you in a sudden stop? | 32s | `environment.vehicleCabin` | `prefab.seatRig`, belt anchor system | road ambience, belt latch, brake impact | High | High: inertia, collisions, safety |
| 011 — The Drop | Do heavier objects fall faster? | 30s | `environment.dropLab` | `prefab.featherRock`, vacuum chamber | lab ambience, release/drop accents | Medium | High: gravity, drag, terminal velocity |
| 012 — The Glide | Why does a paper airplane stay in the air? | 28s | `environment.classroomLab` + open demo lane | `prefab.paperPlane` | paper fold, launch whoosh, airflow | Medium | High: lift, drag, projectiles |
| 013 — The Selector | Why do magnets attract some metals but not all? | 34s | `environment.materialLab` | `prefab.magnetKit`, material samples | magnet snap, material taps | Medium | Very high: magnetism/material testing |
| 014 — The Return | Why does an echo happen? | 30s | `environment.canyon` | reusable sound source/reflector staging | canyon ambience, impulse, echo return | Medium | Very high: waves, sonar, acoustics |
| 015 — The Split | Why does a rainbow appear? | 38s | `environment.rainMeadow` | `prefab.prismDrop` / light-split rig | rain ambience, soft reveal shimmer | High | Very high: optics, refraction, wavelength |
| 016 — The Horizon | Why does the Moon look bigger near the horizon? | 36s | `environment.nightOverlook` | moon/sky comparison markers | night ambience, subtle reveal accents | High | High: perception, angular size, sky content |
| 017 — The Twinkle | Why do stars twinkle but planets usually do not? | 36s | `environment.observatory` | star/planet source markers, atmospheric path | observatory/night ambience, shimmer | High | Very high: astronomy, atmosphere, optics |
| 018 — The Reflection | Why do wet roads look so shiny at night? | 32s | `environment.cityRain` | street lamp, puddle/road surface rig | rain/city ambience, tire pass, water detail | High | High: reflection, roughness, night scenes |
| 019 — The Release | Why does soda fizz when you open it? | 30s | `environment.kitchenLab` | `prefab.sodaBottle`, bubble field | kitchen ambience, cap pop, fizz loop | Medium | Very high: pressure, gases, phase equilibrium |

## Environment pack

The sprint should end with a reusable environment library rather than fourteen scene-specific backdrops.

| Environment | First episode | Intended later reuse |
|---|---|---|
| `environment.materialLab` | 006 | magnets, conductivity, density, chemistry/material tests |
| `environment.classroomLab` | 007 | paper plane, static, simple mechanics, demonstrations |
| `environment.kitchenLab` | 008 | heat, water, pressure, food science, phase changes |
| `environment.vehicleCabin` | 010 | inertia, braking, collisions, reaction time |
| `environment.dropLab` | 011 | gravity, drag, pendulums, acceleration |
| `environment.canyon` | 014 | echoes, waves, distance/speed demonstrations |
| `environment.rainMeadow` | 015 | rainbows, weather, droplets, sunlight |
| `environment.nightOverlook` | 016 | moon, horizon, perspective, night sky |
| `environment.observatory` | 017 | stars, planets, telescopes, atmosphere/space |
| `environment.cityRain` | 018 | reflections, headlights, wet surfaces, visibility |

## Reusable prop/model pack

Wave 1 establishes `prefab.materialSamples`, `prefab.balloon`, `prefab.demoPanel`, `prefab.floatTank`, and `prefab.bowlSpoon`.

Later waves should add reusable semantic rigs rather than episode-numbered models:

- `prefab.seatRig` — seat, belt, passenger/contact anchors.
- `prefab.featherRock` — paired drop-test objects.
- `prefab.paperPlane` — launchable plane with nose/wing anchors.
- `prefab.magnetKit` — magnet plus reusable material targets.
- `prefab.prismDrop` — optical splitter usable as prism or droplet metaphor.
- `prefab.sodaBottle` — bottle, cap, liquid, bubble-release anchors.
- Street-light / reflective-surface props only if the city environment itself cannot provide targetable anchors cleanly.

## Audio pack

Production audio remains semantic and replaceable. Procedural stereo cues are fallback/reference audio; publish-ready MP3s can replace them through the Phase 8A production-audio workflow without changing episode timelines.

Wave 1 introduces:

- `audio.ambience.lab`
- `audio.ambience.classroom`
- `audio.ambience.kitchen`
- `audio.sfx.materialTap`
- `audio.sfx.balloonRub`
- `audio.sfx.staticCrackle`
- `audio.sfx.waterSplash`
- `audio.sfx.heatTransfer`

Later waves should add road/vehicle, wind/airflow, magnet, canyon/echo, rain, night/observatory, city-rain, cap-pop and fizz cues only when the corresponding episodes enter production.

## Voice policy

Do **not** generate another batch of low-quality placeholder narration simply to fill the Voice bus. New episodes are caption-led until a narrator/TTS voice is selected that is good enough to publish. Every creative brief still defines a narration-ready text structure so production voice can be imported later without visual-timeline changes.

## Production waves

### Wave 1 — Everyday materials and home science

Artifacts 006–009. Build three reusable environments, five reusable props, and the first expanded ambience/SFX pack. This wave is the architecture test for reusable content assets.

### Wave 2 — Forces and mechanics

Artifacts 010–013. Add vehicle/drop mechanics plus paper-plane and magnet rigs. Reuse Material Lab and Classroom Lab where appropriate rather than creating unnecessary duplicate rooms.

### Wave 3 — Waves, optics and perception

Artifacts 014–017. Add Canyon, Rain Meadow, Night Overlook and Observatory. This wave should expand MindForge's visual vocabulary beyond indoor experiments.

### Wave 4 — Real-world surfaces and pressure

Artifacts 018–019. Add City Rain and the soda-pressure rig, while deliberately reusing Kitchen Lab for the final episode.

## Acceptance criteria for the 14-video sprint

1. All 14 episodes satisfy the four-file production contract: creative brief, storyboard, episode, text.
2. No episode requires theme-specific conditional logic inside the Engine.
3. New props expose semantic anchors and are implemented in both Voxel and Toybox.
4. New environments are reusable registry capabilities, not geometry embedded into episode JSON.
5. New audio uses semantic cue IDs with deterministic fallback and optional production replacement.
6. Episode durations are chosen for the explanation rather than forced to 15 seconds.
7. Every episode passes `npm run check` and manual Voxel/Toybox review.
8. Creator Export can render full episode and current-shot ranges without timing drift.
9. At the end of the sprint, real production friction—not speculation—determines what Phase 10+ authoring tools should be built next.
