# goal: chicken-heist-stamina-telegraph

## One-line Goal

v0.7: add a run-only stamina gauge (the round's ONE new system) and make the existing perception rules readable — eyes that open when you grab an egg, ?/! markers separating "heard" from "seen", decoy-throw teaching copy — plus mouse-sensitivity and volume settings.

## Background / Motivation

First friend playtest feedback (2026-08-11 KakaoTalk, relayed 08-12). Four items: jump key (already shipped in v0.6 — friend played an older build), stamina, "what makes chickens notice me?", "what is throwing for?". Plus settings (sensitivity, volume).

Key diagnosis: **half of what the friend proposed already exists and neither player could tell.** "Eyes appear the moment you hold an egg" IS the current rule (empty-handed players are never sight-detected); per-tray guardian chickens exist (v0.6 C4); throw-as-decoy exists. Even the developer misread sound-investigation approaches as sight detection ("알이랑 상관없이 들키더라고" — false). Therefore items 3 and 4 are telegraphing fixes, not mechanics changes. Stamina is the only genuinely new system: with SPD_RUN 218 > CHK_CHASE 124, holding Shift trivializes every chase — stamina makes chickens threatening without buffing a single chicken constant.

Developer settled (probing, 2026-08-12): stamina = run-only (jump free); telegraph = eye-flash + ?/! markers (sight-cone rejected: busier screen, spoils the not-knowing that makes corners scary). One-new-system principle is BACK in force this round; stamina takes the slot, the rest is repair.

## In-scope

- **Stamina (new system)**: gauge 1.0; sprint drains full→empty in `STAM_DRAIN_T=6` s; regen empty→full in `STAM_REGEN_T=8` s whenever not sprinting; at 0 → forced walk ("exhausted") until gauge ≥ `STAM_MIN_RESUME=0.25` (anti stutter-sprint); jump costs nothing; no other penalty. Exhaustion moment: puff sound + sweat-drop burst (comedy, not punishment). Thin bar above the throw-power bar, visible only when gauge < 1, red while exhausted.
  - Balance intent (checked against contracts): exhausted walk while carrying = 92.4 u/s < chase 124 → chickens finally catch careless carriers; exhausted empty-handed walk = 132 > 124 → never hard-locked, and the E-setdown→escape valve stays physically possible (no-instant-death preserved). Silent-walk contract untouched — forced walk IS a walk (aggro 0).
- **Eyes open on egg (telegraph)**: chickens get actual eyes (they had none — friend literally called them "눈이 없는 닭"). Closed slits when the player carries nothing; open + bright the moment any egg is carried (driven by the existing `carriesEgg()` predicate, so lit/dark semantics stay exactly the rule being taught). One-shot glint burst at every chicken's head the moment carried count goes 0→1.
- **?/! markers (telegraph)**: existing red "!" stays for alert/chase (seen). New amber "?" marker for invest and peck-approach (heard/curious) — teaches "닭이 온다 ≠ 들켰다", which is exactly the misread that confused both players.
- **Throw teaching**: copy change only — "던지기" → "미끼 던지기" in prompt/help/title keys. The ? markers on decoy-running chickens close the teaching loop; no mechanics change.
- **Settings**: pause-overlay panel with mouse-sensitivity slider (0.2–3.0×, default 1.0) and volume slider (0–100%, default 50%), persisted in localStorage (`ch_sens`, `ch_vol`); slider clicks must not dismiss the pause overlay; M-mute still wins over the volume slider.
- Version → v0.7 in all three places.

## Out-of-scope

- Sight cones on the floor (rejected this round — visual noise, spoils corner fear; revisit only if telegraphs fail the next playtest)
- Stamina costs for jump/punch/shove; hunger-style meters (banned list adjacency)
- New phase system (v0.6 blackout already is the phase shift; friend's guard-per-egg already exists)
- Any chicken aggro/sight/logic constant change — this round changes zero chicken-side numbers

## Acceptance Criteria

- [ ] `node --check` passes; validation suite still 13/13; zero console errors
- [ ] Sprint drains in ~6 s, forced walk at 0, resume at 25%, regen ~8 s; bar shows only when not full, red when exhausted
- [ ] Exhausted+carrying is catchable (92.4 < 124); exhausted empty-handed still outwalks chickens (132 > 124)
- [ ] Chicken eyes: slits when carrying nothing, open+bright while any egg is carried (hand/pocket/pulled-cart per existing predicate); glint burst fires exactly on carried 0→1
- [ ] "?" shows during invest and peck-approach; "!" unchanged for alert/chase; never both at once
- [ ] Prompt/help/title all say "미끼 던지기"
- [ ] Sensitivity and volume sliders work live, persist across reloads, and don't unpause when clicked; M-mute overrides volume
- [ ] Version bumped to v0.7 in all three places

## Related Files / Modules

| File | Role |
|------|------|
| D:\Work\vibe\CCL8\chicken-heist.html | All changes — stamina in movePlayer/HUD, eyes+? in makeChicken/render, settings in pause overlay |
| D:\Work\vibe\CCL8\docs\goal\chicken-heist-dark-surprise.md | v0.6 contracts preserved (carriesEgg predicate reused as the telegraph driver) |

## Must-Preserve

- Silent-walk contract (walk aggro 0 — including stamina-forced walk); all v0.4 lit-phase LOGIC constants; two-column VIS/LOGIC table (no new rows needed — stamina emits no sounds beyond existing walk/run steps)
- No-instant-death escape valves: exhausted state must never remove the setdown→shove→repick escape (verified by the 132>124 empty-handed margin)
- E/Q/F/Space semantics from v0.6; carriesEgg() dark/lit split (eyes visualize it, never alter it)
- One-new-system principle (restored): stamina is the slot; everything else here is repair/UX

## Execution Notes

- Recommended model: Claude Fable 5 (current session — meets recommendation) for the stamina/movement interaction (touches the escape-valve contract) — the rest is mechanical. Sonnet acceptable for sliders/copy/mesh work.
- This document cannot enforce the model — the executing session's `/model` setting decides. If below recommendation, surface and confirm.

## Fairness Constraints

- Stamina numbers are deterministic constants; no RNG added anywhere
- Telegraphs are visual-only — they must not change any detection radius or state transition

## Existing Integration Contract

- localStorage now carries two settings keys (`ch_sens`, `ch_vol`) — first use of localStorage in the prototype (v0.5's "unused" note superseded, recorded here)
- Pointer-lock flow unchanged; pause overlay gains a settings panel that swallows its own clicks

## Open Questions

(none — jump was v0.6, stamina shape and telegraph level settled by developer, settings scope trivial)
