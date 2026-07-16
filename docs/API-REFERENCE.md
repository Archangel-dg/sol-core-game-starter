# Sol-Core Gaming API — System Contract

Base URL: `SOLCORE_API_URL` (canonical: `https://api.sol-core.com`).
Auth for game endpoints: header `X-API-Key: sk_live_…` (set by the server proxy in `app/api/*` —
**never in the browser**). All money values: **lamport-strings** (1 SOL = 1e9). Error shape:
`{ "error": { "code": "API-xxx", "message": "…", "details"?: … } }`.

## Health (public)

`GET /health` → `{ status, devMock: boolean, network }`
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

## Single bet

`POST /api/game/bet`
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

- `POST /api/game/session/start` — `{ gameId, playerWallet, betLamports, clientSeed? }`
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

## Player balance (program mode; hide when `devMock: true`)

- `GET /api/game/balance/:wallet` → `{ wallet, devMock, balanceLamports: string|null }`
- `POST /api/game/withdraw` — `{ playerWallet, amountLamports }` → `{ signature: string|null }`
  (null in dry-run). Balance too low → `API-305`.
- **Deposit:** on-chain `player_deposit` instruction to the program `sol_core_vault` (devnet,
  program ID `8R7PfDa6FYVZdYgg7mGD8kfXNRN66M9VenLjP1t2qaoG`), target PDA `player_vault`. The wallet
  signs in the browser (see `lib/player-program.ts`); credited by the indexer in ~5–10s.

## Provably fair (public, no key)

`GET /api/game/verify/:roundId` → `{ serverSeedHash, serverSeed, clientSeed, nonce, recordedRoll,
expectedRoll, verified, … }`
UI requirement: show the hash BEFORE the round, `roundId` + verify link after.

## Error codes (handle all of them — mapping in `lib/errors.ts`)

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
| API-400 | 400 | creator fee out of level range (game paused) | lock |
| API-500 | 5xx | server error | retry |

Note: the hosted service may have a ~30–50s cold start after idle — design generous loading states.
