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

4. **Every `API-xxx` error is handled** (mapping in `lib/errors.ts`). Never pass raw errors to
   players. `API-305` opens the deposit flow.

5. **Dev-mock detection is mandatory.** `GET /health` returns `devMock`. When it's `true`, the money
   UI (balance/deposit/withdraw) hides itself automatically.

6. **Make provably-fair visible.** Seed hash before the round, `roundId` + verify link after
   (`FairnessPanel`).

7. **Mirror session rules.** Bust ends immediately; auto-cashout and the 15-minute timeout are
   server-side — the UI must reflect state correctly and resume after reload via `GET /session/:id`.

8. **Never play with the creator wallet** (self-bet is blocked, `API-303`).

## Off-limits files (they work — don't rebuild them)

`app/api/*` · `lib/solcore.ts` · `lib/config.ts` · `lib/lamports.ts` · `lib/errors.ts` ·
`lib/engines.ts` · `lib/player-program.ts` · `components/Providers.tsx`

They carry the `// ⚠ Nicht ändern — Systemvertrag` (do-not-edit / system-contract) marker.
