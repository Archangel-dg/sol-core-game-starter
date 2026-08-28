'use client';

import { useState } from 'react';
import { useBetLimits } from '@/lib/bet-limits';

/**
 * „So viel darfst du gerade setzen" — die eine Zahl, die ein Spieler vor dem
 * Tippen braucht.
 *
 * Sie steht bewusst NEBEN dem Guthaben und nicht im Kleingedruckten: Der
 * Höchsteinsatz ist keine Eigenschaft des Spiels, sondern des MOMENTS. Die
 * engste Grenze ist meist die Pool-Größe, und die bewegt sich. Ein Spiel, das
 * 50 SOL als Maximum bewirbt, aber gerade nur 0,04 SOL zulässt, erzeugt sonst
 * genau eine Erfahrung: eine abgelehnte Wette ohne erkennbaren Grund.
 * (Am 28.08.2026 nachgemessen: Spiel- und Level-Grenze je 50 SOL, tatsächlich
 * erlaubt 0,0365 SOL.)
 *
 * ZWEI DARSTELLUNGEN, EINE QUELLE:
 * - `BetLimitHint` — die Zeile im Geld-Balken, mit „warum?"-Aufklappen.
 * - `MaxBetPick`   — die knappe Zahl AM Einsatzfeld (Vorbild OrbitX). Klick
 *                    übernimmt sie ins Feld.
 * Beide hängen am selben Hook; sie können also nicht auseinanderlaufen.
 */

/** Auf 4 Nachkommastellen ABGERUNDET.
 *
 * Aufgerundet läge die Zahl über dem echten Maximum — der Klick auf „Max"
 * führte dann geradewegs in die Ablehnung, die diese Anzeige gerade
 * verhindern soll. */
export function maxBetText(maxSol: number): string {
  return (Math.floor(maxSol * 1e4) / 1e4).toFixed(4);
}

export function BetLimitHint({
  onPick,
  className = '',
}: {
  onPick?: (sol: string) => void;
  className?: string;
}) {
  const { daten, maxSol } = useBetLimits();
  const [offen, setOffen] = useState(false);

  if (!daten || maxSol === null) return null;

  const maxAnzeige = maxBetText(maxSol);
  const gesperrt = !daten.playable || maxSol <= 0;

  return (
    <div className={`text-xs ${className}`}>
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="text-white/50">Max. Einsatz jetzt</span>
        {gesperrt ? (
          <span className="font-semibold text-rose-300">gerade nicht spielbar</span>
        ) : onPick ? (
          <button
            type="button"
            onClick={() => onPick(maxAnzeige)}
            title="Höchsteinsatz übernehmen"
            className="rounded border border-accent/40 bg-accent/10 px-1.5 py-0.5 font-semibold tabular-nums text-accent transition-colors hover:border-accent/70"
          >
            ◎ {maxAnzeige}
          </button>
        ) : (
          <span className="font-semibold tabular-nums text-accent">◎ {maxAnzeige}</span>
        )}
        <button
          type="button"
          onClick={() => setOffen((o) => !o)}
          aria-expanded={offen}
          className="text-white/40 underline decoration-dotted underline-offset-2 hover:text-white/70"
        >
          {offen ? 'weniger' : 'warum?'}
        </button>
      </div>
      {offen && (
        <p className="mt-1 leading-relaxed text-white/50">
          {/* Der Satz kommt fertig vom Server — die Oberfläche übersetzt die
              Grenzen nicht selbst, sonst driften Backend und Anzeige. */}
          {daten.text}
        </p>
      )}
    </div>
  );
}

/**
 * Der Höchsteinsatz AM Einsatzfeld — knapp, ohne eigene Zeile, immer sichtbar.
 *
 * Gehört an das Feld und nicht ins Menü: Es ist die Zahl, die man beim Tippen
 * braucht. Der Titel trägt die Begründung des Servers, damit die Auskunft
 * erreichbar bleibt, ohne Platz zu kosten.
 *
 * Design-Zone: Farben/Abstände dürfen angepasst werden. Was bleiben MUSS: die
 * Zahl ist sichtbar, sie ist abgerundet, und ein Klick setzt sie ins Feld.
 */
export function MaxBetPick({
  onPick,
  className = '',
  label = 'Max',
}: {
  onPick: (sol: string) => void;
  className?: string;
  label?: string;
}) {
  const { daten, maxSol } = useBetLimits();
  if (!daten || maxSol === null) return null;

  if (!daten.playable || maxSol <= 0) {
    return (
      <span className={`shrink-0 text-[11px] font-semibold text-rose-300 ${className}`}>
        gerade nicht spielbar
      </span>
    );
  }

  const maxAnzeige = maxBetText(maxSol);
  return (
    <button
      type="button"
      onClick={() => onPick(maxAnzeige)}
      title={daten.text}
      className={`shrink-0 text-[11px] font-semibold tabular-nums text-accent underline decoration-dotted underline-offset-2 hover:text-accent/80 ${className}`}
    >
      {label} ◎ {maxAnzeige}
    </button>
  );
}
