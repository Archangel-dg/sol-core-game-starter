'use client';

/**
 * ██ GESTALTUNGSZONE ██ — Würfelwurf-Reveal für die PvP-Würfelspiele
 * (Dice Duel, Dice Pro, ihre Demo-Zwillinge).
 *
 * Die PvP-Boards sind interaktiv und zeichnen ihren Zustand aus der Match-Sicht
 * des Servers. Kommt ein neuer Wurf an (die Tischwürfel ändern sich), zeigt
 * dieser Hook für einen Moment TAUMELNDE Würfel statt der echten Augen und
 * hält alles andere (Zugpunkte, Stände, letztes Ereignis) auf dem Stand DAVOR.
 * Erst wenn der Wurf steht, wird die neue Sicht durchgereicht — Punkte, Farkle
 * und Bank stehen also nie vor den Würfeln (docs/RULES.md, Regel 16.4).
 *
 * Fairness: Die Zwischen-Gesichter sind eine Hash-Folge aus dem Wurf selbst
 * (kein Math.random), und was am Ende liegt, ist exakt die Server-Sicht.
 * Kein Abbremsen, kein „fast": nach `ROLL_MS` stehen die echten Augen.
 *
 * Reduzierte Bewegung (Systemeinstellung oder Menü-Schalter): der Wurf steht
 * sofort — dann ist der Hook ein Durchreicher.
 */

import { useEffect, useRef, useState } from 'react';
import { isReducedMotion, useMotion } from '@/lib/motion';

/** Dauer des Taumelns, bis die echten Augen liegen. */
export const ROLL_MS = 900;
/** Abstand zweier Zwischen-Gesichter. */
const TICK_MS = 85;

/** Deterministische Streuung — Nachkommateil eines Sinus, kein Zufall. */
function hash(i: number, seed: number): number {
  const x = Math.sin(i * 12.9898 + seed * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/** Zwischen-Gesichter zum Tick `tick` — eine reine Funktion von (Wurf, Tick). */
export function tumbleFaces(dice: number[], tick: number, faces = 6): number[] {
  const seed = dice.reduce((s, d, i) => s + d * (i + 3), 7);
  return dice.map((_, d) => 1 + Math.floor(hash(tick * 7 + d * 3 + 1, seed) * faces));
}

/**
 * Reicht `latest` durch — verzögert um einen Wurf, wenn sich die Tischwürfel
 * geändert haben. `diceOf` liest die Tischwürfel aus der Sicht, `withDice`
 * baut eine Kopie der GEZEIGTEN Sicht mit anderen Augen (für das Taumeln).
 */
export function useDiceRollReveal<V>(
  latest: V | null,
  diceOf: (v: V) => number[],
  withDice: (v: V, dice: number[]) => V,
  faces = 6,
): { shown: V | null; rolling: boolean } {
  const [shown, setShown] = useState<V | null>(latest);
  const [rolling, setRolling] = useState(false);
  const shownRef = useRef<V | null>(latest);
  const { enabled: motionOn } = useMotion();
  void motionOn; // Abonnement: ein Umschalten soll den nächsten Wurf kennen.

  useEffect(() => {
    const prev = shownRef.current;
    const commit = (v: V | null) => {
      shownRef.current = v;
      setShown(v);
      setRolling(false);
    };
    if (!latest || !prev) {
      commit(latest);
      return;
    }
    const next = diceOf(latest);
    const before = diceOf(prev);
    const newRoll = next.length > 0 && next.join(',') !== before.join(',');
    if (!newRoll || isReducedMotion()) {
      commit(latest);
      return;
    }
    // Neuer Wurf: die alte Sicht bleibt, nur die Würfel taumeln.
    setRolling(true);
    let tick = 0;
    const base = prev;
    const paint = () => {
      tick += 1;
      const v = withDice(base, tumbleFaces(next, tick, faces));
      shownRef.current = v;
      setShown(v);
    };
    paint();
    const iv = setInterval(paint, TICK_MS);
    const done = setTimeout(() => {
      clearInterval(iv);
      commit(latest);
    }, ROLL_MS);
    return () => {
      clearInterval(iv);
      clearTimeout(done);
    };
    // `diceOf`/`withDice` sind reine Funktionen — nur die Sicht zählt.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latest]);

  return { shown, rolling };
}
