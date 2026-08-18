# MindForge Bible Implementation Map

> **Visual update:** Design Bible v1 palette/material rules are retired. Use `MindForge_Visual_Direction_v2.md` for current visual implementation decisions.

*Technical companion for the MindForge repository. This file maps the three creative Bibles to the proposed codebase; it is not a replacement for the Bibles.*

## Enforcement levels

| Level | Meaning |
|---|---|
| **Automatic** | The code, schema, registry, or validation tool can enforce the rule directly. |
| **Guided** | Shared presets and APIs make the correct choice easy, but a developer or Claude must still apply judgment. |
| **Episode-specific** | The rule depends on the topic, metaphor, composition, or choreography of an individual episode. |

## Design Bible → implementation

| Creative rule or system | Primary implementation | Enforcement | Notes |
|---|---|---|---|
| Void Ink, Deep Violet, Forge Violet, Signal Pink, Plasma Rose, Insight White, and Forge Spark | `packages/style/src/palette.ts` | Automatic | Export stable named color tokens and prevent episodes from redefining the core palette without an explicit override. |
| Void field, Transformation field, Revelation flare, and Rare discovery gradients | `packages/style/src/gradients.ts` and environment presets | Guided | Provide reusable gradient factories; the episode chooses the recipe that matches the current state. |
| Approximate 70/20/10 color ratio | Studio review tools and documentation | Guided | A runtime cannot reliably judge composition, but Studio can expose palette-use diagnostics later. |
| Faceted geometry as the shared object language | `packages/style/src/geometries.ts`, character factories, machine factories | Guided | Reusable factories should default to faceted forms and strong silhouettes. |
| Stable shape meanings: sphere/orbit, cube/tile, prism/shard, ring/gate, lattice/grid, contour surface, thread/beam | Library catalog and episode design documentation | Episode-specific | The schema can identify shape roles, but meaning must remain tied to the concept. |
| Hero, mechanism, signal, and atmosphere hierarchy | Environment and scene composition helpers | Guided | Scene builders should expose separate layers and render-order conventions. |
| Contours reveal hidden states and are never wallpaper | `packages/effects/src/ContourPressure.ts`, `ContourShockwave.ts`, `SignalPath.ts` | Guided | Effects require a semantic state such as pressure, force, memory, information, or probability. |
| Wide, compressed, flowing, bent, interfering, ruptured, and settling contour behaviors | Contour effect parameters and presets | Automatic / Guided | The effect API can expose these named states; the episode determines when they occur. |
| At least one hero object is deformed, generated, or revealed by a contour field | Episode review checklist and optional validator metadata | Guided | The validator can warn when an episode contains no contour event, but it cannot judge whether the use is meaningful. |
| Contour Glass, Forge Ceramic, Signal Light, Insight Core, and Void Velvet | `packages/style/src/materials.ts` | Automatic | Export reusable material factories with controlled defaults. |
| One narrative key light, restrained bloom, and silhouette-preserving rim light | `packages/style/src/lighting.ts` and `post-processing.ts` | Guided | Presets provide the baseline; episodes adjust intensity to express state. |
| One dominant idea per frame | Camera composition, scene layout, and review process | Episode-specific | This is a creative judgment and should not be encoded as a rigid runtime rule. |
| 9:16 safe zones and phone-size readability | Engine viewport, Studio overlays, and typography helpers | Automatic / Guided | Engine fixes the aspect ratio; Studio can display safe-zone guides. |
| Quiet, widely spaced typography and limited on-screen text | `packages/style/src/typography.ts` and text-event schema | Guided | Provide title, explanation, label, and artifact-lockup presets. |
| Artifact title card and recognizable thumbnail frame | Episode text presets and Studio capture tools | Guided | The episode still chooses the exact hero frame. |
| Logo confirms rather than creates recognition | Review checklist | Episode-specific | Approval should include a logo-hidden review. |
| Avoid generic technology-demo visuals, decorative motion, and uncontrolled neon | Documentation and approval scorecard | Episode-specific | These require human or creative-agent review. |

## Motion Bible → implementation

| Creative rule or system | Primary implementation | Enforcement | Notes |
|---|---|---|---|
| Motion is explanation rather than decoration | Motion-event metadata and episode review | Episode-specific | Every event should declare a purpose or conceptual role in authored content. |
| Camera motion creates curiosity; object motion creates meaning | `packages/cameras` and `packages/motions` | Guided | Camera APIs reveal and frame; motions carry the causal change. |
| Frequent meaningful change without constant chaos | Timeline diagnostics in Studio | Guided | Studio can flag long gaps without events and unusually dense event clusters. |
| Hook changes the frame within roughly 0.7 seconds | Episode validator warning | Automatic / Guided | Validate that a visible motion, camera, effect, or text event begins near the opening. |
| New meaningful beat every roughly 0.8–1.8 seconds | Timeline diagnostics | Guided | This should be a warning rather than a hard error. |
| Major transformation every 3–5 seconds | Timeline diagnostics and episode templates | Guided | Templates can reserve transformation beats; individual topics may require adjustment. |
| Direct animation using verbs such as reveal, route, compress, divide, assemble, transform, rupture, and settle | Motion registry IDs and timeline event vocabulary | Automatic / Guided | Use stable action names instead of vague instructions such as “make cinematic.” |
| Camera behaves like curiosity | `packages/cameras/src/CameraDirector.ts` | Guided | Presets should establish, inspect, follow, reveal, compare, and resolve. |
| No long passive drift or meaningless orbit | Camera presets and review checklist | Guided | Continuous orbit may exist only when conceptually justified. |
| Contour motion follows conceptual states | `packages/effects` | Automatic / Guided | Pressure, direction, distortion, rupture, and settling become reusable parameters. |
| Transitions are caused by the concept | Timeline composition and transition registry | Episode-specific | A transition should arise from splitting, folding, passing through a gate, field rupture, or another meaningful event. |
| Fifteen-second prototype structure | `content/templates/episode-15s.json` | Guided | Provide the Bible’s pacing as a starting template, not an unchangeable formula. |
| Thirty-second episode structure | `content/templates/episode-30s.json` | Guided | Use when the idea needs more comparison or explanation. |
| Sound lands on meaningful motion | Future audio-event schema and timeline | Guided | Audio is deferred in v0.1 but the schema should leave a clean extension point. |
| Creative timeline is separate from Three.js boilerplate | `packages/engine/src/Timeline.ts`, MindForge Script, registries | Automatic | Episodes declare events; the Engine owns rendering and playback. |
| One authoritative time source | `packages/engine/src/PlaybackController.ts` | Automatic | Motions, effects, cameras, and episodes receive time and delta from the Engine. |
| Deterministic playback, reset, and scrubbing | Timeline evaluation and effect reset contracts | Automatic | Components must derive state from playback time rather than private clocks. |
| Reuse geometry, materials, instances, and object pools | Engine/library performance conventions | Automatic / Guided | Reusable systems should avoid per-frame allocations. |
| Review at full size, phone size, and muted | Studio preview modes and checklist | Guided | Add phone-scale and mute-preview controls. |

## Universe Bible → implementation

| Canon rule or system | Primary implementation | Enforcement | Notes |
|---|---|---|---|
| MindForge is a conceptual universe where invisible forces take physical form | Episode concept and artifact metadata | Episode-specific | Every episode should define the invisible concept and its physical metaphor. |
| The viewer is the Observer and the camera represents attention | Camera system and episode grammar | Guided | A visible body is optional; camera behavior remains the default Observer expression. |
| The Forge is a dimension, not one planet, lab, or building | Environment system and documentation | Guided | Environments may vary widely while sharing canon laws. |
| Concepts become mechanisms | Artifact factories and episode review | Episode-specific | The artifact’s behavior must match the concept, not merely its appearance. |
| Fields reveal truth | Contour and field effects | Guided | Fields may be hidden or distorted but should represent an actual system state. |
| Visual state is semantic | Theme tokens + effect `tone` + prefab factories | Guided | Episodes describe meaning; each theme owns the actual palette/material treatment. |
| Nothing is merely decorative | Episode review and event-purpose metadata | Episode-specific | Supporting elements must contribute concept, scale, mood, or navigation. |
| Transformation is normal | Motion/effect library | Guided | Unfold, divide, invert, merge, and scale-change actions should be reusable. |
| Lore is optional enrichment, never a prerequisite | Content review and episode schema | Guided | Public question and explanation remain complete without artifact numbers or backstory. |
| Domains organize episodes | `content/scenes`, environment registry, and episode metadata | Automatic / Guided | Episode schema should accept one dominant domain and at most one secondary influence. |
| Domain mixing uses a visible transition | Gate, field-change, and material-transition effects | Episode-specific | Cross-domain episodes must show the transition rather than silently changing style. |
| Artifact taxonomy: Core, Engine, Loom, Gate, Mirror, Garden, Well, Archive, Crown, Labyrinth | Episode schema enum and naming helpers | Automatic | New types require a deliberate schema and canon update. |
| Internal artifact name, public question title, and optional artifact number | Episode metadata and title templates | Automatic | Keep the lore name separate from the searchable public title. |
| Recurring motifs: Observer, Forge Signal, Spark, Contour Fields, Threshold Gates, Echoes | Library catalog and content conventions | Guided | Motifs should retain their documented functions across episodes. |
| Episode story grammar: Arrival, Activation, Distortion, Revelation, Echo | Episode templates and timeline labels | Guided | The timeline can store beat labels; exact timing remains episode-specific. |
| Lore depth: Surface, Pattern, Deep | Content metadata and review | Guided | Surface explanation is mandatory; Pattern and Deep layers are optional. |
| Outside-canon boundaries | Review checklist and Claude Project Instructions | Guided | Prevent direct aesthetic copying, generic cyberpunk defaults, random symbols, lore dumps, and retention-only violence or horror. |

## Responsibility boundaries

| Area | Uses the Bibles to… | Must not… |
|---|---|---|
| `packages/engine` | Execute time, scenes, timelines, entities, and registered capabilities. | Parse Bible documents at runtime or know specific artifacts, domains, or episodes. |
| `packages/style` | Encode palette, materials, gradients, lighting, typography, and post-processing defaults. | Decide the metaphor or choreography of an episode. |
| `packages/motions` | Provide reusable human and object motion vocabulary. | Own global time, renderer setup, or episode timing. |
| `packages/effects` | Express fields, contours, signals, information, pressure, reaction, and revelation. | Hardcode Artifact 001, Artifact 002, or fixed timestamps. |
| `packages/cameras` | Express the Observer’s curiosity through reusable shot grammar. | Contain episode-specific narrative sequences. |
| `packages/environments` | Implement domains and reusable spatial stages. | Lock a domain to only one topic. |
| `packages/library` | Register stable IDs for assets, characters, motions, effects, cameras, and environments. | Reimplement those systems or contain episode scripts. |
| `content` | Apply the Bibles to actual artifacts, scenes, text, and timelines. | Create renderers, clocks, or duplicated reusable infrastructure. |
| `apps/studio` | Preview, inspect, validate, and review Bible compliance. | Own animation behavior that belongs in packages or content. |
| `apps/player` | Play a selected episode cleanly. | Add editor logic or alter episode meaning. |

## Suggested Studio review warnings

These are warnings, not hard build failures:

- No visible change begins during the opening hook window.
- A long section has no meaningful timeline event.
- The episode contains contour effects but no documented conceptual state.
- The episode uses an unknown or non-canon palette token.
- More than one dominant environment/domain is declared.
- The public title, internal artifact name, or surface explanation is missing.
- No revelation or major transformation beat is identified.
- No phone-safe text region is used.
- No final Echo or resolved frame is identified.

## Source-of-truth rule

When this implementation map conflicts with a Bible, the relevant Bible is authoritative for creative intent. Architecture documentation is authoritative for code ownership and dependency direction.
