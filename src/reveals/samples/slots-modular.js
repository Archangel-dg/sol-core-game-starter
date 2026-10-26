const PAYLINES = [
  [1, 1, 1, 1, 1], [0, 0, 0, 0, 0], [2, 2, 2, 2, 2], [0, 1, 2, 1, 0], [2, 1, 0, 1, 2],
  [0, 0, 1, 0, 0], [2, 2, 1, 2, 2], [1, 0, 0, 0, 1], [1, 2, 2, 2, 1], [1, 0, 1, 0, 1],
  [1, 2, 1, 2, 1], [0, 1, 0, 1, 0], [2, 1, 2, 1, 2], [1, 1, 0, 1, 1], [1, 1, 2, 1, 1],
  [0, 1, 1, 1, 0], [2, 1, 1, 1, 2], [0, 2, 0, 2, 0], [2, 0, 2, 0, 2], [0, 2, 2, 2, 0],
];
const sym = (id, wild, scatter, paysBps) => ({ id, wild, scatter, paysBps });
const SYMBOLS = [
  sym('ace', 0, 0, [8000, 30000, 100000]), sym('king', 0, 0, [6000, 20000, 60000]),
  sym('queen', 0, 0, [4000, 12000, 40000]), sym('jack', 0, 0, [3000, 8000, 25000]),
  sym('ten', 0, 0, [2000, 5000, 15000]), sym('nine', 0, 0, [2000, 4000, 12000]),
  sym('wild', 1, 0, [0, 0, 0]), sym('scatter', 0, 1, [0, 0, 0]),
];
const cfg = (lineCount) => ({ reels: 5, rows: 3, lineCount, symbols: SYMBOLS, paylines: PAYLINES.slice(0, lineCount), scatterPaysBps: [20000, 50000, 200000] });
const sample = (name, lineCount, grid, lineWins, scatterCount, scatterPayBps, betLamports) => {
  const multiplierBps = lineWins.reduce((a, w) => a + w.payBps, 0) + scatterPayBps;
  const payoutLamports = ((BigInt(betLamports) * BigInt(multiplierBps)) / 10000n).toString();
  return { name, outcome: { win: multiplierBps > 0, multiplierBps, payoutLamports, roll: null, betLamports, engineConfig: cfg(lineCount), details: { grid, lineWins, scatterCount, scatterPayBps } } };
};

// ── Die Optik, die die Slot-Lab mitgibt (08.09.2026): reine Dekoration, hier in
//    ihrer vollen Form, damit der Prüfstand sie mit abspielt. ──────────────────
const PRESENTATION = {
  physics: {
    style: 'video', mode: 'reel',
    start: { pullback: 0.3, staggerMs: 60 },
    run: { direction: 'down', speed: 20, minSecs: 0.6, blur: true },
    stop: { order: 'ltr', staggerMs: 160, brake: 'soft', bounce: 0.4 },
    tension: { enabled: true, extraSecs: 1.2 },
  },
  animation: {
    style: 'standard',
    win: { lines: 'trace', cycle: true, symbols: 'pulse', countUp: true, toast: true },
    tiers: {
      big: { fromX: 2, notice: 'banner', secs: 2, particles: false, shake: false },
      mega: { fromX: 5, notice: 'banner', secs: 3, particles: true, shake: false },
      epic: { fromX: 9, notice: 'fullscreen', secs: 4, particles: true, shake: true },
    },
    feature: { start: 'banner', retrigger: 'toast', end: 'banner' },
  },
};

// Liniennummern neben den Walzen (Slot-Lab-Darstellung, 26.10.2026) — ab Werk aus, hier an.
const PRESENTATION_BADGES = { ...PRESENTATION, display: { lineBadges: true } };
const cfgBadges = { ...cfg(20), presentation: PRESENTATION_BADGES };
const mitLook = (s, engineConfig) => ({ ...s, outcome: { ...s.outcome, engineConfig } });

// 6×4-Raster mit All Ways — das Modul zeichnet, was die Config sagt (nicht 5×3).
const SYM6 = SYMBOLS;
const cfg64 = {
  reels: 6, rows: 4, lineCount: 0, winType: 'ways', ways: 4096, symbols: SYM6,
  paylines: [], scatterPaysBps: [20000, 50000, 200000], presentation: PRESENTATION,
};
const grid64 = [
  ['ace', 'king', 'queen', 'jack'], ['ace', 'ten', 'nine', 'king'], ['ace', 'queen', 'jack', 'ten'],
  ['nine', 'king', 'queen', 'jack'], ['ten', 'nine', 'ace', 'king'], ['queen', 'jack', 'ten', 'nine'],
];

// 5×3 mit Free-Spin-Kette — das Modul spielt jeden Feature-Schritt ab.
const cfgFs = { ...cfg(20), presentation: PRESENTATION, freeSpins: { triggerScatterCount: 3, spinsAwarded: [5, 8, 12], multiplierBps: 20000, retrigger: 0, maxTotalSpins: 15 } };
const fsGrid = (a, b) => [[a, 'king', 'ten'], [a, b, 'nine'], [a, 'queen', 'jack'], ['ten', b, 'nine'], ['jack', 'nine', a]];

// Walzenstreifen (engineVersion 2, 08.09.2026): die Walze IST eine feste Folge.
// Streifen 0 traegt vier 'ace' hintereinander — ein Stapel, der die ganze
// Walze fuellt. Das Modul dreht diesen Streifen sichtbar mit.
const STRIP_SYMS = SYMBOLS;
const A = 0, K = 1, Q = 2, J = 3, T = 4, N = 5, WI = 6, SCA = 7;
const cfgStrips = {
  engineVersion: 2, reels: 5, rows: 3, lineCount: 20, symbols: STRIP_SYMS,
  paylines: PAYLINES.slice(0, 20), scatterPaysBps: [20000, 50000, 200000],
  strips: [
    [A, A, A, A, K, Q, J, T, N, SCA, K, Q, J, T, N, WI],
    [K, Q, A, J, T, N, WI, K, Q, J, SCA, T, N, A, Q, J],
    [Q, J, T, A, N, K, Q, WI, J, T, N, SCA, A, K, Q, T],
    [J, T, N, K, A, Q, J, T, WI, N, K, Q, SCA, A, J, N],
    [T, N, K, Q, J, A, T, N, K, WI, Q, J, T, SCA, A, K],
  ],
  presentation: PRESENTATION,
};
// Stopp-Position 0 auf Walze 0 zeigt drei Asse — der Stapel im Bild.
const gridStrips = [
  ['ace', 'ace', 'ace'], ['king', 'queen', 'ace'], ['queen', 'jack', 'ten'],
  ['jack', 'ten', 'nine'], ['ten', 'nine', 'king'],
];

// Bonus-Symbol (08.09.2026): der Scatter zahlt, das Bonus loest aus. Beide
// stehen im Raster — im Bild leuchten die BONUS-Zellen, weil das Feature lief.
const SYM_BONUS = [...SYMBOLS, sym('crown', 0, 0, [0, 0, 0])];
SYM_BONUS[SYM_BONUS.length - 1].bonus = 1;
const cfgBonus = {
  engineVersion: 1, reels: 5, rows: 3, lineCount: 20, symbols: SYM_BONUS,
  paylines: PAYLINES.slice(0, 20), scatterPaysBps: [20000, 50000, 200000],
  presentation: PRESENTATION,
  freeSpins: { triggerScatterCount: 3, spinsAwarded: [5, 8, 12], multiplierBps: 10000, retrigger: 0, maxTotalSpins: 15 },
};
const gridBonus = [
  ['crown', 'king', 'ten'], ['ace', 'crown', 'nine'], ['queen', 'jack', 'crown'],
  ['ten', 'scatter', 'nine'], ['jack', 'nine', 'ace'],
];

// Hold & Spin (08.09.2026): die Ausloeser werden zu MUENZEN, die gehaltenen
// Muenzen stehen still, waehrend die freien Walzen weiterdrehen. Zellen zaehlen
// Walze*Reihen + Reihe: 0 = Walze 1 oben, 5 = Walze 2 unten, 9 = Walze 4 oben.
const cfgHold = {
  engineVersion: 1, reels: 5, rows: 3, lineCount: 20, symbols: SYMBOLS,
  paylines: PAYLINES.slice(0, 20), scatterPaysBps: [0, 0, 0], presentation: PRESENTATION,
  holdAndSpin: { triggerCount: 3, respinsPerReset: 3, respinCoinProbBps: 900, coinValuesBps: [5000, 10000, 20000, 50000], grandJackpotBps: 500000 },
};
const gridHold = [
  ['scatter', 'king', 'ten'], ['ace', 'queen', 'scatter'], ['queen', 'jack', 'nine'],
  ['scatter', 'ten', 'king'], ['jack', 'nine', 'ace'],
];

// Kaskade mit echtem Nachrutschen (08.09.2026): Schritt 0 raeumt die Mittelreihe
// der ersten drei Walzen (Zellen 1, 4, 7), Schritt 1 zeigt das nachgerutschte
// Raster und raeumt zwei weitere, Schritt 2 bringt nichts mehr — Ende.
const cfgKaskade = {
  engineVersion: 1, reels: 5, rows: 3, lineCount: 10, symbols: SYMBOLS,
  paylines: PAYLINES.slice(0, 10), scatterPaysBps: [0, 0, 0], presentation: PRESENTATION,
  cascade: { refill: 'tumble', stepMultipliers: [1, 2, 3, 5] },
};

export const samples = [
  mitLook(sample('Line numbers · two lines · win', 20, [['ace', 'king', 'ten'], ['ace', 'king', 'nine'], ['wild', 'king', 'jack'], ['queen', 'ten', 'nine'], ['jack', 'nine', 'ace']], [{ line: 0, symbol: 'king', count: 3, payBps: 6000 }, { line: 1, symbol: 'ace', count: 3, payBps: 8000 }], 0, 0, '100000000'), cfgBadges),
  sample('Two lines · win', 10, [['ace', 'king', 'ten'], ['ace', 'king', 'nine'], ['wild', 'king', 'jack'], ['queen', 'ten', 'nine'], ['jack', 'nine', 'ace']], [{ line: 0, symbol: 'king', count: 3, payBps: 6000 }, { line: 1, symbol: 'ace', count: 3, payBps: 8000 }], 0, 0, '100000000'),
  sample('No line · loss', 20, [['ace', 'king', 'queen'], ['jack', 'ten', 'nine'], ['scatter', 'queen', 'ace'], ['ten', 'king', 'nine'], ['jack', 'ace', 'queen']], [], 1, 0, '100000000'),
  sample('Five aces · big win', 20, [['queen', 'ace', 'jack'], ['king', 'ace', 'ten'], ['nine', 'ace', 'jack'], ['ten', 'ace', 'queen'], ['king', 'ace', 'nine']], [{ line: 0, symbol: 'ace', count: 5, payBps: 100000 }], 0, 0, '50000000'),
  sample('Three scatters · win', 20, [['ace', 'scatter', 'king'], ['jack', 'ten', 'nine'], ['queen', 'scatter', 'nine'], ['ten', 'king', 'jack'], ['scatter', 'queen', 'ace']], [], 3, 20000, '100000000'),
  sample('Wild fills the V · win', 5, [['queen', 'ten', 'nine'], ['jack', 'wild', 'king'], ['ten', 'ace', 'queen'], ['king', 'queen', 'jack'], ['nine', 'ace', 'ten']], [{ line: 3, symbol: 'queen', count: 4, payBps: 12000 }], 0, 0, '200000000'),
  {
    name: '6×4 All Way · win',
    outcome: {
      win: true, multiplierBps: 48000, payoutLamports: '480000000', roll: null, betLamports: '100000000',
      engineConfig: cfg64,
      details: { grid: grid64, lineWins: [], wayWins: [{ symbol: 'ace', count: 3, ways: 4, payBps: 48000 }], scatterCount: 0, scatterPayBps: 0 },
    },
  },
  {
    name: 'Cascade · tumble',
    outcome: {
      win: true, multiplierBps: 20000, payoutLamports: '200000000', roll: null, betLamports: '100000000',
      engineConfig: cfgKaskade,
      details: {
        grid: [['king', 'ace', 'ten'], ['nine', 'ace', 'jack'], ['queen', 'ace', 'nine'], ['ten', 'king', 'jack'], ['jack', 'nine', 'queen']],
        lineWins: [{ line: 0, symbol: 'ace', count: 3, payBps: 8000 }], scatterCount: 0, scatterPayBps: 0,
        cascade: {
          refill: 'tumble', totalSteps: 3, totalWinBps: 20000,
          steps: [
            {
              step: 0, multiplierBps: 10000,
              grid: [['king', 'ace', 'ten'], ['nine', 'ace', 'jack'], ['queen', 'ace', 'nine'], ['ten', 'king', 'jack'], ['jack', 'nine', 'queen']],
              lineWins: [{ line: 0, symbol: 'ace', count: 3, payBps: 8000 }],
              scatterCount: 0, scatterPayBps: 0, stepWinBps: 8000, clearedCells: [1, 4, 7],
            },
            {
              step: 1, multiplierBps: 20000,
              // Die Ueberlebenden sind nach unten gerutscht, oben kam je eine neue Zelle.
              grid: [['queen', 'king', 'ten'], ['queen', 'nine', 'jack'], ['queen', 'queen', 'nine'], ['ten', 'king', 'jack'], ['jack', 'nine', 'queen']],
              lineWins: [{ line: 1, symbol: 'queen', count: 3, payBps: 6000 }],
              scatterCount: 0, scatterPayBps: 0, stepWinBps: 6000, clearedCells: [0, 3, 6],
            },
            {
              step: 2, multiplierBps: 30000,
              grid: [['nine', 'king', 'ten'], ['ace', 'nine', 'jack'], ['ten', 'queen', 'nine'], ['ten', 'king', 'jack'], ['jack', 'nine', 'queen']],
              lineWins: [], scatterCount: 0, scatterPayBps: 0, stepWinBps: 0, clearedCells: [],
            },
          ],
        },
      },
    },
  },
  {
    name: 'Hold & spin · coins',
    outcome: {
      win: true, multiplierBps: 95000, payoutLamports: '950000000', roll: null, betLamports: '100000000',
      engineConfig: cfgHold,
      details: {
        grid: gridHold, lineWins: [], scatterCount: 3, scatterPayBps: 0,
        holdAndSpin: {
          triggerCount: 3,
          startCoins: [5000, 20000, 5000],
          startCells: [0, 5, 9],
          finalLockedCount: 6,
          grandAwarded: 0,
          featureWinBps: 95000,
          respins: [
            { landed: [10000], cells: [3], lockedCount: 4 },
            { landed: [], cells: [], lockedCount: 4 },
            { landed: [5000, 50000], cells: [12, 14], lockedCount: 6 },
          ],
        },
      },
    },
  },
  {
    name: 'Bonus symbol · feature trigger',
    outcome: {
      win: true, multiplierBps: 32000, payoutLamports: '320000000', roll: null, betLamports: '100000000',
      engineConfig: cfgBonus,
      details: {
        grid: gridBonus, lineWins: [], scatterCount: 1, scatterPayBps: 0, bonusCount: 3,
        freeSpins: {
          totalSpins: 2, totalWinBps: 32000, multiplierBps: 10000,
          spins: [
            { grid: fsGrid('ace', 'wild'), lineWins: [{ line: 0, symbol: 'king', count: 3, payBps: 6000 }], scatterCount: 0, scatterPayBps: 0, bonusCount: 0 },
            { grid: fsGrid('queen', 'ace'), lineWins: [{ line: 1, symbol: 'queen', count: 4, payBps: 26000 }], scatterCount: 0, scatterPayBps: 0, bonusCount: 0 },
          ],
        },
      },
    },
  },
  {
    name: 'Reel strips · stacked win',
    outcome: {
      win: true, multiplierBps: 8000, payoutLamports: '80000000', roll: null, betLamports: '100000000',
      engineConfig: cfgStrips,
      details: { grid: gridStrips, lineWins: [{ line: 1, symbol: 'ace', count: 3, payBps: 8000 }], scatterCount: 0, scatterPayBps: 0 },
    },
  },
  {
    name: 'Free spins chain · win',
    outcome: {
      win: true, multiplierBps: 96000, payoutLamports: '960000000', roll: null, betLamports: '100000000',
      engineConfig: cfgFs,
      details: {
        grid: [['ace', 'scatter', 'king'], ['jack', 'ten', 'nine'], ['queen', 'scatter', 'nine'], ['ten', 'king', 'jack'], ['scatter', 'queen', 'ace']],
        lineWins: [], scatterCount: 3, scatterPayBps: 20000,
        freeSpins: {
          totalSpins: 3, totalWinBps: 76000, multiplierBps: 20000,
          spins: [
            { grid: fsGrid('ace', 'wild'), lineWins: [{ line: 0, symbol: 'king', count: 3, payBps: 6000 }], scatterCount: 0, scatterPayBps: 0 },
            { grid: fsGrid('king', 'ten'), lineWins: [], scatterCount: 0, scatterPayBps: 0 },
            { grid: fsGrid('queen', 'ace'), lineWins: [{ line: 1, symbol: 'queen', count: 4, payBps: 32000 }], scatterCount: 0, scatterPayBps: 0 },
          ],
        },
      },
    },
  },
];
export const configs = [
  { name: '20 lines', engineConfig: cfg(20) },
  { name: '20 lines + Liniennummern', engineConfig: cfgBadges },
  { name: '5 lines', engineConfig: cfg(5) },
  { name: '6×4 All Way + Optik', engineConfig: cfg64 },
  { name: 'Walzenstreifen 5×3', engineConfig: cfgStrips },
  { name: 'Bonus-Symbol 5×3', engineConfig: cfgBonus },
  { name: 'Hold & Spin 5×3', engineConfig: cfgHold },
  { name: 'Kaskade 5×3', engineConfig: cfgKaskade },
];
