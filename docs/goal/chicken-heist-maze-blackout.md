# goal: chicken-heist-maze-blackout

## One-line Goal

v0.5: turn the barn interior into a committed-topology maze, make chickens fewer and genuinely able to navigate it, move eggs to realistic cage-side tray anchors, and implement the blackout-return stage (trigger = picking up the last needed egg, end = delivering it) with the v1 sound-wave visualization ported as this round's ONE new system.

## Background / Motivation

Developer playtest of v0.4 (2026-08-11): ① it must be a maze but isn't ② chickens are dumb yet numerous ③ egg placement is unrealistic ④ maze matters more than width ⑤ "when do the lights go out? they never do."

Item ⑤ required lifting the guardrail "blackout stage starts only after friend reactions" — lifted by developer decision (recorded in CLAUDE.md and the design doc). Items ①④ reverse the earlier "enlarge only, no maze" decision — developer's call, recorded. A 5-agent adversarial panel (maze topology / code-audit / chicken AI / scope audit + cross-exam) reviewed the draft; 31 objections and 10 cross-contradictions are reconciled below.

## In-scope

- **Maze**: 48-cell topology (8 aisles × 6 columns) committed as plug/opening bit literals; segment geometry expanded at load from COOP_SCALE (12 → barn 4440×3840). Spine aisle (door-aligned, plug-free, full openings) preserves the 3-second read; perimeter corridors cut; 2 doors total — west main + east hole (entry-only one-way); dead-ends 5±1 at depth ≤1 cell with plugs at half-cell so a run-burst wave reads pocket entrances
- **Load-time validation suite** (new cost, honestly accounted): all-cell reachability, tray golden-path junctions 4–9, dead-end count/depth, tray-path 2-edge-connectivity, all trays ≥1800 from the west door (kills the "short dark carry" exploit), spine distance ≤3 cells, guardian adjacency + monotonic near/mid/deep depth
- **Chicken nav rework**: door-waypoint navTo replaced by the maze cell graph (all-pairs next-hop at load; same signature; used by chase/invest/rob/return). LOS → direct steer (keeps the overshoot slapstick); no LOS → graph path. Chicken-chicken soft separation r24
- **Chicken AI**: 10 chickens (seeded homes; every tray guarded by ≥1 adjacent-zone chicken). Sound wakes → **invest** (fixed origin — chickens arrive where you WERE, not where you are; minimal contract: single point, 2 s dwell, return, retarget cd 2 s, chain ≤2). Chase live-updates only on confirmed sight or ≤1.2 s fresh confirm; **indoor chase demotion after 1.5 s without sight/fresh wave** (the blackout escape valve; also restores hide-and-seek when lit). `chickenSee()` split from player sight: lit 240/160, dark 80, glowing-egg carrier 200
- **Egg realism**: floor nests removed; 6 eggs on cage-side tray anchors (torus mesh repositioned — no new art). Scarcity fiction, one title line: "저녁 수거는 끝났다. 밤사이 새로 낳은 알만 남았다." Fully deterministic placement (runIdx variation documented as a future knob only)
- **Blackout**: trigger = pickup while delivered==2; logic flips at t=0 (no input freeze); visual = 0.25 s flicker + sound (cascade deferred). Kept lights: pad glow, headlights clamped to 700 (no indoor bleed), carried-egg lantern = ONE singleton PointLight (140/0.85, player-carry slot only; robbed/ground eggs emissive-only, raised to 0xffe8c4). Release set = {3rd delivered (win), fail} — losing the egg does NOT restore lights (`// 임시:`), re-pickup re-darkens nothing (already dark). Abandoned glowing egg (>200 from player AND >3 s) becomes a rob target — never peck/eaten (protects the E-setdown escape combo and prevents swallow-loss of the final egg). Door-frame emissive markers + doorway light-spill plane = honest beacons (depth-occluded). Blackout footprint breadcrumbs (1 dim dot/step, ~20 s life). Fail/win restore lights (failure must be watchable). `?dark=0` dev-only isolation flag — friend links always ship defaults
- **Wave visualization (the ONE new system)**: v1 port verbatim — castAll rays (540; 180 for footsteps), 400 u/s front, wall stamp columns + floor rings; separate WAVE pool 40,000 (FX pool 7,000 untouched — protects fail-ceremony debris); FP sqrt+1.9× own-sound visual boost. Active during blackout only. **Two-column event table — LOGIC column is v0.4 constants unchanged (zero lit-phase balance changes)**:

| Event | VIS radius | LOGIC (unchanged v0.4) |
|---|---|---|
| walk step | 180 | 0 (silent-walk contract preserved) |
| run step | 310 | aggro 310 |
| egg land | 300 | decoy 240 |
| egg break | 380 | decoy 240 |
| shove | 200 | noise 200 |
| pickup | 120 / 310 | noise 120 / 310 |
| chicken cluck | 260 (dark period 2.5–4.5 s, ≤600 only) | 0 — `// 임시:` (settles "do chickens cry" as VIS-only) |
| robber strut | 180 (period 1.5 s) | 0 |

## Out-of-scope (panel-cut this round)

- Lights-out cascade sweep (flicker instead; cascade = deferred polish), chicken-cry aggro (VIS only — chicken-wakes-chicken storm), walk-step aggro (silent-walk contract inviolable), runtime maze generator (run once offline, commit literals), tray mesh art, 60u grid flow field, invest beyond its minimal contract, wave-front-riding aggro (candidate noted, not built), egg-placement runIdx variation, everything in CLAUDE.md's hold list

## Design Decisions (panel-settled — do not relitigate during implementation)

- Lantern 140 < seen-at 200 — "the light buys you 140 and sells you at 200" IS the stage's tension. (Rejected: 260 — lights the next junction, waves become decoration)
- "Egg is visible" (emissive, safe to raise) and "egg illuminates" (light, capped) are independent knobs — the doc's "core scale" resolved
- Sound wakes go to fixed-origin invest, never live chase — kills wall-hack pursuit and pincer interception structurally. (Rejected: chase-with-frozen-target parameter — that's invest with a different name)
- Cell-graph BFS nav (48 nodes) over 60u flow field — 1/5 the code, single source of truth with the maze data, makes "nav repair" accounting honest
- Maze topology = data (bit literals), geometry = derived (COOP_SCALE) — reconciles "commit data, not generators" with "everything derives from dimensions"
- One-way east hole via collision-side check (inside→solid, outside→pass) — cheapest honest one-way door
- Blackout latch: only win/fail restore lights; empty pad arrival does not (`// 임시:` — cheapest exploit-free reading of "end = pad arrival": arriving WITH the egg is the win)
- Deterministic everything for v0.5 (friend test = one run; variation knobs documented, not built)
- Ship gates: the lit-maze 3-second read and the final "white egg waddling in the dark, dots swarming behind" clip are developer judgments — build stops and reports; stage live/die is decided only after the wave port (not before)

## Acceptance Criteria

- [ ] `node --check` passes; zero console errors; validation suite passes on load (all 8 asserts)
- [ ] Chickens traverse the maze without wall-grinding in chase/invest/rob/return (smoke: chicken crosses ≥3 cells to reach a target)
- [ ] Sound wake sends chickens to the wave origin, not the player's live position; indoor chase demotes after 1.5 s without confirmation
- [ ] Blackout triggers exactly on picking up the last needed egg; flicker ≤0.25 s; no input freeze; lantern follows carried egg only; fail/win restore lights
- [ ] Abandoned glowing egg gets robbed (never eaten) after 200/3 s grace
- [ ] Waves render only in blackout, occluded by walls; lit-phase logic constants byte-identical to v0.4
- [ ] All trays ≥1800 from west door; first tray visible from the door along the spine
- [ ] `?dark=0` disables the blackout trigger; default link behavior unchanged
- [ ] Version bumped to v0.5 in all three places

## Related Files / Modules

| File | Role |
|---|---|
| D:\Work\vibe\CCL8\chicken-heist.html | The prototype — maze/nav/AI/blackout/wave rework |
| D:\Work\vibe\CCL8\reference\sound-is-light-3d.html | Wave system donor (castAll/front/stamps — port verbatim) |
| D:\Work\vibe\CCL8\docs\design-cooking-extraction-20260809.md | Guardrail lift + decision log recorded |
| D:\Work\vibe\CCL8\CLAUDE.md | Blackout start-condition guardrail updated |

## Must-Preserve

- Plane logic / seg map / single circle-seg collision; single HTML file, three.js r128, Korean UI; `node --check` flow
- Egg state machine (jostle/slip/crack/rob), decoy-eat, shove spec, victory flap + stand-up invuln, E-setdown absolute safety (L870 contract)
- Silent-walk contract (aggro 0) in ALL phases; v0.4 LOGIC constants in lit phase (zero changes)
- No instant death: every dark-phase dead-end must leave the setdown→shove→repick escape physically possible; robber strut 55 + glowing robbed egg + strut-cluck breadcrumbs keep retrieval always open
- Failure is a spectacle: lights restore for the fail ceremony; FX pool isolated from wave pool
- V-key FP/TP toggle; version bump discipline (3 places)

## Execution Notes

- Recommended model: Claude Fable 5 (current session — meets recommendation) for maze generation constraints, AI state transitions, and wave/blackout integration; these are interlocking-rule systems where wrong interactions silently kill strategy routes. Sonnet acceptable for literal-data plumbing and HUD text.
- This document cannot enforce the model — the executing session's `/model` setting decides. If below recommendation, surface and confirm.

## Fairness Constraints

- Single-player; all outcome rules deterministic (fixed maze/egg/chicken literals, no outcome RNG) — failures learnable, friend runs comparable
- Wave VIS radii may never silently change LOGIC radii — two-column table is the contract

## Existing Integration Contract

- Standalone file; pointer-lock flow unchanged; localStorage unused this round (runIdx documented only)

## Open Questions

(none — probed in Phase 1, settled by developer confirmation or panel `// 임시:` minimums)
