# goal: chicken-heist-esc-menu

## One-line Goal
Replace focus-loss auto-pause with an explicit ESC menu (resume / pause / restart / quit): in multiplayer, only an explicit host "pause" click freezes everyone — losing pointer lock or window focus never does.

## Background / Motivation
Developer complaint (2026-08-18): "일시정지 규칙이 너무 빡세. 포커스 벗어났다고 일시정지는 누구 머리에서 나온 거냐."
Current rule (D13, `docs/goal/chicken-heist-multiplayer.md`): host pointer-lock loss OR tab-hidden = full-party stop. Since the browser releases pointer lock on any focus loss (alt-tab, clicking another monitor), the host glancing at a chat window freezes all four players. The client side already has the desired behavior (menu overlay, game keeps running) — this change extends that honesty to the host and adds explicit menu verbs.

## Probe Results (decided facts, not open questions)
- **"다시시작" is ambiguous** (this game's own overlays use "R — 다시 시작" to mean *restart*, but a pause menu's first item conventionally means *resume*). Resolved by covering both readings: first button 계속하기 (resume) + separate 처음부터 (restart). User's "이런식으로" grants layout latitude.
- **Scope of auto-pause removal**: multiplayer host only. Solo keeps "menu = paused" — it is the universal convention, harms no one, and the complaint is specifically the host case ("호스트가").
- **`document.hidden` keeps pausing the multi sim** — not policy but physics: `requestAnimationFrame` stops in hidden tabs, so the sim literally cannot run. Broadcasting that stop honestly ("호스트 자리 비움") is the surviving core of D13. Focus loss with the tab still visible (the actual complaint) keeps RAF running, so the sim now continues.
- **나가기 = `location.replace(location.pathname)`** (back to title, fresh seed). Host quit rides the existing `closed` → `hostLost()` path on clients ("호스트가 나갔다 — 방이 닫혔다"); client quit rides the existing peer-off slot release. No new net message.
- **Destructive buttons (처음부터·나가기) require a second click within 2.5s** — same philosophy as the R-hold guard (D14): no run evaporates from a mis-click.
- **일시정지 button is host-only in multi** (clients have no authority; solo doesn't need it since menu already pauses). Pause broadcast reuses the existing `pz`/`pw` snapshot fields — zero wire-format change.

## In-scope
- ESC menu buttons on the existing `#pauseOv` overlay: 계속하기 / 일시정지(⇄재개, multi host only) / 처음부터 (host+solo only) / 나가기.
- `simPaused()` for multi host: `userPaused || document.hidden` (pointer-lock loss removed).
- Menu text per role: host "메뉴 — 게임은 계속 돈다!" vs paused "일시정지 — 전원 멈췄다"; solo/client texts kept.
- Hide `#pauseOv` when phase leaves `play` (menu-open-while-running can now coexist with win/fail).
- Version bump v0.20.10 in all three places (title tag, title sub, PROTO_V).
- CLAUDE.md note recording the D13 amendment.

## Out-of-scope
- Any relay/server change (relay stays judgment-free).
- Client-side pause authority, vote-pause, or per-player pause.
- Keeping the sim running in hidden tabs (setInterval sim stepping) — rejected: background timers are throttled to ~1Hz, chickens would teleport.
- Solo "menu without pause" — rejected: hostile to solo players, solves nothing.

## Acceptance Criteria
- [ ] Multi host loses pointer lock (tab visible): sim keeps running, no client overlay appears.
- [ ] Multi host clicks 일시정지: all clients freeze with "호스트 일시정지 — 잠깐 멈췄다"; 재개 (or background click / 계속하기) resumes everyone.
- [ ] Multi host hides the tab: clients see "호스트 자리 비움 — 잠깐 멈췄다" (existing behavior preserved).
- [ ] Solo ESC: sim paused (unchanged), menu shows 계속하기/처음부터/나가기 (no 일시정지 button).
- [ ] Client menu: 계속하기/나가기 only; game visibly continues behind it.
- [ ] 처음부터/나가기 execute only on a second click within 2.5s.
- [ ] `node --check` passes on the extracted script; load-time self-check suite stays green.

## Related Files / Modules
| File | Role |
|------|------|
| D:\Work\vibe\CCL8\chicken-heist.html | The whole game (single-file). All edits here: `#pauseOv` DOM/CSS, `simPaused()`, `pointerlockchange`, per-frame client overlay block, 1s pz interval, version strings. |
| D:\Work\vibe\CCL8\CLAUDE.md | Guardrail record — D13 amendment note. |

## Must-Preserve
- Relay stays 중계 전용 — no game judgment moves to `server.js`.
- `pz`/`pw` snapshot fields keep their wire format (append-only convention untouched).
- Client lock-loss behavior (menu overlay, game continues) — unchanged, now the universal rule.
- Solo semantics of `paused()`/`simPaused()` (`!locked`) — unchanged.
- D14: restart authority is host-only; client menu never shows 처음부터.
- `document.hidden` → honest full-party stop with "호스트 자리 비움" (D13's surviving core).
- Settings panel (`#setPanel`) inside the pause overlay keeps working; its clicks must not resume/relock.

## Execution Notes
- Recommended model: Claude Fable 5 (top-tier, 2026-07+) for the `simPaused()` semantics change and the overlay state machine (role × locked × userPaused × NET.pause matrix is judgment-heavy). Sonnet acceptable for the CSS/button boilerplate.
- This document cannot enforce the model — the executing session's `/model` setting decides. If the session model is below the recommendation, surface it to the user and confirm before proceeding.
