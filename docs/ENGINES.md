# Engines & Mechanics

Set `NEXT_PUBLIC_ENGINE` + `NEXT_PUBLIC_MECHANIC` in `.env`. The combination is validated at boot
(a wrong pair ⇒ a clear error). The full `params` definition lives in `src/lib/engines.ts`
(system contract).

## Mechanics

- **single** — one bet, immediate result (`/api/game/bet`).
- **session** — progressive: start a round → steps → cash out any time (`/api/game/session/*`). The
  whole outcome is committed at start (provably-fair).

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

## Session steps (`step` body)

| Engine | Body per step |
|---|---|
| `mines` | `{ tile: 0–24 }` |
| `towers` | `{ column: 0–(width−1) }` |
| `hilo` | `{ guess: "higher"\|"lower" }` (a tie loses; ends after 20 steps) |
| `pump` | `{}` (just pump again) |

## Roulette `betType`

`red · black · odd · even · low (1–18) · high (19–36)` (no `value`) ·
`dozen`/`column` (`value` 0–2) · `straight` (`value` 0–36).

## Notes

- **Multiplier** in basis points: `10000 = 1×`.
- **Money** always as lamport-strings (1 SOL = 1e9).
- Session rules (bust, auto-cashout, 15-minute timeout) — see `API-REFERENCE.md`.
- Which engine your game runs is fixed by the **creator when the game is registered** — the `.env`
  here must match it.
