# goal: chicken-heist-dark-surprise

## One-line Goal

v0.6: kill the "I can see everything" problem (full-height maze walls + camera clamps), add a visible blackout countdown (240 s) on top of the pickup trigger, make the 10 chickens genuinely smarter (patrol / predictive cutoff / flock alarm / tray guarding), and hand the player a kit — boxing glove → chicken-meat trophies, a two-slot carry (hand + pocket), a pullable cart, and a jump.

## Background / Motivation

Developer playtest of v0.5 (2026-08-11): ① the whole map is readable so nothing ever jumps out ("갑툭튀" is the missing thrill) ② runs can stall forever → blackout should also come on a timer, with the timer shown ③ chickens should get smarter, not more numerous ④ wants a way to fight back (boxing glove → chicken meat) ⑤ two-item carry (1 hand + 1 keep) ⑥ a pullable cart that holds items ⑦ jump.

This batch is 5+ new systems, which conflicts with CLAUDE.md's one-new-system rule. **Developer explicitly chose "all at once in v0.6"** (recorded; the rule is lifted for this round by developer authority, same mechanism as the v0.5 blackout-guardrail lift). Developer also settled: chicken smartness = all four upgrades; chicken meat = bonus trophy only (win condition stays 3 eggs).

A 4-perspective adversarial panel (items-coherence / horror-dramaturgy / chicken-AI fairness / simplify-audit) + cross-examination reviewed the draft against the actual code; 66 objections and 17 cross-rulings are reconciled below. Three draft-killing findings: (a) "raise SEG_H, render-only" was backwards — cage/plug render is hardcoded ~75 meshes and SEG_H feeds egg-flight physics, so both must change; (b) multi-slot carry silently bypasses the v0.5 pickup blackout trigger — generalized to a possession-total trigger; (c) a latent v0.5 bug: on blackout, chickens shuttle untouched tray eggs in place forever (grab→rob target is the tray itself), absorbing the whole flock — fixed with a `touched` flag.

## In-scope

- **A. Occlusion**: tall wall boxes (y 75→210) added to cage rows and plugs (render), SEG_H.cage/plug=210 (egg-flight physics sync — over-wall throws die, intended); TP camera indoor clamp `cy≤196` + indoor TP distance cap 110 + TP_SIDE 18 indoors (anti-pumping); tray0 lamp 1.6→1.8 (spine read compensation); throwEgg origin stays y=CARRY_H (jump height never added — keeps the over-wall relay closed).
- **B. Blackout timer**: `DARK_TIMER=240` (tuning constant, stats.t-based); trigger generalized to possession total — after every successful egg acquisition, `delivered + (hand+pocket+cart eggs) >= NEED_EGGS → startBlackout()` (old trigger is a subset; `?dark=0` blocks both paths); `e.touched` flag — chickens rob only player-touched eggs; HUD countdown "정전까지 M:SS" visible from start (developer's literal request; a 120 s-delayed reveal was panel-preferred and is recorded as a post-playtest alternative), warn color <30 s, hidden once blackout starts; brief light-dip + rattle at 30 s and 10 s remaining; prompt copy branches for a mid-heist blackout ("정전이다 — 알은 어둠 속에서 빛난다").
- **C1. Patrol**: roles fixed — 6 guards (tray 1:1) + 4 free patrollers; committed literals `GUARD_OF=[0,1,2,3,4,5,-1,-1,-1,-1]`, `PATROL_LOOPS` (offline-derived from maze literals, zero runtime RNG in cell choice; no spine cells anywhere); `PATROL_SPD=65` (new state, new constant — aggro/sight table untouched); leash keeps `CHK_LEASH=600` but measured from the current anchor `c.ax/az` (patrol waypoint / guarded tray / home); tray0's guardian keeps v0.4 wander (tutorial protection).
- **C2. Predictive cutoff**: on sight-loss (after ≥0.5 s continuous sight), one-shot advance of `lsX/lsZ` to the gapPoint of the open neighbor cell best aligned (dot>0.3) with the last observed movement direction; no re-prediction; CHASE_LOSE_T keeps ticking during the move; existing arrive/demote logic untouched.
- **C3. Flock alarm**: dedicated `alarmFlock(x,z)` — called at exactly two sites: alert→chase transition and punch KO (never attached to squawk/cluck sound helpers); origin = snapshot last-seen point (fixed-origin contract holds); `PACK_R=500`; receivers = non-chase/grab/rob/peck/stunned only, per-chicken `ALARM_JOIN_CD=8 s`; joins ride the existing toInvest path; blackout VIS wave 500.
- **C4. Tray guarding**: no new state, no new radius — when a guard receives alarmNoise or alarmFlock whose origin is within DECOY_R(240) of its tray and the tray egg remains, its invest destination redirects to the tray anchor with a 6 s dwell cap; no sight bonus while guarding; dark-cluck waves unchanged.
- **D. Glove & meat**: glove = `player.glove` boolean (never a held item — panel-ruled; kills ~20 type-branch bugs), spawns on the yard crate, E to acquire once, never lost; punch = bare-hand LMB upgrade sharing PUSH_CD=2.5, noise LOGIC 310 (PICKUP_LOUD reuse) + VIS 380; hit → KO 6 s (lying, snore VIS waves every 2 s in blackout), first KO per chicken drops meat (then "plucked" visual, no more meat); meat pickup = instant harvest count `// 임시:` (not a carried item); punch on a rob-carrier still releases the egg (shove behavior inherited, egg becomes touched); KO fires alarmFlock once + chickens within 200+LOS get `revengeT=5 s` (chase even when player carries nothing); KO wake = toAlertForce.
- **E. Two-slot carry**: E semantics byte-identical to v0.5 (held→gentle set-down / empty→pick — absolute-safety contract preserved); Q owns the pocket (stash/retrieve/swap, 0.5 s action, silent, no shove/throw during); CARRY_MULT 0.70 applies if any body egg; pocket egg exempt from shake/slip (slip loses hand egg only; being caught drops both — hand egg grabbed as before, pocket egg scatters opposite and rests); blackout detection uses `carriesEgg() = held||pocket||pulled-cart-egg` in chickenSee and the five held-gates (dark phase only — lit phase stays `held`, byte-identical); lantern stays hand-slot-only (pocket = lose the light, keep the 200 exposure — the tradeoff, not a stealth hole); pad delivery is batched (hand+pocket+cart) then one checkWin().
- **F. Cart**: one cart by the truck; F toggles pulling; breadcrumb trailer (0.05 s ring buffer, follows the player's 0.55 s-old position — structurally cannot wedge in corners), circle collision r30, pull speed ×0.75; 2 egg slots, state `'cart'` (rob/peck/abandon logic auto-immune); E within 60 of cart = load (a safe set-down — contract-compatible) / bare-hand E = take out; pad contact delivers all contents (batched); walking pull is silent (silent-walk extension), running pull relies on the player's own AGGRO_RUN for logic + a VIS_RUN wave at the cart; glowing egg aboard a pulled cart → carrier exposure 200; running pull for 4 s cumulative ejects one egg (deterministic); Space ignored while pulling; resetWorld resets the cart; the east hole stays one-way for the cart too (by construction).
- **G. Jump**: Space (repeat-guarded, blocked while pulling): impulse 260 / gravity 650 → apex 52, airtime 0.8 s; render/camera y only; collideCircle skips kinds {trough, crate} for the airborne player (cage/plug/barn/wall excluded in code, not by tuning); lineBlocked, wave cast, and camDistRaw also skip trough/crate (knee-high boxes must not act as full walls in 2D queries); three troughs (h 26, w 110) added to mid-depth aisles flush against cage faces, walkway ≥230 preserved, clear of openings and plugs; landing: walk = LOGIC 0 / VIS 180, run = LOGIC 310 / VIS 310 (two-column table rows added, zero new constants); hand-egg landing shake +0.2; no airborne catch-dodge.
- **Chrome**: version → v0.6 in all three places; HUD adds countdown, pocket slot, meat count; controls help (#help + title keys) adds Q/F/Space/punch within two lines; win/fail screens show meat harvest; validation suite +5 asserts (no spine patrol waypoints; tray0 guardian inert; trough walkway ≥230; guards 6 + free 4 = 10; glove spawn inside crate box).

## Out-of-scope (panel-cut this round)

Meat as cargo or decoy (instant harvest instead; cart-cargo promotion is a v0.7 candidate), pocket crack-gauge (third new mechanism too many), per-tick flock alarm (strobe = live tracking), guard sight bonuses, new detection radii for guarding, cart robbery, cart capacity 4 (→2), timer-delayed HUD reveal (recorded alternative), light-phase constant changes of any kind, everything in CLAUDE.md's hold list.

## Design Decisions (panel-settled — do not relitigate during implementation)

- Walls: render boxes AND SEG_H both to 210 — "render-only" was factually wrong (L501 excludes cage/plug from segBox; SEG_H's only consumer is egg flight). Over-wall throw tactics die; recorded as an intended map change. (Rejected: keep SEG_H 75 — eggs visually tunnel through walls.)
- Blackout trigger = possession total (delivered + hand + pocket + cart ≥ NEED), checked after every acquisition — any carry strategy still meets "darkness the moment you secure the last egg". (Rejected: pickup-moment-only — pocket/cart hoarding skips the stage entirely.)
- `e.touched` gates robbery — fixes the v0.5 tray-shuttle latent bug (chickens robbing untouched tray eggs to the same tray forever, killing the money-shot chase). (Rejected: restT reset on blackout — only delays the shuttle 3 s.)
- DARK_TIMER=240, not 180 — measured first-run estimate 240–400 s; at 180 the timer becomes the main path and demotes the pickup scare to experts-only. Tuning constant, revisit after friend runs.
- Flock alarm is a snapshot pulse (2 call sites), never attached to sound helpers — per-tick squawk broadcast reconstructs live tracking and the chicken-wakes-chicken storm v0.5 explicitly cut.
- Patrol destinations are committed literals; only dwell jitter stays random — cell-choice RNG is outcome RNG (violates the fairness contract; encounters must be learnable).
- Leash anchor moves (c.ax/az), the 600 number doesn't — changing CHK_LEASH would violate the lit-phase constant freeze; anchorless patrol makes smart chickens abandon every chase.
- Guard trigger is "guard personally hears an alarmNoise near its tray", never "noise lands near tray" — the latter kills quiet-pickup stealth (pickup noise is at the tray by definition, PICKUP_QUIET=120 vs 740 u cell distance).
- Glove is a flag, not a held item — held is egg-typed across ~20 sites (shake, throw, pad, caught, CARRIER_SEEN, lantern, prompts); "can't punch while carrying" preserves the hand-slot opportunity cost.
- Meat is instant harvest `// 임시:` — carrying friction is not the point of a bonus trophy; also kills the infinite-decoy exploit (unbreakable thrown meat) and all held-type pollution.
- Pocket in the dark: exposure 200 stays, lantern doesn't — "lose the light, keep the exposure" is a real tradeoff; full stealth via Q would delete the shipped "white egg waddling in the dark" clip. (Rejected: forbid dark stashing — fiction patch where a tradeoff suffices; allow-and-hide — kills the stage.)
- Bare-hand hunting is not free: punch noise 310 + KO alarmFlock + revenge chase (200+LOS, 5 s, held-independent) — without revenge, invest-only chickens literally cannot catch an eggless player (chase gates are held-gated).
- Cart carries eggs (2 max) with costs (exposure 200 when glowing, deterministic run-eject at 4 s) rather than being egg-banned — banning would gut the developer's cart request; the possession trigger already prevents the blackout skip; full-cargo blackout mid-maze is more dramatic, not less.
- Cart follows breadcrumbs, not a spring — spring-follow wedges in 349-wide U-turns and depth-1 pockets; breadcrumbs only traverse player-validated space.
- Jump landing while walking is LOGIC 0 — the silent-walk contract covers unhurried movement; what jump crosses is troughs and crates, not walls, so the free shortcut is bounded. Run-landing pays 310 like any run step.
- Troughs must be skipped in lineBlocked / wave cast / camDistRaw (2D, height-blind) — otherwise knee-high boxes become sight-blockers (free stealth terrain), wave-shadow liars, and camera snags. Only collideCircle keeps them solid (and jumpable).

## Acceptance Criteria

- [ ] `node --check` passes; zero console errors; validation suite passes (v0.5's 8 + 5 new asserts)
- [ ] Inside the barn, neither FP nor TP (any pitch) reads neighboring aisles over the walls; camera never pokes above the roof
- [ ] Blackout fires at min(240 s, securing the 3rd egg by any means — hand, pocket, or cart); countdown visible from start, warn <30 s, dips at 30/10 s; `?dark=0` disables both paths
- [ ] Chickens never rob untouched tray eggs; no tray-shuttle loops during blackout
- [ ] Guards redirect to their tray on nearby alarms; quiet walk-up pickup still summons no one; tray0 area behaves exactly like v0.4
- [ ] Free patrollers walk their literal loops at 65; no patrol waypoint on the spine; leashes hold at 600 from the current anchor
- [ ] Losing sight of a ≥0.5 s-observed player advances the chase target one open cell along the escape direction, once, then normal demote rules
- [ ] One alert→chase transition pulls at most nearby non-busy chickens once each (8 s per-chicken cooldown); no per-squawk re-targeting
- [ ] Punch: KO 6 s, first-KO meat, plucked visual, noise 310 + VIS wave, revenge chase reaches an eggless player; rob-carrier punch releases the egg
- [ ] Q stash/retrieve/swap works with 0.5 s lockout; E semantics unchanged from v0.5; slip loses only the hand egg; caught drops both correctly
- [ ] Dark-phase exposure 200 applies with the egg in hand, pocket, or pulled cart; lantern only ever follows the hand egg
- [ ] Cart: pull ×0.75, breadcrumb follow without corner wedging, 2-slot load/unload via E, pad delivers everything batched (win counts all of the final trip), run-pull ejects an egg at 4 s cumulative
- [ ] Jump clears troughs/crates only; landing noise walk 0 / run 310; hand-egg landing adds shake; no jump while pulling
- [ ] Version bumped to v0.6 in all three places; HUD shows countdown + pocket + meat; help lists Q/F/Space/punch

## Related Files / Modules

| File | Role |
|------|------|
| D:\Work\vibe\CCL8\chicken-heist.html | The prototype — all v0.6 changes land here |
| D:\Work\vibe\CCL8\CLAUDE.md | One-new-system rule lift recorded (developer decision 2026-08-11) |
| D:\Work\vibe\CCL8\docs\design-cooking-extraction-20260809.md | Decision log entry for the v0.6 batch |
| D:\Work\vibe\CCL8\docs\goal\chicken-heist-maze-blackout.md | v0.5 contracts this round must preserve |

## Must-Preserve

- Lit-phase LOGIC constants byte-identical to v0.4/v0.5 (two-column table; new rows only for new verbs: punch, jump landing, flock alarm)
- Silent-walk contract (walk aggro 0, all phases — extended: walking cart pull, walking jump landing)
- E gentle-set-down absolute safety; egg state machine; decoy-eat (eggs only); shove spec (punch is a superset, not a replacement — bare hands without glove still shove)
- Fixed-origin invest — no live tracking via sound; predictions use observed info once; alarms are snapshots
- No instant death; failures are lit spectacles; every dark dead-end keeps the setdown→shove→repick escape possible (KO + revenge must not create an inescapable pocket: revenge lasts 5 s and leashes still apply)
- Lantern 140 < seen-at 200 tension; lantern singleton = hand slot only
- Single HTML / three.js r128 / Korean UI / plane logic + seg collision / `node --check` / V-key FP-TP / version bump discipline (3 places)

## Execution Notes

- Recommended model: Claude Fable 5 (current session — meets recommendation) for the AI state-machine surgery, blackout-trigger generalization, and the held→carriesEgg dark-phase substitution — interlocking-contract work where a wrong interaction silently kills a strategy route. Sonnet acceptable for HUD text, help copy, and mesh plumbing.
- This document cannot enforce the model — the executing session's `/model` setting decides. If below recommendation, surface and confirm.

## Fairness Constraints

- No outcome RNG: patrol literals, deterministic cart eject, fixed glove/trough spawns; only cosmetic jitter (dwell times, particles) stays random
- VIS radii never silently change LOGIC radii; every new audible verb gets a two-column row (punch 310/380, jump-land 0·310/180·310, flock alarm —/500)
- Dark-phase exposure rules must be identical across carry modes (hand/pocket/cart) — no stealth-dominant option

## Existing Integration Contract

- Standalone file; pointer-lock flow unchanged; localStorage unused; `?dark=0` remains the only dev flag (now also disables the timer)

## Open Questions

(none — probed in Phase 1 (developer settled scope, chicken-AI selection, meat purpose) and panel-settled the rest. Two post-build developer-judgment gates, not blockers: ① does the always-on countdown feel like pressure or a spoiler (alternative: 120 s-delayed reveal, recorded above) ② does any camera angle leak neighbor-aisle chickens.)
