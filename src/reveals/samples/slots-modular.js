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
export const samples = [
  sample('Two lines · win', 10, [['ace', 'king', 'ten'], ['ace', 'king', 'nine'], ['wild', 'king', 'jack'], ['queen', 'ten', 'nine'], ['jack', 'nine', 'ace']], [{ line: 0, symbol: 'king', count: 3, payBps: 6000 }, { line: 1, symbol: 'ace', count: 3, payBps: 8000 }], 0, 0, '100000000'),
  sample('No line · loss', 20, [['ace', 'king', 'queen'], ['jack', 'ten', 'nine'], ['scatter', 'queen', 'ace'], ['ten', 'king', 'nine'], ['jack', 'ace', 'queen']], [], 1, 0, '100000000'),
  sample('Five aces · big win', 20, [['queen', 'ace', 'jack'], ['king', 'ace', 'ten'], ['nine', 'ace', 'jack'], ['ten', 'ace', 'queen'], ['king', 'ace', 'nine']], [{ line: 0, symbol: 'ace', count: 5, payBps: 100000 }], 0, 0, '50000000'),
  sample('Three scatters · win', 20, [['ace', 'scatter', 'king'], ['jack', 'ten', 'nine'], ['queen', 'scatter', 'nine'], ['ten', 'king', 'jack'], ['scatter', 'queen', 'ace']], [], 3, 20000, '100000000'),
  sample('Wild fills the V · win', 5, [['queen', 'ten', 'nine'], ['jack', 'wild', 'king'], ['ten', 'ace', 'queen'], ['king', 'queen', 'jack'], ['nine', 'ace', 'ten']], [{ line: 3, symbol: 'queen', count: 4, payBps: 12000 }], 0, 0, '200000000'),
];
export const configs = [
  { name: '20 lines', engineConfig: cfg(20) },
  { name: '5 lines', engineConfig: cfg(5) },
];
