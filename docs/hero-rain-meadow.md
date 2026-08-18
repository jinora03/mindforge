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
6. weather — depth-layered deterministic rain, ground splashes and drifting mist driven only by authoritative Engine time.

## Quality rules established here

- Do not represent outdoor terrain as one large tinted floor slab.
- Use grass-top / grass-side / dirt material separation so terrain reads as authored voxel ground.
- Preserve foreground, midground and background depth in 9:16.
- Keep a deliberate action clearing rather than scattering detail uniformly everywhere.
- Prefer instancing for dense repeated vegetation/weather instead of hundreds of unique meshes.
- Deterministic environmental motion must reconstruct exactly at the same timestamp.
- Environment detail may be procedural, authored GLB assets, or a hybrid; episode content must remain semantic either way.

## PQ4 — Production weather, water and atmosphere

PQ3 improved environment composition and visual density. PQ4 adds the production weather/water pass without changing episode semantics:

- far / mid / near rain layers create real depth in portrait camera moves;
- deterministic ground splashes connect rain to the terrain;
- physical voxel-water puddles use controlled clearcoat and subtle time-driven surface motion;
- tall grass and cloud banks move from authoritative Engine time;
- exponential fog plus thin drifting mist separate the horizon;
- rainy-day lighting is intentionally reduced so bright surfaces do not wash out.

## Deliberate PQ4 boundary

The rainbow optical hero effect itself remains untouched. That belongs to PQ5, so weather quality can be reviewed independently from the scientific hero VFX.
