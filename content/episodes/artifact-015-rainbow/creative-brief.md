# Creative Brief — Artifact 015: The Split — PB6 Final Polish

**Public title:** _Why does a rainbow appear?_
**Domain:** Signal Ocean · **Artifact type:** Loom · **Duration:** 17.6s (9:16)

## Unforgettable Visual

The signature frame is a full-width, saturated voxel rainbow spanning a dark storm meadow from a front-of-diorama camera position. Low stepped ridges and trees create depth beneath it, a small warm sun-break sits high in the sky, and the rainbow remains the only large multicolor/emissive event in frame.

## 1. Production purpose

PB6 is a visual-production pass, not an architecture phase. It keeps the reusable PB1–PB5 systems and fixes the actual shot design: subject silhouette, portrait framing, value hierarchy, optical readability, caption scale and payoff composition. Artifact 001 (Heat) and Artifact 004 (Cold Battery) remain the visual family reference.

## 2. The one idea

Light bends into a raindrop, reflects inside it, then bends again on the way out. Colors bend by different amounts. Across millions of droplets, the right viewing angle lines those colors up into a rainbow.

## 3. Reusable production vocabulary

- PB1 `pack.voxel.optics-production`, with an opaque saturated block-water hero that reads without fragile transmission.
- `layer.setDressing.dioramaFrame`, extended with reusable low stepped background ridges for foreground/midground/background depth.
- `prefab.storyLight` with optional authored color so focal lights can be cool/warm without adding episode-specific light prefabs.
- PB3 beam/refraction/spectrum effects using fewer, longer block segments, contact flashes and restrained halos instead of dashed debug-line styling.
- PB3 `effect.reveal.atmospheric` with target offsets so a sun-break can live in the sky rather than at the target origin.
- PB3 `effect.optics.rainbowArc` with chunkier bands and a restrained halo.
- Resolution-aware deterministic export captions so the 1080×1920 output matches preview readability.

## 4. Shot progression

1. **0–1.5s — Hook:** saturated voxel raindrop, dark framed meadow, no competing effect.
2. **1.1–3.6s — Light path:** warm entry ribbon plus internal refraction/reflection contacts.
3. **3.2–5.85s — Spectrum:** camera frames hero and the complete color fan together.
4. **5.85–7.55s — Exit angle:** short close explanation at the exit point.
5. **7.3–10.55s — Many drops:** one drop becomes a smaller, cleaner field of fourteen authored droplets.
6. **10.25–17.6s — Payoff:** high sky sun-break, front-of-diorama wide shot, full rainbow and clean final hold.

## 5. Composition rules

- One focal subject per shot.
- Keep the central optics lane clear; side dressing and ridges frame, never intersect, the explanation.
- Opaque saturated water is preferred to milky transparent glass when transparency hurts readability.
- Glow belongs only to semantic light, optical contact points and the final rainbow.
- Camera distance is chosen from the portrait horizontal FOV, not only from vertical framing.
- Final rainbow must fit entirely inside the 9:16 horizontal field with margin.
- Captions must remain readable at 1080×1920 export scale and stay clear of the hero/payoff.

## 6. Success criteria

- No black-frame material corruption.
- Hero reads as a raindrop before effects begin.
- Spectrum is fully visible in the portrait frame instead of clipping off-screen.
- Storm atmosphere supports contrast rather than whitening the frame.
- Final camera fits the entire rainbow horizontally.
- Export captions scale from the logical CSS stage to video resolution.
- `pnpm check` is green before the stage is called complete.
