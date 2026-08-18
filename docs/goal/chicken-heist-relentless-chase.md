# goal: chicken-heist-relentless-chase

## One-line Goal
Make a chase feel like being hunted: chickens stop being *forbidden* from pursuing, corner properly, send one flanker, and no longer forget you the instant you punch them — while a three-rung escape contract keeps 즉사 금지 intact.

## Background / Motivation
Developer (2026-08-18): "몬스터가 너무 바보같아. 쫓아오다가 갑자기 혼자 뒤로가고그래서, 너무 무섭지않아. 좀더 똑똑하게 잡기 어렵게 만들어줘." All four reported symptoms confirmed in code by a 3-agent recon; designed by a 5-agent panel + cross-examination (runs wf_22e31e3f-a6f, wf_83473ed1-dc4).

**The diagnosis inverts the request.** Chickens are not slow — they are forbidden from pursuing:
- Sustained carrying flight is **118.2 u/s**, already *below* chase speed 124. The documented escape valve (152.6 > 124) is a **6-second burst number only**.
- What actually saves the player is `hd>CHK_LEASH` measured from an anchor **frozen at chase start** (280u < one 300u cell — a chicken cannot chase you out of the room it started in), plus a bare-literal rule `!carriesEgg(tp) && td>170 → return` that one **Q keypress** (pocket) triggers while you keep 100% of the loot.
- And the largest one: a non-KO shove sends a chaser **home** (`chicken-heist.html:3710`, comment: "밀치기 탈출 버프 — 의도된 변경"). A 0.70s button erases a pursuer, reach 60 vs catch radius 28, sustainable forever.

So the round removes artificial give-up rather than buffing speed. That automatically satisfies the developer's ruling (carrying players become catchable: 118.2 < 132) while preserving the empty-handed valve by construction (168.9 > 132).

## Developer rulings taken during probing
- Escape valve **released while carrying** ("운반 중엔 해제"); difficulty ceiling "확실히 어렵게" (extraction may drop; a wiped night is acceptable).
- **Punch buff reversed** — a shoved chaser resumes instead of going home (reverses the v0.20 intentional decision at :3710; PUSH_STUN 0.8→0.55 ships only as part of this reversal).
- **`!` marker stays wall-occluded** — v0.16 "내눈에 보이지않는 몬스터여야돼" upheld. Panel's pre-committed consequence adopted: **CHASE_BUDGET 14 → 10**, because an unfair long chase is worse than a short one.
- **Cart stays as-is** — a loaded solo hauler can be run down in the yard (105.6 vs 88.7); releasing the cart is always available, so this is a tradeoff, not a hard-lock.

## In-scope
- P0 prerequisite bug commit (stagger desync + dead constant), landed and measured before any AI edit.
- Chase termination rewritten: budget + floor + release, replacing the frozen-anchor leash **in the chase branch only**.
- `holdsLoot()` retention predicate (closes the Q-pocket exploit).
- A legible give-up beat (`?` + head-swivel + trudge home) on every chase exit.
- Bounded two-hop search; stairwell/yard coordinate clamp; dead-prediction repair.
- One cutter (flanker) per target, deterministic, host-only, zero tuple cost.
- steerMove correctness (zero-distance guard, arrival damping, point-target brake), CHASE_TURN so a chaser can corner inside its own aisle, TURN_DRAG so corners remain counterplay.
- Shove resumes the chase; PUSH_STUN 0.55; decoy no longer resets a chaser locked onto its thrower.
- onCaught no longer pacifies **active chasers**.
- CHK_CHASE 124→132, OUT_CHASE_MULT 0.75→0.80.
- ck tuple gains one `flags` int (bit0 = rage) so clients can render the crimson rage `!` at all.
- Assertions A1–A12 in the load-time self-check; PROTO_V bump; CLAUDE.md exception-ledger entry.

## Out-of-scope (explicit non-goals)
- **Detection is untouched** (P6, unanimous). Empty-handed players stay structurally invisible to sight; every acquisition radius is byte-identical: SIGHT_IN 110, SIGHT_OUT 73, DET_NEAR 40, DET_RATE_*, DET_DECAY, DET_GRACE, AGGRO_RUN 130, PACK_R 200, REVENGE_R 92, KILL_ALARM_R 700, CHK_LEASH 280.
- No player speed/stamina changes (SPD_RUN, SPD_WALK, CARRY_MULT, CART_MULT, all stamina constants frozen) — they re-price the raccoon valve, the cart and the whole v0.21 economy.
- New CK_STATES for hunt/giveup; a search sub-FSM with memory; LUNGE; path objects/smoothing/flow fields; widening `lineBlocked` to body width; raising CHK_SEP_R; more than one cutter; any RNG in role assignment.
- Changes to PUSH_R / PUSH_KB / PUSH_CD / PUSH_STAGGER / KO_T / KILL_CD; any new failure state, resource, verb or keybind; any HUD element.
- The `!` wall-vision proposal (developer ruled against; CHASE_BUDGET=10 is the accepted substitute).

## Design Decisions (panel-settled — do not relitigate during implementation)
- **P0 prerequisite, separate commit, measure baseline before AI edits.** `spd*=0.4` is applied **twice** on the host (0.16×) and **zero** times in clientPredict (1.00×) — a 6.25× host/client rubber-band, and it diverges exactly during the moments this round is about. Delete the duplicate; add the missing line to clientPredict. Also delete the unused `OUT_LOSE_T`. Record as a **player buff**, not a fix: staggered players get 2.5× faster inside a difficulty round.
- **P1 chase termination.** Delete `if(hd>CHK_LEASH){c.state='return';}` **from the chase branch only**; CHK_LEASH stays 280 and stays in force at `toInvest` (its role narrows from bounding pursuit to gating invest recruitment). A chase now ends on exactly three conditions, none of them a radius: **(a) budget** `c.t > CHASE_BUDGET(10)` — `c.t` is already the chase-elapsed timer, so zero new fields; `c.t=0` at the alert→chase transition; the budget **never** refreshes on re-sighting. **(b) floor** `zoneOfArea(c.x,c.z) !== zoneOfArea(c.ax,c.az)` — replaces the leash's structural job with no magic number and promotes the stairwell to a real tactical asset. **(c) release** `!holdsLoot(tp) && c.revengeT<=0 && td>DEAGGRO_R(170)` — names the bare literal at its existing value. The existing LOS demote stays the ordinary ending. (Rejected: raising CHK_LEASH — self-check 10 caps it at 300 vs gap 350, a 7% change worth nothing, and raising the gap moves B1.x0, regenerating every seed and detonating the v0.15 hash gate for existing invite links.)
- **P1b `holdsLoot(p)`** = `p.held || p.pocket || (cart.owner===p.idx && cart.slots.length>0)`, used in **exactly one place** (the retention clause). `carriesEgg` stays byte-identical — widening it would make pocket-carriers sight-*acquirable* for the first time, a detection change wearing a retention costume. Reads out loud: *pocketing hides you from eyes that have not found you, never from a bird already on you.*
- **P2 the give-up beat.** Every exit through (a)(b)(c) runs `breakChase(c)`: `state='invest'; ivX/ivZ=c.x/c.z; ivArr=true; t=CHASE_BREAK_T(1.2); det[tgt]=0; chaseCd=CHASE_CD(3)`. This renders with **zero new parts**: `?` shows (invest), the 두리번 head-swivel plays (invest && ivArr), `alertS` gives the audible beat, then the existing 63 u/s trudge home finishes the sentence. `det[tgt]=0` rather than DET_DEMOTE is load-bearing — `showG` suppresses `?` whenever det>0.05, so a demote value would render the gauge instead of the tell, and it fixes the marker grammar (gauge = "re-noticing you", `?` = "lost you"). `chaseCd` gates `toAlert` only, never `toAlertForce` (blackout/revenge/KO wake stay unblockable).
- **P3 search + the stairwell bug.** Extract the zone clamp from `guardOrInvest` into `zoneClamp(c,x,z)` and call it at three sites: the chase→invest demote (which writes `lsX/lsZ` **raw** today), the top of `predictAdvance`, and the decoy peck target. Confirmed bug: a stairwell coordinate has `cellOf=-1`, so `navTo` routes a 1F chicken to the front door ~1745u west and it flails for `INVEST_TRAVEL_T`=6s — and the file's own comment at :3010-3011 names this exact failure. It stops being a corner case the moment the leash leaves the chase branch, because the stairwell is the extraction route and `lineBlocked` deliberately permits sight into zone 2. Search = bounded re-advance reusing `predictAdvance` + `INVEST_CHAIN`, not a new FSM; terminates by construction (A9).
- **P4 coordination — exactly one cutter.** Factor `forwardGap(x,z,vx,vz)` out of `predictAdvance` so both callers share one function (layoutChecks precedent — a copy is forbidden in review). Every `CUT_RECALC(0.5)`s, among chickens sharing `c.tgt`, sort by `chickens.indexOf` (deterministic, no RNG): smallest `td` is the pursuer (today's behaviour); **at most one** other becomes the cutter (`CUT_MAX=1`), and only if `!lineBlocked` to the target at assignment — that LOS test is the 갑툭튀 guard, because the flanker was on screen when it peeled off. It navigates to `forwardGap(target)`. **Zero tuple slots: a cutter's different route IS a different position, and clients already mirror x/z/state.** Fallback to direct pursuit when `cellOf(tp)<0` or `|v|<20`.
- **P5 steering.** (a) zero-distance guard `if(D<1e-4) return 0` before the atan2 — `atan2(0,0)=0` currently makes a chicken that lands exactly on its target **sprint due north at full speed**, reachable every time it arrives at a still-`fresh` last-seen point (your own footsteps refresh it), i.e. *혼자 뒤로가고 may be literal, not a metaphor*. (b) arrival damping `step=min(spd*dt, D)`, the contract `moveToward` already honours. (c) proximity brake `0.55+0.45*D/60` for D<60, passed as an explicit argument and set **true only on point-targets, never on the live-player call** — braking near the player would soften the kill in a 확실히 어렵게 round. (d) `CHASE_TURN 150→280°/s`, derived: `2*132/(280π/180)=54.0u` turn diameter vs `AH-2*(CHK_R+2)=57u` free aisle — the first time a chaser can corner through a cage gap without collideCircle resolving it as a wall-slide (A6). (e) `TURN_DRAG=0.45` keeps the maze as counterplay: a 90° turn costs 19.1u ≈ **1.38s** at the new 13.8 u/s closing rate. Leave the skid trigger and `lineBlocked` alone.
- **P6 detection — no change** (see Out-of-scope). Verified hazard: `DET_NEAR=40` sets det=1 in a single frame while `showG` requires wander/return/invest, so a sub-40u detection never renders one frame of gauge; that hole is harmless *only* because non-carriers are unseeable. This is also what lets the four v0.16 frozen metrics be re-reported unchanged **by construction** rather than by measurement.
- **P7 counterplay.** (a) **Shove resumes**: at :3710 the bright-section `else c.state='return'` becomes — if the chicken was in chase when shoved (`c.preChase`, host-only, no tuple slot) and `holdsLoot(targetOf(c))` — go to `alert` with `t=CHK_REACT` and lsX/lsZ at the player; else `return`. (b) `PUSH_STUN 0.8→0.55`, asserted `< PUSH_CD` (A7) — today 0.8 > 0.70 means held-M1 is a permanent stunlock the moment resuming makes it matter. Post-fix the trade is even (chicken loses ~1.53s; player loses 0.35s at 0.4× plus facing the wrong way) and punch-kiting **drifts** at ~0.15s/cycle instead of freezing. The glove KO (6s) stays the real removal tool. (c) `decoyPulse` gains a `src` parameter: a chaser locked onto `src` ignores its own thrown egg (`world sources pass src=-1` and behave exactly as today) — the same doctrine as alarmNoise's 프랑켄 추적 봉쇄.
- **P8 the catch — remove a mercy, add nothing.** Add `o.state==='chase'||` to the pacify skip list so active chasers are **not** switched off at the exact moment tension peaks. Everything else in onCaught is frozen. **The arithmetic that makes this safe is structural, not the invuln window**: onCaught flings held *and* pocket loot and releases the cart, so a knockdown **always leaves the player empty** — it auto-executes valve rung 1, `holdsLoot` goes false, and pursuers break off at 170u. Plus invuln is granted on **stand-up**: 218×1.4 = 305u travelled vs 124×1.4 = 174u of pursuit ⇒ ≥131u of clearance from contact. The new cost of being caught is a hot room and the walk back — paid in seconds and loot position, never in control duration.
- **P9 speed.** `CHK_CHASE 124→132` — 132 **is** SPD_WALK exactly, so the world teaches the number ("a hunting chicken moves at your walking pace" is verifiable by walking), and it sits 1.7% under the A2 ceiling 134.3. Required because the budget is now the terminator: 124 gives a 5.8 u/s closing rate, inside the noise of collision resolution and corner losses — the mechanical source of 너무 느려. At 132 the rate is 13.8 u/s (2.4×), so any corner error or cutoff converts. `OUT_CHASE_MULT 0.75→0.80` is **derived**: the yard race should be decided by stamina, so outdoor speed sits at the midpoint of the carrier's exhausted walk (92.4) and jog (118.2) = 105.3; 132×0.80 = 105.6 (A5). It also repairs the confirmed 93.0-vs-92.4 farce that makes the run to the truck the safest stretch of the night. (Rejected: CHK_CHASE ≥ 135 — at 136 the sprint bank 99.6u < SIGHT_IN 110, so a rested carrier can no longer break line of sight in a straight corridor and the only surviving escape is the punch, i.e. difficulty relocated onto trivia.)
- **Multiplayer — the round's single tuple spend.** Append one int `flags` to the ck tuple, bit0 = rage (`revengeT>0`). Verified: `revengeT` lives only inside `updChickens`, which clients never execute, so the crimson double-blink rage `!` has **never** rendered for a joined friend. This round makes kill-rage chases persist 9s, and "harder" must not land hardest on the player with the worst information. Cutter role, `chaseCd`, `preChase` and the budget stay host-only — the cutter passes the justify-or-derive rule because its entire effect *is* position.

## Escape-valve contract (three rungs — the 즉사 금지 guarantee, asserted at load in derived symbols, never literals)
Derived: `SPRINT_SLICE=STAM_MIN_RESUME*STAM_DRAIN_T=1.5`, `WALK_SLICE=STAM_MIN_RESUME*STAM_REGEN_T=2.0`, `CARRY_SPRINT=SPD_RUN*CARRY_MULT=152.6`, `CARRY_SUST=(SPRINT_SLICE*CARRY_SPRINT+WALK_SLICE*SPD_WALK*CARRY_MULT)/3.5=118.2`, `EMPTY_SUST=(SPRINT_SLICE*SPD_RUN+WALK_SLICE*SPD_WALK)/3.5=168.86`, `CART_CARRY_SPRINT=114.45`.
1. **Unconditional release** — put down every piece of loot (hand + pocket + owned cart) and the pursuit ends: `holdsLoot` goes false, the release clause fires past 170u, and you are faster than any chicken. **A1** `EMPTY_SUST > CHK_CHASE`, **A4** `CHK_CHASE < CARRY_SPRINT`. One hole, named and bounded: `revengeT>0` (≤9s after a KO/kill) suspends this rung — covered by rung 2 and nothing else.
2. **Bounded clock** — no chase exceeds `CHASE_BUDGET`, ever, for any reason, and it never refreshes. **A3** `SIGHT_IN + STAM_DRAIN_T*(CARRY_SPRINT−CHK_CHASE) − (CHASE_BUDGET−STAM_DRAIN_T)*(CHK_CHASE−CARRY_SUST) > CHK_R+PLR_R+3` → at budget 10: 110+123.6−55.2 = **178.4u > 28u**. **A2** `STAM_DRAIN_T*(CARRY_SPRINT−CHK_CHASE) > SIGHT_IN` → 123.6 > 110: the opening sprint bank always exceeds the sight radius, so breaking LOS for 1.5s is always physically available in a straight corridor (this caps CHK_CHASE at 134.3).
3. **Tempo** — shove is always available and is never a delete: reach 60 vs catch radius 28 means a facing player always strikes first, and a pocketed egg does not block the swing, so **pocket (Q) → punch → re-take** is the in-corridor answer. **A7** `PUSH_STUN < PUSH_CD` so it drifts instead of freezing.
Geometry guards: **A5** yard race decided by stamina (|105.6−105.3| < 8). **A6** `2*CHK_CHASE/CHASE_TURN ≤ AH−2*(CHK_R+2)` (54.0 ≤ 57). **A8** `RACC_DRAG_SPD < CARRY_SPRINT` replaces the hardcoded 152.6 so the raccoon's valve stops drifting. **A9** search terminates. **A10** `CHASE_CD > CHASE_BREAK_T` (no ping-pong through the give-up beat). **A11** self-check 10 stays green untouched. **A12** `CART_CARRY_SPRINT < CHK_CHASE` is true, therefore cart release must remain a single un-cooldowned same-frame action.

## Acceptance Criteria
- [ ] A chicken that can see you never breaks off because of distance; it breaks off only on budget, floor change, loot release, or losing sight — and **every** exit shows the `?` + swivel + trudge beat.
- [ ] Pocketing with Q no longer peels pursuers; dropping/stashing **all** loot does.
- [ ] Punching a chaser no longer sends it home; it staggers and re-engages. Standing still and holding M1 gets you caught (≤20s vs 1 chaser, ≤8s vs 2).
- [ ] Escaping into the stairwell no longer sends a 1F chicken to the front door.
- [ ] With 2+ chasers, exactly one takes a flanking route to a forward gap; it had line of sight when assigned.
- [ ] No chicken ever sprints away from its target at full speed (atan2 bug gone); chasers corner through cage gaps without wall-grinding.
- [ ] Being caught no longer pacifies the chickens that were chasing you.
- [ ] All of A1–A12 green at load; `node --check` passes; the four v0.16 metrics re-reported unchanged.
- [ ] Version bumped in all three places; host/client stagger parity restored.

## Related Files / Modules
| File | Role |
|------|------|
| D:\Work\vibe\CCL8\chicken-heist.html | All edits (single-file game). |
| D:\Work\vibe\CCL8\CLAUDE.md | Third bright-section LOGIC exception + the punch-buff reversal record. |

## Must-Preserve
- 즉사 금지 via the three-rung contract above; failure stays comedy.
- Every acquisition radius and every player speed/stamina constant byte-identical.
- `carriesEgg` byte-identical; `layoutChecks`/`yardChokes`/`gateChecks` single source; no bespoke runtime placement predicates.
- v0.16 threat visibility (bodies non-emissive; `!`/`?`/ring/gauge stay MeshBasic **and wall-occluded** — developer ruling).
- v0.9 갑툭튀 금지: the cutter needs LOS at assignment; the give-up beat is never silent or markerless.
- Relay transport-only; snapshot tuples append-only; ev channel wave/bigmsg only; MAP_SEED determinism (no RNG or timestamps in role assignment).
- KILL_CD = KILL_RAGE_T move together; 확인사살 permanence; v0.21 dormant-wake schedule, raccoon isolation, per-slot prices, sunglasses all untouched.
- HUD budget 1 line / 3 items — the world carries every new signal.

## Existing Integration Contract
- ck tuple gains `flags` at the **end** only; all existing indexes untouched. pl/eg/st/rc unchanged.
- `c.t` is reused as the chase clock (already incremented in the chase branch) — no new per-chicken field crosses the wire.
- `CHK_LEASH`'s radius is unchanged; its **role** narrowed from bounding pursuit to gating `toInvest` recruitment only. This sentence is mandatory in the ledger.
- Post-build measurement plan (developer-run, recorded as follow-ups): median chase 6–12s with p95 ≤ budget and zero chases over budget; exit-cause mix budget-terminated ≤20% and player-action ≥60%; catch rate per chase 25–40%; knockdowns 1.5–3.0/night (cap 6); valve proofs A/B/C pass 100/100; stand-and-shove trial; solo cart run ≥55%; score −20% to −40% vs the v0.21 baseline; B1 sweep ratio in [1.10, 1.40] (both terms move in opposite directions — re-measure both, and if <1.10 move KILL_CD and KILL_RAGE_T together, never GRADE).

## Execution Notes
- Recommended model: Claude Fable 5 for the FSM/valve/assertion work (contract-dense, arithmetic-load-bearing). Sonnet acceptable for constant renames and comment updates.
- This document cannot enforce the model — the executing session's `/model` setting decides. If the session model is below the recommendation, surface it to the user and confirm before proceeding.
