# Project rules for Claude (Sol-Core Game Starter)

This is the **official copyable template** for Sol-Core platform games. When you (Claude) work in
this repo, follow these rules and the linked documents strictly.

> If this template sits inside the Sol-Core DevKit, the kit's `spec/constitution.md` governs and is
> the source of truth. This file restates the parts you need so the template is safe on its own once
> forked.

## What this project is

A Next.js (App Router) + TypeScript + Tailwind game frontend that runs against the Sol-Core Gaming
API. All engines are supported; the active engine comes from `NEXT_PUBLIC_ENGINE` +
`NEXT_PUBLIC_MECHANIC`.

## Binding documents (always honor)

- `docs/RULES.md` — the golden rules (never violate).
- `docs/API-REFERENCE.md` — the endpoint/params/error system contract.
- `docs/ENGINES.md` — engines, mechanics, params.
- `docs/CUSTOMIZE.md` — what is the design zone and what is off-limits.

## Hard boundaries (system contract — do not rebuild)

`src/app/api/*`, `src/lib/solcore.ts`, `src/lib/config.ts`, `src/lib/lamports.ts`,
`src/lib/errors.ts`, `src/lib/engines.ts`, `src/lib/player-program.ts`, `src/components/Providers.tsx`.

These carry a do-not-edit / system-contract marker (`// ⚠ Nicht ändern — Systemvertrag`). Change
them only if the user explicitly asks and you are certain the contract with the server is preserved.

## Core invariants

1. The API key stays server-side (only `app/api/*`). Never `NEXT_PUBLIC_` for secrets.
2. Results come from the server — never roll or pay out on the client.
3. Money = lamport-strings/`bigint` (1 SOL = 1e9), never `number`.
4. Every `API-xxx` error is handled through `lib/errors.ts`.
5. `devMock: true` ⇒ hide the money UI.
6. Keep provably-fair visible; honor session rules; never self-bet; be responsible by construction.

## Tasks that are safe

- Change design/styling; build the result animation (in `ResultView` or a replacement with the same
  props).
- Add purely visual components in the design zone.
- Adjust copy/language.

## Before every commit

`npm run typecheck` and `npm run build` must pass. For behavior changes, also `npm run check`
against the configured backend.

## If a request conflicts with these rules

Refuse and propose a compliant alternative. Exposing the key client-side, faking a result, adding
near-miss effects, or making withdrawal harder than deposit are out of bounds.
