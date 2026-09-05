'use client';
import { useT } from '@/lib/i18n';

import { useEffect, useState } from 'react';
import { toSol } from '@/lib/lamports';
import { SymbolIcon } from './SymbolIcon';
import type { EngineConfig } from '@/lib/engines';

/**
 * slots-modular-Renderer (Design-Zone). Rendert AUSSCHLIESSLICH das
 * serverseitige Ergebnis (result.details.grid) — niemals clientseitig
 * Symbole ziehen (RULES.md #2; keine Near-Miss-Effekte). Die kurze
 * Spalten-Stagger-Animation blendet nur zum Server-Grid ÜBER.
 */
interface RenderSymbol { id: string; wild?: number; scatter?: number; paysBps?: number[] }
interface FreeSpinsSpec { triggerScatterCount: number; maxTotalSpins: number; multiplierBps: number }

/** Rastergröße aus der Engine-Config (1–6); fehlt sie, gilt der Klassiker 5×3. */
function dim(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 6 ? v : fallback;
}

function specFrom(cfg: EngineConfig | null): {
  reels: number; rows: number; symbols: RenderSymbol[]; paylines: number[][]; freeSpins: FreeSpinsSpec | null;
  /** Wild-Multiplikator (Echo `wildMultFactor`/`wildMultStack`), sonst null. */
  wildMult: { factor: number; stack: boolean } | null;
} {
  const raw = cfg as unknown as { reels?: unknown; rows?: unknown; symbols?: unknown; paylines?: unknown; freeSpins?: unknown; wildMultFactor?: unknown; wildMultStack?: unknown } | null;
  const reels = dim(raw?.reels, 5);
  const rows = dim(raw?.rows, 3);
  const symbols = Array.isArray(raw?.symbols)
    ? (raw!.symbols as RenderSymbol[]).filter((s) => typeof s?.id === 'string')
    : [];
  const paylines = Array.isArray(raw?.paylines)
    ? (raw!.paylines as number[][]).filter((l) => Array.isArray(l) && l.length === reels)
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
  const wildMult =
    typeof raw?.wildMultFactor === 'number' && raw.wildMultFactor > 1
      ? { factor: raw.wildMultFactor, stack: raw.wildMultStack === 1 }
      : null;
  return { reels, rows, symbols, paylines, freeSpins, wildMult };
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
  const { reels, rows, symbols, paylines, freeSpins, wildMult } = specFrom(engineConfig);

  // Mount-Transition fürs Spalten-Stagger-Reveal: blendet NUR die Optik ein
  // (opacity/scale) — das Server-Grid selbst ändert sich dadurch nie.
  const t = useT();
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    setRevealed(false);
    const raf = requestAnimationFrame(() => setRevealed(true));
    return () => cancelAnimationFrame(raf);
  }, [details]);

  // Idle: Paytable-Vorschau aus dem renderSpec (degradiert leer, wenn absent).
  if (!details) {
    return (
      <div className="h-full overflow-auto rounded-xl bg-night p-4">
        <p className="mb-2 text-center text-sm text-white/50">{t('slot.paylines')}</p>
        {symbols.length > 0 && (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {symbols.map((s) => {
              return (
                <div key={s.id} className="rounded-lg bg-white/[0.04] p-2 text-center">
                  <SymbolIcon id={s.id} className="mx-auto h-8 w-8" />
                  <div className="mt-1 text-[10px] text-white/40">
                    {s.wild
                      ? wildMult
                        ? t(wildMult.stack ? 'slot.wildMultStack' : 'slot.wildMult', { m: wildMult.factor })
                        : t('slot.wild')
                      : s.scatter
                        ? t('slot.scatter')
                        : (s.paysBps ?? []).map((p) => `${p / 10000}×`).join(' / ')}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {freeSpins && (
          <p className="mt-2 text-center text-[11px] text-white/40">
            {t('slot.freeSpinsInfo', {
              n: freeSpins.triggerScatterCount,
              max: freeSpins.maxTotalSpins,
              mult: freeSpins.multiplierBps / 10000,
            })}
          </p>
        )}
      </div>
    );
  }

  const grid = Array.isArray(details.grid) ? (details.grid as string[][]) : null;
  const lineWins = Array.isArray(details.lineWins)
    ? (details.lineWins as { line: number; symbol: string; count: number; payBps: number; direction?: 'rtl'; wildMult?: number }[])
    : [];
  // Gewinnarten (04.09.2026): All Ways / Summe liefern eigene Treffer-Listen.
  const wayWins = Array.isArray(details.wayWins)
    ? (details.wayWins as { symbol: string; count: number; ways: number; payBps: number; wildOnly?: 1; wildBoost?: 1 }[])
    : [];
  const sumWins = Array.isArray(details.sumWins)
    ? (details.sumWins as { symbol: string; count: number; payBps: number }[])
    : [];
  const scatterCount = typeof details.scatterCount === 'number' ? details.scatterCount : 0;
  const scatterPayBps = typeof details.scatterPayBps === 'number' ? details.scatterPayBps : 0;

  if (!grid) return null; // alte API ohne details → Aufrufer zeigt ResultView

  // Treffer-Zellen (für Highlight) — rein aus den Server-Treffern: Linien über
  // die Muster (beide Richtungen), All Ways über die gezählten Walzen (Symbol
  // oder Wild; reine Wild-Wege nur die Wilds), Summe über jede Zelle des Symbols.
  const wildId = symbols.find((s) => s.wild)?.id ?? '';
  const hot = new Set<string>();
  for (const w of lineWins) {
    const geo = paylines[w.line];
    if (!geo) continue;
    const n = Math.min(w.count, reels);
    for (let k = 0; k < n; k++) {
      const reel = w.direction === 'rtl' ? reels - 1 - k : k;
      hot.add(`${reel}:${geo[reel]}`);
    }
  }
  for (const w of wayWins) {
    for (let reel = 0; reel < Math.min(w.count, reels); reel++) {
      (grid[reel] ?? []).forEach((id, row) => {
        if (w.wildOnly ? id === wildId : id === w.symbol || id === wildId) hot.add(`${reel}:${row}`);
      });
    }
  }
  for (const w of sumWins) {
    grid.forEach((col, reel) => col.forEach((id, row) => {
      if (id === w.symbol) hot.add(`${reel}:${row}`);
    }));
  }

  const scatterIds = new Set(symbols.filter((s) => s.scatter).map((s) => s.id));

  return (
    <div className="h-full overflow-auto rounded-xl bg-night p-4">
      <div className="mx-auto grid max-w-sm gap-1.5" style={{ gridTemplateColumns: `repeat(${reels}, minmax(0, 1fr))` }}>
        {Array.from({ length: rows }, (_, row) =>
          Array.from({ length: reels }, (_, reel) => {
            const id = grid[reel]?.[row] ?? '?';
            const isHot = hot.has(`${reel}:${row}`);
            const isScatter = scatterIds.has(id) && scatterCount >= 3;
            return (
              <div
                key={`${reel}:${row}`}
                className={`grid aspect-square place-items-center rounded-lg transition-all duration-300 ${
                  revealed ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
                } ${
                  isHot ? 'bg-accent/20 ring-2 ring-accent' : isScatter ? 'bg-white/10 ring-2 ring-purple-400' : 'bg-white/[0.05]'
                }`}
                style={{ transitionDelay: `${reel * 80}ms` }}
              >
                <SymbolIcon id={id} className="h-3/4 w-3/4" />
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
          {win ? t('result.won', { amount: toSol(payoutLamports ?? '0') }) : t('result.lost')}
        </div>
        {(lineWins.length > 0 || wayWins.length > 0 || sumWins.length > 0 || scatterPayBps > 0) && (
          <div className="mt-1 text-xs text-white/40">
            {[
              ...lineWins.map((w) => t(w.direction === 'rtl' ? 'slot.lineWinRtl' : 'slot.lineWin', { line: w.line + 1, count: w.count, symbol: w.symbol, pay: (w.payBps / 10000).toFixed(2) }) + (w.wildMult ? ` ${t('slot.wildMultHit', { m: w.wildMult })}` : '')),
              ...wayWins.map((w) => t('slot.wayWin', { count: w.count, symbol: w.symbol, ways: w.ways, pay: (w.payBps / 10000).toFixed(2) })),
              ...sumWins.map((w) => t('slot.sumWin', { count: w.count, symbol: w.symbol, pay: (w.payBps / 10000).toFixed(2) })),
              ...(scatterPayBps > 0 ? [t('slot.scatterWin', { count: scatterCount, pay: (scatterPayBps / 10000).toFixed(2) })] : []),
            ].join(' · ')}
          </div>
        )}
        {(() => {
          const fs = details.freeSpins as { totalSpins?: number; totalWinBps?: number } | undefined;
          if (!fs) return null;
          const totalSpins = typeof fs.totalSpins === 'number' ? fs.totalSpins : 0;
          const totalWinBps = typeof fs.totalWinBps === 'number' ? fs.totalWinBps : 0;
          return (
            <div className="mt-1 text-xs text-purple-300">
              {t('slot.freeSpinsResult', { spins: totalSpins, win: (totalWinBps / 10000).toFixed(2) })}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
