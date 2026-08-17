# Production Content Sprint — Implementation Plan

This plan turns the Artifacts 006–019 slate into reusable MindForge capabilities before resuming editor-heavy phases.

## Build rule

When an episode needs a new visual or sound, first ask whether it is a reusable **environment**, **prefab/model**, **effect**, or **audio cue**. Add it at the appropriate registry/theme/audio boundary. Do not bury reusable geometry or sound logic inside one episode timeline.

## Order of work

### 1. Wave 1 shared capabilities

Build `environment.materialLab`, `environment.classroomLab`, and `environment.kitchenLab` in both themes. Add material samples, balloon, demo panel, float tank, bowl/spoon rig, and the lab/classroom/kitchen audio pack. Then author Artifacts 006–009 against only those semantic IDs.

### 2. Wave 1 verification

Run the full gate, then manually inspect every episode in Voxel and Toybox. Specifically verify anchor targeting, prop scale, camera framing, environment readability, audio timing, caption safe zones, and full/current-shot export.

### 3. Wave 2 mechanics pack

Only after Wave 1 is stable, add the minimum new capabilities for Artifacts 010–013: vehicle cabin + seat rig, drop lab + feather/rock rig, paper plane, magnet kit, and their semantic sound cues. Reuse Material Lab/Classroom Lab where possible.

### 4. Wave 3 outdoor/optics pack

Build Canyon, Rain Meadow, Night Overlook and Observatory as distinct reusable places. Add only the optical/source props needed for rainbow, Moon and twinkling-star episodes. Prefer existing generic signal/information/reaction effects until a repeated visual need proves a new effect family is justified.

### 5. Wave 4 city/pressure pack

Build City Rain and soda bottle/bubble capabilities. Reuse Kitchen Lab for Artifact 019 rather than creating another kitchen variant.

## Regression strategy

Each wave should add a small capability-parity test that ensures every newly registered environment/prefab exists in both themes. Production workflow tests must discover episodes dynamically; never hardcode the current highest artifact number again.

## Audio strategy

Fallback audio must remain deterministic and seek/export safe. Do not block episode authoring on final recordings, but track publish readiness separately with `validate:audio:production`. High-quality recordings can replace the stable semantic cue paths later.

## Stop conditions

Do not continue adding infrastructure during the content sprint unless a real episode cannot be authored cleanly with the current semantic system. If a problem is local to one episode, solve the content. If the same problem appears repeatedly, promote it into a reusable capability and document why.
