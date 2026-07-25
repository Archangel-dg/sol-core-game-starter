'use client';

// ⚠ Nicht ändern — Systemvertrag.
// Balance-Freeze für Live-Reveals: Der Server schreibt Gewinne im Moment des
// Draws gut (Korrektheit/Abhebbarkeit), die Skins spielen danach ihre
// Reveal-Animation. OHNE Freeze könnte der unabhängige Balance-Poll mitten
// in der Animation den neuen Kontostand zeigen — und damit das Ergebnis vor
// der Ziellinie verraten. Der Freeze ist REINE Anzeige-Logik: er hält den
// letzten Wert fest und ignoriert Poll-Ergebnisse, bis released wird.

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

interface BalanceFreezeApi {
  /** true, solange die Anzeige eingefroren ist. */
  frozen: boolean;
  /** Einfrieren bis ts (ms-Epoch) — Sicherheitsnetz, falls release() nie kommt. */
  freezeUntil: (ts: number) => void;
  /** Anzeige wieder freigeben (Reveal beendet) — Aufrufer refetcht danach. */
  release: () => void;
}

const Ctx = createContext<BalanceFreezeApi>({
  frozen: false,
  freezeUntil: () => {},
  release: () => {},
});

export function BalanceFreezeProvider({ children }: { children: React.ReactNode }) {
  const [frozen, setFrozen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const release = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setFrozen(false);
  }, []);

  const freezeUntil = useCallback((ts: number) => {
    setFrozen(true);
    if (timer.current) clearTimeout(timer.current);
    // Backstop: +5 s Puffer nach dem geplanten Reveal-Ende, dann automatisch
    // freigeben — ein hängender Client friert die Balance nie dauerhaft ein.
    const ms = Math.max(0, ts - Date.now()) + 5_000;
    timer.current = setTimeout(() => {
      timer.current = null;
      setFrozen(false);
    }, ms);
  }, []);

  const api = useMemo(() => ({ frozen, freezeUntil, release }), [frozen, freezeUntil, release]);
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useBalanceFreeze(): BalanceFreezeApi {
  return useContext(Ctx);
}
