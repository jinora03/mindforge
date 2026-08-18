# PF3 — deterministic authored animation runtime

PF3 turns PF2's semantic GLB/GLTF clip mappings into seek-safe timeline animation.
The Engine remains theme-blind: episode JSON targets an entity plus a semantic clip id;
it never names a GLTF clip, skeleton node, asset pack, or theme.

## Data flow

```text
authored GLB clip name
        ↓ PF2 model.clips mapping
semantic clip id (walk / point / jump / ...)
        ↓ model-backed prefab or animation-capable character
Entity.animationClips
        ↓ PF3 animation timeline event
absolute Engine time → deterministic clip sample
```

Example PF2 model declaration:

```ts
model: {
  // ...
  clips: {
    walk: 'MF_Walk_Fwd',
    point: 'MF_Point_Right',
  },
}
```

Episode JSON uses only the semantic id:

```json
{
  "id": "hero-walk",
  "type": "animation",
  "at": 1.2,
  "target": "hero",
  "clip": "walk",
  "speed": 1,
  "blendIn": 0.15,
  "blendOut": 0.15
}
```

## Authoritative-time rule

PF3 does **not** use `mixer.update(delta)` as a playback clock.

For every evaluation, MindForge derives the source sample from the requested absolute
episode timestamp:

```text
local = engineTime - eventStart
sample = startOffset + local * speed
```

One-shot clips clamp to their source duration. Looping events wrap `sample` by the
source duration. The runtime writes the resulting sample time/weight onto paused
Three.js actions and calls `mixer.update(0)` only to evaluate the pose.

Therefore these paths share the same animation result:

- normal playback,
- pause/resume,
- restart,
- direct seek,
- backward seek,
- playback-speed changes at the Engine level,
- fixed-frame export.

## Event fields

| Field | Meaning |
| --- | --- |
| `target` | Entity id that exposes semantic authored clips. |
| `clip` | Semantic clip id, not the DCC/GLTF clip name. |
| `duration?` | Timeline window. If omitted, a one-shot uses its remaining natural clip duration; a loop runs to episode end. |
| `speed?` | Positive source playback rate. Defaults to `1`. |
| `loop?` | Wrap source clip time inside the event window. Defaults to `false`. |
| `startOffset?` | Seconds into the source clip where sampling begins. Defaults to `0`. |
| `blendIn?` | Deterministic weight ramp from the rest/other active clips. |
| `blendOut?` | Deterministic weight ramp at the end of the window. |

Explicit overlapping animation windows on the same entity are allowed. Their action
weights are evaluated at the same absolute timestamp, so authored transitions do not
depend on whether playback crossed the transition in real time.

## Runtime ownership

PF2's `RuntimeModelAsset.clips` is passed through `createModelPrefabFactory()` to the
scene entity as `Entity.animationClips`. Custom character/prefab factories may expose
the same optional entity surface when they own authored clips.

Animation is evaluated before procedural face/motion/property tracks. This gives the
authored clip the base pose while later semantic timeline systems can intentionally
layer or override it.

## Errors

Scene construction fails clearly when an `animation` event requests a semantic clip
that its target entity does not expose. The error includes the entity, event, requested
clip, and available semantic clip ids.

## Deliberately not in PF3

PF3 is the authored-clip runtime foundation. It does **not** add:

- animation state machines or behaviour graphs,
- automatic locomotion selection,
- IK,
- retargeting between unrelated skeletons,
- root-motion extraction/navigation,
- procedural breathing/head tracking/recoil systems,
- a character production pipeline,
- automatic animation generation.

Those capabilities can build on the same deterministic entity/clip surface later.
For current production assets, prefer in-place authored clips and keep scene travel in
MindForge motion/property choreography unless a later stage explicitly introduces a
root-motion contract.
