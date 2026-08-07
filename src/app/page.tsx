'use client';

import { useEffect, useState } from 'react';
import { WalletButton } from '@/components/WalletButton';
import { BalanceBar } from '@/components/BalanceBar';
import { DemoBar } from '@/components/DemoBar';
import { DemoProvider, useDemo } from '@/components/DemoProvider';
import { SingleBetGame, type RoundLog } from '@/components/SingleBetGame';
import { SessionGame } from '@/components/SessionGame';
import { TournamentGame } from '@/components/TournamentGame';
import { DemoTournamentGame } from '@/components/DemoTournamentGame';
import { LiveGame } from '@/components/LiveGame';
import { PvpGame } from '@/components/PvpGame';
import { DemoPvpGame } from '@/components/DemoPvpGame';
import { FairnessPanel } from '@/components/FairnessPanel';
import { History } from '@/components/History';
import { BalanceFreezeProvider } from '@/lib/balance-freeze';
import { getEngine } from '@/lib/engines';

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
      .catch(() => setMeta({ error: { message: 'Backend nicht erreichbar' } } as Meta));
  }, []);
  return (
    <DemoProvider>
      <HomeInner meta={meta} />
    </DemoProvider>
  );
}

function HomeInner({ meta }: { meta: Meta | null }) {
  const { demo, startDemo } = useDemo();
  const [seedHash, setSeedHash] = useState<string | null>(null);
  const [roundId, setRoundId] = useState<string | null>(null);
  const [history, setHistory] = useState<RoundLog[]>([]);

  const engine = meta && !meta.error ? getEngine(meta.engine) : undefined;
  const onRound = (h: string, r: string) => {
    setSeedHash(h);
    setRoundId(r);
  };
  const onLog = (r: RoundLog) => setHistory((h) => [r, ...h].slice(0, 20));

  // PvP bringt sein eigenes Full-Bleed-Layout mit (Header-Bar mit Wallet-Modal +
  // Menü, Lobby-Browser, Lobby-Raum, Reveal). Im Demo-Modus gegen den Server-Bot
  // (DemoPvpGame), sonst die echte Lobby-Erfahrung — Fork wie im Turnier-Zweig.
  if (meta && !meta.error && engine && meta.mechanic === 'pvp') {
    return (
      <BalanceFreezeProvider>
        {demo ? (
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
      </BalanceFreezeProvider>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-md px-4 py-8">
      <header className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-white">{meta?.gameName ?? 'Sol-Core Game'}</h1>
          <p className="text-xs text-white/40">
            Devnet · {engine?.label ?? meta?.engine ?? '…'}
            {meta?.mechanic === 'session' ? ' · Session' : ''}
            {meta?.mechanic === 'tournament' ? ' · Turnier' : ''}
            {meta?.mechanic === 'live' ? ' · Live' : ''}
          </p>
        </div>
        <WalletButton />
      </header>

      {meta?.error ? (
        <div className="rounded-xl border border-red-400/30 bg-red-400/[0.06] p-4 text-sm text-red-200">
          {meta.error.message}
          <br />
          <span className="text-xs text-red-200/70">
            Prüfe SOLCORE_API_URL / API-Key / Game-ID und NEXT_PUBLIC_ENGINE / _MECHANIC.
          </span>
        </div>
      ) : !meta || !engine ? (
        <p className="text-white/40">Lädt…</p>
      ) : (
        <BalanceFreezeProvider>
          <div className="space-y-4">
            {meta.warning === 'engine_mismatch' && (
              <div className="rounded-xl border border-red-400/40 bg-red-400/10 p-4 text-sm text-red-200">
                <strong>Engine-Konflikt:</strong> Dieses Spiel ist auf dem Server als{' '}
                <code>{meta.serverMode}</code> registriert, die App ist aber als{' '}
                <code>{meta.engine}</code> konfiguriert (NEXT_PUBLIC_ENGINE). Jede Runde wird
                fehlschlagen — Env-Variablen an die Registrierung anpassen.
              </div>
            )}

            {/* Demo-Einstieg / -Saldo. Im Demo-Modus zählt die simulierte Wallet.
                Live-Runden laufen immer echt — dort gibt es keinen Demo-Modus. */}
            {meta.mechanic !== 'live' && <DemoBar />}
            {(!demo || meta.mechanic === 'live') && <BalanceBar devMock={meta.devMock} />}

            {meta.mechanic === 'live' ? (
              // Live bringt Countdown/Runden/Ergebnis-Ticker selbst mit —
              // Verify läuft über /api/game/live/verify/:roundId.
              <LiveGame engine={engine} />
            ) : meta.mechanic === 'tournament' ? (
              // Turnier bringt Countdown/Pot/Leaderboard/Proof selbst mit —
              // Verify läuft über /api/game/tournament/verify/:runId.
              demo ? (
                <DemoTournamentGame engine={engine} />
              ) : (
                <TournamentGame engine={engine} />
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

            {meta.mechanic !== 'tournament' && meta.mechanic !== 'live' && (
              <>
                <FairnessPanel apiUrl={meta.apiUrl} verifierUrl={meta.verifierUrl} serverSeedHash={seedHash} roundId={roundId} demo={demo} />
                <History rounds={history} apiUrl={meta.apiUrl} verifierUrl={meta.verifierUrl} demo={demo} />
              </>
            )}
            <p className="pt-2 text-center text-[11px] text-white/30">
              {demo && meta.mechanic !== 'live'
                ? 'Demo-Modus — simuliertes Guthaben, jeder Spin ist echt provably-fair. Kein echtes Geld.'
                : 'Ergebnisse kommen ausschließlich vom Sol-Core-Server. Nur Devnet-Test-SOL.'}
            </p>
          </div>
        </BalanceFreezeProvider>
      )}
    </main>
  );
}
