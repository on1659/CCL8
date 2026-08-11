# goal: chicken-heist-multiplayer

## One-line Goal
Implement 1–4 player co-op multiplayer (M1 player-state refactor → M2 WebSocket relay transport → M3 link-based lobby → M4 co-op rules) for the chicken-heist web prototype, per the approved plan `docs/design-multiplayer-plan-20260812.md`.

## Background / Motivation
The developer approved the multiplayer plan on 2026-08-12 ("멀티 계획 문서 승인 ㄱㄱ M1부터 끝까지 다해줘"), lifting the CLAUDE.md netcode ban for this round. The plan's M1–M4 roadmap is executed in one round by explicit developer decision (the plan itself recommended M1 alone first; overridden). Architecture is fixed by the plan: WebSocket relay + host-authoritative simulation; lockstep and WebRTC P2P were rejected there with recorded reasons — do not relitigate.

## In-scope
- **M1** — dismantle every singular-player assumption: `players[]` (4 resident slots) + local index `me`; intent queue (frame-start batch processing, replacing direct DOM-event world mutation); 4 resident lantern lights; `cart.owner`; `targetOf(c)`/`c.tgt`; per-chicken-per-player detection gauge; per-target chase predicates; player mesh factory with tint.
- **M2** — `server.js` (Node + `ws`, pure relay, room codes) + `package.json`; 20Hz JSON snapshot (short keys, quantized, enum states) + one-shot event channel (waves + bigmsg only); client interpolation (exponential lerp, no delay buffer) + self movement prediction with snapshot-state override.
- **M3** — link-based lobby (`?room=CODE&ws=…` join; title click = join when `?room` present, solo start otherwise); host "친구와 함께" panel with copyable link, peer count, host-only start; per-client "클릭해서 입장" gate (pointer-lock/audio gesture); multiplayer skips the intro cinematic.
- **M4** — team-sum blackout trigger; same-floor chicken targeting with per-player det; per-player caught/rob semantics; cart single-ownership; leave handling; host-only pause/restart semantics; teammate legibility HUD (display-only).
- Version bump to **v0.10** (three places per ship rule) + CLAUDE.md approval record + plan-doc status update + relay deployment doc.

## Out-of-scope
- Cooking/shops/orders/quota, animals other than chickens, rot/hunger (still banned by CLAUDE.md).
- Deterministic lockstep, WebRTC/TURN (rejected in plan doc).
- Reconnect/slot-grace, spectate mode, mid-game join, direct egg handoff, rescue/carry-assist, per-player hat silhouettes, delta/binary snapshot compression, Web-Worker host tick (all explicitly deferred — see Design Decisions).
- Relay server *deployment* (developer action; documented only).

## Design Decisions (panel-settled — do not relitigate during implementation)
Settled by a 4-perspective panel (mechanism / netcode / UX / simplification) + cross-examination, 2026-08-12.

### Detection & chicken AI
- **D1. Per-chicken-per-player det array** replaces the scalar: each carrier charges only from their own visibility/rate/distance, decays independently; full charge sets `c.tgt` to that player; the gauge renders the viewer's own `det[me]`; solo (N=1) is behavior-identical. (Rejected: plan-doc's "max-rate single scalar" — detGrace bridges alternating sightings into a monotonic ratchet whose speed scales with carrier count; also rejected: single "focus carrier" scalar — hides each teammate's own risk.)
- **D2. Chase predicates are per-target**: the drop-egg release check reads `players[c.tgt]`'s carry state; chase freshness updates accept only noise stamped with `src === c.tgt`; every `alarmNoise` call carries a source-player id. (Team-wide predicates would void the taught "drop the egg and it lets go" rule and create Franken-chases toward bystander footsteps.)
- **D3. Blackout instant detection** targets the nearest visible carrier; `chickenSee`/`sightRadius` are parameterized by candidate target for logic; the sight-ring render stays viewer-position-based (dual use split).
- **D4. No cross-floor noise filtering change** — zone gap ≥620 already exceeds every noise radius; the proposed filter would itself change solo bright-phase LOGIC. (Rejected: floor-filtered step-noise propagation.) Corridor-transit frequency at 4 players → friend-test observation item.
- **D5. No blackout punishment for empty-handed players** — risk-free luring IS the non-carrier's role. (Rejected: contact stun / peck-once.) Friend-test question: "did the blackout feel trivial?"
- **D6. Chicken neck-gaze aims at the argmax-det carrier** (world truth, same on every screen) — no longer hardcoded to the local player.
- **D7. Blackout egg-abandonment predicate generalizes to "protected if ANY player within ABANDON_R"** — otherwise the floor-relay handoff route becomes chicken-grab bait mid-handoff.

### Rules & co-op (M4)
- **D8. Team-sum blackout trigger unchanged** from plan recommendation (`delivered + all held/pocket + cart ≥ 3`), no player-count scaling. Known tradeoffs recorded: multi optimal play = early blackout (v0.9 bright-phase systems under-exposed) and the pad-staging hole. Friend-test items. (Rejected: threshold scaling — a new balance knob with zero playtest data.)
- **D9. M4 temporary rules confirmed**: no rescue/carry-assist; egg handoff via floor relay only; single cart owner, others' F ignored; glove first-come (`gloveTaken`); no spectate (win/fail is simultaneous team-level); no mid-game join; win/fail formula unchanged.
- **D10. Cart multiplayer spec**: breadcrumb trail follows `players[cart.owner]`; `runAcc` uses owner's running; CART_MULT applies to owner's speed; caught releases ownership only when the caught player is the owner.
- **D11. Leave handling**: leaver's held/pocket eggs **rest-place via the gentle-place path** (collideCircle, never `fly` — the zone-(-1) landing safety net + checkFail can otherwise convert a wifi blip into team defeat); cart.owner releases; chickens with `c.tgt === leaver` demote to invest at last position; det[leaver] zeroes. Host disconnect: "호스트가 나갔다 — 방이 닫혔다" ~2s, then title. Snapshot silence >1s freezes prediction with "연결이 불안하다…". (Rejected for v0.10: 30s slot grace + reconnect token — known cost recorded: a wifi blip removes that player for the round.)

### Pause / restart / input authority
- **D12. Pause decouples from pointer lock (M1)**: an explicit pause state (host Esc / host away) is the only thing that stops the sim in multiplayer; pointer-lock loss becomes a local overlay; client Esc overlay reads "메뉴 — 게임은 계속 진행 중!"; win/fail copy branches by role. Solo keeps current behavior.
- **D13. Host-away is an honest stop**: host `visibilitychange`/lock-loss broadcasts pause "호스트 자리 비움". (Rejected: 50ms hidden-tab setInterval fallback — factually dead, browsers clamp hidden-tab timers to ≥1s; rejected as over-scope: dedicated Web Worker tick.)
- **D14. R is host-only**, ~1s hold during play (instant on win/fail overlays), with bigmsg broadcast; client R is not an intent. Key classification: R = host-only; M/V/Esc = local; E/Q/F/click/Space/WASD = intents.

### Netcode (M2)
- **D15. `update()` physically splits into `hostSim()` and `clientTick()`** (intent send + self-prediction + interpolation + presentation only). All rule functions live host-side by structure; win/fail/bigmsg presentation reacts to snapshot phase. (An isHost guard is too easy to miss — physical separation makes the leak class unrepresentable.)
- **D16. No delay-render buffer**: remote entities exponentially lerp to the latest snapshot (`pos += (target-pos)*min(1, dt*12)`), hard snap when error >200u or when `lineBlocked` separates render from target. (Rejected: timestamped ring buffer + clock offset estimation — pure cost at 20Hz displacement scale.)
- **D17. Self-prediction contract**: client runs the same movement code with rule states (stun/stagger/exhausted/stam/carry/cart multipliers) overwritten from each snapshot; correction only beyond ~40u deadband or lineBlocked divergence; on snapshot stun 0→positive, drop input and snap, masked by the existing fall choreography.
- **D18. Intent packets** at fixed 20Hz carry move vector + buttons + yaw; throw/punch intents embed (yaw, pitch) captured at press; throw carries client-computed power `pw`, host clamps to [0,1]; host validates `Number.isFinite` on every numeric field and renormalizes move vectors; intents process in arrival order with an E-fallthrough guard (an E aimed at a just-taken egg must not fall through to cart withdrawal). (Rejected: host-side charge accumulation with client display estimation.)
- **D19. Action feel**: keys play local arm animation + SFX immediately on press; outcome arrives via snapshot; no deny events, no lag-compensation pickup margin (accepted tradeoffs — a whiffed swing is comedy-consistent).
- **D20. Event channel carries exactly `wave(emitterId, x, z, maxR, color)` and `bigmsg(text, target)`**. Everything else (SFX, key particles, det≥0.5 warning blip, blackout flicker, delivered/broken/caught ceremonies) derives client-side from snapshot deltas. Own-wave boost applies only when `emitterId === me`; remote step waves tint with player color; host consumes its own broadcasts through the same path (no double-fire). Blackout pd-gated waves (cluck/strut) are host-judged against the **nearest player**. (Rejected: wholesale snd/burst wrapper promotion; delayed replay queue.)
- **D21. Snapshot schema**: short keys, 1-decimal quantization, enum-indexed states. Entities: players 4 (on,x,z,jy,yaw,stun,glove,stam,exhausted,held/pocket egg idx,shake,running,stagger), chickens 10 (x,z,dir,state,ko,det[4]), **eggs 6** (state,x,y,z,cracked,carrier) — not 12; **meats up to 10** (active,x,z) — a rules entity the draft missed; cart (x,z,dir,owner,slots), stats, blackout, phase, pause+reason, gloveTaken. ~1.5KB @ 20Hz. (Rejected: delta compression, binary serialization.)
- **D22. Derived-not-sent**: flickT/warned30/warned10, chicken bob, first-carry glint (team carried 0→1, host-defined), swapT/pitch/camMode/tpCur/sens/vol stay local; only yaw of the singular trio joins `players[]`.

### Server & transport policy
- **D23. `server.js` is a pure relay** (~60–100 lines): room create/join with 4-char code, enforced role routing (host→broadcast, client→host only), host socket close deletes the room + notifies, ws ping/pong ~15s reaps half-open sockets, capacity 4, join-after-start rejected with reason. (Rejected: static file serving — the friend path is GitHub Pages + separate wss relay; "stateless" framing — room maps ARE state; relay-side content validation — friend trust, host validates.)
- **D24. Transport URL policy**: wss:// required on https pages; https + `?ws=ws://` raises a **visible UI error before any connection attempt** (mixed-content blocking is console-only otherwise); ws:// allowed only for http://localhost and file:// (file:// gets an explicit branch — no same-origin fallback exists there); GitHub Pages without `?ws` disables multiplayer entry with a notice; room links carry `?room=CODE&ws=…` so friends type nothing.
- **D25. Hello handshake** carries protocol/game version (v0.10) and host's `darkEnabled`; mismatch rejected with "새로고침하세요"; client-local `?dark=0` is overridden by the host value in multiplayer.

### Lobby & onboarding (M3)
- **D26. Join via `?room` link only** — with `?room` present, the title's full-surface click means "join"; otherwise it stays solo start. One small stopPropagation "친구와 함께" button reveals host options. Manual code-entry UI is cut. Tints auto-assigned from blue/green/violet/cyan (off the alert-red/gauge-amber signal hues; colorblind limitation recorded). Mid-game link arrival: "판 진행 중 — 다음 판까지 대기". (Rejected: code-entry screen; hat-silhouette variants.)
- **D27. Post-start client gate**: full-screen "클릭해서 입장" whose click acquires pointer lock and resumes AudioContext; multiplayer skips the intro cinematic entirely (solo keeps it).
- **D28. Teammate legibility (display-only, LOGIC 0)**: blackout attribution bigmsg ("정전!! — ~색이 마지막 알을 잡았다"); teammate HUD chips (tint + floor + egg count); team total "확보 n/3"; teammate-caught one-liner; egg billboard over any carrier including pocket carriers; faint tint emissive on teammate bodies during blackout; sight-circle stays viewer-only.
- **D29. M1 structural set**: four pre-placed spawn offsets (no first-frame separation shove); `makePlayerMesh(tint)` factory replacing the plr IIFE singleton with per-viewer first/third-person visibility; LANTERN → 4 resident lights (r128 shader-recompile constraint).

### Acceptance & process
- **D30. M1 acceptance replaces "byte-identical solo"** (unfalsifiable due to un-seeded Math.random) with: (1) LOGIC constants and judgment predicates text-diff 0, (2) validate() 12/12 plus new multi assertions, (3) a 30s solo smoke covering pickup/caught/deliver. M1, M2, M3 land as separate commits with per-stage smoke gates.
- **D31. Operations facts documented**: wss required; free-tier cold start 30–60s → lobby "서버 깨우는 중 (최대 1분)" state; host should be the strongest machine and keep the tab focused (dt-clamp converts host hitches into everyone's slow-motion); host/client latency asymmetry. Friend-test question list adds: 4th-player boredom (NEED_EGGS=3), blackout too early / trivial.

## Acceptance Criteria
- [ ] Solo play unchanged: LOGIC constants text-diff 0; validate() 12/12 + new multiplayer assertions pass; 30s solo smoke (pickup → caught → deliver) plays identically; title→click→play path unchanged for a friend without `?room`.
- [ ] `node --check` passes on the extracted game script and on `server.js`.
- [ ] Two-tab local smoke: create room → join via link → host start → both enter play; movement visible cross-tab; client E picks an egg; client caught by chicken shows stumble on both screens; no console errors.
- [ ] Host-away pause, host-leave room-close, client-leave item drop each behave per D11–D13.
- [ ] Version v0.10 in all three places; CLAUDE.md records the approval; plan doc status updated; relay deployment doc exists.

## Related Files / Modules
| File | Role |
|------|------|
| D:\Work\vibe\CCL8\chicken-heist.html | Entire game (single file) — M1 refactor + M2 client + M3 lobby + M4 rules |
| D:\Work\vibe\CCL8\server.js | NEW — pure WebSocket relay (rooms, role routing) |
| D:\Work\vibe\CCL8\package.json | NEW — `ws` dependency + start script |
| D:\Work\vibe\CCL8\docs\multiplayer-deploy-20260812.md | NEW — relay deployment + operations doc (Korean) |
| D:\Work\vibe\CCL8\CLAUDE.md | Approval record; netcode ban lifted for this round |
| D:\Work\vibe\CCL8\docs\design-multiplayer-plan-20260812.md | Status header update (approved 2026-08-12) |

## Must-Preserve
- The plan doc's five no-regret lines: `targetOf` accessor for AI reads; `zoneOf`/`groundY` stay pure; no new singular globals; world mutation via update(dt) + one-shot effects via named functions; encounter determinism (no outcome RNG).
- Bright-phase LOGIC constants identical to v0.9 (2-column VIS/LOGIC table discipline); blackout instant-detection 140/200 formula frozen.
- No insta-death: every failure is comedy (stumble, drop, expulsion) — including all new multiplayer failure paths (disconnects, host-away).
- Solo entry UX: link → click → playing, with zero new required steps; the 3-second "훔쳐 나오는 거네" legibility bar.
- Single-HTML game file, vanilla JS + Three.js r128 (cdnjs), no build step; Korean comments/UI.
- Egg count 6, chickens 10, NEED_EGGS 3, all maze/topology literals untouched.

## Fairness Constraints
- Host-authoritative: all rule judgments (pickup, catch, break, deliver, win/fail, blackout) execute only on the host; clients send input intents only. Friend-trust model — no anti-cheat beyond host validation (isFinite, clamp pw, renormalize move vectors).
- Encounter determinism preserved: patrol literals and dwell jitter semantics unchanged; no outcome RNG added.
- No per-viewer rule divergence: world-truth telegraphs (neck gaze D6) are computed host-side; viewer-local renders (gauge det[me], sight ring) are explicitly display-only.

## Existing Integration Contract
- `collideCircle`/`raySeg`/`lineBlocked`/`navTo`/cell graph: untouched; client prediction reuses them read-only.
- `spawnWave` early-returns outside blackout — bright-phase event traffic is structurally zero; do not add bright-phase wave calls.
- `eggs` state machine strings ('gone/rest/held/fly/pocket/cart/robbed') keep their semantics; enum indices are a wire format only.
- localStorage keys `ch_sens`/`ch_vol` unchanged.
- `?dark=0` flag still works solo; overridden by host in multiplayer (D25).

## Execution Notes
- Recommended model: strongest current Claude model (2026-08: Claude Fable 5 — the tier above Opus; do not downgrade to stale "Opus 4.8" wording) for the M1 refactor and M2 netcode (judgment-heavy: predicate re-attribution, prediction contract, host/client split). Sonnet acceptable for the deployment doc and version-bump mechanics.
- This document cannot enforce the model — the executing session's `/model` setting decides. If the session model is below the recommendation, surface it to the user and confirm before proceeding.
