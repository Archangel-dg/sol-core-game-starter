// ⚠ Nicht ändern — Systemvertrag.
// Die Anzeige-Mathematik der Drift-Schicht: EXAKT die Regeln, nach denen der
// Server auszahlt. Reine Funktionen, keine Importe — damit sie sich außerhalb
// des Browsers pinnen lassen (website/src/lib/starter-drift-math.test.ts).
//
// Quelle jeder Regel hier ist `src/services/live-drift-bet.ts` bzw.
// `src/services/live-drift-path.ts` im API-Repo. Wer eine dieser Funktionen
// „verbessert", lässt die Oberfläche eine andere Zahl versprechen, als der
// Server zahlt — genau der Fehler, den es hier zu verhindern gilt.
//
// DER UNTERSCHIED ZU `crash-math.ts`: Bei Crash ist die Kurve eine öffentliche
// Formel, der Browser rechnet sie selbst. Die Drift-SPUR ist dagegen geheim
// (sie steckt im Seed) — der Server liefert sie als `path`-Präfix mit, bis zum
// letzten voll verstrichenen Tick. Dieses Modul rechnet deshalb nie eine Spur
// aus; es liest nur aus dem gelieferten Präfix und wendet die Deckelungs- und
// Auszahlungsregeln darauf an.

/** Basispunkte: 10 000 bps = 1.00×. */
const BPS = 10_000;

/**
 * Wirksames Ziel = min(Deckel, Sicherheitsziel) — spiegelt
 * `effectiveTargetBps`, das Drift und Crash TEILEN (live-drift-bet.ts
 * importiert es aus live-crash-bet.ts). Mehr als `Einsatz × wirksames Ziel`
 * kann eine Wette nie auszahlen, egal ob der Spieler klickt oder nicht.
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
 * Der aktuelle Stand der Spur = der letzte Wert des gelieferten Präfixes.
 * Ein leeres Präfix (vor dem Abflug, oder ein älterer API-Stand ohne `path`)
 * ist der Startwert 1.00× — nie `NaN`, nie eine erfundene Zahl.
 */
export function currentValueBps(path: number[] | null | undefined): number {
  if (!path || path.length === 0) return BPS;
  const last = path[path.length - 1];
  return typeof last === 'number' && Number.isFinite(last) ? last : BPS;
}

/**
 * Höchststand des gelieferten Präfixes. WICHTIG: Das ist der bisher
 * SICHTBARE Höchststand, nicht `peak_bps` der Runde — den hält der Server bis
 * zum Rundenende zurück, weil er die Zukunft der Spur verrät.
 *
 * Er entscheidet, ob das Sicherheitsziel bereits ausgelöst hat: der Server
 * zahlt bei Berührung das Ziel, auch wenn die Spur danach fällt
 * (`resolveDriftBetValueBps`, Fall 2).
 */
export function peakOfPathBps(path: number[] | null | undefined): number {
  if (!path || path.length === 0) return BPS;
  let peak = BPS;
  for (const v of path) {
    if (typeof v === 'number' && Number.isFinite(v) && v > peak) peak = v;
  }
  return peak;
}

/**
 * Was ein Klick JETZT bringt (BRUTTO-Stand in BPS) — oder `null`, wenn dieser
 * Browser es NICHT sicher weiß. Der Knopf nennt dann bewusst gar keine Zahl,
 * statt eine falsche zu versprechen.
 *
 * Spiegelt `driftCashoutValueBps` (live-drift-bet.ts) auf dem, was öffentlich
 * ist: Ziel bereits berührt ⇒ exakt das Ziel; sonst der aktuelle Stand,
 * gedeckelt aufs Ziel. Stand 0 (Bust) ⇒ `null` — dann ist nichts mehr zu
 * holen, und der Server antwortete auf einen Klick ohnehin mit API-823.
 *
 * Die beiden `null`-Fälle sind dieselben wie bei Crash (`cashoutDisplayBps`):
 *   1. `targetKnown = false` — die Wette wurde in einer anderen Sitzung
 *      gesetzt (Neuladen mitten im Flug). Das Sicherheitsziel kennt nur diese
 *      eine Sitzung; die Mitspieler-Antwort hält es absichtlich zurück.
 *   2. `ceilingBps === null` — der Server hat keinen Deckel mitgeliefert.
 */
export function driftCashoutDisplayBps(args: {
  /** Das bisher enthüllte Präfix der Spur aus `/live-drift/state`. */
  path: number[] | null | undefined;
  /** Deckel des Creators; `null` = unbekannt. */
  ceilingBps: number | null;
  /** Sicherheitsziel der eigenen Wette; `null` = keines gesetzt. */
  safetyTargetBps: number | null;
  /** Kennt DIESER Tab das Sicherheitsziel der eigenen Wette? */
  targetKnown: boolean;
}): number | null {
  if (!args.targetKnown || args.ceilingBps === null) return null;
  const target = effectiveTargetBps(args.ceilingBps, args.safetyTargetBps);
  if (peakOfPathBps(args.path) >= target) return target;
  const value = currentValueBps(args.path);
  if (value === 0) return null;
  return Math.min(value, target);
}

/**
 * Die Netto-Auszahlung eines Standes in Lamports — spiegelt
 * `driftPayoutLamports` (live-drift-bet.ts) mit derselben Reihenfolge und
 * demselben EINEN Abrunden am Ende: `Einsatz × Stand × Keep / 10000²`.
 *
 * Warum das hier steht und bei Crash fehlt: Crash zahlt `Einsatz × Stand`
 * (der Hausvorteil steckt im Crash-Gesetz), Drift zahlt `Einsatz × Stand ×
 * 97 %`. Wer das im Frontend vergisst, verspricht durchgehend 3 % zu viel.
 */
export function driftPayoutLamports(
  betLamports: bigint,
  valueBps: number,
  keepFractionBps: number,
): bigint {
  if (valueBps <= 0) return 0n;
  return (
    (betLamports * BigInt(Math.round(valueBps)) * BigInt(Math.round(keepFractionBps))) /
    (BigInt(BPS) * BigInt(BPS))
  );
}

/**
 * Nimmt der Server dieses Sicherheitsziel an? Spiegelt die API-824-Guard in
 * `placeDriftDemoBet`: erlaubt ist echt über 1.00× und höchstens der Deckel.
 * Ist der Deckel unbekannt, kann die Oberfläche nichts ausschließen — dann
 * entscheidet der Server (und der Spieler sieht im schlimmsten Fall API-824).
 */
export function safetyTargetAccepted(
  safetyTargetBps: number,
  ceilingBps: number | null,
): boolean {
  if (safetyTargetBps <= BPS) return false;
  return ceilingBps === null || safetyTargetBps <= ceilingBps;
}

/**
 * Wie viele Ticks sind vom Rundenfenster schon verbraucht (0..1)? Nur für die
 * Anzeige des Zeitbalkens — die Runde endet, wenn der SERVER sie beendet,
 * nie wenn dieser Balken voll ist.
 */
export function timeFraction(pathLength: number, maxTicks: number): number {
  if (!Number.isFinite(maxTicks) || maxTicks <= 0) return 0;
  const ticks = Math.max(0, pathLength - 1);
  return Math.max(0, Math.min(1, ticks / maxTicks));
}
