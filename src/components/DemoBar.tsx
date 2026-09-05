'use client';
import { useT } from '@/lib/i18n';

import { useDemo } from './DemoProvider';
import { Popover } from './Popover';
import { toSol } from '@/lib/lamports';
import { useFiat } from '@/lib/fiat';
import { FiatSwitch } from './FiatSwitch';

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
  const { format } = useFiat();
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
        {/* Am Telefon nur das Wort: „Demo spielen (3 ◎)" nahm bei 393px der
            Kopfleiste so viel, dass vom Spielnamen „Min…" blieb; selbst
            „Demo (3 ◎)" ließ bei 375px 23px zu wenig. Den Betrag nennt das
            Feld nach dem Start — hier zählt, dass die Tür sichtbar bleibt. */}
        {starting ? '…' : (
          <>
            <span className="sm:hidden">{t('demo.badge')}</span>
            <span className="hidden sm:inline">{t('demo.play')}</span>
          </>
        )}
      </button>
    );
  }

  return (
    <Popover
      // Rechtsbündig wie das Saldo-Feld — beide sitzen am rechten Rand.
      align="end"
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
          {/* Der Saldo noch einmal im Feld, weil das Abzeichen selbst für die
              Näherung zu schmal ist — auf einem 360-px-Gerät steht daneben
              schon der Spielname und das Menü. */}
          {demoBalance !== null && format(demoBalance) && (
            <p className="font-bold tabular-nums text-accent">
              {toSol(demoBalance)} ◎
              <span className="ml-1.5 text-[11px] font-normal text-white/40">{format(demoBalance)}</span>
            </p>
          )}
          <p>{t('demo.autoNote')}</p>
          <p className="text-[11px] text-white/40">{t('demo.note')}</p>
          {/* Auch hier, nicht nur hinter der Wallet: Der Demo-Modus startet von
              selbst, also ist DAS für die meisten Besucher die Saldo-Anzeige. */}
          <FiatSwitch />
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
