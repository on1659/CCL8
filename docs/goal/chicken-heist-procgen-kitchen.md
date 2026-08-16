# goal: chicken-heist-procgen-kitchen

## One-line Goal
v0.15 bundles four developer-ordered changes in one round: a field kitchen with
heat-state cooking (raw → cooked → burnt), a procedurally generated barn
interior from a synced seed, a default-on minimap, and a much darker bright
phase — plus the codified threat-placement principles that make random layouts
provably fair.

## Background / Motivation
Developer session 2026-08-15 ("우리게임 차별점", probed via autogoal). Decisions
made explicitly by the developer, each recorded with its cost:

- **Cooking ban lifted.** CLAUDE.md shelved 요리·열 상태변화; the developer chose
  to spend the round's new-system budget on it. This is a *return* to the design
  doc — core decision 4 always earmarked the single new system as heat-state
  change. Divergence from the doc, accepted knowingly: the kitchen is a **field
  station on the map at a random position**, not the truck (developer:
  "맵도 랜덤이니까 주방 위치도 랜덤으로해줘") — this moves cooking from
  downtime (core decision 6) into expedition risk. That tension is the point:
  the wait near chickens is the price of the premium.
- **One-new-system principle: bundle exception declared** (v0.6 precedent).
  Restore the principle from v0.16.
- **"어둡게" v0.6 rejection overridden** by developer ("원안대로 확 어둡게"),
  knowing the recorded rejection reason (blackout contrast collapse). Mitigation:
  darken ambient only, never lamps (see D-DARK).
- **2-day settlement deferred** to a later round (thin without a quota; v0.13
  D2 deliberately abolished quotas).
- A live v0.13 migration bug rides along: clients compute blackout warnings from
  legacy `DARK_TIMER` (fix in D-NET6).

Spec was settled by a 4-lens panel (procgen / cooking / protocol / legibility)
plus cross-examination; 7 inter-lens conflicts were resolved and are recorded
below as single decisions. Do not resurrect the losing variants.

## In-scope
- Seeded procgen of barn interiors (1F + B1 maze bits, east hole aisle, tray
  cells, chicken homes/guards/patrols) + random kitchen cell — D-GEN1..7.
- Brooder-lamp kitchen station + host-only cooking judgment + value bonus —
  D-KIT1..6.
- Snapshot/handshake extensions, PROTO_V 'v0.15', seed transport + gates,
  clientTick DARK_TIMER fix — D-NET1..6.
- Darker bright phase constants + flicker formula fix + ?bright=1 dev flag —
  D-DARK1..2.
- Sight-ring eligibility extension (render-only fairness fix) — D-DARK3.
- Minimap (DOM canvas, Tab toggle, default ON) — D-MAP1.
- GRADE rescale + bestKey PROTO_V namespace; settlement tally rows for cooked/
  burnt — D-KIT5.
- Win/fail overlay: '새 농장' (solo) + 'R — 같은 맵 처음부터 · 새 맵 = 새 방' copy.
- Version bump v0.14 → v0.15 in all three display spots + header log; CLAUDE.md
  scope-ledger updates (cooking lift, bundle exception, darkness override,
  minimap 임시).

## Out-of-scope
- 2-day settlement / any quota or target amount (v0.13 D2 stands).
- New animals; any chicken/goose FSM or LOGIC constant change.
- buildMap(seed) callable-rebuild refactor (in-room map reroll). R = same map;
  new map = reload/new room. Revisit with the settlement round.
- Yard or B1 kitchen; cooking in cart; kitchen slot caps; anti-camp counters.
- Grid dimension randomization (A_N/C_N/SPINE etc. stay literal).
- Fog-of-war minimap; threat/loot blips on the minimap (contractual — see
  D-MAP1).
- Shops, currency symbols, the word "점수" in UI (score-run D7 hard lines).

## Design Decisions (panel-settled — do not relitigate during implementation)

### Generation
- **D-GEN1. Interior-only reroll; yard is sacred.** Randomized per seed:
  `MAZE_H/MAZE_V`, `B1_MAZE_H/B1_MAZE_V`, `EAST_HOLE_AISLE` (drawn from
  non-spine aisles), `TRAY_DEF`, `CHK_DEF`, `KITCHEN_CELL`. Fixed forever:
  grid dims (A_N=8, C_N=6, SPINE=4, B1_A_N=6, B1_C_N=4, B1_SPINE=2), BARN/B1/
  STAIR rects, TROUGHS, barn door position, the entire yard (truck, pad, SPAWN,
  lever, hay, crate, glove, GOOSE_HOME), lamp count 9, fog/sky distances,
  title/intro camera paths. Yard self-checks (13, 18–22, glove) stay static.
  (Rejected: randomizing grid dims — everything from TRUCK_Z to zoneOfArea
  derives from them; worst cost/benefit.)
- **D-GEN2. Maze = spine-precarved randomized Kruskal + density braid.**
  Pure `genMaze(rng, an, cn, spine, targetOpen)` → {MH, MV} in the exact
  literal shapes. Spine row fully open first (union-find pre-joined), spanning
  tree via rng-shuffled Kruskal (reachability by construction), then braid
  remaining edges in the same shuffle order to TARGET_OPEN_1F=57 /
  TARGET_OPEN_B1=28 (measured from the shipped 873/13 literals, keeping v0.14
  corridor density). Consumers (FLOORS[], cageBoxes/plugBoxes emission, fNbrs,
  CELLS, NEXT BFS) unmodified. (Rejected: DFS backtracker — braiding erases the
  texture difference; random-bits-plus-repair — termination proof costs more.)
- **D-GEN3. PRNG = mulberry32, sealed after build.** Instance lives inside the
  generation scope and is unreachable from gameplay code; all discrete picks use
  integer arithmetic on rng output (no transcendentals). The 27 existing
  Math.random sites stay Math.random. Determinism self-check: validate() runs
  the generator twice and JSON-compares pre-BFS outputs (maze bits, TRAY_DEF,
  CHK_DEF, KITCHEN_CELL) — inequality = loud load-time failure.
- **D-GEN4. Tray constraints.** Counts frozen (1F 2 / B1 4, PER_TRAY=3, supply
  18). tray0={f:0, a=SPINE-adjacent cell on the spine aisle, c∈1..3} (tutorial
  contract, check 2b); tray1={f:0, a≠SPINE, BFS(doorCell) 2..4}; B1 four
  distinct cells, a≠B1_SPINE, BFS(b1Entry) all ≥2, max ≥4 (relax to ≥3 only if
  the Monte Carlo sweep shows meaningful failure). `TRAY_CELLS` becomes a
  derived expression; **LAMP_POS[5] (불웅덩이) follows the generated tray0
  cell** — asserted in layoutChecks.
- **D-GEN5. Chicken constraints = threat principles as predicates.** Split 4/6
  frozen; exactly one guard per tray t≥1, same floor, home within BFS≤1 of its
  tray; chicken0 inert ({guard:-1, loop:null, home ∈ nbrs(tray0)}); patrol loop
  = home + 1–2 non-spine cells within BFS≤2. No patrol/guard cell on any spine
  aisle — this IS threat principle ① (no camping the extraction route) in
  interior form; principle ② (learnable bypass) is the guard's finite time
  window (loop motion + GUARD_HOLD), principle ③ (telegraph, no instant death)
  needs no placement constraint since FSM constants are frozen.
- **D-GEN6. One retry chain, one predicate source, one fallback.**
  `genLayout(seed)`: attempts i=0..15 with sub-seed
  `(seed + Math.imul(i, 0x9E3779B9)) >>> 0`; each attempt runs genMaze ×2 +
  placement, accepted iff `layoutChecks(L)` passes. layoutChecks is the single
  predicate source (union of content-dependent checks 1,2,2b,3,4,5,6,7,8,11,12,
  17-adjacent + kitchen predicates + LAMP_POS[5]/tray0 alignment +
  TRAY_DEF.length===6 ∧ CHK_DEF.length===10) shared verbatim by the generation
  loop and load-time validate(). Exhaustion → BAKED fallback (the current
  873/13 literals + current TRAY_DEF/CHK_DEF + fixed kitchen cell) +
  console.error. Draw order contract: maze → trays → chickens → kitchen (least
  constrained, drawn last from surviving free cells). [검증] console line logs
  seed + attempt count. Ship gate: Node Monte Carlo over seeds 0..10000 to
  measure retry/fallback rates. (Rejected: per-lens variants — seed+1 stride /
  cap 8 / cap 20 — unified to golden-ratio stride, cap 16.)
- **D-GEN7. Seed bootstrap (verbatim).** Module-scope `MAP_SEED` above the
  generation block: parse `?seed=` (uint32 decimal, 0 → 873 sentinel), else
  `(Math.random()*0x100000000)>>>0` (the one legitimate Math.random — it
  produces the seed itself). If no `?room` present,
  `history.replaceState(null,'','?seed='+MAP_SEED)` so refresh/share reproduces
  the solo map. Dev flag `?baked=1` forces the BAKED literals (same status as
  ?dark=0 — developer-local A/B, never in friend links). Seed appears in the
  [검증] console line only — no HUD/title display.

### Kitchen & cooking
- **D-KIT1. Station = brooder heat lamp (병아리 보온등) over a straw box.**
  The only heat source that reads without text in an animal-owned farm — the
  animals' own infrastructure; frying loot under the chicks' warming lamp is the
  intended shameless-burglar comedy, and "electric farm grid" gives the
  blackout interaction a free cause. ~90×90u straw box (segs kind:'brooder',
  SEG_H.brooder=40, JUMP_SKIP — jumpable, non-blocking for sight/waves/camera),
  feed-pan cooking surface, hanging cone lamp: emissive bulb mesh +
  `PointLight(0xff9a40, 0.9, 500)` registered in the applyDark toggle set and
  the flicker warn dips (lit through the darker bright phase as a warm landmark;
  dead during blackout). Station segs push before the SEGS0/1 bucket split.
  (Rejected: feed stove — implies a human cook, reopens the why-question;
  incubator — a device that protects eggs must not burn them.)
- **D-KIT2. Placement: 1F barn interior only.** `KITCHEN_CELL = {f:0, a≠SPINE,
  BFS(doorCell) 1..3, ∉ tray cells ∪ chicken homes ∪ patrol-loop cells}`;
  KITCHEN_POS derived NEST_POS-style against a cage face; clearance predicate
  AH−KITCH_D≥160 in layoutChecks. Cross-exam blocker resolution: yard placement
  died (zone 0 has no robber species → risk-free premium, breaks the goose
  quiet-lane statics and the goose zone-isolation precedent); B1 died (doubles
  the stair tax, cart-to-B1 unverified). Wandering-chicken overlap is allowed
  (comedy); guard-loop overlap is banned (waiting must be possible).
- **D-KIT3. Cooking = zone effect on resting items. Zero new verbs, zero new
  EGG_STATES.** `KITCHEN_R=70, COOK_T=12, BURN_T=24` (tunables). Host-only
  `updKitchen(dt)` between updEggs and updChickens (below the client bail-out):
  each egg with state==='rest' within KITCHEN_R, while the lamp is powered
  (not blackout, not post-dawn), accrues `e.cookT += dt`; heat flips raw→cooked
  at COOK_T (local ding + glint; LOGIC 0) and cooked→burnt at COOK_T+BURN_T.
  cookT persists across pickup/robbery and freezes while not resting in radius
  (cook-scumming yields nothing). Cart slots do not cook. No slot cap. Blackout
  pauses (never resets) cooking; placing during blackout is allowed; prompt:
  '정전 — 보온등이 꺼졌다'. Burn telegraph (threat principle ③ applied to
  cooking): render-only smoke column starts at cookT ≥ COOK_T+BURN_T−6,
  readable at 600u. On the cooked→burnt edge exactly one
  `decoyPulse(KITCHEN_POS.x, KITCHEN_POS.z, null)` — **the second and last
  decoyPulse coupling** (goose honk precedent; continuous sizzle broadcast
  stays banned). (Rejected: 'stove' EGG_STATE — parallel-path class D5 killed,
  and it silently made cooking items robbery-immune; dedicated cook verb;
  KITCHEN_SLOTS cap.)
- **D-KIT4. Heat is a field, not a kind.** `e.heat` (0 raw / 1 cooked / 2
  burnt) + `e.cookT`; LOOT_KINDS/LOOT_VAL stay 3 entries (check 17 untouched).
  Kind rules carry over automatically: meat never breaks / never pockets at any
  heat; cooked egg/bigEgg stay pocketable and **stay breakable** (return-leg
  tension priced in); burnt is unbreakable (char doesn't splat) and robbable
  (chicken stealing your charcoal is free comedy). Robbed items keep heat/cookT.
  (Rejected: appending cooked/burnt kinds — silently inverts every
  kind==='meat' gate, 3×3 string explosion; the losing legibility-lens visual
  spec is ported into D-KIT6 instead.)
- **D-KIT5. One value table, additive, one blackout multiplier.**
  `COOK_BONUS={egg:1, bigEgg:1, meat:2}`, `BURNT_VAL=1` (deliverable).
  deliverEgg: `base = e.heat===2 ? BURNT_VAL : LOOT_VAL[kind] +
  (e.heat===1 ? COOK_BONUS[kind] : 0)`; `val = base * (blackout ? 2 : 1)`.
  Table raw/cooked/burnt: egg 1/2/1, bigEgg 3/4/1, meat 2/4/1; worst stack 8.
  KO-farming stays sub-optimal (cooked meat line 40 < raw egg line 42 < cooked
  egg line 60); map ceiling 62 → 100, therefore **GRADE [1,10,25] → [1,14,35]**
  (developer-feel tunable) and `bestKey()` gains a PROTO_V namespace in the
  same commit. Settlement tally rows: 계란 프라이 / 큰 알 구이 / 통닭 / 숯덩이.
  Self-check: keys(COOK_BONUS).length===LOOT_KINDS.length,
  BURNT_VAL ≤ min(LOOT_VAL), COOK_T>0, BURN_T>0. (Rejected: ×2 cook multiplier
  — ×4 blackout stack makes cooking mandatory; per-kind literals 3/5 — reopens
  KO-farming at 100/line.)
- **D-KIT6. Heat visuals: single owner + 2-of-3 rule.** Refactor to one
  `applyEggVisual(e)` composing kind (scale/base color) → heat (tint/emissive)
  → blackout (emissive floor via max()); `eggGlow(on)` becomes a shell that
  re-runs it per egg (today's uniform emissive write would clobber heat reads
  on every blackout toggle). Every heat state differs in ≥2 of {silhouette,
  emissive, particle}: cooked = warm tint + emissive glow (per kind); burnt =
  matte-black squash + rising smoke wisps. Station broadcasts timing in-world
  only (ember pulse / sizzle / one ding / pre-burn smoke column) — **no HUD or
  world-space progress bar** ("그냥 타이머인데" 반려 rule). Client visuals
  derive from snapshot state only (eg[7]/eg[8]) in a shared cosmetic path; the
  only event-ish thing is the local ding for the player standing there.

### Net & protocol
- **D-NET1. Wire freeze set (exactly this, nothing else).** eg tuple appends
  [7]=heat, [8]=q1(cookT); bk appends [4..7]=cookedEgg, cookedBig, cookedMeat,
  burnt (indices 0–3 frozen); EGG_STATES unchanged (7 entries — 'stove'
  rejected); st unchanged (st[4] stays vestigial, never repurposed); no new act
  verbs (placing on the stove is the existing contextual E / 'pick' act);
  PROTO_V='v0.15'. bank widens to 8 keys; bankItem(kind,dark) →
  bankItem(e,dark) (sole call site deliverEgg); resetWorld zeroes new counters
  and heat/cookT (client parallel path via snapshot).
- **D-NET2. Seed transport & link.** Invite link (mpShowRoom) appends
  `&seed=`+MAP_SEED (decimal uint32, ~100 chars total). Client parses ?seed
  before module-scope map build (only pre-build URL param; ?dark/?ws/?room all
  parse later — order verified).
- **D-NET3. Layered join gate: hi={v, seed, hash}.** Host checks in order:
  v mismatch → bad:'ver' ("새로고침" — push=deploy makes refresh the upgrade);
  seed mismatch → bad:'seed' + host's seed; client self-heals with ONE
  location.replace carrying the host seed under a sessionStorage
  ('ch_seedfix') one-shot guard — second consecutive mismatch shows
  '맵이 어긋난다 — 호스트에게 새 링크를 받아라' and closes; **seed equal but
  layoutHash mismatch → never reload** (deterministic divergence — a reload
  rebuilds the same wrong map): message '빌드가 다르다 — 둘 다 새로고침하라',
  close. layoutHash = FNV-1a 32 over (maze bits ×2 floors, EAST_HOLE_AISLE,
  TRAY_DEF, CHK_DEF, KITCHEN_CELL). hello echoes seed as belt-and-braces.
  All checks fire before p.active=true.
- **D-NET4. Cooking sync is delta-derived (D22).** Heat transitions judged only
  in updKitchen (grep discipline: no COOK_T/BURN_T comparison that flips heat
  may exist outside it). Clients render sizzle/tint from eg[7]/eg[8]; cosmetic
  cookT lerp is allowed, judgment is not. Station itself has zero protocol
  presence (position is seed-derived; always-on heat → no state bit).
- **D-NET5. R-restart semantics.** Map is per-page-load. R = resetWorld = same
  map (heat/cookT zeroed). '새 농장' button on win/fail overlays (solo display
  only) reloads with seed+1; multiplayer new map = host opens a new room
  (relay stays lifecycle-free). Overlay copy: 'R — 같은 맵 처음부터 · 새 맵 =
  새 방'.
- **D-NET6. DARK_TIMER bug fix + removal.** clientTick's
  `const left = DARK_TIMER - stats.t` → `darkAt() - stats.t` (derivable
  client-side: darkAt reads constants + stats.delivered = st[2]). DELETE
  `DARK_TIMER`; retarget self-check 14 to NIGHT_LEN > DARK_BASE; fix the two
  stale comments. Recurrence becomes grep-impossible.

### Darkness & minimap
- **D-DARK1. Darken ambient, never lamps.** Exactly four sites: HEMI_LIT
  0.58→0.20; MOON_LIT 0.22→0.12; scene.background/fog color + C_SKY_NIGHT
  0x0c1424→0x060a14 (fog DISTANCES unchanged — pulling fog in would hide the
  truck from the barn door); flicker formula `0.06+j*0.35` →
  `HEMI_DARK + j*(HEMI_LIT-HEMI_DARK)` (**must land in the same commit** — the
  old formula's 0.41 peak would flash BRIGHTER than the new 0.20 base,
  inverting the blackout warning). Lamps (i-values, count 9), padLight,
  headlights, bulbMat, dawn addend +0.5 all untouched — lamp-cut is the
  blackout's signature; on a 0.20 base the pools carry ~80% of perceived light,
  so the blackout cut gets MORE dramatic (this is the answer to the v0.6
  rejection). Dawn now ramps 0.20→0.70 — sunrise pops harder for free.
  Dev flag `?bright=1` restores 0.58/0.22 for monitor A/B; **developer eyeball
  pass on real monitor is the ship gate for the exact values** (absolute
  darkness does not transfer across displays; knob order if friends report mud:
  MOON_LIT first, HEMI_LIT in 0.03 steps, lamps never).
- **D-DARK2. Blackout distinctness, stated honestly.** In unlamped corners the
  ambient contrast ratio drops 8.0× → 3.2× — that fraction of the v0.6
  rejection comes true and is accepted. Event identity now rides on categorical
  signals that all survive: lamp cut (full→0), flicker, clunkS, bigmsg,
  eggGlow flip, doorSpill, bulbMat flip, HUD badge, wave rendering. Acceptance
  clip: the 정전 moment recorded from an unlamped B1 corner must be nameable
  as "blackout" within 1s. If it fails: lengthen FLICKER_T, never raise
  HEMI_DARK.
- **D-DARK3. Ring eligibility extension (render-only fairness fix).** The one
  new mis-affordance of a dark bright-phase is "it looks dark so I must be
  hidden" while SIGHT_IN=240 is frozen. Fix at the render gate only:
  `carriesEgg(P())` → `carriesEgg(P()) || c.det[me] > 0.15` — a non-carrier
  being charged by a gauge now sees the radius doing it. RING_MAX_D, LOS gate,
  벽 뒤 링 없음 (갑툭튀 보존) all unchanged. Precedent: v0.9 legibility renders.
- **D-MAP1. Minimap = navigation, never the game.** DOM `<canvas id="map">`
  top-right (only free corner), 240×170, rgba(6,10,20,.72) bg, amber 1px
  border. Static layer: current floor's walls prerendered once per map build
  into two offscreen canvases (1F+yard / B1) **from generated data structures
  only** (walls/cageBoxes/plugBoxes/TROUGHS/STAIR/NEST_POS/KITCHEN_POS — no
  coordinate literals; hand-drawn maps die on the first non-fallback seed).
  Dynamic layer at 10Hz: self view-arrow, mate tint dots, cart, truck/pad,
  barn-door notch, stair markers, kitchen flame icon. **Contract — never drawn
  in any version: chickens, geese, eggs, waves, goose posts, delivery values**
  (world-shows-mechanic rule; the map must not become the threat channel).
  Floor follows the viewer's zone/groundY. Toggle Tab (preventDefault),
  persisted as localStorage 'ch_map', default ON for everyone (developer's
  test-phase call — revisit default after friend feedback; watch for
  map-staring during tests). Reset/rebuild hooks: map build time + resetWorld +
  client reset path.

## Acceptance Criteria
- [x] `node --check` passes on the extracted script; validate() reports all
      checks green, logs `시드 N · 재시도 M회`, and the double-run determinism
      check passes. (Verified in-browser: seed 873 and a random seed both green.)
- [x] Same ?seed= URL → identical layout across loads — verified stronger:
      Node and Chrome produce identical output for seed 873 (cross-engine
      determinism); host and client tabs agreed on layoutHash 54230d62.
      Different seeds → different interiors; ?baked=1 reproduces the v0.14
      literals (kitchen at the fixed cell [3,0]).
- [x] Node Monte Carlo sweep, seeds 0..9999: **0 fallbacks**, 486 total
      retries (~5% of seeds retry at least once), max retry 4 of 16, 1.9s.
- [x] Cook at 12s / burn at 36s (measured 12.1/36.0 via stepped updKitchen);
      pickup freezes cookT, replacing resumes — never resets; burnt edge runs
      once (heat 2 is terminal).
- [x] Values: cooked bigEgg 4; burnt 1; blackout cooked meat 8 (= 4×2);
      bank counters {cBig:1, cMeat:1, burnt:1, dark:1} after the test
      deliveries; GRADE=[1,14,35]; bestKey = ccl8.best.v0.15.N.
- [x] Meat/burnt never break (burnt verified live; meat gate untouched);
      cooked keeps kind rules (pocket/break gates check kind & heat===2 only);
      blackout freezes cookT and resumes after; cart state never cooks
      (updKitchen filters state==='rest').
- [x] Darkness constants live (HEMI 0.20 / MOON 0.12 / sky 0x060a14; ?bright=1
      restores 0.58/0.22/0x0c1424); flicker formula now derives from the
      constants so its peak equals the lit base.
- [ ] **Developer eyeball gate (open on purpose):** does 0.20/0.12 read as
      "확 어둡게" without mud on the real monitor, and does the blackout still
      read as an event from an unlamped B1 corner within 1s. `?bright=1` is
      the A/B lever. Screenshots were impossible in this session (preview pane
      not displayed), and this judgment is reserved to the developer anyway.
- [x] Ring eligibility extension in place; render() executes the det>0.15 path
      without error; LOS/RING_MAX_D gates untouched. (Visual feel — developer.)
- [x] Minimap renders (12k+ non-empty pixels on the generated map), shows only
      geometry + truck/door/stair/kitchen anchors + players/cart, follows
      floors via zone/groundY, Tab toggles with preventDefault and persists
      (ch_map). Contract kept: no chicken/goose/egg/wave marks anywhere.
- [x] Multiplayer (live, local relay ws://localhost:3000, 3 peers): invite
      link carried &seed=873; two clients passed the v/seed/hash gates; a
      seed=999 client was rejected with bad:'seed' and self-healed with exactly
      one auto-reload to seed=873 (ch_seedfix set → cleared on hello); host
      cooked an egg and the client mirrored heat/cookT via eg[7]/[8] including
      the cooked visual (emissive 0x552e0a, squash 0.9). Same-seed/wrong-hash
      no-reload path is code-verified (cannot be produced with one build).
- [x] R keeps the same map (resetWorld never regenerates); N (solo, win/fail)
      reloads with seed+1; overlays show the same-map/new-map copy.
- [x] Version v0.15 in all three display spots + header 회계 log; CLAUDE.md
      ledger updated (cooking lift + field-kitchen tension, v0.15 bundle
      exception + v0.16 restore, darkness override, procgen/seed/minimap
      contracts, decoyPulse coupling #2).

## v0.15.3 — Chokepoint clearance becomes a predicate (post-ship repair)

Three consecutive developer reports ("시작하자마자 / 입구에 몬스터가 아직") were each patched
individually. A 4-lens audit + cross-exam found the common cause: **there was no general rule**,
only ad-hoc checks covering 5 of 11 yard chokepoints, and every check measured to a landmark's
*centre* rather than to where a player can actually stand.

- **D-CHOKE1. One predicate, one table.** `CHOKE_M=80` (promoted from the literal v0.15.2 check 23
  already used — no invented number; it reproduces all three developer verdicts: spawn 153 ✗ /
  spawn 258 ✓ / door 132 ✗). Threshold = threat's no-notice radius + CHOKE_M. `yardChokes()` lists
  all 11 chokepoints as data (pad, door corridor, quiet lane, glove, lever, cart home, 4 spawn
  seats); validate() runs threats × chokepoints as one double loop. Chickens ride the same loop
  with `SIGHT_IN` as their radius, so the rule is species-agnostic. Adding a chokepoint is one line.
- **D-CHOKE2. Measure to the standable region, not the centre.** Disc/box/segment closed forms;
  openings inset by `CHOKE_IN=PLR_R+2` (what `collideCircle` enforces). The 2u knife-edge that
  passed review was an artifact of measuring to a door-jamb corner no player can ever occupy.
- **D-CHOKE3. Upper bound keeps the threat real.** `mustRoute()` samples the pad→door lane and the
  full door opening; if any sample is ≥ `GOOSE_HEAR_R` from every goose, that is a violation too.
  Clearing chokepoints must not create a free sprint corridor — that would quietly undo v0.14.
- **D-CHOKE4. `GOOSE_HOME = [{800, TRUCK_Z-360}, {660, TRUCK_Z+280}]`.** Min clearance +50u,
  hearing margin 54u, survives ±30u perturbation of both posts. Behaviour constants untouched.
  **New placement principle: the two posts must differ in x** — equal x makes the two hearing
  circles cover the same lane span, leaving a guaranteed free-sprint gap to the west (measured 159u
  for symmetric (800,±360)). (Rejected: moving only goose1 — leaves glove at 134u; moving GLOVE_POS
  instead — two moving parts and the glove is pinned to the crate.)
- **D-CHOKE5. Interior gates: residency was never the bug, transit was.** `gateChecks(L)` folds into
  `layoutChecks` (single source) and forbids a chicken home/patrol from sitting on **or lying on any
  shortest path through** the three gate cells (front door, 1F stair, B1 stair). Measured on 2000
  seeds: residency violations 0.00%, transit violations **15.65%** (door 3.90 / 1F stair 3.35 /
  B1 stair 8.80). Uses `onAnyShortest` (sum-of-two-BFS-fields) rather than replaying `nextCell`,
  so the predicate is a superset of the runtime path and cannot drift from it.
- **Cost**: mean attempts 1.05 → 1.25, max retry 5/16, **fallbacks 0 over 10000 seeds**;
  determinism and the baked fallback both still pass.

Verified live by rollback: reverting to v0.15.2 coords makes the check fire 3 violations
(glove 134, door corridor 132, quiet lane 180); v0.14 coords fire 8 (glove 59 — i.e. picking up the
glove always woke the goose, shipped and unnoticed since v0.14); pushing the geese far away fires 68
hearing-blind-spot violations. The check is not vacuous in either direction.

Open (developer's call): mid-lane sprint interception is now geometrically impossible (a goose 230u
off the lane cannot catch a loaded runner) — 4-lap sim says contact actually *rose* 11→14 because
both geese now wake and converge on the stopping points (pad, door). Whether "hit in mid-yard" →
"caught when you stop" is the intended trade is a feel judgment.

## Implementation Notes (filled in during the build)
- Bright-phase theft nuance, confirmed against source: the abandoned-item
  robbery loop is blackout-gated, so an unattended cooking item is not stolen
  in the lit phase. The wait's price there is detection/catch robbery (and the
  burnt-edge decoyPulse summoning peckers), which is what the panel's risk
  story actually needs — recorded so nobody "fixes" it into a new theft path.
- The kitchen collision box is seg kind 'brooder' (SEG_H 40, JUMP_SKIP) —
  items cook on the straw ring around the box (KITCHEN_R 70 > box half 45),
  since circle-seg collision would push items off the box top.
- Cook cosmetics run in `updCookFx` called from frame() outside the client
  bail, deriving everything from e.heat/e.cookT — one code path for host and
  client (D-NET4 kept by construction). The kitchen light lives outside
  lampLights so warn-dip flicker never fights the cooking flare.
- QA used a scratchpad static server (.claude/launch.json entry "web",
  machine-local, intentionally not committed) because server.js is relay-only.
- v0.14-client rejection could not be live-tested (only one build exists);
  the strict PROTO_V equality gate is unchanged mechanism from v0.12.

## Related Files / Modules
| File | Role |
|------|------|
| D:\Work\vibe\CCL8\chicken-heist.html | The whole game (single file, 4160 lines) |
| D:\Work\vibe\CCL8\docs\goal\chicken-heist-procgen-kitchen.md | This spec |
| D:\Work\vibe\CCL8\CLAUDE.md | Scope ledger — record the four decisions |
| D:\Work\vibe\CCL8\server.js | Relay — MUST remain untouched |

## Must-Preserve
- 즉사 금지 — burn loses the bonus (and principal down to 1), never the item,
  never the player; smoke is the comedy.
- 밝은 구간 LOGIC 불변 — SIGHT_*/DET_*/LANTERN_DIST/RING_MAX_D and all chicken/
  goose FSM constants untouched; every darkness/fairness change is render-only.
- Multiplayer no-regret lines: targetOf accessor / zoneOf·groundY pure (procgen
  finalizes rects before first call, keeps them pure) / no singular player
  globals / all sim through update(dt) / deterministic encounters (extended:
  deterministic generation).
- D15 host authority (updKitchen below the client bail-out); D22 delta-derived
  ceremony; PHASES frozen; snapshot append-only; server.js relay-only.
- Chickens are the only thieves; the goose's yard isolation is untouched; the
  kitchen adds no new animal coupling beyond the one burnt-edge decoyPulse.
- Yard geometry and all yard self-checks byte-identical.
- Decoy throwing, cart, glove, stamina, departure lever behavior unchanged.

## Fairness Constraints
- Same seed ⇒ same map for every peer; layout is a pure function of MAP_SEED
  (retry chain + fallback included). Host never adopts a client seed.
- Generation randomness (sealed mulberry32) and gameplay randomness
  (host-only Math.random) are separate streams by construction.
- Threat placement is provably fair per seed: no guard/patrol on spine, guard
  within BFS≤1 of its tray, kitchen never inside a guard loop, quiet-lane and
  pad-camping checks static in the fixed yard.
- Ring extension shows information the chicken already acts on (det gauge);
  it reveals nothing through walls.
- ?dark=0 / ?bright=1 / ?baked=1 are developer-local isolation flags — never in
  friend links; scores from flagged runs are not comparable.

## Existing Integration Contract
- stats.delivered stays monotonic item count (darkAt depends on it); stats.t
  meaning unchanged; st indices 0–7 frozen.
- eggs[] pool stays 28 (6×3 + 10 meat reserve) — LOOT_N derivation untouched.
- deliverEgg remains the single value sink; onDelivered/darkAt acceleration
  unchanged.
- decoyPulse semantics unchanged (radius, peck reaction); it gains one caller.
- applyDark(on) remains the single blackout toggle; the brooder light joins its
  set via the lamp userData.lit pattern.
- Intent queue (pushAct) verbs unchanged.

## Execution Notes
- Recommended model: Claude Fable 5 for generation/validation plumbing, the
  applyEggVisual refactor, protocol gates, and updKitchen host-authority seams
  (judgment-heavy, regression-prone). Sonnet acceptable for mesh building,
  minimap drawing, copy, version plumbing.
- This document cannot enforce the model — the executing session's /model
  setting decides. If the session model is below the recommendation, surface it
  to the user and confirm before proceeding.
- Implementation order (each step: extract `<script>` → `node --check`):
  1. Seed bootstrap + mulberry32 + genMaze + genLayout + layoutChecks + BAKED
     fallback; literals replaced; TRAY_CELLS derived; LAMP_POS[5] follows
     tray0; double-run check; validate() rewire; ?baked=1.
  2. Brooder station world objects (segs kind:'brooder', meshes, light in
     applyDark set).
  3. Cooking: heat/cookT fields, updKitchen, deliverEgg, breakEgg burnt gate,
     applyEggVisual refactor, smoke/sizzle, prompts, bank/paintRack/tallyHTML,
     GRADE + bestKey.
  4. Net: PROTO_V, hi/hello gates + self-heal, invite link, eg[7]/[8],
     bk[4..7], applySnap mirrors, client cook cosmetics, DARK_TIMER fix.
  5. Darkness constants + flicker formula + ?bright=1 (one commit-unit).
  6. Minimap.
  7. Copy/version/CLAUDE.md; Monte Carlo sweep; browser QA per memory notes
     (http://127.0.0.1 server, manual update() stepping).
- Tuning surface (needs play data, not blockers): COOK_T/BURN_T (12/24),
  COOK_BONUS/BURNT_VAL, GRADE [1,14,35], darkness values 0.20/0.12/0x060a14
  (developer monitor pass is the ship gate), smoke pre-warn 6s, minimap default
  after the test phase, B1 tray max-depth ≥4 (relax to ≥3 on Monte Carlo
  evidence).
