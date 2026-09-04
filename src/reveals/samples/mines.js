// Fixtures for the mines reveal — the transcript `lib/reveal-session.ts` builds from a SessionView.
const CFG = { gridSize: 25, mineCount: 3 };
const S = (id, steps, rest) => ({ sessionId: id, betLamports: '100000000', engineConfig: CFG, steps, ...rest });
export const samples = [
  { name: 'Four gems · cash-out', outcome: S('m1', [{ tile: 7, safe: true, multiplierBps: 11023 }, { tile: 12, safe: true, multiplierBps: 12597 }, { tile: 18, safe: true, multiplierBps: 14487 }, { tile: 3, safe: true, multiplierBps: 16774 }], { status: 'cashed_out', multiplierBps: 16774, payoutLamports: '167740000', win: true }) },
  { name: 'Mine on the third pick · bust', outcome: S('m2', [{ tile: 6, safe: true, multiplierBps: 11023 }, { tile: 19, safe: true, multiplierBps: 12597 }, { tile: 13, safe: false, multiplierBps: 12597 }], { status: 'busted', minePositions: [2, 13, 21], multiplierBps: 0, payoutLamports: '0', win: false }) },
  { name: 'Ten gems · 4.90× cash-out', outcome: S('m3', [{ tile: 0, safe: true, multiplierBps: 11023 }, { tile: 4, safe: true, multiplierBps: 12597 }, { tile: 20, safe: true, multiplierBps: 14487 }, { tile: 24, safe: true, multiplierBps: 16774 }, { tile: 12, safe: true, multiplierBps: 19570 }, { tile: 6, safe: true, multiplierBps: 23024 }, { tile: 8, safe: true, multiplierBps: 27341 }, { tile: 16, safe: true, multiplierBps: 32809 }, { tile: 18, safe: true, multiplierBps: 39839 }, { tile: 2, safe: true, multiplierBps: 49033 }], { status: 'cashed_out', multiplierBps: 49033, payoutLamports: '1225825000', win: true }) },
  { name: 'Mine on the first pick · bust', outcome: S('m4', [{ tile: 11, safe: false, multiplierBps: 10000 }], { status: 'busted', minePositions: [5, 11, 22], multiplierBps: 0, payoutLamports: '0', win: false }) },
  { name: 'Five mines · 3.32× cash-out', outcome: { ...S('m5', [{ tile: 14, safe: true, multiplierBps: 12125 }, { tile: 9, safe: true, multiplierBps: 15316 }, { tile: 1, safe: true, multiplierBps: 19570 }, { tile: 23, safe: true, multiplierBps: 25326 }, { tile: 17, safe: true, multiplierBps: 33241 }], { status: 'cashed_out', multiplierBps: 33241, payoutLamports: '332410000', win: true }), engineConfig: { gridSize: 25, mineCount: 5 } } },
];
export const configs = [
  { name: '5×5 · 3 mines', engineConfig: CFG },
  { name: '4×4 · 2 mines', engineConfig: { gridSize: 16, mineCount: 2 } },
];
// Step by step, as the session flow plays it: `first` stands, `then` adds one step (`from`).
export const incremental = [
  { name: 'second pick after the first', from: 1, first: S('mi1', [{ tile: 7, safe: true, multiplierBps: 11023 }], { status: 'active', multiplierBps: 11023, win: false }), then: S('mi1', [{ tile: 7, safe: true, multiplierBps: 11023 }, { tile: 12, safe: true, multiplierBps: 12597 }], { status: 'active', multiplierBps: 12597, win: false }) },
  { name: 'bust on the third pick', from: 2, first: S('mi2', [{ tile: 6, safe: true, multiplierBps: 11023 }, { tile: 19, safe: true, multiplierBps: 12597 }], { status: 'active', multiplierBps: 12597, win: false }), then: S('mi2', [{ tile: 6, safe: true, multiplierBps: 11023 }, { tile: 19, safe: true, multiplierBps: 12597 }, { tile: 13, safe: false, multiplierBps: 12597 }], { status: 'busted', minePositions: [2, 13, 21], multiplierBps: 0, payoutLamports: '0', win: false }) },
  { name: 'cash-out after two picks', from: 2, first: S('mi3', [{ tile: 6, safe: true, multiplierBps: 11023 }, { tile: 19, safe: true, multiplierBps: 12597 }], { status: 'active', multiplierBps: 12597, win: false }), then: S('mi3', [{ tile: 6, safe: true, multiplierBps: 11023 }, { tile: 19, safe: true, multiplierBps: 12597 }], { status: 'cashed_out', multiplierBps: 12597, payoutLamports: '125970000', win: true }) },
];
