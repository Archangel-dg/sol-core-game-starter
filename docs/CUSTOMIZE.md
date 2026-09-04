# Customize & Extend

The money / security / fairness logic is done. You design the **interface** and, optionally, the
result animation.

## Design zone (edit freely)

- `src/app/globals.css`, `tailwind.config.ts` — colors, fonts, look.
- `src/app/page.tsx` — layout / arrangement.
- `src/reveals/<engine>.js` — the reveal animation of each engine (see below); `src/components/ResultView.tsx` —
  the plain fallback for an engine without a module.
- `src/components/SingleBetGame.tsx` / `SessionGame.tsx` — play area / HUD.
- `src/components/EngineControls.tsx` — the look of the inputs.
- `src/components/FairnessPanel.tsx`, `History.tsx`, `BalanceBar.tsx`, `HeaderBar.tsx`, `GameMenu.tsx`,
  `DemoBar.tsx`, `Popover.tsx`, and the sound set (`src/lib/sounds.ts`, `public/sounds/*.wav`,
  regenerate with `npm run generate-sounds`).

- `src/lib/fiat.tsx`, `src/components/Amount.tsx`, `FiatHint.tsx`, `FiatSwitch.tsx` — the
  currency approximation next to a SOL amount. It sits at every money INPUT (beside the
  label), at the balance, at the result payout and in the win notification — and
  deliberately NOT in the round history, the live list of other players' bets, the
  session HUD or the slot win line: those compare numbers with each other rather than
  asking what one is worth, and a second currency per row reads as clutter. Restyle it, move it, drop it from a screen. Two
  things are not yours to change: it never REPLACES the SOL figure, and without a usable rate it
  renders nothing at all (see rule 15 in `docs/RULES.md`).

None of this touches the money flow — reshape it freely.

## Live reveal animations (`LiveResultView.tsx`)

The live design zone. Build the race/reveal of your theme (horses, cars, rockets …) on top of the
same props contract: `{ outcomes, resultIndex, phase, revealProgress, myBets }`.

Binding rules:

1. The animation must be a **pure function** of `resultIndex` + `revealProgress` (+ outcomes) — no
   `Math.random()`, no own timers deciding positions. Every skin of the stream must
   deterministically show the same winner.
2. The winner must stand at `revealProgress = 1` at the latest; end your animation no later.
3. Results come only from the props (the server) — never derive or guess them client-side.
4. Don't remove the balance-freeze wiring (`lib/balance-freeze.tsx` + `BalanceBar`): it keeps the
   balance display from spoiling the result mid-animation. One deliberate exception, already wired
   in `app/page.tsx`: `live-crash` plays on **play money** and shows a play-money note in place of
   `BalanceBar`, because a real-money deposit could never be spent in that game. The freeze wiring
   itself stays — only that one engine skips the bar.

## Reveal animations (`src/reveals/<engine>.js`)

Every engine that plays a round has a reveal module: plain browser JavaScript, no framework,
drawn into the square play field. `RevealHost` mounts it, hands it the outcome and the
translations, and tells the flow when the final frame stands. The flows (`SingleBetGame`,
`SessionGame`, `TournamentGame`) WAIT for that moment: the multiplier in the HUD, the sound, the
round history, the balance and the win toast all follow `onRevealed` — nothing that gives the
result away moves before the animation has ended.

Want the coin to be a card, the plinko board to be a rocket track? Replace the module file. The
contract is in `src/lib/reveal.ts` (`RevealModule`) and it is small: `mount(root, ctx)` returns
`{ play(outcome, { reducedMotion, from }), reset(), destroy() }`. `ctx.engineConfig` carries the
game's real dimensions (rows, grid size, pockets, ladder …) — draw the idle board from it; the
outcome carries the round's own details. `ctx.text(key)` reads the catalog (four languages),
`ctx.fmt` formats money exactly like the rest of the interface. Fixtures with the exact server
shapes sit in `src/reveals/samples/`.

Binding rules (rule 16 in `docs/RULES.md`):

1. **Pure function of the outcome.** No `Math.random()`. The same round looks the same every
   time it is played.
2. **Nothing recognisable early.** The readout nodes stay EMPTY until the final frame — not
   hidden, empty. DevTools, `innerText` and a screen reader learn nothing before the player.
3. **No near-miss.** No slowing down, no wobble, no hesitation next to the winning field. A loss
   is shown as a loss, at the same pace.
4. **The winner stands at the end** — `play()` resolves only when the final frame stands, and it
   stays.
5. **Results only from the outcome.** `win`, `multiplierBps`, `payoutLamports` are read, never
   recomputed from a roll.
6. **No hard-coded text.** Every label goes through `ctx.text(...)`; the keys the module reads
   are listed in its `strings` array so the contract check can find them.

Session engines play their transcript STEP BY STEP: `play(o, { from })` says how many steps
already stand on the board; the module sets those instantly and animates only the new step.
`src/lib/reveal-session.ts` builds the transcript from the server's session view. Live engines
(`live-odds`, `live-crash`, `live-drift`) and `pvp-coinflip` are not modules: their animation is
a function of a server-side reveal window (`revealProgress`) and lives in `LiveResultView`,
`CrashCurveView`, `DriftTrackView` and `PvpGame`. The PvP dice boards keep their interactive
layout and use `lib/dice-reveal.ts`: a new roll tumbles for a moment before points, Farkle or
bank appear.

`npm run check:contract` (section 9) verifies the static part — every registered engine has its
module, no module uses `Math.random`, no module fetches, every text key exists — and the flows
wait for `onRevealed`. The kit's `scripts/check-reveals.mjs` plays every module in a real Chromium
against its fixtures and reads the DOM mid-animation.

A player can switch the animations off in the game menu (rule 4 still holds: the final frame
appears at once, and everything else waits for it just the same).

## Ship one engine

The starter shows exactly the engine from `NEXT_PUBLIC_ENGINE`. For a portal of several games:
one deploy per game with its own `.env` (own key/game-id + engine). Each game stays lean and
independent.

## Keep building with Claude

See `CLAUDE.md` — you can start Claude in this repo and tell it, e.g.: "Build an animated rising
curve for the pump engine in `ResultView`, without violating the system contract." Claude then
knows the rules from the MD files.

## Change the accent color without code

Set `NEXT_PUBLIC_ACCENT_COLOR=#RRGGBB` in `.env` (or in Vercel → Settings →
Environment Variables). Invalid values fall back to Sol-green.
For more than one color: `tailwind.config.ts` + `globals.css` are the design zone.
