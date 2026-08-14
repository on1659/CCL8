# goal: chicken-heist-guard-goose

## One-line Goal
Put two guard geese in the yard — the one stretch of the map that was free — so
the repeated truck↔barn crossing of the v0.13 score loop costs something, with a
rule a friend can learn without being told: walk the middle and you pass, run and
they wake.

## Background / Motivation
Developer request (2026-08-15): "새 동물 추가 ㄱㄱ". This is the card left open
when the ban on non-chicken animals was lifted on 2026-08-14 — the original ask
behind it was "몬스터들도 갑툭튀로 놀랄수있게… 시련이 너무 적어서 재미가 없어".

The ban lift came with a recorded condition: a new animal must be **a species
whose presence on a chicken farm reads without explanation**, because the design
doc's core decision 3 ("동물이라 왜-질문이 공짜다") weakens otherwise. Geese are
the shortest answer that satisfies it — farms genuinely keep them as guard
animals, they are famously aggressive, and being chased by one is comedy rather
than horror, which the 즉사 금지 rule requires.

Where it goes is not arbitrary. v0.13 turned the game into repeated round trips,
and the yard (a straight corridor at z=TRUCK_Z from the truck at x=250 to the
barn door at x=900) is the segment every trip crosses and the only one with no
threat on it. Putting the new animal there charges the loop's most repeated
action instead of adding pressure where pressure already exists.

## In-scope
- Two geese at fixed posts flanking the yard corridor: `(590, TRUCK_Z-170)` and
  `(790, TRUCK_Z+180)`, both offset further than `GOOSE_WAKE_R=150` from the
  centre line so a quiet lane provably exists.
- State machine `sleep → honk → charge → back → sleep`. Deliberately **not** a
  copy of the chicken AI: no detection gauge, no patrol loop, no theft.
- Waking has two paths: within `GOOSE_WAKE_R=150` at any speed, or within
  `GOOSE_HEAR_R=420` **while running**. This is the whole rule — walk the middle
  and you pass.
- `GOOSE_HONK_T=0.55` telegraph before the charge (honk + neck raise + feather
  burst) so the hit is never instant.
- Waking fires `decoyPulse` at the goose — noise reaches chickens through the
  existing validated channel rather than a new alarm path. Role split: chickens
  steal, geese raise the alarm and shove.
- Contact knocks the player down (`STUMBLE_T`, `INVULN_T`) and drops **both**
  hand and pocket items as physics objects. The goose does not carry loot away —
  that stays the chicken's job.
- Geese are confined to the yard: `GOOSE_MAX_X = BARN.x0-40`, and they give up if
  the target enters the barn or leaves zone 0. Running through the door is a
  legible escape — into the chickens.
- Multiplayer: host-authoritative, new top-level snapshot field `gs`
  (`[x, z, dir, stateIdx, tgt]`), client interpolates like chickens and derives
  only the honk sound from the state transition. `PROTO_V` → v0.14.
- Self-checks 20-22: geese are in the yard and not camping the pad, cannot cross
  into the barn, and a quiet lane exists on the corridor centre line.
- Title copy: "마당에 거위가 잔다 — 뛰면 깬다." Version bump v0.13 → v0.14.
- Drive-by fix: Korean subject particle for player names was wrong in three
  strings added in v0.13 ("파랑가"). Centralized as `nameSub(i)` — only 보라 takes
  "가".

## Out-of-scope
- Any change to chicken aggro/vision constants (밝은 구간 LOGIC 불변). The goose
  is a separate entity with its own constants; no chicken constant is touched.
- Geese inside the barn or basement, goose egg theft, goose nests, more than two
  geese, goose interaction with the blackout stage beyond existing lighting.
- Retuning v0.13 numbers (blackout multiplier, grade thresholds) — those need
  play data, not more code.

## Acceptance Criteria
- [x] `node --check` passes; self-check reports 22/22.
- [x] Walking the corridor centre line from x=400 to x=880 wakes neither goose.
- [x] Running the same line wakes both.
- [x] The charge is preceded by a 0.55s honk during which no hit lands.
- [x] Contact knocks the player down, drops carried loot, and the goose returns
      rather than taking anything.
- [x] Entering the barn makes a charging goose give up; it never crosses x=860,
      returns home and falls back asleep.
- [x] Multiplayer: client mirrors both geese (state, position) and the knockdown
      message propagates.

## Related Files / Modules
| File | Role |
|------|------|
| D:\Work\vibe\CCL8\chicken-heist.html | The whole game (single file) |
| D:\Work\vibe\CCL8\docs\goal\chicken-heist-guard-goose.md | This spec |
| D:\Work\vibe\CCL8\CLAUDE.md | Ban lift + its condition, recorded 2026-08-14 |

## Must-Preserve
- 즉사 금지 — the goose knocks you over, it never kills.
- 밝은 구간 LOGIC 불변 — no chicken constant changes.
- Multiplayer no-regret lines; host-only judgment (D15); `PHASES` frozen;
  snapshot additions by name/append only; `server.js` untouched.
- Chickens remain the only thieves; the goose must not gain loot ownership, or
  it inherits the entire robbery/leaver/cart code path.

## Fairness Constraints
- Goose posts are fixed literals, not random — the same determinism the rest of
  the map uses, so a run is reproducible.
- Waking depends on player speed and distance only; no line-of-sight, so it is
  symmetric in the dark and cannot be gamed by camera angle.
- Solo and 4-player use the identical rule (no player-count gating).

## Existing Integration Contract
- `decoyPulse` is reused as-is for the honk's noise; chickens react to it exactly
  as they do to a broken egg.
- The knockdown reuses `STUMBLE_T`/`INVULN_T`/`caughtS` and increments
  `stats.caught`, so the settlement screen needs no change.
- Snapshot `st`/`eg`/`pl`/`ck` layouts are untouched; `gs` is a new named field.

## Execution Notes
- Recommended model: Claude Fable 5 for the state machine and the yard-confinement
  edges; Sonnet acceptable for mesh, copy, and version plumbing.
- This document cannot enforce the model — the executing session's `/model`
  setting decides. If the session model is below the recommendation, surface it
  to the user and confirm before proceeding.

## Open Questions
- Two geese may be too few or too many for a 480s run; `GOOSE_N` and the post
  positions are the tuning surface. Needs play data.
- `GOOSE_SPD=176` is set just above player run speed so a straight-line sprint
  does not escape. If that reads as unfair rather than funny, lower it before
  adding more geese.
- Whether the goose should also wake on the *blackout* (currently it uses the
  same rules in the dark, where the player cannot see it sleeping) — left as-is
  this round; the honk telegraph is the only warning in the dark, which may be
  either the best or the worst part of it.
