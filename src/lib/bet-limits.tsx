'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { BetLimitsView } from './solcore';

/**
 * Die aktuellen Einsatz-Grenzen des Spiels, regelmäßig aufgefrischt.
 *
 * WARUM ÜBERHAUPT POLLEN: Die engste Grenze ist meist die Solvenz — sie hängt
 * an der Pool-Größe und ändert sich, während gespielt wird. Eine einmal beim
 * Laden geholte Zahl wäre nach ein paar Minuten falsch, und zwar in die
 * gefährliche Richtung: Der Spieler tippt einen Einsatz, der eben noch ging.
 *
 * 20 s ist der Kompromiss: schnell genug, dass die Zahl stimmt, langsam genug
 * für das Rate-Limit der Route (60/min je IP) — auch wenn jemand mehrere
 * Fenster offen hat. `refresh()` gibt es zusätzlich für den Moment nach einer
 * eigenen Wette, wo sich die Lage sofort ändert.
 */
const INTERVALL_MS = 20_000;

export interface BetLimits {
  daten: BetLimitsView | null;
  /** Höchsteinsatz in SOL als Zahl — bequem für Vergleiche in der UI. */
  maxSol: number | null;
  minSol: number | null;
  refresh: () => void;
}

export function useBetLimits(): BetLimits {
  const [daten, setDaten] = useState<BetLimitsView | null>(null);
  const alive = useRef(true);

  const refresh = useCallback(async () => {
    try {
      const r = (await fetch('/api/limits').then((x) => x.json())) as BetLimitsView & {
        error?: unknown;
      };
      if (!alive.current || r.error || typeof r.maxBetLamports !== 'string') return;
      setDaten(r);
    } catch {
      /* nächster Durchlauf versucht es erneut — eine alte Zahl ist besser als keine */
    }
  }, []);

  useEffect(() => {
    alive.current = true;
    void refresh();
    const id = setInterval(() => void refresh(), INTERVALL_MS);
    return () => {
      alive.current = false;
      clearInterval(id);
    };
  }, [refresh]);

  return {
    daten,
    maxSol: daten ? Number(daten.maxBetLamports) / 1e9 : null,
    minSol: daten ? Number(daten.minBetLamports) / 1e9 : null,
    refresh: () => void refresh(),
  };
}
