/**
 * ██ GESTALTUNGSZONE ██ — die Reveal-Animationen: Vertrag, Registry, Lader.
 *
 * Jede Engine hat ihr Modul unter `src/reveals/<engine>.js`: reines Browser-
 * JavaScript ohne Framework, das in ein Quadrat gezeichnet wird. Die Module
 * sind absichtlich KEINE React-Komponenten: Ein Creator, der die Münze durch
 * ein Roulette-Rad aus seinem Theme ersetzen will, braucht dafür weder React
 * noch TypeScript — nur DOM, SVG oder Canvas. `RevealHost` hängt das Modul
 * ein, reicht Ergebnis und Übersetzungen hinein und meldet, wann es fertig ist.
 *
 * FÜNF REGELN, die keine Geschmacksfrage sind (docs/RULES.md, Regel 16):
 *
 *  1. REINE FUNKTION des Ergebnisses. Kein `Math.random()`, nirgends. Jede
 *     Bewegung folgt aus dem Server-Ergebnis plus verstrichener Zeit — dieselbe
 *     Runde sieht bei jedem Abspielen gleich aus.
 *  2. NICHTS VORAB ERKENNBAR. Die Ergebnis-Knoten bleiben LEER, bis die
 *     Animation steht — auch DevTools, `innerText` und ein Screenreader
 *     erfahren vorher nichts.
 *  3. KEIN NEAR-MISS. Kein Bremsen, kein Zögern, kein Wackeln kurz vor dem
 *     Gewinnfeld. Ein Verlust wird als Verlust gezeigt.
 *  4. DER GEWINNER STEHT AM ENDE — und bleibt stehen. `play()` löst erst auf,
 *     wenn das Endbild steht; daran hängt alles, was den Ausgang verrät
 *     (Saldo, Ton, Verlauf, Gewinnmeldung).
 *  5. ERGEBNISSE NUR AUS DEM OUTCOME. `win`, `multiplierBps`, `payoutLamports`
 *     werden gelesen, nie aus einem Wurf neu berechnet — der Server entscheidet.
 *
 * Und eine sechste, die das Kit betrifft: KEIN sichtbarer Text im Modul. Jede
 * Beschriftung läuft über `ctx.text(schlüssel)` durch den Sprachkatalog
 * (`lib/strings.ts`, vier Sprachen) — ein Modul, das „Won" hart schreibt,
 * spricht in einem französischen Spiel plötzlich Englisch.
 */

export type RevealMechanic = 'single' | 'session' | 'tournament' | 'pvp';

/** Formatierer, die der Host bereitstellt — damit jedes Modul Beträge exakt
 *  so schreibt wie der Rest der Oberfläche (BigInt-Lamports, nie Float). */
export interface RevealFormat {
  /** 19600 → „1.96×" */
  mult(bps: number | string | null | undefined): string;
  /** Lamport-String → „0.196" (bis 9 Stellen, Nullen gekürzt) */
  sol(lamports: string | bigint | null | undefined): string;
  /** „Won +0.196 ◎" in der Sprache des Spielers */
  won(payoutLamports: string | bigint): string;
  /** „Lost" in der Sprache des Spielers */
  lost(): string;
  /** „≈ 17,40 €" — oder `null`, wenn die Näherung entfallen muss (Regel 15).
   *  Dann rendert das Modul NICHTS, keinen Platzhalter. */
  fiat(lamports: string | bigint): string | null;
}

export interface RevealContext {
  /**
   * Aufgelöste Engine-Dimensionen des Spiels (`/api/meta` → `engineConfig`,
   * z. B. plinko `{ rows }`, mines `{ gridSize, mineCount }`). Der LEERLAUF
   * wird daraus gezeichnet — ein Spiel mit 16 Reihen zeigt vor der ersten
   * Runde 16 Reihen, nicht ein Standardbrett. Pro Runde gilt, was das
   * Ergebnis selbst mitbringt (`details`).
   */
  readonly engineConfig: Record<string, unknown> | null;
  /** Katalog-Text in der Sprache des Spielers (Schlüssel aus `lib/strings.ts`). */
  text(key: string, vars?: Record<string, string | number>): string;
  /** Kurzbeschreibung der Engine (übersetzt) — für Leerlauf-Rahmen mit Platz
   *  dafür, z. B. unter der ruhenden Münze. `null`, wenn der Host keine gibt. */
  readonly hint: string | null;
  fmt: RevealFormat;
}

export interface RevealPlayOptions {
  /** Betriebssystem oder Spieler wollen keine Bewegung: Endbild binnen 300 ms. */
  reducedMotion: boolean;
  /**
   * Session/Turnier: so viele Schritte des Protokolls stehen bereits — nur
   * das Neue wird animiert, alles davor sofort gesetzt. Fehlt es, spielt das
   * Modul das ganze Protokoll ab.
   */
  from?: number;
}

export interface RevealArmOptions {
  /** Betriebssystem oder Spieler wollen keine Bewegung: kein Vorlauf, nur leeren. */
  reducedMotion: boolean;
}

/**
 * ██ RÜCKKANAL ██ — der Spieler bedient das BRETT statt einer Liste darunter.
 *
 * Bis hierhin fließt alles in eine Richtung: Der Host reicht ein Ergebnis
 * hinein, das Modul zeigt es. Für Engines, deren Schritt eine Feld-Auswahl IST
 * (mines: welche Kachel, towers: welche Spalte), ist eine zweite Zahlenliste
 * unter dem Spielfeld eine Verdopplung — das Brett steht ja schon da.
 *
 * Ein Modul, das `setPick` anbietet, macht seine Felder bedienbar. Vier Regeln,
 * die daran hängen und keine Geschmacksfrage sind:
 *
 *  1. EIN KLICK ZEICHNET NICHTS. `onPick` meldet nur nach oben; das Feld ändert
 *     sich erst mit dem nächsten `play()`, also mit der Antwort des Servers.
 *     Ein Modul, das die Kachel schon beim Klick umdreht, hat das Ergebnis
 *     geraten — genau das verbietet Regel 16.5.
 *  2. GESPERRT HEISST AUFGEDECKT, NIE „HIER LIEGT WAS". `taken` enthält
 *     ausschließlich Felder, die der Spieler bereits gewählt hat. Ein Modul
 *     darf aus dem Sperrzustand keinen Hinweis auf Mine oder Gewinn bauen —
 *     auch nicht in `aria-label`, `title` oder einem `data-`-Attribut.
 *  3. WÄHREND DER ANIMATION IST ZU. Der Host schickt `enabled:false`, solange
 *     eine Anfrage läuft oder das Modul spielt; ohne diese Sperre schickt ein
 *     Doppelklick den nächsten Schritt los, während der vorige noch fliegt.
 *  4. DIE BEDIENUNG ÜBERLEBT DEN AUSFALL. Der Flow zeigt seine eigene
 *     Ersatz-Auswahl, sobald kein Modul mit `setPick` da ist (Ladefehler,
 *     fremde Engine). Ein Modul ist eine Verschönerung, nie die einzige Tür.
 *
 * Der Index ist der Wert, den der Server für den Schritt erwartet
 * (`{ value: index }`) — bei mines die Kachel 0…gridSize-1, bei towers die
 * Spalte 0…columns-1 DER AKTUELLEN ETAGE. Die Grenzen kommen aus der
 * Server-Config, nicht aus dem Modul.
 */
export interface RevealPickOptions {
  /** `false` ⇒ nichts ist anklickbar (Runde vorbei, Anfrage unterwegs). */
  enabled: boolean;
  /** Kleinster gültiger Index des nächsten Schritts (einschließlich). */
  min: number;
  /** Größter gültiger Index des nächsten Schritts (einschließlich). */
  max: number;
  /** Indizes, die dieser Schritt nicht mehr annimmt — ausschließlich bereits
   *  vom Spieler gewählte Felder (siehe Regel 2 oben). */
  taken?: readonly number[];
  /** Der Spieler hat gewählt. Das Modul zeichnet daraufhin nichts. */
  onPick(index: number): void;
}

export interface RevealController {
  /**
   * Animiert VOM AKTUELLEN BILD zum Endbild; löst auf, sobald es steht. Das
   * aktuelle Bild ist der Leerlauf, das Endbild der Vorrunde oder ein laufender
   * Vorlauf (`arm`) — nie springt das Brett vorher in den Leerlauf zurück: Eine
   * Walze dreht aus der Stellung heraus, in der sie steht.
   */
  play(outcome: unknown, opts: RevealPlayOptions): Promise<void>;
  /**
   * Optional — VORLAUF. Die Runde ist abgeschickt, das Ergebnis noch unterwegs.
   * Das Modul leert seine Ergebnis-Knoten, setzt `data-state="playing"` und
   * bewegt sich schon aus dem aktuellen Bild heraus (Walzen rollen); das
   * folgende `play()` schließt ohne Schnitt daran an. Kennt kein Ergebnis —
   * darf also auch keines andeuten. Module ohne `arm` lassen das letzte Bild
   * stehen, bis `play()` kommt.
   */
  arm?(opts: RevealArmOptions): void;
  /**
   * Optional — Vorlauf OHNE Ergebnis beenden (die Runde kam nicht zustande):
   * auf dem aktuellen Bild zur Ruhe kommen, `data-state` zurück auf `idle`.
   * Ohne laufenden Vorlauf ein No-op.
   */
  disarm?(): void;
  /**
   * Optional — RÜCKKANAL. Macht die Felder des Bretts bedienbar (siehe
   * `RevealPickOptions`). `null` schaltet die Bedienung ganz ab und räumt
   * jeden Zustand weg, der nur zu ihr gehört (Fokus, Hover, Rollen).
   *
   * Module OHNE diese Methode bleiben unverändert gültig: Der Flow merkt das
   * am fehlenden `setPick` und zeigt weiter seine eigene Auswahl.
   */
  setPick?(opts: RevealPickOptions | null): void;
  /** Zurück zum Leerlauf — synchron. Stellung der Walzen/Figuren bleibt, nur
   *  Ergebnis, Markierungen und ein laufender Vorlauf gehen. */
  reset(): void;
  /** Timer, rAF und Beobachter aufräumen. Der Host leert den Knoten selbst. */
  destroy(): void;
}

export interface RevealModule {
  /** Engine-Schlüssel aus `lib/engines.ts`. */
  key: string;
  mechanic: RevealMechanic;
  /** Alle Katalog-Schlüssel, die das Modul rendert — `check:contract`
   *  verlangt sie in allen vier Sprachen. */
  strings: readonly string[];
  /** Zeichnet den Leerlauf in `root` (quadratisch, `position:relative`,
   *  `overflow:hidden`) und gibt die Steuerung zurück. */
  mount(root: HTMLElement, ctx: RevealContext): RevealController;
}

type Loader = () => Promise<{ reveal: RevealModule }>;

/**
 * Engine → Modul. Dynamische Importe, damit ein Spiel nur das Modul seiner
 * eigenen Engine lädt (jedes ist 10–25 KB) und nicht alle zwanzig.
 *
 * Nicht hier: die Live-Engines (`live-odds`, `live-crash`, `live-drift`) und
 * die PvP-Engines. Ihre Animationen sind Funktionen eines SERVERSEITIGEN
 * Reveal-Fensters (`revealProgress`) und leben als Vertragskomponenten in
 * `LiveResultView`, `CrashCurveView`, `DriftTrackView` und `PvpGame`.
 */
const LOADERS: Record<string, Loader> = {
  'coin-flip': () => import('@/reveals/coin-flip'),
  dice: () => import('@/reveals/dice'),
  limbo: () => import('@/reveals/limbo'),
  plinko: () => import('@/reveals/plinko'),
  wheel: () => import('@/reveals/wheel'),
  keno: () => import('@/reveals/keno'),
  scratch: () => import('@/reveals/scratch'),
  roulette: () => import('@/reveals/roulette'),
  'slots-3x3': () => import('@/reveals/slots-3x3'),
  'slots-modular': () => import('@/reveals/slots-modular'),
  // Session-Engines: das Modul spielt das Protokoll SCHRITTWEISE (`from`), der
  // Adapter `lib/reveal-session.ts` baut es aus der SessionView.
  mines: () => import('@/reveals/mines'),
  towers: () => import('@/reveals/towers'),
  hilo: () => import('@/reveals/hilo'),
  'dice-ladder': () => import('@/reveals/dice-ladder'),
  steps: () => import('@/reveals/steps'),
  pump: () => import('@/reveals/pump'),
  'spin-tower-pro': () => import('@/reveals/spin-tower-pro'),
  // Turnier: der Lauf-Verlauf (`history`) ist das Protokoll.
  gauntlet: () => import('@/reveals/gauntlet'),
};

/** Hat diese Engine ein Reveal-Modul? Entscheidet in den Spiel-Flows, ob das
 *  Ergebnis auf `onRevealed` wartet oder mit dem Render sichtbar wird. */
export function hasReveal(engineKey: string): boolean {
  return Object.prototype.hasOwnProperty.call(LOADERS, engineKey);
}

/** Alle Engine-Schlüssel mit Modul — für Prüfskripte und die Galerie. */
export function revealKeys(): string[] {
  return Object.keys(LOADERS);
}

const cache = new Map<string, Promise<RevealModule | null>>();

/** Lädt das Modul einer Engine (einmal je Seite). `null`, wenn es keins gibt. */
export function loadReveal(engineKey: string): Promise<RevealModule | null> {
  const loader = LOADERS[engineKey];
  if (!loader) return Promise.resolve(null);
  let p = cache.get(engineKey);
  if (!p) {
    p = loader()
      .then((m) => m.reveal)
      .catch(() => {
        // Ein kaputtes Modul darf das Spiel nicht mitreißen: ohne Modul zeigt
        // der Flow die schlichte ResultView — spielbar, nur ohne Animation.
        cache.delete(engineKey);
        return null;
      });
    cache.set(engineKey, p);
  }
  return p;
}
