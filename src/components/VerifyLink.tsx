'use client';
import { useT } from '@/lib/i18n';

/**
 * Der Verify-Link — EINE Stelle für alle Mechaniken.
 *
 * WOHIN ER ZEIGT: `<verifierUrl>/verify/<id>` — der Sol-Core Verifizierer.
 * Der rechnet die Runde IM BROWSER des Spielers nach: Seed-Commitment prüfen,
 * Wurf aus HMAC ableiten, Ergebnis vergleichen. Kein Server-Urteil wird
 * geglaubt, auch keines von Sol-Core.
 *
 * WOHIN ER NICHT ZEIGT — und warum das der Grund für diese Datei ist:
 * Beim Nachmessen der neun gelisteten Spiele am 28.08.2026 verlinkte KEINES
 * auf den Verifizierer. Sieben zeigten auf `api.sol-core.com/api/game/verify/…`
 * (rohes JSON), zwei auf ihre eigene Proxy-Route. Ein Spieler, der „verify"
 * klickt, bekam damit eine Wand aus geschweiften Klammern statt eines
 * Beweises — technisch dieselben Daten, praktisch keine Nachprüfbarkeit.
 * Selbst innerhalb dieser Vorlage war es uneinheitlich: `PvpGame` zeigte auf
 * den Verifizierer, `DiceDuelGame` und `DiceProGame` auf das JSON.
 *
 * Deshalb gibt es genau diese Komponente. Wer eine Runden-ID hat, verlinkt
 * hierüber — nicht mit einem selbst gebauten `href`.
 *
 * Design-Zone: Text und Aussehen dürfen angepasst werden. Was bleiben MUSS:
 * das Ziel ist der Verifizierer, und jede abgeschlossene Runde hat einen.
 */

/** Baut das Ziel. Eine ID reicht — der Verifizierer erkennt selbst, ob es eine
 * Solo-Runde, ein PvP-Match, ein Turnier-Lauf oder eine Live-/Crash-Runde ist. */
export function verifyHref(verifierUrl: string, id: string): string {
  return `${verifierUrl.replace(/\/+$/, '')}/verify/${encodeURIComponent(id)}`;
}

export function VerifyLink({
  verifierUrl,
  id,
  label,
  className = '',
}: {
  verifierUrl: string;
  /** Runden-, Match- oder Lauf-ID. Fehlt sie, wird nichts gezeigt. */
  id: string | null | undefined;
  /** Ohne Angabe: „Runde verifizieren" in der aktiven Sprache. */
  label?: string;
  className?: string;
}) {
  const t = useT();
  if (!id) return null;
  return (
    <a
      href={verifyHref(verifierUrl, id)}
      target="_blank"
      rel="noopener noreferrer"
      title={t('verify.hint')}
      className={`inline-block text-accent underline underline-offset-2 hover:text-accent/80 ${className}`}
    >
      {label ?? t('verify.round')}
    </a>
  );
}
