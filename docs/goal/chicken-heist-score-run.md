# goal: chicken-heist-score-run

## One-line Goal
Replace the 3-egg quota with a haul-as-much-as-you-can run: the night now ends
when the player pulls the departure lever or when dawn takes the truck, and
everything in between is a repeated gamble about whether to bank what you have
or go back down for more.

## Background / Motivation
Developer verdict on v0.12: "지금 시련이 너무 적어서 재미가 없어" (too few trials,
not fun), with three requested changes — score instead of quota, loot beyond
eggs, and departure on demand.

The panel's measured diagnosis corrects the obvious reading. The trials are not
missing; **the quota cuts the night off at ~31%.** The two 1F trays are banked
in one round trip (~30s) and the third egg is one B1 trip (~110-120s), so a
competent solo run hits `checkWin` at t≈150s of a 480s night. Every piece of the
deadline built in v0.11-v0.12 — the dawn clock, the three rooster warnings, the
sky reddening from t=168s, the truck driving away — is content a *successful*
player never sees. So this round is not a difficulty reduction; it is the
activation of pressure that already exists but is unreachable.

That reframing is why no extra difficulty knob (chicken density, new animals)
ships this round: if the diagnosis is right it is unnecessary, and if it is wrong
the next round can isolate the cause.

## Design Decisions (panel-settled — do not relitigate during implementation)
Settled by a 4-lens panel + cross-examination (mechanism / multiplayer /
legibility / simplification). Five blockers were found against the naive version
of this feature; each decision below closes one.

- **D1. Blackout trigger becomes "delivery accelerates the clock."**
  `DARK_BASE=360, DARK_ACC=8, DARK_MIN=240`;
  `darkAt = clamp(DARK_BASE - DARK_ACC*stats.delivered, DARK_MIN, DARK_BASE)`,
  fires when `stats.t >= darkAt`. Delete `checkDarkTrigger()` and its
  secured-total condition. The accelerator must be `stats.delivered` only
  (monotonic) — using carried items would make the countdown run *backwards* when
  an egg breaks or is robbed. Each delivery that lowers `darkAt` replays the
  existing `flickT=WARN_DIP_T` + `clunkS()` so the jump is audible.
  (Rejected: pure timer — makes the blackout avoidable, and since the blackout is
  pure penalty the optimal play becomes "leave at t=350"; that would make the
  most expensive content in the game something only mistakes reveal. Rejected:
  cargo-count threshold — with supply raised to 18 it fires on the second
  delivery and the bright section evaporates.)
- **D2. Failure has exactly one path: not being on the truck at 06:00.**
  Delete `checkWin()`, `checkFail()` and `aliveEggs()`-based judgment along with
  all six call sites. A 0-haul departure is not a failure, it is the lowest
  grade. (Rejected: keeping a minimum — it resurrects the quota through the back
  door. Rejected: setting `NEED_EGGS=0` — leaves a dormant rule that wakes up
  when supply changes.)
- **D3. Dawn keeps what is on the truck; you only lose what you are carrying.**
  Plus a **6-second last-call**: `TRUCK_GO_T` 2.2 → 6.0, and touching the pad
  during that window still banks and counts you as aboard. Total forfeiture was
  rejected as a violation of the 즉사 금지 principle in spirit (all its examples
  are partial losses) and because it collapses the choice this feature exists to
  create — with everything at stake the answer is always "leave at 05:30".
- **D4. Departure = lever at the truck cab + public countdown + cancel from
  anywhere.** `LEVER_R=45` at the cab (x≈192, 188u away from the pad at x=380 so
  it never collides with delivery), E to start, `DEPART_T=20`s countdown, horn ×3
  + headlights + `bigmsgCast`. If every active player is inside the pad the
  countdown shortens to 1.5s (solo therefore feels instant — this is a natural
  consequence of one rule, not a player-count gate). Cancel is a dedicated key
  (C) usable **from anywhere**, **once per player per run**, with an 8s re-arm
  cooldown. Dawn always wins over an in-flight countdown.
  Rationale: a B1-deep player is ~60s from the truck, so no countdown can protect
  them — the countdown length serves 1F/yard legs and the *cancel key* is what
  protects the basement. Position-independent cancel is what keeps `p.stun`,
  being lost in B1, or standing mid-stairs from deadlocking.
  (Rejected: unanimous vote — permanent deadlock in a codebase with no AFK
  detection or kick. Rejected: quorum — `dropLeaver` changes `activeCount`
  per-frame. Rejected: host-only cancel — mirrors the griefing it prevents.)
- **D5. Loot axis is depth and carry-channel; zero new item classes.**
  Add a `kind` field to the existing `eggs[]` pipeline rather than new entities:
  `kind ∈ {'egg','bigEgg','meat'}`. Values: 1F egg 1, B1 bigEgg 3, meat 2.
  bigEgg gets a 1.4× warm-gold mesh so depth reads as silhouette at 20m.
  Chicken meat is **promoted to a carryable** (the code already flags this:
  `// 임시: 운반물 승격은 v0.7 후보`) — delete `meats[]` and the instant-harvest
  `stats.meat++` branch; on KO activate a pool entry as `kind='meat'`. Meat is
  unbreakable and **cannot go in the pocket** (channel lock), but can ride the
  cart. Supply rises **per tray, not per tray count**: 3 per tray → 18 total
  (1F 6 / B1 12), which is the only increase that leaves self-checks #3 and #4
  and the chicken/aggro constants untouched.
  Reusing `eggs[]` structurally deletes the highest-risk regression class this
  round (a parallel ownership/leaver/robbery path for a second entity type).
  (Rejected: bulk items like feed sacks — needs two-hand occupancy, a cart-only
  mechanic, and **whether the cart can even reach B1 is unverified**. Rejected:
  scoring `stats.meat` without promotion — leaves a zero-risk free-score line
  that makes "ignore eggs, glove up, KO all 10" optimal.)
- **D6. Delivering during blackout is worth ×2**, shown by the item glowing gold
  in the cargo bay, not by a new number. This is the only proposal that answers
  "the blackout is pure penalty so avoiding it is optimal."
- **D7. HUD shrinks from 2 lines / 10 items to 1 line / 3 items.**
  Keep: [수확 N] · [night clock] · [정전까지 M:SS] (+ mate chips in multiplayer).
  Delete: 계란 n/3, 남은 계란 + "하나도 못 깨진다!", 확보 n/3, 깨짐, 잡힘, floor,
  camera mode. **The real scoreboard is the truck** — expand `deliveredMesh` from
  3 hardcoded slots to a 12-slot rack with per-kind meshes, and change the side
  sign to "수확 N".
  Three hard lines: (a) no currency symbols or amounts — a bare integer, and the
  word "점수" never appears in UI text; (b) no icon legends, score tables, or
  combo gauges; (c) no per-player score in the HUD (settlement screen only).
  (a) is guardrail compliance, not taste: CLAUDE.md shelves 상점·구매·스탯 and the
  design doc leaves "구매 화폐의 단위" as an open question that CLAUDE.md forbids
  closing unilaterally — a ₩ figure would close it as "sale proceeds".
- **D8. Close three bypass routes in the same round** (all one-line/constant, no
  new-system budget): (1) thrown eggs no longer get the pad's soft-landing
  exemption (`if(soft && !e.thrown)`) — max throw range is ~521u and the barn
  west wall to pad edge is 475u, so today the entire yard crossing is free and
  skips carry slowdown, shake/slip, blackout lantern glow, and abandoned-egg
  robbery; (2) `SPAWN` moves to `TRUCK_X+290` — all four spawn points currently
  sit *inside* the pad (35-44u < r=45), which would make D4's "everyone in pad"
  clause true at t=0; (3) the cart's ejection counter accrues whenever loaded
  (run 1.0/s, walk 0.25/s, blackout ×1.5) instead of only while running, which
  today makes it a risk-free 2-slot backpack.
- **D9. Pocket invulnerability is priced, not patched** (developer decision,
  2026-08-14): `SWAP_T` 0.5 → 1.2 rather than changing `carriesEgg()`. This keeps
  the 밝은 구간 LOGIC 불변 contract intact — no second LOGIC exception — at the
  cost of leaving the bright-section pocket blind spot in place. The pocket
  protects 1 of a 4-item round trip, and meat is channel-locked out of it.
- **D10. Protocol changes are forced and must be append-only.**
  `PROTO_V` → 'v0.13'. Snapshot `st` extends to
  `[t, broken, delivered, caught, meat, score, depT, dpBy]` — indices 0-4 must not
  move (`applySnap` reads by raw index with no length check, so a middle
  insertion silently draws wrong values with no error). Add a
  `if(!s.st||s.st.length<8) return;` guard. `PHASES` stays frozen — the departure
  countdown is a *field*, not a new phase. `eg` tuples get `kind` appended at the
  end. `server.js` is untouched.
  **`depT`/`dpBy` are an explicit, recorded exception to D22** ("clients derive
  ceremony from deltas"): remaining departure time cannot be derived from any
  existing field, and without it a client cannot see when to cancel, which would
  kill D4's anti-griefing device.
- **D11. One settlement screen, two stamps.** Departure → `phase='win'`, dawn →
  `phase='fail'` (inheriting `dawnCeremony`/`truckGoT`), but both render the same
  tally板 with different headline. Grades `GRADE=[1,10,25] × starting player
  count`: 0 = 빈 트럭 / 1+ = 오늘 장사는 됐다 / 10+ = 한탕 했다 / 25+ = 대형사고.
  Personal best in `localStorage['ccl8.best.'+playerCount]`, shown on the
  settlement screen only — the quota gave a free denominator (3/3) and removing
  it leaves the player unable to tell a good number from a bad one.
  The truck-drives-away shot stays **exclusive to players who missed it**, so
  "we left together" and "you got left behind" never look identical.

## In-scope
- Delete quota judgment (`checkWin`/`checkFail`/`aliveEggs` gating, `NEED_EGGS`
  comparisons) — D2.
- Value table + `stats.score`; blackout ×2 — D5, D6.
- Blackout acceleration — D1.
- Supply 6 → 18 via 3 per tray; guardian/robbery lookups generalized from a
  single egg index to "surviving item in tray group" — D5.
- Meat promoted into `eggs[]` as `kind='meat'`; `meats[]` deleted — D5.
- Departure lever, 20s countdown, cancel key, pad-shortcut, SPAWN move — D4, D8.
- HUD reduction, truck cargo rack, sign text — D7.
- Settlement screen unification + localStorage best — D11.
- Bypass closures (throw delivery, cart ejection) + `SWAP_T` 1.2 — D8, D9.
- `PROTO_V` bump, `st` append-only extension with length guard — D10.
- Version bump v0.12 → v0.13 in all three display spots.

## Out-of-scope
- New animals / monsters. The ban was lifted 2026-08-14, but the developer scoped
  this round to score + departure + loot. Next round.
- Chicken density or any aggro/vision constant change — the diagnosis says the
  pressure already exists; adding a knob now would destroy attribution.
- Bulk loot (feed sacks) — blocked on unverified cart-to-B1 traversal.
- Per-player scores, currency units, shops, orders. Cooking. Netcode changes.
- Rollback flags (`?score=0`): `?dark=0` already forks the judgment path; a
  second flag creates host/client mismatch bugs. Roll back with git.

## Acceptance Criteria
- [ ] `node --check` passes on the extracted `<script>`; self-check reports all
      pass including the new assertions.
- [ ] No path reaches `phase='fail'` except `startDawnFail` (asserted).
- [ ] Breaking every egg does not end the run.
- [ ] Blackout fires at 360s with 0 delivered and at 240s (floor) with 15+;
      the countdown visibly jumps and clunks on each delivery.
- [ ] Supply is 18 (1F 6 / B1 12); every tray past #0 still has a guardian.
- [ ] KO drops a carryable meat that can be picked, carted, dropped, robbed, and
      delivered; it cannot be pocketed and never breaks.
- [ ] Lever starts a 20s countdown solo-shortened to 1.5s inside the pad; C
      cancels from anywhere, once per player; dawn overrides an active countdown.
- [ ] Spawn points are outside the pad (asserted).
- [ ] A thrown egg landing on the pad can break; a gently thrown one still
      survives.
- [ ] HUD is one line of three items; the truck rack physically shows the haul.
- [ ] Multiplayer: client mirrors score and departure countdown, can cancel, and
      a v0.12 client is rejected by the version gate.
- [ ] Dawn with items carried: banked haul survives, carried items are lost, the
      6s last-call banks a diving player.

## Related Files / Modules
| File | Role |
|------|------|
| D:\Work\vibe\CCL8\chicken-heist.html | The whole game (single file) |
| D:\Work\vibe\CCL8\docs\goal\chicken-heist-score-run.md | This spec |
| D:\Work\vibe\CCL8\CLAUDE.md | Scope rules; ban lift + quota reversal recorded 2026-08-14 |

## Must-Preserve
- 즉사 금지 — every failure stays comedy; D3 exists to honor this.
- 밝은 구간 LOGIC 불변 — no aggro/vision constant changes (D9 chose cost over
  exception precisely to keep this).
- Multiplayer no-regret lines: `targetOf` accessor / `zoneOf`·`groundY` pure /
  no singular player globals / all sim through `update(dt)` / deterministic
  encounters.
- D15 host-authority split; clients never judge. D22 delta-derived ceremony,
  with the single recorded exception in D10.
- `server.js` stays relay-only.
- Decoy throwing (`decoyPulse`) must keep working — D8(1) is scoped to `!e.thrown`
  landing exemption only.

## Fairness Constraints
- Score is computed by the host and shipped as a number; clients never hold the
  value table (D15).
- `?dark=0` exempts a run from every blackout penalty while scores are now
  comparable — it is a developer-local isolation flag and must not be used for
  runs whose score is shared. Noted, not enforced this round.
- Grade thresholds and the ×2 blackout multiplier are first-pass estimates with
  zero play data; they are tuning constants, not contracts.

## Existing Integration Contract
- `stats.t` keeps its meaning; `stats.delivered` becomes item count (not egg
  count) and remains monotonic — D1 depends on that.
- Snapshot indices 0-4 of `st` are frozen; new fields append only.
- `PHASES` array is frozen; departure state rides in fields.
- Intent queue (`pushAct`, cap 12) is reused for depart/cancel — no new channel.

## Execution Notes
- Recommended model: Claude Fable 5 for the departure state machine, the
  host/client split around `depT`, and the meat-into-`eggs[]` rewiring — these
  are the judgment-heavy, regression-prone parts. Sonnet is acceptable for the
  mechanical parts (HUD reduction, constant plumbing, version bump).
- This document cannot enforce the model — the executing session's `/model`
  setting decides. If the session model is below the recommendation, surface it
  to the user and confirm before proceeding.
- Implementation order (each step followed by `<script>` extract → `node --check`):
  1. Delete checkWin/checkFail + HUD reduction
  2. Value table + drawSign + cargo rack
  3. Blackout acceleration + self-check #15 references DARK_MIN
  4. 3 per tray + guardian/robbery group lookup
  5. Meat `kind` absorption
  6. Departure lever + SPAWN move + PROTO_V bump + `st` extension
  7. Settlement unification + localStorage best

## Implementation Notes (filled in during the build)
- **Bug found by the panel's own spec, fixed during QA**: D4 said "if every active
  player is inside the pad, shorten to 1.5s (solo therefore feels instant)", but
  the lever sits 199u outside the pad, so the puller can never be inside it — solo
  would have waited the full 20s every single run. The predicate is now
  `allAtTruck()` (inside pad **or** at the lever).
- `resetWorld` reassigns the whole `stats` object, which silently dropped the new
  `score` field and produced `NaN`. The field is now in that literal; the earlier
  per-field reset was removed so there is one source of truth.
- `onDelivered()` only clunks while `darkAt() > DARK_MIN` — once the acceleration
  saturates at 15 deliveries the cue would be claiming a change that isn't
  happening.

## Open Questions
- Blackout delivery multiplier (×1.5 / ×2 / ×3) — shipping ×2; developer retunes
  by feel after the first run.
- Grade thresholds `[1,10,25]×players` — estimated against a theoretical ceiling
  of 62; must be recalibrated after real play.
- Whether the cart can physically traverse the stairs to B1 (`CART_LAG=0.55`
  breadcrumb around the U-switchback) — not a blocker this round since no
  cart-dependent design ships, but a required QA item before bulk loot.
- Whether pulling the lever should force the blackout on if it is still bright —
  not adopted; developer call after first play.
