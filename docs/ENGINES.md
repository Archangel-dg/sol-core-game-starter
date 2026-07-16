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
| `crash` | interactive | ✓ | | `{ cashoutBps: ≥10000 }` |
| `plinko` | interactive | ✓ | | `{}` |
| `wheel` | interactive | ✓ | | `{}` |
| `mines` | interactive | ✓ | ✓ | `{ tiles: number[] }` |
| `hilo` | interactive | ✓ | ✓ | `{ card: 1–13, guess: "higher"\|"lower" }` |
| `keno` | table | ✓ | | `{ picks: number[] }` (1–10 of 1–40) |
| `roulette` | table | ✓ | | `{ betType, value? }` |
| `slots-3x3` | slot | ✓ | | `{}` |
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

## What the player puts in — and what can come out

Plain-language income/outcome facts (also in each engine's `playerFacts` in `src/lib/engines.ts`,
shown in the game's empty state). Loss is always **0× (bet lost)**; max win:

| Engine | The player chooses | What can happen | Max win |
|---|---|---|---|
| `coin-flip` | heads or tails | right side pays ~1.96× | `winMultiplierBps` (default 1.96×) |
| `dice` | target + over/under | riskier pick = higher multiplier | `(1−edge)/winChance` |
| `limbo` | a target multiplier | hit pays exactly the target | your target (level cap) |
| `scratch` | — (buy a ticket) | prize table from blank to jackpot | top prize of the paytable |
| `crash` | auto-cashout | curve above it = win, crash before = loss | your cashout (level cap) |
| `plinko` | — (drop the ball) | slot decides; edges pay big | edge slot of the paytable |
| `wheel` | — (spin) | one segment wins | top segment of the paytable |
| `mines` | safe tiles on the grid | each safe pick grows the multiplier; mine = loss; cash out any time | compounds per pick |
| `hilo` | higher/lower | right guess grows the multiplier; tie/wrong = loss; ≤ 20 steps | compounds per step |
| `keno` | 1–10 of 40 numbers | more hits = more payout | top tier at all hits |
| `roulette` | classic bet | fixed payouts (2×/3×/36×) | 36× straight (RTP 97.3%) |
| `slots-3x3` | — (spin) | centre line: triple/pair pays | top triple of the reel |
| `towers` | one column per floor (2–4, from config) | each safe floor multiplies; bomb = loss; cash out any time | `(1−edge)·(c/(c−1))^levels` |
| `pump` | pump again or cash out | each pump grows the multiplier; burst = loss | `growth^maxPumps` |
| `gauntlet` | a risk tier per step, bank in time | entry feeds the pot; bust zeroes the run; best score per wallet ranks — top ranks split the pot at cycle end | pot share of rank 1 |

## Roulette `betType`

`red · black · odd · even · low (1–18) · high (19–36)` (no `value`) ·
`dozen`/`column` (`value` 0–2) · `straight` (`value` 0–36).

## Notes

- **Multiplier** in basis points: `10000 = 1×`.
- **Money** always as lamport-strings (1 SOL = 1e9).
- Session rules (bust, auto-cashout, 15-minute timeout) — see `API-REFERENCE.md`.
- Which engine your game runs is fixed by the **creator when the game is registered** — the `.env`
  here must match it.
