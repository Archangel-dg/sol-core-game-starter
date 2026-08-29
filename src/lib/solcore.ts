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

/**
 * @param playerToken Spieler-Token (aus `POST /api/game/authorize`). Pflicht
 *   auf allen Geld-Routen, sobald der Server im Modus `PLAYER_AUTH_MODE=enforce`
 *   läuft (Mainnet immer). Ohne Token identifiziert der Server den Spieler nur
 *   über das Body-Wallet — das lässt er nur auf Devnet im `warn`-Modus zu.
 */
async function request<T>(path: string, init?: RequestInit, playerToken?: string): Promise<T> {
  const cfg = serverConfig();
  const res = await fetch(`${cfg.apiUrl}${path}`, {
    ...init,
    headers: {
      // content-type nur bei tatsächlichem Body — sonst lehnen strikte Server
      // (Fastify) einen leeren application/json-Body ab (z. B. bodyloser Cashout).
      ...(init?.body != null ? { 'content-type': 'application/json' } : {}),
      'x-api-key': cfg.apiKey,
      ...(playerToken ? { authorization: `Bearer ${playerToken}` } : {}),
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

/** Health (öffentlich): devMock steuert, ob Geld-UI angezeigt wird. Das
 * Backend sendet devMock NUR, wenn es true ist (fehlend ⇒ false); network
 * ist kein Bestandteil von /health mehr (keine Betriebsdetails öffentlich). */
export async function health(): Promise<{ status?: string; devMock?: boolean }> {
  const cfg = serverConfig();
  const res = await fetch(`${cfg.apiUrl}/health`, { cache: 'no-store' });
  return (await res.json()) as { status?: string; devMock?: boolean };
}

// ── Spieler-Autorisierung (Bearer-Token für alle Geld-Routen) ──────────────
// Der API-Key identifiziert nur das SPIEL, nicht den Spieler — und er liegt in
// jedem Browser, der das Spiel lädt. Ohne Spieler-Token könnte damit jeder im
// Namen einer fremden Wallet wetten. Deshalb löst der Spieler einmalig per
// Wallet-Signatur ein kurzlebiges Token (15 min), das an (Wallet, Spiel)
// gebunden ist; es geht als `Authorization: Bearer …` auf jede Geld-Route mit.

/**
 * Die kanonische Nachricht, die das Spieler-Wallet signiert. Format ist
 * Systemvertrag mit dem Server — Zeitstempel in SEKUNDEN, max. 5 Minuten
 * Abweichung von der Serverzeit.
 */
export function canonicalPlayerAuthMessage(
  gameId: string,
  wallet: string,
  unixSeconds: number,
): string {
  return `sol-core:player-auth:v1:${gameId}:${wallet}:${unixSeconds}`;
}

/**
 * POST /api/game/authorize — tauscht die Wallet-Signatur gegen ein Token.
 * Die gameId steht bewusst NICHT im Body: der Server nimmt sie aus dem
 * API-Key-Kontext. `expiresAt` ist ein Unix-Timestamp in MILLISEKUNDEN.
 */
export function authorizePlayer(input: {
  wallet: string;
  message: string;
  signature: string;
}): Promise<{ token: string; expiresAt: number }> {
  return request('/api/game/authorize', { method: 'POST', body: JSON.stringify(input) });
}

/**
 * Liest das Spieler-Token aus dem `Authorization`-Header der Browser-Anfrage
 * an DIESE App. Die Route reicht es unverändert an Sol-Core weiter — der
 * API-Key kommt erst hier im Server dazu und bleibt server-seitig.
 */
export function playerTokenFrom(req: Request): string | undefined {
  const m = req.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i);
  return m?.[1]?.trim() || undefined;
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

export function placeBet(
  input: {
    gameId: string;
    playerWallet: string;
    betLamports: string;
    params: Record<string, unknown>;
    clientSeed?: string;
  },
  playerToken?: string,
): Promise<BetResult> {
  return request<BetResult>(
    '/api/game/bet',
    { method: 'POST', body: JSON.stringify(input) },
    playerToken,
  );
}

export function getBalance(wallet: string): Promise<{ devMock: boolean; balanceLamports: string | null }> {
  return request(`/api/game/balance/${wallet}`);
}

export function withdraw(
  playerWallet: string,
  amountLamports: string,
  playerToken?: string,
): Promise<{ signature: string | null }> {
  return request(
    '/api/game/withdraw',
    { method: 'POST', body: JSON.stringify({ playerWallet, amountLamports }) },
    playerToken,
  );
}

// ── Session-Schicht (progressive Spiele: mines/hilo/towers/pump) ────────────

export interface SessionView {
  sessionId: string;
  gameId: string;
  mode: string;
  status: 'active' | 'busted' | 'cashed_out';
  potentialPayoutLamports: string;
  proof: { serverSeedHash: string; clientSeed: string; nonce: number };
  /** Aufgelöste Engine-Dimensionen (fehlt bei alten API-Ständen). */
  engine?: { mode: string; config: Record<string, number> };
  // ── Klassische Session-Engines (mines/hilo/towers/pump/dice-ladder/steps) ──
  // OPTIONAL, weil `spin-tower-pro` eine ANDERE Antwortform auf denselben
  // Routen liefert: dort gibt es weder `progress` noch `steps` noch
  // `multiplierBps`. Das als Pflichtfeld zu tippen war der Grund, warum die
  // Turm-Anzeige still auf NaN und Stufe 0 lief — TypeScript hielt für sicher,
  // was zur Laufzeit fehlte. Immer mit Rückfall lesen.
  steps?: number;
  multiplierBps?: number;
  progress?: Record<string, unknown>;
  // ── Nur `spin-tower-pro` (session.costPerStep) — alles OBERSTE EBENE ──────
  /** Aktuelle Stufe je Turm (0 = Boden). */
  levels?: number[];
  /** Gezogene Ergebnisse der Runde, ein Eintrag je bezahltem Spin. */
  outcomes?: number[];
  /** Noch verlierbarer Pot in bps EINES Einsatzes (FAIL nimmt ihn). */
  potBps?: number;
  /** FAIL-immun gesichert, in bps eines Einsatzes — Auszahlung am Rundenende. */
  securedBps?: number;
  /** Was die Runde JETZT auszahlen würde, in bps eines Einsatzes (= Pot + Gesichertes). */
  returnBps?: number;
  /** Der für die Runde gesperrte Einsatz. */
  stakeLamports?: string;
  /** Einsatz + Fees je Spin — exakt der Betrag, den ein Spin abbucht. */
  totalChargePerSpinLamports?: string;
  /** Σ der bisher bezahlten Einsätze (ohne Fees). */
  totalStakedLamports?: string;
  /** Bezahlte Spins und der harte Spin-Deckel der Runde. */
  spins?: number;
  maxSpins?: number;
  // nur bei Ende:
  roundId?: string;
  payoutLamports?: string;
  serverSeed?: string;
  reveal?: Record<string, unknown>;
  capped?: boolean;
}

/**
 * Pay-per-Spin-Handschlag (`spin-tower-pro`).
 *
 * Der Server öffnet eine Runde dieser Engines NUR, wenn der Client mitschickt,
 * dass er das Kostenmodell kennt — jeder Spin kostet erneut den vollen Einsatz.
 * Fehlt die Zeichenkette, kommt `API-204 protocol_handshake_required`.
 *
 * Fail-closed ist hier richtig: Ein Client, der Schritte für gratis hält,
 * verklickt fremdes Geld. Der Preis dafür ist, dass diese eine Zeichenkette
 * NIE fehlen darf — vom 29.08.2026 bis zum Fix konnte kein einziges
 * spin-tower-pro-Spiel aus dieser Vorlage eine Runde starten, weil sie hier
 * fehlte. `npm run check:contract`, Abschnitt 8, prüft das jetzt.
 */
export const SPIN_TOWER_PROTOCOL = 'spin-tower/1';

export function sessionStart(
  input: {
    gameId: string;
    playerWallet: string;
    betLamports: string;
    clientSeed?: string;
    /** Nur `spin-tower-pro`: siehe SPIN_TOWER_PROTOCOL. */
    protocol?: string;
  },
  playerToken?: string,
): Promise<SessionView> {
  return request<SessionView>(
    '/api/game/session/start',
    { method: 'POST', body: JSON.stringify(input) },
    playerToken,
  );
}

export function sessionGet(id: string): Promise<SessionView> {
  return request<SessionView>(`/api/game/session/${id}`);
}

export function sessionStep(
  id: string,
  body: Record<string, unknown>,
  playerToken?: string,
): Promise<SessionView> {
  return request<SessionView>(
    `/api/game/session/${id}/step`,
    { method: 'POST', body: JSON.stringify(body) },
    playerToken,
  );
}

export function sessionCashout(id: string, playerToken?: string): Promise<SessionView> {
  return request<SessionView>(`/api/game/session/${id}/cashout`, { method: 'POST' }, playerToken);
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

export function tournamentEnter(
  input: {
    playerWallet: string;
    clientSeed?: string;
  },
  playerToken?: string,
): Promise<TournamentRunView> {
  return request<TournamentRunView>(
    '/api/game/tournament/enter',
    { method: 'POST', body: JSON.stringify(input) },
    playerToken,
  );
}

export function tournamentRun(id: string): Promise<TournamentRunView> {
  return request<TournamentRunView>(`/api/game/tournament/run/${id}`);
}

export function tournamentStep(
  id: string,
  risk: 'safe' | 'medium' | 'risky',
  playerToken?: string,
): Promise<TournamentRunView> {
  return request<TournamentRunView>(
    `/api/game/tournament/run/${id}/step`,
    { method: 'POST', body: JSON.stringify({ risk }) },
    playerToken,
  );
}

export function tournamentStop(id: string, playerToken?: string): Promise<TournamentRunView> {
  return request<TournamentRunView>(
    `/api/game/tournament/run/${id}/stop`,
    { method: 'POST' },
    playerToken,
  );
}

// ── Demo-Modus (simulierter Saldo 3 SOL, echt verifiziert, kein Geldfluss) ──
// Spiegelt die echten Endpunkte 1:1 unter /api/game/demo/*. Kein Solana-Wallet
// nötig — die Demo-Wallet ist eine server-generierte ID mit simuliertem Saldo.

export interface DemoStart {
  demoWallet: string;
  balanceLamports: string;
  startLamports: string;
}
export function demoStart(): Promise<DemoStart> {
  return request<DemoStart>('/api/game/demo/start', { method: 'POST', body: JSON.stringify({}) });
}
export function demoBalance(wallet: string): Promise<{ wallet: string; balanceLamports: string; rounds: number }> {
  return request(`/api/game/demo/balance/${wallet}`);
}

export function demoBet(input: {
  gameId: string;
  playerWallet: string;
  betLamports: string;
  params: Record<string, unknown>;
  clientSeed?: string;
}): Promise<BetResult & { balanceLamports: string; demo: true }> {
  return request('/api/game/demo/bet', { method: 'POST', body: JSON.stringify(input) });
}

export function demoSessionStart(input: {
  gameId: string;
  playerWallet: string;
  betLamports: string;
  clientSeed?: string;
  /** Nur `spin-tower-pro`: siehe SPIN_TOWER_PROTOCOL. Der Demo-Pfad verlangt
   * denselben Handschlag — er läuft durch denselben Flow. */
  protocol?: string;
}): Promise<SessionView> {
  return request<SessionView>('/api/game/demo/session/start', { method: 'POST', body: JSON.stringify(input) });
}
export function demoSessionGet(id: string): Promise<SessionView> {
  return request<SessionView>(`/api/game/demo/session/${id}`);
}
export function demoSessionStep(id: string, body: Record<string, unknown>): Promise<SessionView> {
  return request<SessionView>(`/api/game/demo/session/${id}/step`, { method: 'POST', body: JSON.stringify(body) });
}
export function demoSessionCashout(id: string): Promise<SessionView> {
  return request<SessionView>(`/api/game/demo/session/${id}/cashout`, { method: 'POST' });
}

/** Turnier-Demo ist ein Übungslauf (kein Pot/Leaderboard) — eigene Form. */
export interface DemoRunView {
  runId: string;
  gameId: string;
  mode: string;
  status: 'active' | 'busted' | 'stopped';
  steps: number;
  maxSteps: number;
  score: number;
  history: { step: number; risk: string; roll: number; survived: boolean; points: number }[];
  proof: { serverSeedHash: string; clientSeed: string; nonce: number };
  engine: { mode: string; config: Record<string, number> };
  balanceLamports: string;
  serverSeed?: string;
  demo: true;
}
export function demoTournamentEnter(input: { playerWallet: string; clientSeed?: string }): Promise<DemoRunView> {
  return request<DemoRunView>('/api/game/demo/tournament/enter', { method: 'POST', body: JSON.stringify(input) });
}
export function demoTournamentRun(id: string): Promise<DemoRunView> {
  return request<DemoRunView>(`/api/game/demo/tournament/run/${id}`);
}
export function demoTournamentStep(id: string, risk: 'safe' | 'medium' | 'risky'): Promise<DemoRunView> {
  return request<DemoRunView>(`/api/game/demo/tournament/run/${id}/step`, { method: 'POST', body: JSON.stringify({ risk }) });
}
export function demoTournamentStop(id: string): Promise<DemoRunView> {
  return request<DemoRunView>(`/api/game/demo/tournament/run/${id}/stop`, { method: 'POST' });
}

// ── Live-Schicht (geteilte Wettrunden auf Operator-Streams: live-odds) ──────

export interface LiveOutcomeInfo {
  index: number;
  label: string;
  oddsBps: number;
  weight: number;
}

export interface LiveRoundInfo {
  roundId: string;
  streamId: string;
  roundNo: string;
  status: 'betting' | 'drawing' | 'revealing' | 'settled' | 'void';
  opensAt: string;
  locksAt: string;
  revealsUntil: string | null;
  settledAt: string | null;
  serverSeedHash: string;
  clientSeed: string;
  entropyMix: string | null;
  outcomes: LiveOutcomeInfo[];
  revealSeconds: number;
  intermissionSeconds: number;
  betsCount: number;
  betLamportsTotal: string;
  /** Erst ab Status `revealing` gefüllt — vorher strukturell null. */
  result: {
    outcomeIndex: number;
    roll: number | null;
    serverSeed: string | null;
    payoutLamportsTotal: string;
  } | null;
}

export interface LiveStateInfo {
  stream: {
    id: string;
    slug: string;
    displayName: string;
    bettingModel: string;
    status: string;
    outcomes: LiveOutcomeInfo[];
    bettingSeconds: number;
    revealSeconds: number;
    intermissionSeconds: number;
    maxBetLamports: string | null;
    maxBetsPerPlayer: number;
  };
  round: LiveRoundInfo | null;
  lastRound: LiveRoundInfo | null;
  nextOpensAt: string | null;
  /** Server-Uhr — Basis des Clock-Offsets für alle Countdowns. */
  serverTime: string;
}

export interface LiveBetView {
  betId: string;
  roundId: string;
  roundNo: string;
  outcomeIndex: number;
  oddsBps: number;
  betLamports: string;
  potentialPayoutLamports: string;
  payoutLamports: string;
  status: string;
  locksAt: string;
  proof: { serverSeedHash: string; clientSeed: string; nonce: number };
  fees: {
    platformFeeLamports: string;
    treasuryLamports: string;
    privateLamports: string;
    creatorFeeLamports: string;
    totalChargeLamports: string;
  };
}

export interface LiveMyBets {
  roundId: string | null;
  bets: {
    betId: string;
    roundId: string;
    outcomeIndex: number;
    oddsBps: number;
    betLamports: string;
    potentialPayoutLamports: string;
    payoutLamports: string;
    status: string;
    createdAt: string;
    settledAt: string | null;
  }[];
  totalBetLamports: string;
  totalPayoutLamports: string;
}

export function liveState(): Promise<LiveStateInfo> {
  return request<LiveStateInfo>('/api/game/live/state');
}

export function liveRecent(limit = 20): Promise<{
  streamId: string;
  results: { roundId: string; roundNo: string; outcomeIndex: number; roll: number | null; settledAt: string | null }[];
}> {
  return request(`/api/game/live/recent?limit=${limit}`);
}

export function liveBet(
  input: {
    playerWallet: string;
    roundId: string;
    outcomeIndex: number;
    betLamports: string;
  },
  playerToken?: string,
): Promise<LiveBetView> {
  return request<LiveBetView>(
    '/api/game/live/bet',
    { method: 'POST', body: JSON.stringify(input) },
    playerToken,
  );
}

export function liveMe(wallet: string, roundId?: string): Promise<LiveMyBets> {
  const q = roundId ? `?roundId=${encodeURIComponent(roundId)}` : '';
  return request<LiveMyBets>(`/api/game/live/me/${wallet}${q}`);
}

export function liveRound(roundId: string): Promise<LiveRoundInfo> {
  return request<LiveRoundInfo>(`/api/game/live/round/${roundId}`);
}

// ── Live-Crash-Schicht (geteilter Flug auf einem Stream: live-crash, Etappe 2 —
// NUR Spielgeld) ────────────────────────────────────────────────────────────
// state/round sind apiKeyAuth-only, Sekunden-Poll — Präzedenz `/live/state`.
// demo-bet/demo-cashout sind es EBENFALLS: der Server verlangt hier (noch)
// KEINE Spieler-Sitzung (Kommentar bei `/live-crash/*` in `routes/game.ts`:
// "NIE requirePlayerSession, sonst hängt der Client unter enforce, Vorfall
// c3a2f31"). Deshalb tragen die Funktionen unten bewusst KEIN `playerToken`-
// Argument und die Proxy-Routen rufen NICHT `moneyFetch` — anders als bei
// `/live/bet`. Etappe 3 (Echtgeld) macht demo-bet/-cashout zu Geld-Routen;
// erst dann bekommen Server-Route, Client-Funktion, Proxy-Route und
// Browser-Aufruf hier die Session-Bindung wie `liveBet`.

export interface CrashRoundView {
  roundId: string;
  streamId: string;
  roundNo: number;
  status: 'betting' | 'flying' | 'crashed' | 'settled' | 'void';
  opensAt: string;
  locksAt: string;
  takeoffAt: string | null;
  crashedAt: string | null;
  serverSeedHash: string;
  clientSeed: string;
  /** Erst ab `crashed`/`settled`. */
  serverSeed: string | null;
  crashMultiplierBps: number | null;
}

export interface CrashPlayerView {
  /** Gekürzt — die volle Wallet geht nie an fremde Spieler. */
  wallet: string;
  betLamports: string;
  /** Gesetzt, sobald der Spieler ausgestiegen ist. */
  cashoutMultiplierBps: number | null;
  status: 'placed' | 'cashed' | 'won' | 'lost';
}

export interface CrashStateView {
  stream: { id: string; displayName: string };
  round: CrashRoundView | null;
  players: CrashPlayerView[];
  curve: { doubleMs: number };
  /**
   * Der Deckel des Creators — die Obergrenze, bis zu der eine Wette DIESES
   * Spiels ausgezahlt wird. Der Server rechnet beim Cashout
   * `min(Kurvenstand, effectiveTargetBps(Deckel, Sicherheitsziel))`; ohne
   * diesen Wert könnte die Oberfläche nur den Kurvenstand behaupten und würde
   * bei niedrigem Deckel regelmäßig zu viel versprechen.
   *
   * Optional, weil ein Starter auch gegen einen älteren API-Stand laufen
   * kann; `ceilingBps: null` bedeutet „Deckel unbekannt" und die Anzeige
   * nennt dann keine Zahl (siehe `cashoutDisplayBps` in `lib/crash-math.ts`).
   */
  config?: { ceilingBps: number | null };
  /**
   * Echtgeld-Schalter der Engine (`platform_engines`), wie ihn der Server
   * gerade sieht.
   *
   * WARUM ER IM ZUSTAND STEHT UND NICHT IN DER ENV: Am 28.08.2026 meldete das
   * Dashboard zweimal „live-crash: Echtgeld an", während das ausgerollte Spiel
   * weiter die Spielgeld-Routen rief — eine Annahme im Bundle kann einem
   * Schalter im Betrieb nicht folgen. Das Spiel POLLT ihn deshalb und wählt
   * danach seine Routen; auseinanderlaufen ist damit ausgeschlossen.
   *
   * Optional: Gegen einen älteren API-Stand fehlt das Feld — fehlend zählt
   * als `false` (Spielgeld). Das ist die sichere Richtung.
   */
  realMoney?: boolean;
  /** Server-Uhr — Basis für die Kurven-Animation (siehe `crashServerTimeIso`). */
  serverTime: string;
}

export interface CrashDemoBetView {
  betId: string;
  reservedPayoutLamports: string;
}

export interface CrashDemoCashoutView {
  multiplierBps: number;
  payoutLamports: string;
}

/** Echtgeld-Einsatz: zusätzlich Gebühren und die Reservierung der Runde. */
export interface CrashBetView {
  betId: string;
  reservedPayoutLamports: string;
  totalChargeLamports?: string;
}

/** Zustand des Plattform-Flugs. Ohne streamId — es gibt genau einen (Etappe 2). */
export function liveCrashState(): Promise<CrashStateView> {
  return request<CrashStateView>('/api/game/live-crash/state');
}

export function liveCrashRound(roundId: string): Promise<CrashRoundView> {
  return request<CrashRoundView>(`/api/game/live-crash/round/${roundId}`);
}

/**
 * SPIELGELD-Einsatz (Übungsmodus). `gameId` ist ABSICHTLICH kein Feld: der
 * Server nimmt sie aus dem API-Key-Kontext (`req.game.id`), NIE aus dem Body.
 * Kein `playerToken`-Parameter: die Route ist apiKeyAuth-only.
 */
export function liveCrashDemoBet(body: {
  roundId: string;
  playerWallet: string;
  betLamports: string;
  safetyTargetBps?: number | null;
}): Promise<CrashDemoBetView> {
  return request<CrashDemoBetView>('/api/game/live-crash/demo-bet', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function liveCrashDemoCashout(body: {
  roundId: string;
  playerWallet: string;
}): Promise<CrashDemoCashoutView> {
  return request<CrashDemoCashoutView>('/api/game/live-crash/demo-cashout', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/**
 * ECHTGELD-Einsatz. `playerToken` ist PFLICHT — der Server nimmt die Wallet
 * aus der signierten Sitzung, NIE aus dem Body. Der Server lehnt mit API-206
 * ab, wenn der Echtgeld-Schalter der Engine aus ist; das Spiel fragt ihn
 * deshalb im Zustands-Poll (`realMoney`) und ruft die Route gar nicht erst
 * auf, solange er aus steht.
 */
export function liveCrashBet(
  body: {
    roundId: string;
    playerWallet: string;
    betLamports: string;
    safetyTargetBps?: number | null;
  },
  playerToken?: string,
): Promise<CrashBetView> {
  return request<CrashBetView>(
    '/api/game/live-crash/bet',
    { method: 'POST', body: JSON.stringify(body) },
    playerToken,
  );
}

export function liveCrashCashout(
  body: { roundId: string; playerWallet: string },
  playerToken?: string,
): Promise<CrashDemoCashoutView> {
  return request<CrashDemoCashoutView>(
    '/api/game/live-crash/cashout',
    { method: 'POST', body: JSON.stringify(body) },
    playerToken,
  );
}

// ── PvP-Schicht (Lobby → Ready-Check → Lock-Debit → Server-Draw: pvp-coinflip) ─
// Alle wallet-gebundenen Aktionen (create/join/leave/kick/ready/unready/stake/
// chat) tragen ein Spieler-Token (wie /bet). WICHTIG: `pvpLobbyState` ist
// EBENFALLS token-gebunden — der Lobby-Raum-State ist serverseitig
// mitgliedschafts-geprüft (Nicht-Mitglied ⇒ API-700); der Poll MUSS also das
// Token mitschicken. Die übrigen Reads (Lobby-Liste, Match, W/L, Verify) sind
// token-frei.

/** Aufgelöste PvP-Engine-Grenzen (publicEngineConfig-Echo): Lamports als
 * Strings, `allowPin` als 0/1, `playerCounts` als Zahlen-Array. */
export interface PvpEngineConfigView {
  minStakeLamports: string;
  maxStakeLamports: string;
  waitTimeSeconds: number;
  allowPin: 0 | 1;
  lobbyTtlSeconds: number;
  playerCounts: number[];
}

export interface PvpMember {
  wallet: string;
  seatNo: number;
  ready: boolean;
  isHost: boolean;
  joinedAt: string;
}

export interface PvpMatchSummary {
  matchId: string;
  status: string;
  drawAt: string | null;
  winnerSeat: number | null;
  settledAt: string | null;
}

/** Chat-Delta-Zeile. Hinweis: der Backend-`getLobbyState` liest den Chat zwar
 * (Cursor `?since=`), gibt ihn zur Zeit aber noch NICHT im State-Objekt zurück —
 * der Client konsumiert `chat` defensiv (leeres Array, bis das Backend das Feld
 * ergänzt). */
export interface PvpChatMessage {
  id: string;
  wallet: string;
  message: string;
  createdAt?: string;
  created_at?: string;
}

export interface PvpLobbyView {
  lobbyId: string;
  gameId: string;
  status: 'open' | 'full' | 'readying' | 'locked' | 'settled' | 'closed' | 'expired';
  hostWallet: string;
  stakeLamports: string;
  maxPlayers: number;
  hasPin: boolean;
  lastError: Record<string, unknown> | null;
  expiresAt: string;
  createdAt: string;
  members: PvpMember[];
  match: PvpMatchSummary | null;
  engineConfig: PvpEngineConfigView;
  serverTime: string;
  /** Optionaler Chat-Delta — siehe PvpChatMessage (Backend liefert es aktuell noch nicht). */
  chat?: PvpChatMessage[];
}

export interface PvpOpenLobby {
  lobbyId: string;
  hostWallet: string;
  stakeLamports: string;
  playersCurrent: number;
  playersMax: number;
  locked: boolean;
  ageSeconds: number;
  createdAt: string;
}

export interface PvpLobbiesView {
  lobbies: PvpOpenLobby[];
  serverTime: string;
}

/** Ein Ereignis im Dice-Duel-Zugverlauf (Replay + Anzeige). `ev` unterscheidet
 * den Typ; die übrigen Felder sind je nach `ev` gesetzt (roll/keep/bank/farkle/
 * timeout_lost). Werte sind Würfel-AUGEN (1..6), keine Indizes. */
export interface DiceDuelEventView {
  ev: 'roll' | 'keep' | 'bank' | 'farkle' | 'timeout_lost';
  seat?: 1 | 2;
  turn?: number;
  dice?: number[];
  keep?: number[];
  points?: number;
  hotDice?: boolean;
  turnScore?: number;
  seatScoreAfter?: number;
  forfeited?: number;
  auto?: boolean;
}

/** Live-Zustand eines Dice-Duel-Matches (Teil von PvpMatchView; bei Coin-Flip
 * null). `tableDice` sind die aufgelösten Augen (1..6) des aktuellen Wurfs —
 * NIE Roh-HMAC-Werte. `moveDeadline` treibt den Zug-Timer über den serverTime-
 * Offset; `keep` beim Zug ist die Liste der beiseitegelegten AUGEN. */
export interface DiceDuelView {
  format: 'quick3' | 'race10000';
  minBankPoints: number;
  targetScore: number;
  stage: 'regular' | 'closing' | 'sudden_death';
  activeSeat: 1 | 2 | null;
  turnNo: number;
  moveDeadline: string | null;
  phase: 'awaiting_move' | 'farkled';
  /** Bei phase==='farkled' (Ruhephase, ~3 s): der in diesem Zug verlorene
   * Punktestand — mitten im Zug die aufgelaufenen Zugpunkte, bei Eröffnungs-
   * Farkle 0. Sonst null. Nur zur Anzeige der Verlust-Enthüllung. */
  farkleLostScore: number | null;
  closingSeat: 1 | 2 | null;
  tableDice: number[];
  keptThisTurn: number[];
  turnScore: number;
  scores: { seat1: number; seat2: number };
  winnerSeat: number | null;
  matchOver: boolean;
  decisionLog: DiceDuelEventView[];
}

/** Ein Ereignis im Dice-Pro-Zugverlauf (Replay + Anzeige). `ev` unterscheidet
 * den Typ; die übrigen Felder sind je nach `ev` gesetzt (opener/roll/keep/score/
 * bank/bust/timeout_lost). Werte sind Würfel-AUGEN (1..faces), keine Indizes. */
export interface DiceProEventView {
  ev: 'opener' | 'roll' | 'keep' | 'score' | 'bank' | 'bust' | 'timeout_lost';
  seat?: 1 | 2;
  turn?: number;
  scope?: 'match' | 'sudden_death';
  dice?: number[];
  keep?: number[];
  points?: number;
  hotDice?: boolean;
  turnScore?: number;
  seatScoreAfter?: number;
  lost?: number;
  forfeited?: number;
  auto?: boolean;
}

/** Live-Zustand eines Dice-Pro-Matches (Teil von PvpMatchView; nur bei
 * pvp-dice-pro gesetzt, sonst null). Spiegelt den `dicePro`-Block des Servers.
 * `tableDice` sind die aufgelösten Augen (1..faces) des aktuellen Wurfs; die
 * Match-Regeln (template/scoreMode/winCondition/…) sind der beim Match-Start
 * eingefrorene Config-Snapshot. `moveDeadline` treibt den Zug-Timer über den
 * serverTime-Offset; `keep` beim Zug ist die Liste der beiseitegelegten AUGEN
 * (bei single-roll-compare ungenutzt → leeres Array). */
export interface DiceProView {
  template: 'single-roll-compare' | 'push-your-luck';
  scoreMode: 'sum' | 'high-die' | 'farkle';
  winCondition: 'highest-score' | 'first-to-target';
  diceCount: number;
  faces: number;
  targetScore: number;
  turnsPerSeat: number;
  lastLicks: number;
  minBankPoints: number;
  stage: 'regular' | 'closing' | 'sudden_death';
  activeSeat: 1 | 2 | null;
  turnNo: number;
  moveDeadline: string | null;
  phase: 'awaiting_opener' | 'awaiting_throw' | 'awaiting_move' | 'busted' | 'settled';
  /** Bei phase==='busted' (push-your-luck-Ruhephase): der in diesem Zug
   * verlorene Punktestand; sonst null. Nur zur Anzeige der Bust-Enthüllung. */
  farkleLostScore: number | null;
  closingSeat: 1 | 2 | null;
  closingTurnsLeft: number;
  tableDice: number[];
  keptThisTurn: number[];
  turnScore: number;
  throwsUsed: number;
  scores: { seat1: number; seat2: number };
  winnerSeat: number | null;
  matchOver: boolean;
  decisionLog: DiceProEventView[];
}

export interface PvpMatchView {
  matchId: string;
  lobbyId: string;
  gameId: string;
  status: 'locked' | 'staked' | 'playing' | 'drawing' | 'settled' | 'failed' | 'voided';
  stakeLamports: string;
  potLamports: string;
  totalChargeLamports: string;
  seats: { seat: number; wallet: string; staked: boolean }[];
  proof: { serverSeedHash: string; clientSeeds: (string | null)[]; compositeClientSeed: string; nonce: number };
  drawAt: string | null;
  lockedAt: string | null;
  settledAt: string | null;
  failReason: string | null;
  /** Nur bei pvp-dice-duel gesetzt (sonst null): der rundenbasierte Live-Zustand. */
  diceDuel?: DiceDuelView | null;
  /** Nur bei pvp-dice-pro gesetzt (sonst null): der rundenbasierte Live-Zustand. */
  dicePro?: DiceProView | null;
  result: { roll: number | null; winnerSeat: number; winnerWallet: string; payoutLamports: string } | null;
  serverTime: string;
}

export interface PvpStatsView {
  wallet: string;
  wins: number;
  losses: number;
  total: number;
  recent: {
    matchId: string;
    stakeLamports: string;
    opponent: string;
    win: boolean;
    winnerSeat: number | null;
    mySeat: number;
    settledAt: string | null;
  }[];
}

// ── Money/Wallet-Aktionen (Spieler-Token Pflicht) ──
export function pvpCreateLobby(
  input: { playerWallet: string; stakeLamports: string; pin?: string; clientSeed?: string },
  playerToken?: string,
): Promise<PvpLobbyView> {
  return request<PvpLobbyView>('/api/game/pvp/lobby', { method: 'POST', body: JSON.stringify(input) }, playerToken);
}

export function pvpJoin(
  lobbyId: string,
  input: { playerWallet: string; pin?: string; clientSeed?: string },
  playerToken?: string,
): Promise<PvpLobbyView> {
  return request<PvpLobbyView>(
    `/api/game/pvp/lobby/${lobbyId}/join`,
    { method: 'POST', body: JSON.stringify(input) },
    playerToken,
  );
}

export function pvpLeave(
  lobbyId: string,
  input: { playerWallet: string },
  playerToken?: string,
): Promise<{ left: boolean; dissolved: boolean }> {
  return request(`/api/game/pvp/lobby/${lobbyId}/leave`, { method: 'POST', body: JSON.stringify(input) }, playerToken);
}

export function pvpKick(
  lobbyId: string,
  input: { playerWallet: string; wallet: string },
  playerToken?: string,
): Promise<PvpLobbyView> {
  return request<PvpLobbyView>(
    `/api/game/pvp/lobby/${lobbyId}/kick`,
    { method: 'POST', body: JSON.stringify(input) },
    playerToken,
  );
}

export function pvpReady(
  lobbyId: string,
  input: { playerWallet: string; clientSeed?: string },
  playerToken?: string,
): Promise<PvpLobbyView> {
  return request<PvpLobbyView>(
    `/api/game/pvp/lobby/${lobbyId}/ready`,
    { method: 'POST', body: JSON.stringify(input) },
    playerToken,
  );
}

export function pvpUnready(
  lobbyId: string,
  input: { playerWallet: string },
  playerToken?: string,
): Promise<PvpLobbyView> {
  return request<PvpLobbyView>(
    `/api/game/pvp/lobby/${lobbyId}/unready`,
    { method: 'POST', body: JSON.stringify(input) },
    playerToken,
  );
}

export function pvpSetStake(
  lobbyId: string,
  input: { playerWallet: string; stakeLamports: string },
  playerToken?: string,
): Promise<PvpLobbyView> {
  return request<PvpLobbyView>(
    `/api/game/pvp/lobby/${lobbyId}/stake`,
    { method: 'POST', body: JSON.stringify(input) },
    playerToken,
  );
}

export function pvpChatPost(
  lobbyId: string,
  input: { playerWallet: string; message: string },
  playerToken?: string,
): Promise<{ id: string; createdAt: string }> {
  return request(`/api/game/pvp/lobby/${lobbyId}/chat`, { method: 'POST', body: JSON.stringify(input) }, playerToken);
}

/** Lobby-Raum-State (mitgliedschafts-geprüft ⇒ token-gebunden, nicht token-frei). */
export function pvpLobbyState(lobbyId: string, since?: string, playerToken?: string): Promise<PvpLobbyView> {
  const q = since ? `?since=${encodeURIComponent(since)}` : '';
  return request<PvpLobbyView>(`/api/game/pvp/lobby/${lobbyId}${q}`, undefined, playerToken);
}

// ── Reads (token-frei) ──
export function pvpLobbies(): Promise<PvpLobbiesView> {
  return request<PvpLobbiesView>('/api/game/pvp/lobbies');
}

export function pvpMatch(matchId: string): Promise<PvpMatchView> {
  return request<PvpMatchView>(`/api/game/pvp/match/${matchId}`);
}

export function pvpMe(wallet: string): Promise<PvpStatsView> {
  return request<PvpStatsView>(`/api/game/pvp/me/${wallet}`);
}

/**
 * Dice-Duel-Zug (pvp-dice-duel): setzt `keep` (Liste der beiseitegelegten AUGEN,
 * 1..6, min. 1) beiseite und würfelt danach neu (`action: 'roll'`) oder sichert
 * die Zugpunkte (`action: 'bank'`). Wallet-gebunden (Spieler-Token Pflicht wie
 * /bet) — nur der aktive Sitz darf ziehen. Rückgabe: die aktualisierte
 * Match-Sicht (mit `diceDuel`-Block). */
export function pvpMove(
  matchId: string,
  input: { playerWallet: string; keep: number[]; action: 'roll' | 'bank' },
  playerToken?: string,
): Promise<PvpMatchView> {
  return request<PvpMatchView>(
    `/api/game/pvp/match/${matchId}/move`,
    { method: 'POST', body: JSON.stringify(input) },
    playerToken,
  );
}

export function pvpVerify(matchId: string): Promise<Record<string, unknown>> {
  return request(`/api/game/pvp/verify/${matchId}`);
}

// ── PvP-Demo (Instant-Match gegen den Server-Bot, Sim-Balance, token-frei) ──
export interface DemoPvpView {
  matchId: string;
  gameId: string;
  mode: string;
  status: 'settled';
  demo: true;
  stakeLamports: string;
  totalChargeLamports: string;
  potLamports: string;
  seats: { seat: number; wallet: string }[];
  result: { roll: number; winnerSeat: number; win: boolean; payoutLamports: string };
  proof: {
    serverSeedHash: string;
    serverSeed: string;
    clientSeeds: string[];
    compositeClientSeed: string;
    nonce: number;
  };
  balanceLamports: string;
  engine: { mode: string; config: Record<string, unknown> };
  createdAt: string;
}

export function demoPvpPlay(input: {
  playerWallet: string;
  stakeLamports: string;
  clientSeed?: string;
}): Promise<DemoPvpView> {
  return request<DemoPvpView>('/api/game/demo/pvp/lobby', { method: 'POST', body: JSON.stringify(input) });
}

export function demoPvpMatch(id: string): Promise<DemoPvpView> {
  return request<DemoPvpView>(`/api/game/demo/pvp/match/${id}`);
}

/** PvP-Demo für pvp-dice-duel: rundenbasiert gegen den Server-Bot (Sim-Balance,
 * Seed sofort enthüllt). Struktur wie DemoPvpView, plus der `diceDuel`-Live-
 * Zustand; `status` kann 'playing' (Spieler ist am Zug) oder 'settled' sein. */
export interface DemoDiceDuelView {
  matchId: string;
  gameId: string;
  mode: string;
  status: 'playing' | 'settled';
  demo: true;
  stakeLamports: string;
  totalChargeLamports: string;
  potLamports: string;
  seats: { seat: number; wallet: string }[];
  diceDuel: DiceDuelView;
  result: { winnerSeat: number; win: boolean; payoutLamports: string } | null;
  proof: {
    serverSeedHash: string;
    serverSeed: string;
    clientSeeds: string[];
    compositeClientSeed: string;
    nonce: number;
  };
  balanceLamports: string;
  engine: { mode: string; config: Record<string, unknown> };
  createdAt: string;
}

/** Dice-Duel-Demo-Zug (gegen den Server-Bot): keep (Augen) + roll|bank. Kein
 * Token/echtes Geld — `playerWallet` identifiziert nur die Demo-Sitzung. */
export function demoPvpMove(
  matchId: string,
  input: { playerWallet: string; keep: number[]; action: 'roll' | 'bank' },
): Promise<DemoDiceDuelView> {
  return request<DemoDiceDuelView>(`/api/game/demo/pvp/match/${matchId}/move`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

/** PvP-Demo für pvp-dice-pro: rundenbasiert gegen den Server-Bot (Sim-Balance,
 * Seed sofort enthüllt). Struktur wie DemoDiceDuelView, aber mit dem `dicePro`-
 * Live-Zustand statt `diceDuel`; `status` ist 'playing' oder 'settled'. Die
 * bestehenden Demo-PvP-Proxy-Routen (/api/game/demo/pvp/*) sind engine-agnostisch
 * — der Server verzweigt nach game.mode, daher braucht es keine eigenen Funktionen,
 * nur diesen Rückgabetyp (der Client castet die Antwort entsprechend). */
export interface DemoDiceProView {
  matchId: string;
  gameId: string;
  mode: string;
  status: 'playing' | 'settled';
  demo: true;
  stakeLamports: string;
  totalChargeLamports: string;
  potLamports: string;
  seats: { seat: number; wallet: string }[];
  dicePro: DiceProView;
  result: { winnerSeat: number; win: boolean; payoutLamports: string } | null;
  proof: {
    serverSeedHash: string;
    serverSeed: string;
    clientSeeds: string[];
    compositeClientSeed: string;
    nonce: number;
  };
  balanceLamports: string;
  engine: { mode: string; config: Record<string, unknown> };
  createdAt: string;
}

// ── Aktuelle Einsatz-Grenzen ────────────────────────────────────────────────

/**
 * Was JETZT hoechstens gesetzt werden darf — und woran es liegt.
 *
 * Der Hoechsteinsatz ist keine feste Zahl aus der Spiel-Config: Er ist das
 * MINIMUM aus mehreren Grenzen, und die engste davon wechselt im Betrieb.
 * Vor allem die Solvenz-Grenze bewegt sich staendig — sie haengt an der
 * Pool-Groesse, und ein Spiel mit hohem Multiplikator stoesst schon bei
 * kleinen Einsaetzen daran (gemessen am 28.08.2026: Spiel- und Level-Grenze
 * je 50 SOL, tatsaechlich erlaubt waren 0,0365 SOL).
 *
 * Ohne diese Anzeige tippt ein Spieler eine Zahl ein, bekommt API-302 und
 * weiss nicht, welche Zahl denn ginge. `text` beantwortet genau das in einem
 * Satz; `limits` zeigt die einzelnen Grenzen fuer alle, die es genau wissen
 * wollen.
 */
export interface BetLimitsView {
  gameId: string;
  mode: string;
  /** Hoechster JETZT erlaubter Einsatz (Lamports, String). Kann '0' sein. */
  maxBetLamports: string;
  minBetLamports: string;
  /** Welche Grenze gerade bindet. */
  limitedBy: 'game' | 'level' | 'solvency' | 'single_payout' | 'daily_payout' | 'round';
  /** Der Grund als fertiger Satz — die Oberflaeche muss nichts uebersetzen. */
  text: string;
  limits: {
    gameLamports: string;
    levelLamports: string;
    solvencyLamports: string | null;
    singlePayoutLamports: string | null;
    dailyPayoutLamports: string | null;
  };
  /** Ab diesem Einsatz ginge ein Gewinn in die Pruefung (Halte-Modus). */
  /**
   * true = der genaue Deckel haengt an einer Entscheidung IN der Runde
   * (welcher Ausgang, welches Sicherheitsziel). Die Zahl ist dann eine
   * OBERGRENZE, kein Versprechen: erlaubt kann weniger sein, nie mehr.
   *
   * Fehlt das Feld (aelterer API-Stand), zaehlt das als `false`.
   */
  roundDependent?: boolean;
  payoutHoldAboveLamports: string | null;
  /** false = gerade gar nicht spielbar (Grenze auf 0). */
  playable: boolean;
}

/** `gameId` kommt aus der Server-Config, NIE vom Client — sonst koennte sich
 *  jemand die Grenzen eines fremden Spiels anzeigen lassen. */
export function getBetLimits(): Promise<BetLimitsView> {
  const cfg = serverConfig();
  return request<BetLimitsView>(`/api/public/games/${cfg.gameId}/limits`);
}
