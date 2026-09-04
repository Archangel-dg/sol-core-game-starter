'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useT } from '@/lib/i18n';
import type { StringKey } from '@/lib/strings';
import { toSol } from '@/lib/lamports';
import { useFiat } from '@/lib/fiat';
import { isReducedMotion, useMotion } from '@/lib/motion';
import { loadReveal, type RevealContext, type RevealController, type RevealModule } from '@/lib/reveal';

/**
 * ██ GESTALTUNGSZONE ██ — hängt das Reveal-Modul einer Engine ins Spielfeld.
 *
 * Der Host tut vier Dinge, und nur die:
 *  1. lädt das Modul der Engine (`lib/reveal.ts`) und zeichnet den Leerlauf
 *     aus `engineConfig`;
 *  2. spielt jedes neue `outcome` ab (Objekt-Identität — jede Runde ist ein
 *     neues Objekt) und setzt bei `null` auf den Leerlauf zurück;
 *  3. meldet `onRevealed(outcome)` EINMAL, sobald das Endbild steht — daran
 *     hängt der Aufrufer alles, was den Ausgang verrät;
 *  4. reicht Sprache, Formatierer und den Animations-Schalter hinein.
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
  /** Einmal je Ergebnis, sobald das Endbild steht. */
  onRevealed?: (outcome: unknown) => void;
  /** Übersetzte Kurzbeschreibung der Engine für den Leerlauf (siehe RevealContext.hint). */
  hint?: string | null;
  className?: string;
}

export function RevealHost({ engineKey, engineConfig, outcome, from, onRevealed, hint = null, className = '' }: RevealHostProps) {
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
  const live = useRef({ t, format, engineConfig: engineConfig ?? null, onRevealed, hint });
  live.current = { t, format, engineConfig: engineConfig ?? null, onRevealed, hint };

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
    return () => {
      ctlRef.current = null;
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
