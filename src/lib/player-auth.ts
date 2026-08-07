'use client';
// ⚠ Nicht ändern — Systemvertrag.
//
// Spieler-Autorisierung im Browser.
//
// Warum: Der Game-API-Key identifiziert nur das SPIEL. Ohne zusätzlichen
// Spieler-Nachweis müsste der Server glauben, welche Wallet im Request-Body
// steht — jeder könnte damit fremdes Guthaben verwetten. Deshalb signiert die
// Wallet einmalig eine kanonische Nachricht und bekommt dafür ein
// kurzlebiges Token (15 Minuten), das an (Wallet, Spiel) gebunden ist.
//
// Ablauf (der API-Key verlässt nie den Server):
//   Browser  GET  /api/authorize?wallet=…      → { message }
//   Browser  signMessage(message)              → Signatur (Wallet-Popup)
//   Browser  POST /api/authorize {…}           → { token, expiresAt }
//   Browser  POST /api/play  + Authorization: Bearer <token>
//            └ eigene Route hängt X-API-Key an und reicht das Token weiter
//
// `moneyFetch` kapselt das komplett: Token besorgen (oder erneuern), Anfrage
// senden, und bei `API-402` (Token abgelaufen/ungültig) EINMAL neu autorisieren
// und wiederholen.

import { useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import bs58 from 'bs58';

/** Geparste JSON-Antwort der eigenen Route — wie bisher `res.json()`:
 * entweder die Nutzdaten oder `{ error: { code, message, … } }`. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JsonResponse = any;

/** Signierfunktion der Wallet (Wallet-Adapter). Nicht jede Wallet kann das. */
type SignMessage = (message: Uint8Array) => Promise<Uint8Array>;

/** Token im Speicher (NICHT localStorage — es ist ein Geld-Schlüssel und soll
 * mit dem Tab enden). Immer nur eines: eine Seite = eine Wallet = ein Spiel. */
let cached: { wallet: string; token: string; expiresAt: number } | null = null;

/** Sicherheitsabstand: kurz vor Ablauf lieber neu holen, damit ein Request
 * nicht auf halbem Weg ungültig wird. */
const RENEW_MARGIN_MS = 30_000;

/** Verwirft das gespeicherte Token (z. B. nach `API-402` oder Wallet-Wechsel). */
export function clearPlayerToken(): void {
  cached = null;
}

async function authorize(wallet: string, signMessage: SignMessage): Promise<string> {
  // 1. Der eigene Server baut die Nachricht — nur er kennt die gameId.
  const challenge: JsonResponse = await fetch(
    `/api/authorize?wallet=${encodeURIComponent(wallet)}`,
  ).then((r) => r.json());
  if (challenge?.error || typeof challenge?.message !== 'string') {
    throw new Error(challenge?.error?.message ?? 'Autorisierung nicht möglich.');
  }
  // 2. Wallet signiert (Popup). Nutzer-Abbruch wirft — der Aufrufer zeigt das an.
  const signature = await signMessage(new TextEncoder().encode(challenge.message));
  // 3. Signatur gegen Token tauschen (base58 wie überall bei Solana).
  const res: JsonResponse = await fetch('/api/authorize', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      wallet,
      message: challenge.message,
      signature: bs58.encode(signature),
    }),
  }).then((r) => r.json());
  if (res?.error || typeof res?.token !== 'string') {
    throw new Error(res?.error?.message ?? 'Autorisierung abgelehnt.');
  }
  // expiresAt kommt in MILLISEKUNDEN vom Server.
  cached = { wallet, token: res.token, expiresAt: Number(res.expiresAt) };
  return cached.token;
}

async function ensureToken(wallet: string, signMessage: SignMessage): Promise<string> {
  if (cached && cached.wallet === wallet && cached.expiresAt - RENEW_MARGIN_MS > Date.now()) {
    return cached.token;
  }
  return authorize(wallet, signMessage);
}

/**
 * Liefert `moneyFetch` — der EINZIGE Weg, eine Geld-Route dieser App
 * aufzurufen (Bet, Session-Start/Step/Cashout, Turnier, Live-Bet, Auszahlung).
 * Rückgabe ist das geparste JSON wie bisher; Fehler beim Autorisieren (Wallet
 * kann nicht signieren, Nutzer bricht ab) werden geworfen.
 */
export function usePlayerAuth() {
  const { publicKey, signMessage } = useWallet();

  const moneyFetch = useCallback(
    async (path: string, body?: unknown): Promise<JsonResponse> => {
      const wallet = publicKey?.toBase58();
      if (!wallet) throw new Error('Wallet nicht verbunden.');
      if (!signMessage) {
        throw new Error('Diese Wallet kann keine Nachrichten signieren — andere Wallet wählen.');
      }
      const send = async (token: string): Promise<JsonResponse> =>
        fetch(path, {
          method: 'POST',
          headers: {
            ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
            authorization: `Bearer ${token}`,
          },
          body: body !== undefined ? JSON.stringify(body) : undefined,
        }).then((r) => r.json());

      const res = await send(await ensureToken(wallet, signMessage));
      // API-402 = Token fehlt/abgelaufen/passt nicht (lib/errors.ts: 'lock').
      // Genau EIN Neuversuch mit frischem Token; scheitert der auch, geht der
      // Fehler normal an die UI.
      if (res?.error?.code === 'API-402') {
        clearPlayerToken();
        return send(await authorize(wallet, signMessage));
      }
      return res;
    },
    [publicKey, signMessage],
  );

  // `authFetch` — der GET-Zwilling von `moneyFetch`: eine LESENDE Route, die
  // trotzdem an (Wallet, Spiel) gebunden ist (z. B. der mitgliedschafts-geprüfte
  // PvP-Lobby-Raum-State GET /api/pvp/lobby/:id). Trägt dasselbe Bearer-Token
  // (aus dem Cache, nur bei Ablauf neu signiert) und macht denselben EINEN
  // API-402-Neuversuch. Verändert das bestehende moneyFetch-Verhalten nicht.
  const authFetch = useCallback(
    async (path: string): Promise<JsonResponse> => {
      const wallet = publicKey?.toBase58();
      if (!wallet) throw new Error('Wallet nicht verbunden.');
      if (!signMessage) {
        throw new Error('Diese Wallet kann keine Nachrichten signieren — andere Wallet wählen.');
      }
      const send = async (token: string): Promise<JsonResponse> =>
        fetch(path, { headers: { authorization: `Bearer ${token}` } }).then((r) => r.json());
      const res = await send(await ensureToken(wallet, signMessage));
      if (res?.error?.code === 'API-402') {
        clearPlayerToken();
        return send(await authorize(wallet, signMessage));
      }
      return res;
    },
    [publicKey, signMessage],
  );

  return { moneyFetch, authFetch };
}
