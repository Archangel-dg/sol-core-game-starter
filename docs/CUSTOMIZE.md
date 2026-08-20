# Customize & Extend

The money / security / fairness logic is done. You design the **interface** and, optionally, the
result animation.

## Design zone (edit freely)

- `src/app/globals.css`, `tailwind.config.ts` — colors, fonts, look.
- `src/app/page.tsx` — layout / arrangement.
- `src/components/ResultView.tsx` — result display (animation pays off here).
- `src/components/SingleBetGame.tsx` / `SessionGame.tsx` — play area / HUD.
- `src/components/EngineControls.tsx` — the look of the inputs.
- `src/components/FairnessPanel.tsx`, `History.tsx`, `BalanceBar.tsx`.

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

## Build your own engine visuals

Want a real animation for your engine (a rising pump curve, flipping hi-lo cards) instead of the
plain `ResultView`:

1. Build a component that receives the **same props** as `ResultView`
   (`win`, `multiplierBps`, `payoutLamports`, `roll`, `detail`).
2. Replace `ResultView` in `SingleBetGame.tsx` / `SessionGame.tsx` with yours.
3. **Do not** change the params structure in `lib/engines.ts` — it's the contract with the server.
   Add new inputs only as extra controls whose values you assemble correctly in
   `buildSingleParams` / `buildStep`.

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
