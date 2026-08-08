# Engines & Mechanics

Set `NEXT_PUBLIC_ENGINE` + `NEXT_PUBLIC_MECHANIC` in `.env`. The combination is validated at boot
(a wrong pair ⇒ a clear error). The full `params` definition lives in `src/lib/engines.ts`
(system contract).

## Mechanics

- **single** — one bet, immediate result (`/api/game/bet`).
- **session** — progressive: start a round → steps → cash out any time (`/api/game/session/*`). The
  whole outcome is committed at start (provably-fair).
- **tournament** — pot-based highscore runs (`/api/game/tournament/*`): a fixed entry fee per run
  goes into the cycle pot; the run itself pays nothing. Players collect a score (all rolls are
  pre-committed at enter, provably-fair); at cycle end the pot is paid out 100% to the top ranks.
  Re-entries are allowed — the best score per wallet counts.
- **live** — shared timed betting rounds on an operator stream (`/api/game/live/*`): during the
  betting window players bet on one of N outcomes at fixed odds; at lock the server draws ONE
  result for **every** game on the stream (seed hash committed before betting opened). Winners are
  credited at the draw; the skins then play their reveal animation while the balance display is
  frozen. Your game references the stream via its server config — the outcomes/odds/durations all
  come from `GET /api/game/live/state`, never hardcode them.
- **pvp** — player vs. player with a lobby system (`/api/game/pvp/*`): create or join a lobby,
  set a stake, both players mark ready; the server flips one provably-fair coin and the winner
  takes the whole pot. **Money is only charged at the start (both ready), never when the lobby is
  created** — leaving before the start is free. Stake bounds / PIN policy come from the resolved
  engine config; wallet-bound actions (create/join/leave/kick/ready/unready/stake/chat) need a
  player token, and the membership-checked lobby-room state poll (`GET /pvp/lobby/:id`) is
  **token-bound too** (a non-member gets `API-700`). A demo mode (`/api/demo/pvp/*`) plays an instant
  match against the server bot with simulated SOL.

## Overview

| Engine | Category | single | session | params (single) |
|---|---|:---:|:---:|---|
| `coin-flip` | instant | ✓ | | `{ side: "heads"\|"tails" }` |
| `dice` | instant | ✓ | | `{ target: 0.01–99.99, direction: "over"\|"under" }` |
| `limbo` | instant | ✓ | | `{ targetMultiplierBps: ≥10000 }` |
| `scratch` | instant | ✓ | | `{}` |
| `plinko` | interactive | ✓ | | `{ balls?: 1\|3\|10\|100 }` (multi-shot, clamped to `config.maxBalls`) |
| `wheel` | interactive | ✓ | | `{}` |
| `mines` | interactive | — | ✓ | session only (the single-bet variant was retired) |
| `hilo` | interactive | — | ✓ | session only (the single-bet variant was retired) |
| `keno` | table | ✓ | | `{ picks: number[] }` (1–10 of 1–40) |
| `roulette` | table | ✓ | | Easy: `{ betType, value? }` · Pro: `{ bets: [{ betType, value?, stakeLamports }] }` (see below) |
| `slots-3x3` | slot | ✓ | | `{}` |
| `slots-modular` | slot | ✓ | | `{}` |
| `towers` | chain | | ✓ | — (session) |
| `pump` | curve | | ✓ | — (session) |
| `steps` | chain | | ✓ | — (session) |
| `gauntlet` | tournament | | | — (tournament) |
| `live-odds` | live | | | — (live; outcomes/odds from `/live/state`) |
| `pvp-coinflip` | pvp | | | — (pvp; lobby → ready-check → server draw for the pot) |
| `pvp-dice-duel` | pvp | | | — (pvp; lobby → ready-check → turn-based Farkle for the pot) |

## Session steps (`step` body)

| Engine | Body per step |
|---|---|
| `mines` | `{ tile: 0–(gridSize−1) }` |
| `towers` | `{ column: 0–(columns−1) }` |
| `hilo` | `{ guess: "higher"\|"lower" }` (a tie loses; ends after 20 steps) |
| `pump` | `{}` (just pump again) |
| `steps` | `{}` (one climb attempt). Note: `SessionView.steps` counts climb ATTEMPTS for this engine — the current rung is `progress.currentStep` and remaining lives are `progress.livesLeft`; the ladder (`ladderBps`), `checkpoints`, `lives` and `dropMode` arrive via the resolved engine config |

## Tournament steps (`gauntlet`)

Flow: `POST /tournament/enter` (fixed entry, debited immediately into the pot) →
`POST /tournament/run/:id/step` with `{ risk: "safe"|"medium"|"risky" }` →
`POST /tournament/run/:id/stop` banks the score. **A bust zeroes the run** — stop in time.

| Tier | Survives | Points |
|---|---|---|
| `safe` | 90% | +10 |
| `medium` | 60% | +15 |
| `risky` | 30% | +30 |

Equal expected value per tier (9 points/step) — the choice is pure variance strategy relative to
the live leaderboard. `maxSteps` (10–100) comes from the cycle config
(`GET /tournament/cycle` → `maxSteps`). Runs idle for 15 minutes (or still active at cycle end)
are auto-banked with their current score.

## Live rounds (`live-odds`)

Flow: poll `GET /live/state` (1 s in hot phases — last 10 s of betting and during the reveal —
else 2 s is fine) → `POST /live/bet` with `{ playerWallet, roundId, outcomeIndex, betLamports }`
binding the bet to the **displayed** round → at `revealing` play the animation from
`result.outcomeIndex` + the reveal window → at `settled` refresh `GET /live/me/:wallet`.

Round states: `betting → drawing → revealing → settled` (or `void` = refunded). Countdowns come
from `locksAt` / `revealsUntil` minus your clock offset (derive it from `serverTime` in every
state payload — never trust the device clock). Multiple bets per player per round are allowed
(different outcomes or stacking the same one).

**The result is credited server-side at the draw** — the reveal is pure theater. The template's
balance-freeze hook (`lib/balance-freeze.tsx`) holds the displayed balance during the reveal so a
background poll can't spoil the winner; never remove it.

## PvP rounds (`pvp-coinflip`)

Flow: **create** a lobby (`POST /pvp/lobby` with `{ playerWallet, stakeLamports, pin?, clientSeed? }`)
or **join** an open one (`POST /pvp/lobby/:id/join`) → in the lobby room chat
(`POST /pvp/lobby/:id/chat`), the host may change the stake (`POST /pvp/lobby/:id/stake`, which
un-readies everyone) or kick (`POST /pvp/lobby/:id/kick`) → each player marks **ready**
(`POST /pvp/lobby/:id/ready`, sending their hex `clientSeed`) → when **both** are ready the server
locks, debits both seats and draws; at `settled` the winner is paid the whole pot.

- **Poll the lobby room** with `GET /pvp/lobby/:id?since=<chatCursor>` — this is **membership-checked
  and token-bound**: the poll must carry the player's Bearer token (the starter uses
  `usePlayerAuth().authFetch`), a non-member gets `API-700`. The open-lobby list
  (`GET /pvp/lobbies`), match view (`GET /pvp/match/:id`), W/L stats (`GET /pvp/me/:wallet`) and
  verify (`GET /pvp/verify/:matchId`) are plain reads.
- **Money is only charged at the lock** (both ready), not at lobby creation; leaving before the
  start is free. Fees are taken on top of the stake and always kept — the winner receives the whole
  pot (both clean stakes).
- The reveal animation is deterministic from the lobby state's `match.drawAt` + `serverTime` offset
  (same clock-offset pattern as live), with the balance frozen until the result shows. The winner is
  paid server-side even if a tab closed. Provably fair:
  `roll = HMAC-SHA256(serverSeed, seat1Seed:seat2Seed:matchId:nonce)`, `roll < 50 → seat 1` (host).
- **Demo:** `POST /api/demo/pvp/lobby` plays an instant match vs. the server bot on the simulated
  balance (`GET /api/demo/pvp/match/:id` re-reads it) — token-free, isolated from the real tables.
- Stake bounds / PIN policy come from the resolved engine config — never hardcode them.

## PvP Dice Duel (`pvp-dice-duel`, "Dice Risk")

Same lobby → ready-check → lock flow as `pvp-coinflip` (create/join/chat/ready/stake/kick, money only
charged at the lock, winner paid the whole pot). The difference is the **in-match phase**: instead of a
single coin flip it is a **turn-based Farkle** duel. The template renders this in `DiceDuelGame.tsx`,
which reuses the entire coin-flip lobby shell (`Hero`, `OpenLobbiesTable`, `LobbyRoom`, wallet/menu/info/
create dialogs, exported from `PvpGame.tsx`) and only swaps the in-match view.

- **Get the state from the match view**, not the lobby: poll `GET /pvp/match/:id` (plain read) — for a
  dice-duel match it carries a `diceDuel` block:
  `{ format, minBankPoints, targetScore, stage, activeSeat, turnNo, moveDeadline, phase, closingSeat,
  tableDice, keptThisTurn, turnScore, scores:{seat1,seat2}, winnerSeat, matchOver, decisionLog }`.
  `tableDice` are the **resolved faces 1–6** (never raw HMAC values). The match view also carries
  `serverTime` (for the move-timer offset).
- **Make a move**: `POST /api/game/pvp/match/:id/move` with `{ playerWallet, keep, action }` where
  `keep` is the list of **die values (1–6)** to set aside this throw (min 1, a fully-scoring selection)
  and `action` is `'roll'` (reroll the rest; all six scored = hot dice → reroll all six, turn score held)
  or `'bank'` (secure the turn score, end the turn; blocked while `turnScore + selection < minBankPoints`).
  Only the **active seat** may move (`API-710`); the response is the updated match view.
- **Rules reflected in the UI**: 6 dice per throw, set aside ≥1 scoring die, then roll or bank. No scoring
  dice = **Farkle** (turn score lost). Scoring: single 1 = 100 / 5 = 50; three of a kind 1→1000 else X·100;
  four 1→2000 else 1000; five 1→5000 else X·1000; six = 10000; straight 1-6 = 1000; three pairs = 500.
  Formats: `quick3` (3 turns each, most points wins) / `race10000` (first to `targetScore` = 10000, the
  opponent gets one last turn). A **move timer** counts down from `moveDeadline` (server auto-banks on
  expiry — the UI just keeps polling).
- **End**: winner + payout + a Verify link to the raw `GET /pvp/verify/:matchId` (same as coin-flip). The
  balance is frozen during the final settle.
- **Demo:** `POST /api/demo/pvp/lobby` starts a turn-based match vs. the server bot on the simulated
  balance; each `POST /api/demo/pvp/match/:id/move` plays the player's turn and the bot's reply in one
  response — token-free, isolated from the real tables.
- Engine config echoes `matchFormat`, `minBankPoints`, `targetScore` (10000) and `waitTimeSeconds`
  (the move timer) in addition to the coin-flip fields.

**Never hardcode the grid/column count.** The real dimensions come from the server:
`GET /api/meta` → `engineConfig` (e.g. towers `{ levels, columns }`, mines `{ gridSize, mineCount }`),
and every `SessionView` carries `engine.config`. The generic UI derives its buttons from these values
(`boundsFrom` in `lib/engines.ts`); an out-of-range step is rejected with `API-204` + `validRange`.

## Pro-config-aware controls (Engine PRO 2.0)

Since creators can now tune per-engine Pro config, several inputs are no longer fixed constants in
the client — they read their bounds from the server config on every render (`boundsFrom` per engine
in `lib/engines.ts`). Never hardcode the old fixed values (0–100, 1–13, uniform column counts, …):

| Engine | Control | Source of the bound |
|---|---|---|
| `dice` | target slider/input range | `boundsFrom`: `[config.rangeMin ?? 0, config.rangeMax ?? 100]` (both always echoed by the server, even at their defaults) |
| `limbo` | target multiplier input | floor is always `config.minTargetBps` (default 1.00×, always echoed); ceiling only appears if the creator set `config.maxTargetBps` |
| `hilo` | — | session only; the card is dealt by the game, not entered by the player |
| `keno` | number picker | `[1, config.pool ?? 40]` instead of the old fixed 1–40 |
| `roulette` | straight-bet value picker | `[0, pocketCount − 1]`, where `pocketCount` is 37 (european) or 38 (american) from `config.wheelType` |
| `plinko` | ball-count select (`params.balls`) | options are filtered to what's ≤ `config.maxBalls` (1/3/10/100); the whole control is hidden when `maxBalls` is 1 (the default) |
| `towers` | per-floor column buttons (session step) | **per-step**, not a single constant: `floors[currentStep].columns` when the game has a `floors` array (per-floor Pro config), else the legacy uniform `columns` — see `boundsFrom(cfg, currentStep)` in `lib/engines.ts` |

All of these are **display/UX conveniences only** — the server re-validates every param/step against
its own resolved config regardless of what the client sends (out-of-range ⇒ `API-204` + `validRange`).

## What the player puts in — and what can come out

Plain-language income/outcome facts (also in each engine's `playerFacts` in `src/lib/engines.ts`,
shown in the game's empty state). Loss is always **0× (bet lost)**; max win:

| Engine | The player chooses | What can happen | Max win |
|---|---|---|---|
| `coin-flip` | heads or tails | right side pays ~1.96× | `winMultiplierBps` (default 1.96×) |
| `dice` | target + over/under | riskier pick = higher multiplier | `(1−edge)/winChance` |
| `limbo` | a target multiplier | hit pays exactly the target | your target (level cap) |
| `scratch` | — (buy a ticket) | prize table from blank to jackpot | top prize of the paytable |
| `plinko` | — (drop the ball) | slot decides; edges pay big | edge slot of the paytable |
| `wheel` | — (spin) | one segment wins | top segment of the paytable |
| `mines` | one safe tile per move (session) | each safe pick grows the multiplier; mine = loss; cash out after every pick | compounds per pick |
| `hilo` | higher/lower on the dealt card (session) | right guess grows the multiplier; tie/wrong = loss; chain ends after the configured steps | compounds per step |
| `keno` | 1–10 of 40 numbers | more hits = more payout | top tier at all hits |
| `roulette` | classic bet | fixed payouts (2×/3×/36×) | 36× straight (RTP 97.3%) |
| `slots-3x3` | — (spin) | centre line: triple/pair pays | top triple of the reel |
| `slots-modular` | — (spin) | up to 20 lines pay 3/4/5-of-a-kind left-to-right (wild substitutes); 3+ scatters pay anywhere; all hits of a spin sum | `lineCount·maxPay + scatterMax` (conservative bound) |
| `towers` | one column per floor (2–4, from config) | each safe floor multiplies; bomb = loss; cash out any time | `(1−edge)·(c/(c−1))^levels` |
| `pump` | pump again or cash out | each pump grows the multiplier; burst = loss | `growth^maxPumps` |
| `gauntlet` | a risk tier per step, bank in time | entry feeds the pot; bust zeroes the run; best score per wallet ranks — top ranks split the pot at cycle end | pot share of rank 1 |

## Roulette `betType`

Two variants, chosen by the creator via `config.betMode` (`easy` default | `pro`):

**Easy (single bet)** — `params = { betType, value? }`, one classic bet per spin:
`red · black · odd · even · low (1–18) · high (19–36)` (no `value`) ·
`dozen`/`column` (`value` 1–2, i.e. 1-based dozen/column index sent as 0-2 is
clamped) · `straight` (`value` 0–36, or 0–37 on an american wheel for `00`).

**Pro (multi-bet board)** — `params = { bets: [{ betType, value?, stakeLamports }, …] }`.
One spin resolves EVERY chip; the payout is the exact sum of the winning chips
and `betLamports` must equal `Σ stakeLamports`. In addition to the outside/group
bets above, Pro adds the classic inside bets, all paying `36/k ×` over their `k`
covered pockets (so RTP stays a uniform `36/pocketCount` for any distribution):

| betType | covered | pays | `value` |
|---|---|---|---|
| `straight` | 1 | 36× | pocket `0..pocketCount-1` |
| `split` | 2 | 18× | layout index (grid splits, then zero splits) |
| `street` | 3 | 12× | layout index (12 rows, then zero trios) |
| `corner` | 4 | 9× | layout index (22 corners) |
| `six-line` | 6 | 6× | layout index (11 double-streets) |
| `basket` | 4 | 9× | european only (`0-1-2-3`) |

Constraints (server-enforced, `API-306` on violation): each `betType` must be in
the allow-list, `value` in range for its type/wheel, `stakeLamports` a positive
integer string, at most `ROULETTE_MAX_CHIPS` (20) chips, and `Σ stakeLamports ===
betLamports`. The american 5-number top-line is intentionally not offered.

## `slots-modular` renderSpec + result `details`

Unlike the other engines, `slots-modular`'s `engineConfig` (from `GET /api/meta`) carries the
**full render spec** the client needs to draw the reels itself — no separate lookup:

- `reels: 5`, `rows: 3`, `lineCount` (1–20, how many of the 20-line catalog are active).
- `symbols`: `{ id, wild, scatter, paysBps: [3oak, 4oak, 5oak] }[]` — read defensively
  (`Array.isArray`/`typeof id === 'string'`); an unknown/missing symbol id falls back to a
  deterministic placeholder glyph (see `src/lib/symbolArt.ts`), never a client-side guess at the
  symbol's identity.
- `paylines`: `number[][]` — one row-index array (length 5, one per reel) per active line, same
  order as `lineWins[].line` below.
- `scatterPaysBps`: `[3, 4, 5]`-scatter payout tiers (informational; the server already applies
  them in `result.details`).

`result.details` (present only on the newer API; older responses omit it) carries the **resolved**
grid for that spin:

- `grid`: `string[][]` indexed `grid[reel][row]` — the symbol id landing in each of the 15 cells.
- `lineWins`: `{ line, symbol, count, payBps }[]` — one entry per line that paid (`line` indexes
  into `paylines` above).
- `scatterCount` / `scatterPayBps`: how many scatters landed and what they paid (`0` if fewer
  than 3).

`src/components/SlotGrid.tsx` renders this: with no `details` (idle) it shows a paytable preview
built purely from `engineConfig.symbols`; with `details.grid` present it draws the resolved grid
and highlights the winning lines/scatters. It never derives an outcome — every cell comes straight
from the server's `details.grid`; the column stagger is a pure reveal animation, not a draw. A
`result` **without** `details.grid` (old API) falls back to the plain `ResultView` in
`SingleBetGame.tsx`.

## Notes

- **Multiplier** in basis points: `10000 = 1×`.
- **Money** always as lamport-strings (1 SOL = 1e9).
- Session rules (bust, auto-cashout, 15-minute timeout) — see `API-REFERENCE.md`.
- Which engine your game runs is fixed by the **creator when the game is registered** — the `.env`
  here must match it.

## Retired: single-bet `mines` and `hilo`

Both engines used to exist as a single bet **and** as a session. The single-bet variants were
strictly worse and impossible to tell apart from their session twins in the catalog:

- `mines` / single let the player pre-pick every tile — all-or-nothing, no cash-out, i.e. the game
  without the one decision that makes it Mines.
- `hilo` / single let the player type their own starting card, so they picked their own win chance.
  That is `dice` with a card skin.

They are therefore **session only**. Sol-Core still serves `/bet` for games that were already live
(`GET /api/public/engines` marks them with `singleBetLegacy: true`), but new games are session only —
set `NEXT_PUBLIC_MECHANIC=session`.
