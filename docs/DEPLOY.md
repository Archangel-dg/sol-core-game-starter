# Deploy (Vercel)

Vercel is the easiest target (free, mobile-friendly). Any other Next.js platform works the same.

## Steps

1. Put this directory in its own GitHub repo and push.
2. On [vercel.com](https://vercel.com) → **New Project** → import the repo.
   - Template at repo root: nothing else to set.
   - Template in a subfolder: set **Root Directory** to that folder.
3. Set **Environment Variables** (from your `.env`):
   | Key | Value |
   |---|---|
   | `SOLCORE_API_URL` | Gaming API base URL (`https://api.sol-core.com`) |
   | `SOLCORE_API_KEY` | your game API key (**secret**) |
   | `SOLCORE_GAME_ID` | your game id |
   | `NEXT_PUBLIC_GAME_NAME` | display name |
   | `NEXT_PUBLIC_ENGINE` | e.g. `crash` |
   | `NEXT_PUBLIC_MECHANIC` | `single` or `session` |
   | `NEXT_PUBLIC_SOLANA_RPC` | `https://api.devnet.solana.com` |
   | `NEXT_PUBLIC_SOLANA_NETWORK` | `devnet` |
   | `NEXT_PUBLIC_PROGRAM_ID` | `8R7PfDa6FYVZdYgg7mGD8kfXNRN66M9VenLjP1t2qaoG` |
4. **Deploy** → you get a `https://…vercel.app` URL.
5. Register that URL as the game's URL in the **creator dashboard** — done.

## Test before deploy

```bash
npm install
npm run check      # self-test against your backend (health → catalog → test bet)
npm run dev        # locally on http://localhost:3000
```

## Notes

- The hosted Gaming service may have a **~30–50s cold start** after idle. The first action then
  takes longer — that's normal.
- To play for real, a player needs devnet SOL: **deposit** first (deposit button), then play. The
  creator wallet must not play its own game.
