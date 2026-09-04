const DEFAULT = [0, 12000, 15000, 30000, 50000, 240000];
export const samples = [
  { name: '1.2× · win', outcome: { win: true, multiplierBps: 12000, payoutLamports: '120000000', roll: 61.37, betLamports: '100000000', engineConfig: { segmentCount: 6, segmentMultipliersBps: DEFAULT }, details: { segmentIndex: 1, segments: 6 } } },
  { name: 'Bust · loss', outcome: { win: false, multiplierBps: 0, payoutLamports: '0', roll: 23.08, betLamports: '250000000', engineConfig: { segmentCount: 6, segmentMultipliersBps: DEFAULT }, details: { segmentIndex: 0, segments: 6 } } },
  { name: '3× · win', outcome: { win: true, multiplierBps: 30000, payoutLamports: '1500000000', roll: 94.5, betLamports: '500000000', engineConfig: { segmentCount: 6, segmentMultipliersBps: DEFAULT }, details: { segmentIndex: 3, segments: 6 } } },
  { name: 'Edge · 24× top segment', outcome: { win: true, multiplierBps: 240000, payoutLamports: '1200000000', roll: 99.41, betLamports: '50000000', engineConfig: { segmentCount: 6, segmentMultipliersBps: DEFAULT }, details: { segmentIndex: 5, segments: 6 } } },
  { name: 'Custom 8-segment table · 2× win', outcome: { win: true, multiplierBps: 20000, payoutLamports: '400000000', roll: 71.2, betLamports: '200000000', details: { segmentIndex: 6, segments: 8 } } },
];
export const configs = [
  { name: 'default 6', engineConfig: { segmentCount: 6, segmentMultipliersBps: DEFAULT } },
  { name: 'custom 8', engineConfig: { segmentCount: 8, segmentMultipliersBps: [0, 5000, 10000, 12000, 15000, 20000, 30000, 100000] } },
];
