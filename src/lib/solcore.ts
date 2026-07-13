// ⚠ Nicht ändern — Systemvertrag.
// Server-Client für die Sol-Core Gaming-API. Fügt den geheimen X-API-Key hinzu.
// Wird NUR aus Route-Handlern (app/api/*) aufgerufen — nie aus dem Browser.
import { serverConfig } from './config';

interface ApiErrorBody {
  error?: { code?: string; message?: string; details?: unknown };
}

export class SolcoreError extends Error {
  code: string;
  status: number;
  constructor(code: string, status: number, message?: string) {
    super(message ?? code);
    this.code = code;
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const cfg = serverConfig();
  const res = await fetch(`${cfg.apiUrl}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      'x-api-key': cfg.apiKey,
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  });
  const body = (await res.json().catch(() => ({}))) as T & ApiErrorBody;
  if (!res.ok) {
    throw new SolcoreError(body.error?.code ?? 'API-500', res.status, body.error?.message);
  }
  return body;
}

/** Health (öffentlich): devMock-Flag steuert, ob Geld-UI angezeigt wird. */
export async function health(): Promise<{ devMock: boolean; network: string }> {
  const cfg = serverConfig();
  const res = await fetch(`${cfg.apiUrl}/health`, { cache: 'no-store' });
  return (await res.json()) as { devMock: boolean; network: string };
}

export interface BetResult {
  roundId: string;
  result: {
    win: boolean;
    roll: number | null;
    multiplierBps: number;
    payoutLamports: string;
    details: Record<string, unknown>;
  };
  proof: { serverSeedHash: string; clientSeed: string; nonce: number };
  fees: {
    platformFeeLamports: string;
    treasuryLamports: string;
    privateLamports: string;
    creatorFeeLamports: string;
    totalChargeLamports: string;
  };
}

export function placeBet(input: {
  gameId: string;
  playerWallet: string;
  betLamports: string;
  params: Record<string, unknown>;
  clientSeed?: string;
}): Promise<BetResult> {
  return request<BetResult>('/api/game/bet', { method: 'POST', body: JSON.stringify(input) });
}

export function getBalance(wallet: string): Promise<{ devMock: boolean; balanceLamports: string | null }> {
  return request(`/api/game/balance/${wallet}`);
}

export function withdraw(playerWallet: string, amountLamports: string): Promise<{ signature: string | null }> {
  return request('/api/game/withdraw', {
    method: 'POST',
    body: JSON.stringify({ playerWallet, amountLamports }),
  });
}

// ── Session-Schicht (progressive Spiele: mines/hilo/towers/pump) ────────────

export interface SessionView {
  sessionId: string;
  gameId: string;
  mode: string;
  status: 'active' | 'busted' | 'cashed_out';
  steps: number;
  multiplierBps: number;
  potentialPayoutLamports: string;
  proof: { serverSeedHash: string; clientSeed: string; nonce: number };
  progress: Record<string, unknown>;
  // nur bei Ende:
  roundId?: string;
  payoutLamports?: string;
  serverSeed?: string;
  reveal?: Record<string, unknown>;
  capped?: boolean;
}

export function sessionStart(input: {
  gameId: string;
  playerWallet: string;
  betLamports: string;
  clientSeed?: string;
}): Promise<SessionView> {
  return request<SessionView>('/api/game/session/start', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function sessionGet(id: string): Promise<SessionView> {
  return request<SessionView>(`/api/game/session/${id}`);
}

export function sessionStep(id: string, body: Record<string, unknown>): Promise<SessionView> {
  return request<SessionView>(`/api/game/session/${id}/step`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function sessionCashout(id: string): Promise<SessionView> {
  return request<SessionView>(`/api/game/session/${id}/cashout`, { method: 'POST' });
}
