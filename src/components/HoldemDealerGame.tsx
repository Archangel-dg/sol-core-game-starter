'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePlayer, useDemo } from './DemoProvider';
import type { EngineDef } from '@/lib/engines';
import { HOLDEM_DEALER_PROTOCOL, type HoldemDealerCategory, type HoldemDealerView } from '@/lib/solcore';
import { solToLamports, toSol } from '@/lib/lamports';
import { toUiError } from '@/lib/errors';
import { usePlayerAuth } from '@/lib/player-auth';
import { useBalanceFreeze } from '@/lib/balance-freeze';
import type { RoundLog } from './SingleBetGame';
import { MaxBetPick } from './BetLimitHint';
import { FiatHint } from './FiatHint';
import { useSound } from '@/lib/sounds';
import { randomHexSeed } from '@/lib/seed';
import { useT } from '@/lib/i18n';
import { RevealHost } from './RevealHost';
import { hasReveal } from '@/lib/reveal';
import { holdemDealerOutcome, holdemDealerStepCount } from '@/lib/reveal-session';
import { outcomeTone } from '@/lib/outcome';
import { anteTable, callCost, handLabelKey, holdemTable, roundMultiplierBps } from '@/lib/holdem-dealer';
import { HoldemAnteTable, HoldemTableText } from './HoldemDealerParts';

/** Woher eine Server-Antwort kommt — entscheidet über Ton und Abspielen. */
type Antwort = 'start' | 'step' | 'reconnect';

/**
 * Sicherheitsnetz des Saldo-Freeze (wie SingleBetGame): meldet die Animation
 * nie (Tab im Hintergrund, Fehler), taut der Saldo trotzdem auf — freezeUntil
 * legt 5 s obendrauf. Die längste Hold'em-Bewegung (Runde nach einem Reload
 * von vorn) braucht knapp 4 s.
 */
const REVEAL_BACKSTOP_MS = 5_000;

/**
 * ██ GESTALTUNGSZONE ██ — Hold'em gegen den Dealer (`holdem-dealer`).
 *
 * WARUM NICHT SessionGame: Der Server spielt diese Engine auf einem EIGENEN
 * Geldweg (wie Blackjack) und antwortet mit einer eigenen Form
 * (`HoldemDealerView` statt `SessionView`: kein `progress`, kein
 * `potentialPayoutLamports`, Status `active`/`settled`). Dazu kommt, was die
 * Session-Oberfläche nicht kennt: ein Handschlag beim Start, ein Zug, der
 * GELD KOSTEN kann (der Call ist eine zweite Abbuchung, 2 × Ante), und ein
 * Wiederholschutz (`schritt`) mit eigener Antwort (API-970). Dieselben Routen,
 * dieselben Bausteine (RevealHost, MaxBetPick, Demo, moneyFetch, Fehlerkatalog)
 * — aber kein dritter Zweig voller Sonderfälle in SessionGame.
 *
 * Der Ablauf: Ante setzen → „Austeilen" (Start mit `protocol`) → zwei Karten,
 * der Dealer verdeckt, der Flop → EIN Zug: Mitgehen (der Preis mit Gebühren
 * steht AUF dem Knopf, aus `kosten.call` des Servers) oder Aussteigen → der
 * Server rechnet ab, das Modul deckt auf. Kein Cashout.
 *
 * Was hier zählt:
 *  - Der Call kostet. Sein Preis steht vor dem Austeilen (2 × Ante + Gebühren)
 *    und in der Entscheidung exakt auf dem Knopf — nie ein Klick ins Ungewisse.
 *  - Nach dem Aussteigen zeigt die Oberfläche nur, was gespielt wurde: keine
 *    Karte von Turn, River oder Dealer, keine Wertung mit sieben Karten — die
 *    Hand mit dem Flop und „Ausgestiegen — Ante verloren" (Hausregel,
 *    `lib/holdem-dealer.ts`). Die Prüfseite (Verify-Link) zeigt alle neun.
 *  - Der entscheidende Zug rechnet im selben Aufruf ab. Der Saldo bleibt
 *    stehen, bis das Modul das Ergebnis zeigt (Balance-Freeze), Ton, Verlauf
 *    und Gewinnmeldung hängen an `onRevealed` (docs/RULES.md, Regel 16).
 *  - Reconnect nach Reload über localStorage + GET `/session/:id`; API-970
 *    (die Runde ist schon weiter — zweiter Tab, doppelter Klick) holt den Stand
 *    frisch und zeigt ihn.
 */
export function HoldemDealerGame({
  engine,
  gameId,
  engineConfig,
  onRound,
  onLog,
}: {
  engine: EngineDef;
  gameId: string;
  /** Aufgelöste Engine-Config vom Server (null = nicht verfügbar). */
  engineConfig?: Record<string, number> | null;
  onRound: (serverSeedHash: string, roundId: string) => void;
  onLog: (r: RoundLog) => void;
}) {
  const { wallet, connected, apiBase, demo } = usePlayer();
  const { refreshDemoBalance } = useDemo();
  // Echte Geld-Routen laufen ausschließlich über moneyFetch (Spieler-Token);
  // der Demo-Pfad (/api/demo/*) bewegt kein Geld und bleibt tokenlos.
  const { moneyFetch } = usePlayerAuth();
  const { freezeUntil, release } = useBalanceFreeze();
  const t = useT();
  const { play } = useSound();
  const [bet, setBet] = useState('0.01');
  const [view, setView] = useState<HoldemDealerView | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const storeKey = `sc_session_${gameId}${demo ? '_demo' : ''}`;
  const sess = engine.session!;
  const decision = sess.step.kind === 'decision' ? sess.step : null;
  const actionLabel = (value: string) => decision?.actions.find((a) => a.value === value)?.label;
  const cfg = view?.engine?.config ?? engineConfig ?? null;

  const finishIfEnded = useCallback(
    (v: HoldemDealerView) => {
      if (v.status !== 'settled') return;
      localStorage.removeItem(storeKey);
      if (demo) void refreshDemoBalance();
      if (v.roundId) {
        onRound(v.proof.serverSeedHash, v.roundId);
        onLog({
          // Gesamteinsatz der Runde (Ante, nach einem Call Ante + Call).
          betLamports: v.einsatzSummeLamports,
          // Netto entscheidet (lib/outcome.ts): gegen Ante + Call + Gebühren.
          win: outcomeTone(v.payoutLamports ?? '0', v.belastungSummeLamports) === 'win',
          multiplierBps: roundMultiplierBps(v),
          payoutLamports: v.payoutLamports ?? '0',
          roundId: v.roundId,
        });
      }
    },
    [demo, onLog, onRound, refreshDemoBalance, storeKey],
  );

  // ── Reveal-Gating (docs/RULES.md, Regel 16.4) — wie SessionGame ───────────
  // Die Antwort des Servers wird NICHT sofort angezeigt: `pending` hält sie, das
  // Modul spielt den neuen Schritt ab (`from`), erst `onRevealed` schaltet
  // Statuszeile, Tabelle, Ton, Verlauf und Saldo frei.
  const animated = hasReveal(engine.key);
  const [revealing, setRevealing] = useState(false);
  const [reveal, setReveal] = useState<{ outcome: unknown; from: number } | null>(null);
  const pending = useRef<{ view: HoldemDealerView; outcome: unknown; kind: Antwort } | null>(null);
  const sfx = (v: HoldemDealerView) => {
    if (v.status !== 'settled') return;
    // Netto entscheidet: Gewinnton nur über Ante + Call + Gebühren; der
    // Gleichstand (beide Einsätze zurück) bekommt einen leisen Klick.
    const tone = outcomeTone(v.payoutLamports ?? '0', v.belastungSummeLamports);
    if (tone === 'win') play('win');
    else play(tone === 'partial' ? 'click' : 'lose');
  };
  const deliver = (v: HoldemDealerView, kind: Antwort) => {
    if (!animated) {
      if (kind !== 'reconnect') sfx(v);
      setView(v);
      finishIfEnded(v);
      if (kind === 'step') release();
      return;
    }
    const outcome = holdemDealerOutcome(v);
    if (kind === 'reconnect') {
      // Nach einem Reload steht der Stand sofort; das Modul spielt die Runde nach
      // — aber nur, wenn das Brett diese Runde noch nicht zeigt.
      pending.current = null;
      setView(v);
      finishIfEnded(v);
      if (view?.sessionId !== v.sessionId) setReveal({ outcome, from: 0 });
      return;
    }
    pending.current = { view: v, outcome, kind };
    setRevealing(true);
    // `from`: so viele Schritte dieser Runde stehen schon auf dem Brett — nur das Neue bewegt sich.
    setReveal({ outcome, from: view?.sessionId === v.sessionId ? holdemDealerStepCount(view) : 0 });
  };
  const deliverRef = useRef(deliver);
  deliverRef.current = deliver;
  const onRevealed = (outcome: unknown) => {
    const p = pending.current;
    if (!p || p.outcome !== outcome) return; // abgelöst oder schon geliefert
    pending.current = null;
    setRevealing(false);
    setView(p.view);
    sfx(p.view);
    finishIfEnded(p.view);
    if (p.kind === 'step') release();
  };

  // Reconnect: offene (oder gerade fertig gewordene) Runde nach einem Reload
  // fortsetzen — EINMAL je Spiel und Modus.
  useEffect(() => {
    const id = typeof window !== 'undefined' ? localStorage.getItem(storeKey) : null;
    if (!id) return;
    fetch(`${apiBase}/session/${id}`)
      .then((r) => r.json())
      .then((v: HoldemDealerView & { error?: unknown }) => {
        if (!v.error && v.sessionId && v.protocol === HOLDEM_DEALER_PROTOCOL) deliverRef.current(v, 'reconnect');
        else localStorage.removeItem(storeKey);
      })
      .catch(() => localStorage.removeItem(storeKey));
    // `deliverRef` trägt den jeweils aktuellen Flow — der Effekt braucht keine weiteren Deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeKey]);

  const call = async (path: string, body?: unknown): Promise<{ view: HoldemDealerView } | { code: string }> => {
    setBusy(true);
    setError(null);
    try {
      const r = demo
        ? await fetch(path, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: body ? JSON.stringify(body) : undefined,
          }).then((x) => x.json())
        : await moneyFetch(path, body);
      if (r.error) {
        const details = r.error.details as Record<string, unknown> | undefined;
        // Die eigene Route reicht `reason` neben dem Code durch (nicht in `details`).
        const reason =
          typeof r.error.reason === 'string' ? r.error.reason : typeof details?.reason === 'string' ? details.reason : undefined;
        const ui = toUiError(r.error.code, r.error.message, reason, details);
        setError(`${ui.code}: ${ui.message}`);
        play('error');
        return { code: typeof r.error.code === 'string' ? r.error.code : 'ERR' };
      }
      return { view: r as HoldemDealerView };
    } catch (e) {
      setError((e as Error).message);
      play('error');
      return { code: 'ERR' };
    } finally {
      setBusy(false);
    }
  };

  const start = async () => {
    if (!wallet) return;
    let ante: bigint;
    try {
      ante = solToLamports(bet);
    } catch (e) {
      setError((e as Error).message);
      return;
    }
    play('bet');
    const res = await call(`${apiBase}/session/start`, {
      playerWallet: wallet,
      betLamports: ante.toString(),
      clientSeed: randomHexSeed(),
      // Handschlag: der Call-Preis steht vor dem Austeilen am Feld und in der Entscheidung auf dem Knopf.
      protocol: HOLDEM_DEALER_PROTOCOL,
    });
    if ('view' in res) {
      localStorage.setItem(storeKey, res.view.sessionId);
      deliver(res.view, 'start');
    }
  };

  /** Den Stand frisch holen und zeigen (nach API-970: die Runde ist schon weiter). */
  const refresh = async (id: string) => {
    try {
      const v = (await fetch(`${apiBase}/session/${id}`).then((r) => r.json())) as HoldemDealerView & { error?: unknown };
      if (v.error || v.sessionId !== id) return;
      if (v.status === 'settled') freezeUntil(Date.now() + REVEAL_BACKSTOP_MS);
      deliver(v, 'step');
    } catch {
      // Die Meldung steht; spätestens der nächste Reload zeigt den Tisch.
    }
  };

  /** Der eine Zug. Er rechnet die Runde ab — der Call bucht dabei 2 × Ante (+ Gebühren). */
  const decide = async (action: string) => {
    if (!view || view.status !== 'active') return;
    play('click');
    // Im selben Aufruf bucht der Server den Call und die Auszahlung — der Saldo
    // bleibt stehen, bis das Modul zeigt, wie die Hand ausging.
    freezeUntil(Date.now() + REVEAL_BACKSTOP_MS);
    const id = view.sessionId;
    const res = await call(`${apiBase}/session/${id}/step`, sess.buildStep({ action, schritt: view.schritt }));
    if ('view' in res) {
      deliver(res.view, 'step');
      return;
    }
    release();
    // API-970 trägt den aktuellen Stand in `details.runde` — die eigene Route reicht
    // ihn nicht durch, darum holt ihn GET `/session/:id` („hier ist der aktuelle Tisch").
    if (res.code === 'API-970') await refresh(id);
  };

  const active = view?.status === 'active';
  const ended = view?.status === 'settled';
  const table = holdemTable(view);
  const rows = anteTable(cfg);
  const cost = active ? callCost(view) : null;
  const canCall = !!active && view.erlaubt?.includes('call') === true;
  // Ein offener, womöglich schon bezahlter Call geht beim nächsten Zug vor (der
  // Server führt ihn aus) — Aussteigen wäre dann ein Knopf, der etwas anderes tut,
  // als er sagt.
  const canFold = !!active && view.erlaubt?.includes('fold') === true && view.zugOffen !== true;
  // Was 2 × Ante vor dem Austeilen kostet — aus dem Feld, ohne Gebühren (die
  // nennt der Server in der Entscheidung exakt).
  const callPreview = (() => {
    try {
      const a = solToLamports(bet);
      return a > 0n ? toSol(a * 2n, 9) : null;
    } catch {
      return null;
    }
  })();
  // Hervorgehoben in der Tabelle: in der Entscheidung die Hand mit dem Flop,
  // nach einem Call die Hand, nach der das Ante gezahlt hat. Nach dem Aussteigen
  // nichts (die Wertung des Servers zählt Turn und River mit).
  const tableHighlight = active
    ? (table?.flopHand ?? null)
    : ended && table?.action === 'call' && table.anteWinBps > 0
      ? table.playerHand
      : null;
  const handText = (cat: HoldemDealerCategory | null | undefined) => (cat ? t(handLabelKey(cat)) : '');

  // Statuszeile — `view` wird erst nach `onRevealed` gesetzt, sie verrät also nichts vorab.
  // Mit Modul sagt das Brett in der Entscheidung schon alles; dann bleibt sie leer.
  const statusMain =
    !view || !table
      ? ''
      : active
        ? animated
          ? ''
          : `${t('session.hd.yourHand', { hand: handText(table.flopHand) })} · ${t('reveal.holdem.decide')}`
        : table.action === 'call'
          ? `${t('session.hd.vs', { player: handText(table.playerHand), dealer: handText(table.dealerHand) })}${
              table.dealerQualified === false ? ` · ${t('reveal.holdem.result.noQualify')}` : ''
            } · ${(roundMultiplierBps(view) / 10000).toFixed(2)}× · ${
              view.payoutLamports && view.payoutLamports !== '0'
                ? t('session.hd.paid', { amount: toSol(view.payoutLamports) })
                : t('result.lost')
            }`
          : table.action === 'fold'
            ? `${t('reveal.holdem.folded')} · ${t('session.hd.yourHand', { hand: handText(table.flopHand) })}`
            : view.payoutLamports && view.payoutLamports !== '0'
              ? t('session.hd.paid', { amount: toSol(view.payoutLamports) })
              : t('result.lost');
  const statusLine =
    view && (statusMain || (ended && (table?.timedOut || view.capped || view.gehalten))) ? (
      <>
        {statusMain && <div className="mt-1 text-sm text-white/70">{statusMain}</div>}
        {ended && table?.timedOut && <div className="mt-1 text-[11px] text-amber-300/80">{t('session.hd.timedOut')}</div>}
        {ended && view.capped && <div className="text-xs text-white/40">{t('session.payoutLimit')}</div>}
        {ended && view.gehalten && <div className="mt-1 text-[11px] text-amber-300/80">{t('session.hd.held')}</div>}
      </>
    ) : null;

  return (
    <div className="sc-shell flex flex-col gap-4">
      {/* Spielfeld — nur Animation und Ergebnis, die Bedienung steht darunter
          (wie SessionGame: `sc-board` deckelt die Höhe am Telefon). */}
      <div className="sc-board mx-auto grid aspect-square w-full rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div
          className={
            animated
              ? 'h-full w-full overflow-hidden rounded-xl bg-night'
              : 'grid h-full place-items-center overflow-auto rounded-xl bg-night px-2 py-3 text-center'
          }
        >
          {animated ? (
            // Das Reveal-Modul (src/reveals/holdem-dealer.js): Austeilen, dann die
            // Entscheidung; das Ergebnis steht erst am Ende — nach dem Aussteigen
            // nur, was gespielt wurde.
            <RevealHost
              engineKey={engine.key}
              engineConfig={cfg as Record<string, unknown> | null}
              outcome={reveal?.outcome ?? null}
              from={reveal?.from}
              onRevealed={onRevealed}
              hint={t(engine.blurb)}
            />
          ) : view && table ? (
            <div className="w-full">
              <HoldemTableText table={table} />
              <div className="mt-3">{statusLine}</div>
            </div>
          ) : (
            <div className="px-4">
              <p className="text-white/40">{t(engine.blurb)}</p>
              <p className="mt-2 text-xs text-white/30">
                {t(engine.playerFacts.inputs)} {t(engine.playerFacts.outcomes)}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Bedienfeld — Ante, die eine Entscheidung. `sc-controls` klebt auf
          schmalen Schirmen unten, damit Mitgehen/Aussteigen ohne Scrollen
          erreichbar bleiben. */}
      <div className="sc-controls relative rounded-2xl border border-white/10 bg-night p-5">
        {animated && statusLine && <div className="mb-3 text-center text-sm text-white/70">{statusLine}</div>}
        {!active ? (
          // Start-Ansicht (auch nach der Runde)
          <>
            {rows && (
              <div className="mb-3">
                <HoldemAnteTable rows={rows} current={tableHighlight} final={!!ended} rules />
              </div>
            )}
            <label className="block text-xs text-white/50">
              {/* Hoechsteinsatz AM Feld (Systemvertrag — nie entfernen). Er gilt dem Ante. */}
              <span className="flex items-baseline justify-between gap-2">
                <span className="min-w-0 truncate">
                  {t('session.hd.ante')} <FiatHint sol={bet} />
                </span>
                <MaxBetPick onPick={setBet} />
              </span>
              <input
                value={bet}
                onChange={(e) => setBet(e.target.value)}
                inputMode="decimal"
                className="mt-1 w-full rounded-lg border border-white/10 bg-night px-3 py-2 tabular-nums text-white outline-none focus:border-accent/50"
              />
            </label>
            {/* Anzeigepflicht VOR dem Austeilen: der Call ist ein zweiter Einsatz.
                Daran hängt der Handschlag beim Start (check:contract, Abschnitt 8b). */}
            <p className="mt-2 rounded-lg border border-white/10 bg-white/[0.03] p-2.5 text-[11px] leading-relaxed text-white/60">
              {callPreview
                ? t('session.hd.callCostsNote', { amount: callPreview })
                : t('session.hd.callCostsGeneric')}
            </p>
            <button
              type="button"
              onClick={() => void start()}
              disabled={busy || revealing || !connected}
              className="mt-4 w-full rounded-xl bg-gradient-to-r from-accent to-accent-soft py-3 font-semibold text-night disabled:opacity-40"
            >
              {!connected ? t('common.connectWallet') : busy ? t('bet.running') : t('session.hd.deal')}
            </button>
          </>
        ) : (
          // Die Entscheidung: zwei Knöpfe, der Preis des Calls steht AUF dem Knopf.
          <div className="space-y-3">
            {rows && <HoldemAnteTable rows={rows} current={tableHighlight} />}
            {view.zugOffen && <p className="text-[11px] leading-snug text-amber-300/80">{t('session.hd.pendingCall')}</p>}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={busy || revealing || !canCall}
                onClick={() => void decide('call')}
                className="rounded-xl bg-gradient-to-r from-accent to-accent-soft px-2 py-2.5 font-semibold text-night disabled:opacity-40"
              >
                <span className="block">{busy ? t('bet.running') : t(actionLabel('call') ?? 'engine.holdem-dealer.call')}</span>
                {cost && (
                  <span className="block text-xs font-normal opacity-80">
                    {t('session.hd.callFor', { amount: toSol(cost.total, 9) })}
                  </span>
                )}
              </button>
              <button
                type="button"
                disabled={busy || revealing || !canFold}
                onClick={() => void decide('fold')}
                className="rounded-xl border border-white/15 px-2 py-2.5 text-sm disabled:opacity-40"
              >
                <span className="block">{t(actionLabel('fold') ?? 'engine.holdem-dealer.fold')}</span>
                <span className="block text-xs opacity-60">{t('session.hd.foldNote')}</span>
              </button>
            </div>
            {cost && (
              <p className="text-[10px] leading-snug text-white/40">
                {t('session.hd.callBreakdown', { stake: toSol(cost.stake, 9), total: toSol(cost.total, 9) })}
              </p>
            )}
            <p className="text-[10px] leading-snug text-white/35">{t('session.hd.idleWarn')}</p>
          </div>
        )}

        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      </div>
    </div>
  );
}
