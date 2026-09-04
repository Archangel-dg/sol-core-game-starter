'use client';

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

/** useLayoutEffect misst VOR dem Zeichnen — nur so gibt es kein Zucken. Auf
 *  dem Server gibt es kein Layout; dort ist useEffect die stille Variante
 *  (sonst warnt React bei jedem Prerender). */
const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/**
 * Aufklapp-Baustein für die Kopfleiste (Design-Zone). Ein Auslöser, darunter
 * ein Feld. Schließt bei Klick außerhalb und bei Escape; trägt die
 * ARIA-Attribute, damit Screenreader den Zustand kennen.
 *
 * Balance-Feld und Spielmenü teilen sich diesen Baustein, damit sich beide
 * gleich anfühlen — zwei getrennt gebaute Menüs driften im Verhalten
 * garantiert auseinander (das eine schließt bei Escape, das andere nicht).
 *
 * Das Feld hält sich selbst im Bild (seit 04.09.2026): Nach dem Öffnen wird
 * gemessen und, wenn nötig, waagerecht verschoben. Eine feste Ausrichtung
 * allein reicht nicht — am 04.09.2026 lief das Saldo-Feld mittig ausgerichtet
 * rechts aus dem Bild, und rechtsbündig ragte das Demo-Feld links hinaus, weil
 * sein Auslöser nicht das äußerste Element der Gruppe ist. Wo ein Auslöser
 * sitzt, entscheidet der Creator — also muss der Baustein es können.
 */
export function Popover({
  trigger,
  children,
  align = 'end',
  panelClassName = '',
  className = '',
}: {
  /** Der Auslöser — bekommt den Offen-Zustand, damit er ihn anzeigen kann. */
  trigger: (open: boolean) => ReactNode;
  /** Inhalt; als Funktion, wenn er sich selbst schließen können soll. */
  children: ReactNode | ((close: () => void) => ReactNode);
  /** Ausrichtung des Feldes zum Auslöser. */
  align?: 'start' | 'center' | 'end';
  panelClassName?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const id = useId();
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const panel = useRef<HTMLDivElement>(null);
  /** Waagerechte Korrektur in px, damit das Feld im Bild bleibt. */
  const [shift, setShift] = useState(0);

  useIsoLayoutEffect(() => {
    if (!open) {
      setShift(0);
      return;
    }
    const measure = () => {
      const el = panel.current;
      if (!el) return;
      // Ungeschoben messen, sonst summiert sich die Korrektur bei jedem Lauf.
      el.style.transform = align === 'center' ? 'translateX(-50%)' : '';
      const r = el.getBoundingClientRect();
      const rand = 12;
      const breite = document.documentElement.clientWidth;
      let dx = 0;
      if (r.left < rand) dx = rand - r.left;
      else if (r.right > breite - rand) dx = breite - rand - r.right;
      // Nie so weit schieben, dass die andere Seite hinausragt: Bei einem Feld,
      // das breiter als der Bildschirm ist, gewinnt der linke Rand.
      if (r.width > breite - 2 * rand) dx = rand - r.left;
      setShift(dx);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [open, align]);

  const side = align === 'start' ? 'left-0' : align === 'center' ? 'left-1/2' : 'right-0';
  const transform =
    align === 'center' ? `translateX(calc(-50% + ${shift}px))` : `translateX(${shift}px)`;

  return (
    <div ref={root} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-controls={id}
        className="inline-flex items-center"
      >
        {trigger(open)}
      </button>
      {open && (
        <div
          id={id}
          ref={panel}
          role="dialog"
          style={{ transform }}
          // max-w klemmt JEDES Feld an den Bildschirm: Die Kopfleiste sitzt am
          // Rand, und ein Feld mit fester Breite lief dort rechts aus dem Bild
          // (am 04.09.2026 am Saldo-Feld auf dem Telefon gemessen). Steht hier
          // im Baustein, damit es für jedes Aufklappfeld gilt — auch für die,
          // die ein Creator später hinzufügt. panelClassName kann es überschreiben.
          className={`absolute top-full z-30 mt-2 max-w-[calc(100vw-1.5rem)] ${side} rounded-xl border border-white/10 bg-[#111118] p-3 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.8)] ${panelClassName}`}
        >
          {typeof children === 'function' ? children(close) : children}
        </div>
      )}
    </div>
  );
}
