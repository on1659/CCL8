# goal: chicken-heist-lethal-tight

## One-line Goal
v0.16 turns the farm into a Lethal-Company-tight space: the geese are withdrawn,
the barn shrinks to 18% of its area with corridors one-and-a-bit people wide,
the lamps become real pools with darkness between them, and the chickens stop
glowing so a threat outside the light is genuinely unseen.

## Background / Motivation
Four explicit developer instructions (2026-08-16), each verbatim:
1. "아예 없애달라니까" — the geese. Earlier rounds mis-read the original request
   ("집앞에 있어도 되지만 파훼할 수 있어야 돼") as *relocate*; it meant *remove*.
2. "이게 안밝다고? 말이안돼, 진짜 좀 어둡게해주고" — with a screenshot of a
   cream-white barn interior. Two prior rounds only lowered ambient because the
   lamps were treated as untouchable (blackout-contrast reserve). **That
   restraint is what kept the barn bright; the developer lifted it.**
3. "다니는길이 너무넓어. 맵 전체를 작게해주고" with a Lethal Company reference
   screenshot — a corridor one person barely fits through.
4. "몬스터가 너무 잘보여. 내눈에 보이지않는 몬스터여야돼"

A 4-lens design panel (scale / dark / unseen / regress) plus a merge pass sized
every constant against measured references rather than taste.

## Design Decisions (panel-settled — do not relitigate)

- **D1. Derivation direction reversed.** Until v0.15 `COOP_SCALE` → building
  size → `AH` was *the remainder* (255u = 9.8 player-widths). From v0.16 the
  corridor is the primary constant: `AH=85, CW=300, RH=40`, and the building is
  derived (`COOP_W=C_N*CW=1800`, `COOP_D=A_N*AH+(A_N-1)*RH=960` — 18% of the old
  area). Free lateral width `AH-2*(PLR_R+2)=55` = 2.1 player diameters, clearing
  all three floors: cart existence 56, chase side-step 57, door opening 2·CHOKE_IN.
  Cell aspect 3.5:1 reads as a tunnel. (Rejected: isotropic 1/3 (CW=185) — nest
  jitter ±60 lands inside plugs and the map becomes fully lootable.)
- **D2. Grid counts unchanged** (8×6 / 6×4). Maze density is a function of cell
  *count*, not cell size; shrinking by cell size keeps `targetOpen` 57/28 and all
  generator statistics bit-identical (fallback 0/3000, mean attempts 1.23).
- **D3. LOGIC radii are rescaled, not retuned — the second recorded exception to
  밝은 구간 LOGIC 불변.** Shrinking the world without shrinking the radii is a
  silent difficulty explosion, measured on four reference metrics:

  | metric | v0.15 | new geometry, radii kept | after rescale |
  |---|---|---|---|
  | patrol sight coverage of 1F floor | 14.70% | 32.79% | 14.54% |
  | cells reached by one flock alarm | 1.75 | 14.67 | 1.75 |
  | cells inside a chicken's leash | 3.42 | 17.67 | 3.25 |
  | chickens woken by a running player | 0.108 | 0.603 | 0.107 |

  So: `SIGHT_IN 240→110, SIGHT_OUT 160→73, SIGHT_DARK 80→37, DECOY_R 240→110,
  CHK_LEASH 600→280, PACK_R 500→200, RING_MAX_D 400→200, CLUCK_WAVE_MAX 600→280,
  AGGRO_RUN/PICKUP_LOUD 310→130, PICKUP_QUIET 120→50, PUSH_NOISE 200→85,
  REVENGE_R/CARRIER_SEEN/ABANDON_R 200→92, LANTERN_DIST 140→64, NET_SNAP_R
  200→90`, plus the VIS_* wave radii and `WAVE_SPEED 400→170` (so ring dwell time
  survives). `LANTERN_DIST < CARRIER_SEEN` is preserved — that inequality is the
  spine of the blackout carrier rule.
  **`DET_NEAR 60→40` is the one exception to the scale factor**: 27 would collide
  with the catch radius (28) and erase the v0.9 detection gauge's instant zone;
  60 would make 71% of an 85u corridor instant-detect. Body scale and map scale
  genuinely conflict at exactly this one constant.
- **D4. Body scale is frozen.** `PLR_R, CHK_R, cart.r, EGG_R, PICK_R, PUSH_R,
  CHK_SEP_R, PLR_SEP, LEVER_R, truckPad.r, JUMP_V, SEG_H, BARN_H` unchanged —
  "the world shrinks, people don't" is the definition of this round. Speeds are
  also unchanged: the shrink is anisotropic (x 0.54, z 0.33) so no single factor
  exists, and `CHK_CHASE 124 < loaded sprint 152.6` is the escape valve that
  keeps 즉사 금지 honest.
- **D5. Lamps: change distance and decay, not intensity.** The cream-white read
  came from `distance = max(2600, …)` — 127% of the new barn's diagonal, so one
  lamp filled the floor — combined with `PointLight` decay 1 (linear), leaving
  half the intensity 1300u away. Now `LAMP_D=300` with `decay=2` (inverse-square)
  and intensity *raised* (1.35→2.0, tray lamp 2.6). Measured falloff: 2.0 at the
  centre, 0.5 at 150u, 0.056 at 250u, 0 past 300u. 27% of cells now sit beyond any
  lamp — genuinely dark. Lamp z snaps to aisle centres (a pool that lands on a
  cage row lights nothing). Lamp count 9→10: a stairwell lamp is added because
  the only route between floors would otherwise be pitch black.
- **D6. Ceiling bulbs go everywhere, both floors, one per cell.** Localizing the
  pools means a player standing in an unlit cell would see *no change at all* at
  blackout. The bulbs are `MeshBasic` and flip with `bulbMat`, so the blackout
  stays categorically readable from any cell — this is the mechanical guarantee
  behind "정전은 여전히 클라이맥스".
- **D7. Ambient stays where it is.** `HEMI_LIT 0.12 / MOON_LIT 0.06 /
  SKY_NIGHT_HEX 0x03060c` unchanged: measured, ambient is 3.6% of frame
  luminance. Two prior rounds turned this knob and neither fixed the complaint —
  the lamps were always the cause. `HEMI_DARK/MOON_DARK` also unchanged (fully
  zeroing them moves the blackout frame by 2.4 of 255 — there is no headroom).
- **D8. Chickens lose their emissive.** `mat(0xfdfbf4, 0x2c2c28)` → `mat(0xfdfbf4)`
  for body/tail/head, and comb/beak/legs likewise. Baked emissive rendered them at
  luminance 44 *at zero light*, so the darker the room the higher their contrast —
  the mechanical cause of instruction 4. Albedo stays white: the leghorn is the
  game's identity and still reads at 2.5:1 inside a pool. **Set contract: the
  eyes, sight ring, `!`, `?` and the detection gauge (all MeshBasic) are NOT
  touched.** The body answers "where is it"; the markers answer "has it noticed
  me". Instruction 4 asks only for the former, and removing the latter would
  resurrect the unfair-ambush class that v0.9's gauge exists to prevent.
- **D9. Geese withdrawn via `GOOSE_N=0` and an empty `GOOSE_HOME`,** not by
  deleting the FSM. Every consumer (`updGeese`, snapshot `gs`, `applySnap`,
  `resetWorld`, self-checks) iterates the array and becomes a no-op, so the
  removal touches two lines instead of forty and the protocol keeps its shape
  (append-only never breaks). The chokepoint predicate stays live and now
  guards chickens only — **the next yard threat must pass it before it can ship.**
- **D10. Night clock rescaled with the map.** Deepest-tray round trip 110.7s →
  56.3s and full 18-item clearance 664s → 338s, so a 480s night would make the
  farm 100% lootable and delete the "you can't take it all" choice.
  `NIGHT_LEN 480→245, DARK_BASE 360→185, DARK_ACC 8→4, DARK_MIN 240→125`, and
  check 15's `-60` grace → `-30`. Side effect the developer may like: the
  blackout now arrives around 3 minutes, so a friend session actually reaches it.
- **D11. Literals that encoded the old scale become derived.** Trough clearance
  `230` → `2*(cart.r+2)+8`; kitchen walkway `160` → `AH-KITCH_D-4 < 2*(PLR_R+2)`;
  zone gap `620` → `max(PACK_R,CHK_LEASH,RING_MAX_D)+50`. These three were
  time-bombs: each was a correct number for a geometry that no longer exists.
- **D12. Kitchen box off-centre — a latent bug fixed in passing.** `KITCH_D 90→30`,
  `KITCHEN_R 70→28`, and `KITCHEN_POS.x` shifted by `(OPEN_W+CW-PLUG_W)/4`.
  Measured on 1000 seeds: with the box centred, 71.2% put the chicken's z-entry
  `gapPoint` *inside* the box, where `collideCircle` cannot push out — chickens
  silently failed to reach their target. Off-centre: 0%.

## Out-of-scope
- New animals (the card was spent on the goose and has now been withdrawn).
- Chicken FSM behaviour, speeds, body sizes, 즉사 금지, cooking rules, procgen
  structure, minimap contract, multiplayer authority model.

## Acceptance Criteria
- [x] `node --check` passes; validate() green on the new geometry.
- [x] Corridor `AH=85`, free width 55 = 2.12 player diameters; cart (52) still
      fits; door = corridor width exactly.
- [x] Barn 1800×960 (18% of old area), world 4290×1800, zone gap 350, stair
      bridge 90 (cart passes).
- [x] MC 3000 seeds: fallback 0, mean attempts 1.234, max retry 4/16, 0 check
      failures; determinism holds; baked fallback passes.
- [x] Geese: `GOOSE_N=0`, `geese.length=0`, `GOOSE_HOME=[]`; no console errors.
- [x] Chicken emissive reads `0x000000`; lamps 10 × distance 300 × decay 2;
      27% of cells beyond any lamp.
- [x] Movement/collision intact: 132u/s walking in open directions, blocked at
      walls at the correct distances; all 10 chickens move and none end up
      outside a zone (no wall-stuck).
- [x] Cooking still cooks at 12.1s; minimap still draws (22k px).
- [ ] **Developer eyeball: is this the right darkness and the right tightness**,
      and is "chicken invisible outside the pools, markers still shown when it
      notices you" the intended balance for instruction 4.

## Related Files / Modules
| File | Role |
|------|------|
| D:\Work\vibe\CCL8\chicken-heist.html | The whole game |
| D:\Work\vibe\CCL8\docs\goal\chicken-heist-procgen-kitchen.md | v0.15 spec + the chokepoint predicate this round inherits |
| D:\Work\vibe\CCL8\CLAUDE.md | Scope ledger |

## Open Questions
- Night 245s vs the alternatives (raise `PER_TRAY` to 5, or keep 480 and rescale
  `GRADE`). Shipping the shortened night; the other two are one-line swaps.
- The yard is now threat-free. Options if that reads as empty: raise `DARK_ACC`,
  push `CHK_LEASH` so chickens spill out of the door, or accept it as the
  breathing space between runs.
- Whether `?bright=1` / `?baked=1` should now also restore the old *scale* for
  A/B, or whether v0.15 is simply gone.
