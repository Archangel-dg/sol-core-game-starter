'use client';

import { useT } from '@/lib/i18n';
import type { VideoPokerCategory } from '@/lib/solcore';
import { cardFace, handLabel, type VideoPokerTableRow } from '@/lib/video-poker';

/**
 * ██ GESTALTUNGSZONE ██ — Bausteine der Video-Poker-Oberfläche (SessionGame).
 *
 * Zwei Teile, beide reine Anzeige:
 *  - `VideoPokerPaytable`: die Auszahltabelle des Spiels, 1:1 aus dem
 *    Engine-Echo (`paytableBps`) — hervorgehoben ist die Hand, die gerade
 *    liegt (ausgeteiltes Blatt, nach dem Ziehen die Endhand). Welche Hand das
 *    ist, sagt der Server (`progress.handCategory`); hier wird nichts gewertet.
 *  - `VideoPokerHoldCards`: das Blatt als eigene Knöpfe — der RÜCKFALL, wenn
 *    kein Reveal-Modul mit Halte-Kanal (`setHolds`) läuft. Ein Tipp hält oder
 *    löst eine Karte; was abgeschickt wird, ist genau diese Auswahl.
 */

/** 1000000 bps → „100×", 15000 → „1.5×". */
export function payX(bps: number): string {
  const x = bps / 10000;
  return `${Number.isInteger(x) ? x : x.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')}×`;
}

export function VideoPokerPaytable({
  table,
  minPairRank,
  current,
  final = false,
}: {
  table: VideoPokerTableRow[];
  minPairRank: number;
  /** Die Hand, die gerade liegt — `null`/`'none'` hebt nichts hervor. */
  current: VideoPokerCategory | null;
  /** true nach dem Ziehen: dann ist die hervorgehobene Zeile die Auszahlung. */
  final?: boolean;
}) {
  const t = useT();
  return (
    <div className="rounded-lg border border-white/10 bg-night p-2">
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-2">
        <span className="text-[11px] text-white/40">{t('session.vp.paytable')}</span>
        <span className="text-[10px] text-white/30">{t('session.vp.paytableNote')}</span>
      </div>
      {/* Zwei Spalten, spaltenweise gefüllt: links die starken Hände, rechts der
          Rest — so passt die ganze Tabelle auch auf ein 344px-Telefon, ohne
          das Bedienfeld so hoch zu machen, dass es das Brett verdeckt. Lange
          Namen („Quinte flush royale") brechen um statt abgeschnitten zu
          werden: eine Tabelle mit „Buben oder bes…" sagt nicht, was zahlt. */}
      <ul className="grid grid-flow-col grid-cols-2 grid-rows-[repeat(5,auto)] gap-x-1.5 gap-y-0.5">
        {table.map((row) => {
          const on = current === row.hand;
          const name = handLabel(row.hand, minPairRank);
          return (
            <li
              key={row.hand}
              aria-current={on ? 'true' : undefined}
              className={`flex min-w-0 items-center justify-between gap-1 rounded px-1 py-0.5 text-[10.5px] leading-tight tabular-nums sm:text-[11px] ${
                on
                  ? final
                    ? 'bg-accent/20 font-semibold text-accent ring-1 ring-accent/60'
                    : 'bg-white/[0.07] text-white ring-1 ring-white/25'
                  : 'text-white/55'
              }`}
            >
              <span className="min-w-0 break-words">{t(name.key, name.vars)}</span>
              <span className="shrink-0">{payX(row.bps)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function VideoPokerHoldCards({
  cards,
  held,
  enabled,
  onToggle,
}: {
  cards: readonly number[];
  held: readonly number[];
  enabled: boolean;
  onToggle: (index: number) => void;
}) {
  const t = useT();
  return (
    <div className="grid grid-cols-5 gap-1.5">
      {cards.map((k, i) => {
        const face = cardFace(k);
        const isHeld = held.includes(i);
        return (
          <button
            key={i}
            type="button"
            disabled={!enabled}
            aria-pressed={isHeld}
            aria-label={t('session.vp.cardLabel', { n: i + 1, card: face ? `${face.rank}${face.suit}` : '?' })}
            onClick={() => onToggle(i)}
            className="flex min-h-[4.5rem] flex-col items-stretch gap-1 rounded-lg disabled:opacity-60"
          >
            <span
              className={`grid flex-1 place-items-center rounded-md border-2 bg-[#e8e8ee] py-1 font-bold leading-none transition-transform ${
                face?.red ? 'text-[#c8283d]' : 'text-night'
              } ${isHeld ? '-translate-y-0.5 border-accent' : 'border-transparent'}`}
            >
              <span className="text-base">{face?.rank ?? '?'}</span>
              <span className="text-lg">{face?.suit ?? ''}</span>
            </span>
            <span
              className={`rounded px-0.5 py-0.5 text-center text-[9px] font-extrabold leading-none tracking-tight ${
                isHeld ? 'bg-accent text-night' : 'text-transparent'
              }`}
            >
              {/* Platz bleibt reserviert, damit das Blatt beim Halten nicht springt. */}
              {isHeld ? t('session.vp.held') : '·'}
            </span>
          </button>
        );
      })}
    </div>
  );
}
