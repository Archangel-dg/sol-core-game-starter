// `multVisibleEarly`: a limbo win pays exactly the TARGET the player chose, and the target
// stands on the field from the start — the figure is the player's input, not a leak.
export const samples = [
  { name: 'Target 2.00× · win', multVisibleEarly: true, outcome: { win: true, multiplierBps: 20000, payoutLamports: '200000000', roll: 2.3099, betLamports: '100000000', details: { targetMultiplierBps: 20000, crashMultiplierBps: 23099 } } },
  { name: 'Target 3.50× · loss', outcome: { win: false, multiplierBps: 0, payoutLamports: '0', roll: 1.62, betLamports: '250000000', details: { targetMultiplierBps: 35000, crashMultiplierBps: 16200 } } },
  { name: 'Target 25.00× · big win', multVisibleEarly: true, outcome: { win: true, multiplierBps: 250000, payoutLamports: '1250000000', roll: 48.2927, betLamports: '50000000', details: { targetMultiplierBps: 250000, crashMultiplierBps: 482927 } } },
  { name: 'Target 2.00× · exact hit wins', multVisibleEarly: true, outcome: { win: true, multiplierBps: 20000, payoutLamports: '400000000', roll: 2, betLamports: '200000000', details: { targetMultiplierBps: 20000, crashMultiplierBps: 20000 } } },
  { name: 'Target 1.50× · instant bust', outcome: { win: false, multiplierBps: 0, payoutLamports: '0', roll: 0.99, betLamports: '100000000', details: { targetMultiplierBps: 15000, crashMultiplierBps: 9900 } } },
];
export const configs = [
  { name: 'default', engineConfig: { minTargetBps: 10100, decimals: 2, drawRule: 'win' } },
  { name: 'min target 5×', engineConfig: { minTargetBps: 50000, maxTargetBps: 1000000, decimals: 2, drawRule: 'win' } },
];
