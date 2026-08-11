# goal: chicken-heist-building-legible-ai

## One-line Goal

v0.9: turn the map into a two-floor building (denser 1F + new basement B1, connected by a switchback stair on one logic plane), make chicken detection a legible filling-gauge process with carry-only sight rings, put gloves on the player's hands, and commit a 4-player co-op architecture plan (document only).

## Background / Motivation

Developer requests (2026-08-12): ① show chicken sight range ② map should be dense with many direction changes, not wide — and multi-level, "entering a building" with a basement ③ "I can't tell WHEN chickens come for me — make the monster AI understandable" ④ glove should visibly change the hands ⑤ plan (not build) for up-to-4-player co-op.

Probing settled: sight display only while carrying an egg (empty-handed display would be a lie — bare players are never sight-detected); "여러 층" chosen over density-only; multiplayer = plan doc this round, implementation in a later round after developer review.

A 4-perspective panel (floor architecture / level design / AI legibility / simplify+multiplayer) + cross-exam produced 64 verdicts and 12 rulings, and found 6 holes all four missed. Three draft-killers: the draft's "chickens chase across floors via unified graph" is geometrically false (leash 600 < zone gap — any cross-zone chase demotes before arrival); 3 floors is too much for one round (2 floors satisfy the developer's words verbatim); the detection gauge must be lit-phase-only (any charge rate softens the blackout's settled 140/200 instant-sell tension).

## In-scope

- **A. Two-floor building on one logic plane** (the round's ONE new system):
  - Floors are offset zones on the same (x,z) plane; render-only height via `groundY(x,z)`. B1 offset in **+x** (hidden from the yard behind the 1F barn silhouette), base y −260 (`FLOOR_H=260`). Zone gap **700** (justification: with chicken confinement the only wall-ignoring cross-zone channel is alarmFlock's euclidean PACK_R 500 + 200 margin; the 910 lower bound applied only to the now-dead cross-zone chase premise).
  - **1F**: seed-873 topology preserved losslessly (8×6, spine aisle 4, tray depth profile, patrol literals, tray0 tutorial contract) with **COOP_SCALE 12→9, RH 150→120** → aisle ≈255, cell ≈555 — direction-change period drops 740→555 u (the "촘촘" ask is cell pitch, not new topology).
  - **B1**: new offline-generated 6-aisle × 4-column literal; its spine = plug-free aisle aligned with the stair landing; **eggs 1F 2 / B1 4** (NEED 3 forces descending — "deeper is sweeter"), **chickens 1F 4 (2 guards incl. inert tray0 + 2 patrol) / B1 6 (4 guards + 2 patrol)**.
  - **Stair**: one U-switchback corridor, width 180, first bend within 200 of the entrance (geometrically kills cross-zone LOS), ramps interpolate y; the three troughs move to the stair landings (jump's indoor reason lives where everyone must pass; aisle-255 floors can no longer host them — walkway assert kept as "landing walkway ≥230").
  - **Chicken confinement is an official rule**: stair cells are excluded from chicken nav; "reach the stairs and chickens give up" is taught, learnable law (and pre-defines 4-player per-floor targeting). Zone filters: grab-claim and rob-nest-selection are same-zone only; invest/alarm origins in another zone or corridor clamp to the receiver's own stair-entrance cell ("chickens gather at the stairs" — an honest scare, and it kills the frozen-chicken deadlock: cellOf returns −1 in corridors → navTo front-door fallback → stuck invest; also add a 6 s invest-travel timeout valve). navTo's front-door special case gates to 1F only.
  - **Egg physics stays absolute-y**; only ground contact becomes `groundY(x,z)+EGG_R` (relative-frame physics would bend parabolas on ramps). Spawn/throw/scatter sites (8) add groundY. Ramp side walls get per-seg `baseY` so lobbed eggs cannot escape into the void; safety net: an egg resting outside all zones/corridors breaks immediately (checkFail stays sound — no soft-lock). Intended rule recorded: **no inter-floor egg relay** (260 drop → impact > BREAK_SPD 420, always breaks).
  - groundY plumbing via 4 chokepoints (fxPool/wavePool/addSplat/spawnWave add base internally) + entity mesh setters; wave wall-stamps capture origin-zone base; TP roof clamp uses the camera position's zone. Walls bucketed per zone (+corridors); cross-zone lineBlocked short-circuits true (safety pin + perf). Ground plane gets a hole over the B1/ramp footprint; B1 gets a dark ceiling. Per-floor lamps join `lampLights` (blackout kills them) — **stair door-frames are MeshBasic self-lit and excluded from blackout**: "계단 불빛은 정전에도 남는다" so the floor-exit prompt is never a lie. Cart may enter stairs (breadcrumb trail suits dark navigation); cart mesh and ejected eggs take groundY. HUD shows current floor (pure `zoneOf(x,z)` — no stored floor fields). `DARK_TIMER` 240→300 (two-floor volume; tuning constant, revisit after friend runs).
- **B. Detection gauge (legible AI — first intentional lit-phase logic change, developer-authorized 2026-08-12)**:
  - `c.det` 0..1. Charges only when: carriesEgg && within sight radius && LOS && chicken state ∈ {wander, return, invest}. Rates: **d<60 → det=1 instantly** (point-blank corner surprise preserved — v0.6's wall-210 asset), 60→radius linear **2.5→0.5/s**, invest state charges **×2** (protects guard-redirect from being trivialized). Decay 0.4/s with a 0.5 s grace after LOS loss; chase→invest demotion keeps det=0.5. det≥1 → existing toAlert pipeline (0.35 s → chase → flock pulse), untouched.
  - **Blackout bypasses the gauge entirely** — v0.7 instant detection stands (any charge rate is mathematically softer than instant at CARRIER_SEEN's 60-u band; lantern 140 < seen 200 formula frozen). Dark-phase gauge is recorded as a rejected-for-now option.
  - Gate table: [via det] wander / return / invest sighting + non-KO stun wake (shove-escape buff — balance change, noted). [instant, unchanged] KO wake rage (but its snapshot origin is corrected to the KO spot — the current player-position snapshot is wall-hack-adjacent), rob-carrier loss, revenge (bare-hand hunting stays closed). [unrelated] chase live tracking, all sound paths.
  - E-set-down cancels charging (drop the egg → decay) — **intended counterplay** ("들킬 것 같으면 내려놔라"), not an exploit; re-pickup noise 310 + dark ABANDON risk is the price. Stamina note: with the gauge, the lit-phase punishment channel moves to exhaustion management (gauge-full + empty stamina = real catch) — record so future tuning doesn't touch the wrong constant.
- **C. Telegraphs**: vertical gauge bar above the head (MeshBasic amber→red, shows at det>0.05, replaces "?" when both apply); one warning tick sound at det crossing 0.5 (LOGIC 0); at det>0.3 the chicken's neck locks onto the player (render-only — "the chicken notices, not the UI"). **Sight rings**: shown only while carrying && lit phase && chicken state ∈ {wander,return,invest,alert} && player has LOS to that chicken && distance ≤400 — no rings through walls (rejected: dimmed rings — they re-leak the corner information walls-210 bought). One shared RingGeometry, radius = player-position rule (indoor 240 / outdoor 160). Confinement means no ring-on-ramp edge case. Marker grammar: grab/rob chickens get a target marker (amber ?-variant, "it wants the egg, not you"); revenge/rage chase gets double-rate crimson "!" blink.
- **D. Glove visual** (unanimous): small glove-mesh copies childed to the FP left arm and TP arm, `visible=player.glove` read in render (no state creation in render); swing reuses shoveAnim. ~15 lines, display-only.
- **E. Multiplayer plan document** (implementation 0 lines): `docs/design-multiplayer-plan-20260812.md` — WebSocket relay host-authoritative recommendation (Node+ws ~100 lines, 4-char room codes, 20 Hz ~1KB snapshots, one-shot FX as events), lockstep rejected with recorded reason (encounter determinism ≠ sim determinism: wander/dwell jitter uses Math.random and affects chicken positions). M1 singular-assumption inventory (held/pocket/charge globals, LANTERN singleton + light-count shader recompile, cart.pulled has no owner, DOM-event direct mutation already violating the input-queue rule — recorded honestly), plus this round's additions (det charges from the max-rate carrier and targets them at full; rings/gauge are local-viewer UI; EYE_MAT means "any player carries"). Five no-regret rules for THIS round's code: new AI reads the player only via a `targetOf(c)` accessor; `zoneOf` stays a pure function; no new singular globals; world mutation via update(dt); keep determinism. Confinement pre-defines M4 targeting ("chickens fight their own floor's intruders") — this floor design does not block 4-player.
- **Validation suite rebuild** (12 asserts): per-floor all-cell reachability (1F from door cell, B1 from stair-entrance cell); unified-graph door reachability; tray gates by BFS path length (euclidean 1700 dies at scale 9); egg 2/4 and chicken 4/6 with same-floor guards; no patrol/anchor on stair cells; per-floor spine plug-free and stair-aligned; B1 stair entrance visible from DOOR_IN (lineBlocked); landing walkway ≥230; no trays/troughs on ramps; zone gap ≥620 and every new radius constant < gap; rob/grab destinations same-zone; switchback fold keeps inter-zone cells ≥500 apart.
- Version → v0.9 (3 places); CLAUDE.md + design-doc decision log entries (lit-phase logic freeze lifted for detection only, by developer decision; multiplayer plan doc allowed, implementation still banned until approved).

## Out-of-scope (panel-cut this round)

2F floor data (FLOOR descriptor array generalizes; 2F is a next-round data commit), dark-phase detection gauge (recorded option), dimmed through-wall rings, cross-floor chicken chase (geometrically dead; confinement is the rule), netcode of any kind, minimap, per-floor music, glove multiplayer allocation (M4).

## Design Decisions (panel-settled — do not relitigate during implementation)

- Two floors (1F+B1), not three — developer's words satisfied verbatim; per-floor human ship-gates drop from 3 to 2; 2F rides the descriptor array later. (Rejected: 3-floor draft — one-round unfinishable.)
- 1F densification = scale change (12→9, RH 120) on the preserved seed-873 topology — "촘촘함" is cell pitch; every 1F contract (spine, tray0 tutorial, patrol literals, assert suite) survives untouched. (Rejected: new 1F 6×4 maze — burns every proven contract for the same feel.)
- Chicken confinement per floor; stairs are chicken-free breather corridors. (Rejected: unified-graph cross-floor chase — leash 600 vs gap 700 makes it a false promise; graph-distance leash = frozen-constant meaning change.)
- Zone gap 700 with the 910 bound retired by confinement; first stair bend ≤200 kills residual cross-zone LOS; corridor-center KO echo (~150 into both zones) is accepted and documented as "the scream carries up the stairwell", with origins clamped to stair entrances.
- Egg physics absolute-y + groundY contact only. (Rejected: ground-relative frame — visible physics lie on ramps.)
- Gauge is lit-phase only; blackout stays instant. (Rejected: dark charge ×2.5 — self-refuting: a moving carrier crosses the 60-u band faster than any chargeable rate, softening the settled instant-sell.)
- Point-blank (<60) stays instant det=1. (Rejected: charging point-blank — "납득 가능"'s target is mid-range detection; corner collisions are the fright the walls bought.)
- Rings require player-LOS; absent LOS, nothing renders. (Rejected: 25%-dim rings — spoiler with extra steps.)
- KO-wake origin corrected to KO spot (wall-hack hygiene); rage instancy itself unchanged — stun-lock farming still dead (the farmer stands at the KO spot).
- groundY via 4 chokepoints + entity setters, with the 30-site audit list as a review checklist. (Rejected: 30-site call-site scatter — bug farm.)
- WebSocket relay host-authoritative for M2. (Rejected: lockstep — jitter RNG already in sim; WebRTC P2P — signaling/NAT cost for zero prototype gain.)

## Acceptance Criteria

- [ ] `node --check`; validation suite all green (12 asserts, message recounted); zero console errors
- [ ] 1F plays identically to v0.8 in topology/contracts at scale 9; B1 reachable only via the stair; HUD floor indicator correct from zoneOf
- [ ] Chickens never enter stair cells; chases demote at the ramp; no chicken ever appears outside its floor; grab/rob never target across zones; no frozen-invest chickens (timeout valve works)
- [ ] Eggs: ramp throw cannot escape the map; out-of-zone rest breaks immediately; downstairs lob always breaks (relay closed); all spawns/rests sit on groundY
- [ ] Gauge: mid-range detection is a visible fill (edge ≈2 s), <60 instant, decay+grace per spec; blackout detection has zero added latency; E-set-down cancels charge
- [ ] Rings: only while carrying, lit phase, LOS, ≤400, correct radius by player position; never through walls; gauge bar/tick/gaze and target/rage markers render per spec
- [ ] Glove visible on FP/TP hands exactly while owned; reset clears it
- [ ] Blackout: floor lamps all die, stair frames stay lit, floor-branch prompts correct on both floors; timer 300 shown
- [ ] Multiplayer plan doc exists with all five no-regret rules; this round's code passes its own rules (targetOf accessor, pure zoneOf, no new singular globals)
- [ ] Version v0.9 in 3 places; CLAUDE.md + design doc decision entries recorded

## Related Files / Modules

| File | Role |
|------|------|
| D:\Work\vibe\CCL8\chicken-heist.html | All game changes — floors/nav/AI/telegraphs/glove |
| D:\Work\vibe\CCL8\docs\design-multiplayer-plan-20260812.md | New — 4-player architecture plan (no code) |
| D:\Work\vibe\CCL8\CLAUDE.md | Detection logic-freeze lift + multiplayer-plan allowance recorded |
| D:\Work\vibe\CCL8\docs\design-cooking-extraction-20260809.md | Decision log entries |

## Must-Preserve

- Plane logic everywhere (offset zones are the means, never true-3D logic); single HTML / r128 / Korean / node --check
- Silent walk; fixed-origin invest; no wall-hack (KO origin fix tightens this); no instant death + escape valves (out-of-zone egg break protects checkFail, never the player); determinism (no outcome RNG — gauge is deterministic integration)
- E/Q/F/Space semantics; E set-down absolute safety (now also the gauge counterplay); blackout ends only on win/fail; lantern 140 < seen 200; blackout wave economy (rings are lit-only)
- 1F seed-873 contracts: spine aisle 4, tray0 inert guardian, patrol literals, one-way east hole (1F-gated flapIn)
- v0.6/v0.7 systems intact: pocket, cart, jump, punch/KO/meat, stamina, flock alarm single-pulse, guard redirect, revenge
- Sound-path constants untouched — the gauge changes sight onset only; 2-column table gains one row (det-0.5 tick, LOGIC 0)

## Execution Notes

- Recommended model: Claude Fable 5 (current session — meets recommendation) for the zone/nav/groundY surgery and det-gate rewiring — interlocking contracts where one wrong gate silently kills a floor or a stealth route. Sonnet acceptable for mesh builders, HUD, and the plan document's prose.
- This document cannot enforce the model — the executing session's `/model` setting decides. If below recommendation, surface and confirm.

## Fairness Constraints

- No outcome RNG anywhere new: B1 literals offline-committed; det is deterministic; ring/gauge are display-only
- New radius constants must stay < zone gap (asserted); PACK_R shrink is forbidden (LOGIC freeze) — B1 alarm density is tuned only via patrol counts/anchors
- Blackout detection rules identical across floors

## Existing Integration Contract

- localStorage keys unchanged (ch_sens/ch_vol); pointer-lock flow unchanged; `?dark=0` unchanged (timer+possession both)
- FLOOR descriptor array is the 2F extension point; zoneOf/groundY are the only floor authorities

## Open Questions

(none — all settled by developer decisions (2026-08-12) and panel rulings. Two post-build developer ship-gates, not blockers: ① 1F-at-scale-9 door read ② B1 stair-landing read. Multiplayer implementation waits for the plan doc's approval — separate round.)
