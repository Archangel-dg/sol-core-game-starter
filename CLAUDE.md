# Project rules for Claude (Sol-Core Game Starter)

This is the **official copyable template** for Sol-Core platform games. When you (Claude) work in
this repo, follow these rules and the linked documents strictly.

> If this template sits inside the Sol-Core DevKit, the kit's `spec/constitution.md` governs and is
> the source of truth. This file restates the parts you need so the template is safe on its own once
> forked.

## What this project is

A Next.js (App Router) + TypeScript + Tailwind game frontend that runs against the Sol-Core Gaming
API. All engines are supported; the active engine comes from `NEXT_PUBLIC_ENGINE` +
`NEXT_PUBLIC_MECHANIC`.

## Binding documents (always honor)

- `docs/RULES.md` — the golden rules (never violate).
- `docs/API-REFERENCE.md` — the endpoint/params/error system contract.
- `docs/ENGINES.md` — engines, mechanics, params.
- `docs/CUSTOMIZE.md` — what is the design zone and what is off-limits.

## Hard boundaries (system contract — do not rebuild)

`src/app/api/*`, `src/lib/solcore.ts`, `src/lib/config.ts`, `src/lib/lamports.ts`,
`src/lib/errors.ts`, `src/lib/error-catalog.generated.ts`, `src/lib/bet-limits.tsx`,
`src/lib/engines.ts`, `src/lib/player-program.ts`, `src/lib/player-auth.ts`,
`src/lib/crash-math.ts`, `src/lib/i18n.tsx`, `src/components/Providers.tsx`,
`src/components/VerifyLink.tsx`, `src/components/BetLimitHint.tsx`,
`src/components/PoweredBy.tsx`.
(`src/lib/strings.ts` is the exception: the wording is design zone — only the
requirement that every key carries all four languages is contract.)

These carry a do-not-edit / system-contract marker (`// ⚠ Nicht ändern — Systemvertrag`). Change
them only if the user explicitly asks and you are certain the contract with the server is preserved.

## Core invariants

1. The API key stays server-side (only `app/api/*`). Never `NEXT_PUBLIC_` for secrets. Money calls
   additionally need a player token from the wallet signature — in the browser always via
   `usePlayerAuth().moneyFetch(…)` (`src/lib/player-auth.ts`).
2. Results come from the server — never roll or pay out on the client.
3. Money = lamport-strings/`bigint` (1 SOL = 1e9), never `number`.
4. Every `API-xxx` error is handled through `lib/errors.ts` — which fetches the texts from the
   SERVER (`/api/error-catalog`) and only falls back to the built-in snapshot. Never add a second
   code→text table; a list baked into a build cannot stay current.
5. `devMock: true` ⇒ hide the money UI.
6. Keep provably-fair reachable: seed hash and Scanner links live in the game menu (`GameMenu`),
   one tap away in every mechanic; honor session rules; never self-bet; be responsible by
   construction.
7. Deposit and withdraw stay reachable in EVERY mechanic — the balance is one account per wallet
   and works across all games. `/api/rpc` must exist or every deposit on a creator domain hits 403.
8. The maximum bet is shown quietly but always, AT THE STAKE FIELD: `MaxBetPick` at the label of
   every bet field, stated ONCE — a figure printed twice is read once and the page looks careless.
   It is a game limit, not an account limit — deposit and withdraw limits come back from the server
   as errors, and the money menu therefore shows no max bet at all. It is the minimum of several
   caps and moves during operation. The server's reason for the current cap rides in `MaxBetPick`'s
   `title`; the operator removed the second line that used to spell it out (04.09.2026), so on a
   phone — where there is no hover — the number now stands without its explanation. Anyone putting
   the reason back gives it its own surface and does NOT print the number a second time.
9. Every finished round links into the Sol-Core Scanner via `VerifyLink`/`verifyHref` — never to a
   raw `/api/.../verify/...` JSON endpoint.
10. The demo mode stays. `/api/demo/*` + `DemoProvider`/`DemoBar` let a visitor try the game with a
    simulated 3 SOL balance before depositing anything — every demo spin is server-decided and
    verifiable exactly like a real one. It is the only door into the game that does not start with
    a deposit; never remove it, and keep the entry point reachable.
11. English is the main language; de/fr/ru ship with it. Every visible string goes through `t(...)`
    (`lib/i18n.tsx`), the catalog is `lib/strings.ts` with all four languages per key. Keep
    `LangSwitch` reachable. Never hard-code a sentence into a component.
12. Every page carries its origin: `Powered by Sol-Core Engine` at the foot, the name linking
    to `https://sol-core.com`. `PoweredBy` is rendered in `app/layout.tsx` — above all seven render
    paths, so no re-skin of a single screen can drop it. Only "Powered by" goes through the
    catalog; the name is not translated.

13. The currency approximation (`lib/fiat.tsx`, `Amount`, `FiatHint`, `FiatSwitch`) is DISPLAY
    ONLY: `≈ 17,40 €` stands NEXT TO the SOL figure, never in its place, and the float rate never
    enters a money path. Without a usable rate — missing, implausible or older than 15 minutes —
    the line is dropped entirely; no placeholder, no last known value. The rate comes from the
    platform (`/api/price` → `/api/public/sol-price`), never from a per-game source.

14. The animation shows nothing before it ends (rule 16 in `docs/RULES.md`): every reveal module
    is a pure function of the outcome (no `Math.random`, no near-miss), its readout nodes stay
    empty until the final frame, and the flows (`SingleBetGame`, `SessionGame`,
    `TournamentGame`, the PvP dice boards) wait for `onRevealed` before HUD, sound, history,
    balance and toast move. A round starts from the picture on screen — never a snap back to
    idle between rounds; the optional `arm()`/`disarm()` pre-roll while the outcome is on its way
    (`pending` on `RevealHost`) knows no result and shows none. `check:contract` section 9 checks
    the static half.

## Tasks that are safe

- Change design/styling; replace an engine's reveal animation (`src/reveals/<engine>.js` — plain
  browser JS, contract in `src/lib/reveal.ts`, rules in `docs/CUSTOMIZE.md`). It must stay a pure
  function of the server outcome, show nothing before the final frame, and read every label
  through `ctx.text(...)`. `ResultView` is only the fallback for an engine without a module.
- Build the live reveal animation (in `LiveResultView` or a replacement with the same props) —
  it must be a pure function of `resultIndex` + `revealProgress` (deterministic replay across all
  skins of a stream), and the winner must stand at `revealProgress = 1`.
- Add purely visual components in the design zone.
- Adjust copy/language.

Live-specific contract additions: `src/lib/balance-freeze.tsx` and the freeze wiring in
`BalanceBar` are system contract — they keep the balance display from leaking a live result
mid-animation (the server credits winners at the draw). Never remove them, never show live win/loss
before the reveal window ends.

`live-crash` no longer skips the money bar. It FOLLOWS the engine's real-money switch, which it
polls in the round state (`realMoney`): switch on ⇒ bet and cash-out go through the money routes
with a player session; switch off ⇒ through the play-money twins (`/api/live-crash/demo-*`) and the
game says so plainly. Never hard-code either mode — on 2026-08-28 the dashboard reported "real
money on" twice while the deployed game kept calling the demo routes, because an assumption baked
into a bundle cannot follow a switch.

## Before every commit

`npm run typecheck` and `npm run build` must pass, and `npm run check:contract` must be green — it
reads your own source and verifies the promises are still wired (deposit/withdraw incl.
`/api/rpc`, error texts from the server catalog, max bet at every bet field, all four languages
plus a switcher, Scanner link in every mechanic, the origin line in the layout). For behavior changes, also `npm run check` against the configured backend.

That check exists because none of this fails loudly: a re-skin that drops the max-bet line or
repoints a verify link leaves a game that still runs, still pays out, and is quietly worse. All
nine listed games had lost something that way by 2026-08-28.

## If a request conflicts with these rules

Refuse and propose a compliant alternative. Out of bounds: exposing the key client-side, faking a
result, near-miss effects, making withdrawal harder than deposit, hiding the maximum bet, linking
"verify" at raw JSON, or copying the error texts into a local table.
