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

6. **Keep provably-fair reachable — with a working link.** The seed hash and the round links sit in
   the game menu (`GameMenu`), one tap away in every mechanic. Seed hash before the round, and after it
   a DIRECT link into the Sol-Core Scanner for EVERY mechanic (single, session, tournament, live,
   crash, PvP). Always build it with `components/VerifyLink.tsx` (`<VerifyLink>` / `verifyHref`),
   which points at `<verifierUrl>/en/verify/<id>` — the page that recomputes the round in the
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
    Use `MaxBetPick` at the label of every bet field, and state the figure ONCE. It is a game
    limit, not an account limit: deposit and withdraw limits come back from the server as errors,
    the money menu shows none. Without that number a player types blind and gets a rejection with
    no visible reason.

    The server also sends a sentence saying WHICH cap is binding right now. It rides in
    `MaxBetPick`'s `title`. A second line under the input used to spell it out; the operator had it
    removed on 04.09.2026 because it repeated the number. Be aware of what that costs: a `title` is
    a hover tooltip, and a phone has no hover, so a player who wonders why a game advertising
    50 SOL allows 2.76 has nowhere to look. If you bring the explanation back, give it its own
    surface — and do not print the number a second time.

11. **The demo mode stays.** `/api/demo/*` plus `DemoProvider`/`DemoBar` let a visitor play with a
    simulated 3 SOL balance before depositing anything — and every demo spin is decided by the
    server and verifiable exactly like a real one. It is the only way into the game that does not
    start with a deposit. Restyle it freely; never remove it, and keep the entry reachable.
    On 2026-08-29 it had already quietly gone missing from one of the two template copies — nobody
    would have noticed, because a game without it runs exactly the same. Just without a front door.

12. **English is the main language, and de/fr/ru ship with it.** Every visible
    string goes through `t(...)` from `lib/i18n.tsx`; the catalog lives in
    `lib/strings.ts` with all four languages per key, English always filled —
    everything falls back to it. Keep a way for the player to switch
    (`LangSwitch`); a catalog nobody can reach is decoration. The PvP surface
    and the server error texts follow the same language automatically, so one
    screen never mixes two. Never hard-code a sentence into a component: this
    template was German-only until 2026-08-29 (81 strings in 16 files), and it
    is forked worldwide.

13. **Every money call carries a player token.** The API key only identifies the game — the player
   proves who they are with a wallet signature (`POST /api/game/authorize`, token valid 15 min,
   bound to wallet + game). In the browser always use `usePlayerAuth().moneyFetch(…)`, never a raw
   `fetch` to a money route; the server routes forward the token as `Authorization: Bearer`.
   On mainnet the backend runs with `PLAYER_AUTH_MODE=enforce` and rejects untokenized money
   calls with `API-402`. See API-REFERENCE.md → "Player authorization".
   The demo layer (`/api/demo/*`) is the one exception — it moves no money and needs no token.

14. **Every page carries its origin.** At the foot of the page stands
    `Powered by Sol-Core Engine`, where the name links to <https://sol-core.com>.
    `components/PoweredBy.tsx` renders it, and it sits in `app/layout.tsx` — above all seven
    render paths (loading, engine mismatch, the normal game, four full-bleed PvP surfaces), each
    of which ends in its own `<main>`. A footer that lives inside a game component does not
    survive the first re-skin: that is exactly how the six older "Powered by Sol-Core" lines
    ended up pointing at the platform or the verifier instead of the engine. Restyle it — colour,
    size, spacing, position within the footer — but keep the sentence, keep the link target, and
    keep it on every page. Only "Powered by" is translated; "Sol-Core Engine" is a proper name.

15. **The currency approximation is DISPLAY ONLY.** Next to a SOL amount the game may show
    `≈ 17,40 €` / `≈ $18.90`. The SOL figure stays the number: the server settles in lamports, the
    Scanner shows SOL, the maximum bet is in SOL — replace the figure and a player can no longer
    reconcile a round with the verify page. The rate is a float and never touches a money path
    (rule 3); `lib/fiat.tsx` converts for the screen and returns a string. If the rate is missing,
    unusable or older than fifteen minutes, the line is DROPPED — no placeholder, no last known
    value. A stale number beside a payout is a promise nobody made. The rate comes from the
    platform (`/api/price` → Sol-Core `/api/public/sol-price`), not from each game: one request a
    minute for the whole platform instead of one per creator server, and two games can never show
    two different rates at the same moment.

## Off-limits files (they work — don't rebuild them)

`app/api/*` · `lib/solcore.ts` · `lib/config.ts` · `lib/lamports.ts` · `lib/errors.ts` ·
`lib/error-catalog.generated.ts` · `lib/bet-limits.tsx` · `lib/i18n.tsx` ·
`components/VerifyLink.tsx` · `components/BetLimitHint.tsx` · `components/PoweredBy.tsx` ·
`lib/engines.ts` · `lib/player-program.ts` · `lib/player-auth.ts` · `lib/crash-math.ts` ·
`components/Providers.tsx`

They carry the `// ⚠ Nicht ändern — Systemvertrag` (do-not-edit / system-contract) marker.

## Prove it before you commit

`npm run check` runs two things. `scripts/check-contract.mjs` reads your own source and verifies
the promises above are still wired: deposit/withdraw reachable (incl. `/api/rpc`), error texts
from the server catalog, maximum bet visible at every bet field, the demo mode reachable, all four
languages present with a switcher, and a Scanner link in every mechanic. `scripts/check.mjs` then talks to the configured backend.

The contract check exists because none of this fails loudly. A re-skin that drops the max-bet line
or repoints a verify link leaves a game that still runs, still pays out, and is quietly worse.
