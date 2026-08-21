# goal: chicken-heist-full-roam

## One-line Goal
Fix the v0.24 flashlight that never lights (inverted `hideJar` sentinel check) and replace
spot-bound chicken patrol (2-cell literal loops / in-cell wander) with continuous floor-wide
roaming for **all 10 chickens** — developer-settled scope: "전원 층 전체 배회".

## Background / Motivation
Two developer reports (2026-08-21):
1. "손전등이 T 눌러도 켜지지 않아" — T toggling works at the state level (`tryTorch` flips
   `p.torch` 2↔1), but the single render gate in `updWorldUI` tests `!p.hideJar`. The
   not-hidden sentinel is `-1` (truthy), so the gate is **always false** — the torch has
   never rendered since the jar feature landed. The same inverted test also kills the
   ambient personal-glow lantern, which is why v0.24 has been far darker than designed.
2. "몬스터가 스폰위치에서만 돌아다녀 … 계속 배회하는거야" — not a bug: tray guardians pace
   2-cell literal loops and free patrollers walk 2–3-cell literal loops, so everything
   visibly stays near its spawn spot. The developer wants continuous roaming instead.

The roaming request conflicts with the v0.21 contract "지키는 알은 항상 지켜진다" (tray
guardians stationed at trays). Surfaced to the developer before work per CLAUDE.md; the
developer chose **full roam for all 10 chickens** over the recommended guards-orbit option,
explicitly repealing the tray-guard *idle stationing* clause by developer authority.
Guard *reactions* survive (see Design Decisions).

## In-scope
- Torch render gate fix: `!p.hideJar` → `p.hideJar<0` at both consumers
  (torch/beam gate in `updWorldUI`, personal-glow lantern in the render loop).
- Wander-state rewrite: all chickens in `wander` pick random eligible cells on **their own
  floor** and walk there via `navTo` at `PATROL_SPD`, short dwell on arrival, repeat forever.
- Roam target predicate (runtime analog of the static placement predicates):
  own floor · not a spine-aisle cell · not a gate cell (정문 / 1F 계단 / B1 계단) ·
  reachable · the actual `nextCell` chain from the current cell must not pass through a
  gate cell. Bounded retries (8) with home-cell-jitter fallback so a pick can never stall.
- Wake/return/restart paths route into the roam picker instead of `pickWander`/loop resume.
- CLAUDE.md ledger entry for the contract repeal; version bump v0.24.0 → v0.25.0 (3 places).
- One additive load-time self-check: each floor's eligible roam-cell set is non-trivially
  large (≥8) and contains no spine/gate cell.

## Out-of-scope
- Dormancy schedule: the 4 free patrollers still start dormant and wake at 25/40/55/70%
  (v0.21 몰래 리젠 contract untouched — the developer did not ask to change it).
- Raccoons/geese: yard roles unchanged (거위 선례 ② 구역 격리).
- Any detection/aggro/speed LOGIC constant, chase/invest/alert states, guardOrInvest.
- LAYOUT / generation / `layoutChecks()` — zero changes (loop data stays as generation
  artifact and dormancy identity; layout hash must not move for any seed).
- Cross-floor roaming (cell graph has no inter-floor edges — 층별 닭 봉쇄 is a settled rule).

## Design Decisions (probed & settled — do not relitigate during implementation)
- **All 10 chickens roam floor-wide** — developer picked this over "guards orbit their tray"
  (recommended) and "only the 4 free patrollers roam". Consequence accepted: trays are
  periodically unattended; the stealth economy shifts from guarded vaults to timing puzzles.
  (Rejected: guards-orbit — developer wants no spot-guarding at all.)
- **Guard reactions survive** — `guardOrInvest` still sends the assigned guardian to its
  tray on nearby noise (GUARD_HOLD stay). The repeal covers idle stationing only, so the
  tray is still *defended*, just not *camped*. This is the smallest honest reading of the
  repeal and keeps KILL/KO economics meaningful.
- **Roam transit may cross the spine; roam targets may not sit on it** — mirrors the static
  rule exactly (loop *waypoints* were banned from the spine; shortest-path transit never
  was). Banning transit would disconnect the two maze halves.
- **Gate cells are banned as targets AND as path cells** — the v0.20 gate lesson was that
  "상주 금지" alone missed 15.65% pass-through violations. The path check walks the same
  `nextCell` chain `navTo` will actually use, so check and behavior cannot diverge
  (`onAnyShortest` philosophy, applied at runtime). Corner cells only reachable through a
  gate simply never become roam targets — entrance/stair neighborhoods stay free of
  unprovoked threats, preserving the sneak-in/out and stair-escape guarantees.
- **Anchor (`ax/az`) updates to each arrived roam waypoint** — identical to the old loop
  arrival semantics, so the CHK_LEASH `toInvest` gate keeps its "near where I should be"
  meaning without touching the constant.
- **Roam speed = `PATROL_SPD` (65), dwell 0.6–1.8s** — the constant was minted for patrol
  transit (between 배회 42 and invest 110); short dwell delivers the "계속 배회" feel.
  No new tuning knobs (dwell jitter was a literal before; stays a literal).

## Acceptance Criteria
- [ ] Night start: torch cone + beam visible for the local player; T toggles it off/on;
      hiding in a jar forces it off; blackout kills all torches via the 1.2s stutter.
- [ ] Personal glow (0.35/90) present when alive, outside jars, not in blackout-carry mode.
- [ ] Watching any chicken for ~60s shows it traversing multiple cells away from spawn;
      no active chicken idles in one cell indefinitely.
- [ ] No chicken ever dwells on or path-transits 정문/계단 gate cells while roaming.
- [ ] Guards still divert to their tray on nearby noise (guardOrInvest intact).
- [ ] Dormant patrollers still wake at 25/40/55/70% with the 0.8s telegraph.
- [ ] `node --check` passes; load-time self-checks green (`CCL8_VERDICT.bad` empty);
      layout hash unchanged for a fixed seed vs v0.24.
- [ ] Version reads v0.25.0 in `<title>`, title-screen sub, and `PROTO_V`.

## Related Files / Modules
| File | Role |
|------|------|
| D:\Work\vibe\CCL8\chicken-heist.html | Single-file game — all edits land here |
| D:\Work\vibe\CCL8\CLAUDE.md | Decision ledger — add the tray-guard idle-stationing repeal |
| D:\Work\vibe\CCL8\docs\goal\chicken-heist-full-roam.md | This spec |

## Must-Preserve
- LOGIC freeze: zero detection/aggro/speed-constant changes (roam is movement targets only).
- `layoutChecks()` untouched — adding predicates there would shift which sub-attempt each
  seed accepts and silently change existing layouts (hash break across all invites).
- Dormancy identity `guard===-1 && loop` and check 17e ("guard dormant") semantics.
- Host authority: roam randomness runs only past the client bail (`clientTick` return);
  zero new net messages; chicken positions mirror as today.
- Blackout instant-alert line inside `wander` and cluck cadence — byte-identical behavior.
- `chickens[0]` inert identity check (tray0 guardian: no guard index, no loop).
- 몸 축척 동결 · v0.22 동결 11 · 위협 가시성 계약 — untouched.

## Existing Integration Contract
- `toInvest` leash reads `c.ax/az` — roam must keep updating the anchor on arrival or the
  investigation gate silently widens/narrows.
- `breakChase()`/invest/return re-enter `wander`; the return-arrival branch
  (`if(!c.loop) pickWander(c); else c.dwell=0.5`) must route into the roam picker for both
  chicken kinds.
- Dormant wake (`c.state='wander'; pickWander(c)`) must seed a roam target the same way.
- Restart reset block re-homes chickens and clears `loopI/dwell` — clear the roam target too.

## Execution Notes
- Recommended model: Claude Fable 5 (current top-tier) for the wander-state rewrite and the
  gate-path predicate — judgment-heavy edits inside a contract-dense file. The torch
  one-character fixes and version bumps are mechanical; a cheaper model (e.g. Sonnet) would
  be acceptable for those alone.
- This document cannot enforce the model — the executing session's `/model` setting decides.
  If the session model is below the recommendation, surface it to the user and confirm
  before proceeding.
