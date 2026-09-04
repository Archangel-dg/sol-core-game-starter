export const samples = [
  { name: 'Tier 3 · 5× win', outcome: { win: true, multiplierBps: 50000, payoutLamports: '500000000', roll: 94.31, betLamports: '100000000', details: { prizeIndex: 3 } } },
  { name: 'Blank · loss', outcome: { win: false, multiplierBps: 0, payoutLamports: '0', roll: 37.18, betLamports: '100000000', details: { prizeIndex: 0 } } },
  { name: 'Tier 1 · 1× stake back', outcome: { win: true, multiplierBps: 10000, payoutLamports: '250000000', roll: 78.02, betLamports: '250000000', details: { prizeIndex: 1 } } },
  { name: 'Tier 5 · 50× jackpot', outcome: { win: true, multiplierBps: 500000, payoutLamports: '25000000000', roll: 99.87, betLamports: '500000000', details: { prizeIndex: 5 } } },
];
export const configs = [
  { name: '9 fields', engineConfig: { fields: 9, reveals: 9 } },
  { name: '25 fields', engineConfig: { fields: 25, reveals: 25 } },
  { name: '3 fields', engineConfig: { fields: 3, reveals: 3 } },
];
