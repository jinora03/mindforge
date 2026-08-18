# Creative Brief — PB4 Production Meadow Baseline

**Purpose:** Production-quality environment regression preview · **Duration:** 7.5s · **Aspect:** 9:16

## 1. The one idea

Prove that MindForge can now construct a reusable rainy meadow from independent production capabilities rather than one monolithic procedural environment. The scene must visibly combine authored nature assets, ground cover, puddles, cloud masses, wet material response, PF5 rain/mist/fog, PF6 composition, and production lighting while preserving a clear central storytelling stage.

## 2. The unforgettable visual

A compact cinematic camera pass should show three readable depth bands at once: foreground vegetation framing the portrait image, a clear wet meadow stage with puddle highlights and varied authored plants/rocks/trees, and a distant storm layer of cloud masses fading through rain and mist. The scene should look deliberately dressed even though no hero object is present.

## 3. Composition

- Keep the central stage open for a future hero droplet or character.
- Ground cover should break up the flat surface without becoming visual noise.
- Puddles should catch the PB2 wet/reflection response and sit away from the exact hero center.
- Trees, bushes and rocks should form groups and depth rather than a uniform wall.
- Foreground objects should frame the image from the sides instead of blocking the center.
- Cloud masses belong to the far world layer and must not read as ground geometry floating overhead.

## 4. Reuse policy

The preview may use only reusable registered capabilities. No Rainbow-specific geometry, timing hacks, hidden one-off weather system, or episode-name branching is allowed. `productionMeadow` is a semantic composition preset; rain, mist and fog remain independent PF5 capabilities that can be removed or replaced in later episodes.

## 5. Success criteria

- The Voxel preview uses PB1 authored assets for trees, bushes, rocks, ground cover, puddles and cloud families when the normal browser asset preload boundary is available.
- The same semantic layer IDs remain valid under Toybox without introducing Voxel logic into the Engine.
- The central hero area stays readable throughout the camera pass.
- Foreground, midground and background are visually distinguishable through placement, scale, rain and atmospheric depth.
- Seeking or replaying does not change object placement.
- `pnpm check` remains green before PB5 starts.
