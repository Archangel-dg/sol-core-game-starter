// Fixtures for the video-poker reveal — the transcript `lib/reveal-session.ts` builds from a
// SessionView. Cards are 0..51: rank k % 13 + 1 (1 = ace, 11 = jack, 12 = queen, 13 = king),
// suit ⌊k / 13⌋ (0 ♠, 1 ♥, 2 ♦, 3 ♣). Hands and multipliers follow the default table
// (8/6, royal 100×) — exactly what the server's evaluator says for these cards.
const BET = '100000000';
const DEALT = (id, dealt, category, rest) => ({ sessionId: id, betLamports: BET, status: 'active', minPairRank: 11, dealt, holds: null, hand: dealt, category, autoDraw: false, multiplierBps: 0, payoutLamports: '0', win: false, hit: false, capped: false, ...rest });
const DRAWN = (id, dealt, holds, hand, category, rest) => ({ sessionId: id, betLamports: BET, minPairRank: 11, dealt, holds, hand, category, autoDraw: false, capped: false, ...rest });
const WIN = (multiplierBps, payoutLamports) => ({ status: 'cashed_out', multiplierBps, payoutLamports, win: true, hit: true });
const BACK = { status: 'cashed_out', multiplierBps: 10000, payoutLamports: BET, win: false, hit: true };
const LOSS = { status: 'busted', multiplierBps: 0, payoutLamports: '0', win: false, hit: false };

export const samples = [
  // J♥ J♣ 4♠ 9♦ K♠ → hold the jacks → J J 9♣ 9♥ 3♦ = two pair, 2×.
  { name: 'Pair of jacks held · two pair', outcome: DRAWN('v1', [23, 49, 3, 34, 12], [0, 1], [23, 49, 47, 21, 28], 'twoPair', WIN(20000, '200000000')), expect: [['reveal.won', { amount: '0.2' }], ['vp.hand.twoPair']] },
  // 2♠ 7♥ 9♦ 4♣ Q♠ → discard all five → 5♥ 8♣ K♦ 3♠ 10♥ = nothing.
  { name: 'Discard all · no win', outcome: DRAWN('v2', [1, 19, 34, 42, 11], [], [17, 46, 38, 2, 22], 'none', LOSS), expect: [['result.lost'], ['vp.hand.none']] },
  // Q♦ Q♣ 3♥ 8♠ 5♦ → hold the queens → Q Q 2♥ 9♠ 6♣ = jacks or better, 1× (stake back, no net win).
  { name: 'Jacks or better · stake back', outcome: DRAWN('v3', [37, 50, 15, 7, 30], [0, 1], [37, 50, 14, 8, 44], 'highPair', BACK), expect: [['result.back', { amount: '0.1' }], ['vp.hand.highPair.11']] },
  // A flush is dealt — hold all five (no card is replaced), 6×.
  { name: 'Flush dealt · stand pat', outcome: DRAWN('v4', [14, 18, 21, 23, 25], [0, 1, 2, 3, 4], [14, 18, 21, 23, 25], 'flush', WIN(60000, '600000000')), expect: [['reveal.won', { amount: '0.6' }], ['vp.hand.flush']] },
  // 10♠ J♠ Q♠ K♠ 4♦ → hold four to the royal → A♠ = royal flush, 100×.
  { name: 'Four to a royal · royal flush', outcome: DRAWN('v5', [9, 10, 11, 12, 29], [0, 1, 2, 3], [9, 10, 11, 12, 0], 'royalFlush', WIN(1000000, '10000000000')), expect: [['reveal.won', { amount: '10' }], ['vp.hand.royalFlush']] },
  // Time-out: the server held the three sevens itself (best hold) → 7 7 7 5♠ 9♣, 3×.
  { name: 'Time-out · best hold played · three of a kind', outcome: DRAWN('v6', [45, 32, 19, 1, 51], [0, 1, 2], [45, 32, 19, 4, 47], 'threeOfAKind', { ...WIN(30000, '300000000'), autoDraw: true }), expect: [['reveal.won', { amount: '0.3' }], ['vp.hand.threeOfAKind'], ['reveal.videoPoker.auto']] },
  // Straight flush 50× — paid at the game's payout cap (40×), the hand stays a straight flush.
  { name: 'Straight flush · at the cap', outcome: DRAWN('v7', [43, 44, 45, 46, 25], [0, 1, 2, 3], [43, 44, 45, 46, 47], 'straightFlush', { ...WIN(400000, '4000000000'), capped: true }), expect: [['reveal.won', { amount: '4' }], ['vp.hand.straightFlush'], ['reveal.capped']] },
  // Tens or Better game: 10♦ 10♣ held → 10 10 4♣ J♦ 2♥ pays the low pair.
  { name: 'Tens or better · pair of tens', outcome: DRAWN('v8', [35, 48, 2, 18, 33], [0, 1], [35, 48, 42, 36, 14], 'highPair', { ...BACK, minPairRank: 10 }), expect: [['result.back', { amount: '0.1' }], ['vp.hand.highPair.10']] },
];

export const configs = [
  {
    name: 'jacks or better (default table)',
    engineConfig: { engineVersion: 1, variant: 'jacks-or-better', minPairRank: 11, paytableBps: { royalFlush: 1000000, straightFlush: 500000, fourOfAKind: 250000, fullHouse: 80000, flush: 60000, straight: 40000, threeOfAKind: 30000, twoPair: 20000, highPair: 10000 }, maxMultiplierBps: 1000000 },
  },
  {
    name: 'tens or better',
    engineConfig: { engineVersion: 1, variant: 'jacks-or-better', minPairRank: 10, paytableBps: { royalFlush: 1000000, straightFlush: 500000, fourOfAKind: 250000, fullHouse: 60000, flush: 50000, straight: 40000, threeOfAKind: 30000, twoPair: 20000, highPair: 10000 }, maxMultiplierBps: 1000000 },
  },
];

// Step 1 is the deal (round open), step 2 the draw: `from: 1` keeps the dealt hand on the board.
export const incremental = [
  { name: 'deal, then hold the jacks · two pair', from: 1, first: DEALT('vi1', [23, 49, 3, 34, 12], 'highPair', { multiplierBps: 10000 }), then: DRAWN('vi1', [23, 49, 3, 34, 12], [0, 1], [23, 49, 47, 21, 28], 'twoPair', WIN(20000, '200000000')), expect: [['reveal.won', { amount: '0.2' }], ['vp.hand.twoPair']] },
  { name: 'deal, then discard all · no win', from: 1, first: DEALT('vi2', [1, 19, 34, 42, 11], 'none'), then: DRAWN('vi2', [1, 19, 34, 42, 11], [], [17, 46, 38, 2, 22], 'none', LOSS), expect: [['result.lost'], ['vp.hand.none']] },
  { name: 'flush dealt, stand pat', from: 1, first: DEALT('vi3', [14, 18, 21, 23, 25], 'flush', { multiplierBps: 60000 }), then: DRAWN('vi3', [14, 18, 21, 23, 25], [0, 1, 2, 3, 4], [14, 18, 21, 23, 25], 'flush', WIN(60000, '600000000')), expect: [['reveal.won', { amount: '0.6' }], ['vp.hand.flush']] },
];
