/**
 * Client-Seed des Spielers: 32 Hex-Zeichen aus dem Zufall des Browsers.
 *
 * Provably Fair heißt: Der Server legt seinen Seed vorher fest, der SPIELER
 * bringt seinen eigenen mit — so kann keine Seite das Ergebnis allein
 * bestimmen. Ohne Client-Seed setzt der Server einen Ersatz ein; das Spiel
 * funktioniert, aber der Spieler hat nichts beigetragen.
 *
 * Seit dem 14.11.2026 zählt eine Demo-Runde für die automatische
 * Echtgeld-Freischaltung nur, wenn sie einen Client-Seed VOM SPIEL trägt,
 * jedes Mal einen anderen. Darum schicken Einzelrunden und Sitzungsstarts
 * ihn immer mit — im Demo wie mit Echtgeld.
 */
export function randomHexSeed(): string {
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
}

/**
 * Schlüssel einer Wette für den Wiederholungsschutz (`idempotencyKey`, seit 19.11.2026): je Wette neu, bei einer
 * Wiederholung DERSELBE — dann gibt Sol-Core die Runde zurück, statt eine zweite zu buchen. 32 Hex-Zeichen passen zur
 * Form, die der Server verlangt (8–64 Zeichen aus A–Z, a–z, 0–9, `_`, `-`).
 */
export function newBetKey(): string {
  return randomHexSeed();
}
