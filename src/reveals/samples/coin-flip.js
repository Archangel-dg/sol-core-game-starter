// Fixtures for the coin-flip reveal — exact server shapes. Used by the check script only.
export const samples = [
  { name: 'Heads · win', outcome: { win: true, multiplierBps: 19600, payoutLamports: '196000000', roll: 23.41, betLamports: '100000000', details: { side: 'heads', landed: 'heads' } } },
  { name: 'Heads · loss', outcome: { win: false, multiplierBps: 0, payoutLamports: '0', roll: 63.9, betLamports: '100000000', details: { side: 'heads', landed: 'tails' } } },
  { name: 'Tails · win', outcome: { win: true, multiplierBps: 19600, payoutLamports: '490000000', roll: 77.05, betLamports: '250000000', details: { side: 'tails', landed: 'tails' } } },
  { name: 'Tails · loss', outcome: { win: false, multiplierBps: 0, payoutLamports: '0', roll: 8.12, betLamports: '500000000', details: { side: 'tails', landed: 'heads' } } },
  { name: 'Edge · roll 49.99 · custom 1.90×', outcome: { win: true, multiplierBps: 19000, payoutLamports: '9500000000', roll: 49.99, betLamports: '5000000000', details: { side: 'heads', landed: 'heads' } } },
];
export const configs = [{ name: 'default', engineConfig: {} }];
