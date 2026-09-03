'use client';

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';

/**
 * Aufklapp-Baustein für die Kopfleiste (Design-Zone). Ein Auslöser, darunter
 * ein Feld. Schließt bei Klick außerhalb und bei Escape; trägt die
 * ARIA-Attribute, damit Screenreader den Zustand kennen.
 *
 * Balance-Feld und Spielmenü teilen sich diesen Baustein, damit sich beide
 * gleich anfühlen — zwei getrennt gebaute Menüs driften im Verhalten
 * garantiert auseinander (das eine schließt bei Escape, das andere nicht).
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

  const side = align === 'start' ? 'left-0' : align === 'center' ? 'left-1/2 -translate-x-1/2' : 'right-0';

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
          role="dialog"
          className={`absolute top-full z-30 mt-2 ${side} rounded-xl border border-white/10 bg-[#111118] p-3 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.8)] ${panelClassName}`}
        >
          {typeof children === 'function' ? children(close) : children}
        </div>
      )}
    </div>
  );
}
