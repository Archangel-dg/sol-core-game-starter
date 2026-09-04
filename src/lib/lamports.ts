// ⚠ Nicht ändern — Systemvertrag.
// Geldwerte sind IMMER Lamport-Strings/BigInt (1 SOL = 1e9). Nie Number.

export const LAMPORTS_PER_SOL = 1_000_000_000n;

/** Lamports (string|bigint) → SOL-Anzeige. */
export function toSol(lamports: string | bigint, digits = 4): string {
  const n = typeof lamports === 'bigint' ? lamports : BigInt(lamports);
  const whole = n / LAMPORTS_PER_SOL;
  const frac = n % LAMPORTS_PER_SOL;
  const fracStr = frac.toString().padStart(9, '0').slice(0, digits).replace(/0+$/, '');
  return fracStr ? `${whole}.${fracStr}` : whole.toString();
}

/**
 * Dezimaltrenner vereinheitlichen: Ein Komma wird zum Punkt.
 *
 * Warum das sein muss (04.09.2026 auf einem deutschen Telefon gemeldet): Die
 * Geldfelder sind Textfelder mit `inputMode="decimal"`. Die Tastatur, die
 * dabei aufgeht, trägt den Dezimaltrenner der GERÄTE-Sprache — in weiten
 * Teilen Europas ein Komma, und eine Punkt-Taste gibt es dort gar nicht. Wer
 * „0,5" tippte, bekam „Ungültiger SOL-Betrag" und konnte keinen Bruchteil
 * setzen. (Die Engine-Zahlenfelder trifft es nicht: die sind `type="number"`,
 * dort normalisiert der Browser selbst.)
 *
 * NICHT geraten wird bei Tausendertrennung: Sind Punkt UND Komma da
 * („1.234,56") oder mehrere Kommas („1,234,567"), bleibt der String, wie er
 * ist — die Prüfung darunter lehnt ihn dann ab. Lieber eine klare Ablehnung
 * als ein stiller Faktor 1000 auf einem Geldbetrag.
 *
 * Ein einzelnes Komma ohne Punkt ist eindeutig genug: Auf einer Dezimal-
 * Tastatur gibt es genau eine Trennertaste, und sie trennt Nachkommastellen.
 * Träfe die Annahme doch einmal nicht zu, wäre „1,000" 1 SOL statt 1000 —
 * also WENIGER Geld im Spiel, nicht mehr, und im Feld sichtbar.
 */
function mitPunktAlsTrenner(t: string): string {
  if (!t.includes(',')) return t;
  if (t.includes('.') || t.indexOf(',') !== t.lastIndexOf(',')) return t;
  return t.replace(',', '.');
}

/** SOL-Eingabe (string) → Lamports (bigint). Wirft bei ungültiger Eingabe.
 *  Komma und Punkt sind beide zulässig (siehe `mitPunktAlsTrenner`). */
export function solToLamports(sol: string): bigint {
  const t = mitPunktAlsTrenner(sol.trim());
  // Englisch, weil dieser Satz beim Spieler landet: die Aufrufer zeigen
  // `error.message` direkt an, und die Oberfläche ist englischsprachig.
  if (!/^\d+(\.\d+)?$/.test(t)) throw new Error('Invalid SOL amount');
  const [whole, frac = ''] = t.split('.');
  const fracPadded = (frac + '000000000').slice(0, 9);
  return BigInt(whole) * LAMPORTS_PER_SOL + BigInt(fracPadded);
}
