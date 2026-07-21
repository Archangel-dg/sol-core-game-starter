'use client';

import { useEffect, useState } from 'react';
import { toSol } from '@/lib/lamports';
import { symbolArt } from '@/lib/symbolArt';
import type { EngineConfig } from '@/lib/engines';

/**
 * slots-modular-Renderer (Design-Zone). Rendert AUSSCHLIESSLICH das
 * serverseitige Ergebnis (result.details.grid) — niemals clientseitig
 * Symbole ziehen (RULES.md #2; keine Near-Miss-Effekte). Die kurze
 * Spalten-Stagger-Animation blendet nur zum Server-Grid ÜBER.
 */
interface RenderSymbol { id: string; wild?: number; scatter?: number; paysBps?: number[] }
interface FreeSpinsSpec { triggerScatterCount: number; maxTotalSpins: number; multiplierBps: number }

function specFrom(cfg: EngineConfig | null): {
  symbols: RenderSymbol[]; paylines: number[][]; freeSpins: FreeSpinsSpec | null;
} {
  const raw = cfg as unknown as { symbols?: unknown; paylines?: unknown; freeSpins?: unknown } | null;
  const symbols = Array.isArray(raw?.symbols)
    ? (raw!.symbols as RenderSymbol[]).filter((s) => typeof s?.id === 'string')
    : [];
  const paylines = Array.isArray(raw?.paylines)
    ? (raw!.paylines as number[][]).filter((l) => Array.isArray(l) && l.length === 5)
    : [];
  const fsRaw = raw?.freeSpins as Record<string, unknown> | undefined;
  const freeSpins =
    fsRaw && typeof fsRaw === 'object' &&
    typeof fsRaw.triggerScatterCount === 'number' &&
    typeof fsRaw.maxTotalSpins === 'number' &&
    typeof fsRaw.multiplierBps === 'number'
      ? {
          triggerScatterCount: fsRaw.triggerScatterCount,
          maxTotalSpins: fsRaw.maxTotalSpins,
          multiplierBps: fsRaw.multiplierBps,
        }
      : null;
  return { symbols, paylines, freeSpins };
}

export function SlotGrid({
  engineConfig,
  details,
  win,
  multiplierBps,
  payoutLamports,
}: {
  engineConfig: EngineConfig | null;
  details: Record<string, unknown> | null; // null = Idle (noch kein Spin)
  win?: boolean;
  multiplierBps?: number;
  payoutLamports?: string;
}) {
  const { symbols, paylines, freeSpins } = specFrom(engineConfig);

  // Mount-Transition fürs Spalten-Stagger-Reveal: blendet NUR die Optik ein
  // (opacity/scale) — das Server-Grid selbst ändert sich dadurch nie.
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    setRevealed(false);
    const t = requestAnimationFrame(() => setRevealed(true));
    return () => cancelAnimationFrame(t);
  }, [details]);

  // Idle: Paytable-Vorschau aus dem renderSpec (degradiert leer, wenn absent).
  if (!details) {
    return (
      <div className="rounded-xl bg-night p-4">
        <p className="mb-2 text-center text-sm text-white/50">5×3 · Linien · Wild · Scatter</p>
        {symbols.length > 0 && (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {symbols.map((s) => {
              const art = symbolArt(s.id);
              return (
                <div key={s.id} className="rounded-lg bg-white/[0.04] p-2 text-center">
                  <div className="text-2xl" style={{ color: art.tint }}>{art.glyph}</div>
                  <div className="mt-1 text-[10px] text-white/40">
                    {s.wild ? 'WILD' : s.scatter ? 'SCATTER' : (s.paysBps ?? []).map((p) => `${p / 10000}×`).join(' / ')}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {freeSpins && (
          <p className="mt-2 text-center text-[11px] text-white/40">
            Free Spins: {freeSpins.triggerScatterCount}+ Scatter → bis zu {freeSpins.maxTotalSpins} Spins ×
            {freeSpins.multiplierBps / 10000}
          </p>
        )}
      </div>
    );
  }

  const grid = Array.isArray(details.grid) ? (details.grid as string[][]) : null;
  const lineWins = Array.isArray(details.lineWins)
    ? (details.lineWins as { line: number; symbol: string; count: number; payBps: number }[])
    : [];
  const scatterCount = typeof details.scatterCount === 'number' ? details.scatterCount : 0;
  const scatterPayBps = typeof details.scatterPayBps === 'number' ? details.scatterPayBps : 0;

  if (!grid) return null; // alte API ohne details → Aufrufer zeigt ResultView

  // Zellen, die auf einer Gewinnlinie liegen (für Highlight):
  const hot = new Set<string>();
  for (const w of lineWins) {
    const geo = paylines[w.line];
    if (!geo) continue;
    for (let reel = 0; reel < Math.min(w.count, 5); reel++) hot.add(`${reel}:${geo[reel]}`);
  }

  const scatterIds = new Set(symbols.filter((s) => s.scatter).map((s) => s.id));

  return (
    <div className="rounded-xl bg-night p-4">
      <div className="mx-auto grid max-w-sm grid-cols-5 gap-1.5">
        {[0, 1, 2].map((row) =>
          [0, 1, 2, 3, 4].map((reel) => {
            const id = grid[reel]?.[row] ?? '?';
            const art = symbolArt(id);
            const isHot = hot.has(`${reel}:${row}`);
            const isScatter = scatterIds.has(id) && scatterCount >= 3;
            return (
              <div
                key={`${reel}:${row}`}
                className={`grid aspect-square place-items-center rounded-lg text-2xl transition-all duration-300 ${
                  revealed ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
                } ${
                  isHot ? 'bg-accent/20 ring-2 ring-accent' : isScatter ? 'bg-white/10 ring-2 ring-purple-400' : 'bg-white/[0.05]'
                }`}
                style={{ color: art.tint, transitionDelay: `${reel * 80}ms` }}
              >
                {art.glyph}
              </div>
            );
          }),
        )}
      </div>
      <div className="mt-3 text-center">
        <div className={`text-2xl font-bold tabular-nums ${win ? 'text-accent' : 'text-red-400'}`}>
          {((multiplierBps ?? 0) / 10000).toFixed(2)}×
        </div>
        <div className="mt-0.5 text-sm text-white/70">
          {win ? `Gewonnen! Auszahlung ${toSol(payoutLamports ?? '0')} ◎` : 'Verloren'}
        </div>
        {(lineWins.length > 0 || scatterPayBps > 0) && (
          <div className="mt-1 text-xs text-white/40">
            {lineWins.map((w) => `Linie ${w.line + 1}: ${w.count}× ${w.symbol} (${(w.payBps / 10000).toFixed(2)}×)`).join(' · ')}
            {scatterPayBps > 0 ? `${lineWins.length ? ' · ' : ''}${scatterCount} Scatter (${(scatterPayBps / 10000).toFixed(2)}×)` : ''}
          </div>
        )}
        {(() => {
          const fs = details.freeSpins as { totalSpins?: number; totalWinBps?: number } | undefined;
          if (!fs) return null;
          const totalSpins = typeof fs.totalSpins === 'number' ? fs.totalSpins : 0;
          const totalWinBps = typeof fs.totalWinBps === 'number' ? fs.totalWinBps : 0;
          return (
            <div className="mt-1 text-xs text-purple-300">
              🎁 {totalSpins} Free Spins · +{(totalWinBps / 10000).toFixed(2)}×
            </div>
          );
        })()}
      </div>
    </div>
  );
}
