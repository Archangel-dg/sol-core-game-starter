'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import type { EngineDef } from '@/lib/engines';
import type {
  PvpLobbyView,
  PvpOpenLobby,
  PvpStatsView,
  PvpChatMessage,
  PvpMatchView,
  DiceProView,
  DiceProEventView,
} from '@/lib/solcore';
import { buildDepositTx } from '@/lib/player-program';
import { toSol, solToLamports } from '@/lib/lamports';
import { useBalanceFreeze } from '@/lib/balance-freeze';
import { usePlayerAuth } from '@/lib/player-auth';
import { usePvpLang, pvpErrorText, type TFn } from '@/lib/pvp-i18n';
// Die Farkle-Wertung (push-your-luck) teilt sich dice-pro mit dice-duel: die
// reinen Helfer aus dice-duel.ts spiegeln die eingefrorene Backend-Paytable und
// dienen NUR der Anzeige — der Server wertet jeden Zug neu.
import { scoreSelection, keepValuesOf, DICE_DUEL_PAYTABLE, DIE_PIPS } from '@/lib/dice-duel';
// `points-system` (Stage 2) teilt die push-your-luck-Zug-Maschine, wertet aber
// gegen die KONFIGURIERBARE Creator-Paytable statt der eingefrorenen Farkle-
// Tabelle: der parametrisierte Anzeige-Kern + die Paytable-Zeilen kommen aus
// dice-pro.ts, gespeist vom `engineConfig.paytable`-Echo des Servers.
import {
  parseDiceProPaytable,
  makeDiceProKernel,
  paytableDisplayRows,
  type DiceProPaytable,
  type PaytableRow,
} from '@/lib/dice-pro';
// Die GESAMTE Lobby-Hülle (Hero, Tabelle, Raum, Wallet/Menü/Info/Create,
// Overlay/Head, Helfer) wird 1:1 aus PvpGame wiederverwendet — nur die
// In-Match-Sicht ist neu (konfigurierbares Dice-Pro-Board statt Coin-Reveal).
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
 * PvP-Dice-Pro-Frontend (docs/pvp-plan.md, "Dice Pro"). Wiederverwendet die
 * komplette Lobby-Erfahrung von PvpGame (Header, Wallet-Modal, Lobby-Browser,
 * Lobby-Raum, Menü, Balance-Freeze, 1-s-Poll) und ersetzt NUR die In-Match-Sicht
 * durch ein konfigurierbares Dice-Pro-Board. Drei Templates aus dem `dicePro`-
 * Block der Match-Sicht: `single-roll-compare` (ein Wurf je Zug, sum/high-die,
 * kein Keep), `push-your-luck` (klassisches 6d6-Farkle: Keep-Auswahl, Roll/Bank,
 * Bust-Reveal) und `points-system` (dieselbe Push-your-luck-Zug-Maschine, aber
 * die Wertung + angezeigte Tabelle kommen aus der KONFIGURIERBAREN Creator-
 * Paytable des `engineConfig.paytable`-Echos statt der fixen Farkle-Tabelle).
 * Ergebnisse kommen ausschließlich vom Server; das Board rechnet Auswahl-Punkte
 * nur zur Anzeige. Züge laufen über moneyFetch (Spieler-Token), die Match-Sicht
 * wird token-frei gepollt (wie bei dice-duel).
 */

const LOBBY_STORE_KEY = 'sc_pvp_lobby';
const MATCH_STORE_KEY = 'sc_pvp_match';
const SEAT_STORE_KEY = 'sc_pvp_seat';
const SOUND_STORE_KEY = 'sc_pvp_sound';

export function DiceProGame({
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

  // Nur `points-system`: die vom Server geechote Creator-Paytable (singles/
  // ofAKind/straight) — Quelle für die Wertungs-Anzeige UND den parametrisierten
  // Auswahl-Kern (dice-pro.ts). Fehlt sie (andere Templates / alter Stand), bleibt
  // sie null und das Board fällt auf die klassische Farkle-Tabelle zurück.
  const paytable = useMemo(
    () => parseDiceProPaytable((engineConfig as Record<string, unknown> | null | undefined)?.paytable ?? null),
    [engineConfig],
  );

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

  // ── Poll: volle Match-Sicht (mit dicePro-Block) — token-frei ──
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
  const dp = matchView?.dicePro ?? null;
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

  // Dice-Pro-Zug: keep (Augen, bei single-roll-compare leer) + roll|bank.
  // moneyFetch trägt das Spieler-Token; die Antwort ist die frische Match-Sicht.
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
          <DiceProEnd
            t={t}
            dp={dp}
            mySeat={mySeat}
            result={matchView?.result ?? null}
            potLamports={matchView?.potLamports ?? '0'}
            matchId={matchId}
            verifierUrl={verifierUrl}
            onBack={backToLobbies}
          />
        ) : mStatus === 'playing' && dp ? (
          dp.phase === 'busted' ? (
            // Ruhephase (~3 s, nur push-your-luck): der gebustete Wurf wird
            // enthüllt (Würfel + Lose-Animation). Der Server schaltet automatisch
            // weiter — hier KEINE Zug-Steuerung (ein /move wird abgelehnt).
            <DiceProBust t={t} dp={dp} mySeat={mySeat} reduced={reduced} play={play} />
          ) : (
            <DiceProBoard
              t={t}
              dp={dp}
              mySeat={mySeat}
              serverNow={serverNow}
              busy={moveBusy}
              reduced={reduced}
              error={moveError}
              paytable={paytable}
              onMove={(keep, action) => void doMove(keep, action)}
            />
          )
        ) : mStatus === 'drawing' ? (
          <StatusCard t={t} label={t('dp.settling')} />
        ) : (
          <StatusCard t={t} label={t('dp.starting')} />
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

      <footer className="mt-8 flex items-center justify-center gap-2 text-[11px] text-white/30">
        <a href={platformUrl ?? verifierUrl} target="_blank" rel="noopener noreferrer" className="hover:text-white/60">
          {t('info.poweredBy')}
        </a>
      </footer>

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
              await connection.confirmTransaction(sig, 'confirmed');
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

/** Format-Label (Siegbedingung) aus dem dicePro-Block. */
function formatLabel(dp: DiceProView, t: TFn): string {
  return dp.winCondition === 'first-to-target'
    ? t('dp.formatTarget', { score: dp.targetScore })
    : t('dp.formatHighest', { turns: dp.turnsPerSeat });
}

/** true ⇒ das Template ist `points-system` (konfigurierbare Creator-Paytable).
 * `dp.template`/`dp.scoreMode` tragen dafür Werte ('points-system'/'farkle-config'),
 * die noch NICHT in der eingefrorenen DiceProView-Union (Systemvertrag) stehen —
 * daher hier lokal verbreitert gelesen. */
export function isPointsSystem(dp: DiceProView): boolean {
  return (dp.template as string) === 'points-system' || (dp.scoreMode as string) === 'farkle-config';
}

/** Scoring-Label je scoreMode/Template (Anzeige). */
function scoringLabel(dp: DiceProView, t: TFn): string {
  if (isPointsSystem(dp)) return t('dp.scoringPoints');
  if (dp.scoreMode === 'farkle') return t('dp.scoreFarkle');
  if (dp.scoreMode === 'high-die') return t('dp.scoreHighDie');
  return t('dp.scoreSum');
}

/** Der letzte abgeschlossene Wurf (single-roll-compare) aus dem decisionLog:
 * die Augen des jüngsten 'roll' + die gebankten Punkte desselben Zugs. */
function lastSingleThrow(dp: DiceProView): { seat: 1 | 2; dice: number[]; points: number } | null {
  const log = dp.decisionLog;
  let roll: DiceProEventView | null = null;
  for (let i = log.length - 1; i >= 0; i--) {
    if (log[i]!.ev === 'roll') {
      roll = log[i]!;
      break;
    }
  }
  if (!roll || !roll.dice || roll.seat == null) return null;
  let points = 0;
  for (let i = log.length - 1; i >= 0; i--) {
    const e = log[i]!;
    if (e.turn === roll.turn && e.seat === roll.seat) {
      if (e.ev === 'bank') {
        points = e.turnScore ?? 0;
        break;
      }
      if (e.ev === 'score') points = e.points ?? 0;
    }
  }
  return { seat: roll.seat, dice: roll.dice, points };
}

/** Kurzbeschreibung des letzten Zug-Ereignisses (push-your-luck). */
function lastEventText(dp: DiceProView, mySeat: number | null, t: TFn): string | null {
  const log = dp.decisionLog;
  for (let i = log.length - 1; i >= 0; i--) {
    const e = log[i]!;
    if (e.ev === 'bust' || e.ev === 'timeout_lost') {
      return e.seat === mySeat ? t('dp.bustYou') : t('dp.bustOpp');
    }
    if (e.ev === 'bank') {
      const pts = e.turnScore ?? 0;
      return e.seat === mySeat ? t('dd.bankedYou', { points: pts }) : t('dd.bankedOpp', { points: pts });
    }
    if (e.ev === 'roll' || e.ev === 'keep' || e.ev === 'score') return null; // mitten im Zug
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

/** Statische Würfelfläche (Anzeige, nicht interaktiv). */
function StaticDie({ value, tone = 'default' }: { value: number; tone?: 'default' | 'muted' | 'bad' }) {
  const cls =
    tone === 'bad'
      ? 'border-red-400/60 bg-red-500/10 text-red-200'
      : tone === 'muted'
        ? 'border-white/10 bg-white/[0.02] text-white/40'
        : 'border-white/15 bg-white/[0.04] text-white/80';
  const size = tone === 'muted' ? 'h-8 w-8 text-2xl' : 'h-14 w-14 text-4xl';
  return (
    <span className={`grid place-items-center rounded-xl border-2 leading-none ${size} ${cls}`}>
      {DIE_PIPS[value] ?? value}
    </span>
  );
}

export function DiceProScoreboard({
  t,
  dp,
  mySeat,
}: {
  t: TFn;
  dp: DiceProView;
  mySeat: number | null;
}) {
  const myScore = mySeat === 2 ? dp.scores.seat2 : dp.scores.seat1;
  const oppScore = mySeat === 2 ? dp.scores.seat1 : dp.scores.seat2;
  const myActive = dp.activeSeat === (mySeat ?? 1);
  const oppSeat = mySeat === 2 ? 1 : 2;
  const oppActive = dp.activeSeat === oppSeat;
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
      {cell(t('dd.you'), myScore, myActive, myActive ? dp.turnScore : 0)}
      {cell(t('dd.opponent'), oppScore, oppActive, oppActive ? dp.turnScore : 0)}
    </div>
  );
}

/** Kopf-Karte: Format/Scoring + Stage + Zug + Scoreboard (beide Templates). */
function BoardHeader({ t, dp, mySeat }: { t: TFn; dp: DiceProView; mySeat: number | null }) {
  const stageBadge =
    dp.stage === 'closing'
      ? dp.closingTurnsLeft > 0
        ? t('dp.lastLicksLeft', { n: dp.closingTurnsLeft })
        : t('dp.lastLicks')
      : dp.stage === 'sudden_death'
        ? t('dd.stage.suddenDeath')
        : null;
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] uppercase tracking-wider text-white/40">
          {formatLabel(dp, t)} · {scoringLabel(dp, t)}
        </span>
        <div className="flex items-center gap-2">
          {stageBadge && (
            <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-300">
              {stageBadge}
            </span>
          )}
          <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] text-white/50">
            {t('dd.turn', { turn: dp.turnNo })}
          </span>
        </div>
      </div>
      <div className="mt-3">
        <DiceProScoreboard t={t} dp={dp} mySeat={mySeat} />
      </div>
    </div>
  );
}

/**
 * Das In-Match-Board. Verzweigt nach Template: `single-roll-compare` (ein Wurf
 * je Zug, kein Keep) bzw. `push-your-luck` (Keep-Auswahl + Roll/Bank, Farkle).
 * Interaktiv, wenn `dp.activeSeat === mySeat`; sonst read-only. Punkte werden
 * client-seitig nur zur Anzeige gerechnet — der Server wertet neu.
 */
export function DiceProBoard({
  t,
  dp,
  mySeat,
  serverNow,
  busy,
  reduced,
  error,
  paytable = null,
  onMove,
}: {
  t: TFn;
  dp: DiceProView;
  mySeat: number | null;
  serverNow: number;
  busy: boolean;
  reduced: boolean;
  error: string | null;
  /** Nur points-system: die geechote Creator-Paytable (sonst null → klassisch). */
  paytable?: DiceProPaytable | null;
  onMove: (keep: number[], action: 'roll' | 'bank') => void;
}) {
  const myTurn = dp.activeSeat === (mySeat ?? 1);
  const secsLeft =
    dp.moveDeadline != null
      ? Math.max(0, Math.ceil((new Date(dp.moveDeadline).getTime() - serverNow) / 1000))
      : null;

  return (
    <section className="space-y-4">
      <BoardHeader t={t} dp={dp} mySeat={mySeat} />

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

      {dp.template === 'push-your-luck' || isPointsSystem(dp) ? (
        // Beide Push-your-luck-Templates teilen die GESAMTE Zug-UI (Keep-Tray,
        // Roll/Bank, Hot Dice, Bust). Nur die Wertung + angezeigte Tabelle
        // unterscheiden sich: points-system nutzt die Creator-Paytable.
        <PushYourLuckArea
          t={t}
          dp={dp}
          mySeat={mySeat}
          myTurn={myTurn}
          busy={busy}
          reduced={reduced}
          error={error}
          paytable={paytable}
          onMove={onMove}
        />
      ) : (
        <SingleRollArea t={t} dp={dp} mySeat={mySeat} myTurn={myTurn} busy={busy} error={error} onMove={onMove} />
      )}
    </section>
  );
}

/** single-roll-compare: ein Wurf je Zug, kein Keep. Zeigt den letzten Wurf aus
 * dem Log und (am eigenen Zug) einen einzelnen Roll-Button. */
function SingleRollArea({
  t,
  dp,
  mySeat,
  myTurn,
  busy,
  error,
  onMove,
}: {
  t: TFn;
  dp: DiceProView;
  mySeat: number | null;
  myTurn: boolean;
  busy: boolean;
  error: string | null;
  onMove: (keep: number[], action: 'roll' | 'bank') => void;
}) {
  const last = lastSingleThrow(dp);
  return (
    <>
      {/* Letzter Wurf */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        {last ? (
          <>
            <div className="mb-2 text-[10px] uppercase tracking-wider text-white/40">
              {last.seat === (mySeat ?? 1) ? t('dp.youRolled') : t('dp.oppRolled')}
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {last.dice.map((v, i) => (
                <StaticDie key={`last-${i}-${v}`} value={v} />
              ))}
              <span className="ml-1 text-lg font-bold tabular-nums text-accent">= {last.points}</span>
            </div>
          </>
        ) : (
          <p className="py-2 text-center text-xs text-white/40">{t('common.waitingSeed')}</p>
        )}
      </div>

      {myTurn && (
        <div className="space-y-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => onMove([], 'roll')}
            className="w-full rounded-xl bg-gradient-to-r from-accent to-accent-soft py-3 text-sm font-semibold text-night disabled:opacity-40"
          >
            {busy ? t('dp.rolling') : t('dp.roll')}
          </button>
          {error && <p className="text-center text-sm text-red-400">{error}</p>}
        </div>
      )}

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <p className="text-[11px] leading-relaxed text-white/40">{t('dp.rulesSingle')}</p>
      </div>
    </>
  );
}

/** push-your-luck (klassisches 6d6-Farkle) UND points-system (dieselbe Zug-UI,
 * aber Wertung + Tabelle aus der Creator-Paytable): Keep-Auswahl + Roll/Bank. */
function PushYourLuckArea({
  t,
  dp,
  mySeat,
  myTurn,
  busy,
  reduced,
  error,
  paytable = null,
  onMove,
}: {
  t: TFn;
  dp: DiceProView;
  mySeat: number | null;
  myTurn: boolean;
  busy: boolean;
  reduced: boolean;
  error: string | null;
  /** Nur points-system: die geechote Creator-Paytable (sonst null → klassisch). */
  paytable?: DiceProPaytable | null;
  onMove: (keep: number[], action: 'roll' | 'bank') => void;
}) {
  const [selected, setSelected] = useState<number[]>([]);
  const [showPaytable, setShowPaytable] = useState(false);

  // points-system wertet gegen die Creator-Paytable (parametrisierter Kern aus
  // dice-pro.ts); die eingefrorene push-your-luck-Variante bleibt bei der fixen
  // Farkle-Wertung (dice-duel.ts). Fehlt die Paytable (sollte bei points-system
  // nie), fällt die Anzeige-Wertung graceful auf klassisch zurück.
  const usePoints = isPointsSystem(dp) && !!paytable;
  const kernel = useMemo(
    () => (usePoints && paytable ? makeDiceProKernel(dp.faces, dp.diceCount, paytable) : null),
    [usePoints, paytable, dp.faces, dp.diceCount],
  );
  const score = kernel ? kernel.scoreSelection : scoreSelection;

  // Auswahl bei jedem neuen Wurf (oder Zugwechsel) zurücksetzen.
  const trayKey = `${dp.tableDice.join('-')}|${dp.turnNo}|${dp.keptThisTurn.length}|${dp.activeSeat}`;
  useEffect(() => {
    setSelected([]);
  }, [trayKey]);

  const keepValues = keepValuesOf(dp.tableDice, selected);
  const sel = score(keepValues);
  const selPoints = sel.valid ? sel.points : 0;
  const projected = dp.turnScore + selPoints;
  const hasSelection = keepValues.length > 0;
  const isHot = sel.valid && hasSelection && keepValues.length === dp.tableDice.length;
  const canRoll = myTurn && !busy && hasSelection && sel.valid && sel.points > 0;
  const canBank = canRoll && projected >= dp.minBankPoints;

  const toggle = (i: number) => {
    if (!myTurn || busy) return;
    setSelected((s) => (s.includes(i) ? s.filter((x) => x !== i) : [...s, i]));
  };

  return (
    <>
      {/* Würfel-Tray */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        {dp.keptThisTurn.length > 0 && (
          <div className="mb-3">
            <div className="mb-1 text-[10px] uppercase tracking-wider text-white/40">{t('dd.banked')}</div>
            <div className="flex flex-wrap gap-1">
              {dp.keptThisTurn.map((v, i) => (
                <StaticDie key={`kept-${i}`} value={v} tone="muted" />
              ))}
            </div>
          </div>
        )}

        <div className={`flex flex-wrap justify-center gap-2 ${reduced ? '' : 'transition'}`}>
          {dp.tableDice.map((v, i) => (
            <DieFace
              key={`${i}-${v}`}
              value={v}
              selected={selected.includes(i)}
              disabled={!myTurn || busy}
              onClick={() => toggle(i)}
            />
          ))}
        </div>

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
              {t('dd.needToBank', { min: dp.minBankPoints, have: projected })}
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

      {/* Letztes Ereignis */}
      {(() => {
        const last = lastEventText(dp, mySeat, t);
        return last ? <p className="text-center text-xs text-white/50">{last}</p> : null;
      })()}

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
              {(usePoints && paytable ? paytableDisplayRows(paytable, dp.faces) : (DICE_DUEL_PAYTABLE as PaytableRow[])).map(
                (row, i) => (
                  <tr key={`pt-${i}-${row.key}`} className="border-t border-white/5">
                    <td className="py-1 text-white/60">{t(row.key, row.params)}</td>
                    <td className="py-1 text-right font-semibold tabular-nums text-white/80">{row.value}</td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        )}
        <p className="mt-3 text-[11px] leading-relaxed text-white/40">
          {t(usePoints ? 'dp.rulesPoints' : 'dp.rulesPush')}
        </p>
      </div>
    </>
  );
}

/**
 * Bust-Enthüllung (push-your-luck, Design-Zone). Wird gezeigt, solange der Server
 * in der Ruhephase `phase==='busted'` steht (~3 s): die gebusteten Tischwürfel
 * bleiben sichtbar und bekommen eine Lose-Animation, darunter „wessen Bust" + der
 * verlorene Zug-Score. KEINE Zug-Steuerung — der Server schaltet selbst weiter.
 */
export function DiceProBust({
  t,
  dp,
  mySeat,
  reduced,
  play,
}: {
  t: TFn;
  dp: DiceProView;
  mySeat: number | null;
  reduced: boolean;
  play?: (freq: number, ms?: number) => void;
}) {
  const mine = dp.activeSeat === (mySeat ?? 1);
  const lost = dp.farkleLostScore ?? 0;
  const revealKey = `${dp.turnNo}-${dp.activeSeat}`;

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
          @keyframes sc-dp-shake {
            0%,100% { transform: translateX(0) rotate(0); }
            15% { transform: translateX(-5px) rotate(-3deg); }
            30% { transform: translateX(5px) rotate(3deg); }
            45% { transform: translateX(-4px) rotate(-2deg); }
            60% { transform: translateX(4px) rotate(2deg); }
            80% { transform: translateX(-2px) rotate(-1deg); }
          }
          @keyframes sc-dp-flash {
            0% { opacity: 0; }
            10% { opacity: 1; }
            100% { opacity: 0.28; }
          }
          .sc-dp-shake { animation: sc-dp-shake 0.5s ease-in-out 2 both; }
          .sc-dp-flash { animation: sc-dp-flash 0.9s ease-out forwards; }
        `}</style>
      )}

      <BoardHeader t={t} dp={dp} mySeat={mySeat} />

      {/* Der gebustete Wurf — prominent, rot, mit Lose-Animation */}
      <div key={revealKey} className="relative overflow-hidden rounded-2xl border border-red-400/40 bg-red-500/[0.06] p-6">
        <div
          aria-hidden
          className={`pointer-events-none absolute inset-0 bg-red-500/25 ${reduced ? 'opacity-100' : 'sc-dp-flash'}`}
        />
        <div className="relative flex flex-col items-center gap-4">
          <div className={`flex flex-wrap justify-center gap-2 ${reduced ? '' : 'sc-dp-shake'}`}>
            {dp.tableDice.map((v, i) => (
              <StaticDie key={`bust-${i}-${v}`} value={v} tone="bad" />
            ))}
          </div>
          <div className="flex items-center gap-2 text-lg font-black uppercase tracking-wide text-red-300">
            <span aria-hidden className={reduced ? '' : 'animate-bounce'}>
              💥
            </span>
            <span>{mine ? t('dp.bustYou') : t('dp.bustOpp')}</span>
            <span aria-hidden>❌</span>
          </div>
          {lost > 0 && (
            <p className="text-center text-sm font-semibold tabular-nums text-red-300/90">
              {t('dp.bustLost', { points: lost })}
            </p>
          )}
        </div>
      </div>

      <p className="text-center text-[11px] text-white/30">{t('dp.bustNext')}</p>
    </section>
  );
}

/** Ergebnis-Sicht (Design-Zone): Gewinner, Auszahlung, Verify-Link, zurück. */
export function DiceProEnd({
  t,
  dp,
  mySeat,
  result,
  potLamports,
  matchId,
  verifierUrl,
  onBack,
}: {
  t: TFn;
  dp: DiceProView | null;
  mySeat: number | null;
  result: { winnerSeat: number; payoutLamports: string } | null;
  potLamports: string;
  matchId: string | null;
  verifierUrl: string;
  onBack: () => void;
}) {
  const winnerSeat = result?.winnerSeat ?? dp?.winnerSeat ?? null;
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
        {settled ? (win ? t('reveal.youWon') : t('reveal.youLost')) : t('dp.settling')}
      </p>
      <p className="mt-1 text-sm text-white/50">
        {t('reveal.payout')}: {toSol(payout)} ◎
      </p>

      {dp && (
        <div className="mx-auto mt-4 max-w-[16rem]">
          <DiceProScoreboard t={t} dp={dp} mySeat={mySeat} />
        </div>
      )}

      <div className="mt-5 space-y-3">
        <p className="text-[11px] text-white/30">{t('reveal.settledAway')}</p>
        {matchId && (
          <a
            href={`/api/pvp/verify/${matchId}`}
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
