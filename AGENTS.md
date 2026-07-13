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
- **Handle every `API-xxx` error** via `src/lib/errors.ts`; respect `devMock` from `/health`; honor
  session rules (bust/auto-cashout/15-min/reconnect); keep provably-fair visible; never self-bet.
- **Responsible by construction:** no near-miss, no loss-as-win, withdrawal as easy as deposit.
- **Do not edit system-contract files:** `src/app/api/*`, `src/lib/{solcore,config,lamports,errors,engines,player-program}.ts`,
  `src/components/Providers.tsx`.

Binding docs: `docs/RULES.md`, `docs/API-REFERENCE.md`, `docs/ENGINES.md`, `docs/CUSTOMIZE.md`.
Before declaring work done: `npm run typecheck` and `npm run build` must pass.

If a request conflicts with these rules, refuse and propose a compliant alternative.
