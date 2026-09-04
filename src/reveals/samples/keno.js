export const samples = [
  { name: '3 of 5 hits · win', outcome: { win: true, multiplierBps: 48141, payoutLamports: '481410000', roll: null, betLamports: '100000000', details: { picks: [4, 11, 17, 23, 36], drawn: [29, 17, 8, 36, 2, 33, 4, 21, 14, 40], hits: 3, paytableBps: [0, 1783, 14264, 48141, 114112, 222874] } } },
  { name: '0 of 5 hits · loss', outcome: { win: false, multiplierBps: 0, payoutLamports: '0', roll: null, betLamports: '100000000', details: { picks: [2, 9, 14, 28, 33], drawn: [37, 5, 21, 40, 16, 3, 30, 11, 25, 19], hits: 0, paytableBps: [0, 1783, 14264, 48141, 114112, 222874] } } },
  { name: '1 of 5 hits · 0.18× partial return', outcome: { win: true, multiplierBps: 1783, payoutLamports: '17830000', roll: null, betLamports: '100000000', details: { picks: [6, 13, 22, 31, 38], drawn: [10, 27, 22, 1, 35, 18, 9, 40, 3, 24], hits: 1, paytableBps: [0, 1783, 14264, 48141, 114112, 222874] } } },
  { name: '3 of 3 hits · 14.07× top prize', outcome: { win: true, multiplierBps: 140705, payoutLamports: '7035250000', roll: null, betLamports: '500000000', details: { picks: [7, 19, 31], drawn: [26, 19, 12, 39, 7, 2, 34, 31, 15, 23], hits: 3, paytableBps: [0, 5211, 41690, 140705] } } },
  { name: '4 of 10 hits · win', outcome: { win: true, multiplierBps: 23145, payoutLamports: '578625000', roll: null, betLamports: '250000000', details: { picks: [1, 5, 12, 16, 20, 24, 27, 32, 35, 39], drawn: [16, 8, 35, 30, 3, 24, 38, 11, 20, 19], hits: 4, paytableBps: [0, 362, 2893, 9764, 23145, 45206, 78115, 124044, 185162, 263639, 361645] } } },
];
export const configs = [
  { name: 'pool 40', engineConfig: { pool: 40, draws: 10, maxPicks: 10 } },
  { name: 'pool 80', engineConfig: { pool: 80, draws: 20, maxPicks: 15 } },
];
