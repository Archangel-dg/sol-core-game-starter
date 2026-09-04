# Engines & Mechanics

Set `NEXT_PUBLIC_ENGINE` + `NEXT_PUBLIC_MECHANIC` in `.env`. The combination is validated at boot
(a wrong pair ⇒ a clear error). The full `params` definition lives in `src/lib/engines.ts`
(system contract).

## Mechanics

- **single** — one bet, immediate result (`/api/game/bet`).
- **session** — progressive: start a round → steps → cash out any time (`/api/game/session/*`). The
  whole outcome is committed at start (provably-fair). The stake is charged **once, at start** —
  every step after that is free. **One exception: `spin-tower-pro`, where every step costs the
  stake again** — see [Pay-per-spin](#pay-per-spin-spin-tower-pro) below. It is still the `session`
  mechanic (same routes, same flow); the engine definition just carries
  `session.costPerStep: true`.
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
| `dice-ladder` | chain | | ✓ | — (session) |
| `steps` | chain | | ✓ | — (session) |
| `spin-tower-pro` | chain | | ✓ | — (session; **every spin costs the stake again**) |
| `pump` | curve | | ✓ | — (session) |
| `gauntlet` | tournament | | | — (tournament) |
| `live-odds` | live | | | — (live; outcomes/odds from `/live/state`) |
| `live-crash` | live | | | — (live; shared flight, cash out mid-round — **demo money only**, see below) |
| `pvp-coinflip` | pvp | | | — (pvp; lobby → ready-check → server draw for the pot) |
| `pvp-dice-duel` | pvp | | | — (pvp; lobby → ready-check → turn-based Farkle for the pot) |

## Session steps (`step` body)

| Engine | Body per step |
|---|---|
| `mines` | `{ tile: 0–(gridSize−1) }` |
| `towers` | `{ column: 0–(columns−1) }` |
| `hilo` | `{ guess: "higher"\|"lower" }`, plus `"equal"` when the game sets `allowEqual` (a tie loses unless `tieRule: "win"`; ends after `config.maxSteps`, default 20) |
| `dice-ladder` | `{ guess: "higher"\|"lower" }` on the next **dice sum**, plus `"equal"` when the game sets `allowEqual` (a tie loses unless the game sets `tieRule: "win"`; ends after `config.maxSteps`, default 15) |
| `pump` | `{}` (just pump again) |
| `steps` | `{}` (just climb again) |
| `spin-tower-pro` | `{}` (just spin again) — **but this step is charged**, see below |

<a id="pay-per-spin-spin-tower-pro"></a>
## Pay-per-spin (`spin-tower-pro`) — read this before you re-skin it

**This is the only engine where a step costs money.** Every other engine in this template — including
every other `session` engine — debits the stake exactly once, when the round starts; every step after
that just uncovers an outcome that was already committed. `spin-tower-pro` breaks that assumption:

> **Every spin costs the full stake again, and from the first spin the stake is locked for the whole
> round.** A round is N *paid* spins, not one paid start plus N free reveals.

If you re-skin this engine, the per-spin price and the stake lock must stay visible. That is a
product requirement, not a style preference: a player who carries the "steps are free" habit over
from `mines`/`pump` will spend far more than intended. The generic UI
(`src/components/SessionGame.tsx`) already does it, keyed on `session.costPerStep` in
`src/lib/engines.ts` — never on the engine key:

- the stake field is labelled **"Einsatz JE SPIN"** and becomes **read-only** for the whole running
  round (so from `steps >= 1` it can no longer be changed),
- the spin button carries the price (`Spin — kostet X ◎`),
- the start screen states the worst case: `maxSpins × stake` if you play the round to the cap,
- the spin counter runs against `maxSpins`.

### Pot vs. Secured — two figures, never one

| Figure | What it is | Survives a FAIL? | Paid |
|---|---|:---:|---|
| **Pot** | sum of the multipliers of the **currently** reached tower levels | **no** | on cash-out / round end |
| **Secured** | what a maxed-out tower already paid out | **yes — FAIL-immune** | at **round end**, not per spin |

Cash-out is possible from spin 1 and pays **Pot + Secured**. Never render these as a single number:
the whole decision in this engine is "is my pot worth another paid spin?", and merging them hides it.
"Secured" being FAIL-immune does **not** mean it lands on the balance immediately — it is paid with
the one final settlement (a per-spin credit would collide with the round's refund protection).

### One spin, one outcome

The creator configures T towers (2–5), each with 2–8 levels and a strictly increasing multiplier per
level. One spin draws exactly one outcome from a weighted table:

| Outcome | Effect |
|---|---|
| tower *t*, below max | tower *t* climbs one level |
| tower *t*, **at max** | pays its top multiplier as **secured**; the tower stays at max |
| joker | every tower below max climbs; every tower at max secures its top multiplier |
| nothing | nothing |
| FAIL, `failMode: 'reset'` | all levels to 0, **round ends** |
| FAIL, `failMode: 'stepdown'` | every tower drops one level (floor 0), **round continues** |

A maxed tower keeps counting in the pot even though it already paid — it stays on its level. The
round also ends by itself at `maxSpins` or when the configured session return cap is reached (that
one pays out in full).

### Config echo + progress

`engineConfig` (from `GET /api/meta`, and `engine.config` in every `SessionView`) carries the resolved
engine: `towers: [{ levels, multipliersBps }]`, `jokerEnabled`, `failMode`, `maxSpins`,
`maxSessionReturnBps`, `maxPotBps`, `outcomeKinds` and `probsBps` (the **played** probabilities in bps,
summing to 10000 — never normalise the raw weights yourself). Read the `towers` array **defensively**
(`Array.isArray`, `typeof x === 'number'`): the shared `EngineConfig` type is `Record<string, number>`,
so this field is accessed through `unknown` — same care as towers' `floors` / `bombColumns`.

The running round adds, optionally (older API builds omit them — always fall back, never assume):
`spinCostLamports`, `potLamports`, `securedLamports`, `spins`, `maxSpins` on the `SessionView`, plus
`levels: number[]` and `securedBps` in `progress`.

Provably fair as usual: one server seed per round, committed at start, revealed at the end; spin *i*
consumes roll index *i−1*. The outcome order is fixed — tower 0…T−1, joker, nothing, FAIL — and a
disabled joker stays in the table as a zero-width edge so the indices never shift.

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

## Crash rounds (`live-crash`)

**Two money modes since stage 3 (2026-08-28).** The Gaming API now carries BOTH pairs of routes:
the demo pair (`POST /live-crash/demo-bet` / `demo-cashout`, `apiKeyAuth`-only, play money against
`live_crash_demo_balances`) **and** the real-money pair (`POST /live-crash/bet` / `cashout`,
`apiKeyAuth` **plus** `requirePlayerSession` — the wallet always comes from the signed player
token, never from the body, exactly like `/live/bet`). The real path adds fees (fee-on-top like
`/bet`), the per-round liability cap against the bankroll share (`API-302`,
`reason: 'crash_exposure_cap'`, including how much still fits), and settlement through sol-core
with the payout-hold mechanism. Whether real bets are ACCEPTED is still gated by
`platform_engines.real_money_enabled` (fail-closed allowlist, `migrations/024_platform_engines.sql`)
— cashout and settlement are never gated.

**This starter template still plays the demo pair.** Its crash routes
(`src/app/api/live-crash/bet/route.ts`, `.../cashout/route.ts`) call `demo-bet`/`demo-cashout`
with plain `fetch` and no player token. Upgrading the template to real money means: call the new
route pair, add the session binding via `usePlayerAuth().moneyFetch` (same pattern as `/live/bet`),
and surface fees and the `crash_exposure_cap` error to the player. Until that template stage ships,
do not build anything HERE that implies a player can win or lose real SOL.

Flow: poll `GET /live-crash/state` (1 s) for the shared round, the shared player list, the server
clock offset (`serverTime`, same clock-offset pattern as `live-odds`), and `config.ceilingBps` —
the creator's own ceiling, i.e. the highest multiplier a bet in this game is ever paid at. The
ceiling is what lets the client state a cash-out figure the server will actually honor; the shared
rules for that live in `src/lib/crash-math.ts` (system contract, mirrored from the server) → during
`betting`,
place **one bet per player per round** (`POST /live-crash/bet` with `{ roundId, playerWallet,
betLamports, safetyTargetBps? }`) → once the round is `flying`, the curve is drawn **locally in the
browser** from the shared `takeoffAt` and `curve.doubleMs` — every client computes the same
`multiplier = 2^(elapsed / doubleMs)`, so two browsers on the same round draw the same picture
without the server pushing intermediate values → cash out any time during the flight with `POST
/live-crash/cashout`; the response carries the multiplier and payout the server actually credited,
never the number the button happened to be showing. After the round reaches `crashed`, `GET
/live-crash/round/:id` reveals the server seed and the crash multiplier for that round.

Round states: `betting → flying → crashed → settled` (or `void` = refunded). The crash point is
**shared** — every player in a round flies the same curve and crashes at the same point — and it is
**pre-committed**: the server seed's hash is published before the betting window opens, and once a
round is `crashed`/`settled` it is fully reproducible from the published seeds (`proofSchema:
'crash_reproducible_v1'`, see `src/services/live-crash-public.ts` on the API side for exactly what
is public at each stage — nothing about the crash point is derivable before it happens).

★ **The design zone is `CrashCurveView.tsx`.** Read its own header comment before touching it — it
states the three binding fairness rules (the curve is a pure function of elapsed flight time, no
`Math.random()` anywhere, and the crash point must never be visible or hinted before the crash).
Everything else in that file — colors, shapes, motion, layout — is yours to re-skin freely.

## PvP rounds (`pvp-coinflip`)

Flow: **create** a lobby (`POST /pvp/lobby` with `{ playerWallet, stakeLamports, pin?, clientSeed? }`)
or **join** an open one (`POST /pvp/lobby/:id/join`) → in the lobby room chat
(`POST /pvp/lobby/:id/chat`), the host may change the stake (`POST /pvp/lobby/:id/stake`, which
un-readies everyone) or kick (`POST /pvp/lobby/:id/kick`) → each player marks **ready**
(`POST /pvp/lobby/:id/ready`, sending their hex `clientSeed`) → when **both** are ready the server
locks, debits both seats and draws → at `settled` the winner is paid the whole pot.

- **Poll the lobby room** with `GET /pvp/lobby/:id?since=<chatCursor>` — this is **membership-checked
  and token-bound**: the poll must carry the player's Bearer token (the starter uses
  `usePlayerAuth().authFetch`), a non-member gets `API-700`. The per-game open-lobby list
  (`GET /pvp/lobbies`), the match view (`GET /pvp/match/:id`), the W/L stats
  (`GET /pvp/me/:wallet`) and the verify (`GET /pvp/verify/:matchId`) are plain reads.
- **Money is only charged at the lock** (both ready), not when the lobby is created; leaving before
  the start is free. Fees (platform + creator) are taken on top of the stake and always kept — the
  winner receives the whole pot (both clean stakes).
- The reveal animation is deterministic from the lobby state's `match.drawAt` + `serverTime` offset
  (same clock-offset pattern as live), with the balance frozen until the result shows. The winner is
  paid server-side even if a tab closed. Provably fair:
  `roll = HMAC-SHA256(serverSeed, seat1Seed:seat2Seed:matchId:nonce)`, `roll < 50 → seat 1` (host).
- Stake bounds (`minStakeLamports`/`maxStakeLamports`) and the PIN policy (`allowPin`) come from the
  resolved engine config — never hardcode them.

## PvP Dice Duel (`pvp-dice-duel`, "Dice Risk")

Same lobby → ready-check → lock flow as `pvp-coinflip` (create/join/chat/ready/stake/kick, money only
charged at the lock, winner paid the whole pot). The difference is the **in-match phase**: instead of a
single coin flip it is a **turn-based Farkle** duel. The starter renders this in `DiceDuelGame.tsx`,
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
| `hilo` | guess buttons (session step) | `allowEqual` adds the third button; `cards` + `tieRule` decide which guesses are impossible on the current card and are shown disabled. The card itself is dealt by the game, never entered by the player |
| `dice-ladder` | guess buttons + current-sum display | same three-guess rule as `hilo` (`allowEqual`; `dice`·`faces` and `tieRule` decide the impossible ones), plus `config.sumCounts` (combinations per sum, index 0 = sum `config.dice`) — the server echoes the exact distribution it prices with, so never recompute it client-side |
| `keno` | number picker | `[1, config.pool ?? 40]` instead of the old fixed 1–40 |
| `roulette` | straight-bet value picker | `[0, pocketCount − 1]`, where `pocketCount` is 37 (european) or 38 (american) from `config.wheelType` |
| `plinko` | ball-count select (`params.balls`) | options are filtered to what's ≤ `config.maxBalls` (1/3/10/100); the whole control is hidden when `maxBalls` is 1 (the default) |
| `towers` | per-floor column buttons (session step) | **per-step**, not a single constant: `floors[currentStep].columns` when the game has a `floors` array (per-floor Pro config), else the legacy uniform `columns` — see `boundsFrom(cfg, currentStep)` in `lib/engines.ts` |

All of these are **display/UX conveniences only** — the server re-validates every param/step against
its own resolved config regardless of what the client sends (out-of-range ⇒ `API-204` + `validRange`).

One bound is deliberately NOT computed here: whether a guess would break the chain limit
(`maxWinBps`) depends on the house edge, and the server does not publish it. Guessing it would grey
out guesses that are in fact legal. Instead the server states the answer in its rejection —
`API-204` with `reason: "guess_exceeds_max_win"` carries `allowedGuesses`, the guesses still playable
on the current value — and the UI locks the rest from that list (`SessionGame`). Same for
`reason: "impossible_guess"`, which the UI prevents up front from `cards`/`dice`/`faces` + `tieRule`.

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
| `dice-ladder` | higher/lower on the next dice sum | sums are **not** uniform (2d6: a 7 is six times likelier than a 2), so the same guess pays differently on every sum; right guess grows the multiplier, tie/wrong = loss | `config.maxWinBps` (chain ceiling, default 100×) — guesses that would overshoot it are rejected, the payout is never truncated |
| `pump` | pump again or cash out | each pump grows the multiplier; burst = loss | `growth^maxPumps` |
| `spin-tower-pro` | spin again or cash out — **each spin costs the stake again**, and the stake is locked from spin 1 | one outcome per spin: a tower climbs, a maxed tower pays its top multiplier as **secured** (FAIL-immune, paid at round end), joker climbs/secures everything, nothing, or FAIL (all levels to 0 and the round ends, or one level down and it continues). Cash-out from spin 1 pays **pot + secured**; the round ends at the latest at `maxSpins` | session return cap (`maxSessionReturnBps`) — the cap ends the round and pays out in full |
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
- **The stake is charged once per round — except `spin-tower-pro`, where every spin is charged.**
  Detect it via `engine.session?.costPerStep`, never by hardcoding the engine key.
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
