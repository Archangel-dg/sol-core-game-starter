'use client';
import { useT } from '@/lib/i18n';

import { useFiat, type Fiat } from '@/lib/fiat';

/**
 * Umschalter für die Währungs-Näherung (Design-Zone).
 *
 * Er sitzt im Saldo-Feld — im Demo-Abzeichen genauso wie im Guthaben-Feld der
 * verbundenen Wallet. Beide, weil die Vorauswahl aus der Gerätesprache kommt
 * und deshalb GREIFT, BEVOR jemand eine Wallet verbindet: Steht der Schalter
 * nur hinter der Wallet, sieht ein Besucher im Demo-Modus überall eine
 * Näherung und findet nichts, womit er sie abstellen könnte.
 *
 * Angeboten wird nur, was auch einen Kurs hat. Ein Knopf, auf den man tippt
 * und bei dem nichts passiert, ist schlechter als ein fehlender Knopf — der
 * Spieler hielte die Umrechnung für kaputt statt die eine Währung für
 * vorübergehend unbekannt.
 */
export function FiatSwitch() {
  const { currency, setCurrency, available } = useFiat();
  const t = useT();

  // Ohne jeden Kurs gibt es nichts zu wählen — dann steht hier auch nichts.
  if (!available.usd && !available.eur) return null;

  return (
    <div className="border-t border-white/10 pt-3">
      <div className="mb-1.5 text-[10px] uppercase tracking-wide text-white/40">{t('fiat.show')}</div>
      <div className="grid auto-cols-fr grid-flow-col gap-1.5">
        {(['off', 'usd', 'eur'] as Fiat[])
          .filter((v) => v === 'off' || available[v])
          .map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setCurrency(v)}
              aria-pressed={currency === v}
              className={`rounded-lg border px-2 py-1 text-xs font-semibold ${
                currency === v
                  ? 'border-accent/50 bg-accent/10 text-accent'
                  : 'border-white/15 text-white/60 hover:text-white'
              }`}
            >
              {v === 'off' ? t('fiat.off') : v.toUpperCase()}
            </button>
          ))}
      </div>
      {currency !== 'off' && (
        // Die Einschränkung gehört neben den Schalter, nicht ins
        // Kleingedruckte: Wer die Umrechnung einschaltet, soll im selben
        // Moment lesen, dass sie eine Näherung ist.
        <p className="mt-1.5 text-[11px] leading-relaxed text-white/40">{t('fiat.note')}</p>
      )}
    </div>
  );
}
