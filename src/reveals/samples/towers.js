// Fixtures for the towers reveal — the transcript `lib/reveal-session.ts` builds from a SessionView.
const CFG = { levels: 6, columns: 3, bombs: 1 };
const S = (id, steps, rest) => ({ sessionId: id, betLamports: '100000000', engineConfig: CFG, steps, ...rest });
export const samples = [
  { name: 'Six floors · cash-out at the top', outcome: S('t1', [{ column: 1, safe: true, multiplierBps: 14550 }, { column: 0, safe: true, multiplierBps: 21825 }, { column: 2, safe: true, multiplierBps: 32738 }, { column: 2, safe: true, multiplierBps: 49106 }, { column: 0, safe: true, multiplierBps: 73659 }, { column: 1, safe: true, multiplierBps: 110489 }], { status: 'cashed_out', multiplierBps: 110489, payoutLamports: '1104890000', win: true }) },
  { name: 'Bomb on floor 4 · bust', outcome: S('t2', [{ column: 0, safe: true, multiplierBps: 14550 }, { column: 2, safe: true, multiplierBps: 21825 }, { column: 1, safe: true, multiplierBps: 32738 }, { column: 2, safe: false, multiplierBps: 32738 }], { status: 'busted', bombColumns: [[1], [0], [0], [2], [1], [2]], multiplierBps: 0, payoutLamports: '0', win: false }) },
  { name: 'Three floors · cash-out', outcome: S('t3', [{ column: 2, safe: true, multiplierBps: 14550 }, { column: 1, safe: true, multiplierBps: 21825 }, { column: 1, safe: true, multiplierBps: 32738 }], { status: 'cashed_out', multiplierBps: 32738, payoutLamports: '818450000', win: true }) },
  { name: 'Bomb on the first floor · bust', outcome: S('t4', [{ column: 1, safe: false, multiplierBps: 10000 }], { status: 'busted', bombColumns: [[1], [2], [0], [1], [1], [0]], multiplierBps: 0, payoutLamports: '0', win: false }) },
  { name: 'Eight floors × 4 · 248× cash-out', outcome: { ...S('t5', [{ column: 3, safe: true, multiplierBps: 19400 }, { column: 0, safe: true, multiplierBps: 38800 }, { column: 2, safe: true, multiplierBps: 77600 }, { column: 1, safe: true, multiplierBps: 155200 }, { column: 3, safe: true, multiplierBps: 310400 }, { column: 0, safe: true, multiplierBps: 620800 }, { column: 2, safe: true, multiplierBps: 1241600 }, { column: 1, safe: true, multiplierBps: 2483200 }], { status: 'cashed_out', multiplierBps: 2483200, payoutLamports: '12416000000', win: true }), engineConfig: { levels: 8, columns: 4, bombs: 2 } } },
];
export const configs = [
  { name: '6 × 3', engineConfig: CFG },
  { name: 'pro floors', engineConfig: { levels: 4, floors: [{ columns: 2, bombs: 1 }, { columns: 3, bombs: 1 }, { columns: 4, bombs: 2 }, { columns: 3, bombs: 2 }] } },
];
export const incremental = [
  { name: 'second floor after the first', from: 1, first: S('ti1', [{ column: 1, safe: true, multiplierBps: 14550 }], { status: 'active', multiplierBps: 14550, win: false }), then: S('ti1', [{ column: 1, safe: true, multiplierBps: 14550 }, { column: 0, safe: true, multiplierBps: 21825 }], { status: 'active', multiplierBps: 21825, win: false }) },
  { name: 'bomb on the third floor', from: 2, first: S('ti2', [{ column: 0, safe: true, multiplierBps: 14550 }, { column: 2, safe: true, multiplierBps: 21825 }], { status: 'active', multiplierBps: 21825, win: false }), then: S('ti2', [{ column: 0, safe: true, multiplierBps: 14550 }, { column: 2, safe: true, multiplierBps: 21825 }, { column: 1, safe: false, multiplierBps: 21825 }], { status: 'busted', bombColumns: [[1], [0], [1], [2], [1], [2]], multiplierBps: 0, payoutLamports: '0', win: false }) },
];
