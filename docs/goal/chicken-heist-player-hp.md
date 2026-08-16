# goal: chicken-heist-player-hp

## One-line Goal
Give the player a 3-point buffer so one touch no longer erases a whole round
trip, raise the swing rate 2.5s → 0.70s, and move the kill price onto a
dedicated 9s finisher reload — measured so that clearing a floor stays a tight
choice (1.17× parity) instead of a dominant strategy.

## Background / Motivation
Developer (2026-08-17): "내 hp가 없고, 한방에 죽는거 별로고, 내 연사속도가 너무느려".
Precision on "죽는다": the player never dies — contact means stumble + robbery.
The complaint is that **one contact deletes the entire trip's cargo**. A 3-lens
panel (hp / combat / plumbing) + merge ran deterministic harness sims on the
actual game functions; every number below is measured, not estimated.

## Design Decisions (panel-settled — do not relitigate)
- **D1. HP_MAX=3, buffered contacts.** A hit with hp>1: hp−1, short stagger
  (`HURT_STUN=PUSH_STAGGER` 0.35s), invuln frames, **cargo kept**, chicken
  backs off flapping (`flap`+`FLAP_T` — reused branch; without this the
  re-contact p10 collapses to 3.0s and HP becomes a countdown, not a buffer;
  with it p10=9.97s). Measured: knockdowns 5.00 → 1.15/night (−77%), robbery
  4.20/night (chicken's thief verb survives), **extraction rate unchanged
  6.55~6.75** — HP converts item loss into time loss, exactly right for a game
  whose real currency is the night clock. (Rejected: HP4 — robbery 3.45 thins
  the chicken identity; HP2 — knockdowns 1.80, "한방" feel not fully gone.)
- **D2. HP 0 creates no new failure state.** The final hit is the existing
  knockdown verbatim (hand egg robbed, pocket egg scattered, 1.15s stumble) and
  **recharges hp to max** — no respawn, no game-over, no teleport (the
  "쫓겨남" alternative would erase 40–60s in a 20–30s-loop game, harsher than
  robbery, and would bypass the 즉사 금지 escape valve). No new recovery
  channel either — recharge-on-knockdown alone keeps robbery at 4.20/night.
  `stats.caught` counts knockdowns only, so the settlement "잡힘 N" keeps its
  historical meaning (times you lost an egg).
- **D3. PUSH_CD 2.5 → 0.70, derived as `2*PUSH_STAGGER`** (slowdown duty
  exactly 50% while swinging). Shove and punch stay on one cooldown.
  Measured correction to v0.17's cost (b): the 2.5s cooldown was absorbed into
  walking time between birds — its real kill-deterrence was 4–5 seconds, not
  the mechanism it was believed to be. `SHOVE_ANIM_T=0.45` so the faster swing
  doesn't freeze-pose between swings.
- **D4. The kill price moves to `KILL_CD = KILL_RAGE_T` (9.0s), finisher-only.**
  First KO+finish is instant; the *next* finisher waits until the rage the last
  kill caused has passed (the two constants are one knob by construction).
  Full-night measurement (truck → B1 sweep 6 birds → loot): cost 64.8s = 26.5%
  of the night vs break-even K*=31.1% → dominance ratio **1.17× = tight
  choice**. (Rejected: KILL_CD=KO_T 6.0 — 20.4%, 1.52× dominant; KILL_CD 12 —
  the finish window closes inside KO_T and sweeps stop completing; the parent
  brief's "≥40% cost" bar — K* itself is 31.1%, so 40% would make killing
  strictly dead content.) The three axes are measured near-orthogonal: K* is
  flat across HP 1–4, and sweep contacts are 0.67–2 regardless of HP (KO range
  60 dominates contact 28) — "tank and clear" does not emerge from HP.
- **D5. Meat economy untouched.** Meat (raw 2 / cooked 4) is worse than the B1
  bigEgg (raw 3 / cooked 4) it displaces from the 2-slot carry — farming is
  self-limiting. LOOT_VAL/COOK_BONUS frozen; no glove durability system.
- **D6. Display: world-first + the established body-UI corner.** Hearts row
  next to the existing stamina bar (#inv is the precedented body-state spot —
  HUD top line gains 0 items, D7 intact); #hurt edge vignette (static, no
  pulse, centre untouched); mate chip shares the exclusive one-word slot
  ('넘어짐!' : '다침'). Finisher reload shows in the prompt
  ("사살 재장전 중… N초").
- **D7. Wire: pl tuple 13 → 15 (append-only): [13]=hp, [14]=q1(shoveCd).**
  [14] lets the client mirror stagger slowdown — clientPredict previously
  lacked the host's `stagger→spd*0.4` term, which at 0.70s cooldown would
  rubber-band every volley; fixed plus local swing prediction (anim/sound on
  click, judgment stays host-side). Ceremony split by stun magnitude:
  >0.6 = knockdown (full snap), else buffered (light shake). PROTO_V v0.20.

## Acceptance Criteria (all verified live)
- [x] Buffered hit: hp 3→2→1, stun 0.35, cargo kept, chicken flaps, caught not
      counted. Third hit: robbery + stumble 1.15 + caught=1 + hp recharged.
- [x] PUSH_CD 0.70; first finisher instant (killCd→9.0); second finisher
      blocked while reloading (chicken stays KO'd, not dead).
- [x] pl tuple length 15; validate() green incl. 6 new checks (tuple-width
      lock, PUSH_CD>PUSH_STAGGER, SHOVE_ANIM_T<PUSH_CD, KILL_CD≥KO_T,
      HP_MAX≥2, HURT_STUN<STUMBLE_T).
- [x] Hearts/vignette render; reset & dropLeaver restore hp/killCd/shoveCd.
- [ ] Developer feel pass: is 0.70s fast enough (lowering further requires
      lowering PUSH_STAGGER in the same commit), and does the hearts+vignette
      read as "my HP".

## Must-Preserve
- 즉사 금지: no fail state, no respawn, no teleport — verified the HP-0 path is
  byte-equivalent to the v0.17 knockdown plus recharge.
- STUMBLE_T/INVULN_T frozen (their 2.55s sum is the re-contact floor and the
  escape valve's substance). Behaviour constants, LOOT tables, KILL_ALARM_R,
  KILL_RAGE_T, meat cap — all untouched.
- Host authority; append-only snapshot; PHASES frozen; server.js relay-only.
- Best-score note: PROTO_V bump renamespaces ccl8.best.* (intended — the score
  distribution genuinely changed).

## Related Files / Modules
| File | Role |
|------|------|
| D:\Work\vibe\CCL8\chicken-heist.html | The whole game |
| D:\Work\vibe\CCL8\CLAUDE.md | Ledger: HP principle break + (b) correction |

## Execution Notes
- Recommended model: Claude Fable 5 (judgment-heavy balance work). This
  document cannot enforce the model — the session's /model setting decides.
