# goal: chicken-heist-rework

## One-line Goal

Rework the chicken-heist web prototype (v0.1 → v0.2) so that eggs actually break, chickens can actually be outplayed, and the scene reads as a night heist — turning "always succeed, no tension" into "stakes + counterplay" without leaving the prototype's validation scope.

## Background / Motivation

Developer playtest feedback (2026-08-10), 7 items:

1. Background too bright → wants darker
2. Map too small — no room to evade chickens while carrying
3. Wants an arrival staging (riding in on the vehicle)
4. Wants the spec to pin down game details (scoped by user decision to THIS prototype only)
5. Eggs never break → guaranteed success, boring
6. No counterplay against chickens → no motivation to play
7. Find and report additional problems

Root-cause analysis confirmed #5/#6 are two sides of one defect: caught-drop landing speed is physically capped at ~340 < break threshold 420 (eggs CANNOT break except by max-charge throw), nests respawn infinitely, and the player has zero tools (blanket 310-radius aggro on pickup, single coop entrance, no stealth axis, near-zero speed margin).

Additional problems found (item 7): stun-lock encirclement loop; single-door bottleneck; walk/run identical for aggro (no stealth axis); walk-in delivery obsoletes throwing; safe-line UI unlearnable; 3rd-person camera pop on wall contact; warning sound has no direction; single-egg carry repetitiveness.

A 4-lens adversarial panel (balance math / clip readability / scope guard / player experience) + cross-examination reviewed the draft; its reconciled output is baked into the Design Decisions below.

## In-scope

- **Night heist theme** — contrast-based night (dark ground/sky, bright subjects), light pools (truck headlights, mid-route lantern, coop lamp) forming a wayfinding chain; eggs always emissive
- **Map rework** — see the v0.3 amendment below; the original v0.2 target was a 1280×800 plane with a 370×320 fenced coop
- **Egg state machine** (the ONE new system this round): jostle → slip → crack → robbery
  - Jostle: carrying + sprinting fills a hidden gauge (3.0 s to full); walking drains it (1.5 s); egg-wobble telegraph 0.8 s before full; at full the egg slips and **always breaks**
  - Crack: any landing with impact > 150 cracks an intact egg (visual); cracked eggs break at threshold 250 (intact: 420) — kills throw-relay exploits
  - Robbery: on catch, the dropped egg **always survives but cracks**; the catching chicken grabs it and struts it back to a nest at speed 55; shove it to make it drop the egg
- **Counterplay kit** (constant tuning / reuse only):
  - Decoy: a thrown egg's landing (and any break splat) attracts chickens within 240 to peck for 4.0 s, hard-ignoring the player; at the end the decoy egg is **eaten** (consumed)
  - Conditional pickup aggro: picking up while walking (no run in last 1.0 s) alerts radius 120; while/after running alerts 310
  - Run noise: sprinting alerts chickens within 310; walking is silent (sight-only detection)
  - Sight by zone: inside the lamp-lit coop 240, outside in the dark 160 (only reacts to a player carrying an egg)
  - Chase turn-rate cap 150°/s (turn radius ≈ 47 u; sidesteps > 50 u overshoot) with skid slapstick
  - Outside-coop timidity: chase speed ×0.75, gives up after 1.5 s beyond sight range; home leash 370 kept
  - Shove (user-confirmed): empty-handed only, range 60, cooldown 2.5 s, stun 0.8 s, knockback 150, self-stagger 0.35 s, emits noise 200; pressing while carrying plays a 0.3 s elbow-fail motion (no effect); shoving a robber chicken makes it drop the egg (survives)
- **Finite eggs + comedy fail state**: 6 nests (2 near door / 2 mid / 2 deep), NO respawn; when alive eggs + delivered < 3 → 2.5 s hold (camera watches the last remains, chickens flock to peck) → caption "오늘 장사는 글렀다…" → R to restart; HUD warning when total hits exactly 3
- **Stun-lock fix**: invulnerability 1.4 s now starts at stand-up (not at knockdown); chickens that catch you (and those within 200) do a 2.0 s victory flap; during knockdown the camera is forced to watch the dropped egg (robbery must be witnessed)
- **Intro**: truck drives in ≤ 1.5 s, first load only, ANY input = instant disembark; ends with headlights aimed at the coop (the intro itself performs the 3-second read); R restart = 0.5 s fade, no intro replay. Outro cut → win = freeze + horn + caption
- **Found-problem fixes**: nearest-door waypoint selection (2 entrances), 3rd-person camera distance smoothing, remaining-eggs HUD, alert head-snap animation (reaction delay 0.28 → 0.35 s consumed visibly), distance-volume mono cluck warning
- Spec detail recorded here + decision log appended to the design doc (user decision: proto scope only)

## Out-of-scope

- Cooking / heat state change, shop / purchases / stats, orders (quota), multiplayer / netcode, sound-wave visualization, spoilage / hunger, rush mode, animals other than chickens (CLAUDE.md scope rules)
- Full-game design expansion (user chose proto-only spec; whole-game detailing belongs to a future /office-hours session)
- Directional / panned audio (mono distance-volume only), minimap, HUD gauge bars for jostle (the egg's wobble IS the gauge), footstep visualization rings (borders banned sound-wave visualization), fog inside the play area, decorative dirt road, outro drive-off, vaulting or any new movement verb

## Design Decisions (panel-settled — do not relitigate during implementation)

- **Breakage division of labor**: slip = always breaks (no RNG); catch-drop = always survives + cracks → robbery; gentle set-down = always safe; threshold 420 / gravity 650 / carry height 40 unchanged (throw judgment only). (Rejected: probabilistic eject speeds 380–520 — random outcomes are unlearnable and randomize comedy timing)
- **Jostle gauge is diegetic**: readable only through egg wobble amplitude (works in both camera modes). (Rejected: HUD bar — "body visible" filter violation; Rejected: cutting the gauge — without it carrying is a hold-forward exercise and the "carry" axis of the validation question evaporates)
- **Crack state** gates all throw exploits: first landing > 150 cracks; cracked threshold 250. Robber beak-drop (~197 impact) survives, so the re-steal loop works. (Rejected: lowering the intact threshold — would break the "gentle lob is safe" promise at 303 landing speed)
- **Decoy eggs are consumed** (chicken eats them). (Rejected: chicken returns decoy to nest — recreates the infinite-lockdown exploit the panel computed)
- **No audio-stealth channel**: single aggro radius with state multipliers (walk 200 / run 310 conceptually; pickup 120/310), reaction delay spent as visible head-snap. (Rejected: footstep radius rings — adjacent to the banned sound-wave visualization; silent clips carry zero audio information)
- **Sight is zone-binary** (coop interior 240 / outside 160) reusing the in/out flag that timidity needs anyway. (Rejected: per-light-pool detection — a new system seed the scope guard vetoed; light pools stay decoration + wayfinding)
- **Map 1280×800**, coop-door↔truck ≈ 600. (Rejected: 1600×1000 — creates 13 s risk-free walks and 19 s stalemate tail-chases; the feedback asks for dodge WIDTH, not distance)
- **Carry multiplier 0.62 → 0.70** (carry-walk 92, carry-run 153). Structure preserved: carry-walk < chase 124 < carry-run, with the gauge capping run duration
- **Shove is a panic tool, not combat**: cd 2.5 > stun 0.8 (no juggling), stun 0.8 < peck 4.0 (decoy keeps its reason to exist), self-stagger 0.35, noise 200 (no free coop-clearing). (Rejected: cd 1.2/stun 1.0 — enables permanent juggling)
- **Robbery is the caught-penalty** (design-doc open question settled by user 2026-08-10): knockdown + robbery, witnessed by forced camera; **fallback pre-specified** — if robbery implementation overruns, cut to "scatter + victory flap" without losing the stun-lock fix
- **Victory flap 2.0 s + invuln from stand-up** solves the empty-handed stun-lock the robbery alone cannot
- **New-system accounting (explicit)**: the ONE new system = egg state machine (jostle→slip→crack→robbery). Shove = user-confirmed accessory. Everything else must be constant tuning or code reuse — any item whose "reuse" claim turns out false gets cut first
- **Intro performs the read**: ≤ 1.5 s, first-load only, any-input skip, headlights end aimed at the coop. (Rejected: 3 s intro — spends the friend's entire 3-second judgment window on a parking scene; Rejected: full cut — arrival staging is direct user feedback #3)
- **Night is contrast, not darkness**: ground/sky down, subjects (egg/chicken/player) lit or emissive; acceptance = egg/chicken/coop identifiable in 3 s on a 50%-brightness thumbnail. (Rejected: fog + true darkness — kills silent-clip readability and re-encoded video crushes blacks)

## Tuning Constants (implementation reference)

| Constant | Value | Note |
|---|---|---|
| Map | 1280×800 | coop interior ≈ 400×320, door west / hole east |
| Truck pad ↔ coop door | ~600 | last ~stretch is structurally chicken-free via leash |
| Carry multiplier | 0.70 | walk 92 / run 153 |
| Jostle | full 3.0 s run / drain 1.5 s walk / telegraph last 0.8 s | slip = always break |
| Crack | crack impact > 150, cracked threshold 250, intact 420 | robber drop ~197 survives |
| Pickup aggro | walking 120 / running-or-recent(1.0 s) 310 | replaces blanket 310 |
| Run noise | 310 | walking silent |
| Sight | coop 240 / outside 160 | carrying player only |
| Reaction | 0.35 s head-snap | was 0.28 invisible |
| Chase | 124 inside, ×0.75 outside, turn cap 150°/s, lose-sight give-up 1.5 s, leash 370 | |
| Decoy | radius 240, peck 4.0 s hard-ignore, egg consumed | splats attract too |
| Shove | range 60 / cd 2.5 / stun 0.8 / knockback 150 / self-stagger 0.35 / noise 200 | empty-handed only |
| Robber | speed 55 strut, egg at beak, shove → drop (survive) | |
| Caught | stumble 1.15 s, invuln 1.4 s FROM STAND-UP, victory flap 2.0 s (radius 200) | camera watches egg |
| Eggs | 6 nests (2/2/2 by depth), no respawn, need 3 | fail when alive+delivered < 3 |
| Fail staging | 2.5 s hold → caption → R | chickens peck remains |
| Intro | ≤ 1.5 s, first load only, any input skips | restart fade 0.5 s |
| Night | ambient ≈ 0.3–0.4 desaturated blue, eggs emissive, no play-area fog | thumbnail test |

## Acceptance Criteria

- [ ] `node --check` passes on the extracted script; zero JS console errors headless
- [ ] Slip (jostle full) breaks the egg 100% of the time; gentle set-down never breaks; a lobbed intact egg cracks; a second lob breaks it
- [ ] Caught while carrying: egg survives cracked, catcher robs it toward a nest at 55; shoving the robber drops the egg alive
- [ ] Caught empty-handed: no re-catch during flap 2.0 s + invuln (timed from stand-up)
- [ ] Quiet pickup alerts only ≤ 120; loud pickup alerts ≤ 310
- [ ] Decoy: chickens within 240 peck 4.0 s ignoring the player; decoy egg consumed at the end
- [ ] Chickens use the nearest of 2 entrances both chasing and returning (no wall-grinding)
- [ ] Fail state triggers exactly when alive+delivered < 3, with 2.5 s staged hold; win = 3 delivered
- [ ] Intro ≤ 1.5 s, skippable by any input, plays only on first load; R restarts with fade, no intro
- [ ] Night scene: egg/chicken/coop identifiable on a small dark screenshot; no fog in play area
- [ ] Playtest checklist recorded for the developer: ① is walk-only actually forced to run somewhere ② is the post-decoy defenseless window fun or tension-collapse ③ fail rate with 6 nests (>40% → adjust nest count to 7, not break constants) ④ does crack actually block throw-relay

## v0.3 Amendment — indoor barn at 10× (developer request, 2026-08-10)

Developer feedback after playing v0.2: the coop interior is too small; it should be an **indoor
poultry barn**, 10× larger in both width and depth. Delivered as asked (`COOP_SCALE=10`), with the
knock-on adjustments that keep it playable:

| What | v0.2 | v0.3 | Why |
|---|---|---|---|
| Coop interior | 370 × 320 (open, fenced) | **3700 × 3200 (enclosed barn + roof)** | direct request |
| Logical plane | 1280 × 800 | 4900 × 3800 | must contain the barn + west yard |
| Interior layout | empty pen + 1 shed | 5 cage rows × 3 blocks → 6 aisles + 2 cross-aisles + perimeter corridor | 100× area of empty floor is a hangar, not a level; aisles give the space structure |
| Chickens | 3 | **15** (2–3 per aisle, leashed to their zone) | 3 chickens in 100× the area is zero threat density. "Few enemies" is preserved *locally* — you meet 1–3 at a time |
| Leash | 370 | 600 | proportional to the new distances |
| Doors | 2 | 4 (3 west + 1 east hole), all centred on aisles | a door opening onto a cage row shows a blank wall on entry |
| Sight | distance only | distance **+ line-of-sight** (`lineBlocked`) | without it the aisles are a maze that detection ignores; noise aggro still ignores cover, as designed |
| Lighting | 3 point lights, unsubdivided ground | 4 interior point lights + emissive bulb rows; ground/roof subdivided | Lambert is per-vertex — an unsubdivided plane renders no light pools at all (v0.2 had this bug) |
| Fog | none | 2200 → 6800 | lets the depth read; starts far beyond any chase distance, so the panel's "no fog on chasers" rule holds |

Nest depth ramp is now literal: near nests ~870 from the truck, deep nests ~4160
(carry-back ≈ 7 s vs ≈ 31 s at the run/walk jostle cycle average of 133/s).

**Concern on record:** 10× linear is 100× area, and player speed did not change. A deep-nest round
trip is ~45 s, so a full 3-egg run is roughly 2–3 minutes. That is a real tension curve rather than
dead time *only if* the deep half of the barn stays dangerous; if playtest says it drags, the single
knob is `COOP_SCALE` (4–5 gives a ~1500-unit barn) — everything else regenerates from it.

**v0.4 addendum (2026-08-10):** the developer resolved the concern the other way — trips longer
than 45 s are explicitly acceptable, and the map should get bigger still. `COOP_SCALE` 15
(barn 5550×4800). To keep enlargement from hollowing the space out, rows/blocks/doors/nests are
now all derived from the dimensions (aisle width stays ≈350, block width ≈1000–1300 → 9 rows ×
4 blocks, ~25 chickens at 2–3 per aisle). No maze-ification — that belongs to the blackout-return
stage (see the design doc); ideas not used in this map may be reused in other maps.

## Related Files / Modules

| File | Role |
|---|---|
| D:\Work\vibe\CCL8\chicken-heist.html | The entire prototype (single file) — rewritten in place |
| D:\Work\vibe\CCL8\docs\design-cooking-extraction-20260809.md | Design source of truth — decision log appended (combat scope, caught penalty) |
| D:\Work\vibe\CCL8\reference\sound-is-light-3d.html | Architecture donor (unchanged) |

## Must-Preserve

- Plane (x,z) logic + 3D-render-only split; seg-based map; single circle-segment collision routine
- Single HTML file, vanilla JS + Three.js r128 cdnjs CDN, no build tools; Korean comments/UI
- No instant death — every failure is comedy (knockdown, robbery, "glorious ruin" fail screen)
- V-key 1st/3rd person toggle (the A/B question itself); truck pad no-break + walk-in delivery
- `node --check` verification flow; tuning constants gathered at the top of the file
- Known constraint to record, not fix: 1st-person rear visibility gap (no new UI) — consider when interpreting the A/B result

## Execution Notes

- Recommended model: Claude Fable 5 (current top tier) for the egg-state-machine logic, chicken FSM interactions, and night-readability tuning — interlocking rules where a wrong interaction quietly kills a strategy route. Sonnet acceptable for the mechanical parts (map segment layout, HUD text, sound synth variants).
- This document cannot enforce the model — the executing session's `/model` setting decides. If the session model is below the recommendation, surface it to the user and confirm before proceeding. (This session runs claude-fable-5 — meets the recommendation.)

## Fairness Constraints

- Single-player prototype: no anti-cheat concerns. RNG is cosmetic only (wander targets, particle jitter); all outcome rules are deterministic (slip always breaks, catch always robs) — by design, so failures are learnable
- Score integrity: time/broken/caught counters must reflect actual events (no double counting on restart)

## Existing Integration Contract

- Standalone file; no external save/network contracts. Keyboard uses `e.code` (IME-safe). Pointer-lock gesture flow: title click → lock → intro → play; Esc = pause overlay
