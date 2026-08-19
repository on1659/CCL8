# goal: chicken-heist-tuner

## One-line Goal
Move every settable number into `monsters.json` that the game actually loads, and ship a no-build web tuner that edits it — validated by the game's own self-check, never by a copy of it.

## Background / Motivation
Developer (2026-08-19): "게임에 들어가는 몬스터 정보를 따로 json으로 빼서 그거 로드해서 그거가지고 만들게 하는건 어때. 그리고 그걸 수정할수있는 웹툴을 또 만들어줘."
Designed by an 8-agent panel (recon ×3 → perspectives ×4 → cross-exam; run wf_41bf4a7c-a35).

**Developer rulings, in the order they were taken:**
1. Order: the chase overhaul (v0.22.0) shipped first; the tuner is this round.
2. Scope: **"세팅가능한거 전부 다"** — not just monsters. Economy and night constants included.
3. The v0.22-frozen 11 (SIGHT_IN/SIGHT_OUT/DET_NEAR/AGGRO_RUN/PACK_R/REVENGE_R/CHK_LEASH + the four player speeds) **stay frozen** — read-only in the tool, unlocking is a future round with its own goal doc.
4. Data form: **a real separate `.json` file** — this **reverses** the earlier "내장 기본값 + 붙여넣기" ruling from the same conversation. The developer took the reversal with the two costs named in the option text (file:// double-click execution dies; a friend running a stale local copy silently diverges). Both costs are mitigated below rather than merely accepted.

## In-scope
- `monsters.json` — 87 settable values, generated from the game's own defaults (never hand-transcribed).
- `T(name, default)` accessor wrapping the numeric literal at each declaration site; synchronous load with graceful fallback.
- `tuneHash()` + a 4th join-gate tier so a config mismatch is loud instead of silent.
- `window.CCL8_VERDICT` — the self-check's result as a value, not just a console string.
- Title badge naming the config source whenever it is not `monsters.json`.
- `dev/tuner.html` — grouped sliders, live derived arithmetic, cold-boot validation via same-origin iframe, export/copy gated on green.
- Self-check block 25 (derived-link integrity, array-length contracts, range bounds).

## Out-of-scope (refused, with the reason each is refused)
- **Derived values** (`PUSH_CD=2*PUSH_STAGGER`, `KILL_CD=KILL_RAGE_T`, `HURT_STUN`, `CHASE_TURN`'s radian conversion) — exposing both sides of a derivation silently breaks the link. They are asserted intact in block 25.
- **Structural values** (`PER_TRAY`, `RACC_N`, `GOOSE_N`, `MAX_PLAYERS`, `CHK_R`, `RACC_R`, `RACC_HOME`) — they resize pools and entity counts. The admission test is mechanical: *a knob is admissible only if every value in its exposed range still produces a build that reaches the end of `validate()`*. `GOOSE_N>0` TypeErrors against the empty `GOOSE_HOME`; `RACC_N>2` crashes before its own check can report. A crash cannot be reported by the thing that crashed.
- **The v0.22-frozen 11** — the self-check proves the exception's scope by literal equality; a slider that rewrites that assertion retires a recorded contract through a UI affordance.
- A TUNE object literal or a sentinel-delimited region in the game (see D1).
- Any runtime override channel for shipped builds (URL param / localStorage) — see D3.
- Client-side adoption of a host's config; auto-reload on tune mismatch.

## Design Decisions (panel-settled — do not relitigate during implementation)
- **D1 the numbers stay where they are.** Each tunable literal is wrapped in place: `const CHK_CHASE=T('CHK_CHASE',132);   // 132 = SPD_WALK 정확히 …`. The declaration block carries ~30 comment lines that are this project's decision record — *why* 132 and not 124, *why* 0.80 and not 0.75. Any design that relocates or regenerates those declarations puts that record in the custody of a tool that cannot author it. Wrapping in place gives all three properties at once: the game genuinely builds from the JSON (the literal request), the literal remains the fallback so the file still runs standalone, and the comments never move. (Rejected: a `TUNE` object literal — strands the comments, cannot express `CHASE_TURN`'s degree expression or `KILL_CD`'s alias, and buys nothing for the override problem since the bindings stay `const`; a `// <TUNE>` sentinel region — same comment problem; whole-block paste replacement — deletes the record on first successful use.)
- **D2 synchronous load, honest fallback.** `monsters.json` is read by a synchronous `XMLHttpRequest` before the first declaration, because the constants are consumed immediately (entity construction, `LAYOUT`, `validate()`) and an async load would require rewriting a 5900-line script into an async boot. On failure — `file://` double-click, 404, malformed JSON — the game **does not die**: every value falls back to its literal, `TUNE_SRC` records why, and the title screen shows an amber badge. Per-key type checking means a single bad entry degrades one value, not the build. This mitigates the first accepted cost: double-click still works, it just runs defaults and says so.
- **D3 there is no override channel for shipped builds.** The precedence chain is one link long: the JSON, else the literal. The single exception is `sessionStorage['ccl8_tune_preview']`, read first, which only the tuner writes and which the tuner clears on unload — and even then the badge announces it. No URL parameter (the seed self-heal rebuilds the query string from scratch and would silently drop it, leaving a client on defaults behind a *passing* gate), no localStorage (it would be the first key in the file that changes the simulation while being invisible at the handshake).
- **D4 host-wins, made loud.** Deployment already satisfies "호스트 설정이 이긴다" literally: the friend opens the host's URL, which serves the host's `monsters.json`, so the friend plays the host's tuning without doing anything. The residual risk is someone running a stale **local** copy. So `tuneHash()` — FNV-1a over the resolved values with sorted keys and 6-decimal formatting — becomes a **4th join-gate tier** after version → seed → hash. On mismatch the join is refused with "몬스터 설정이 다르다 — 방장이 준 주소로 접속해야 한다". **No auto-reload**, matching the hash tier's rule, which is this file's only named spin-loop guard. This mitigates the second accepted cost: silent divergence becomes a refusal with an instruction.
- **D5 validation is the game's own, never a copy.** `validate()` gains one line publishing `window.CCL8_VERDICT = {bad, seed, hash, ver, tune, src, values}`; the console output is untouched. The tuner writes its candidate to `sessionStorage`, cold-boots the game in a same-origin iframe, and reads the verdict. A cold boot runs **100% of the predicates at the real load order** — including the tuple-width locks, the live-entity checks, the t=0 dormancy block, the seed-dependent chokepoint loop, and the lexical `typeof NEED_EGGS` check a parent frame could never evaluate. (Rejected: a `CCL8_CHECK(cfg)` function — it would require rewriting ~110 assertions to read from a candidate object inside the most safety-critical function in the file, would still miss the live-entity and load-order checks, and would become the second predicate source the single-source doctrine forbids. Also verified: the payload is a classic `"use strict"` script, so top-level `const` are not on `window` and there is no poke path — the one published line is mandatory, not a convenience.)
- **D6 the tool cannot hide a key.** Group/label/range metadata lives in the tuner because it is presentation, not truth; any key present in the JSON but absent from that metadata is rendered anyway under 기타 with a generic control. Frozen and derived values appear as text rows **with the reason they cannot move** — a greyed-out slider reads as "movable, later". Export and copy are disabled while the verdict is red, so a config that fails the game's own checks cannot be saved from the tool.

## Acceptance Criteria
- [x] Game loads `monsters.json`; hash of the loaded values equals the hash of the embedded defaults (proves the file round-trips the defaults exactly).
- [x] All 87 values identical to the pre-refactor build; derived links (`PUSH_CD`, `KILL_CD`, `HURT_STUN`) and the frozen 11 verified unchanged.
- [x] Removing/corrupting `monsters.json` falls back to defaults with an amber title badge instead of dying.
- [x] Tuner shows 87 knobs in 10 groups and reads the verdict out of the iframe (same-origin confirmed).
- [x] A knowingly-bad config (`CHK_CHASE=200`) produces 6 real assertion failures **from the game's own predicates** and locks the save buttons; reverting returns to green.
- [x] Tuner clears its preview key on unload; the game then reports source `monsters.json` again.
- [x] `node --check` passes; the load-time suite is green on multiple seeds.
- [ ] Multiplayer tune-mismatch refusal observed live (needs two clients — developer test).

## Related Files / Modules
| File | Role |
|------|------|
| D:\Work\vibe\CCL8\chicken-heist.html | `T()` loader, `tuneHash()`, join-gate tier, `CCL8_VERDICT`, badge, self-check 25. |
| D:\Work\vibe\CCL8\monsters.json | The 87 settable values. Generated from the game, never hand-typed. |
| D:\Work\vibe\CCL8\dev\tuner.html | The tool. Edits only the JSON; never touches the game HTML. |
| D:\Work\vibe\CCL8\CLAUDE.md | Reversal record + the tuning contract. |

## Must-Preserve
- Single-file game, vanilla JS + Three.js r128, **no build tools**; the game must still run with no JSON present.
- Validation single-source: no predicate may exist in two places. The tuner must never compute a pass/fail itself.
- Determinism: `MAP_SEED` identity, `LAYOUT_HASH`, the PRICE substream, and the now four-tier join gate. Tuning must never change a seed's generated map — verified: no tunable feeds `genLayout`.
- Snapshot tuples append-only; relay transport-only.
- 즉사 금지 and the v0.22 valve contract A1–A12 hold at every reachable tuning value — that is precisely what the tool enforces before letting you save.
- Version bump in three places on every ship; `bestKey()` namespaces records by `PROTO_V`, so tuned runs cannot pollute stock records.

## Existing Integration Contract
- `hi` handshake gains `tune`; tiers stay ordered version → seed → hash → tune, all before activation so the lobby never flickers.
- `TUNE_USED` is the canonical tunable set — the hash, the verdict payload and the tuner's key list all derive from it, so adding a knob is one `T()` wrap and nothing else.
- Open follow-ups: whether the frozen 11 (especially `SIGHT_IN`, which also drives `CHOKE_M = round(SIGHT_IN/3)` and therefore the threat-placement predicate) get unlocked in a later round; and whether a tuned config must carry a hand-written rationale before shipping, since a tuned value can falsify the comment sitting next to it.

## Execution Notes
- Recommended model: Claude Fable 5 for the load-order/valve/handshake work; Sonnet acceptable for the tuner's UI scaffolding.
- This document cannot enforce the model — the executing session's `/model` setting decides. If the session model is below the recommendation, surface it to the user and confirm before proceeding.
