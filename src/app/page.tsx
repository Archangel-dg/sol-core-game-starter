'use client';
import { useT } from '@/lib/i18n';

import { useEffect, useRef, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { HeaderBar } from '@/components/HeaderBar';
import { DemoProvider, useDemo } from '@/components/DemoProvider';
import { SingleBetGame, type RoundLog } from '@/components/SingleBetGame';
import { SessionGame } from '@/components/SessionGame';
import { TournamentGame } from '@/components/TournamentGame';
import { DemoTournamentGame } from '@/components/DemoTournamentGame';
import { LiveGame } from '@/components/LiveGame';
import { LiveCrashGame } from '@/components/LiveCrashGame';
import { LiveDriftGame } from '@/components/LiveDriftGame';
import { PvpGame } from '@/components/PvpGame';
import { DemoPvpGame } from '@/components/DemoPvpGame';
import { DiceDuelGame } from '@/components/DiceDuelGame';
import { DemoDiceDuelGame } from '@/components/DemoDiceDuelGame';
import { DiceProGame } from '@/components/DiceProGame';
import { DemoDiceProGame } from '@/components/DemoDiceProGame';
import { BalanceFreezeProvider } from '@/lib/balance-freeze';
import { getEngine } from '@/lib/engines';
import { isMainnet, networkLabel } from '@/lib/solana';

interface Meta {
  gameName: string;
  engine: string;
  mechanic: 'single' | 'session' | 'tournament' | 'live' | 'pvp';
  gameId: string;
  apiUrl: string;
  verifierUrl: string;
  devMock: boolean;
  network: string;
  engineConfig?: Record<string, number> | null;
  serverMode?: string | null;
  warning?: string;
  error?: { message: string };
}

export default function Home() {
  const [meta, setMeta] = useState<Meta | null>(null);
  useEffect(() => {
    fetch('/api/meta')
      .then((r) => r.json())
      .then(setMeta)
      .catch(() => setMeta({ error: { message: 'backend_unreachable' } } as Meta));
  }, []);
  return (
    // Der Balance-Freeze steht GANZ oben — über dem DemoProvider. Sonst kann
    // der Demo-Saldo ihn nicht sehen und verrät den Ausgang mitten in der
    // Animation, genau wie es der echte Saldo vor dem 04.09.2026 tat.
    <BalanceFreezeProvider>
      <DemoProvider>
        <HomeInner meta={meta} />
      </DemoProvider>
    </BalanceFreezeProvider>
  );
}

function HomeInner({ meta }: { meta: Meta | null }) {
  const t = useT();
  const { demo, starting, error: demoError, startDemo, exitDemo } = useDemo();
  const { connected } = useWallet();
  const [seedHash, setSeedHash] = useState<string | null>(null);
  const [roundId, setRoundId] = useState<string | null>(null);
  const [history, setHistory] = useState<RoundLog[]>([]);
  /** Zuletzt AUFGEDECKTER Gewinn für die Meldung in der Kopfleiste. `key`
   *  zählt hoch, damit zwei gleich hohe Gewinne hintereinander zwei Meldungen
   *  ergeben und nicht eine stumme. */
  const [win, setWin] = useState<{ payoutLamports: string; key: number } | null>(null);

  const engine = meta && !meta.error ? getEngine(meta.engine) : undefined;
  const onRound = (h: string, r: string) => {
    setSeedHash(h);
    setRoundId(r);
  };
  // Die Spiele rufen onLog erst, wenn die Animation das Ergebnis ZEIGT — der
  // Verlauf und die Gewinnmeldung dürfen es keine Sekunde früher verraten.
  const onLog = (r: RoundLog) => {
    setHistory((h) => [r, ...h].slice(0, 20));
    if (r.win) setWin((w) => ({ payoutLamports: r.payoutLamports, key: (w?.key ?? 0) + 1 }));
  };

  // Demo-Modus ist die Eingangstür (Systemvertrag): Er startet von selbst,
  // sobald das Spiel geladen ist und keine Wallet verbunden ist — einmal je
  // Seitenaufruf, damit ein bewusstes „Exit" nicht sofort wieder übersteuert
  // wird. Live-Runden haben keinen Demo-Modus; devMock zeigt ohnehin kein Geld.
  const demoDoor = !!meta && !meta.error && !meta.devMock && meta.mechanic !== 'live';
  const autoTried = useRef(false);
  useEffect(() => {
    if (!demoDoor || autoTried.current) return;
    if (connected || demo || starting || demoError) return;
    autoTried.current = true;
    void startDemo();
  }, [demoDoor, connected, demo, starting, demoError, startDemo]);

  // Sobald eine Wallet verbindet, endet der Demo-Modus: Ab hier zählt das
  // echte Konto, und das Demo-Abzeichen verschwindet aus der Kopfleiste.
  useEffect(() => {
    if (connected && demo) exitDemo();
  }, [connected, demo, exitDemo]);

  // PvP bringt sein eigenes Full-Bleed-Layout mit (Header-Bar mit Wallet-Modal +
  // Menü, Lobby-Browser, Lobby-Raum, Reveal). Im Demo-Modus gegen den Server-Bot
  // (DemoPvpGame), sonst die echte Lobby-Erfahrung — Fork wie im Turnier-Zweig.
  if (meta && !meta.error && engine && meta.mechanic === 'pvp') {
    // Erst nach Engine verzweigen (dice-duel = rundenbasiertes Board, sonst
    // Coin-Flip-Reveal), dann pro Engine nach Demo/echt — beide teilen die
    // Lobby-Erfahrung. Demo läuft gegen den Server-Bot auf Sim-Balance.
    return (
      <>
        {engine.key === 'pvp-dice-duel' ? (
          demo ? (
            <DemoDiceDuelGame
              engine={engine}
              gameName={meta.gameName}
              engineConfig={meta.engineConfig}
              verifierUrl={meta.verifierUrl}
            />
          ) : (
            <DiceDuelGame
              engine={engine}
              gameId={meta.gameId}
              gameName={meta.gameName}
              engineConfig={meta.engineConfig}
              verifierUrl={meta.verifierUrl}
              devMock={meta.devMock}
              onDemoPlay={startDemo}
            />
          )
        ) : engine.key === 'pvp-dice-pro' ? (
          demo ? (
            <DemoDiceProGame
              engine={engine}
              gameName={meta.gameName}
              engineConfig={meta.engineConfig}
              verifierUrl={meta.verifierUrl}
            />
          ) : (
            <DiceProGame
              engine={engine}
              gameId={meta.gameId}
              gameName={meta.gameName}
              engineConfig={meta.engineConfig}
              verifierUrl={meta.verifierUrl}
              devMock={meta.devMock}
              onDemoPlay={startDemo}
            />
          )
        ) : demo ? (
          <DemoPvpGame
            engine={engine}
            gameName={meta.gameName}
            engineConfig={meta.engineConfig}
            verifierUrl={meta.verifierUrl}
          />
        ) : (
          <PvpGame
            engine={engine}
            gameId={meta.gameId}
            gameName={meta.gameName}
            engineConfig={meta.engineConfig}
            verifierUrl={meta.verifierUrl}
            devMock={meta.devMock}
            onDemoPlay={startDemo}
          />
        )}
      </>
    );
  }

  const subtitle = [
    networkLabel,
    engine?.label ?? meta?.engine ?? '…',
    meta?.mechanic === 'session' ? t('app.mechanic.session') : null,
    meta?.mechanic === 'tournament' ? t('app.mechanic.tournament') : null,
    meta?.mechanic === 'live' ? t('app.mechanic.live') : null,
  ]
    .filter((s): s is string => !!s)
    .join(' · ');

  return (
    <>
      <div className="min-h-screen">
        {/* Kopfleiste über JEDEM Zustand (Laden, Fehler, Spiel): Spielname,
            Wallet/Guthaben mit Ein- und Auszahlen, Demo-Abzeichen, Menü mit
            Sprache, Sound, letzten Runden und Seed-Hash. Die Geld-Leiste ist
            Systemvertrag — sie steckt in der Kopfleiste (BalanceBar). */}
        <HeaderBar
          gameName={meta?.gameName ?? t('app.defaultGameName')}
          subtitle={subtitle}
          devMock={meta?.devMock ?? false}
          showDemo={demoDoor}
          win={win}
          menu={{
            history,
            serverSeedHash: seedHash,
            roundId,
            verifierUrl: meta?.verifierUrl ?? '',
          }}
        />

      <main className="mx-auto max-w-md px-4 pb-8">
        {meta?.error ? (
          <div className="rounded-xl border border-red-400/30 bg-red-400/[0.06] p-4 text-sm text-red-200">
            {meta.error.message === 'backend_unreachable'
              ? t('app.backendUnreachable')
              : meta.error.message}
            <br />
            <span className="text-xs text-red-200/70">{t('app.configHint')}</span>
          </div>
        ) : !meta || !engine ? (
          <p className="text-white/40">{t('app.loading')}</p>
        ) : (
          <div className="space-y-4">
            {meta.warning === 'engine_mismatch' && (
              <div className="rounded-xl border border-red-400/40 bg-red-400/10 p-4 text-sm text-red-200">
                <strong>{t('app.engineMismatchTitle')}</strong>{' '}
                {t('app.engineMismatchBody', {
                  server: meta.serverMode ?? '?',
                  app: meta.engine,
                })}
              </div>
            )}

            {meta.mechanic === 'live' ? (
              engine.key === 'live-crash' ? (
                // Crash bringt seinen eigenen geteilten Flug mit — Verify läuft
                // über /api/live-crash/round/:id.
                <LiveCrashGame engine={engine} verifierUrl={meta.verifierUrl} />
              ) : engine.key === 'live-drift' ? (
                // Drift ist die Schwester-Engine von Crash: eigener geteilter
                // Lauf auf einer Auf/Ab-Spur (Etappe 1: nur Spielgeld) —
                // Verify läuft über /api/live-drift/round/:id.
                <LiveDriftGame engine={engine} verifierUrl={meta.verifierUrl} />
              ) : (
                // Live bringt Countdown/Runden/Ergebnis-Ticker selbst mit —
                // Verify läuft über /api/game/live/verify/:roundId.
                <LiveGame engine={engine} verifierUrl={meta.verifierUrl} />
              )
            ) : meta.mechanic === 'tournament' ? (
              // Turnier bringt Countdown/Pot/Leaderboard/Proof selbst mit —
              // Verify läuft über /api/game/tournament/verify/:runId.
              demo ? (
                <DemoTournamentGame engine={engine} />
              ) : (
                <TournamentGame engine={engine} verifierUrl={meta.verifierUrl} />
              )
            ) : meta.mechanic === 'session' ? (
              <SessionGame
                engine={engine}
                gameId={meta.gameId}
                engineConfig={meta.engineConfig}
                onRound={onRound}
                onLog={onLog}
              />
            ) : (
              <SingleBetGame
                engine={engine}
                engineConfig={meta.engineConfig}
                onRound={onRound}
                onLog={onLog}
              />
            )}

            {/* Seed-Hash und letzte Runden liegen im Spielmenü (GameMenu) —
                erreichbar in jeder Mechanik, ohne die Spielfläche zu füllen. */}
            <p className="pt-2 text-center text-[11px] text-white/30">
              {demo && meta.mechanic !== 'live'
                ? t('demo.note')
                : `${t('app.serverDecides')}${isMainnet ? '' : ` ${t('app.devnetOnly')}`}`}
            </p>
          </div>
        )}
      </main>
      </div>
    </>
  );
}
