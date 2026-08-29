# Sol-Core Gaming API — System Contract

Base URL: `SOLCORE_API_URL` (canonical: `https://api.sol-core.com`).
Auth for game endpoints: header `X-API-Key: sk_live_…` (set by the server proxy in `app/api/*` —
**never in the browser**). All money values: **lamport-strings** (1 SOL = 1e9). Error shape:
`{ "error": { "code": "API-xxx", "message": "…", "details"?: … } }`.

## Health (public)

`GET /health` → `{ status: "ok", devMock? }` — `devMock` is only present when `true` (missing ⇒
`false`); no other operational details are exposed publicly.

There is **no `network` in `/health`.** It lives on `GET /health/full`, which is admin-only (same
auth as `/api/admin/*`) and therefore not reachable from a game. Take the network from your own env
(`NEXT_PUBLIC_SOLANA_NETWORK`) — that is what `GET /api/meta` returns.
`devMock: true` ⇒ no balances, bets don't check funds → hide the money UI.

## Game config (API key)

`GET /api/game/config` → `{ gameId, mode, engineConfig }`

`engineConfig` contains the **resolved engine dimensions** of the registered game — the UI must
render exactly this geometry, never guessed values:

| Mode | `engineConfig` |
|---|---|
| `towers` | `{ levels: 4–12, columns: 2–4 }` |
| `mines` | `{ gridSize, mineCount }` |
| `pump` | `{ growthBps, maxPumps }` |
| `hilo` | `{ maxSteps: 20 }` |
| others | `{}` |

Game config is immutable after creation → cache the response indefinitely. The starter exposes it
to the client via `GET /api/meta` (`engineConfig`, `serverMode`, `warning: "engine_mismatch"` when
`NEXT_PUBLIC_ENGINE` differs from the registration).

## Player authorization (required on every money route)

The API key identifies the **game**, not the player — and it is shipped to every browser that loads
the game. Without a second proof, anyone holding it could bet in the name of a foreign wallet.
So the player signs once with their wallet and receives a short-lived token (15 min) bound to
`(wallet, gameId)`.

`POST /api/game/authorize` (X-API-Key)
```json
{ "wallet": "<base58>", "message": "sol-core:player-auth:v1:<gameId>:<wallet>:<unixSeconds>",
  "signature": "<base58>" }
```
- The `gameId` is **not** in the body — the server takes it from the API-key context.
- `unixSeconds` must be within ±5 min of server time; one signature issues exactly one token
  (replay-protected); rate limit 30/min.
- Response: `{ "token": "…", "expiresAt": 1720000900000 }` — `expiresAt` is in **milliseconds**.
- Errors: `API-103` (401) — message/wallet/gameId mismatch, expired timestamp, bad or reused
  signature.

Send the token as `Authorization: Bearer <token>` on `/bet`, `/withdraw`, `/session/start`,
`/session/:id/step`, `/session/:id/cashout`, `/tournament/enter`, `/tournament/run/:id/step`,
`/tournament/run/:id/stop` and `/live/bet`. A token that IS sent is always validated strictly;
a *missing* token is only tolerated while the server runs with `PLAYER_AUTH_MODE=warn`
(devnet) — on mainnet `enforce` is mandatory and enforced by a boot guard. `API-402` (401) means
missing/invalid/mismatched token → `lib/errors.ts` maps it to `action: 'lock'`.

**How the starter implements it** (`lib/player-auth.ts` + `app/api/authorize/route.ts`):

```
Browser                          your Next.js server            Sol-Core API
  GET  /api/authorize?wallet=…  ──▶ builds canonical message
                                ◀── { message }
  signMessage(message)  (wallet popup)
  POST /api/authorize {wallet,message,signature}
                                ──▶ + X-API-Key ──▶ POST /api/game/authorize
                                ◀── { token, expiresAt } ◀──
  POST /api/play  + Authorization: Bearer <token>
                                ──▶ + X-API-Key ──▶ POST /api/game/bet
```

The API key never leaves the server; the token lives in browser memory only and is renewed
automatically (also on `API-402`, once). Use `usePlayerAuth().moneyFetch(path, body)` for **every**
money call — never a plain `fetch`.

The demo layer (`app/api/demo/*` → `/api/game/demo/*`) is deliberately exempt: it has no wallet that
could sign, moves no money, and is therefore not token-gated. `SingleBetGame`/`SessionGame` switch
on `usePlayer().demo` and use `moneyFetch` only on the real-money path.

## Single bet

`POST /api/game/bet` (X-API-Key + `Authorization: Bearer <player token>`)
```json
{ "gameId": "<uuid>", "playerWallet": "<base58>", "betLamports": "100000000",
  "params": { …per engine, see ENGINES.md… }, "clientSeed": "optional" }
```
Response:
```json
{ "roundId": "…",
  "result": { "win": true, "roll": 55.2, "multiplierBps": 19400,
              "payoutLamports": "194000000", "details": { … } },
  "proof": { "serverSeedHash": "…", "clientSeed": "…", "nonce": 5 },
  "fees": { "platformFeeLamports": "…", "treasuryLamports": "…",
            "privateLamports": "…", "creatorFeeLamports": "…",
            "totalChargeLamports": "…" } }
```
`totalChargeLamports` = bet + all fees (what the player pays). `multiplierBps`: `10000 = 1×`.

## Session layer (mines, hilo, towers, pump)

Start a round → steps → cash out any time (after ≥1 step). The whole outcome is committed at start
via `serverSeedHash`.

- `POST /api/game/session/start` — `{ gameId, playerWallet, betLamports, clientSeed?, protocol? }`
  - **Pay-per-spin engines (`spin-tower-pro`) must send `protocol: "spin-tower/1"`.** Without it the
    server refuses with `API-204 { reason: 'protocol_handshake_required' }` and no round opens —
    fail-closed on purpose: a client that thinks steps are free spends someone else's money. The
    template sends it from `SessionGame` whenever `engine.session.costPerStep` is set, and both
    `app/api/session/start` and `app/api/demo/session/start` forward it. It is a promise that the
    player was TOLD every spin costs — so keep the cost warning if you keep the handshake.
- `GET /api/game/session/:id` — current state (**reconnect after reload!**)
- `POST /api/game/session/:id/step` — body per engine (see ENGINES.md)
- `POST /api/game/session/:id/cashout`

Response (SessionView):
```json
{ "sessionId": "…", "gameId": "…", "mode": "towers",
  "status": "active"|"busted"|"cashed_out",
  "steps": 2, "multiplierBps": 21830, "potentialPayoutLamports": "218300000",
  "proof": { "serverSeedHash": "…", "clientSeed": "…", "nonce": 7 },
  "engine": { "mode": "towers", "config": { "levels": 8, "columns": 3 } },
  "progress": { … },
  "roundId"?: "…", "payoutLamports"?: "…", "serverSeed"?: "…",
  "reveal"?: { … }, "capped"?: true }
```
Rules the UI MUST reflect:
- **Bust** ends immediately (`status: "busted"`, `reveal` shows e.g. mines).
- **Auto-cashout** server-side on: all safe tiles cleared / top floor / max pumps / payout cap
  (`capped: true`).
- Hi-Lo: impossible guess → `API-204 impossible_guess`; the chain ends after 20 steps.
- **15 min inactivity** → the server settles automatically (≥1 step = auto-cashout, 0 steps = full
  refund). Warn about this in the UI.

## Tournament layer (gauntlet)

Pot-based highscore cycles: a fixed entry fee per run is debited at enter (fee-on-top like `/bet`)
and feeds the cycle pot; the run itself pays nothing. At cycle end the pot is paid 100% to the top
ranks (creator-configured split); the next cycle opens automatically with the creator's latest
settings.

- `GET /api/game/tournament/cycle` — current cycle: `{ cycleId, cycleNo, startsAt, endsAt,
  potLamports, entriesCount, playersCount, entryFeeLamports, totalChargeLamports,
  payoutSplitBps, maxAttemptsPerCycle, maxSteps }` (cached ~5 s)
- `GET /api/game/tournament/leaderboard?limit=50` — `{ leaderboard: [{ rank, wallet, bestScore,
  achievedAt, attempts }] }` (cached ~3 s — poll, don't hammer)
- `GET /api/game/tournament/me/:wallet` — `{ attempts, bestScore, rank, activeRunId }`
- `POST /api/game/tournament/enter` — `{ playerWallet, clientSeed? }` → `TournamentRunView`
- `GET /api/game/tournament/run/:id` — current run (**reconnect after reload!**)
- `POST /api/game/tournament/run/:id/step` — `{ risk: "safe"|"medium"|"risky" }`
- `POST /api/game/tournament/run/:id/stop` — banks the score
- `GET /api/game/tournament/history?limit=10` — settled cycles incl. payouts
- `GET /api/game/tournament/verify/:runId` — **public** provably-fair check (revealed seed +
  recomputed rolls vs. the run's history)

Response (TournamentRunView):
```json
{ "runId": "…", "gameId": "…", "mode": "gauntlet",
  "status": "active"|"busted"|"stopped"|"expired",
  "steps": 4, "maxSteps": 30, "score": 45,
  "history": [{ "step": 0, "risk": "safe", "roll": 12.3, "survived": true, "points": 10 }],
  "proof": { "serverSeedHash": "…", "clientSeed": "…", "nonce": 9 },
  "engine": { "mode": "gauntlet", "config": { "maxSteps": 30, "safeSurviveBps": 9000, … } },
  "cycle": { "cycleId": "…", "cycleNo": "3", "endsAt": "…", "potLamports": "…", "entriesCount": 12 },
  "serverSeed"?: "…", "bestScore"?: 60 }
```
Rules the UI MUST reflect:
- **A bust zeroes the run's score** (`status: "busted"`); banking (`stop`) is the real decision.
- Re-entries are allowed (each costs the entry fee, grows the pot); **best score per wallet** ranks.
- Entries/steps are rejected once `endsAt` has passed (`API-204 cycle_ended`); runs still active at
  cycle end are auto-banked with their current score.
- **15 min inactivity** → auto-bank (no refund — the entry fed the pot at purchase).
- The creator can't play their own tournament (`API-303`).

## Live layer (live-odds) — shared rounds on an operator stream

Every game ("skin") referencing the same stream sees identical rounds and results — one designs a
horse race, another a car race, and everywhere runner #3 wins. Fixed odds per outcome, fee-on-top
like `/bet`. Winners are credited **at the draw**; the reveal window afterwards is for the skins'
animations only.

- `GET /api/game/live/state` — stream config + current round (cached ~1 s):
  `{ stream: { id, slug, displayName, outcomes: [{ index, label, oddsBps, weight }],
  bettingSeconds, revealSeconds, intermissionSeconds, maxBetLamports, maxBetsPerPlayer },
  round: { roundId, roundNo, status, opensAt, locksAt, revealsUntil, serverSeedHash, clientSeed,
  outcomes, result }|null, lastRound, nextOpensAt, serverTime }`
  — `result` is **structurally null** until `status: "revealing"` (no early leak possible).
- `GET /api/game/live/recent?limit=20` — last settled results (cached ~5 s) for the ticker.
- `POST /api/game/live/bet` — `{ playerWallet, roundId, outcomeIndex, betLamports }` →
  `{ betId, roundNo, oddsBps, potentialPayoutLamports, fees, locksAt, proof }`. The `roundId` must
  be the currently displayed round (`API-204 round_mismatch` otherwise); after `locksAt` the server
  rejects with `API-204 betting_locked`.
- `GET /api/game/live/me/:wallet?roundId=` — own bets of a round for THIS game + totals.
- `GET /api/game/live/history?wallet=&limit=` — own settled bets for THIS game.
- `GET /api/game/live/round/:roundId` — full round view.
- `GET /api/game/live/verify/:roundId` — **public** provably-fair check: seed hash was committed
  before betting opened; message is `live:<streamId>:<roundNo>` at nonce 0; outcome recomputed
  from the committed weights (`edge` boundaries included in the response).

Rules the UI MUST reflect:
- Bets bind to the displayed round; countdowns come from server timestamps + clock offset.
- During `revealing` the balance display is **frozen** (`lib/balance-freeze.tsx`) and own-bet
  results are not shown — the animation reveals the winner, then everything refreshes.
- `API-302 live_exposure_cap` = this outcome's book is full for the round — smaller stake or a
  different outcome.

## PvP layer (pvp-coinflip) — lobby → ready-check → server draw for the pot

Wallet-bound actions need a player token (same as `/bet`); the lobby-room state poll is
**membership-checked and token-bound too** — send the Bearer token on it, a non-member gets
`API-700`. The open-lobby list, match view, W/L stats and verify are plain reads.

- `POST /api/game/pvp/lobby` — `{ playerWallet, stakeLamports, pin?, clientSeed? }` → `PvpLobbyView`
  (creates a lobby; **no money moves yet**). `API-704` = already in another lobby (details carry
  `lobbyId`).
- `POST /api/game/pvp/lobby/:id/join` — `{ playerWallet, pin?, clientSeed? }` → `PvpLobbyView`.
  Wrong PIN → `API-703`; full → `API-701`; expired → `API-702`.
- `POST /api/game/pvp/lobby/:id/leave` — `{ playerWallet }` → `{ left, dissolved }` (host leaving
  dissolves the lobby).
- `POST /api/game/pvp/lobby/:id/kick` — `{ playerWallet (host), wallet (target) }` → `PvpLobbyView`
  (host only, before the lock; `API-710` otherwise).
- `POST /api/game/pvp/lobby/:id/ready` — `{ playerWallet, clientSeed? }` → `PvpLobbyView`. Send a hex
  `clientSeed` (`[0-9a-f]{1,64}`). When **both** are ready the server locks, debits both seats and
  draws; a debit failure on the caller → `API-708` (refunded, lobby reopened, ready reset).
- `POST /api/game/pvp/lobby/:id/unready` — `{ playerWallet }` → `PvpLobbyView`.
- `POST /api/game/pvp/lobby/:id/stake` — `{ playerWallet (host), stakeLamports }` → `PvpLobbyView`
  (host only; **un-readies everyone**; `API-706` if out of range).
- `POST /api/game/pvp/lobby/:id/chat` — `{ playerWallet, message }` (≤200 chars, 1 msg / 2 s) →
  `{ id, createdAt }`.
- `GET /api/game/pvp/lobby/:id?since=<chatCursor>` — **token-bound** lobby-room state:
  `{ lobbyId, status, hostWallet, stakeLamports, maxPlayers, hasPin, lastError, expiresAt,
  members:[{ wallet, seatNo, ready, isHost, joinedAt }], match:{ matchId, status, drawAt, winnerSeat,
  settledAt }|null, engineConfig, serverTime }`. Poll 1 s; non-member → `API-700`.
- `GET /api/game/pvp/lobbies` — open lobbies of **this** game (host wallet truncated):
  `{ lobbies:[{ lobbyId, hostWallet, stakeLamports, playersCurrent, playersMax, locked, ageSeconds,
  createdAt }], serverTime }`.
- `GET /api/game/pvp/match/:id` — full match view (seat wallets truncated for non-participants;
  `result` appears at `settled`).
- `GET /api/game/pvp/me/:wallet` — `{ wallet, wins, losses, total, recent:[…] }`.
- **Demo:** `POST /api/game/demo/pvp/lobby` — `{ playerWallet, stakeLamports, clientSeed? }` → an
  instant settled match vs. the server bot (token-free); `GET /api/game/demo/pvp/match/:id` re-reads it.
- `GET /api/game/pvp/verify/:matchId` — **public** provably-fair check:
  `roll = HMAC-SHA256(serverSeed, seat1Seed:seat2Seed:matchId:nonce)`, `roll < 50 → seat 1` (host).

### Dice Duel move (`pvp-dice-duel` only)

The `pvp-dice-duel` engine shares every lobby endpoint above; the in-match phase is turn-based Farkle
instead of a single flip. The match view (`GET /api/game/pvp/match/:id`) then carries a `diceDuel`
block: `{ format, minBankPoints, targetScore, stage:'regular'|'closing'|'sudden_death', activeSeat,
turnNo, moveDeadline, phase, closingSeat, tableDice, keptThisTurn, turnScore, scores:{seat1,seat2},
winnerSeat, matchOver, decisionLog }` (plus top-level `serverTime`). `tableDice` are resolved faces
**1–6** (never raw HMAC values).

- `POST /api/game/pvp/match/:id/move` — `{ playerWallet, keep, action }` → `PvpMatchView` (with the
  updated `diceDuel` block). `keep` is the list of **die values (1–6)** to set aside this throw
  (min 1, must be a fully-scoring selection); `action` is `'roll'` (reroll the remaining dice; all
  six scored = hot dice → reroll all six with the turn score held) or `'bank'` (secure the turn score
  and end the turn). Wallet-bound (player token, same as `/bet`); **only the active seat** may move.
  Errors: `API-710` not your turn / not the active seat · `API-204` `invalid_selection` /
  `dice_not_on_table` / `cannot_bank` (below `minBankPoints`) · `API-712` stale move (someone or the
  timer already advanced — just re-fetch the match view) · `API-707` seed rotated (match voided +
  refunded). On move-timer expiry (`moveDeadline`) the server auto-banks — the UI just keeps polling.

Rules the UI MUST reflect:
- **Money is only charged at the lock** (both ready), never at lobby creation; leaving before the
  start is free. The winner takes the whole pot (both clean stakes); fees are kept regardless.
- Drive the reveal from the lobby state's `match.drawAt` + `serverTime` offset (same clock-offset
  pattern as live); freeze the balance until the result shows. The winner is paid even if a tab
  closed.
- Stake bounds / PIN policy come from the resolved engine config — never hardcode them.

## Player balance (program mode; hide when `devMock: true`)

- `GET /api/game/balance/:wallet` → `{ wallet, devMock, balanceLamports: string|null }`
- `POST /api/game/withdraw` — `{ playerWallet, amountLamports }` → `{ signature: string|null }`
  (null in dry-run). Balance too low → `API-305`.
- **Deposit:** on-chain `player_deposit` instruction to the program `sol_core_vault` (program ID
  from `NEXT_PUBLIC_PROGRAM_ID` — devnet staging: `8R7PfDa6FYVZdYgg7mGD8kfXNRN66M9VenLjP1t2qaoG`,
  mainnet: `<mainnet program id>`, see `docs/mainnet-migration.md`), target PDA `player_vault`. The
  wallet signs in the browser (see `lib/player-program.ts`); credited by the indexer in ~5–10s.

## Bet limits (this app: `GET /api/limits`)

Proxies `GET /api/public/games/:gameId/limits` (game id from the server config, never from the
request) → `{ maxBetLamports, minBetLamports, limitedBy, text, limits{…}, playable }`.

**UI requirement:** show `maxBetLamports` next to the balance (`BetLimitHint`) AND next to every
bet field (`MaxBetPick`). The allowed bet is the MINIMUM of the game, level, solvency, single- and
daily-payout caps, and the tightest of them moves during operation — measured 2026-08-28: game and
level cap 50 SOL each, actually allowed 0.0365 SOL. Without the number a player types blind and
gets a rejection with no visible reason. `text` is a ready-made sentence from the server; never
translate the limits yourself, or backend and display drift apart.

## Provably fair (public, no key)

`GET /api/game/verify/:roundId` → `{ serverSeedHash, serverSeed, clientSeed, nonce, recordedRoll,
expectedRoll, verified, … }` — plus the same shape per mechanic:
`/api/game/pvp/verify/:matchId`, `/api/game/live/verify/:roundId`,
`/api/game/live-crash/verify/:roundId`, `/api/game/tournament/verify/:runId`.

**UI requirement:** show the hash BEFORE the round, and after it a DIRECT link into the Sol-Core
Scanner for EVERY mechanic. Always build it with `components/VerifyLink.tsx`
(`<VerifyLink verifierUrl={…} id={roundId} />` or `verifyHref(verifierUrl, id)`), which points at
`<verifierUrl>/verify/<id>` — the page that recomputes the round in the player's own browser and
resolves solo rounds, PvP matches, live rounds, crash rounds and tournament runs from the id alone.

Never link at the JSON endpoints above: same data, but a wall of braces instead of a proof. On
2026-08-28 seven of the nine listed games linked exactly there.

## Error codes (handle all of them — texts come from the SERVER)

`lib/errors.ts` fetches `GET /api/error-catalog` (proxy to `/api/public/error-catalog`) on start and
overlays the built-in snapshot `lib/error-catalog.generated.ts`
(regenerate: `npm run sync-error-catalog`). Use `toUiError(code, fallback, reason, details)` — or
`errorTextIn(lang, …)` where the UI has its own language switch.

`action` tells the UI what to DO without knowing the code: `deposit` · `lock` · `retry` ·
`cooldown` · `info`. `reasons` splits cases that share one code (API-302: `bankroll_cap` = "bet
less", `withdraw_daily_limit` = "come back tomorrow").

**Never add a second code→text table of your own.** A list baked into a build cannot stay current —
on 2026-08-28 no two of the nine listed games showed the same text for the same code, and none of
them knew the crash block (API-820…827). The table below is the overview, not the source.

| Code | HTTP | Meaning | UI |
|---|---|---|---|
| API-201 | 409 | game paused / globally halted | lock |
| API-202 | 409 | game not active | lock |
| API-204 | 400/422 | validation (incl. `session_only_mode`, `impossible_guess`; `invalid_column`/`invalid_tile` carry `validRange`) | message |
| API-300 | 400 | bet below minimum | clamp input |
| API-301 | 400 | bet above level maximum | show max |
| API-302 | 429 | payout/bankroll limit (`bankroll_cap`, `withdraw_daily_limit`) | try later |
| API-303 | 403 | self-bet (creator wallet) | notice |
| API-304 | 429 | rate limit | disable button + countdown |
| API-305 | 402 | **insufficient balance** | deposit dialog |
| API-402 | 401 | player token missing/invalid/expired | reconnect wallet |
| API-310 | 423 | withdrawals paused (nothing was debited) | notice |
| API-311 | 400 | below minimum withdrawal (full balance always allowed) | notice |
| API-500 | 5xx | server error | retry |

PvP-specific (API-7xx): `API-700` lobby not found / not a member · `API-701` lobby full ·
`API-702` lobby expired · `API-703` wrong PIN · `API-704` already in another lobby (details
`lobbyId`) · `API-705` self-match blocked · `API-706` stake out of range · `API-707` seed session
rotated (refunded) · `API-708` balance too low at lock (refunded) · `API-709` PvP rate limit ·
`API-710` host-only action / not the active seat (dice-duel move) · `API-711` match already refunded ·
`API-712` stale dice-duel move (re-fetch the match view).

Live-crash (API-82x): `API-820` round gone (retry) · `API-821` betting closed, already flying ·
`API-822` no open bet · `API-823` too late, already crashed · `API-824` auto-cashout out of range ·
`API-825` already settled · `API-826` one bet per round · `API-827` not flying right now.

Live-odds rounds (API-81x): `API-812` round not found · `API-813` betting closed · `API-814`
outcome not on offer · `API-815` odds still being computed · `API-816` round fully booked ·
`API-817` bet limit for this round reached.

Note: the hosted service may have a ~30–50s cold start after idle — design generous loading states.
