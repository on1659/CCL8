# goal: chicken-heist-ears-and-bodies

## One-line Goal
One batch round (v0.26, six items — developer-listed): real flashlight pool instead of the
triangle beam, near-total darkness without it, chickens that hear footsteps, a truck
shop/depart UI, an outline on the E-pickup target, and simple body collision for players,
monsters, cart, and ground items.

## Background / Motivation
Developer batch request (2026-08-22, screenshot attached in chat). Probed 2026-08-22; the
three real design forks were settled directly by the developer (see Design Decisions).
Two items override ledger contracts and are recorded as such:
- **Hearing** is the 4th exception to "bright-phase perception LOGIC freeze" (v0.9 gauge,
  v0.16 rescale, v0.22 post-detection were 1–3). Scope pinned: two new radii only, wired
  into the existing noise→invest channel. No new perception state machine.
- **Truck UI** partially repeals v0.21 "HUD shop menu is banned". Scope pinned: the menu
  sells exactly what the world already sells (sunglasses) plus the existing depart/cancel
  verbs. No new items, stats, or upgrades — the catalog freeze survives, only the
  storefront changes.

## In-scope
1. **Flashlight look**: delete the additive beam cone (the "triangle"); switch `mat()` and
   the two explicit Lambert materials (roof, B1 ceiling) to MeshPhong (specular 0) so the
   SpotLight paints a per-pixel round pool; penumbra 0.45 → 0.6.
2. **Darkness without torch**: HEMI 0.03/0.015 → 0.012/0.006, MOON 0.02/0.01 → 0.008/0.004
   (flicker formula untouched — same-commit rule honored), personal glow 0.35/90 → 0.08/60,
   roof/B1-ceiling emissive → near-black. Beacons/kitchen/torch untouched (`?bright=1` A/B
   keeps its old values).
3. **Hearing** (recon correction — smaller than probed): running footsteps were ALREADY
   audible at the frozen `AGGRO_RUN=130` (v0.22 literal-identity check); only walking held
   a "무소음 계약". The exception therefore adds exactly ONE new radius:
   `FOOT_R_WALK=85` (T()-wrapped) — walk steps now call
   `alarmNoise(p.x,p.z,FOOT_R_WALK,p.idx)` on the existing stepAcc cadence. AGGRO_RUN
   stays 130 (frozen literal untouched). Consequences ride existing machinery: invest →
   sight gauge during invest → alert → chase; chasing chicken gets fresh-position updates
   from its own target's steps. Standing still = silent. INVEST_CD 2.0 + INVEST_CHAIN 3
   throttle spam. FOOT_R_WALK joins self-check 10's containment (W1 precedent) and must
   stay below AGGRO_RUN (new load-time assert); the v0.22 freeze-proof comment is amended
   to name this exception.
4. **Truck UI**: DOM panel appears near the truck (≤ TRUCK_UI_R 230): `[1] 선글라스 30점`,
   `[2] 시동(일찍 출발)` / `[C] 출발 취소` — keyboard-driven (pointer stays locked). New
   intent `{a:'buy'}` handled host-side; sunglasses purchase refactored into one helper
   used by both the counter E-chain (kept) and the panel. Depart/cancel reuse existing acts.
5. **E-target outline**: inverted-hull highlight (MeshBasic BackSide, warm white) on the
   exact egg the host would pick (nearest rest egg within PICK_R, with the same preemption
   order as tryPickOrPlace) plus the glove. Pure preview — selection LOGIC unchanged
   ("E = nearest" stays byte-identical; the outline makes the rule legible).
6. **Body collision**: mutual circle push, host-side after entity updates + mirrored on
   the client's self-prediction path:
   - player↔chicken (sum 25 < grab 28 — grab always fires first), player 0.35 / chicken 0.65
   - player↔raccoon 0.3/0.7 · player↔cart: player pushed only (cart trail stays authority;
     towing owner exempt) · chickens keep their existing chicken↔chicken separation
   - ground eggs (state rest) get kicked: full displacement + wall slide; eggs inside
     KITCHEN_R exempt (no kicking a cook off the brooder); `touched` flag NOT set
   - excluded bodies: dead/dormant/KO'd chickens, hidden/dead players, gone/fleeing raccoons

## Out-of-scope
- No new shop items, no stats/upgrades (v0.21 catalog freeze intact); flashlight stays
  default-owned (developer chose "기존 동사 승격만").
- No crouch/sneak verb; walking quietly is approximated by FOOT_R_WALK < FOOT_R_RUN.
- No hearing-driven gauge fill and no wake-schedule change (dormant chickens stay deaf —
  existing alarmNoise dormant guard).
- Geese (GOOSE_N=0), chicken↔raccoon, chicken↔cart pairs.
- No rigid-body physics; circle push-out only.

## Design Decisions (probe-settled by developer — do not relitigate)
- **Hearing = invest channel** (developer: "조사하러 오고, 조사하다가 발견하면 공격 패턴") —
  footsteps summon investigation; discovery during invest uses the existing sight gauge →
  alert → chase. (Rejected: turn-head-only — too soft for the requested difficulty;
  gauge-fill-by-sound — new perception channel, widest contract damage.)
- **Shop = existing verbs promoted** (developer picked recommended) — sunglasses + early
  depart/cancel only. (Rejected: torch-as-purchase — would couple with the darkness item
  and reshape the early game; new items — larger round than requested.)
- **Collision = mutual push, "최대한 자연스럽게"** (developer) — mass-weighted soft push;
  monsters are not walls (immovable-monster option rejected: body-block + no-instadeath
  valves conflict), players don't dominate (rejected: no difficulty contribution).

## Acceptance Criteria
- [ ] No triangle cone; torch shows a round light pool on floor/walls (per-pixel).
- [ ] Torch off → beacons/kitchen/spill remain, world otherwise unreadable; `?bright=1` A/B intact.
- [ ] Walking within 85u (running 160u) of an idle chicken pulls it to investigate the
      noise point; catching sight mid-invest escalates via existing alert→chase; standing
      still stops the trail. Radii live in check 10's max().
- [ ] Truck panel appears/disappears by proximity; [1] buys once (score gate, broadcast),
      [2] starts departure, [C] cancels; counter E-chain still works; client acts relay.
- [ ] Outline sits on exactly the egg (or glove) E would take; none when E would do
      something else (lever/jar/cart/place).
- [ ] Bodies push apart smoothly (no overlap-stand); grab/shove/theft ranges unaffected
      (25 < 28 verified); ground eggs roll when walked through, kitchen eggs don't; client
      self-prediction shows no rubber-banding vs chickens.
- [ ] `node --check` green; `CCL8_VERDICT.bad` empty; layout hash unchanged (seed 7);
      version v0.26.0 in three places; ledger notes added.

## Related Files / Modules
| File | Role |
|------|------|
| D:\Work\vibe\CCL8\chicken-heist.html | Single-file game — all edits |
| D:\Work\vibe\CCL8\CLAUDE.md | Ledger — LOGIC exception #4 (hearing) + shop-UI partial repeal + collision |

## Must-Preserve
- Grab inequality: separation distance PLR_R+CHK_R (25) must stay below grab
  CHK_R+PLR_R+3 (28) — never pad the separation radius.
- 살살 내려놓기 절대 안전, E-semantics (nearest-rest-egg) byte-identical.
- alarmNoise semantics (chase fresh-update for own target only; guardOrInvest others;
  dormant/dead deaf) — footsteps enter through the front door, no new dispatch.
- KILL_CD/KILL_RAGE economics untouched; sonar/wave whitelists untouched.
- Host authority: one new intent verb ('buy'); all judgments host-side; collision on the
  client only for self-prediction (deadband correction remains the safety net).
- Flicker formula HEMI_DARK+j*(HEMI_LIT-HEMI_DARK) — constants move, formula and
  DARK<LIT invariant hold. 위협 가시성 계약 (no chicken emissive) untouched by Phong swap.
- Tuner: new knobs via T() only (FOOT_R_WALK/FOOT_R_RUN); no check duplication.

## Existing Integration Contract
- stepAcc cadence (host updPlayer) is the single footstep clock — hearing hooks there,
  client stepAcc stays audio-only.
- sepPlayers/collideCircle patterns are the collision idiom — same soft-push style, wall
  re-collide after push for players.
- Panel gating must respect pause/menu overlay and pointer-lock UX (keys, not clicks).

## Execution Notes
- Recommended model: Claude Fable 5 (current top tier) for hearing/collision integration —
  both touch the aggro FSM and multiplayer prediction where a missed consumer is expensive.
  Torch/darkness/UI/outline are mechanical-to-moderate (Sonnet-class acceptable).
- This document cannot enforce the model — the executing session's `/model` setting decides.
  If the session model is below the recommendation, surface it to the user and confirm
  before proceeding.
