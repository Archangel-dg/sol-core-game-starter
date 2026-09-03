'use client';
import { useT } from '@/lib/i18n';
import { verifyHref } from './VerifyLink';

/**
 * Provably-Fair-Panel: zeigt den Seed-Hash VOR der Runde und den Verify-Link
 * DANACH.
 *
 * Jede Runde verlinkt auf den Sol-Core Verifier (`verifierUrl`/en/verify/…) —
 * die menschenlesbare Seite, die die Runde IM BROWSER des Spielers nachrechnet.
 * Seit dem 03.09.2026 auch Demo-Runden (Entscheidung des Betreibers: EIN Ziel
 * für alles, was mit der Nachprüfung zu tun hat); der Verifier holt sie aus
 * `demo_rounds` über den öffentlichen Demo-Endpunkt nach.
 */
export function FairnessPanel({
  verifierUrl,
  serverSeedHash,
  roundId,
}: {
  verifierUrl: string;
  serverSeedHash: string | null;
  roundId: string | null;
}) {
  const t = useT();
  // Ohne Runde gibt es nichts zu verifizieren — der Link wird unten ohnehin
  // nur mit `roundId` gerendert; der leere String haelt nur den Typ sauber.
  const href = roundId ? verifyHref(verifierUrl, roundId) : '';
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs">
      <div className="mb-1 uppercase tracking-wide text-white/50">{t('verify.title')}</div>
      <div className="break-all text-white/60">
        {t('verify.seedHash')} <span className="text-white/80">{serverSeedHash ?? '—'}</span>
      </div>
      {roundId && (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-block text-accent underline underline-offset-2"
        >
          {t('verify.round')}
        </a>
      )}
    </div>
  );
}
