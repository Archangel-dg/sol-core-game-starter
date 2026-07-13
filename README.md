# Sol-Core Game Starter

The official, universal template for building a game on the **Sol-Core** platform. The hard parts —
security, money flow, provably-fair, error handling, session reconnect, on-chain deposits — are done.
You design the interface and (optionally) the result animation, set `.env`, and deploy.

Built with **Next.js (App Router) + TypeScript + Tailwind**. Deployable on Vercel in minutes.

## Deploy without code

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FArchangel-dg%2Fsol-core-game-starter&env=SOLCORE_API_KEY,SOLCORE_GAME_ID,NEXT_PUBLIC_GAME_NAME,NEXT_PUBLIC_ENGINE,NEXT_PUBLIC_MECHANIC&envDescription=Values%20from%20your%20Sol-Core%20dashboard%20(create%20game%20%E2%86%92%20key%20card)&envLink=https%3A%2F%2Fsol-core.com%2Fhow-to-use%3Fstep%3D3%26path%3Deasy&project-name=my-sol-core-game)

No terminal needed: create your game in the [Sol-Core dashboard](https://sol-core.com/dashboard)
(gives you the 5 values), click the button, paste, deploy. Guided walkthrough:
[sol-core.com/how-to-use](https://sol-core.com/how-to-use?step=0&path=easy).
Optional re-skin: add `NEXT_PUBLIC_ACCENT_COLOR=#RRGGBB` in Vercel → Environment Variables.

> This template is part of the **Sol-Core DevKit**. The governing rules live in the kit's
> `spec/constitution.md`; the canonical addresses/values live in `spec/canonical-config.md`. This
> template is self-contained once forked — its own `docs/` restate the contract you must keep.

## Quick start

```bash
npm install

# Get a throwaway GAME_ID + API key on devnet (dev only):
node scripts/create-test-game.mjs        # prints SOLCORE_GAME_ID + SOLCORE_API_KEY

cp .env.example .env                      # paste those values, pick your engine
npm run check                             # verify wiring: health → catalog → test bet
npm run dev                               # http://localhost:3000
```

For a real game, register at [sol-core.com](https://sol-core.com), create a game, and paste the
`GAME_ID` + one-time API key it gives you.

## The deal (read `docs/RULES.md`)

- **Outcomes come only from Sol-Core.** This repo never rolls, computes payouts, or caches results.
- **`SOLCORE_API_KEY` is server-only.** All Sol-Core calls go through `src/app/api/*`. No secret ever
  gets a `NEXT_PUBLIC_` prefix; the browser only calls your own `/api/*` routes.
- **Money is lamport-strings/`bigint`** (1 SOL = 1e9), never floats — use `src/lib/lamports.ts`.
- **Handle every `API-xxx` error** via `src/lib/errors.ts`; respect `devMock`; honor session rules;
  never self-bet; keep provably-fair visible; be responsible by construction.

## What you may and may not touch

- **Design zone (edit freely):** `src/app/page.tsx`, `src/app/globals.css`, `tailwind.config.ts`,
  and the components `ResultView`, `SingleBetGame`, `SessionGame`, `EngineControls`,
  `FairnessPanel`, `History`, `BalanceBar`.
- **System contract (do not edit):** `src/app/api/*`, `src/lib/{solcore,config,lamports,errors,engines,player-program}.ts`,
  `src/components/Providers.tsx`. These carry a do-not-edit / system-contract marker and preserve
  the contract with the server.

## Docs (in this repo)

- `docs/RULES.md` — the golden rules (never violate).
- `docs/API-REFERENCE.md` — endpoints, params, error codes (the system contract).
- `docs/ENGINES.md` — engines, mechanics, params.
- `docs/DEPLOY.md` — deploy to Vercel.
- `docs/CUSTOMIZE.md` — the design zone and how to build a custom result view.
- `CLAUDE.md` / `AGENTS.md` — rules for AI assistants working in this repo.

## Before every commit

`npm run typecheck` and `npm run build` must pass. For behavior changes, also run `npm run check`
against your configured backend.

> Note: some inline code comments in the system-contract files are in German (this template
> originated in a German-language project). They are internal to files you should not edit; the
> developer-facing docs and rules are English.
