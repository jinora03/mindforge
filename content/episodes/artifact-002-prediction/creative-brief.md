# Creative Brief — Artifact 002: The Prediction Engine

**Public title:** _Why Can't You Tickle Yourself?_
**Domain:** Dream Garden · **Artifact type:** Engine · **Duration:** 15s (9:16)

> This brief is the production creative direction. It supersedes the earlier
> architecture-demo version of this episode. It is a design document — it is not
> loaded at runtime.

## 1. The one idea

Your brain **predicts** the sensation of your own touch and cancels it, so you
can't tickle yourself. A touch you **don't** predict — someone else's — still
lands. The whole episode is a single before/after comparison built around one
character and one contact point (the ribs).

## 2. The unforgettable visual (non-negotiable)

**A translucent predicted ghost hand reaches the character's ribs a beat _before_
their real hand arrives.** The ghost is the prediction. It leads the real motion
and dissolves just before real contact.

The comparison is the payoff: **when the external hand approaches, there is no
ghost.** Prediction only exists for self-generated action. The absence of the
ghost during the external touch is as important as its presence during the
self-tickle.

## 3. Composition & staging

- The character occupies **55–70% of the frame** for the whole main explanation.
  We frame **chest-up, three-quarter angle** — never a distant full body, never
  large empty vertical space.
- **One consistent screen direction.** The camera sits on the character's near
  (screen-right-ish) side for the entire piece. The external hand enters from the
  same foreground side so it never crosses the axis.
- **Face + incoming hand + rib contact point are always visible together** during
  the touch beats. That triangle is the shot.
- Target framing: look-at at chest height (~1.05m), distance ~2.4–2.6m, fov ~34.

## 4. Camera plan (reuse existing presets, tuned by params)

| Beat | Preset | Behaviour |
| --- | --- | --- |
| Arrival | `camera.pushIn` | Gentle medium-close push (not a distant establish). Reveals the character already studying their own hands. |
| Prediction | `camera.reactionCloseup` | Hold stable 3/4 close so the ghost reach reads clearly. |
| Failed tickle | `camera.reactionCloseup` | Same hold — nothing happens, and we _see_ nothing happen. |
| External touch | `camera.reactionCloseup` | **Stable** 3/4 during contact. No shake, no cross-cut. |
| Resolution | `camera.pullBack` | Small pull to breathe as the laugh settles. |

Camera moves **only** to reveal prediction or to breathe at resolution. No orbit,
no drift, no shake during the touch.

## 5. Character performance

- **Arrival:** relaxed, curious. Looks toward own hands. `focused` face.
- **Self-tickle:** brings a hand to the ribs; **fingers wiggle clearly**. The
  ghost hand leads. Reaction stays **tiny** — this is the failure. Face slips to
  `disappointed` — "nothing."
- **Relaxed gap:** hands lower, body settles, `neutral`. Genuinely off-guard.
- **External touch:** the external hand does **two fast finger curls** at the ribs.
- **Reaction (just _after_ contact):** playful, involuntary — **torso twist,
  shoulder compression, bent knees, defensive arm pull-in**, `surprised` →
  `laughing`. Eased onset so it reads as a delighted flinch, **never** a rigid
  electrical jolt or pain.

## 6. Environment as a storyteller (Dream Garden)

Dream Garden remains a calm staging space; its actual palette and geometry are owned by the active theme. Five authored **states**, expressed
through the timeline (mood light + contour effects + performance) — not through a
uniform decorative background. Contours appear **only** to reveal prediction or
sensation.

| State | When | Expression |
| --- | --- | --- |
| `calm` | 0.0–2.2 | Soft even light, gentle motes, no contours. |
| `predictionFocus` | 2.2–6.4 | Light lifts on the character; ghost hand + head→hand prediction signal reveal the forward model. |
| `sensorySuppression` | 6.4–8.2 | Light dips; a contour compresses at the ribs and **damps to nothing** — the felt sensation is canceled. Reaction is near-zero. |
| `unexpectedBurst` | 9.0–12.0 | Light spikes; a strong theme-owned reaction burst at the ribs. The prediction machinery is absent. |
| `resolution` | 12.0–15.0 | Light settles warm; contours gone; the field is calm again. |

## 7. Text (minimal — action explains first)

Only three spoken lines plus the artifact label. The self-tickle, the ghost, and
the burst carry the meaning; text confirms, never narrates.

1. Hook (0.4s): _"Why can't you tickle yourself?"_
2. Prediction (4.6s): _"Your brain predicts your own touch."_
3. Answer (12.2s): _"An unexpected touch still lands."_
4. Label (14.2s): _Artifact 002 / The Prediction Engine_

## 8. Library changes (only what's genuinely necessary)

These are **Library** additions/enhancements (packages `effects`, `motions`).
The Engine architecture is untouched. All remain reusable and deterministic.

- **`effect.ghostMovement`** — add an optional `from` anchor so the ghost
  *travels* (leads the real limb) instead of only sitting at the destination, and
  add `shape: "hand"` so the predicted limb reads as a faceted hand. Backwards
  compatible.
- **`motion.object.curl`** (new) — an oscillating finger/panel curl for a group's
  children. Reusable for grasping / tickling / gripping. Drives the external
  hand's two fast curls.
- **`motion.humanoid.surprisedSquirm`** — enrich to the specified playful
  reaction (bent knees + defensive arms + shoulder compression), keeping the
  eased, non-painful onset.
- **`motion.humanoid.selfTickle`** — clearer, faster wrist/finger wiggle so the
  self-tickle attempt is obvious.

## 9. Success criteria (how to judge — not "does it validate")

- A first-time viewer understands the idea from the **action alone**.
- The ghost-hand-leads-real-hand moment is unmistakable and repeatable as a
  thumbnail.
- The failed self-tickle vs. the external burst reads as a clean comparison.
- The reaction feels playful and human, not electrical.
- The character fills the frame; no dead vertical space; one screen direction.
