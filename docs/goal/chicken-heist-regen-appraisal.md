# goal: chicken-heist-regen-appraisal

## One-line Goal
v0.21 bundle: quiet mid-night threat activation (4 dormant chickens + 2 yard raccoons), per-item price economy (×10 rescale, overlapping ranges), sunglasses appraisal purchase at the truck, and phosphor cart stripes.

## Background / Motivation
Developer request (2026-08-18): ① more threats besides chickens ② threats not all placed at start — they "quietly regen" mid-night ③ score by per-item PRICE (same kind, different prices) ④ prices visible only with sunglasses, bought at the food truck ⑤ cart more visible (glow).
Developer rulings taken during probing: new species need not be farm-native (core-decision-3 plausibility bar relaxed — recorded); chickens included in quiet regen; currency = deduct from delivered score (settles the design doc's official open question "구매 화폐의 단위" as 판매 대금); 4-in-1 bundle accepted as a v0.6-style exception. After the panel: species = raccoon confirmed; "quietly" = unannounced-but-attributable confirmed (no global broadcast, defer near players/sightlines, 0.8s telegraph — 갑툭튀-금지 lineage intact).
Design settled by a 4-perspective panel + cross-examination (9 agents; run wf_51820a47-122). Decisions below are panel-settled — do not relitigate during implementation.

## In-scope
- Raccoon (너구리) ×2: yard-only property predator stealing unattended loose loot; own FSM + `rc` snapshot key.
- Dormant-start for the 4 free-roamer chickens (indices 2,3,8,9), in-place wake at fixed night fractions.
- PRICE[LOOT_N] deterministic per-slot prices from a dedicated seed substream; ×10 economy rescale.
- Sunglasses: 30-score per-player purchase via truck counter prop + E prompt; worn mesh; pre-baked price-tag sprites.
- Universal `+N` world popup at the truck on every delivery (st[8]).
- Cart phosphor stripes (MeshBasic, always on).
- PROTO_V → v0.21.0 (one bundle, one bump; three-places version rule).
- CLAUDE.md reversal/decision records.

## Out-of-scope (explicit non-goals — do not let these re-enter as "small extras")
- Loud-event spawn acceleration; kill-subtracts-from-budget ledger (dead-is-dead already implements permanence).
- Hatch/pop-hole entrance meshes (revive only if friends report "어디서 나왔어" confusion).
- Always-on '?' scribble tags without glasses; team-wide purchase; eg[9] price append; any PointLight on the cart.
- Fox / scarecrow / stray dog; raccoon 확인사살 (one punch removes it — no second kill economy).
- Raccoon stealing attended items (pulled cart is safe by construction: "unattended" = no active player within RACC_ATTEND_R≈120u).
- Per-item cook/burnt randomization; any cooked multiplier (blackout ×2 stays the only multiplier).
- Runtime entity creation or runtime spawn-position rolling (activation only, at load-validated positions).

## Design Decisions (panel-settled — do not relitigate during implementation)
- **D1 species+role**: Raccoon = property predator. Steals unattended loose loot (ground items and cart slots) in the YARD only (zoneOfArea 0, RACC_MAX_X = BARN.x0−40, never inside the coop). Never touches players. Grab telegraph ≈0.6s audible chitter (volAt) before taking. One punch = comedy tumble: drops everything in place, flees off-map, gone for the night (no KO, no 확인사살, zero contact with KILL_CD/KILL_RAGE_T). Speeds (new constants): drag-waddle 100 < carry-sprint 152.6 (always catchable — the game's own escape-valve inequality), unburdened flee 175. Zero chicken coupling — the honk/burnt-edge two-coupling cap stays closed. (Rejected: fox — chase-the-carrier duplicates chicken pressure; dog — reskin of the recalled goose; scarecrow — gaze-sensing undecidable + institutionalized 갑툭튀; pocket-thief raccoon — clones the chicken rob verb.)
- **D2 quiet regen = activation, never creation**: chicken total stays exactly 10 (layoutChecks, LOOT_N, meat cap, snapshot widths untouched); all entities+meshes built at load on both sides. Free roamers (2,3 on 1F; 8,9 on B1) start in new CK state `dormant` (appended at CK_STATES end): mesh invisible, excluded from AI/audio/alarms/detection. They wake IN PLACE at their load-validated homes at fixed night fractions 25/40/55/70% of NIGHT_LEN — plain constants, no RNG, host-authoritative, clients mirror the state delta. Wake defer (retry ~2s): hold while any active player is within THREAT_ACT_MIN_R(140) of the home OR has an unblocked wall-raycast sightline within ~300u; then the standard 0.8s flap+cluck telegraph (local volAt only — no global announcement). Kills strictly orthogonal: killed slots stay dead; schedule never reacts to anything. Tray guards + tray0 guardian live from t=0 (every tray defended all night). Raccoons: pool of 2 built at load, dormant, activating at 40%/70% at 2 fixed yard points validated in the THREATS loop (they are NOT yardChokes rows — a spawn point is a threat home, not a player-standable landmark), same defer + 0.8s rustle telegraph. (Rejected: runtime push — crashes index-mirror clients; genLayout-stream schedule draw — shifts the substream and silently changes every existing seed's layout.)
- **D3 prices**: `PRICE` = int array of length LOOT_N(28), drawn once after genLayout from mulberry32(MAP_SEED ^ 0x50524943) — slot-indexed, both sides identical under the version+seed gate, ZERO wire. Overlapping ranges: egg 5..15, bigEgg 20..40, meat 12..28 (egg∩meat at 12..15, meat∩bigEgg at 20..28 — kind is no longer a total order; that overlap IS the sunglasses product). Uniform ×10 economy: COOK_BONUS additive per kind {egg:+10, bigEgg:+10, meat:+20}; BURNT_VAL=5 flat; blackout ×2 stays the only multiplier, applied last; GRADE → [10,140,350]; sunglasses cost 30. deliverEgg stays the sole value-math site: base = heat===2 ? BURNT_VAL : PRICE[slot] + (heat===1 ? COOK_BONUS[kind] : 0); val = base × (blackout?2:1). Self-checks RANGE-STATIC only (never against the per-seed draw): PRICE.length===LOOT_N, BURNT_VAL ≤ min egg, expected-line inequality on range MEANS. Prompts reworded value-free ("값이 세다", "헐값은 쳐준다"). (Rejected: GRADE-anchored ranges — category error inflating meat ~17×, would resurrect KO-farming; non-overlapping ranges — no triage decision; host-authoritative price on the wire — dual source of truth.)
- **D4 sunglasses**: per-player, 30 score, bought at the truck via a visible counter PROP + the existing prompt chain (empty hands near prop: "E — 선글라스 사기 (30점): 물건 값이 보인다" / insufficient: "선글라스 30점 — 아직 N점 모자라다"). New act `{a:'buy'}` through pushAct/processActs; host guards phase/near/!has/score≥30; deduct clamped at 0; flag p.sunglasses, wire pl[15] (undefined-tolerant read), reset each round in resetWorld and on leaver. Worn black MeshBasic bar on the buyer's head — everyone sees who spent team money (comedy = sunglasses at night). bigmsg "P○가 선글라스를 샀다 (−30)" as garnish (truth is state). Price tags: pre-baked canvas sprites per slot (prices static per seed — zero per-frame canvas), MeshBasic, depthTest:true (walls occlude — loot info gets NO through-wall privilege), visible iff local wearer && state==='rest' && dist<260, cap nearest 6. Blackout: tags stay on showing the DOUBLED price in gold (teaches ×2 at the moment it matters). Never on minimap; no tags on carried/cart items; no other perks (threat-visibility contract untouched). (Rejected: team-wide purchase; new keybind; HUD shop; ev-only confirmation; cross-round persistence.)
- **D5 cart glow**: 2–3 phosphor-green (~0x9fdc8a) MeshBasic stripes on cart bed rims + handle, built in the cart IIFE. NO PointLight. Registered in NEITHER applyDark NOR the flicker branch — an "honest lighthouse" like the door frames; always on, which is the feature (find your cart in the dark; with D1 it doubles as raccoon-bait pricing for the visibility buff). (Rejected: PointLight — light-budget + flattens darkness; applyDark wiring — deletes the feature.)
- **D6 net/versioning**: one bundle, one bump: PROTO_V 'v0.21.0'. Old clients hard-rejected at the join gate — that IS the compatibility contract; append-only discipline is insurance against a forgotten bump, not a tolerance promise. Wire surface (all appends): CK_STATES+'dormant'; EGG_STATES+'dragged' (raccoon-carried egg: carrier=-1, host writes position; eg[5] carrier-is-a-chicken semantics preserved; releaseRobbed untouched); new top-level snap key `rc` (own RC_STATES, double-bounded client loop, width-lock in validate()); pl[15]=sunglasses; st[8]=last-delivery value (readers ||0); act 'buy'. NO new ev types (D20) — all ceremonies derived from state deltas. Hardening in passing: ||'wander' fallback at the CK state read. bestKey invalidation rides the bump.

## Acceptance Criteria
- [ ] Night starts with 6 active chickens (all 6 tray guards incl. tray0 guardian); roamers 2,3,8,9 invisible/dormant; they wake in place at ≈61/98/134/171s with 0.8s flap telegraph, deferred while a player is within 140u or has line of sight (≤300u).
- [ ] Killed chickens never come back; wakes never accelerate for any reason.
- [ ] 2 raccoons activate at ≈98/171s in the yard, steal only unattended (no player within ~120u) loose/cart loot, drag toward the map edge slower than carry-sprint, drop everything on one punch and vanish for the night; egg uses state 'dragged' and is recoverable where dropped; loot reaching the edge is gone.
- [ ] Raccoons never enter the coop, never touch players, never appear on the minimap.
- [ ] Prices: same-kind items show different prices; host and client compute identical PRICE arrays with no price bytes on the wire; delivery math = PRICE/BURNT/COOK_BONUS then blackout ×2; every delivery shows a +N world popup at the truck for all players.
- [ ] Sunglasses: E-purchase at the truck prop for 30, per player, per round; wearer's head shows the black bar to everyone; wearer sees ≤6 nearest price tags on resting loot within ~260u, wall-occluded; gold doubled prices during blackout; no tags without glasses.
- [ ] Cart stripes visible in darkness and during blackout; no light cast on surroundings.
- [ ] validate() green including: raccoon posts in the THREATS loop, PRICE range-static checks, rc width-lock; `node --check` passes.
- [ ] Version v0.21.0 in all three places; multiplayer joins gated on it.

## Related Files / Modules
| File | Role |
|------|------|
| D:\Work\vibe\CCL8\chicken-heist.html | All gameplay/net/render edits (single-file game). |
| D:\Work\vibe\CCL8\CLAUDE.md | Records: animal-card re-spend (raccoon), shop-hold release (return to design-doc core loop; currency settled = 판매 대금), price-economy decision, v0.21 bundle exception. |

## Must-Preserve
- 즉사 금지; failure = comedy. Raccoon interactions must never harm players.
- THREAT_ACT_MIN_R=140 + telegraph for every activation; no global spawn announcements.
- 확인사살 영구 제거 promise; KILL_CD=KILL_RAGE_T move together (untouched here).
- Goose precedents: no chicken-AI cloning; strict zone isolation (raccoon = yard-only mirror of the goose rule).
- layoutChecks single source; chicken count 10; LOOT_N 28; no bespoke runtime placement predicates.
- Bright-section LOGIC constants frozen; body scale + speeds frozen (CHK_CHASE 124 < 152.6 escape valve reused for the raccoon drag speed).
- Threat visibility contract: raccoon body non-emissive (invisible outside light); eyes/markers MeshBasic allowed.
- Minimap contract: no 닭·너구리·알·파동·가격.
- Relay stays transport-only; snapshot append-only; ev channel = wave/bigmsg only; single-seed determinism.
- HUD budget (1 line 3 items) — all new info lives in the world (tags, popup, worn mesh, prop).
- Kitchen verbs and heat rules unchanged except uniform ×10 value rescale; decoyPulse stays the last chicken coupling.

## Fairness Constraints
- PRICE derives from MAP_SEED via a dedicated substream — R-retry keeps prices (map identity), N/new-seed rerolls; no player-visible RNG at runtime.
- Host is the only judge for buys, steals, wakes; clients render state.
- Wake/activation defer rules prevent unfair materialization (no pop-in within sightline or 140u).
- Sunglasses grant information only — no detection/visibility/speed perks.

## Existing Integration Contract
- eg tuple [0..8] unchanged; new egg state appended. ck tuple unchanged; new CK state appended. pl gains [15]; st gains [8]; new top-level `rc` key. All reads on old indexes untouched.
- deliverEgg remains the single value-math site; stats.score remains the single currency store (buys deduct from it).
- resetWorld resets: dormant states, raccoon pool, sunglasses flags, price tags (PRICE itself is seed-stable).
- Post-build measurement pass (developer monitor, recorded as OPEN follow-ups, not blockers): early-night B1 sweep cost vs 31.1% breakeven with 6 active chickens; GRADE [10,140,350] vs measured night scores; early-night patrol coverage number; informed-pick rate ≥25%; blackout gold-tag mood check (fallback: dim to outline, price within ~120u).

## Execution Notes
- Recommended model: Claude Fable 5 (top tier, 2026-07+) for FSM/netcode/economy wiring (judgment-heavy, contract-dense). Sonnet acceptable for mesh boilerplate and copy edits.
- This document cannot enforce the model — the executing session's `/model` setting decides. If the session model is below the recommendation, surface it to the user and confirm before proceeding.
