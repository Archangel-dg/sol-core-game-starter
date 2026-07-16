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
  /** Maschinenlesbarer Grund aus den API-Details (z. B. 'bankroll_cap'). */
  reason?: string;
  constructor(code: string, status: number, message?: string, reason?: string) {
    super(message ?? code);
    this.code = code;
    this.status = status;
    this.reason = reason;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const cfg = serverConfig();
  const res = await fetch(`${cfg.apiUrl}${path}`, {
    ...init,
    headers: {
      // content-type nur bei tatsächlichem Body — sonst lehnen strikte Server
      // (Fastify) einen leeren application/json-Body ab (z. B. bodyloser Cashout).
      ...(init?.body != null ? { 'content-type': 'application/json' } : {}),
      'x-api-key': cfg.apiKey,
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  });
  const body = (await res.json().catch(() => ({}))) as T & ApiErrorBody;
  if (!res.ok) {
    const details = body.error?.details as { reason?: unknown } | undefined;
    const reason = typeof details?.reason === 'string' ? details.reason : undefined;
    throw new SolcoreError(body.error?.code ?? 'API-500', res.status, body.error?.message, reason);
  }
  return body;
}

/** Health (öffentlich): devMock-Flag steuert, ob Geld-UI angezeigt wird. */
export async function health(): Promise<{ devMock: boolean; network: string }> {
  const cfg = serverConfig();
  const res = await fetch(`${cfg.apiUrl}/health`, { cache: 'no-store' });
  return (await res.json()) as { devMock: boolean; network: string };
}

/** Aufgelöste Engine-Config des registrierten Spiels (z. B. towers columns). */
export interface GameConfigInfo {
  gameId: string;
  mode: string;
  engineConfig: Record<string, number>;
}

/** GET /api/game/config — die UI rendert exakt die Auswahl, die der Server
 * akzeptiert. Wirft bei alten API-Ständen (404) — Aufrufer fangen das ab. */
export function gameConfig(): Promise<GameConfigInfo> {
  return request<GameConfigInfo>('/api/game/config');
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
  /** Aufgelöste Engine-Dimensionen (fehlt bei alten API-Ständen). */
  engine?: { mode: string; config: Record<string, number> };
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

// ── Turnier-Schicht (Pot-basierte Highscore-Läufe: gauntlet) ────────────────

export interface TournamentCycleInfo {
  gameId: string;
  cycle: {
    cycleId: string;
    cycleNo: string;
    status: string;
    startsAt: string;
    endsAt: string;
    potLamports: string;
    entriesCount: number;
    playersCount: number;
    entryFeeLamports: string;
    /** was der Spieler tatsächlich zahlt (Einsatz + Fees on top). */
    totalChargeLamports: string;
    payoutSplitBps: number[];
    maxAttemptsPerCycle: number | null;
    maxSteps: number;
  } | null;
}

export interface TournamentLeaderboardEntry {
  rank: number;
  wallet: string;
  bestScore: number;
  achievedAt: string;
  attempts: number;
}

export interface TournamentRunView {
  runId: string;
  gameId: string;
  mode: string;
  status: 'active' | 'busted' | 'stopped' | 'expired';
  steps: number;
  maxSteps: number;
  score: number;
  history: { step: number; risk: string; roll: number; survived: boolean; points: number }[];
  proof: { serverSeedHash: string; clientSeed: string; nonce: number };
  engine: { mode: string; config: Record<string, number> };
  cycle: { cycleId: string; cycleNo: string; endsAt: string; potLamports: string; entriesCount: number };
  /** nur bei beendetem Lauf. */
  serverSeed?: string;
  bestScore?: number;
}

export function tournamentCycle(): Promise<TournamentCycleInfo> {
  return request<TournamentCycleInfo>('/api/game/tournament/cycle');
}

export function tournamentLeaderboard(limit = 50): Promise<{ cycleId: string | null; leaderboard: TournamentLeaderboardEntry[] }> {
  return request(`/api/game/tournament/leaderboard?limit=${limit}`);
}

export function tournamentMe(wallet: string): Promise<{
  cycleId: string | null;
  attempts: number;
  bestScore: number;
  rank: number | null;
  activeRunId: string | null;
}> {
  return request(`/api/game/tournament/me/${wallet}`);
}

export function tournamentEnter(input: {
  playerWallet: string;
  clientSeed?: string;
}): Promise<TournamentRunView> {
  return request<TournamentRunView>('/api/game/tournament/enter', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function tournamentRun(id: string): Promise<TournamentRunView> {
  return request<TournamentRunView>(`/api/game/tournament/run/${id}`);
}

export function tournamentStep(id: string, risk: 'safe' | 'medium' | 'risky'): Promise<TournamentRunView> {
  return request<TournamentRunView>(`/api/game/tournament/run/${id}/step`, {
    method: 'POST',
    body: JSON.stringify({ risk }),
  });
}

export function tournamentStop(id: string): Promise<TournamentRunView> {
  return request<TournamentRunView>(`/api/game/tournament/run/${id}/stop`, { method: 'POST' });
}
