'use client';

import { useT } from '@/lib/i18n';
import type { HoldemDealerCategory } from '@/lib/solcore';
import { anteRatio, cardRed, cardText, handLabelKey, type AnteRow, type HoldemTable } from '@/lib/holdem-dealer';

/**
 * ██ GESTALTUNGSZONE ██ — Bausteine der Hold'em-Oberfläche (HoldemDealerGame).
 *
 * Zwei Teile, beide reine Anzeige:
 *  - `HoldemAnteTable`: die Ante-Tabelle des Spiels, 1:1 aus dem Engine-Echo
 *    (`anteBps`) — gleich zahlende schwache Hände stehen in einer Zeile
 *    („Straße oder tiefer"). Hervorgehoben ist, was der Aufrufer nennt: in der
 *    Entscheidung die Hand mit dem Flop, nach einem gewonnenen Call die Hand,
 *    nach der das Ante gezahlt hat. Nach dem Aussteigen nichts — die Wertung
 *    des Servers zählt dann Turn und River mit, die der Tisch nicht zeigt.
 *  - `HoldemTableText`: der Tisch als Text — der RÜCKFALL, wenn kein
 *    Reveal-Modul läuft. Er bekommt den Tisch aus `holdemTable` (Hausregel:
 *    nach dem Aussteigen bleiben Turn, River und Dealer leer).
 */

export function HoldemAnteTable({
  rows,
  current,
  final = false,
  rules = false,
}: {
  rows: AnteRow[];
  /** Die Hand, deren Zeile hervorgehoben wird — `null` hebt nichts hervor. */
  current: HoldemDealerCategory | null;
  /** true: die hervorgehobene Zeile hat gezahlt (Gewinnfarbe). */
  final?: boolean;
  /** Die Regeln des Dealers unter der Tabelle (vor dem Austeilen). */
  rules?: boolean;
}) {
  const t = useT();
  return (
    <div className="rounded-lg border border-white/10 bg-night p-2">
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-2">
        <span className="text-[11px] text-white/40">{t('session.hd.paytable')}</span>
        <span className="text-[10px] text-white/30">{t('session.hd.paytableNote')}</span>
      </div>
      {/* Zwei Spalten, spaltenweise gefüllt — wie die Video-Poker-Tabelle, damit
          das Bedienfeld auf einem 344px-Telefon nicht das Brett verdrängt. */}
      <ul className="grid grid-flow-col grid-cols-2 grid-rows-[repeat(3,auto)] gap-x-1.5 gap-y-0.5">
        {rows.map((row) => {
          const on = current !== null && row.hands.includes(current);
          const top = row.hands[0]!;
          const bottom = row.hands[row.hands.length - 1]!;
          const name =
            row.hands.length === 1
              ? t(handLabelKey(top))
              : bottom === 'highCard'
                ? t('session.hd.orLower', { hand: t(handLabelKey(top)) })
                : `${t(handLabelKey(top))} – ${t(handLabelKey(bottom))}`;
          return (
            <li
              key={top}
              aria-current={on ? 'true' : undefined}
              className={`flex min-w-0 items-center justify-between gap-1 rounded px-1 py-0.5 text-[10.5px] leading-tight tabular-nums sm:text-[11px] ${
                on
                  ? final
                    ? 'bg-accent/20 font-semibold text-accent ring-1 ring-accent/60'
                    : 'bg-white/[0.07] text-white ring-1 ring-white/25'
                  : 'text-white/55'
              }`}
            >
              <span className="min-w-0 break-words">{name}</span>
              <span className="shrink-0">{anteRatio(row.bps)}</span>
            </li>
          );
        })}
      </ul>
      {rules && <p className="mt-1.5 text-[10px] leading-snug text-white/35">{t('session.hd.rules')}</p>}
    </div>
  );
}

/** Eine Karte als Text-Chip; `null` = verdeckt bzw. (Turn/River) noch nicht da. */
function Chip({ k }: { k: number | null }) {
  const face = cardText(k);
  return (
    <span
      className={`inline-grid min-w-[2.1rem] place-items-center rounded-md border px-1 py-0.5 text-sm font-bold tabular-nums ${
        face
          ? `border-transparent bg-[#e8e8ee] ${cardRed(k) ? 'text-[#c8283d]' : 'text-night'}`
          : 'border-dashed border-white/20 text-white/25'
      }`}
    >
      {face ?? '·'}
    </span>
  );
}

export function HoldemTableText({ table }: { table: HoldemTable }) {
  const t = useT();
  const row = (label: string, ks: (number | null)[]) => (
    <div className="flex items-center justify-center gap-1.5">
      <span className="w-16 shrink-0 text-right text-[11px] uppercase tracking-wide text-white/40">{label}</span>
      {ks.map((k, i) => (
        <Chip key={i} k={k} />
      ))}
    </div>
  );
  return (
    <div className="space-y-2">
      {row(t('reveal.holdem.dealer'), table.dealer)}
      {row(t('session.hd.board'), [...table.flop, table.turn, table.river])}
      {row(t('reveal.holdem.you'), table.player)}
    </div>
  );
}
