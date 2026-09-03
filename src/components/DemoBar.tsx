'use client';
import { useT } from '@/lib/i18n';

import { useDemo } from './DemoProvider';
import { Popover } from './Popover';
import { toSol } from '@/lib/lamports';

/**
 * Demo-Abzeichen in der Kopfleiste (Design-Zone). Zeigt den simulierten Saldo;
 * ein Klick öffnet den Hinweis und den Ausstieg. Ohne aktiven Demo-Modus
 * steht hier der Einstieg („Play demo").
 *
 * Der Demo-Modus startet seit dem 03.09.2026 von selbst, sobald keine Wallet
 * verbunden ist (siehe app/page.tsx), und endet, sobald eine verbindet. Die
 * Demo-Logik (startDemo/exitDemo, /api/demo/*) ist Vertrag — hier ist nur die
 * Darstellung.
 */
export function DemoBar() {
  const { demo, demoBalance, starting, error, startDemo, exitDemo } = useDemo();
  const t = useT();

  if (!demo) {
    // Der Fehler steckt IM Knopf, nicht daneben: Als eigener Text hat er in
    // der Kopfleiste erst den Spielnamen und dann Wallet-Knopf und Menü aus
    // dem Bild gedrängt (bei 360 px gemessen). Ein roter Knopf mit „!" ist
    // sichtbar, bleibt schmal — und ist zugleich der Knopf, der es erneut
    // versucht. Der volle Satz steht im Titel und für Screenreader.
    const fehler = error ? t('demo.startFailed', { error }) : null;
    return (
      <button
        type="button"
        onClick={() => void startDemo()}
        disabled={starting}
        title={fehler ?? undefined}
        aria-label={fehler ?? undefined}
        className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold disabled:opacity-40 ${
          fehler
            ? 'border-red-400/50 bg-red-400/10 text-red-300'
            : 'border-accent/40 bg-accent/10 text-accent'
        }`}
      >
        {fehler && <span aria-hidden>!</span>}
        {starting ? '…' : t('demo.play')}
      </button>
    );
  }

  return (
    <Popover
      align="center"
      panelClassName="w-64"
      trigger={() => (
        <span
          title={t('demo.open')}
          className="inline-flex items-center gap-1 rounded-full border border-accent/40 bg-accent/10 px-2 py-1.5 text-xs font-bold tabular-nums text-accent sm:gap-1.5 sm:px-3 sm:text-sm"
        >
          <span className="rounded bg-accent/25 px-1 py-0.5 text-[9px] uppercase tracking-wide sm:px-1.5 sm:text-[10px]">
            {t('demo.badge')}
          </span>
          {demoBalance === null ? '—' : `${toSol(demoBalance)} ◎`}
        </span>
      )}
    >
      {(close) => (
        <div className="space-y-3 text-xs text-white/70">
          <p>{t('demo.autoNote')}</p>
          <p className="text-[11px] text-white/40">{t('demo.note')}</p>
          <button
            type="button"
            onClick={() => {
              exitDemo();
              close();
            }}
            className="w-full rounded-full border border-white/15 px-4 py-1.5 text-sm text-white/80 hover:border-white/30"
          >
            {t('demo.exit')}
          </button>
        </div>
      )}
    </Popover>
  );
}
