export const samples = [
  { name: 'Over 50 · win', outcome: { win: true, multiplierBps: 19404, payoutLamports: '194040000', roll: 72.41, betLamports: '100000000', details: { direction: 'over', target: 50, winChance: 0.4999, rollValue: 72.41 } } },
  { name: 'Under 25 · loss', outcome: { win: false, multiplierBps: 0, payoutLamports: '0', roll: 63.08, betLamports: '100000000', details: { direction: 'under', target: 25, winChance: 0.25, rollValue: 63.08 } } },
  { name: 'Over 95 · big win', outcome: { win: true, multiplierBps: 194389, payoutLamports: '971945000', roll: 97.13, betLamports: '50000000', details: { direction: 'over', target: 95, winChance: 0.0499, rollValue: 97.13 } } },
  { name: 'Under 50 · exact hit loss', outcome: { win: false, multiplierBps: 0, payoutLamports: '0', roll: 50, betLamports: '250000000', details: { direction: 'under', target: 50, winChance: 0.5, rollValue: 50 } } },
  { name: 'Under 80 · low roll win', outcome: { win: true, multiplierBps: 12125, payoutLamports: '242500000', roll: 3.71, betLamports: '200000000', details: { direction: 'under', target: 80, winChance: 0.8, rollValue: 3.71 } } },
];
export const configs = [
  { name: '0–100', engineConfig: { rangeMin: 0, rangeMax: 100, decimals: 2, drawRule: 'win' } },
  { name: '1–6 · no decimals', engineConfig: { rangeMin: 1, rangeMax: 6, decimals: 0, drawRule: 'win' } },
];
