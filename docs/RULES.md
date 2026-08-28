# Golden Rules (never violate)

These rules are the core of the system contract. Keep them and you have a secure, fair,
payout-ready game — automatically.

1. **The API key (`SOLCORE_API_KEY`) never leaves the server.**
   All Sol-Core calls go through the route handlers under `app/api/*`. No `NEXT_PUBLIC_` prefix for
   the key or any secret. The browser only calls your own `/api/*` routes.

2. **The game result ALWAYS comes from Sol-Core.** This repo never rolls its own dice, never
   computes payouts, never caches results. The client only shows what the server returns.

3. **Money is lamport-strings/`bigint`** (1 SOL = 1,000,000,000). Never use `number` for amounts —
   use the helpers in `lib/lamports.ts`.

4. **Every `API-xxx` error is handled** — and the texts come from the SERVER, not from a list in
   this repo. `lib/errors.ts` fetches `GET /api/error-catalog` on start and overlays the built-in
   snapshot (`lib/error-catalog.generated.ts`, regenerate with `npm run sync-error-catalog`). Never
   show a raw code to a player, and never add a second code→text table of your own: a copy baked
   into a build can never stay current. On 2026-08-28 no two of the nine listed games showed the
   same text for the same code, and none of them knew the whole crash block (API-820…827).
   `action: 'deposit'` (e.g. `API-305`) opens the deposit flow.

5. **Dev-mock detection is mandatory.** `GET /health` returns `{ status: "ok" }` plus `devMock` only
   when it is `true` (missing ⇒ `false`). When it's `true`, the money UI (balance/deposit/withdraw)
   hides itself automatically. `/health` carries no `network` — that field is on the admin-only
   `GET /health/full`; the game's network comes from `NEXT_PUBLIC_SOLANA_NETWORK`.

6. **Make provably-fair visible — with a working link.** Seed hash before the round, and after it
   a DIRECT link into the Sol-Core Scanner for EVERY mechanic (single, session, tournament, live,
   crash, PvP). Always build it with `components/VerifyLink.tsx` (`<VerifyLink>` / `verifyHref`),
   which points at `<verifierUrl>/verify/<id>` — the page that recomputes the round in the
   player's own browser. Never link to `/api/.../verify/...`: that is raw JSON, a wall of braces
   instead of a proof. On 2026-08-28 seven of the nine listed games linked exactly there, and two
   mechanics had no link at all.

7. **Mirror session rules.** Bust ends immediately; auto-cashout and the 15-minute timeout are
   server-side — the UI must reflect state correctly and resume after reload via `GET /session/:id`.

8. **Never play with the creator wallet** (self-bet is blocked, `API-303`).

9. **Deposit and withdraw belong IN the game, in every mechanic.** The internal balance is one
   account per wallet and works across all games on the platform — whoever deposits here can play
   everywhere and withdraw everywhere. The money UI stays reachable (`BalanceBar` or your own
   wallet view); `/api/rpc` must exist, otherwise every deposit on a creator domain fails with 403
   (the public RPC rejects browsers, a key would be domain-locked). Withdrawing must never be
   harder than depositing.

10. **Show the maximum bet, quietly but always.** The allowed bet is the MINIMUM of the game,
    level, solvency, single- and daily-payout caps, and the tightest of them moves during
    operation (measured 2026-08-28: game and level cap 50 SOL each, actually allowed 0.0365 SOL).
    Use `BetLimitHint` next to the balance and `MaxBetPick` next to every bet field — both read the
    same source, so they cannot disagree. Without that number a player types blind and gets a
    rejection with no visible reason.

11. **Every money call carries a player token.** The API key only identifies the game — the player
   proves who they are with a wallet signature (`POST /api/game/authorize`, token valid 15 min,
   bound to wallet + game). In the browser always use `usePlayerAuth().moneyFetch(…)`, never a raw
   `fetch` to a money route; the server routes forward the token as `Authorization: Bearer`.
   On mainnet the backend runs with `PLAYER_AUTH_MODE=enforce` and rejects untokenized money
   calls with `API-402`. See API-REFERENCE.md → "Player authorization".
   The demo layer (`/api/demo/*`) is the one exception — it moves no money and needs no token.

## Off-limits files (they work — don't rebuild them)

`app/api/*` · `lib/solcore.ts` · `lib/config.ts` · `lib/lamports.ts` · `lib/errors.ts` ·
`lib/error-catalog.generated.ts` · `lib/bet-limits.tsx` · `components/VerifyLink.tsx` ·
`components/BetLimitHint.tsx` ·
`lib/engines.ts` · `lib/player-program.ts` · `lib/player-auth.ts` · `lib/crash-math.ts` ·
`components/Providers.tsx`

They carry the `// ⚠ Nicht ändern — Systemvertrag` (do-not-edit / system-contract) marker.

## Prove it before you commit

`npm run check` runs two things. `scripts/check-contract.mjs` reads your own source and verifies
the four promises above are still wired: deposit/withdraw reachable (incl. `/api/rpc`), error texts
from the server catalog, maximum bet visible at every bet field, and a Scanner link in every
mechanic. `scripts/check.mjs` then talks to the configured backend.

The contract check exists because none of this fails loudly. A re-skin that drops the max-bet line
or repoints a verify link leaves a game that still runs, still pays out, and is quietly worse.
