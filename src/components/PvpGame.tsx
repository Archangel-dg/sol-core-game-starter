'use client';
import { verifyHref } from './VerifyLink';
import { MaxBetPick } from './BetLimitHint';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import type { EngineDef } from '@/lib/engines';
import type {
  PvpLobbyView,
  PvpOpenLobby,
  PvpStatsView,
  PvpChatMessage,
} from '@/lib/solcore';
import { buildDepositTx, warteAufBestaetigung } from '@/lib/player-program';
import { toSol, solToLamports } from '@/lib/lamports';
import { useBalanceFreeze } from '@/lib/balance-freeze';
import { usePlayerAuth } from '@/lib/player-auth';
import { usePvpLang, pvpErrorText, PVP_LANGS, type TFn, type PvpLang } from '@/lib/pvp-i18n';
import { useT } from '@/lib/i18n';

/**
 * PvP-Coinflip-Frontend (docs/pvp-plan.md §7): Top-Header (Wallet-Modal mit
 * Deposit/Withdraw/Historie, Menü-Drawer), Hero (Demo/Create), Lobby-Tabelle,
 * Lobby-Raum (Chat, Ready, Stake-Änderung) und die Reveal-Animation mit
 * Balance-Freeze. Alle wallet-gebundenen Aktionen laufen über `moneyFetch`; der
 * mitgliedschafts-geprüfte Lobby-Raum-State wird über den token-tragenden
 * `authFetch` gepollt (kein token-freier Read). Ergebnisse kommen ausschließlich
 * vom Server; die Optik ist frei anpassbar (Design-Zone). Sprache über i18n.
 */

const LOBBY_STORE_KEY = 'sc_pvp_lobby';
const SOUND_STORE_KEY = 'sc_pvp_sound';
/** Reveal-Fenster in ms — MUSS PVP_REVEAL_SECONDS (Backend = 8 s) entsprechen. */
const REVEAL_MS = 8_000;

// ── kleine Helfer ────────────────────────────────────────────────────
// (exportiert, damit DiceDuelGame die Lobby-Hülle 1:1 wiederverwenden kann —
//  eine Engine-Verzweigung ohne Duplikat der Präsentations-Bausteine.)
export function shortWallet(w: string): string {
  const s = (w ?? '').trim();
  if (s.length <= 8) return s || '—';
  return `${s.slice(0, 4)}…${s.slice(-4)}`;
}

/** Client-Seed: Hex [0-9a-f]{1,64} — passt exakt zur Server-Regex (pvpClientSeed). */
export function randomHexSeed(): string {
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
}

function chatCreatedAt(m: PvpChatMessage): string {
  return m.createdAt ?? m.created_at ?? '';
}

/** Winzige WebAudio-Blips (kein Asset). Fällt still aus, wenn kein AudioContext. */
export function makeBlip() {
  let ctx: AudioContext | null = null;
  return (freq: number, ms = 90) => {
    try {
      const AC =
        (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext })
          .AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      ctx = ctx ?? new AC();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + ms / 1000);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + ms / 1000);
    } catch {
      /* Audio optional — nie den Flow brechen */
    }
  };
}

export interface JsonErr {
  error?: { code?: string; message?: string; reason?: string; details?: Record<string, unknown> };
}

export interface PvpGameProps {
  engine: EngineDef;
  gameId: string;
  gameName: string;
  /** Aufgelöste PvP-Engine-Config vom Server (Lamport-Strings, allowPin 0/1). */
  engineConfig?: Record<string, unknown> | null;
  /** Basis-URL der Verifier-Seite (Provably Fair). */
  verifierUrl: string;
  /** Link „zur Gaming-Plattform" (Default: verifierUrl-Basis). */
  platformUrl?: string;
  devMock?: boolean;
  /** Nur DevKit-Template: startet den Demo-Modus (Hero-Button „Demo Play"). In
   * game-starter nicht gesetzt ⇒ der Button wird ausgeblendet (kein Demo-Layer). */
  onDemoPlay?: () => void;
}

export function PvpGame({
  engine,
  gameName,
  engineConfig,
  verifierUrl,
  platformUrl,
  devMock,
  onDemoPlay,
}: PvpGameProps) {
  const { lang, setLang, t } = usePvpLang();
  const { connection } = useConnection();
  const { publicKey, connected, sendTransaction } = useWallet();
  const wallet = publicKey?.toBase58() ?? null;
  const { moneyFetch, authFetch } = usePlayerAuth();
  const { freezeUntil, release, frozen } = useBalanceFreeze();

  // Engine-Grenzen (nachschärfbar aus dem Lobby-State).
  const cfg = useMemo(() => {
    const src = (engineConfig ?? {}) as Record<string, unknown>;
    const asBig = (v: unknown, fb: bigint): bigint => {
      try {
        if (typeof v === 'string' && /^\d+$/.test(v)) return BigInt(v);
        if (typeof v === 'number' && Number.isFinite(v)) return BigInt(Math.floor(v));
      } catch {
        /* fallthrough */
      }
      return fb;
    };
    return {
      minStake: asBig(src.minStakeLamports, 10_000_000n),
      maxStake: asBig(src.maxStakeLamports, 500_000_000n),
      allowPin: src.allowPin === 1 || src.allowPin === true,
    };
  }, [engineConfig]);

  const [lobbyId, setLobbyId] = useState<string | null>(null);
  const [lobby, setLobby] = useState<PvpLobbyView | null>(null);
  const [openLobbies, setOpenLobbies] = useState<PvpOpenLobby[]>([]);
  const [stats, setStats] = useState<PvpStatsView | null>(null);
  const [chat, setChat] = useState<PvpChatMessage[]>([]);
  const chatCursor = useRef<string>('0');
  const [offsetMs, setOffsetMs] = useState(0);
  const [nowTick, setNowTick] = useState(() => Date.now());

  const [balance, setBalance] = useState<string | null>(null);
  const frozenRef = useRef(frozen);
  frozenRef.current = frozen;

  // Overlays
  const [walletOpen, setWalletOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sound + reduced motion
  const [soundOn, setSoundOn] = useState(false);
  useEffect(() => {
    if (typeof window !== 'undefined') setSoundOn(localStorage.getItem(SOUND_STORE_KEY) !== '0');
  }, []);
  const blip = useRef(makeBlip());
  const play = useCallback(
    (freq: number, ms?: number) => {
      if (soundOn) blip.current(freq, ms);
    },
    [soundOn],
  );
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setReduced(mq.matches);
    on();
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);

  // ── Reconnect: gemerkte Lobby nach Reload fortsetzen ──
  useEffect(() => {
    const id = typeof window !== 'undefined' ? localStorage.getItem(LOBBY_STORE_KEY) : null;
    if (id) setLobbyId(id);
  }, []);

  const clearLobby = useCallback(() => {
    setLobby(null);
    setLobbyId(null);
    setChat([]);
    chatCursor.current = '0';
    if (typeof window !== 'undefined') localStorage.removeItem(LOBBY_STORE_KEY);
  }, []);

  const applyLobby = useCallback((view: PvpLobbyView) => {
    setLobby(view);
    setLobbyId(view.lobbyId);
    setOffsetMs(new Date(view.serverTime).getTime() - Date.now());
    if (typeof window !== 'undefined') localStorage.setItem(LOBBY_STORE_KEY, view.lobbyId);
    if (Array.isArray(view.chat) && view.chat.length) {
      setChat((prev) => [...prev, ...view.chat!]);
      chatCursor.current = view.chat[view.chat.length - 1]!.id;
    }
  }, []);

  // ── Poll: Lobby-Raum-State (token-gebunden) ODER offene Lobbys (token-frei) ──
  useEffect(() => {
    let stopped = false;
    const tick = async () => {
      try {
        if (lobbyId && connected) {
          const since = chatCursor.current !== '0' ? chatCursor.current : undefined;
          const url = `/api/pvp/lobby/${lobbyId}${since ? `?since=${encodeURIComponent(since)}` : ''}`;
          const state = (await authFetch(url)) as PvpLobbyView & JsonErr;
          if (stopped) return;
          if (state?.error) {
            // API-700 = Lobby weg / kein Mitglied mehr → zurück zur Übersicht.
            if (state.error.code === 'API-700') clearLobby();
            return;
          }
          applyLobby(state);
        } else if (!lobbyId) {
          const list = (await fetch('/api/pvp/lobbies').then((r) => r.json())) as {
            lobbies?: PvpOpenLobby[];
            serverTime?: string;
          } & JsonErr;
          if (stopped || list?.error) return;
          if (Array.isArray(list.lobbies)) setOpenLobbies(list.lobbies);
          if (list.serverTime) setOffsetMs(new Date(list.serverTime).getTime() - Date.now());
        }
      } catch {
        /* nächster Tick versucht es erneut */
      }
    };
    void tick();
    const id = setInterval(() => void tick(), 1_000);
    return () => {
      stopped = true;
      clearInterval(id);
    };
  }, [lobbyId, connected, authFetch, applyLobby, clearLobby]);

  // Weiche Uhr (100 ms) für die Reveal-Progression.
  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 100);
    return () => clearInterval(id);
  }, []);

  // W/L-Statistik + Historie.
  const refreshStats = useCallback(async () => {
    if (!wallet) return;
    try {
      const s = (await fetch(`/api/pvp/me/${wallet}`).then((r) => r.json())) as PvpStatsView & JsonErr;
      if (!s.error) setStats(s);
    } catch {
      /* still */
    }
  }, [wallet]);
  useEffect(() => {
    void refreshStats();
  }, [refreshStats]);

  // Guthaben (mit Balance-Freeze-Respekt).
  const refreshBalance = useCallback(async () => {
    if (!wallet) return;
    try {
      const r = await fetch(`/api/balance/${wallet}`).then((x) => x.json());
      if (frozenRef.current) return;
      setBalance(r.balanceLamports ?? null);
    } catch {
      /* still */
    }
  }, [wallet]);
  useEffect(() => {
    void refreshBalance();
    const id = setInterval(() => void refreshBalance(), 10_000);
    return () => clearInterval(id);
  }, [refreshBalance]);
  useEffect(() => {
    if (!frozen) void refreshBalance();
  }, [frozen, refreshBalance]);

  // ── Phase + Reveal-Ableitung ──
  const serverNow = nowTick + offsetMs;
  const match = lobby?.match ?? null;
  const inReveal = !!match && ['staked', 'drawing', 'settled'].includes(match.status);
  const inStaking =
    (!!lobby && (lobby.status === 'readying' || lobby.status === 'locked')) ||
    (!!match && match.status === 'locked');
  const settled = match?.status === 'settled' && match.winnerSeat !== null;

  const mySeat = useMemo(() => {
    const m = lobby?.members.find((x) => x.wallet === wallet);
    return m?.seatNo ?? null;
  }, [lobby, wallet]);
  const iAmHost = !!lobby && lobby.hostWallet === wallet;
  const meMember = lobby?.members.find((x) => x.wallet === wallet) ?? null;
  const iAmReady = meMember?.ready ?? false;

  let revealProgress = 0;
  if (match?.status === 'staked' && match.drawAt) {
    const end = new Date(match.drawAt).getTime();
    const start = end - REVEAL_MS;
    revealProgress = Math.max(0, Math.min(1, (serverNow - start) / REVEAL_MS));
  } else if (match?.status === 'drawing') {
    revealProgress = 1;
  } else if (settled) {
    revealProgress = 1;
  }

  // Balance-Freeze während des Reveals (Gewinn wird beim Draw gutgeschrieben).
  const frozenMatch = useRef<string | null>(null);
  useEffect(() => {
    if (match?.status === 'staked' && match.drawAt && frozenMatch.current !== match.matchId) {
      frozenMatch.current = match.matchId;
      freezeUntil(new Date(match.drawAt).getTime() - offsetMs);
    } else if ((!match || match.status === 'settled') && frozenMatch.current) {
      frozenMatch.current = null;
      release();
    }
  }, [match, offsetMs, freezeUntil, release]);

  // Ergebnis-Sound + Stats-Refresh, sobald settled.
  const settledShown = useRef<string | null>(null);
  useEffect(() => {
    if (settled && match && settledShown.current !== match.matchId) {
      settledShown.current = match.matchId;
      const win = match.winnerSeat === mySeat;
      play(win ? 660 : 180, 220);
      void refreshStats();
    }
  }, [settled, match, mySeat, play, refreshStats]);

  // ── Aktionen (alle wallet-gebunden ⇒ moneyFetch) ──
  const callMoney = useCallback(
    async (path: string, body?: unknown): Promise<(Record<string, unknown> & JsonErr) | null> => {
      setBusy(true);
      setError(null);
      try {
        const r = (await moneyFetch(path, body)) as Record<string, unknown> & JsonErr;
        if (r?.error) {
          setError(pvpErrorText(lang, r.error.code));
          return r;
        }
        return r;
      } catch (e) {
        setError((e as Error).message);
        return null;
      } finally {
        setBusy(false);
      }
    },
    [moneyFetch, lang],
  );

  const doCreate = useCallback(
    async (stakeLamports: string, pin?: string) => {
      if (!wallet) return;
      const r = await callMoney('/api/pvp/lobby', {
        playerWallet: wallet,
        stakeLamports,
        pin,
        clientSeed: randomHexSeed(),
      });
      if (!r) return;
      if (r.error) {
        // Schon in einer Lobby → diese adoptieren statt zu blockieren.
        if (r.error.code === 'API-704' && typeof r.error.details?.lobbyId === 'string') {
          setLobbyId(r.error.details.lobbyId as string);
          setCreateOpen(false);
        }
        return;
      }
      applyLobby(r as unknown as PvpLobbyView);
      setCreateOpen(false);
      play(520, 80);
    },
    [wallet, callMoney, applyLobby, play],
  );

  const doJoin = useCallback(
    async (id: string, pin?: string) => {
      if (!wallet) return;
      const r = await callMoney(`/api/pvp/lobby/${id}/join`, {
        playerWallet: wallet,
        pin,
        clientSeed: randomHexSeed(),
      });
      if (!r) return;
      if (r.error) {
        if (r.error.code === 'API-704' && typeof r.error.details?.lobbyId === 'string') {
          setLobbyId(r.error.details.lobbyId as string);
        }
        return;
      }
      applyLobby(r as unknown as PvpLobbyView);
      play(520, 80);
    },
    [wallet, callMoney, applyLobby, play],
  );

  const doReady = useCallback(async () => {
    if (!wallet || !lobbyId) return;
    const r = await callMoney(`/api/pvp/lobby/${lobbyId}/ready`, {
      playerWallet: wallet,
      clientSeed: randomHexSeed(),
    });
    if (r && !r.error) applyLobby(r as unknown as PvpLobbyView);
  }, [wallet, lobbyId, callMoney, applyLobby]);

  const doUnready = useCallback(async () => {
    if (!wallet || !lobbyId) return;
    const r = await callMoney(`/api/pvp/lobby/${lobbyId}/unready`, { playerWallet: wallet });
    if (r && !r.error) applyLobby(r as unknown as PvpLobbyView);
  }, [wallet, lobbyId, callMoney, applyLobby]);

  const doLeave = useCallback(async () => {
    if (!wallet || !lobbyId) return;
    await callMoney(`/api/pvp/lobby/${lobbyId}/leave`, { playerWallet: wallet });
    clearLobby();
  }, [wallet, lobbyId, callMoney, clearLobby]);

  const doKick = useCallback(
    async (target: string) => {
      if (!wallet || !lobbyId) return;
      const r = await callMoney(`/api/pvp/lobby/${lobbyId}/kick`, {
        playerWallet: wallet,
        wallet: target,
      });
      if (r && !r.error) applyLobby(r as unknown as PvpLobbyView);
    },
    [wallet, lobbyId, callMoney, applyLobby],
  );

  const doSetStake = useCallback(
    async (stakeLamports: string) => {
      if (!wallet || !lobbyId) return;
      const r = await callMoney(`/api/pvp/lobby/${lobbyId}/stake`, {
        playerWallet: wallet,
        stakeLamports,
      });
      if (r && !r.error) applyLobby(r as unknown as PvpLobbyView);
    },
    [wallet, lobbyId, callMoney, applyLobby],
  );

  const doChat = useCallback(
    async (message: string) => {
      if (!wallet || !lobbyId) return;
      await callMoney(`/api/pvp/lobby/${lobbyId}/chat`, { playerWallet: wallet, message });
    },
    [wallet, lobbyId, callMoney],
  );

  // ── Render ───────────────────────────────────────────────────────────
  const stakeBounds = useMemo(() => {
    // Bevorzugt die Grenzen aus dem Lobby-State (authoritativ), sonst meta-Config.
    const ec = (lobby?.engineConfig ?? null) as Record<string, unknown> | null;
    if (ec) {
      try {
        return {
          minStake: BigInt(String(ec.minStakeLamports ?? cfg.minStake.toString())),
          maxStake: BigInt(String(ec.maxStakeLamports ?? cfg.maxStake.toString())),
          allowPin: ec.allowPin === 1 || ec.allowPin === true || cfg.allowPin,
        };
      } catch {
        /* fallthrough */
      }
    }
    return cfg;
  }, [lobby, cfg]);

  return (
    <main className="mx-auto min-h-screen max-w-md px-4 pb-10">
      {/* ── Top-Header-Bar: Name · Wallet · Menü ── */}
      <header className="sticky top-0 z-20 -mx-4 mb-4 flex items-center justify-between gap-2 border-b border-white/10 bg-night/80 px-4 py-3 backdrop-blur">
        <div className="min-w-0">
          <h1 className="truncate text-base font-bold text-white">{gameName}</h1>
          <p className="text-[10px] uppercase tracking-wider text-accent/80">{engine.label}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setWalletOpen(true)}
            className="rounded-full border border-accent/40 bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent"
          >
            {!connected
              ? t('wallet.connect')
              : devMock
                ? 'devMock'
                : balance === null
                  ? '—'
                  : `${toSol(balance)} ◎`}
          </button>
          <button
            type="button"
            aria-label={t('menu.title')}
            onClick={() => setMenuOpen(true)}
            className="rounded-lg border border-white/15 px-3 py-1.5 text-white/80"
          >
            ☰
          </button>
        </div>
      </header>

      {/* ── Hauptbereich ── */}
      {inReveal || inStaking ? (
        <RevealView
          t={t}
          reduced={reduced}
          stakeLamports={lobby?.stakeLamports ?? '0'}
          status={inStaking && !inReveal ? 'staking' : match?.status ?? 'staked'}
          revealProgress={revealProgress}
          winnerSeat={settled ? match?.winnerSeat ?? null : null}
          mySeat={mySeat}
          matchId={match?.matchId ?? null}
          verifierUrl={verifierUrl}
          onBack={clearLobby}
        />
      ) : lobby ? (
        <LobbyRoom
          t={t}
          lobby={lobby}
          wallet={wallet}
          iAmHost={iAmHost}
          iAmReady={iAmReady}
          busy={busy}
          chat={chat}
          allowPin={stakeBounds.allowPin}
          minStake={stakeBounds.minStake}
          maxStake={stakeBounds.maxStake}
          onReady={() => void doReady()}
          onUnready={() => void doUnready()}
          onLeave={() => void doLeave()}
          onKick={(w) => void doKick(w)}
          onSetStake={(s) => void doSetStake(s)}
          onChat={(m) => void doChat(m)}
        />
      ) : (
        <>
          <Hero
            t={t}
            engine={engine}
            gameName={gameName}
            connected={connected}
            onDemoPlay={onDemoPlay}
            onCreate={() => setCreateOpen(true)}
          />
          <OpenLobbiesTable
            t={t}
            lobbies={openLobbies}
            busy={busy}
            onJoin={(id, pin) => void doJoin(id, pin)}
          />
        </>
      )}

      {error && (
        <p className="mt-4 rounded-lg border border-red-400/30 bg-red-400/[0.06] p-3 text-sm text-red-300">
          {error}
        </p>
      )}

      {/* ── Overlays ── */}
      {walletOpen && (
        <WalletModal
          t={t}
          devMock={devMock}
          connected={connected}
          balance={balance}
          stats={stats}
          onClose={() => setWalletOpen(false)}
          onDeposit={async (sol) => {
            if (!publicKey) return t('wallet.depositFailed');
            try {
              const lamports = solToLamports(sol);
              const tx = await buildDepositTx(connection, publicKey, lamports);
              const sig = await sendTransaction(tx, connection);
              await warteAufBestaetigung(connection, sig);
              setTimeout(() => void refreshBalance(), 6000);
              return t('wallet.depositSent');
            } catch (e) {
              return `${t('wallet.depositFailed')}: ${(e as Error).message}`;
            }
          }}
          onWithdraw={async (sol) => {
            if (!wallet) return t('wallet.withdrawFailed');
            try {
              const lamports = solToLamports(sol);
              const r = (await moneyFetch('/api/withdraw', {
                playerWallet: wallet,
                amountLamports: lamports.toString(),
              })) as { signature?: string | null } & JsonErr;
              if (r?.error) return `${t('wallet.withdrawFailed')}: ${pvpErrorText(lang, r.error.code)}`;
              void refreshBalance();
              return r.signature ? t('wallet.withdrawSent') : t('wallet.withdrawBooked');
            } catch (e) {
              return `${t('wallet.withdrawFailed')}: ${(e as Error).message}`;
            }
          }}
        />
      )}

      {menuOpen && (
        <MenuDrawer
          t={t}
          lang={lang}
          setLang={setLang}
          stats={stats}
          soundOn={soundOn}
          onToggleSound={() => {
            const next = !soundOn;
            setSoundOn(next);
            if (typeof window !== 'undefined') localStorage.setItem(SOUND_STORE_KEY, next ? '1' : '0');
            if (next) blip.current(520, 80);
          }}
          verifierUrl={verifierUrl}
          platformUrl={platformUrl ?? verifierUrl}
          canCreate={connected && !lobby}
          onCreate={() => {
            setMenuOpen(false);
            setCreateOpen(true);
          }}
          onInfo={() => {
            setMenuOpen(false);
            setInfoOpen(true);
          }}
          onClose={() => setMenuOpen(false)}
        />
      )}

      {infoOpen && <InfoModal t={t} verifierUrl={verifierUrl} onClose={() => setInfoOpen(false)} />}

      {createOpen && (
        <CreateLobbyDialog
          t={t}
          minStake={stakeBounds.minStake}
          maxStake={stakeBounds.maxStake}
          allowPin={stakeBounds.allowPin}
          busy={busy}
          onCancel={() => setCreateOpen(false)}
          onCreate={(stake, pin) => void doCreate(stake, pin)}
        />
      )}
    </main>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────
export function Hero({
  t,
  engine,
  gameName,
  connected,
  onDemoPlay,
  onCreate,
  icon = '🪙',
}: {
  t: TFn;
  engine: EngineDef;
  gameName: string;
  connected: boolean;
  onDemoPlay?: () => void;
  onCreate: () => void;
  /** Hero-Emoji (Default 🪙 für Coin-Flip; Dice-Duel setzt 🎲). */
  icon?: string;
}) {
  // Engine-Texte (blurb/hint) liegen im Hauptkatalog, nicht im PvP-Katalog.
  const ti = useT();
  return (
    <section className="mb-6 rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-transparent p-6 text-center">
      <div className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-full border border-accent/40 bg-accent/10 text-3xl">
        {icon}
      </div>
      <h2 className="text-xl font-bold text-white">{gameName}</h2>
      <p className="mx-auto mt-2 max-w-xs text-sm text-white/50">{ti(engine.blurb)}</p>
      <p className="mx-auto mt-2 max-w-xs text-xs text-white/30">{engine.pvp?.hint ? ti(engine.pvp.hint) : ''}</p>
      <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
        {onDemoPlay && (
          <button
            type="button"
            onClick={onDemoPlay}
            className="rounded-xl border border-white/15 px-5 py-3 text-sm font-semibold text-white/80 hover:bg-white/5"
          >
            {t('hero.demo')}
          </button>
        )}
        <button
          type="button"
          onClick={onCreate}
          disabled={!connected}
          className="rounded-xl bg-gradient-to-r from-accent to-accent-soft px-5 py-3 text-sm font-semibold text-night disabled:opacity-40"
        >
          {t('hero.create')}
        </button>
      </div>
      {!connected && <p className="mt-3 text-xs text-white/40">{t('hero.connectFirst')}</p>}
    </section>
  );
}

// ── Offene Lobbys ─────────────────────────────────────────────────────
export function OpenLobbiesTable({
  t,
  lobbies,
  busy,
  onJoin,
}: {
  t: TFn;
  lobbies: PvpOpenLobby[];
  busy: boolean;
  onJoin: (id: string, pin?: string) => void;
}) {
  const [pinFor, setPinFor] = useState<string | null>(null);
  const [pin, setPin] = useState('');
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-2 text-[10px] uppercase tracking-wider text-white/40">{t('lobbies.title')}</div>
      {lobbies.length === 0 ? (
        <p className="py-4 text-center text-xs text-white/30">{t('lobbies.empty')}</p>
      ) : (
        <ul className="divide-y divide-white/5">
          {lobbies.map((l) => (
            <li key={l.lobbyId} className="py-2">
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-sm text-white/80">
                    {l.locked && <span title={t('lobbies.locked')}>🔒</span>}
                    <span className="truncate">{shortWallet(l.hostWallet)}</span>
                  </div>
                  <div className="text-[11px] tabular-nums text-white/40">
                    {toSol(l.stakeLamports)} ◎ · {l.playersCurrent}/{l.playersMax} ·{' '}
                    {t('lobbies.age')} {l.ageSeconds}s
                  </div>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => (l.locked ? setPinFor(l.lobbyId) : onJoin(l.lobbyId))}
                  className="shrink-0 rounded-lg border border-accent/40 bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent disabled:opacity-40"
                >
                  {t('lobbies.join')}
                </button>
              </div>
              {pinFor === l.lobbyId && (
                <div className="mt-2 flex items-center gap-2">
                  <input
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    inputMode="numeric"
                    placeholder={t('lobbies.pinPrompt')}
                    className="w-32 rounded-lg border border-white/10 bg-night px-3 py-1.5 text-sm tabular-nums outline-none focus:border-accent/50"
                  />
                  <button
                    type="button"
                    disabled={busy || pin.length !== 4}
                    onClick={() => {
                      onJoin(l.lobbyId, pin);
                      setPinFor(null);
                      setPin('');
                    }}
                    className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-night disabled:opacity-40"
                  >
                    {t('lobbies.join')}
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ── Lobby-Raum ────────────────────────────────────────────────────────
export function LobbyRoom({
  t,
  lobby,
  wallet,
  iAmHost,
  iAmReady,
  busy,
  chat,
  allowPin,
  minStake,
  maxStake,
  onReady,
  onUnready,
  onLeave,
  onKick,
  onSetStake,
  onChat,
}: {
  t: TFn;
  lobby: PvpLobbyView;
  wallet: string | null;
  iAmHost: boolean;
  iAmReady: boolean;
  busy: boolean;
  chat: PvpChatMessage[];
  allowPin: boolean;
  minStake: bigint;
  maxStake: bigint;
  onReady: () => void;
  onUnready: () => void;
  onLeave: () => void;
  onKick: (wallet: string) => void;
  onSetStake: (stakeLamports: string) => void;
  onChat: (message: string) => void;
}) {
  const [msg, setMsg] = useState('');
  const [stakeSol, setStakeSol] = useState('');
  const lastSent = useRef(0);
  const statusKey = `room.status.${lobby.status}` as const;

  const submitChat = () => {
    const m = msg.trim().slice(0, 200);
    if (!m) return;
    // Client-Drossel: 1 Nachricht / 2 s (Server-Regel gespiegelt).
    if (Date.now() - lastSent.current < 2_000) return;
    lastSent.current = Date.now();
    onChat(m);
    setMsg('');
  };

  const applyStake = () => {
    if (!stakeSol.trim()) return;
    let lamports: bigint;
    try {
      lamports = solToLamports(stakeSol);
    } catch {
      return;
    }
    if (lamports < minStake) lamports = minStake;
    if (lamports > maxStake) lamports = maxStake;
    onSetStake(lamports.toString());
    setStakeSol('');
  };

  return (
    <section className="space-y-4">
      {/* Kopf: Status + Stake */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div className="flex items-center justify-between">
          <span className="rounded-full bg-white/[0.06] px-3 py-1 text-xs font-semibold text-white/70">
            {t(statusKey)}
          </span>
          <span className="text-sm font-bold tabular-nums text-accent">
            {toSol(lobby.stakeLamports)} ◎
          </span>
        </div>
        {lobby.lastError && (
          <p className="mt-2 text-xs text-amber-300/90">{t('room.lastError')}</p>
        )}
      </div>

      {/* Mitglieder */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div className="mb-2 text-[10px] uppercase tracking-wider text-white/40">{t('room.members')}</div>
        <ul className="space-y-2">
          {lobby.members.map((m) => (
            <li key={m.wallet} className="flex items-center gap-2">
              <span className={`text-lg ${m.ready ? 'text-accent' : 'text-white/20'}`}>
                {m.ready ? '✓' : '○'}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm text-white/80">
                {m.wallet === wallet ? `${shortWallet(m.wallet)} (${t('room.you')})` : shortWallet(m.wallet)}
                {m.isHost && <span className="ml-1 text-[10px] uppercase text-accent/70">· {t('room.host')}</span>}
              </span>
              <span className={`text-[11px] ${m.ready ? 'text-accent' : 'text-white/30'}`}>
                {m.ready ? t('room.ready') : t('room.notReady')}
              </span>
              {iAmHost && m.wallet !== wallet && (lobby.status === 'open' || lobby.status === 'full') && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onKick(m.wallet)}
                  className="rounded border border-red-400/30 px-2 py-0.5 text-[10px] text-red-300/80 disabled:opacity-40"
                >
                  {t('room.kick')}
                </button>
              )}
            </li>
          ))}
          {lobby.members.length < lobby.maxPlayers && (
            <li className="text-xs text-white/30">{t('room.waitOpponent')}</li>
          )}
        </ul>
      </div>

      {/* Ready-Check */}
      {lobby.status === 'full' && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="mb-3 text-xs text-white/40">{t('room.allReadyHint')}</p>
          {iAmReady ? (
            <button
              type="button"
              disabled={busy}
              onClick={onUnready}
              className="w-full rounded-xl border border-white/15 py-3 text-sm font-semibold text-white/70 disabled:opacity-40"
            >
              {t('room.unreadyBtn')}
            </button>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={onReady}
              className="w-full rounded-xl bg-gradient-to-r from-accent to-accent-soft py-3 text-sm font-semibold text-night disabled:opacity-40"
            >
              {t('room.readyBtn')}
            </button>
          )}
        </div>
      )}

      {/* Einsatz ändern (nur Host, vor dem Lock) */}
      {iAmHost && (lobby.status === 'open' || lobby.status === 'full') && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="mb-1 text-[10px] uppercase tracking-wider text-white/40">{t('room.stakeChange')}</div>
          <p className="mb-2 text-[11px] text-amber-300/80">{t('room.stakeChangeHint')}</p>
          {/* Hoechsteinsatz AM Feld (Systemvertrag — nie entfernen): Der
              Platzhalter nennt die ENGINE-Spanne; die hier ist die Grenze des
              MOMENTS (Solvenz, Level, Tagesdeckel). */}
          <div className="mb-2 flex justify-end">
            <MaxBetPick onPick={setStakeSol} />
          </div>
          <div className="flex items-center gap-2">
            <input
              value={stakeSol}
              onChange={(e) => setStakeSol(e.target.value)}
              inputMode="decimal"
              placeholder={`${toSol(minStake)}–${toSol(maxStake)}`}
              className="w-28 rounded-lg border border-white/10 bg-night px-3 py-2 text-sm tabular-nums outline-none focus:border-accent/50"
            />
            <span className="text-xs text-white/50">{t('common.sol')}</span>
            <button
              type="button"
              disabled={busy}
              onClick={applyStake}
              className="ml-auto rounded-lg border border-accent/40 bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent disabled:opacity-40"
            >
              {t('room.stakeApply')}
            </button>
          </div>
        </div>
      )}

      {/* Chat */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div className="mb-2 text-[10px] uppercase tracking-wider text-white/40">{t('room.chat')}</div>
        <div className="mb-2 max-h-32 space-y-1 overflow-y-auto text-sm">
          {chat.length === 0 ? (
            <p className="text-xs text-white/25">—</p>
          ) : (
            chat.map((c) => (
              <p key={c.id} className="text-white/70">
                <span className="text-white/40">{shortWallet(c.wallet)}:</span> {c.message}
              </p>
            ))
          )}
        </div>
        <div className="flex items-center gap-2">
          <input
            value={msg}
            onChange={(e) => setMsg(e.target.value.slice(0, 200))}
            onKeyDown={(e) => e.key === 'Enter' && submitChat()}
            placeholder={t('room.chatPlaceholder')}
            maxLength={200}
            className="min-w-0 flex-1 rounded-lg border border-white/10 bg-night px-3 py-2 text-sm outline-none focus:border-accent/50"
          />
          <button
            type="button"
            disabled={busy || !msg.trim()}
            onClick={submitChat}
            className="shrink-0 rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-night disabled:opacity-40"
          >
            {t('room.send')}
          </button>
        </div>
      </div>

      <button
        type="button"
        disabled={busy}
        onClick={onLeave}
        className="w-full rounded-xl border border-white/10 py-2.5 text-sm text-white/60 disabled:opacity-40"
      >
        {t('room.leave')}
      </button>
      {/* allowPin nur referenziert, damit die Grenze im Raum verfügbar bleibt */}
      <span className="hidden">{allowPin ? '1' : '0'}</span>
    </section>
  );
}

// ── Reveal / Ergebnis ─────────────────────────────────────────────────
function RevealView({
  t,
  reduced,
  stakeLamports,
  status,
  revealProgress,
  winnerSeat,
  mySeat,
  matchId,
  verifierUrl,
  onBack,
}: {
  t: TFn;
  reduced: boolean;
  stakeLamports: string;
  status: string;
  revealProgress: number;
  winnerSeat: number | null;
  mySeat: number | null;
  matchId: string | null;
  verifierUrl: string;
  onBack: () => void;
}) {
  const settled = winnerSeat !== null;
  const win = settled && winnerSeat === mySeat;
  const pot = (BigInt(stakeLamports || '0') * 2n).toString();
  const spinning = !settled && (status === 'staked' || status === 'drawing');

  let headline = t('reveal.flipping');
  if (status === 'staking' || status === 'locked') headline = t('reveal.staking');
  else if (settled) headline = win ? t('reveal.youWon') : t('reveal.youLost');

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center">
      <div className="mx-auto flex h-40 items-center justify-center">
        <CoinFace spinning={spinning} reduced={reduced} settled={settled} win={win} progress={revealProgress} />
      </div>
      <p className={`mt-4 text-xl font-bold ${settled ? (win ? 'text-accent' : 'text-red-400') : 'text-white/80'}`}>
        {headline}
      </p>
      <p className="mt-1 text-sm text-white/50">
        {settled ? t('reveal.payout') : t('reveal.pot')}: {toSol(pot)} ◎
      </p>

      {settled ? (
        <div className="mt-5 space-y-3">
          <p className="text-[11px] text-white/30">{t('reveal.settledAway')}</p>
          {matchId && (
            // Menschenlesbarer Verifizierer: die Seite akzeptiert Runden- UND
            // Match-IDs und rechnet ein Match (Seed-Commitment, zusammengesetzter
            // Client-Seed, Würfe, Gewinner) IM BROWSER des Spielers nach. Der
            // rohe JSON-Endpunkt bleibt unter /api/pvp/verify/<id> erreichbar.
            <a
              href={verifyHref(verifierUrl, matchId)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-sm text-accent underline underline-offset-2"
            >
              {t('reveal.verify')}
            </a>
          )}
          <button
            type="button"
            onClick={onBack}
            className="w-full rounded-xl bg-gradient-to-r from-accent to-accent-soft py-3 text-sm font-semibold text-night"
          >
            {t('reveal.back')}
          </button>
        </div>
      ) : (
        <p className="mt-4 text-xs text-white/40">{t('common.waitingSeed')}</p>
      )}
    </section>
  );
}

function CoinFace({
  spinning,
  reduced,
  settled,
  win,
  progress,
}: {
  spinning: boolean;
  reduced: boolean;
  settled: boolean;
  win: boolean;
  progress: number;
}) {
  // Reduced motion: keine Dauer-Rotation — statischer Endframe. Sonst ein
  // schneller Spin während des Reveal-Fensters, der beim Ergebnis stoppt.
  const face = settled ? (win ? '🏆' : '💀') : '🪙';
  const cls = settled
    ? win
      ? 'border-accent bg-accent/15 text-accent'
      : 'border-red-400/50 bg-red-400/10 text-red-300'
    : 'border-accent/40 bg-accent/10 text-accent';
  const animate = spinning && !reduced;
  return (
    <div
      className={`grid h-28 w-28 place-items-center rounded-full border-2 text-5xl transition-transform ${cls} ${
        animate ? 'animate-spin [animation-duration:0.6s]' : ''
      }`}
      style={!animate && !settled ? { transform: `rotateY(${progress * 720}deg)` } : undefined}
      aria-live="polite"
    >
      {face}
    </div>
  );
}

// ── Wallet-Modal (Balance + Deposit/Withdraw + Historie) ──────────────
export function WalletModal({
  t,
  devMock,
  connected,
  balance,
  stats,
  onClose,
  onDeposit,
  onWithdraw,
}: {
  t: TFn;
  devMock?: boolean;
  connected: boolean;
  balance: string | null;
  stats: PvpStatsView | null;
  onClose: () => void;
  onDeposit: (sol: string) => Promise<string>;
  onWithdraw: (sol: string) => Promise<string>;
}) {
  const [amount, setAmount] = useState('0.1');
  const [busy, setBusy] = useState<'deposit' | 'withdraw' | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const run = async (kind: 'deposit' | 'withdraw') => {
    setBusy(kind);
    setNote(null);
    setNote(await (kind === 'deposit' ? onDeposit(amount) : onWithdraw(amount)));
    setBusy(null);
  };
  return (
    <Overlay onClose={onClose}>
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-night p-5">
        <ModalHead title={t('wallet.title')} onClose={onClose} closeLabel={t('common.close')} />
        {!connected ? (
          <p className="text-sm text-white/50">{t('wallet.connect')}</p>
        ) : devMock ? (
          <p className="text-xs text-white/50">{t('wallet.testMode')}</p>
        ) : (
          <>
            <div className="mb-4 flex items-baseline justify-between">
              <span className="text-xs uppercase tracking-wide text-white/50">{t('wallet.balance')}</span>
              <span className="text-lg font-bold tabular-nums text-accent">
                {balance === null ? '—' : `${toSol(balance)} ◎`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                inputMode="decimal"
                className="w-24 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm tabular-nums outline-none focus:border-accent/50"
              />
              <span className="text-xs text-white/50">{t('common.sol')}</span>
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => void run('deposit')}
                className="ml-auto rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-night disabled:opacity-40"
              >
                {busy === 'deposit' ? '…' : t('wallet.deposit')}
              </button>
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => void run('withdraw')}
                className="rounded-full border border-white/15 px-4 py-1.5 text-sm disabled:opacity-40"
              >
                {busy === 'withdraw' ? '…' : t('wallet.withdraw')}
              </button>
            </div>
            {note && <p className="mt-2 text-xs text-white/60">{note}</p>}
          </>
        )}

        {/* Historie */}
        <div className="mt-5">
          <div className="mb-1 text-[10px] uppercase tracking-wider text-white/40">{t('wallet.history')}</div>
          <MatchHistory t={t} stats={stats} />
        </div>
      </div>
    </Overlay>
  );
}

function MatchHistory({ t, stats }: { t: TFn; stats: PvpStatsView | null }) {
  if (!stats || stats.recent.length === 0) {
    return <p className="text-xs text-white/30">{t('wallet.noHistory')}</p>;
  }
  return (
    <ul className="max-h-40 space-y-1 overflow-y-auto text-sm">
      {stats.recent.map((m) => (
        <li key={m.matchId} className="flex items-center justify-between tabular-nums">
          <span className="text-white/60">
            {t('common.opponent')} {m.opponent} · {toSol(m.stakeLamports)} ◎
          </span>
          <span className={m.win ? 'font-semibold text-accent' : 'text-white/40'}>
            {m.win ? t('reveal.youWon') : t('reveal.youLost')}
          </span>
        </li>
      ))}
    </ul>
  );
}

// ── Menü-Drawer ───────────────────────────────────────────────────────
export function MenuDrawer({
  t,
  lang,
  setLang,
  stats,
  soundOn,
  onToggleSound,
  verifierUrl,
  platformUrl,
  canCreate,
  onCreate,
  onInfo,
  onClose,
}: {
  t: TFn;
  lang: PvpLang;
  setLang: (l: PvpLang) => void;
  stats: PvpStatsView | null;
  soundOn: boolean;
  onToggleSound: () => void;
  verifierUrl: string;
  platformUrl: string;
  canCreate: boolean;
  onCreate: () => void;
  onInfo: () => void;
  onClose: () => void;
}) {
  return (
    <Overlay onClose={onClose} align="right">
      <div className="h-full w-72 max-w-[85vw] overflow-y-auto border-l border-white/10 bg-night p-5">
        <ModalHead title={t('menu.title')} onClose={onClose} closeLabel={t('common.close')} />

        {/* W/L */}
        <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-center">
          <div className="text-[10px] uppercase tracking-wider text-white/40">{t('menu.record')}</div>
          <div className="mt-1 flex justify-center gap-4 text-sm">
            <span className="font-bold text-accent">{stats?.wins ?? 0}</span>
            <span className="text-white/30">{t('menu.wins')}</span>
            <span className="font-bold text-red-400">{stats?.losses ?? 0}</span>
            <span className="text-white/30">{t('menu.losses')}</span>
          </div>
        </div>

        {/* Sound */}
        <button
          type="button"
          onClick={onToggleSound}
          className="mb-2 flex w-full items-center justify-between rounded-lg border border-white/10 px-3 py-2 text-sm text-white/80"
        >
          <span>{t('menu.sound')}</span>
          <span className={soundOn ? 'text-accent' : 'text-white/40'}>
            {soundOn ? t('menu.on') : t('menu.off')}
          </span>
        </button>

        {/* Sprache */}
        <div className="mb-2 rounded-lg border border-white/10 px-3 py-2">
          <div className="mb-1 text-xs text-white/50">{t('menu.language')}</div>
          <div className="flex flex-wrap gap-1">
            {PVP_LANGS.map((l) => (
              <button
                key={l.code}
                type="button"
                onClick={() => setLang(l.code)}
                className={`rounded px-2 py-1 text-xs ${
                  lang === l.code ? 'bg-accent text-night' : 'border border-white/15 text-white/60'
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        {canCreate && (
          <button
            type="button"
            onClick={onCreate}
            className="mb-2 w-full rounded-lg bg-gradient-to-r from-accent to-accent-soft px-3 py-2 text-sm font-semibold text-night"
          >
            {t('menu.createLobby')}
          </button>
        )}

        <a
          href={platformUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mb-2 block rounded-lg border border-white/10 px-3 py-2 text-sm text-white/80"
        >
          {t('menu.platform')} ↗
        </a>
        <a
          href={`${verifierUrl}/verify`}
          target="_blank"
          rel="noopener noreferrer"
          className="mb-2 block rounded-lg border border-white/10 px-3 py-2 text-sm text-white/80"
        >
          {t('menu.verify')} ↗
        </a>
        <button
          type="button"
          onClick={onInfo}
          className="w-full rounded-lg border border-white/10 px-3 py-2 text-left text-sm text-white/80"
        >
          {t('menu.info')}
        </button>
      </div>
    </Overlay>
  );
}

// ── Info-Modal ────────────────────────────────────────────────────────
export function InfoModal({ t, verifierUrl, onClose }: { t: TFn; verifierUrl: string; onClose: () => void }) {
  return (
    <Overlay onClose={onClose}>
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-night p-5">
        <ModalHead title={t('info.title')} onClose={onClose} closeLabel={t('common.close')} />
        <p className="mb-3 text-sm text-white/60">{t('info.rules')}</p>
        <p className="mb-4 text-sm text-white/60">{t('info.fees')}</p>
        <a
          href={verifierUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block rounded-lg border border-accent/40 bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent"
        >
          {t('menu.verify')} ↗
        </a>
      </div>
    </Overlay>
  );
}

// ── Create-Lobby-Dialog ───────────────────────────────────────────────
export function CreateLobbyDialog({
  t,
  minStake,
  maxStake,
  allowPin,
  busy,
  onCancel,
  onCreate,
}: {
  t: TFn;
  minStake: bigint;
  maxStake: bigint;
  allowPin: boolean;
  busy: boolean;
  onCancel: () => void;
  onCreate: (stakeLamports: string, pin?: string) => void;
}) {
  const minSol = Number(minStake) / 1e9;
  const maxSol = Number(maxStake) / 1e9;
  const [stakeSol, setStakeSol] = useState(minSol);
  const [usePin, setUsePin] = useState(false);
  const [pin, setPin] = useState('');

  const submit = () => {
    let lamports: bigint;
    try {
      lamports = solToLamports(String(stakeSol));
    } catch {
      lamports = minStake;
    }
    if (lamports < minStake) lamports = minStake;
    if (lamports > maxStake) lamports = maxStake;
    onCreate(lamports.toString(), usePin && pin.length === 4 ? pin : undefined);
  };

  return (
    <Overlay onClose={onCancel}>
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-night p-5">
        <ModalHead title={t('create.title')} onClose={onCancel} closeLabel={t('common.close')} />
        <div className="mb-4">
          <div className="mb-1 flex items-baseline justify-between gap-2">
            <span className="text-xs text-white/50">{t('create.stake')}</span>
            <span className="flex items-baseline gap-2">
              {/* Hoechsteinsatz des MOMENTS — der Regler kennt nur die
                  Engine-Spanne. Klick zieht ihn auf die erlaubte Obergrenze. */}
              <MaxBetPick onPick={(sol) => setStakeSol(Math.min(Number(sol), maxSol))} />
              <span className="text-sm font-bold tabular-nums text-accent">{stakeSol.toFixed(3)} ◎</span>
            </span>
          </div>
          <input
            type="range"
            min={minSol}
            max={maxSol}
            step={Math.max((maxSol - minSol) / 100, 0.001)}
            value={stakeSol}
            onChange={(e) => setStakeSol(Number(e.target.value))}
            className="w-full accent-[#14F195]"
          />
          <div className="flex justify-between text-[10px] tabular-nums text-white/30">
            <span>{minSol.toFixed(3)} ◎</span>
            <span>{maxSol.toFixed(3)} ◎</span>
          </div>
        </div>

        {allowPin && (
          <div className="mb-4">
            <label className="flex items-center gap-2 text-sm text-white/70">
              <input type="checkbox" checked={usePin} onChange={(e) => setUsePin(e.target.checked)} />
              {t('create.pin')}
            </label>
            {usePin && (
              <>
                <input
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  inputMode="numeric"
                  placeholder={t('create.pinEnter')}
                  className="mt-2 w-32 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm tabular-nums outline-none focus:border-accent/50"
                />
                <p className="mt-1 text-[11px] text-white/40">{t('create.pinHint')}</p>
              </>
            )}
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl border border-white/15 py-2.5 text-sm text-white/70"
          >
            {t('create.cancel')}
          </button>
          <button
            type="button"
            disabled={busy || (usePin && pin.length !== 4)}
            onClick={submit}
            className="flex-1 rounded-xl bg-gradient-to-r from-accent to-accent-soft py-2.5 text-sm font-semibold text-night disabled:opacity-40"
          >
            {busy ? t('create.creating') : t('create.confirm')}
          </button>
        </div>
      </div>
    </Overlay>
  );
}

// ── generische Overlay/Head-Bausteine ─────────────────────────────────
export function Overlay({
  children,
  onClose,
  align = 'center',
}: {
  children: React.ReactNode;
  onClose: () => void;
  align?: 'center' | 'right';
}) {
  return (
    <div
      className={`fixed inset-0 z-40 flex bg-black/60 backdrop-blur-sm ${
        align === 'right' ? 'justify-end' : 'items-center justify-center p-4'
      }`}
      onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()} className={align === 'right' ? 'h-full' : ''}>
        {children}
      </div>
    </div>
  );
}

export function ModalHead({ title, onClose, closeLabel }: { title: string; onClose: () => void; closeLabel: string }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h3 className="text-base font-bold text-white">{title}</h3>
      <button type="button" aria-label={closeLabel} onClick={onClose} className="text-white/50 hover:text-white">
        ✕
      </button>
    </div>
  );
}
