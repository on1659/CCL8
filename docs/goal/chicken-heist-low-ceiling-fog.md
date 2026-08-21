# goal: chicken-heist-low-ceiling-fog

## One-line Goal
Make the interior read as a maze: lower the barn ceiling (210 → 132) and add indoor-only
short-range fog so the player cannot see across the floor — render-only, zero AI/LOGIC contact.

## Background / Motivation
Developer report (2026-08-21): "맵이 미로같지 않아. 들어가면 천장에 조명이 없지만 다 보여.
천장이 낮아져야 되고 멀리 볼 수 없어야 돼." Recon found two mechanical causes:
1. **Fog never applies indoors** — `Fog(sky, 1190, x1+700)`: near 1190 exceeds the barn
   diagonal (~2040 at most sightlines), so the entire current floor renders fog-free.
   With v0.25 restoring the torch + personal glow, geometry is readable across the hall.
2. **114u of open air above the maze walls** — maze partitions are 96 tall but the ceiling
   sits at 210, so the ceiling plane and tall cage rows read as one big warehouse volume
   over the wall tops, killing the corridor illusion.

## In-scope
- `BARN_H` 210 → 132 (`?tall=1` dev A/B flag restores 210 + old fog, BRIGHT_AB pattern).
  Consumers that follow automatically: roof plane, B1 ceiling, cage/plug tall stacks,
  bulb-row anchor, bird's-eye camera clamp, egg ceiling clamp (physics — see Must-Preserve).
- Stair-shaft wall render literal `480/-270` → `BARN_H+270/-270` (top stays flush with the
  new ceiling instead of poking 78u above the roof).
- Bulb fixture hang offsets raised (cord −8 / shade −16 / bulb −24) so the bulb bottom (103)
  clears the jump-apex eye height (98).
- Indoor fog: when the viewer is inside (`inZoneOrCorr(P())` — barn, B1, stair corridor),
  fog lerps to near 70 / far 480 (torch 350 + tail = next junction readable, black beyond);
  outdoors it lerps back to 1190 / BARN.x1+700 (unchanged values). Driver in `updWorldUI`
  (render-state single writer), smooth ~0.3s transition, no pop at the door.
- `doorSpill` material `fog:false` — the "only far light point visible from the spine during
  blackout" contract survives the short fog.
- Ledger note in CLAUDE.md (fog-invariant comment reinterpreted as outdoor-only, by
  developer request); version bump v0.25.0 → v0.25.1 (3 places).

## Out-of-scope
- Any AI/LOGIC constant — sight logic (`lineBlocked`) is planar; wall/ceiling heights never
  touch it. Detection radii, speeds, aggro: 0 changes.
- `SEG_H.wall` 96 (throw-over-wall tactic), `SEG_H.cage/plug` 210 literals (always ≥ new
  ceiling → egg-collision behavior byte-identical; comment already documents the coupling).
- Maze topology/generation, minimap, lamp/lighting intensities (HEMI/MOON/torch untouched —
  flicker-formula coupling rule not triggered).
- Door-frame beacons stay fogged (near-field wayfinding only); only doorSpill is exempt.

## Acceptance Criteria
- [ ] Indoors (1F, B1, stairs): fog near/far settles to 70/480; standing on the spine, the
      far end of the floor is not readable; outdoor fog returns to 1190/x1+700 in the yard.
- [ ] Ceiling renders at 132; door-frame beacon tops (≤115) and bulbs (≥103) fit under it;
      no camera clip at jump apex (98) in first or third person (indoor TP cam y ≈ 80).
- [ ] Egg ceiling clamp follows automatically (`groundY+BARN_H-EGG_R`) — no cross-floor arcs.
- [ ] doorSpill visible from deep in the spine during blackout despite far=480.
- [ ] `?tall=1` restores 210 ceiling + static old fog (dev A/B only).
- [ ] `node --check` passes; `CCL8_VERDICT.bad` empty; layout hash unchanged for a fixed
      seed (generation untouched); version reads v0.25.1 in title tag, title-screen sub,
      and PROTO_V.

## Related Files / Modules
| File | Role |
|------|------|
| D:\Work\vibe\CCL8\chicken-heist.html | Single-file game — all edits land here |
| D:\Work\vibe\CCL8\CLAUDE.md | Decision ledger — fog-invariant reinterpretation note |

## Must-Preserve
- "렌더+계란 물리 동기" (v0.6): the egg ceiling clamp reads `BARN_H` directly, so lowering
  the constant keeps render and physics in lock-step by construction. Accepted nuance: a
  yard lob arcing above 132 can now clear the perimeter into the barn (yard is exempt from
  the clamp); this direction is useless to the thrower — no exploit.
- Outdoor fog values byte-identical — the truck-visibility rationale behind the old
  "fog near/far 불변" comment now scopes to the yard; from inside the doorway the truck
  fades, and stepping out reveals it (accepted, developer-requested).
- Blackout machinery: fog *color* keeps following `_sky` (updSky untouched); only near/far
  become dynamic. HEMI/MOON/flicker formula untouched.
- Host authority & net: all changes render-only or host-side physics via existing mirror;
  zero new net messages; `?tall=1` never ships in friend links (dev-local convention).
- Body scale freeze: `SEG_H.wall/hay/crate/…`, PLR_R, JUMP_V untouched.

## Existing Integration Contract
- `updWorldUI` is the render-state single writer (torch precedent) — the fog driver lives
  there; nothing else may write `scene.fog.near/far` (updSky keeps owning `fog.color`).
- `inZoneOrCorr` is shared with the egg clamp and bird's-eye clamp — reuse, do not copy.
- Stair corridor counts as indoors (zone 2) so descending reads as going deeper, not
  stepping outside.

## Execution Notes
- Recommended model: Claude Fable 5 (current top-tier) for the fog-driver placement and
  ceiling-coupling sweep — contract-dense file where the cost is missing a consumer.
  Mechanical parts (version bump, literal swaps) would be fine on a cheaper model (Sonnet).
- This document cannot enforce the model — the executing session's `/model` setting decides.
  If the session model is below the recommendation, surface it to the user and confirm
  before proceeding.
