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
import { FairnessPanel } from '@/components/FairnessPanel';
import { History } from '@/components/History';
import { getEngine } from '@/lib/engines';

interface Meta {
  gameName: string;
  engine: string;
  mechanic: 'single' | 'session' | 'tournament';
  gameId: string;
  apiUrl: string;
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
  const { demo } = useDemo();
  const [seedHash, setSeedHash] = useState<string | null>(null);
  const [roundId, setRoundId] = useState<string | null>(null);
  const [history, setHistory] = useState<RoundLog[]>([]);

  const engine = meta && !meta.error ? getEngine(meta.engine) : undefined;
  const onRound = (h: string, r: string) => {
    setSeedHash(h);
    setRoundId(r);
  };
  const onLog = (r: RoundLog) => setHistory((h) => [r, ...h].slice(0, 20));

  return (
    <main className="mx-auto min-h-screen max-w-md px-4 py-8">
      <header className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-white">{meta?.gameName ?? 'Sol-Core Game'}</h1>
          <p className="text-xs text-white/40">
            Devnet · {engine?.label ?? meta?.engine ?? '…'}
            {meta?.mechanic === 'session' ? ' · Session' : ''}
            {meta?.mechanic === 'tournament' ? ' · Turnier' : ''}
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
        <div className="space-y-4">
          {meta.warning === 'engine_mismatch' && (
            <div className="rounded-xl border border-red-400/40 bg-red-400/10 p-4 text-sm text-red-200">
              <strong>Engine-Konflikt:</strong> Dieses Spiel ist auf dem Server als{' '}
              <code>{meta.serverMode}</code> registriert, die App ist aber als{' '}
              <code>{meta.engine}</code> konfiguriert (NEXT_PUBLIC_ENGINE). Jede Runde wird
              fehlschlagen — Env-Variablen an die Registrierung anpassen.
            </div>
          )}

          {/* Demo-Einstieg / -Saldo. Im Demo-Modus zählt die simulierte Wallet. */}
          <DemoBar />
          {!demo && <BalanceBar devMock={meta.devMock} />}

          {meta.mechanic === 'tournament' ? (
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

          {meta.mechanic !== 'tournament' && (
            <>
              <FairnessPanel apiUrl={meta.apiUrl} serverSeedHash={seedHash} roundId={roundId} demo={demo} />
              <History rounds={history} apiUrl={meta.apiUrl} demo={demo} />
            </>
          )}
          <p className="pt-2 text-center text-[11px] text-white/30">
            {demo
              ? 'Demo-Modus — simuliertes Guthaben, jeder Spin ist echt provably-fair. Kein echtes Geld.'
              : 'Ergebnisse kommen ausschließlich vom Sol-Core-Server. Nur Devnet-Test-SOL.'}
          </p>
        </div>
      )}
    </main>
  );
}
