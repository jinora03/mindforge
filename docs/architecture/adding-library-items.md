# Adding library items

Every reusable capability follows the same shape: implement the Engine contract in the
appropriate component package, export a factory, and expose it under a stable semantic id.
Shared behavior (motions/cameras) is registered by the Library; theme-specific visual
implementations (characters/effects/environments/assets) are selected by `packages/themes/`.
Then content references only the stable id.

After adding anything, run:

```bash
pnpm typecheck && pnpm test && pnpm generate:catalog && pnpm validate:episodes
```

## Add a motion (humanoid or object)

1. Create `packages/motions/src/humanoid/<name>.ts` (or `objects/<name>.ts`).
2. Humanoid: use `bindHumanoidMotion(() => MotionClip.procedural(...) | MotionClip.fromKeyframes(...))`.
   Object: export a `MotionFactory` that captures the target's base transform and writes one
   channel deterministically from `ctx.localTime` / `ctx.progress`.
3. Export it from `packages/motions/src/index.ts` and add it to `MOTION_FACTORIES`
   (`motion.humanoid.<name>` or `motion.object.<name>`).

## Add an effect

1. Create `packages/effects/src/<Name>.ts` exporting an `EffectFactory` that returns an
   `EffectInstance` (`object3d`, `update(ctx)`, `reset()`, `dispose()`). Derive all state from
   the window context so it seeks deterministically; represent a real hidden state, not decoration.
2. Export it and add it to `EFFECT_FACTORIES` in `packages/effects/src/index.ts`.

## Add a camera preset

1. Create `packages/cameras/src/presets/<name>.ts` returning a `CameraDirector` configured
   for a reveal (never a passive orbit).
2. Export it and add it to `CAMERA_FACTORIES` in `packages/cameras/src/index.ts`.

## Add an environment

1. Create `packages/environments/src/<Name>.ts` exporting an `EnvironmentFactory` that returns
   an `EnvironmentInstance` (`object3d`, `defaultCamera`, `update`, `dispose`) and sets scene
   background/fog/lighting from `@mindforge/style`.
2. Export it and add it to `ENVIRONMENT_FACTORIES` in `packages/environments/src/index.ts`.

## Add a character

1. Implement the Engine `Entity` contract (expose anchors, a `PoseableRig`, `setFace`,
   `beginFrame` that resets to rest, `dispose`). Reuse `HumanoidRig` where possible.
2. Export a `CharacterFactory` and add it to `CHARACTER_FACTORIES` in
   `packages/characters/src/index.ts` under `character.<name>`.

## Add an asset

Add theme-neutral animation/audio descriptors to `SHARED_ASSETS` in
`packages/library/src/register-defaults.ts`. Add visual model/texture descriptors to the
relevant theme definition in `packages/themes/`. v0.1 descriptors are mostly `procedural`; a
future `.glb`/audio pipeline will resolve real files. Episodes reference asset **ids**, never
file paths.

## Add an episode

1. Create `content/episodes/<id>/episode.json` and `text.json`.
2. Reference only registered ids. Run `pnpm validate:episodes`.
3. Add it once to the shared `EPISODES` list in `content/catalog.ts`. Studio and Player
   consume the same catalogue.

## Add a visual theme

See [`themes.md`](themes.md). A theme must preserve semantic ids so existing episodes do not
need theme-specific JSON. Do not branch on a theme name inside the Engine or timeline.
