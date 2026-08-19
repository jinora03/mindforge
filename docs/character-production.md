# PF7 — Character Production Pipeline

PF7 makes authored GLB/GLTF characters first-class MindForge entities without adding a second animation or behavior system. It composes the foundations that already exist:

```text
PF2 authored model + semantic anchors/joints/clips
                     ↓
PF7 production character adapter
              ↙              ↘
PF3 authored clips      PoseableRig motions
              ↘              ↙
        deterministic final pose
```

## Production character contract

A URL-backed model with `model.category: 'character'` must also declare a PF7 `character` profile:

```ts
{
  id: 'model.character.guide.standard',
  kind: 'model',
  url: 'assets/voxel/characters/guide-standard.glb',
  anchors: {
    head: 'MF_Anchor_Head',
    chest: 'MF_Anchor_Chest',
    handLeft: 'MF_Anchor_HandLeft',
    handRight: 'MF_Anchor_HandRight',
    // ...all canonical HUMANOID_ANCHORS
  },
  model: {
    category: 'character',
    quality: 'hero',
    units: 'meters',
    upAxis: 'Y',
    forwardAxis: '-Z',
    origin: 'ground-center',
    materialPolicy: 'embedded-pbr',
    clips: {
      idle: 'MF_Idle_A',
      walk: 'MF_Walk_Fwd',
      point: 'MF_Point_Right',
    },
    budget: MODEL_BUDGET_PRESETS.hero,
  },
  character: {
    rig: 'humanoid',
    rootMotion: 'in-place',
    joints: {
      hips: 'Rig_Hips',
      spine: 'Rig_Spine',
      chest: 'Rig_Chest',
      // ...all canonical HUMANOID_JOINTS
    },
  },
  provenance: { source: 'original' },
}
```

DCC bone/node names are implementation details. Motions use canonical joint names; effects/cameras/props use canonical anchors; timeline animation uses semantic clip ids.

## Required anchors and joints

Production humanoids expose every `HUMANOID_ANCHORS` entry using `MF_Anchor_*` nodes and map every `HUMANOID_JOINTS` entry to one unique authored skeleton node. This keeps reach/contact/camera/effect choreography portable across different authored characters.

Anchors are interaction points. Joints are pose controls. Do not use skeleton bone names directly in episode JSON.

## Root motion

PF7 currently requires:

```text
rootMotion: in-place
```

Authored clips may move the skeleton for gait/action motion, but world travel belongs to MindForge entity transforms/motion choreography. This avoids hidden displacement state and preserves exact seeking/export behavior. A future root-motion contract must remain absolute-time-derived before this rule changes.

## Runtime layering

A production character uses an outer staging root and a dedicated procedural motion root:

```text
Episode entity transform
        ↓
character staging root
        ↓
procedural motion root
        ↓
authored GLB root / skeleton
```

Every frame:

1. PF7 restores the authored rest pose and clears procedural root offsets.
2. PF3 samples authored clips from absolute Engine time.
3. existing deterministic `motion.humanoid.*` actions add semantic joint/root offsets.
4. later timeline property/visibility work proceeds normally.

No `AnimationMixer.update(delta)` or independent character clock is introduced by PF7.

## Registering a production character

Use `createModelCharacterFactory(assetId)` in theme/library registration:

```ts
characters: {
  'character.guide': createModelCharacterFactory('model.character.guide.standard'),
}
```

Episodes then use only:

```json
{
  "id": "guide",
  "type": "character",
  "factory": "character.guide"
}
```

The GLB asset id/file path remains a theme/library implementation detail.

## Facial animation

PF7 does not invent a generic facial-rig/blendshape contract yet. Existing procedural characters keep their current `FaceState` implementation. Authored facial clips may be introduced later through an explicit production contract rather than guessing morph-target conventions across vendors/DCCs.

## What PF7 deliberately does not add

PF7 is not a behavior or navigation system. It does not add AI brains, pathfinding, IK, automatic locomotion selection, retargeting, lip sync, or PF8 semantic directing. It establishes a safe reusable authored-character surface for those later capabilities.
