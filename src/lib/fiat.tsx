'use client';

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';

import { solToLamports } from '@/lib/lamports';

/**
 * Näherung in Landeswährung neben dem SOL-Betrag (Design-Zone).
 *
 * WOFÜR: Ein Spieler ohne Krypto-Erfahrung kann mit „0.05 ◎" nichts anfangen.
 * „≈ 4,60 €" darunter beantwortet die Frage, um die es ihm geht.
 *
 * DREI REGELN, die keine Geschmacksfrage sind:
 *
 *  1. SOL BLEIBT DIE ZAHL. Die Währungsangabe steht DANEBEN, nie an ihrer
 *     Stelle. Der Server rechnet in Lamports ab, der Scanner zeigt SOL, der
 *     Höchsteinsatz ist in SOL — ersetzte man die Zahl, könnte ein Spieler
 *     seine Runde nicht mehr mit der Verify-Seite abgleichen.
 *  2. NIE IN EINEN GELDPFAD. Der Kurs ist eine Fließkommazahl; Geld ist
 *     `bigint`/Lamports (Kernregel 3). Diese Datei RECHNET nur für die Anzeige
 *     und liefert einen String. Eingaben bleiben in SOL.
 *  3. LIEBER NICHTS ALS ETWAS FALSCHES. Fehlt der Kurs oder ist er zu alt,
 *     entfällt die Zeile ersatzlos. Eine veraltete Zahl neben einem Gewinn ist
 *     ein falsches Versprechen — schlimmer als gar keine Angabe.
 */

export type Fiat = 'off' | 'usd' | 'eur';

const STORE_KEY = 'sc_fiat';
/** Wie oft der Kurs nachgezogen wird. Der Server cacht ohnehin 60 s. */
const POLL_MS = 90_000;
/**
 * Ab hier gilt ein Kurs als zu alt und die Anzeige entfällt.
 *
 * Der Server hält seinerseits nur frische Werte; diese Grenze fängt den Fall
 * ab, dass ein Tab lange im Hintergrund lag und mit einer alten Antwort im
 * Speicher wieder auftaucht.
 */
const MAX_ALTER_MS = 15 * 60_000;

interface Preis {
  usd: number | null;
  eur: number | null;
  at: string;
}

// ── Währungswahl: ein Wert für die ganze Seite, ohne Provider ───────────────
// Mehrere Anzeigen (Saldo, Gewinnmeldung, Ergebnis) müssen dieselbe Währung
// zeigen. Ein winziger Speicher mit useSyncExternalStore ist dafür genug —
// ein Provider mehr im Baum wäre nur Zeremonie.

let waehrung: Fiat = 'off';
const hoerer = new Set<() => void>();

function melden() {
  for (const h of hoerer) h();
}

function abonnieren(h: () => void) {
  hoerer.add(h);
  return () => {
    hoerer.delete(h);
  };
}

/**
 * Vorauswahl aus der Gerätesprache: Wer in einem Euro-Land sitzt, sieht Euro,
 * ohne etwas einzustellen — und genau diese Spieler sollen ja abgeholt werden.
 * Ein Umschalter, den man erst finden muss, hilft ihnen nicht.
 */
function ausGeraetesprache(): Fiat {
  if (typeof navigator === 'undefined') return 'off';
  const EURO_LAENDER = /^(de|at|fr|es|it|nl|be|pt|ie|fi|gr|sk|si|lv|lt|ee|lu|cy|mt|hr)\b/i;
  const sprachen = navigator.languages ?? [navigator.language];
  for (const s of sprachen) {
    if (!s) continue;
    const region = s.split('-')[1];
    if (region && EURO_LAENDER.test(region)) return 'eur';
    if (EURO_LAENDER.test(s)) return 'eur';
  }
  return 'usd';
}

let gelesen = false;
/**
 * Wurde die Währung nur aus der Gerätesprache GERATEN (statt vom Spieler
 * gewählt)? Dann darf sie ausweichen, wenn für sie gerade kein Kurs da ist —
 * siehe `useFiat`. Eine getroffene Wahl weicht nie aus.
 */
let geraten = true;

function initial(): Fiat {
  if (gelesen || typeof window === 'undefined') return waehrung;
  gelesen = true;
  try {
    const v = localStorage.getItem(STORE_KEY);
    if (v === 'usd' || v === 'eur' || v === 'off') {
      waehrung = v;
      geraten = false;
    } else {
      waehrung = ausGeraetesprache();
    }
  } catch {
    waehrung = ausGeraetesprache();
  }
  return waehrung;
}

export function setzeFiat(v: Fiat): void {
  waehrung = v;
  geraten = false;
  try {
    localStorage.setItem(STORE_KEY, v);
  } catch {
    /* Speicher gesperrt — dann gilt die Wahl nur für diese Sitzung */
  }
  melden();
}

// ── Kurs ────────────────────────────────────────────────────────────────────
// Ein Abruf für die ganze Seite, nicht einer je Anzeige.

let preis: Preis | null = null;
let laeuft = false;

async function holen() {
  try {
    preis = (await fetch('/api/price').then((x) => x.json())) as Preis;
  } catch {
    // Kein Kurs ist kein Fehler — die Anzeige entfällt einfach.
    preis = null;
  }
  melden();
}

function starten() {
  if (laeuft) return () => {};
  laeuft = true;
  void holen();
  const id = setInterval(() => void holen(), POLL_MS);
  return () => {
    clearInterval(id);
    laeuft = false;
  };
}

export interface FiatApi {
  /** Gewählte Währung — `'off'` blendet jede Umrechnung aus. */
  currency: Fiat;
  setCurrency: (v: Fiat) => void;
  /** true, sobald eine Währung gewählt IST und ein brauchbarer Kurs vorliegt. */
  ready: boolean;
  /**
   * Welche Währungen gerade überhaupt einen Kurs haben.
   *
   * Der Umschalter blendet die anderen aus. Ohne das gäbe es einen Knopf, auf
   * den man tippt und bei dem nichts passiert — und der Spieler hätte keine
   * Ahnung, dass die andere Währung noch ginge. (Tritt auf, wenn der
   * Devisenkurs ausfällt, der SOL-Kurs aber steht: dann gibt es USD, aber
   * kein EUR.)
   */
  available: { usd: boolean; eur: boolean };
  /**
   * Lamports → z. B. „≈ 4,60 €". `null`, wenn die Angabe entfallen muss —
   * dann rendert der Aufrufer NICHTS, keinen Platzhalter.
   */
  format: (lamports: string | bigint) => string | null;
  /**
   * Dasselbe für einen SOL-String aus einem Eingabefeld — also für einen Text,
   * an dem noch getippt wird. Halbfertige Eingaben („0.", „", „abc") ergeben
   * `null` statt einer Fehlermeldung: Ein Eingabefeld darf beim Tippen nicht
   * meckern, es zeigt die Näherung erst, sobald sie stimmt.
   */
  formatSol: (sol: string) => string | null;
}

export function useFiat(): FiatApi {
  const gewaehlt = useSyncExternalStore(abonnieren, initial, () => 'off' as Fiat);
  const [zaehler, tick] = useState(0);

  useEffect(() => {
    const ab = abonnieren(() => tick((n) => n + 1));
    const stop = starten();
    return () => {
      ab();
      stop();
    };
  }, []);

  /** Ein Kurs zählt nur, wenn er da, brauchbar UND frisch ist. */
  const brauchbar = useCallback((k: number | null | undefined): k is number => {
    if (!preis) return false;
    const alter = Date.now() - Date.parse(preis.at);
    if (!Number.isFinite(alter) || alter > MAX_ALTER_MS) return false;
    return k != null && Number.isFinite(k) && k > 0;
  }, []);

  const available = useMemo(
    () => ({ usd: brauchbar(preis?.usd), eur: brauchbar(preis?.eur) }),
    // `preis` ist ein Modul-Wert, kein State — die Neuberechnung hängt am
    // Melde-Zähler, der bei jedem Abruf hochzählt.
    [brauchbar, zaehler],
  );

  /**
   * Die Währung, die WIRKLICH angezeigt wird.
   *
   * Weicht nur dann von der gewählten ab, wenn diese bloß aus der
   * Gerätesprache geraten war und gerade keinen Kurs hat, die andere aber
   * schon: Ein Spieler in Deutschland, dessen Devisenkurs ausfällt, sieht dann
   * Dollar statt gar nichts — und der Umschalter zeigt auch Dollar an, statt
   * mit keiner gedrückten Taste dazustehen. Eine getroffene Wahl bleibt
   * unangetastet; wer „aus" gewählt hat, bekommt nichts eingeblendet.
   */
  const currency = useMemo<Fiat>(() => {
    if (gewaehlt === 'off' || !geraten || available[gewaehlt]) return gewaehlt;
    const andere: Fiat = gewaehlt === 'eur' ? 'usd' : 'eur';
    return available[andere] ? andere : gewaehlt;
  }, [gewaehlt, available]);

  const kurs = useMemo(() => {
    if (currency === 'off') return null;
    const k = currency === 'eur' ? preis?.eur : preis?.usd;
    return brauchbar(k) ? k : null;
  }, [currency, brauchbar, zaehler]);

  const format = useCallback(
    (lamports: string | bigint): string | null => {
      if (kurs === null) return null;
      let n: bigint;
      try {
        n = typeof lamports === 'bigint' ? lamports : BigInt(lamports);
      } catch {
        return null;
      }
      // Lamports → SOL als Zahl. Bewusst erst HIER: Bis zu diesem Punkt ist
      // der Betrag ganzzahlig, und nur die Anzeige verlässt die Genauigkeit.
      const betrag = (Number(n) / 1e9) * kurs;
      const sprache = currency === 'eur' ? 'de-DE' : 'en-US';
      const code = currency === 'eur' ? 'EUR' : 'USD';
      // Sehr kleine Beträge sonst als „0,00 €" — dann lieber mehr Stellen.
      const stellen = betrag !== 0 && Math.abs(betrag) < 0.01 ? 4 : 2;
      return `≈ ${new Intl.NumberFormat(sprache, {
        style: 'currency',
        currency: code,
        minimumFractionDigits: stellen,
        maximumFractionDigits: stellen,
      }).format(betrag)}`;
    },
    [kurs, currency],
  );

  const formatSol = useCallback(
    (sol: string): string | null => {
      if (kurs === null || !sol.trim()) return null;
      try {
        return format(solToLamports(sol));
      } catch {
        return null; // noch im Tippen — keine Näherung, keine Meldung
      }
    },
    [kurs, format],
  );

  return { currency, setCurrency: setzeFiat, ready: kurs !== null, available, format, formatSol };
}
