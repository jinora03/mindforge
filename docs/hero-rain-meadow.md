# PQ3 — Hero Rain Meadow

`environment.rainMeadow` is MindForge's first environment built against an explicit production-quality composition target rather than a generic reusable-room target.

## Production intent

The environment is still owned by the Voxel theme and still resolves from the same semantic episode id. Episode JSON does not know how the meadow is assembled.

The scene is deliberately layered for portrait cinematography:

1. foreground framing — ferns, rocks, tall grass;
2. hero clearing — protected central action space for the optical subject;
3. midground terrain — stepped voxel ground, wet path, puddles, trees, fence and vegetation;
4. horizon — layered hills and a distant forest silhouette;
5. sky — dense storm-cloud banks with a controlled sun gap;
6. weather — deterministic rain driven only by authoritative Engine time.

## Quality rules established here

- Do not represent outdoor terrain as one large tinted floor slab.
- Use grass-top / grass-side / dirt material separation so terrain reads as authored voxel ground.
- Preserve foreground, midground and background depth in 9:16.
- Keep a deliberate action clearing rather than scattering detail uniformly everywhere.
- Prefer instancing for dense repeated vegetation/weather instead of hundreds of unique meshes.
- Deterministic environmental motion must reconstruct exactly at the same timestamp.
- Environment detail may be procedural, authored GLB assets, or a hybrid; episode content must remain semantic either way.

## Deliberate PQ3 boundary

PQ3 improves environment composition and visual density. It does **not** attempt to finish the rain/water/atmosphere simulation or the rainbow optical hero effect. Those belong to PQ4 and PQ5 so the quality work stays testable and does not accumulate into one risky patch.
