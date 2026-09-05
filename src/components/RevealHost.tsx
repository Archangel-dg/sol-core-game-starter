'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useT } from '@/lib/i18n';
import type { StringKey } from '@/lib/strings';
import { toSol } from '@/lib/lamports';
import { useFiat } from '@/lib/fiat';
import { isReducedMotion, useMotion } from '@/lib/motion';
import { loadReveal, type RevealContext, type RevealController, type RevealModule, type RevealPickOptions } from '@/lib/reveal';

/**
 * ██ GESTALTUNGSZONE ██ — hängt das Reveal-Modul einer Engine ins Spielfeld.
 *
 * Der Host tut fünf Dinge, und nur die:
 *  1. lädt das Modul der Engine (`lib/reveal.ts`) und zeichnet den Leerlauf
 *     aus `engineConfig`;
 *  2. spielt jedes neue `outcome` ab (Objekt-Identität — jede Runde ist ein
 *     neues Objekt) und setzt bei `null` auf den Leerlauf zurück; solange eine
 *     Runde unterwegs ist (`pending`), lässt er das Modul vorlaufen (`arm`),
 *     damit z. B. Walzen schon rollen und nie aus dem Leerlauf springen;
 *  3. meldet `onRevealed(outcome)` EINMAL, sobald das Endbild steht — daran
 *     hängt der Aufrufer alles, was den Ausgang verrät;
 *  4. reicht Sprache, Formatierer und den Animations-Schalter hinein;
 *  5. reicht die Feld-Auswahl (`pick`) an Module weiter, die einen Rückkanal
 *     anbieten, und meldet über `onPickSupport`, OB dieses Modul einen hat —
 *     daran entscheidet der Flow, ob er seine eigene Ersatz-Auswahl zeigt.
 *
 * Zu 5. gehört eine Ehrlichkeit, die leicht verlorengeht: `onPickSupport(false)`
 * kommt auch dann, wenn das Modul gar nicht erst geladen hat (Netzfehler,
 * kaputtes Modul). Der Flow bekommt so seine Liste zurück, statt mit einem
 * leeren Brett dazustehen, das niemand bedienen kann.
 *
 * Wird ein laufendes Abspielen durch ein neues Ergebnis oder den Abbau
 * abgelöst, meldet der Host das ALTE trotzdem als offengelegt: Die Runde hat
 * stattgefunden, Geld ist geflossen, der Verlauf braucht den Eintrag. Deshalb
 * trägt die Meldung das Ergebnis — der Aufrufer ordnet sie seiner Runde zu,
 * statt „das letzte" anzunehmen.
 */
export interface RevealHostProps {
  engineKey: string;
  /** Aufgelöste Engine-Dimensionen vom Server (Leerlauf-Geometrie). */
  engineConfig?: Record<string, unknown> | null;
  /** Das abzuspielende Ergebnis; `null` zeigt den Leerlauf. */
  outcome: unknown | null;
  /** Session/Turnier: Schritte, die schon stehen (siehe RevealPlayOptions). */
  from?: number;
  /**
   * Die Runde ist abgeschickt, ihr Ergebnis noch nicht da. Module mit `arm()`
   * bewegen sich ab jetzt aus dem aktuellen Bild heraus; kommt kein Ergebnis
   * (Fehler), kommen sie mit `disarm()` zur Ruhe. Für alle anderen bleibt das
   * letzte Bild stehen, bis `outcome` wechselt.
   */
  pending?: boolean;
  /** Einmal je Ergebnis, sobald das Endbild steht. */
  onRevealed?: (outcome: unknown) => void;
  /**
   * Feld-Auswahl des nächsten Schritts — nur Module mit `setPick` verwenden
   * sie (mines: Kachel, towers: Spalte der aktuellen Etage). `null`/`undefined`
   * schaltet die Bedienung ab. Das Objekt darf bei jedem Render neu entstehen;
   * der Host reicht es nur weiter, wenn sich sein INHALT ändert — sonst
   * verlöre eine Kachel bei jedem Render Fokus und Hover.
   */
  pick?: RevealPickOptions | null;
  /**
   * Kann dieses Modul überhaupt bedient werden? Kommt nach jedem Ein- und
   * Ausbau. `false` heißt: der Aufrufer muss seine eigene Auswahl zeigen.
   */
  onPickSupport?: (supported: boolean) => void;
  /** Übersetzte Kurzbeschreibung der Engine für den Leerlauf (siehe RevealContext.hint). */
  hint?: string | null;
  className?: string;
}

export function RevealHost({ engineKey, engineConfig, outcome, from, pending = false, onRevealed, pick = null, onPickSupport, hint = null, className = '' }: RevealHostProps) {
  const t = useT();
  const { format } = useFiat();
  const { enabled: motionOn } = useMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const ctlRef = useRef<RevealController | null>(null);
  const [mod, setMod] = useState<RevealModule | null>(null);
  /** Zählt Ein-/Ausbau, damit der Abspiel-Effekt nach einem Neu-Einbau läuft. */
  const [mounted, setMounted] = useState(0);

  // Alles Lebendige in einem Ref: Das Modul hält den Kontext einmal, ruft
  // aber `ctx.text(...)` erst beim Schreiben — so trifft ein Sprachwechsel
  // auch Beschriftungen, die nach dem Einbau entstehen.
  const live = useRef({ t, format, engineConfig: engineConfig ?? null, onRevealed, hint, pick, onPickSupport });
  live.current = { t, format, engineConfig: engineConfig ?? null, onRevealed, hint, pick, onPickSupport };

  const ctx = useMemo<RevealContext>(
    () => ({
      get engineConfig() {
        return live.current.engineConfig;
      },
      text: (key, vars) => live.current.t(key as StringKey, vars),
      get hint() {
        return live.current.hint;
      },
      fmt: {
        mult: (bps) => `${(Number(bps ?? 0) / 10000).toFixed(2)}×`,
        sol: (lamports) => (lamports == null ? '0' : toSol(lamports)),
        won: (payout) => live.current.t('reveal.won', { amount: toSol(payout) }),
        lost: () => live.current.t('result.lost'),
        fiat: (lamports) => live.current.format(lamports),
      },
    }),
    [],
  );

  // 1. Modul laden (einmal je Engine und Seite).
  useEffect(() => {
    let alive = true;
    setMod(null);
    void loadReveal(engineKey).then((m) => {
      if (alive) setMod(m);
    });
    return () => {
      alive = false;
    };
  }, [engineKey]);

  // 2. Einbauen. Ändert sich die Geometrie (engineConfig kommt meist erst mit
  //    /api/meta), wird neu eingebaut — der Leerlauf soll die echten Maße zeigen.
  const configKey = JSON.stringify(engineConfig ?? null);
  useEffect(() => {
    const root = rootRef.current;
    if (!root || !mod) return;
    const ctl = mod.mount(root, ctx);
    ctlRef.current = ctl;
    ctl.reset();
    setMounted((n) => n + 1);
    // Kann dieses Modul bedient werden? Der Flow braucht die Antwort, BEVOR er
    // entscheidet, ob er seine Ersatz-Auswahl zeigt.
    live.current.onPickSupport?.(typeof ctl.setPick === 'function');
    return () => {
      ctlRef.current = null;
      live.current.onPickSupport?.(false); // ausgebaut ⇒ nichts ist mehr bedienbar
      ctl.destroy();
      // Nicht jedes Modul räumt seine Knoten selbst weg — der Host tut es
      // immer, sonst stapeln sich im Dev-Strict-Mode zwei Bretter übereinander.
      root.replaceChildren();
    };
    // `configKey` steht für engineConfig (Objekt-Identität wäre zu unruhig).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mod, ctx, configKey]);

  // 3. Abspielen — und melden, wenn das Endbild steht.
  useEffect(() => {
    const ctl = ctlRef.current;
    if (!ctl) return;
    if (outcome == null) {
      ctl.reset();
      return;
    }
    let settled = false;
    const notify = () => {
      if (settled) return;
      settled = true;
      live.current.onRevealed?.(outcome);
    };
    void ctl
      .play(outcome, { reducedMotion: isReducedMotion(), from })
      .then(notify)
      .catch(() => notify()); // ein Fehler in der Animation darf nichts zurückhalten
    return notify; // abgelöst oder abgebaut ⇒ das Ergebnis gilt als gezeigt
    // `motionOn` gehört dazu: Umschalten während einer Runde ist kein Grund
    // für einen Neustart, aber der nächste Flug soll die Wahl kennen — das
    // liest isReducedMotion() beim Start ohnehin frisch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outcome, from, mounted]);

  // 3b. Vorlauf. Läuft NACH dem Abspiel-Effekt: Kommen Ergebnis und Ende der
  //     Anfrage im selben Render, hat `play()` den Vorlauf schon übernommen und
  //     `disarm()` ist im Modul ein No-op.
  useEffect(() => {
    const ctl = ctlRef.current;
    if (!ctl) return;
    if (pending) ctl.arm?.({ reducedMotion: isReducedMotion() });
    else ctl.disarm?.();
  }, [pending, mounted]);

  // 3c. Rückkanal — die Felder des Bretts bedienbar machen (siehe
  //     `RevealPickOptions`). Verglichen wird eine SIGNATUR, nicht die
  //     Objekt-Identität: `pick` entsteht im Aufrufer bei jedem Render neu, und
  //     ein `setPick` je Render nähme einer Kachel Fokus und Hover.
  const pickKey = pick ? `${pick.enabled}|${pick.min}|${pick.max}|${(pick.taken ?? []).join(',')}` : '';
  useEffect(() => {
    const ctl = ctlRef.current;
    if (!ctl?.setPick) return;
    const p = live.current.pick;
    if (!p) {
      ctl.setPick(null);
      return;
    }
    ctl.setPick({
      enabled: p.enabled,
      min: p.min,
      max: p.max,
      taken: p.taken,
      // Immer der FRISCHE Handler aus dem Ref: Der Schritt-Aufruf im Aufrufer
      // hängt an Zustand, der sich zwischen zwei Auswahlen ändert. Ein beim
      // Einhängen eingefrorener Handler schickte den Zug mit altem Stand los.
      onPick: (i) => live.current.pick?.onPick(i),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickKey, mounted]);

  // 4. Sprachwechsel im Leerlauf: Beschriftungen neu zeichnen. Während einer
  //    Runde nicht — ein Neustart mitten im Flug wäre schlimmer als ein
  //    englisches Wort bis zur nächsten Runde.
  useEffect(() => {
    const ctl = ctlRef.current;
    const root = rootRef.current;
    if (ctl && root && root.dataset.state === 'idle') ctl.reset();
  }, [t]);

  void motionOn; // Abonnement hält den Schalter aktuell (siehe Kommentar oben).

  return (
    <div
      ref={rootRef}
      data-reveal={engineKey}
      className={`relative h-full w-full overflow-hidden rounded-xl bg-night ${className}`}
    />
  );
}
