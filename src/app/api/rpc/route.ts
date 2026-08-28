// ⚠ Nicht ändern — Systemvertrag.
// RPC-Durchreiche für die EINZAHLUNG: Der Browser spricht dieselbe Herkunft
// (/api/rpc), dieser Server spricht den Solana-RPC.
//
// WARUM ES DIESEN UMWEG GIBT (28.08.2026)
// Der öffentliche Standard-RPC sperrt JEDEN Browser aus: Jede Anfrage mit
// Origin-Header bekommt 403, egal von welcher Domain — nur Server-Anfragen
// ohne Origin sind erlaubt. Ein RPC-Schlüssel im Browser wiederum ist entweder
// domaingesperrt (403 auf jeder fremden Creator-Domain, genau daran scheiterte
// jede Einzahlung in allen neun gelisteten Spielen) oder ungeschützt für jeden
// aus dem Bundle abgreifbar. Der eigene Server ist der einzige Absender, der
// ohne Schlüssel UND ohne Freigabe-Liste durchkommt — und mit ihm funktioniert
// jedes Creator-Spiel auf jeder Domain, ohne Einrichtung.
//
// NUR die Methoden, die das Einzahlen braucht. Alles andere wird abgelehnt:
// Eine offene Durchreiche wäre ein anonymer RPC-Zugang für Fremde, und der
// fällt auf die IP-Limits DIESES Servers zurück.
import { NextResponse } from 'next/server';

const UPSTREAM = process.env.SOLANA_RPC_SERVER ?? 'https://api.mainnet-beta.solana.com';

const METHODEN = new Set([
  'getLatestBlockhash',
  'getRecentBlockhash', // Legacy-Name — ältere Wallet-Adapter fragen ihn noch
  'sendTransaction',
  'simulateTransaction', // Preflight mancher Wallets vor dem Senden
  'getSignatureStatuses', // Bestätigung per HTTP-Polling (kein WebSocket hier)
  'getBlockHeight',
]);

interface RpcAnfrage {
  id?: unknown;
  method?: unknown;
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { jsonrpc: '2.0', id: null, error: { code: -32700, message: 'parse error' } },
      { status: 400 },
    );
  }

  // web3.js bündelt Anfragen gelegentlich als Array — jede einzelne prüfen.
  const anfragen = (Array.isArray(body) ? body : [body]) as RpcAnfrage[];
  for (const a of anfragen) {
    const m = typeof a?.method === 'string' ? a.method : '';
    if (!METHODEN.has(m)) {
      return NextResponse.json(
        {
          jsonrpc: '2.0',
          id: a?.id ?? null,
          error: { code: -32601, message: `method not allowed here: ${m || '?'}` },
        },
        { status: 403 },
      );
    }
  }

  try {
    const res = await fetch(UPSTREAM, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      // Absichtlich OHNE Origin-Header — genau deshalb funktioniert es.
      cache: 'no-store',
    });
    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: { 'content-type': 'application/json' },
    });
  } catch (err) {
    return NextResponse.json(
      { jsonrpc: '2.0', id: null, error: { code: -32000, message: (err as Error).message } },
      { status: 502 },
    );
  }
}
