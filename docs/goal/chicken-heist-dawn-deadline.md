# goal: chicken-heist-dawn-deadline

## One-line Goal
Replace the bare elapsed-time readout with a themed night clock and a hard dawn
deadline: the heist runs from midnight to 06:00 in-game, and if the run is not
finished when the rooster crows at dawn, the whole team fails — comedically,
never lethally.

## Background / Motivation
Developer request (2026-08-13): "we have time *measurement*, I want a time
*limit* — Lethal Company restricts runs to 9AM–11PM; give ours a concept/setting
too." The fiction is already in place: the intro literally opens with "밤이다"
(it's night), and the farm setting hands us a free dawn herald — the rooster.
The design doc's open question "하루 리듬 (daily deadline pressure)" points the
same direction; this feature implements the **in-run** deadline only and leaves
the meta day-rhythm question open.

Current state (v0.10): `stats.t` counts up and is shown raw ("시간 12.3초") in
the HUD and end screens. The only countdown is the blackout timer
(`DARK_TIMER=300`), which triggers the blackout stage, not a loss. There is no
time-based fail; the only fail is running out of eggs.

## In-scope
- `NIGHT_LEN=480` (seconds, tuning constant at top of file): real-time length of
  the night. `stats.t ∈ [0, NIGHT_LEN]` maps linearly to an in-game clock
  00:00 → 06:00 (80s per in-game hour at the default).
- HUD: the raw "시간 X.X초" readout is **replaced** by the night clock
  ("밤 12:07", "새벽 3:24"), warn-colored in the final in-game hour. The
  blackout countdown ("정전까지 M:SS") stays exactly as-is — it was a verbatim
  developer request in v0.6 and is not reverted.
- Dawn fail: host-side rule — if `phase==='play'` and `stats.t>=NIGHT_LEN`, the
  run fails for the whole team. Checked after the frame's egg/win processing so
  a same-frame third delivery still wins (last-second saves feel great).
  Blackout state does not matter: sunrise ends a blackout run too, and
  `startFail()` already calls `endBlackout()` — sunrise doubles as lights-on
  for free.
- Fail ceremony (comedy, no death): rooster crescendo + screen flash, fail
  overlay gets a dawn-specific title ("해가 떴다…" variant); camera anchor
  (`lastLoss`) set to the local player since no egg was lost.
- Rooster warnings at T-60/T-30/T-10 seconds: new WebAudio-synth crow
  (`crowS`, composed in the style of `squawkS`) + `bigmsg` lines. Derived
  locally from `stats.t` on host **and** clients (D22 pattern — snapshot delta
  is the event; no new socket fields).
- Client-side fail framing: clients learn of the fail via the snapshot `ph`
  transition (D15). Whether it was a dawn fail vs an egg-shortage fail is
  derived from synced `stats.t >= NIGHT_LEN-1` (1s epsilon because `st[0]` is
  q1-rounded). Host sets an explicit `failWhy` flag; clients fall back to the
  epsilon test inside `showFailOv()`.
- End screens: win shows escape time on the clock ("새벽 2:14 탈출 (171초)");
  fail keeps its stats line. Raw seconds survive only as the parenthetical.
- Copy: one intro/title line establishing the deadline fiction
  ("해 뜨기 전엔 나와야 한다…").
- Self-check harness: add an assertion `NIGHT_LEN > DARK_TIMER` (a night shorter
  than the blackout timer would make the blackout unreachable).
- Version bump v0.10 → v0.11 in all three display spots (title tag / title
  screen `.sub` / script header comment, with a 1–2 line change summary) plus
  `PROTO_V='v0.11'` — the rule change should force stale clients to refresh.

## Out-of-scope
- No changes to bright-section aggro/vision LOGIC constants (v0.4 invariant).
- No change to `DARK_TIMER` semantics or value; the blackout trigger chain
  (확보 총량 vs timer) is untouched.
- No server/relay changes — `server.js` stays relay-only.
- No sky/sun simulation or gradual lighting change over the night; the only
  visual is the fail-moment flash + HUD. (Cheap by design; revisit only if the
  clock alone doesn't read.)
- Does NOT settle the design doc's open "하루 리듬" (1일 1원정?) question — that
  is meta-structure; this is a single-run clock.
- NOT the shelved 부패·허기 clock or 영업 러시 — no ingredient decay, no order
  quota; this is a session time limit only.

## Acceptance Criteria
- [x] `node --check` passes on the extracted `<script>`. (2026-08-13)
- [x] During play the HUD shows the night clock instead of raw seconds; it
      reaches 아침 6:00 exactly when `stats.t` hits `NIGHT_LEN`. (verified via
      manual `update()` stepping + `render()` on 127.0.0.1)
- [x] At dawn the run fails (host judgment) with the dawn title, lights on,
      rooster crow — verified during blackout (sunrise ended it). `?dark=0`
      path shares the same check (outside the `darkEnabled` guard).
- [x] Delivering the third egg on the same frame as dawn still wins — by
      construction: dawn check runs after the frame's delivery processing,
      guarded by `phase==='play'`.
- [x] Rooster warnings fire at T-60/30/10 — host path verified (T-60 crow +
      bigmsg + HUD warn color); client path is the identical derived block in
      `clientTick`.
- [x] 2-tab multiplayer run verified (2026-08-13, local relay on :8787, room
      VTCS, host + 1 client): client clock mirrors host exactly (밤 12:01 →
      새벽 5:15 → 아침 6:00), client derives its own T-60 rooster warning and
      HUD warn color, dawn fail arrives via the `ph` transition with the
      dawn-specific title and stats line while client-side `failWhy` stays
      empty (pure `stats.t` derivation, as designed), and host restart resets
      the client's clock/warnings/overlay. No console errors on the client.
- [x] Restart (R) fully resets clock, warnings, and fail framing.
- [x] Console self-check reports 14/14 including the new
      `NIGHT_LEN > DARK_TIMER` assertion.

## Related Files / Modules
| File | Role |
|------|------|
| D:\Work\vibe\CCL8\chicken-heist.html | The whole game (single-file). Constants block (~line 276–350), host update loop (~2592), `clientTick` (~3305), HUD render (~2921–2953), `startFail`/`showFailOv`/`win` (~2449–2482), `resetWorld` (~2483), sounds (~1360–1441), self-check (~3670), version spots (lines 6/105/134, `PROTO_V` ~346) |
| D:\Work\vibe\CCL8\docs\goal\chicken-heist-dawn-deadline.md | This spec |

## Must-Preserve
- 즉사 금지: failure is comedy (expulsion/pratfall framing), never death.
- Bright-section LOGIC invariant: no aggro/vision constant changes (the v0.9
  gauge exception stays the only exception).
- Blackout countdown HUD ("정전까지") stays visible pre-blackout — v0.6
  developer verbatim request.
- Multiplayer no-regret lines (multiplayer goal doc): `targetOf` accessor /
  `zoneOf`·`groundY` pure / no singular player globals / all sim through
  `update(dt)` / deterministic encounters.
- D15 split: judgment on host only; clients react to snapshot `ph` transitions
  with the same ceremony functions. The dawn check must live in host-only code
  paths (`update()` after the client early-return).
- Relay server is forwarding-only; no game judgment moves to `server.js`.

## Fairness Constraints
- One clock for the whole team: dawn fail is a team fail, judged only by the
  host from `stats.t` (already snapshot-synced, q1-rounded). No client-local
  clocks drift into judgment.
- Pause semantics unchanged: when the host sim pauses (`simPaused`), `stats.t`
  freezes, so the night clock freezes with it — clients see the frozen clock
  via snapshots.

## Existing Integration Contract
- `stats.t` keeps its exact meaning (sim-seconds since play start, q1 in
  snapshots); the clock and deadline are pure derivations of it.
- Snapshot schema unchanged (no new fields) — warnings and fail framing are
  derived client-side per D22.
- `startFail()`/`showFailOv()`/`FAIL_HOLD` flow reused for the dawn fail; only
  the overlay title/copy branches on the fail reason.
- `PROTO_V` bump gates mixed-version rooms exactly as today ("버전이 다르다 —
  새로고침" path).

## Execution Notes
- Recommended model: Claude Fable 5 (current top-tier) for the fail-ceremony
  feel, Korean copy tone, and the host/client judgment-split edges — these are
  judgment-heavy. A cheaper model (e.g., Sonnet) is acceptable for the
  mechanical parts (constant plumbing, HUD string swap, version bump).
- This document cannot enforce the model — the executing session's `/model`
  setting decides. If the session model is below the recommendation, surface it
  to the user and confirm before proceeding.
