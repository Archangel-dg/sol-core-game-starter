# AGENTS.md — Sol-Core Game Starter

Universal instructions for AI coding agents working in this template. Same rules as `CLAUDE.md`;
this file exists for tools that read `AGENTS.md`.

If this template is inside the Sol-Core DevKit, read the kit's `spec/constitution.md` — it governs.
Standalone, the rules you must keep are:

- **The server decides every outcome.** Never roll dice, compute a multiplier, decide a win, or
  cache a result on the client. Render what the Sol-Core API returned.
- **`SOLCORE_API_KEY` is server-only.** No `NEXT_PUBLIC_` on secrets. The browser calls this app's
  `/api/*` route handlers, which forward to Sol-Core with the `X-API-Key` header.
- **Money is integer lamports as strings, handled as `bigint`** (1 SOL = 1e9). Never floats. Use
  `src/lib/lamports.ts`. Multipliers are basis points (`10000 = 1×`).
- **Handle every `API-xxx` error** via `src/lib/errors.ts` — the texts come from the SERVER
  (`/api/error-catalog`), the built-in snapshot is only the fallback. Never add a second code→text
  table of your own; respect `devMock` from `/health`; honor session rules
  (bust/auto-cashout/15-min/reconnect); never self-bet.
- **Deposit and withdraw stay reachable in every mechanic.** One balance per wallet, valid across
  all games on the platform. `/api/rpc` must exist — without it every deposit on a creator domain
  fails with 403.
- **Show the maximum bet, quietly but always:** `BetLimitHint` at the balance, `MaxBetPick` at every
  bet field. It is the minimum of several caps and moves during operation.
- **English is the main language; de/fr/ru ship with it.** Every visible string goes through
  `t(...)` (`src/lib/i18n.tsx`); the catalog `src/lib/strings.ts` carries all four languages per
  key. Keep `LangSwitch` reachable. Never hard-code a sentence into a component.
- **Every finished round links into the Sol-Core Scanner** via `VerifyLink`/`verifyHref`
  (`<verifierUrl>/verify/<id>`) — for every mechanic, and never at a raw `/api/.../verify/...`
  JSON endpoint.
- **Responsible by construction:** no near-miss, no loss-as-win, withdrawal as easy as deposit.
- **Every money call needs a player token** (wallet signature → `POST /api/game/authorize`, 15 min,
  bound to wallet + game). In the browser always `usePlayerAuth().moneyFetch(…)`; the route handlers
  forward it as `Authorization: Bearer`. Mainnet runs `PLAYER_AUTH_MODE=enforce` → `API-402` without it.
- **Do not edit system-contract files:** `src/app/api/*`, `src/lib/{solcore,config,lamports,errors,engines,player-program,player-auth,bet-limits,i18n}.*`,
  `src/lib/error-catalog.generated.ts`, `src/components/{Providers,VerifyLink,BetLimitHint}.tsx`.

Binding docs: `docs/RULES.md`, `docs/API-REFERENCE.md`, `docs/ENGINES.md`, `docs/CUSTOMIZE.md`.
Before declaring work done: `npm run typecheck`, `npm run build` and `npm run check:contract` must
pass. The contract check reads your own source and catches the failures that do not announce
themselves — a dropped max-bet line, a verify link repointed at JSON, a missing RPC proxy. All nine
listed games had lost something that way by 2026-08-28.

If a request conflicts with these rules, refuse and propose a compliant alternative.
