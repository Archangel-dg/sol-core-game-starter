'use client';
import { useT } from '@/lib/i18n';

// Design-Zone: Roulette-Tableau für BEIDE Varianten.
// - Easy (config.betMode fehlt/easy): Einfachauswahl EINER klassischen Wette.
// - Pro  (engineConfig.proBetsEnabled === 1): Mehrfachauswahl inkl. der
//   Innen-Wetten AUF DEN LINIEN (Split, Street, Ecke, Doppelstraße, Basket) —
//   SingleBetGame verteilt den Gesamteinsatz gleichmäßig (Σ = bet).
// KEIN Client-seitiges Auszahlen/Würfeln — nur Auswahl; der Server entscheidet.
//
// `value` ist bei Innen-Wetten ein LAYOUT-INDEX in die serverseitigen Tabellen
// (docs/ENGINES.md → „Roulette betType"). Die Index-Formeln unten spiegeln
// `rouletteInsideTable()` des Servers exakt:
//   Tableau-Reihe r = 0..11 trägt 3r+1, 3r+2, 3r+3; c = Position darin (0..2).
//   split  (in der Reihe)     idx = 2r + c        , c ∈ {0,1}
//   split  (zwischen Reihen)  idx = 24 + 3r + c   , r ≤ 10
//   street                    idx = r             , 12 Reihen
//   corner                    idx = 2r + c        , r ≤ 10, c ∈ {0,1}
//   six-line                  idx = r             , r ≤ 10
//   danach folgen je Wettart die Null-Wetten (rad-abhängig) — siehe ZERO_BETS.
// Visuell liegt Reihe r als SPALTE (klassisches Tableau): c=2 oben, c=0 unten.

export interface RouletteSpot {
  betType: string;
  value?: number;
}

/** Stabiler Schlüssel je Wettfeld (betType + value). */
export function spotKey(s: RouletteSpot): string {
  return `${s.betType}:${s.value ?? ''}`;
}

const OUTSIDE: { betType: string; label: string }[] = [
  { betType: 'red', label: 'Rot' },
  { betType: 'black', label: 'Schwarz' },
  { betType: 'odd', label: 'Ungerade' },
  { betType: 'even', label: 'Gerade' },
  { betType: 'low', label: '1–18' },
  { betType: 'high', label: '19–36' },
];

const GROUPS: { betType: string; value: number; label: string }[] = [
  { betType: 'dozen', value: 1, label: '1. Dutzend' },
  { betType: 'dozen', value: 2, label: '2. Dutzend' },
  { betType: 'dozen', value: 3, label: '3. Dutzend' },
  { betType: 'column', value: 1, label: 'Kolonne 1' },
  { betType: 'column', value: 2, label: 'Kolonne 2' },
  { betType: 'column', value: 3, label: 'Kolonne 3' },
];

const RED = new Set([
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
]);

/** Anzahl reiner Raster-Splits vor den Null-Splits (24 in-Reihe + 33 zwischen). */
const GRID_SPLITS = 57;
/** Anzahl regulärer Streets vor den Null-Trios. */
const GRID_STREETS = 12;

/**
 * Null-berührende Wetten. Ihre Geometrie unterscheidet sich je Rad, daher als
 * beschriftete Gruppe statt als Linien-Punkte — Reihenfolge und Indizes
 * spiegeln `rouletteZeroSplits()` / `rouletteZeroStreets()` des Servers.
 */
function zeroBets(pocketCount: number): { betType: string; value: number; label: string }[] {
  const out: { betType: string; value: number; label: string }[] = [];
  const splits =
    pocketCount === 38
      ? ['0/1', '0/2', '0/00', '00/2', '00/3']
      : ['0/1', '0/2', '0/3'];
  splits.forEach((label, i) => out.push({ betType: 'split', value: GRID_SPLITS + i, label }));

  const trios = pocketCount === 38 ? ['0-1-2', '0-00-2', '00-2-3'] : ['0-1-2', '0-2-3'];
  trios.forEach((label, i) => out.push({ betType: 'street', value: GRID_STREETS + i, label }));

  // Basket 0-1-2-3 gibt es nur am europäischen Rad.
  if (pocketCount !== 38) out.push({ betType: 'basket', value: 0, label: '0-1-2-3' });
  return out;
}

export function RouletteBoard({
  pro,
  pocketCount,
  selected,
  onToggle,
}: {
  pro: boolean;
  pocketCount: number;
  selected: Set<string>;
  onToggle: (spot: RouletteSpot) => void;
}) {
  const t = useT();
  const hasDoubleZero = pocketCount >= 38;
  const isOn = (s: RouletteSpot) => selected.has(spotKey(s));

  const numberCls = (active: boolean, tone: 'green' | 'red' | 'black') => {
    if (active) return 'bg-accent text-night font-bold';
    if (tone === 'green') return 'bg-emerald-700/70 text-white';
    if (tone === 'red') return 'bg-red-700/70 text-white';
    return 'bg-white/10 text-white';
  };

  const chipCls = (active: boolean, tone: 'red' | 'black' | 'neutral') => {
    if (active) return 'rounded-md px-2 py-1.5 text-xs font-semibold bg-accent text-night';
    const base = 'rounded-md px-2 py-1.5 text-xs font-medium transition-colors hover:brightness-125 ';
    if (tone === 'red') return base + 'bg-red-700/70 text-white';
    if (tone === 'black') return base + 'bg-white/10 text-white';
    return base + 'bg-night text-white/80 ring-1 ring-white/10';
  };

  /** Setz-Punkt auf einer Linie (nur PRO). Kleiner Punkt, großzügige Trefferfläche. */
  const dot = (spot: RouletteSpot, label: string, pos: string) => (
    <button
      type="button"
      key={`${spotKey(spot)}@${pos}`}
      title={label}
      aria-label={label}
      className={
        `absolute z-10 grid h-4 w-4 place-items-center rounded-full transition-colors ${pos} ` +
        (isOn(spot)
          ? 'bg-accent ring-2 ring-night'
          : 'bg-white/20 hover:bg-accent/70 focus-visible:bg-accent/70')
      }
      onClick={() => onToggle(spot)}
    >
      <span className="sr-only">{label}</span>
    </button>
  );

  /** Eine Zahl des 1..36-Rasters samt ihrer Linien-Punkte. */
  const numberCell = (r: number, c: number) => {
    const n = 3 * r + 1 + c;
    const straight: RouletteSpot = { betType: 'straight', value: n };
    return (
      <div key={`cell-${n}`} className="relative">
        <button
          type="button"
          className={`w-full rounded-md px-1 py-2 text-xs tabular-nums transition-colors hover:brightness-125 ${numberCls(
            isOn(straight),
            RED.has(n) ? 'red' : 'black',
          )}`}
          onClick={() => onToggle(straight)}
        >
          {n}
        </button>

        {pro && (
          <>
            {/* Rechte Kante: Split zur nächsten Reihe (n / n+3). */}
            {r <= 10 &&
              dot(
                { betType: 'split', value: 24 + 3 * r + c },
                `Split ${n}/${n + 3} · 18×`,
                '-right-2 top-1/2 -translate-y-1/2',
              )}

            {/* Untere Kante: c ≥ 1 → Split innerhalb der Reihe; c = 0 → Street. */}
            {c >= 1
              ? dot(
                  { betType: 'split', value: 2 * r + (c - 1) },
                  `Split ${n - 1}/${n} · 18×`,
                  '-bottom-2 left-1/2 -translate-x-1/2',
                )
              : dot(
                  { betType: 'street', value: r },
                  `Street ${3 * r + 1}-${3 * r + 2}-${3 * r + 3} · 12×`,
                  '-bottom-2 left-1/2 -translate-x-1/2',
                )}

            {/* Untere rechte Ecke: c ≥ 1 → Ecke (2×2); c = 0 → Doppelstraße. */}
            {r <= 10 &&
              (c >= 1
                ? dot(
                    { betType: 'corner', value: 2 * r + (c - 1) },
                    `Ecke ${n - 1}/${n}/${n + 2}/${n + 3} · 9×`,
                    '-bottom-2 -right-2',
                  )
                : dot(
                    { betType: 'six-line', value: r },
                    t('roulette.doubleStreet', { from: 3 * r + 1, to: 3 * r + 6 }),
                    '-bottom-2 -right-2',
                  ))}
          </>
        )}
      </div>
    );
  };

  const zeros = zeroBets(pocketCount);

  return (
    <div className="space-y-3">
      <p className="text-xs text-white/50">
        {t(pro ? 'roulette.pickMany' : 'roulette.pickOne')}
      </p>

      {/* Klassisches Tableau: 0 (+00) links, daneben 12 Reihen × 3 Zahlen.
          Scrollt waagerecht, damit Zahlen und Linien-Punkte auf dem Handy
          groß genug bleiben. */}
      <div className="overflow-x-auto pb-3">
        <div className="grid min-w-[36rem] grid-cols-[2.2rem_repeat(12,minmax(0,1fr))] grid-rows-3 gap-1">
          {/* Null-Spalte */}
          {hasDoubleZero ? (
            <>
              <button
                type="button"
                className={`row-span-2 rounded-md px-1 text-xs tabular-nums transition-colors hover:brightness-125 ${numberCls(
                  isOn({ betType: 'straight', value: 0 }),
                  'green',
                )}`}
                onClick={() => onToggle({ betType: 'straight', value: 0 })}
              >
                0
              </button>
              <button
                type="button"
                className={`rounded-md px-1 text-xs tabular-nums transition-colors hover:brightness-125 ${numberCls(
                  isOn({ betType: 'straight', value: 37 }),
                  'green',
                )}`}
                onClick={() => onToggle({ betType: 'straight', value: 37 })}
              >
                00
              </button>
            </>
          ) : (
            <button
              type="button"
              className={`row-span-3 rounded-md px-1 text-xs tabular-nums transition-colors hover:brightness-125 ${numberCls(
                isOn({ betType: 'straight', value: 0 }),
                'green',
              )}`}
              onClick={() => onToggle({ betType: 'straight', value: 0 })}
            >
              0
            </button>
          )}

          {/* Zahlen: obere Sichtzeile = c 2, untere = c 0 (klassische Anordnung). */}
          {[2, 1, 0].map((c) =>
            Array.from({ length: 12 }, (_, r) => numberCell(r, c)),
          )}
        </div>
      </div>

      {/* Null-Wetten: Geometrie unterscheidet sich je Rad → beschriftet. */}
      {pro && zeros.length > 0 && (
        <div>
          <p className="mb-1 text-[11px] uppercase tracking-wide text-white/40">{t('roulette.zeroBets')}</p>
          <div className="flex flex-wrap gap-1">
            {zeros.map((z) => (
              <button
                type="button"
                key={spotKey(z)}
                className={chipCls(isOn(z), 'neutral')}
                onClick={() => onToggle({ betType: z.betType, value: z.value })}
              >
                {z.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Dutzend / Kolonne (3× zahlt) */}
      <div className="grid grid-cols-3 gap-1">
        {GROUPS.map((g) => (
          <button
            type="button"
            key={`${g.betType}:${g.value}`}
            className={chipCls(isOn(g), 'neutral')}
            onClick={() => onToggle({ betType: g.betType, value: g.value })}
          >
            {g.label}
          </button>
        ))}
      </div>

      {/* Einfache Chancen (2× zahlt) */}
      <div className="grid grid-cols-3 gap-1 sm:grid-cols-6">
        {OUTSIDE.map((o) => (
          <button
            type="button"
            key={o.betType}
            className={chipCls(
              isOn(o),
              o.betType === 'red' ? 'red' : o.betType === 'black' ? 'black' : 'neutral',
            )}
            onClick={() => onToggle({ betType: o.betType })}
          >
            {o.label}
          </button>
        ))}
      </div>

      {pro && (
        <p className="text-[11px] text-white/40">
          {t('roulette.payouts')}
        </p>
      )}
      {pro && selected.size > 0 && (
        <p className="text-[11px] text-white/40">{selected.size} Chip(s) gewählt.</p>
      )}
    </div>
  );
}
