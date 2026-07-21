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

## Overview

| Engine | Category | single | session | params (single) |
|---|---|:---:|:---:|---|
| `coin-flip` | instant | ✓ | | `{ side: "heads"\|"tails" }` |
| `dice` | instant | ✓ | | `{ target: 0.01–99.99, direction: "over"\|"under" }` |
| `limbo` | instant | ✓ | | `{ targetMultiplierBps: ≥10000 }` |
| `scratch` | instant | ✓ | | `{}` |
| `plinko` | interactive | ✓ | | `{ balls?: 1\|3\|10\|100 }` (multi-shot, clamped to `config.maxBalls`) |
| `wheel` | interactive | ✓ | | `{}` |
| `mines` | interactive | ✓ | ✓ | `{ tiles: number[] }` |
| `hilo` | interactive | ✓ | ✓ | `{ card: 1–13, guess: "higher"\|"lower" }` |
| `keno` | table | ✓ | | `{ picks: number[] }` (1–10 of 1–40) |
| `roulette` | table | ✓ | | `{ betType, value? }` |
| `slots-3x3` | slot | ✓ | | `{}` |
| `slots-modular` | slot | ✓ | | `{}` |
| `towers` | chain | | ✓ | — (session) |
| `pump` | curve | | ✓ | — (session) |
| `gauntlet` | tournament | | | — (tournament) |

## Session steps (`step` body)

| Engine | Body per step |
|---|---|
| `mines` | `{ tile: 0–(gridSize−1) }` |
| `towers` | `{ column: 0–(columns−1) }` |
| `hilo` | `{ guess: "higher"\|"lower" }` (a tie loses; ends after 20 steps) |
| `pump` | `{}` (just pump again) |

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
| `hilo` | card picker | `[1, config.cards ?? 13]` instead of the old fixed 1–13 |
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
| `mines` | safe tiles on the grid | each safe pick grows the multiplier; mine = loss; cash out any time | compounds per pick |
| `hilo` | higher/lower | right guess grows the multiplier; tie/wrong = loss; ≤ 20 steps | compounds per step |
| `keno` | 1–10 of 40 numbers | more hits = more payout | top tier at all hits |
| `roulette` | classic bet | fixed payouts (2×/3×/36×) | 36× straight (RTP 97.3%) |
| `slots-3x3` | — (spin) | centre line: triple/pair pays | top triple of the reel |
| `slots-modular` | — (spin) | up to 20 lines pay 3/4/5-of-a-kind left-to-right (wild substitutes); 3+ scatters pay anywhere; all hits of a spin sum | `lineCount·maxPay + scatterMax` (conservative bound) |
| `towers` | one column per floor (2–4, from config) | each safe floor multiplies; bomb = loss; cash out any time | `(1−edge)·(c/(c−1))^levels` |
| `pump` | pump again or cash out | each pump grows the multiplier; burst = loss | `growth^maxPumps` |
| `gauntlet` | a risk tier per step, bank in time | entry feeds the pot; bust zeroes the run; best score per wallet ranks — top ranks split the pot at cycle end | pot share of rank 1 |

## Roulette `betType`

`red · black · odd · even · low (1–18) · high (19–36)` (no `value`) ·
`dozen`/`column` (`value` 0–2) · `straight` (`value` 0–36).

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
