# goal: chicken-heist-wake-rule-cook-feel

## One-line Goal
No threat may come alive next to a player — the KO wake now respects a minimum
activation distance (a general rule for all future monsters) — and placing food
on the brooder pan answers back Overcooked-style: a plop-hiss, a steam burst, a
scale pop and a light flash at the moment of contact and again at doneness.

## Background / Motivation
Developer reports (2026-08-17, /autogoal):
1. "닭이 죽고나서 캐릭터가 근처에있을때 바로 살아나네 … 모든 몬스터에 해당하는 규칙"
   — Diagnosis: there is no respawn system. The first punch KOs the chicken
   (it collapses in a feather burst — reads as death), and 6 seconds later it
   rises **enraged with det=1 targeting the puncher standing right there**.
   Since real death now leaves nothing (v0.18 corpse removal), a fallen bird
   that gets back up is indistinguishable from resurrection.
2. "요리할때 내가 물건을 올려두는게 맞는지 확실히 피드백이 안와. 오버쿡드처럼"
   — v0.18 added continuous sizzle/steam/UI, but the *moment of placement* had
   no confirmation beat: the item lerped slowly onto the pan with only the
   generic place sound.

## In-scope
- **Threat activation minimum distance (general rule).** `THREAT_ACT_MIN_R=140`
  (outside punch 60 and sight 110, inside a lamp pool 300): no threat activation
  event — KO wake today; any spawn/respawn system tomorrow — may fire within
  this radius of any active player. Documented in CLAUDE.md as a contract;
  every future threat-introducing code path must pass through this constant.
- **KO wake gated + telegraphed.** While any player is within the radius, a
  KO'd chicken stays down indefinitely (finish it or back off — camping it
  wastes the night, which is the player's own trade). Once clear, it flaps and
  squawks for `CHK_WAKE_TELE=0.8s`, then rises enraged as before. Re-approach
  during the telegraph resets it — verified pinned at 20s of standing nearby,
  rise at 0.78s after retreat, re-pin on re-approach.
- **KO legibility: three orbiting stars** (MeshBasic, marker class — allowed by
  the v0.16 visibility contract's marker exemption) over a downed-but-alive
  chicken. Stars = "temporarily out, will get up"; disappearance + feathers =
  "dead for good". The two states can no longer be confused.
- **Overcooked-style cook feedback beats** (all cosmetic, derived from synced
  state in `updCookFx`, so host and clients render identically):
  - Placement beat: first tick on the pan → `panPlopS` (plop + hiss), a big
    steam burst, oil sparks, scale pop (`_popT` elastic bounce), kitchen light
    flash (`kitchenFlashT` ×2.2), and the snap-to-pan lerp sped up (dt·6→dt·10).
  - Doneness beat: golden glint burst + another pop + flash (ding already
    existed from the judged transition).
- Cleanup: duplicate `dead:false` key from a double-applied v0.18 patch.

## Out-of-scope
- Any respawn system (none exists; the developer's rule is recorded as the gate
  should one ever be added).
- Chicken FSM/aggro constants; the two-hit kill; death alarm — unchanged.
- The pending HP / fire-rate redesign (separate round, panel still running).

## Acceptance Criteria
- [x] KO'd chicken with a player inside 140u never rises (20s test); rises
      0.78s after the player retreats; re-approach mid-telegraph re-pins it.
- [x] Stars visible exactly while `stunned && ko`; hidden on rise and on death.
- [x] Placement beat fires once per placement (`_onPan` edge): flash 0.48 after
      one tick, pop loaded, steam burst; doneness beat re-fires pop and flash.
- [x] `node --check` passes; generator regression unaffected.

## Related Files / Modules
| File | Role |
|------|------|
| D:\Work\vibe\CCL8\chicken-heist.html | The whole game |
| D:\Work\vibe\CCL8\CLAUDE.md | The general activation-distance rule joins the threat-placement contract |

## Must-Preserve
- Host authority: the wake gate runs in `updChickens` (below the client bail);
  clients see only the state delta. No snapshot change, no PROTO_V semantics
  change (version string bumped for build pairing only).
- 밝은 구간 LOGIC 불변: no aggro/vision constant touched; the gate delays an
  activation, it never extends perception.
- Anti-farming: wake is still enraged (det=1 at the puncher); meat still 1/bird.
- Cook visuals remain derived from synced state (heat/cookT/position) — the
  `_onPan/_lastHeat/_popT` fields are per-client cosmetic scratch, never sent.

## Execution Notes
- Recommended model: Claude Fable 5 for the wake-gate edge cases; implemented
  directly in-session. This document cannot enforce the model — the executing
  session's /model setting decides.
