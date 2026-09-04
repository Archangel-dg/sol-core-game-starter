'use client';
import { verifyHref } from './VerifyLink';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import type { EngineDef } from '@/lib/engines';
import type {
  PvpLobbyView,
  PvpOpenLobby,
  PvpStatsView,
  PvpChatMessage,
  PvpMatchView,
  DiceDuelView,
} from '@/lib/solcore';
import { buildDepositTx, warteAufBestaetigung } from '@/lib/player-program';
import { toSol, solToLamports } from '@/lib/lamports';
import { Amount } from './Amount';
import { useBalanceFreeze } from '@/lib/balance-freeze';
import { usePlayerAuth } from '@/lib/player-auth';
import { usePvpLang, pvpErrorText, PVP_LANGS, type TFn } from '@/lib/pvp-i18n';
import { scoreSelection, keepValuesOf, DICE_DUEL_PAYTABLE, DIE_PIPS } from '@/lib/dice-duel';
// Die GESAMTE Lobby-Hülle (Hero, Tabelle, Raum, Wallet/Menü/Info/Create,
// Overlay/Head, Helfer) wird 1:1 aus PvpGame wiederverwendet — nur die
// In-Match-Sicht ist neu (rundenbasiertes Farkle-Board statt Coin-Reveal).
import {
  Hero,
  OpenLobbiesTable,
  LobbyRoom,
  WalletModal,
  MenuDrawer,
  InfoModal,
  CreateLobbyDialog,
  randomHexSeed,
  makeBlip,
  type JsonErr,
  type PvpGameProps,
} from './PvpGame';

/**
 * PvP-Dice-Duel-Frontend (docs/pvp-plan.md Phase 2, "Dice Risk"). Wiederverwendet
 * die komplette Lobby-Erfahrung von PvpGame (Header, Wallet-Modal, Lobby-Browser,
 * Lobby-Raum, Menü, Balance-Freeze, 1-s-Poll) und ersetzt NUR die In-Match-Sicht
 * durch ein rundenbasiertes Farkle-Board: Würfel-Tray (Augen wählen), Roll/Bank,
 * Scoreboard, Zug-Timer (serverTime-Offset), Ende mit Verify. Ergebnisse kommen
 * ausschließlich vom Server; das Board rechnet Auswahl-Punkte nur zur Anzeige.
 */

const LOBBY_STORE_KEY = 'sc_pvp_lobby';
const MATCH_STORE_KEY = 'sc_pvp_match';
const SEAT_STORE_KEY = 'sc_pvp_seat';
const SOUND_STORE_KEY = 'sc_pvp_sound';

export function DiceDuelGame({
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

  // ── Match (In-Play) ──
  const [matchId, setMatchId] = useState<string | null>(null);
  const [matchView, setMatchView] = useState<PvpMatchView | null>(null);
  const [mySeat, setMySeat] = useState<number | null>(null);
  const [moveBusy, setMoveBusy] = useState(false);
  const [moveError, setMoveError] = useState<string | null>(null);

  const [balance, setBalance] = useState<string | null>(null);
  const frozenRef = useRef(frozen);
  frozenRef.current = frozen;

  const [walletOpen, setWalletOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  // ── Reconnect: gemerkte Lobby + Match nach Reload fortsetzen ──
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const lid = localStorage.getItem(LOBBY_STORE_KEY);
    if (lid) setLobbyId(lid);
    const mid = localStorage.getItem(MATCH_STORE_KEY);
    if (mid) setMatchId(mid);
    const seat = localStorage.getItem(SEAT_STORE_KEY);
    if (seat === '1' || seat === '2') setMySeat(Number(seat));
  }, []);

  const clearLobby = useCallback(() => {
    setLobby(null);
    setLobbyId(null);
    setChat([]);
    chatCursor.current = '0';
    if (typeof window !== 'undefined') localStorage.removeItem(LOBBY_STORE_KEY);
  }, []);

  const backToLobbies = useCallback(() => {
    clearLobby();
    setMatchId(null);
    setMatchView(null);
    setMySeat(null);
    setMoveError(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(MATCH_STORE_KEY);
      localStorage.removeItem(SEAT_STORE_KEY);
    }
  }, [clearLobby]);

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
            // API-700 = Lobby weg / kein Mitglied mehr. Läuft noch ein Match
            // (Board/Ende sichtbar), NUR die Lobby lösen — die Match-Sicht kommt
            // aus dem eigenen Match-Poll und überlebt die Lobby-Auflösung.
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

  // Sobald die Lobby ein Match trägt, dessen ID + eigenen Sitz merken (der Sitz
  // kommt aus den Lobby-Mitgliedern und überlebt dann die Lobby-Auflösung).
  useEffect(() => {
    const m = lobby?.match ?? null;
    if (m?.matchId) {
      setMatchId(m.matchId);
      if (typeof window !== 'undefined') localStorage.setItem(MATCH_STORE_KEY, m.matchId);
    }
    const mine = lobby?.members.find((x) => x.wallet === wallet)?.seatNo ?? null;
    if (mine === 1 || mine === 2) {
      setMySeat(mine);
      if (typeof window !== 'undefined') localStorage.setItem(SEAT_STORE_KEY, String(mine));
    }
  }, [lobby, wallet]);

  // ── Poll: volle Match-Sicht (mit diceDuel-Block) ──
  useEffect(() => {
    if (!matchId) return;
    let stopped = false;
    const tick = async () => {
      try {
        const v = (await fetch(`/api/pvp/match/${matchId}`).then((r) => r.json())) as PvpMatchView &
          JsonErr;
        if (stopped || v?.error) return;
        setMatchView(v);
        if (v.serverTime) setOffsetMs(new Date(v.serverTime).getTime() - Date.now());
        // Eigenen Sitz auch aus der Match-Sicht ableiten, falls ein Zug volle
        // (unmaskierte) Wallets geliefert hat und die Lobby schon weg ist.
        if (mySeat === null && wallet) {
          const s = v.seats?.find((x) => x.wallet === wallet)?.seat ?? null;
          if (s === 1 || s === 2) {
            setMySeat(s);
            if (typeof window !== 'undefined') localStorage.setItem(SEAT_STORE_KEY, String(s));
          }
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
  }, [matchId, mySeat, wallet]);

  // Weiche Uhr (100 ms) für Zug-Timer + Progression.
  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 100);
    return () => clearInterval(id);
  }, []);

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

  const serverNow = nowTick + offsetMs;
  const dd = matchView?.diceDuel ?? null;
  const mStatus = matchView?.status ?? null;
  // Ein laufendes/abgeschlossenes Match beansprucht die Bühne (die Lobby-Sicht
  // tritt zurück). failed/voided ⇒ das Match ist nie gelaufen (Refund) → zurück.
  const inMatch =
    !!matchId &&
    (mStatus === 'locked' ||
      mStatus === 'staked' ||
      mStatus === 'playing' ||
      mStatus === 'drawing' ||
      mStatus === 'settled');
  // Ergebnis erst bei 'settled' zeigen (der Gewinn ist dann gutgeschrieben);
  // die kurze 'drawing'-Phase zeigt "wird abgerechnet…" (Balance-Freeze läuft).
  const matchEnded = mStatus === 'settled';

  // failed/voided → Match aufräumen, Lobby-Poll übernimmt (reopent mit Fehler).
  useEffect(() => {
    if (mStatus === 'failed' || mStatus === 'voided') {
      setError(pvpErrorText(lang, matchView?.failReason === 'seed_rotated' ? 'API-707' : undefined));
      setMatchId(null);
      setMatchView(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem(MATCH_STORE_KEY);
        localStorage.removeItem(SEAT_STORE_KEY);
      }
    }
  }, [mStatus, matchView, lang]);

  // Balance-Freeze am Match-Ende (Gewinn wird beim Settle gutgeschrieben).
  const frozenMatch = useRef<string | null>(null);
  useEffect(() => {
    if ((mStatus === 'drawing' || mStatus === 'settled') && matchId && frozenMatch.current !== matchId) {
      frozenMatch.current = matchId;
      freezeUntil(Date.now() + 4_000);
      setTimeout(() => void refreshBalance(), 4_500);
    }
  }, [mStatus, matchId, freezeUntil, refreshBalance]);

  // Ergebnis-Sound + Stats-Refresh, sobald settled.
  const settledShown = useRef<string | null>(null);
  useEffect(() => {
    if (mStatus === 'settled' && matchId && settledShown.current !== matchId) {
      settledShown.current = matchId;
      const win = matchView?.result?.winnerSeat === mySeat;
      play(win ? 660 : 180, 220);
      void refreshStats();
    }
  }, [mStatus, matchId, matchView, mySeat, play, refreshStats]);

  // ── Aktionen ──
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

  // Dice-Duel-Zug: keep (Augen) + roll|bank. moneyFetch trägt das Spieler-Token;
  // die Antwort ist die frische Match-Sicht (sofort übernommen, danach re-pollt).
  const doMove = useCallback(
    async (keep: number[], action: 'roll' | 'bank') => {
      if (!wallet || !matchId) return;
      setMoveBusy(true);
      setMoveError(null);
      try {
        const r = (await moneyFetch(`/api/pvp/match/${matchId}/move`, {
          playerWallet: wallet,
          keep,
          action,
        })) as PvpMatchView & JsonErr;
        if (r?.error) {
          const code = r.error.code;
          const reason = r.error.reason;
          if (code === 'API-710') setMoveError(t('dd.err.notYourTurn'));
          else if (code === 'API-712') setMoveError(t('dd.err.staleMove'));
          else if (code === 'API-204') {
            setMoveError(
              reason === 'dice_not_on_table'
                ? t('dd.err.diceNotOnTable')
                : reason === 'cannot_bank'
                  ? t('dd.err.cannotBank')
                  : t('dd.err.invalidSelection'),
            );
          } else setMoveError(pvpErrorText(lang, code));
          return;
        }
        setMatchView(r);
        play(action === 'bank' ? 620 : 440, 70);
      } catch (e) {
        setMoveError((e as Error).message);
      } finally {
        setMoveBusy(false);
      }
    },
    [wallet, matchId, moneyFetch, t, lang, play],
  );

  const stakeBounds = useMemo(() => {
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

  const iAmHost = !!lobby && lobby.hostWallet === wallet;
  const meMember = lobby?.members.find((x) => x.wallet === wallet) ?? null;
  const iAmReady = meMember?.ready ?? false;

  return (
    <main className="mx-auto min-h-screen max-w-md px-4 pb-10">
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

      {inMatch ? (
        matchEnded ? (
          <DiceDuelEnd
            t={t}
            dd={dd}
            mySeat={mySeat}
            result={matchView?.result ?? null}
            potLamports={matchView?.potLamports ?? '0'}
            matchId={matchId}
            verifierUrl={verifierUrl}
            onBack={backToLobbies}
          />
        ) : mStatus === 'playing' && dd ? (
          dd.phase === 'farkled' ? (
            // Ruhephase (~3 s): der gefarkelte Wurf wird enthüllt (Würfel +
            // Lose-Animation). Der Server schaltet automatisch weiter — hier
            // KEINE Zug-Steuerung (ein /move wird serverseitig abgelehnt).
            <DiceDuelFarkle t={t} dd={dd} mySeat={mySeat} reduced={reduced} play={play} />
          ) : (
            <DiceDuelBoard
              t={t}
              dd={dd}
              mySeat={mySeat}
              serverNow={serverNow}
              busy={moveBusy}
              reduced={reduced}
              error={moveError}
              onMove={(keep, action) => void doMove(keep, action)}
            />
          )
        ) : mStatus === 'drawing' ? (
          <StatusCard t={t} label={t('dd.settling')} />
        ) : (
          <StatusCard t={t} label={t('dd.starting')} />
        )
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
            icon="🎲"
          />
          <OpenLobbiesTable t={t} lobbies={openLobbies} busy={busy} onJoin={(id, pin) => void doJoin(id, pin)} />
        </>
      )}

      {error && (
        <p className="mt-4 rounded-lg border border-red-400/30 bg-red-400/[0.06] p-3 text-sm text-red-300">
          {error}
        </p>
      )}

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
          canCreate={connected && !lobby && !inMatch}
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

// ── In-Match: Board (Design-Zone) ──────────────────────────────────────

/** Zwischenzustand (Staking/Settling) — schlichte Karte. */
function StatusCard({ t, label }: { t: TFn; label: string }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
      <div className="mx-auto mb-4 grid h-16 w-16 animate-pulse place-items-center rounded-full border border-accent/40 bg-accent/10 text-3xl">
        🎲
      </div>
      <p className="text-sm font-semibold text-white/80">{label}</p>
      <p className="mt-2 text-xs text-white/40">{t('common.waitingSeed')}</p>
    </section>
  );
}

/** Format-Label + Ziel (aus dem diceDuel-Block). */
function formatLabel(dd: DiceDuelView, t: TFn): string {
  return dd.format === 'race10000'
    ? t('dd.format.race10000', { score: dd.targetScore })
    : t('dd.format.quick3');
}

/** Kurzbeschreibung des letzten Zug-Ereignisses (für die Anzeige). */
function lastEventText(dd: DiceDuelView, mySeat: number | null, t: TFn): string | null {
  const log = dd.decisionLog;
  for (let i = log.length - 1; i >= 0; i--) {
    const e = log[i]!;
    if (e.ev === 'farkle' || e.ev === 'timeout_lost') {
      return e.seat === mySeat ? t('dd.farkleYou') : t('dd.farkleOpp');
    }
    if (e.ev === 'bank') {
      const pts = e.turnScore ?? 0;
      return e.seat === mySeat
        ? t('dd.bankedYou', { points: pts })
        : t('dd.bankedOpp', { points: pts });
    }
    if (e.ev === 'roll' || e.ev === 'keep') return null; // mitten im Zug
  }
  return null;
}

function DieFace({
  value,
  selected,
  onClick,
  disabled,
}: {
  value: number;
  selected?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className={`grid h-14 w-14 place-items-center rounded-xl border-2 text-4xl leading-none transition ${
        selected
          ? 'border-accent bg-accent/20 text-accent shadow-[0_0_12px_rgba(20,241,149,0.35)]'
          : 'border-white/15 bg-white/[0.04] text-white/80'
      } ${disabled ? 'cursor-default opacity-70' : 'hover:border-accent/50'}`}
    >
      {DIE_PIPS[value] ?? value}
    </button>
  );
}

export function DiceDuelScoreboard({
  t,
  dd,
  mySeat,
}: {
  t: TFn;
  dd: DiceDuelView;
  mySeat: number | null;
}) {
  const myScore = mySeat === 2 ? dd.scores.seat2 : dd.scores.seat1;
  const oppScore = mySeat === 2 ? dd.scores.seat1 : dd.scores.seat2;
  const myActive = dd.activeSeat === (mySeat ?? 1);
  const oppSeat = mySeat === 2 ? 1 : 2;
  const oppActive = dd.activeSeat === oppSeat;
  const cell = (label: string, score: number, active: boolean, turn: number) => (
    <div
      className={`flex-1 rounded-xl border p-3 text-center ${
        active ? 'border-accent/60 bg-accent/10' : 'border-white/10 bg-white/[0.03]'
      }`}
    >
      <div className="text-[10px] uppercase tracking-wider text-white/40">{label}</div>
      <div className="mt-1 text-2xl font-bold tabular-nums text-white">{score}</div>
      {active && turn > 0 && (
        <div className="mt-0.5 text-[11px] font-semibold text-accent tabular-nums">
          +{turn} {t('dd.turnScore')}
        </div>
      )}
    </div>
  );
  return (
    <div className="flex items-stretch gap-2">
      {cell(t('dd.you'), myScore, myActive, myActive ? dd.turnScore : 0)}
      {cell(t('dd.opponent'), oppScore, oppActive, oppActive ? dd.turnScore : 0)}
    </div>
  );
}

/**
 * Farkle-Enthüllung (Design-Zone). Wird gezeigt, solange der Server in der
 * Ruhephase `phase==='farkled'` steht (~3 s): die gefarkelten Tischwürfel
 * bleiben sichtbar und bekommen eine Lose-Animation (Wackeln + roter Blitz),
 * darunter „wessen Farkle" + der verlorene Zug-Score. KEINE Zug-Steuerung —
 * der Server schaltet selbst zum nächsten Zug weiter (Client pollt nur).
 * `prefers-reduced-motion` ⇒ statisches rotes Farkle-Bild ohne Animation.
 */
export function DiceDuelFarkle({
  t,
  dd,
  mySeat,
  reduced,
  play,
}: {
  t: TFn;
  dd: DiceDuelView;
  mySeat: number | null;
  reduced: boolean;
  play?: (freq: number, ms?: number) => void;
}) {
  const mine = dd.activeSeat === (mySeat ?? 1);
  const lost = dd.farkleLostScore ?? 0;
  // Identität dieser Enthüllung: wechselt bei Zug/Sitz → Animation + „Lose"-
  // Blip starten neu (z. B. eigenes Farkle → direkt danach Gegner-Farkle).
  const revealKey = `${dd.turnNo}-${dd.activeSeat}`;

  // Tiefer „Lose"-Blip — einmal pro Enthüllung, nur wenn Ton an (play gesetzt).
  const played = useRef<string | null>(null);
  useEffect(() => {
    if (played.current === revealKey) return;
    played.current = revealKey;
    play?.(150, 260);
  }, [revealKey, play]);

  return (
    <section className="space-y-4" aria-live="polite">
      {!reduced && (
        <style>{`
          @keyframes sc-dd-shake {
            0%,100% { transform: translateX(0) rotate(0); }
            15% { transform: translateX(-5px) rotate(-3deg); }
            30% { transform: translateX(5px) rotate(3deg); }
            45% { transform: translateX(-4px) rotate(-2deg); }
            60% { transform: translateX(4px) rotate(2deg); }
            80% { transform: translateX(-2px) rotate(-1deg); }
          }
          @keyframes sc-dd-flash {
            0% { opacity: 0; }
            10% { opacity: 1; }
            100% { opacity: 0.28; }
          }
          .sc-dd-shake { animation: sc-dd-shake 0.5s ease-in-out 2 both; }
          .sc-dd-flash { animation: sc-dd-flash 0.9s ease-out forwards; }
        `}</style>
      )}

      {/* Kopf: Format/Ziel + Zug + Scoreboard bleibt sichtbar */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div className="flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-wider text-white/40">{formatLabel(dd, t)}</span>
          <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] text-white/50">
            {t('dd.turn', { turn: dd.turnNo })}
          </span>
        </div>
        <div className="mt-3">
          <DiceDuelScoreboard t={t} dd={dd} mySeat={mySeat} />
        </div>
      </div>

      {/* Der gefarkelte Wurf — prominent, rot, mit Lose-Animation */}
      <div
        key={revealKey}
        className="relative overflow-hidden rounded-2xl border border-red-400/40 bg-red-500/[0.06] p-6"
      >
        <div
          aria-hidden
          className={`pointer-events-none absolute inset-0 bg-red-500/25 ${reduced ? 'opacity-100' : 'sc-dd-flash'}`}
        />
        <div className="relative flex flex-col items-center gap-4">
          <div className={`flex flex-wrap justify-center gap-2 ${reduced ? '' : 'sc-dd-shake'}`}>
            {dd.tableDice.map((v, i) => (
              <span
                key={`farkle-${i}-${v}`}
                className="grid h-14 w-14 place-items-center rounded-xl border-2 border-red-400/60 bg-red-500/10 text-4xl leading-none text-red-200"
              >
                {DIE_PIPS[v] ?? v}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2 text-lg font-black uppercase tracking-wide text-red-300">
            <span aria-hidden className={reduced ? '' : 'animate-bounce'}>
              💥
            </span>
            <span>{mine ? t('dd.farkleYou') : t('dd.farkleOpp')}</span>
            <span aria-hidden>❌</span>
          </div>
          {lost > 0 && (
            <p className="text-center text-sm font-semibold tabular-nums text-red-300/90">
              {t('dd.farkleLost', { points: lost })}
            </p>
          )}
        </div>
      </div>

      {/* Nicht-interaktiv: der Server übergibt automatisch an den nächsten Zug */}
      <p className="text-center text-[11px] text-white/30">{t('dd.farkleNext')}</p>
    </section>
  );
}

/**
 * Das rundenbasierte Farkle-Board. Interaktiv, wenn `dd.activeSeat === mySeat`;
 * sonst read-only ("Gegner ist dran"). Auswahl läuft über Würfel-INDIZES und
 * wird beim Absenden auf die AUGEN abgebildet (Server-Vertrag: keep = Augen).
 * Punkte werden client-seitig nur zur Anzeige gerechnet — der Server wertet neu.
 */
export function DiceDuelBoard({
  t,
  dd,
  mySeat,
  serverNow,
  busy,
  reduced,
  error,
  onMove,
}: {
  t: TFn;
  dd: DiceDuelView;
  mySeat: number | null;
  serverNow: number;
  busy: boolean;
  reduced: boolean;
  error: string | null;
  onMove: (keep: number[], action: 'roll' | 'bank') => void;
}) {
  const [selected, setSelected] = useState<number[]>([]);
  const [showPaytable, setShowPaytable] = useState(false);
  const myTurn = dd.activeSeat === (mySeat ?? 1);

  // Auswahl bei jedem neuen Wurf (oder Zugwechsel) zurücksetzen.
  const trayKey = `${dd.tableDice.join('-')}|${dd.turnNo}|${dd.keptThisTurn.length}|${dd.activeSeat}`;
  useEffect(() => {
    setSelected([]);
  }, [trayKey]);

  const keepValues = keepValuesOf(dd.tableDice, selected);
  const sel = scoreSelection(keepValues);
  const selPoints = sel.valid ? sel.points : 0;
  const projected = dd.turnScore + selPoints;
  const hasSelection = keepValues.length > 0;
  const isHot = sel.valid && hasSelection && keepValues.length === dd.tableDice.length;
  const canRoll = myTurn && !busy && hasSelection && sel.valid && sel.points > 0;
  const canBank = canRoll && projected >= dd.minBankPoints;

  const toggle = (i: number) => {
    if (!myTurn || busy) return;
    setSelected((s) => (s.includes(i) ? s.filter((x) => x !== i) : [...s, i]));
  };

  const secsLeft =
    dd.moveDeadline != null
      ? Math.max(0, Math.ceil((new Date(dd.moveDeadline).getTime() - serverNow) / 1000))
      : null;

  const last = lastEventText(dd, mySeat, t);
  const stageBadge =
    dd.stage === 'closing'
      ? t('dd.stage.closing')
      : dd.stage === 'sudden_death'
        ? t('dd.stage.suddenDeath')
        : null;

  return (
    <section className="space-y-4">
      {/* Kopf: Format/Ziel + Stage + Turn-Indikator */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div className="flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-wider text-white/40">{formatLabel(dd, t)}</span>
          <div className="flex items-center gap-2">
            {stageBadge && (
              <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-300">
                {stageBadge}
              </span>
            )}
            <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] text-white/50">
              {t('dd.turn', { turn: dd.turnNo })}
            </span>
          </div>
        </div>
        <div className="mt-3">
          <DiceDuelScoreboard t={t} dd={dd} mySeat={mySeat} />
        </div>
      </div>

      {/* Turn-Indikator + Timer */}
      <div
        className={`rounded-2xl border p-3 text-center text-sm font-semibold ${
          myTurn ? 'border-accent/50 bg-accent/10 text-accent' : 'border-white/10 bg-white/[0.03] text-white/60'
        }`}
      >
        {myTurn ? t('dd.yourTurn') : t('dd.waiting')}
        {secsLeft != null && (
          <span className="ml-2 tabular-nums text-white/50">
            · {secsLeft <= 0 ? t('dd.timeUp') : t('dd.timeLeft', { sec: secsLeft })}
          </span>
        )}
      </div>

      {/* Letztes Ereignis */}
      {last && <p className="text-center text-xs text-white/50">{last}</p>}

      {/* Würfel-Tray */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        {dd.keptThisTurn.length > 0 && (
          <div className="mb-3">
            <div className="mb-1 text-[10px] uppercase tracking-wider text-white/40">{t('dd.banked')}</div>
            <div className="flex flex-wrap gap-1">
              {dd.keptThisTurn.map((v, i) => (
                <span
                  key={`kept-${i}`}
                  className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-white/[0.02] text-2xl leading-none text-white/40"
                >
                  {DIE_PIPS[v] ?? v}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className={`flex flex-wrap justify-center gap-2 ${reduced ? '' : 'transition'}`}>
          {dd.tableDice.map((v, i) => (
            <DieFace
              key={`${i}-${v}`}
              value={v}
              selected={selected.includes(i)}
              disabled={!myTurn || busy}
              onClick={() => toggle(i)}
            />
          ))}
        </div>

        {/* Auswahl-Feedback */}
        {myTurn && (
          <div className="mt-3 text-center text-xs">
            {!hasSelection ? (
              <span className="text-white/40">{t('dd.pickHint')}</span>
            ) : !sel.valid ? (
              <span className="text-red-300">{t('dd.notScoring')}</span>
            ) : (
              <span className="text-white/70">
                {t('dd.selection')}: <span className="font-semibold text-accent tabular-nums">+{selPoints}</span>
                {isHot && <span className="ml-2 font-semibold text-amber-300">🔥 {t('dd.hotDice')}</span>}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Aktionen (nur am eigenen Zug) */}
      {myTurn && (
        <div className="space-y-2">
          {!canBank && sel.valid && hasSelection && (
            <p className="text-center text-[11px] text-white/40">
              {t('dd.needToBank', { min: dd.minBankPoints, have: projected })}
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={!canRoll}
              onClick={() => onMove(keepValues, 'roll')}
              className="flex-1 rounded-xl bg-gradient-to-r from-accent to-accent-soft py-3 text-sm font-semibold text-night disabled:opacity-40"
            >
              {busy ? t('dd.rolling') : t('dd.roll')}
            </button>
            <button
              type="button"
              disabled={!canBank}
              onClick={() => onMove(keepValues, 'bank')}
              className="flex-1 rounded-xl border border-accent/40 bg-accent/10 py-3 text-sm font-semibold text-accent disabled:opacity-40"
            >
              {t('dd.bank')}
            </button>
          </div>
          {error && <p className="text-center text-sm text-red-400">{error}</p>}
        </div>
      )}

      {/* Paytable (aufklappbar) */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <button
          type="button"
          onClick={() => setShowPaytable((s) => !s)}
          className="flex w-full items-center justify-between text-[10px] uppercase tracking-wider text-white/40"
        >
          <span>{t('dd.paytable')}</span>
          <span>{showPaytable ? '▲' : '▼'}</span>
        </button>
        {showPaytable && (
          <table className="mt-3 w-full text-xs">
            <tbody>
              {DICE_DUEL_PAYTABLE.map((row) => (
                <tr key={row.key} className="border-t border-white/5">
                  <td className="py-1 text-white/60">{t(row.key)}</td>
                  <td className="py-1 text-right font-semibold tabular-nums text-white/80">{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="mt-3 text-[11px] leading-relaxed text-white/40">{t('dd.rules')}</p>
      </div>
    </section>
  );
}

/** Ergebnis-Sicht (Design-Zone): Gewinner, Auszahlung, Verify-Link, zurück. */
export function DiceDuelEnd({
  t,
  dd,
  mySeat,
  result,
  potLamports,
  matchId,
  verifierUrl,
  onBack,
}: {
  t: TFn;
  dd: DiceDuelView | null;
  mySeat: number | null;
  result: { winnerSeat: number; payoutLamports: string } | null;
  potLamports: string;
  matchId: string | null;
  verifierUrl: string;
  onBack: () => void;
}) {
  const winnerSeat = result?.winnerSeat ?? dd?.winnerSeat ?? null;
  const settled = winnerSeat !== null;
  const win = settled && winnerSeat === (mySeat ?? 1);
  const payout = result?.payoutLamports ?? potLamports;

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center">
      <div className="mx-auto flex h-32 items-center justify-center">
        <div
          className={`grid h-24 w-24 place-items-center rounded-full border-2 text-4xl ${
            settled
              ? win
                ? 'border-accent bg-accent/15 text-accent'
                : 'border-red-400/50 bg-red-400/10 text-red-300'
              : 'border-accent/40 bg-accent/10 text-accent'
          }`}
          aria-live="polite"
        >
          {settled ? (win ? '🏆' : '💀') : '🎲'}
        </div>
      </div>
      <p className={`mt-3 text-xl font-bold ${settled ? (win ? 'text-accent' : 'text-red-400') : 'text-white/80'}`}>
        {settled ? (win ? t('reveal.youWon') : t('reveal.youLost')) : t('dd.settling')}
      </p>
      <p className="mt-1 text-sm text-white/50">
        {/* Der Moment, in dem die Frage „wie viel ist das" wirklich gestellt
            wird — hier steht die Naeherung, sonst nirgends im Duell. */}
        {t('reveal.payout')}: <Amount lamports={payout} layout="inline" />
      </p>

      {dd && (
        <div className="mx-auto mt-4 max-w-[16rem]">
          <DiceDuelScoreboard t={t} dd={dd} mySeat={mySeat} />
        </div>
      )}

      <div className="mt-5 space-y-3">
        <p className="text-[11px] text-white/30">{t('reveal.settledAway')}</p>
        {matchId && (
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
    </section>
  );
}
