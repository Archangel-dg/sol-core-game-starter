// ⚠ Nicht ändern — Systemvertrag.
// Die Anzeige-Mathematik der Crash-Schicht: EXAKT die Regeln, nach denen der
// Server auszahlt. Reine Funktionen, keine Importe — damit sie sich außerhalb
// des Browsers pinnen lassen (website/src/lib/starter-crash-math.test.ts).
//
// Quelle jeder Regel hier ist `src/services/live-crash-bet.ts` bzw.
// `src/services/live-crash-curve.ts` im API-Repo. Wer eine dieser Funktionen
// „verbessert", lässt die Oberfläche eine andere Zahl versprechen, als der
// Server zahlt — genau der Fehler, den es hier zu verhindern gilt.

/** Basispunkte: 10 000 bps = 1.00×. */
const BPS = 10_000;

/**
 * m(t) = 2^(t / doubleMs) — spiegelt `multiplierBpsAt` in
 * `services/live-crash-curve.ts`, Bedingung für Bedingung: `!Number.isFinite`
 * UND `<= 0` fallen auf 1.00× zurück, danach wird IMMER abgerundet (der
 * Spieler bekommt nie mehr, als die Kurve zeigt).
 *
 * Die `Number.isFinite`-Hälfte ist kein Zierrat: ein unlesbares `takeoffAt`
 * ergibt NaN, `NaN <= 0` ist false — ohne den Wächter stünde „NaN×" in der
 * Anzeige.
 */
export function multiplierBpsAt(elapsedMs: number, doubleMs: number): number {
  if (!Number.isFinite(elapsedMs) || elapsedMs <= 0) return BPS;
  return Math.floor(Math.pow(2, elapsedMs / doubleMs) * BPS);
}

/**
 * Wirksames Ziel = min(Deckel, Sicherheitsziel) — spiegelt
 * `effectiveTargetBps` in `services/live-crash-bet.ts` Zeile für Zeile.
 * Mehr als `Einsatz × wirksames Ziel` kann eine Wette nie auszahlen, egal ob
 * der Spieler klickt oder nicht (Spec §8.1).
 */
export function effectiveTargetBps(
  ceilingBps: number,
  safetyTargetBps: number | null | undefined,
): number {
  const ceiling = Math.max(BPS + 1, Math.round(ceilingBps));
  if (safetyTargetBps === null || safetyTargetBps === undefined) return ceiling;
  const safety = Math.round(safetyTargetBps);
  if (!Number.isFinite(safety) || safety <= BPS) return ceiling;
  return Math.min(ceiling, safety);
}

/**
 * Was ein Klick JETZT bringt — oder `null`, wenn dieser Browser es NICHT
 * sicher weiß. Der Knopf nennt dann bewusst gar keine Zahl, statt eine
 * falsche zu versprechen.
 *
 * Die Zahl selbst ist `cashoutMultiplierFor` ohne den Crash-Punkt: der ist
 * vor `crashed` geheim (`live-crash-public.ts`), und ein Klick nach dem Crash
 * endet ohnehin serverseitig in API-823. Alles ANDERE an der Deckelung ist
 * hier vollständig abgebildet:
 *
 *   1. `targetKnown = false` — die Wette wurde in einer anderen Sitzung
 *      gesetzt (Neuladen mitten im Flug). Das Sicherheitsziel kennt nur diese
 *      eine Sitzung; die Mitspieler-Antwort hält es absichtlich zurück
 *      (`listRoundPlayers` liefert es erst nach dem Ausstieg). Erraten oder
 *      lokal speichern wäre schlimmer als schweigen.
 *   2. `ceilingBps === null` — der Server hat keinen Deckel mitgeliefert
 *      (älterer API-Stand ohne `state.config`, oder eine Spiel-Config ohne
 *      lesbaren Deckel). Ohne ihn ist die Obergrenze unbekannt.
 */
export function cashoutDisplayBps(args: {
  liveBps: number;
  /** Deckel des Creators aus `/live-crash/state`; `null` = unbekannt. */
  ceilingBps: number | null;
  /** Sicherheitsziel der eigenen Wette; `null` = keines gesetzt. */
  safetyTargetBps: number | null;
  /** Kennt DIESER Tab das Sicherheitsziel der eigenen Wette? */
  targetKnown: boolean;
}): number | null {
  if (!args.targetKnown || args.ceilingBps === null) return null;
  return Math.min(args.liveBps, effectiveTargetBps(args.ceilingBps, args.safetyTargetBps));
}

/**
 * Nimmt der Server dieses Sicherheitsziel an? Spiegelt die API-824-Guard in
 * `placeDemoBet`: erlaubt ist echt über 1.00× und höchstens der Deckel. Ist
 * der Deckel unbekannt, kann die Oberfläche nichts ausschließen — dann
 * entscheidet der Server (und der Spieler sieht im schlimmsten Fall API-824).
 */
export function safetyTargetAccepted(
  safetyTargetBps: number,
  ceilingBps: number | null,
): boolean {
  if (safetyTargetBps <= BPS) return false;
  return ceilingBps === null || safetyTargetBps <= ceilingBps;
}
