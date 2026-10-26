// Sol-Core reveal — slots-modular (single, Slot).
//
// One motion idea: the reel strips scroll and stop one after another on the server's
// `details.grid`. Only then is each winning payline traced through its cells and the
// readout appears. Every frame is a pure function of (outcome, elapsed ms) — no
// randomness, and nothing is drawn, slowed or highlighted before its reel has stopped.
//
// The reels never snap. Each reel is an endless virtual strip (cell index k, the top
// row shows cell k0; rolling means k0 moves) painted only around the window. A round
// starts FROM THE POSITION the reels are in — idle, the previous grid, or the pre-roll
// (`arm()`: the round is submitted, the outcome still on its way, the strips roll at
// cruise speed). `play()` places the server's grid at least four cells ahead of every
// window, at the first stop time at or after the reel's minimum, and the constant run
// plus one fixed ease-out lands exactly on it. `idle()` keeps every reel where it is;
// `disarm()` (the round failed) settles each reel on the next whole cell, no result.
//
// THE GRID IS THE GAME'S OWN (08.09.2026): reels and rows come from the config echo,
// 1–6 in each direction — a 6×4 slot draws six reels of four, not the old fixed 5×3.
// Cell size, the paylines and every stop time follow from that.
//
// THE LOOK COMES FROM THE SLOT LAB (08.09.2026): `engineConfig.presentation` carries
// what the creator set there — `physics` (wind-up, speed, stop order, brake, bounce)
// and `animation` (how lines and hit symbols move, whether the amount counts up, and
// the Big/Mega/Epic steps with their thresholds). It is pure decoration: the server
// decides the outcome, this only decides how it arrives. Every value is clamped here,
// so a broken or hostile blob can never stall a round. Missing ⇒ the classic look.
//
// NOT ported from the Slot Lab: the anticipation reel ("Spannung" — the remaining
// reels run longer when one scatter is still missing). That is the textbook near-miss
// device, and RULES.md rule 16.3 forbids exactly that. The setting stays in the lab
// for the operator to decide; this module ignores it.
//
// The render spec (symbols, paylines, line count) is the game's config echo — idle
// and per round. Without an echo a six-rank default deck stands in.
//
// Text through `ctx.text(...)`, colours through the theme tokens. Design zone.

/** @type {import('../lib/reveal').RevealModule} */
export const reveal = {
  key: 'slots-modular',
  mechanic: 'single',
  strings: [
    'reveal.won', 'result.lost', 'reveal.bet', 'reveal.more',
    'reveal.slotsm.paytable', 'reveal.slotsm.lines', 'reveal.slotsm.wilds', 'reveal.slotsm.scatters', 'reveal.slotsm.spin', 'reveal.slotsm.noLine',
    'reveal.slotsm.ways', 'reveal.slotsm.total', 'reveal.slotsm.grid',
    'reveal.slotsm.big', 'reveal.slotsm.mega', 'reveal.slotsm.epic',
    'reveal.slotsm.freeSpin', 'reveal.slotsm.respin', 'reveal.slotsm.coinsLocked', 'reveal.slotsm.cascade',
    'reveal.slotsm.featureStart', 'reveal.slotsm.featureEnd', 'reveal.slotsm.retrigger',
  ],

  mount(root, ctx) {
    const NS = 'http://www.w3.org/2000/svg';
    const KNOWN = {
      ace: { glyph: 'A', tint: '#f43f5e' }, king: { glyph: 'K', tint: '#f59e0b' },
      queen: { glyph: 'Q', tint: '#a855f7' }, jack: { glyph: 'J', tint: '#3b82f6' },
      ten: { glyph: '10', tint: '#22c55e' }, nine: { glyph: '9', tint: '#14b8a6' },
      wild: { glyph: '🃏', tint: '#eab308' }, scatter: { glyph: '✨', tint: '#8b5cf6' },
      star: { glyph: '⭐', tint: '#8b5cf6' }, cherry: { glyph: '🍒', tint: '#ef4444' },
      lemon: { glyph: '🍋', tint: '#facc15' }, bell: { glyph: '🔔', tint: '#f59e0b' },
      seven: { glyph: '7️⃣', tint: '#ef4444' }, diamond: { glyph: '💎', tint: '#38bdf8' },
      bar: { glyph: 'BAR', tint: '#94a3b8' }, coin: { glyph: '🪙', tint: '#eab308' },
      gem: { glyph: '💠', tint: '#06b6d4' }, crown: { glyph: '👑', tint: '#f59e0b' },
      skull: { glyph: '💀', tint: '#64748b' }, fish: { glyph: '🐟', tint: '#0ea5e9' },
    };
    const PALETTE = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#14b8a6', '#f43f5e', '#eab308'];
    const symbolArt = (id) => {
      const s = String(id == null ? '?' : id);
      const known = KNOWN[s.toLowerCase()];
      if (known) return known;
      let h = 0;
      for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
      return { glyph: s.slice(0, 2).toUpperCase(), tint: PALETTE[h % PALETTE.length] };
    };
    const sym = (id, wild, scatter, paysBps) => ({ id, wild, scatter, paysBps });
    const DEFAULT_SYMBOLS = [
      sym('ace', 0, 0, [8000, 30000, 100000]), sym('king', 0, 0, [6000, 20000, 60000]),
      sym('queen', 0, 0, [4000, 12000, 40000]), sym('jack', 0, 0, [3000, 8000, 25000]),
      sym('ten', 0, 0, [2000, 5000, 15000]), sym('nine', 0, 0, [2000, 4000, 12000]),
      sym('wild', 1, 0, [0, 0, 0]), sym('scatter', 0, 1, [0, 0, 0]),
    ];
    // The catalog of the classic 5×3 grid — the fallback when the echo carries none.
    const PAYLINES_5X3 = [
      [1, 1, 1, 1, 1], [0, 0, 0, 0, 0], [2, 2, 2, 2, 2], [0, 1, 2, 1, 0], [2, 1, 0, 1, 2],
      [0, 0, 1, 0, 0], [2, 2, 1, 2, 2], [1, 0, 0, 0, 1], [1, 2, 2, 2, 1], [1, 0, 1, 0, 1],
      [1, 2, 1, 2, 1], [0, 1, 0, 1, 0], [2, 1, 2, 1, 2], [1, 1, 0, 1, 1], [1, 1, 2, 1, 1],
      [0, 1, 1, 1, 0], [2, 1, 1, 1, 2], [0, 2, 0, 2, 0], [2, 0, 2, 0, 2], [0, 2, 2, 2, 0],
    ];

    // ── the panel the grid lives in (viewBox units) ──────────────────────────
    const PANEL = { x: 4.5, y: 9.5, w: 91, h: 56 };
    const AHEAD = 4;                       // the grid lands at least this many cells ahead
    const LINE_WAIT = 200, LINE_GAP = 250, LINE_DRAW = 320, LIFT_MS = 200, PULSE_MS = 600, HOLD = 350, SETTLE = 260;
    const MAXC = 38;
    // Feature playback: every sub-step is a short re-spin. The whole chain is capped
    // so a 50-free-spin round still resolves quickly (`play()` must not run for a minute).
    const FEAT_MAX_MS = 6000, FEAT_MIN_STEP = 260, FEAT_STEP = 620;
    const SHAKE_MS = 650, CONFETTI_MS = 1400;

    const C = 'sca-slots-modular';           // class prefix — every rule is scoped with it
    const CSS = `
.${C}{position:absolute;inset:0;background:var(--night);font-family:var(--mono)}
.${C} svg{position:absolute;inset:0;width:100%;height:100%;display:block}
.${C} text{font-family:var(--mono);font-variant-numeric:tabular-nums;fill:var(--fg)}
.${C} .${C}-muted{fill:var(--muted)}
.${C} .${C}-head{font-size:3.4px;font-weight:600}
.${C} .${C}-end{text-anchor:end}
.${C} .${C}-mid{text-anchor:middle}
.${C} .${C}-glyph{font-weight:700;text-anchor:middle;dominant-baseline:central}
.${C} .${C}-cell rect{fill:var(--panel-strong);stroke:var(--line);stroke-width:.3}
.${C} .${C}-cell[data-hot="line"] rect{fill:rgb(var(--accent-rgb) / .16);stroke:var(--accent);stroke-width:.6}
.${C} .${C}-cell[data-hot="scatter"] rect{fill:var(--panel-strong);stroke:var(--solana);stroke-width:.6}
.${C} .${C}-coin-disc{fill:#f3c34e;stroke:#8a5a06;stroke-width:.35}
.${C} .${C}-coin-ring{fill:none;stroke:#fde9ad;stroke-width:.22;opacity:.85}
.${C} .${C}-coin-val{font-weight:700;text-anchor:middle;dominant-baseline:central;fill:#4a3205}
.${C} .${C}-line{fill:none;stroke:var(--accent);stroke-width:.9;stroke-linecap:round;stroke-linejoin:round}
.${C} .${C}-badge circle{fill:var(--panel-strong);stroke:var(--line);stroke-width:.25}
.${C} .${C}-badge text{font-weight:700;text-anchor:middle;dominant-baseline:central;fill:var(--muted)}
.${C} .${C}-badge[data-hot="line"] circle{fill:var(--accent);stroke:var(--accent)}
.${C} .${C}-badge[data-hot="line"] text{fill:var(--night)}
.${C} .${C}-mult{font-size:7.5px;font-weight:700}
.${C} .${C}-out{font-size:4.2px;font-weight:600}
.${C} .${C}-fiat{font-size:3px;fill:var(--muted)}
.${C} .${C}-sub{font-size:3.4px;font-weight:600}
.${C} .${C}-det{font-size:3.1px}
.${C} .${C}-tier{font-size:4.6px;font-weight:700;letter-spacing:.6px}
.${C} .${C}-step{font-size:3.2px;font-weight:600;fill:var(--solana)}
.${C}[data-tone="win"] .${C}-mult,.${C}[data-tone="win"] .${C}-out{fill:var(--accent)}
.${C}[data-tone="loss"] .${C}-mult,.${C}[data-tone="loss"] .${C}-out{fill:var(--red)}
.${C}-tier[data-tier="big"]{fill:var(--accent)}
.${C}-tier[data-tier="mega"]{fill:#fbbf24}
.${C}-tier[data-tier="epic"]{fill:#fb7185}
`;
    const st = document.createElement('style');
    st.textContent = CSS;
    root.appendChild(st);

    const box = document.createElement('div');
    box.className = 'sca-slots-modular';
    root.appendChild(box);
    const el = (tag, attrs, parent) => {
      const n = document.createElementNS(NS, tag);
      for (const k in attrs) n.setAttribute(k, attrs[k]);
      (parent || svg).appendChild(n);
      return n;
    };
    const svg = el('svg', { viewBox: '0 0 100 100', preserveAspectRatio: 'xMidYMid meet' }, box);
    const uid = 'sca-slots-modular-clip-' + Math.floor(performance.now() * 1000).toString(36);

    const headL = el('text', { x: PANEL.x + 2.5, y: 6.8, class: 'sca-slots-modular-head' });
    const headR = el('text', { x: 93, y: 6.8, class: 'sca-slots-modular-head sca-slots-modular-end sca-slots-modular-muted' });
    el('rect', { x: PANEL.x, y: PANEL.y, width: PANEL.w, height: PANEL.h, rx: 2, fill: 'var(--panel)', stroke: 'var(--line)', 'stroke-width': 0.3 });
    // The whole board shakes as one group (a win step may ask for it).
    const shakeG = el('g', {});
    const stripsG = el('g', {}, shakeG);
    // Liniennummern links und rechts der Walzen — nur, wenn die Slot-Lab sie gewaehlt hat (`display.lineBadges`).
    const badgesG = el('g', {}, shakeG);
    // Muenzen liegen UEBER den Walzen und bewegen sich nicht: eine gehaltene
    // Muenze steht still, waehrend die Walze dahinter dreht. Genau so sieht ein
    // echtes Hold & Spin aus — und nur so kann man sehen, was schon gesichert ist.
    const coinsG = el('g', {}, shakeG);
    const linesG = el('g', {}, shakeG);
    const confG = el('g', {}, shakeG);
    const defs = el('defs', {});
    const idleG = el('g', {});
    const idle1 = el('text', { x: 50, y: 76.5, class: 'sca-slots-modular-sub sca-slots-modular-mid sca-slots-modular-muted' }, idleG);
    const idle2 = el('text', { x: 50, y: 83.5, class: 'sca-slots-modular-sub sca-slots-modular-mid' }, idleG);
    const idle3 = el('text', { x: 50, y: 90.5, class: 'sca-slots-modular-det sca-slots-modular-mid sca-slots-modular-muted' }, idleG);
    const idle4 = el('text', { x: 50, y: 95.5, class: 'sca-slots-modular-det sca-slots-modular-mid sca-slots-modular-muted' }, idleG);
    const readG = el('g', {});
    const tier = el('text', { x: 50, y: 70.5, class: 'sca-slots-modular-tier sca-slots-modular-mid' }, readG);
    const mult = el('text', { x: 50, y: 78, class: 'sca-slots-modular-mult sca-slots-modular-mid' }, readG);
    const out = el('text', { x: 50, y: 84, class: 'sca-slots-modular-out sca-slots-modular-mid' }, readG);
    const fiat = el('text', { x: 50, y: 88.2, class: 'sca-slots-modular-fiat sca-slots-modular-mid' }, readG);
    const det1 = el('text', { x: 50, y: 93, class: 'sca-slots-modular-det sca-slots-modular-mid sca-slots-modular-muted' }, readG);
    const det2 = el('text', { x: 50, y: 97, class: 'sca-slots-modular-det sca-slots-modular-mid sca-slots-modular-muted' }, readG);
    const stepT = el('text', { x: 50, y: 70.5, class: 'sca-slots-modular-step sca-slots-modular-mid' });

    const fmtPay = (bps) => (Number(bps || 0) / 10000).toFixed(2).replace(/\.?0+$/, '') + '×';
    const isEmoji = (g) => /\p{Extended_Pictographic}/u.test(g);
    const clamp = (v, lo, hi, dflt) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : dflt);
    const oneOf = (v, list, dflt) => (list.indexOf(v) >= 0 ? v : dflt);
    const easeOut = (t) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
    const clear = (n) => { while (n.firstChild) n.removeChild(n.firstChild); };

    // ── the look the Slot Lab set (clamped here — never trusted as given) ────
    const BRAKE_MS = { hard: 140, soft: 380, softer: 650 };
    const readLook = (raw) => {
      const p = (raw && typeof raw.physics === 'object' && raw.physics) || {};
      const a = (raw && typeof raw.animation === 'object' && raw.animation) || {};
      const ps = (p.start && typeof p.start === 'object' && p.start) || {};
      const pr = (p.run && typeof p.run === 'object' && p.run) || {};
      const po = (p.stop && typeof p.stop === 'object' && p.stop) || {};
      const aw = (a.win && typeof a.win === 'object' && a.win) || {};
      const at = (a.tiers && typeof a.tiers === 'object' && a.tiers) || {};
      const af = (a.feature && typeof a.feature === 'object' && a.feature) || {};
      const ac = (a.cascade && typeof a.cascade === 'object' && a.cascade) || {};
      const dp = (raw && typeof raw.display === 'object' && raw.display) || {};
      const step = (o, dflt) => {
        const t = (o && typeof o === 'object' && o) || {};
        return {
          fromX: clamp(t.fromX, 1, 100000, dflt),
          on: oneOf(t.notice, ['off', 'toast', 'banner', 'fullscreen'], 'banner') !== 'off',
          particles: t.particles === true,
          shake: t.shake === true,
        };
      };
      return {
        drop: p.mode === 'drop',
        pullback: clamp(ps.pullback, 0, 1, 0.6),
        startStagger: clamp(ps.staggerMs, 0, 400, 80),
        up: pr.direction === 'up',
        speed: clamp(pr.speed, 4, 30, 14) / 1000,        // cells per ms
        minSecs: clamp(pr.minSecs, 0.3, 3, 0.9),
        order: oneOf(po.order, ['ltr', 'rtl', 'together'], 'ltr'),
        stopStagger: clamp(po.staggerMs, 0, 600, 220),
        brake: BRAKE_MS[oneOf(po.brake, ['hard', 'soft', 'softer'], 'soft')],
        bounce: clamp(po.bounce, 0, 1, 0.7),
        lines: oneOf(aw.lines, ['pulse', 'trace', 'solid', 'off'], 'pulse'),
        cycle: aw.cycle !== false,
        symbols: oneOf(aw.symbols, ['pulse', 'bounce', 'flash', 'off'], 'pulse'),
        countUp: aw.countUp !== false,
        tiers: [
          { key: 'big', ...step(at.big, 10) },
          { key: 'mega', ...step(at.mega, 25) },
          { key: 'epic', ...step(at.epic, 100) },
        ],
        featStart: oneOf(af.start, ['off', 'toast', 'banner', 'fullscreen'], 'banner') !== 'off',
        featEnd: oneOf(af.end, ['off', 'toast', 'banner', 'fullscreen'], 'banner') !== 'off',
        featRetrigger: oneOf(af.retrigger, ['off', 'toast', 'banner', 'fullscreen'], 'toast') !== 'off',
        // Kaskade: wie sich ein Gewinner aufloest und wie lange nachgerutscht wird.
        clear: oneOf(ac.clear, ['pop', 'fade', 'shrink', 'burst', 'drop'], 'pop'),
        clearMs: clamp(ac.clearSecs, 0.15, 1.2, 0.35) * 1000,
        fallMs: clamp(ac.fallSecs, 0.15, 1.2, 0.3) * 1000,
        // Darstellung (26.10.2026): die nummerierten Kreise je Gewinnlinie neben den Walzen.
        // Standard AUS — ohne sie bekommen die Walzen die ganze Breite.
        badges: dp.lineBadges === true,
      };
    };

    // ── the render spec: the outcome's own echo first, else the game's config ─
    const dim = (v, dflt) => (Number.isInteger(v) && v >= 1 && v <= 6 ? v : dflt);
    const readSpec = (o) => {
      const raw = (o && o.engineConfig) || ctx.engineConfig || {};
      const reels = dim(raw.reels, 5);
      const rows = dim(raw.rows, 3);
      const symbols = Array.isArray(raw.symbols) ? raw.symbols.filter((s) => s && typeof s.id === 'string') : [];
      const paylines = Array.isArray(raw.paylines)
        ? raw.paylines.filter((l) => Array.isArray(l) && l.length === reels && l.every((r) => Number.isInteger(r) && r >= 0 && r < rows))
        : [];
      const lineCount = Number.isInteger(raw.lineCount) ? raw.lineCount : (paylines.length || 20);
      const fallback = reels === 5 && rows === 3 ? PAYLINES_5X3.slice(0, Math.min(20, Math.max(0, lineCount))) : [];
      const winType = raw.winType === 'ways' || raw.winType === 'sum' ? raw.winType : 'lines';
      return {
        reels,
        rows,
        winType,
        ways: Number.isInteger(raw.ways) ? raw.ways : 0,
        symbols: symbols.length ? symbols : DEFAULT_SYMBOLS,
        paylines: paylines.length ? paylines : fallback,
        lineCount,
        // Walzenstreifen (engineVersion 2): die echte Reihenfolge der Walze.
        // Damit dreht die Anzeige den Streifen, den der Server benutzt —
        // gestapelte Symbole sieht man dann auch WAEHREND des Drehens, statt
        // erst im Endbild. Verraet nichts: wo die Walze stehen bleibt, steht
        // nirgends, und das Endbild kommt weiter aus `details.grid`.
        strips: Array.isArray(raw.strips) && raw.strips.length === reels
          && raw.strips.every((st) => Array.isArray(st) && st.length >= 2 && st.every((v) => Number.isInteger(v) && v >= 0 && v < (symbols.length || DEFAULT_SYMBOLS.length)))
          ? raw.strips
          : null,
        look: readLook(raw.presentation),
      };
    };

    // ── geometry: the grid fills the panel, whatever its size ────────────────
    let spec = readSpec(null);
    let GEO = null;
    // ── line badges: numbered circles at the row where each line enters / leaves ──
    // Only with `presentation.display.lineBadges` (Slot Lab, 26.10.2026). They take side
    // width from the reels; without them the reels keep the whole panel.
    const BADGE_D = 3.6, BADGE_STEP = 4, BADGE_GAP = 1.2;
    const badgePlan = (sp) => {
      if (!sp.look.badges || sp.winType !== 'lines' || sp.reels < 3 || !sp.paylines.length) return null;
      const byRow = (pick) => {
        const rows = [];
        for (let r = 0; r < sp.rows; r++) rows.push([]);
        sp.paylines.forEach((l, i) => rows[l[pick]].push(i));
        return rows;
      };
      const left = byRow(0), right = byRow(sp.reels - 1);
      let most = 1;
      for (const g of left.concat(right)) most = Math.max(most, g.length);
      const cols = most <= 4 ? 1 : most <= 8 ? 2 : 3;
      return { left, right, cols, width: (cols - 1) * BADGE_STEP + BADGE_D + BADGE_GAP, key: sp.paylines.length + ':' + cols };
    };
    const layout = () => {
      const bp = badgePlan(spec);
      const availW = PANEL.w - 6 - (bp ? 2 * bp.width : 0), availH = PANEL.h - 6;
      const pitch = Math.min(availW / spec.reels, availH / spec.rows, 22);
      const cell = pitch * 0.9;
      const gx = PANEL.x + (PANEL.w - spec.reels * pitch) / 2 + (pitch - cell) / 2;
      const gy = PANEL.y + (PANEL.h - spec.rows * pitch) / 2 + (pitch - cell) / 2;
      GEO = { pitch, cell, half: cell / 2, gx, gy, bp, badgeKey: bp ? bp.key : '' };
    };
    const cx = (r) => GEO.gx + r * GEO.pitch + GEO.half;
    const cy = (row) => GEO.gy + row * GEO.pitch + GEO.half;
    const glyphSize = (g) => {
      const base = GEO.cell / 16;
      if (isEmoji(g)) return 6.8 * base;
      const n = g.length;
      return (n <= 1 ? 7.4 : n === 2 ? 5.8 : 4.4) * base;
    };

    /** Die Schriftgroesse auf der Muenze: kurzer Wert gross, langer klein. */
    const coinFont = (txt) => (GEO.cell / 16) * (txt.length <= 3 ? 4.8 : txt.length <= 4 ? 4.0 : txt.length <= 5 ? 3.4 : 2.9);
    /**
     * Eine Muenze auf Zelle `cellIdx` (Walze·Reihen + Reihe) mit ihrem WERT
     * darauf. Der Wert kommt aus dem Ergebnis und wird ueber `ctx.fmt.mult`
     * geschrieben — dieselbe Schreibweise wie im Auszahlungs-Text, samt
     * Dezimalzeichen der Sprache.
     */
    const makeCoin = (cellIdx, valueBps) => {
      const i = Math.floor(cellIdx / spec.rows);
      const row = cellIdx % spec.rows;
      const g = el('g', { transform: 'translate(' + cx(i) + ' ' + cy(row).toFixed(3) + ')' }, coinsG);
      el('circle', { r: (GEO.half * 0.88).toFixed(3), class: C + '-coin-disc' }, g);
      el('circle', { r: (GEO.half * 0.66).toFixed(3), class: C + '-coin-ring' }, g);
      const txt = ctx.fmt.mult(valueBps);
      const t = el('text', { x: 0, y: (GEO.cell / 34).toFixed(3), class: C + '-coin-val', 'font-size': coinFont(txt).toFixed(3) }, g);
      t.textContent = txt;
      return g;
    };
    /** Alle Muenzen eines Schritts setzen; `neu` bekommt den Auftritt. */
    const paintCoins = (coins, neu) => {
      clear(coinsG);
      const frisch = [];
      for (const [cellIdx, v] of coins) {
        const g = makeCoin(cellIdx, v);
        if (neu && neu.has(cellIdx)) {
          g.setAttribute('opacity', '0');
          frisch.push(g);
        }
      }
      return frisch;
    };
    /** Auftritt einer frisch gelandeten Muenze: kurz ueber die Zielgroesse hinaus. */
    const coinIn = (gs, u) => {
      const p = Math.max(0, Math.min(1, u));
      const scale = p >= 1 ? 1 : 0.35 + 0.75 * p - 0.1 * Math.sin(Math.PI * p);
      for (const g of gs) {
        g.setAttribute('opacity', p.toFixed(3));
        const tr = g.getAttribute('transform').split(' scale')[0];
        g.setAttribute('transform', tr + ' scale(' + scale.toFixed(4) + ')');
      }
    };

    // ── reels: endless virtual strips ───────────────────────────────────────
    let reel = [];
    const filler = (symbols, r, j) => { const n = symbols.length; return symbols[(((j * 3 + r * 5) % n) + n) % n].id; };
    /** Was auf Walze r an Position k steht, waehrend sie laeuft. Mit Streifen
     *  ist das der Streifen selbst; ohne einen die alte Fuellfolge. */
    const running = (r, k) => {
      const st = spec.strips && spec.strips[r];
      if (!st) return filler(spec.symbols, r, k);
      const sym = spec.symbols[st[(((k % st.length) + st.length) % st.length)]];
      return sym ? sym.id : filler(spec.symbols, r, k);
    };
    const contentOf = (R, r, k) => (R.placed.has(k) ? R.placed.get(k) : running(r, k));
    const makeCell = (parent, id, x, y) => {
      const art = symbolArt(id);
      const g = el('g', { class: 'sca-slots-modular-cell', transform: 'translate(' + x + ' ' + y.toFixed(3) + ')' }, parent);
      el('rect', { x: -GEO.half, y: -GEO.half, width: GEO.cell, height: GEO.cell, rx: GEO.cell / 10 }, g);
      const t = el('text', { x: 0, y: GEO.cell / 53, class: 'sca-slots-modular-glyph', style: 'fill:' + art.tint, 'font-size': glyphSize(art.glyph) }, g);
      t.textContent = art.glyph;
      return g;
    };
    const setCell = (c, hot, lift, scale) => {
      if (hot) c.g.setAttribute('data-hot', hot); else c.g.removeAttribute('data-hot');
      c.g.setAttribute('transform', 'translate(' + c.cx + ' ' + (c.cy - lift).toFixed(3) + ') scale(' + scale.toFixed(4) + ')');
    };
    /**
     * Eine Zelle frei stellen — fuer die Kaskade: verschieben (dy nach UNTEN),
     * skalieren, ausblenden, drehen. `setCell` reicht dafuer nicht, weil es
     * weder Deckkraft noch Drehung kennt und `lift` nach OBEN zeigt.
     */
    const placeCell = (c, dy, scale, opacity, rot) => {
      c.g.setAttribute(
        'transform',
        'translate(' + c.cx + ' ' + (c.cy + dy).toFixed(3) + ') scale(' + scale.toFixed(4) + ')'
          + (rot ? ' rotate(' + rot.toFixed(1) + ')' : ''),
      );
      c.g.setAttribute('opacity', opacity.toFixed(3));
    };
    /** Wie eine gewinnende Zelle verschwindet — `u` laeuft von 0 bis 1. */
    const clearFrame = (c, u, art) => {
      const p = Math.max(0, Math.min(1, u));
      switch (art) {
        case 'fade':
          placeCell(c, 0, 1, 1 - p, 0);
          break;
        case 'shrink':
          placeCell(c, 0, Math.max(0.001, 1 - p), 1 - p * 0.4, 0);
          break;
        case 'burst':
          // Auseinanderfliegen: groesser, drehend, durchsichtig.
          placeCell(c, -GEO.cell * 0.25 * p, 1 + 0.9 * p, 1 - p, 140 * p);
          break;
        case 'drop':
          // Durchfallen: beschleunigt nach unten aus dem Fenster.
          placeCell(c, GEO.pitch * spec.rows * p * p, 1, 1 - p * p, 0);
          break;
        default:
          // 'pop': kurz groesser, dann weg.
          placeCell(c, 0, 1 + 0.35 * Math.sin(Math.PI * p), 1 - p * p, 0);
      }
    };
    // Put reel r at k0: paint the cells around the window, drop the ones out of reach.
    const setK = (R, r, k0) => {
      R.k0 = k0;
      const lo = Math.floor(k0) - 1, hi = Math.floor(k0) + spec.rows;
      for (const k of Array.from(R.cells.keys())) if (k < lo || k > hi) { R.g.removeChild(R.cells.get(k).g); R.cells.delete(k); }
      for (let k = lo; k <= hi; k++) if (!R.cells.has(k)) R.cells.set(k, { g: makeCell(R.g, contentOf(R, r, k), cx(r), cy(k)), cx: cx(r), cy: cy(k) });
      R.g.setAttribute('transform', 'translate(0 ' + (-k0 * GEO.pitch).toFixed(3) + ')');
    };
    const calmCells = (R) => { for (const c of R.cells.values()) setCell(c, null, 0, 1); };
    /** Rebuild the strips for the current spec (grid size changed or first mount). */
    const buildReels = () => {
      layout();
      clear(stripsG);
      clear(defs);
      reel = [];
      for (let r = 0; r < spec.reels; r++) {
        const cp = el('clipPath', { id: uid + '-' + r }, defs);
        // Genau das Fenster: die erste Zelle beginnt bei `gy`, die letzte endet bei
        // `gy + (rows-1)·pitch + cell`. Ein halber Zellabstand mehr liess oben eine
        // Reihe ueber den Rahmen laufen (08.09.2026, im Bild gesehen).
        el('rect', { x: cx(r) - GEO.half - 0.6, y: GEO.gy - 0.6, width: GEO.cell + 1.2, height: (spec.rows - 1) * GEO.pitch + GEO.cell + 1.2 }, cp);
        const g = el('g', { 'clip-path': 'url(#' + uid + '-' + r + ')' }, stripsG);
        reel.push({ g: el('g', {}, g), k0: 0, cells: new Map(), placed: new Map() });
      }
      reel.forEach((R, r) => setK(R, r, 0));
      drawBadges();
    };
    /** Grid size, line count or the badge choice changed → the layout must be rebuilt. */
    const needsBuild = () => !GEO || reel.length !== spec.reels || GEO.badgeKey !== (badgePlan(spec) || { key: '' }).key;

    // Each badge: { g, line, hot }. Drawn once per layout; a play only flips `data-hot`.
    let badges = [];
    const drawBadges = () => {
      clear(badgesG);
      badges = [];
      const bp = GEO.bp;
      if (!bp) return;
      const gridL = PANEL.x + (PANEL.w - spec.reels * GEO.pitch) / 2;
      const gridR = gridL + spec.reels * GEO.pitch;
      const side = (groups, dir) => {
        groups.forEach((ids, row) => {
          if (!ids.length) return;
          const perCol = Math.ceil(ids.length / bp.cols);
          const slot = GEO.pitch / perCol;
          const d = Math.min(BADGE_D, slot * 0.88);
          ids.forEach((line, j) => {
            const col = Math.floor(j / perCol), k = j % perCol;
            const inCol = Math.min(perCol, ids.length - col * perCol);
            const x = dir < 0 ? gridL - BADGE_GAP - BADGE_D / 2 - col * BADGE_STEP : gridR + BADGE_GAP + BADGE_D / 2 + col * BADGE_STEP;
            const y = cy(row) + (k - (inCol - 1) / 2) * slot;
            const g = el('g', { class: 'sca-slots-modular-badge', transform: 'translate(' + x.toFixed(3) + ' ' + y.toFixed(3) + ')' }, badgesG);
            el('circle', { r: (d / 2).toFixed(3) }, g);
            const tx = el('text', { 'font-size': (d * (line + 1 >= 10 ? 0.5 : 0.58)).toFixed(3) }, g);
            tx.textContent = String(line + 1);
            badges.push({ g, line, hot: false });
          });
        });
      };
      side(bp.left, -1);
      side(bp.right, 1);
    };
    /** Light the badges of the lines on screen (`null`: none). */
    const markBadges = (hot) => {
      for (const b of badges) {
        const on = !!hot && hot.has(b.line);
        if (on === b.hot) continue;
        b.hot = on;
        if (on) b.g.setAttribute('data-hot', 'line'); else b.g.removeAttribute('data-hot');
      }
    };
    const clearLines = () => { clear(linesG); markBadges(null); };

    const packDetail = (entries) => {
      const lines = []; let cur = ''; let i = 0;
      for (; i < entries.length; i++) {
        const cand = cur ? cur + ' · ' + entries[i] : entries[i];
        if (cand.length <= MAXC) { cur = cand; continue; }
        if (lines.length === 1) break;
        lines.push(cur); cur = entries[i];
      }
      if (i < entries.length) cur += ' ' + ctx.text('reveal.more', { n: entries.length - i });
      lines.push(cur);
      return lines;
    };
    const showIdleText = (sp) => {
      readG.setAttribute('visibility', 'hidden'); idleG.removeAttribute('visibility');
      stepT.textContent = '';
      box.removeAttribute('data-tone');
      // the readout nodes are EMPTIED, not just hidden — a previous round's figures must
      // not sit in the DOM while the reels spin (docs/RULES.md, rule 16)
      tier.textContent = ''; mult.textContent = ''; out.textContent = ''; fiat.textContent = ''; det1.textContent = ''; det2.textContent = '';
      const pay = sp.symbols.filter((s) => !s.wild && !s.scatter && Array.isArray(s.paysBps))
        .map((s) => ({ id: s.id, top: Number(s.paysBps[2] || 0) })).sort((a, b) => b.top - a.top);
      const fmt = (s) => s.id + ' ' + fmtPay(s.top);
      idle1.textContent = ctx.text('reveal.slotsm.paytable');
      idle2.textContent = pay.slice(0, 3).map(fmt).join(' · ') || '—';
      idle3.textContent = pay.slice(3, 6).map(fmt).join(' · ');
      const hasWild = sp.symbols.some((s) => s.wild), hasSc = sp.symbols.some((s) => s.scatter);
      const bits = [winLabel(sp)];
      if (hasWild) bits.push(ctx.text('reveal.slotsm.wilds'));
      if (hasSc) bits.push(ctx.text('reveal.slotsm.scatters'));
      idle4.textContent = bits.join(' · ');
    };
    const winLabel = (sp) =>
      sp.winType === 'ways' ? ctx.text('reveal.slotsm.ways', { n: sp.ways || Math.pow(sp.rows, sp.reels) })
        : sp.winType === 'sum' ? ctx.text('reveal.slotsm.total')
          : ctx.text('reveal.slotsm.lines', { n: sp.lineCount });
    const setHeader = (sp, o) => {
      headL.textContent = ctx.text('reveal.slotsm.grid', { reels: sp.reels, rows: sp.rows }) + ' · ' + winLabel(sp);
      headR.textContent = o && o.betLamports != null ? ctx.text('reveal.bet', { amount: ctx.fmt.sol(o.betLamports) }) : ctx.text('reveal.slotsm.spin');
    };
    /** Which win step a multiplier reaches — the highest whose threshold it meets. */
    const tierOf = (look, bps) => {
      const x = Number(bps || 0) / 10000;
      let hit = null;
      for (const t of look.tiers) if (x >= t.fromX && t.on) hit = t;
      return hit;
    };

    // ── readout ─────────────────────────────────────────────────────────────
    const detailEntries = (d) => {
      const entries = d.lineWins.map((w) => 'L' + (w.line + 1) + ' ' + w.symbol + '×' + w.count + ' ' + fmtPay(w.payBps));
      for (const w of d.wayWins) entries.push(w.symbol + '×' + w.count + ' ' + fmtPay(w.payBps));
      for (const w of d.sumWins) entries.push(w.symbol + '×' + w.count + ' ' + fmtPay(w.payBps));
      if (d.scatterPayBps > 0) entries.push('scatter×' + d.scatterCount + ' ' + fmtPay(d.scatterPayBps));
      return entries;
    };
    const showReadout = (o, d, look, amountBps) => {
      idleG.setAttribute('visibility', 'hidden'); readG.removeAttribute('visibility');
      const win = !!o.win;
      box.setAttribute('data-tone', win ? 'win' : 'loss');
      mult.textContent = ctx.fmt.mult(amountBps == null ? o.multiplierBps : amountBps);
      out.textContent = win ? ctx.fmt.won(o.payoutLamports) : ctx.fmt.lost();
      fiat.textContent = (win && ctx.fmt.fiat(o.payoutLamports)) || '';
      const st = tierOf(look, o.multiplierBps);
      if (st) { tier.textContent = ctx.text('reveal.slotsm.' + st.key); tier.setAttribute('data-tier', st.key); }
      else { tier.textContent = ''; tier.removeAttribute('data-tier'); }
      const entries = detailEntries(d);
      const lines = entries.length ? packDetail(entries) : [win ? '' : ctx.text('reveal.slotsm.noLine')];
      det1.textContent = lines[0] || ''; det2.textContent = lines[1] || '';
    };

    // ── confetti: deterministic from the outcome, never Math.random ──────────
    const confetti = (seed, n) => {
      clear(confG);
      const pieces = [];
      let h = (seed >>> 0) || 1;
      const next = () => { h ^= h << 13; h >>>= 0; h ^= h >> 17; h ^= h << 5; h >>>= 0; return h / 4294967296; };
      for (let i = 0; i < n; i++) {
        const x = PANEL.x + next() * PANEL.w;
        const g = el('rect', { x: -0.7, y: -1.1, width: 1.4, height: 2.2, rx: 0.3, fill: PALETTE[i % PALETTE.length], opacity: 0 }, confG);
        pieces.push({ g, x, delay: next() * 400, dur: 900 + next() * 500, drift: (next() - 0.5) * 18, spin: 180 + next() * 540 });
      }
      return pieces;
    };

    // ── motion ──────────────────────────────────────────────────────────────
    // A run from rest ramps linearly over ACCEL ms to cruise speed; a run that continues
    // a pre-roll has `ramp` ms of that ramp left. `off` is the time a ramped run lags
    // behind a constant one — it makes the stop-time equation exact either way.
    let look = spec.look;
    const ACCEL = 160;
    const runOf = (ramp, v) => {
      const v0 = v * (1 - ramp / ACCEL), acc = ramp > 0 ? (v - v0) / ramp : 0;
      return {
        off: ramp * ramp / (2 * ACCEL),
        dist: (t) => (t <= 0 ? 0 : t < ramp ? v0 * t + acc * t * t / 2 : v0 * ramp + acc * ramp * ramp / 2 + v * (t - ramp)),
      };
    };
    let raf = 0, pending = null, armed = null;
    const cancel = () => {
      if (raf) cancelAnimationFrame(raf); raf = 0;
      if (pending) { const p = pending; pending = null; p(); }
    };
    const rolledK = (a, r, rolled) => (a.reduced ? a.k[r] : a.k[r] - runOf(ACCEL, look.speed).dist(rolled) * (look.up ? -1 : 1));
    const setShake = (on) => { shakeG.setAttribute('transform', on ? 'translate(' + on.x.toFixed(2) + ' ' + on.y.toFixed(2) + ')' : 'translate(0 0)'); };

    /**
     * The plan of one spin: per reel where it is, where the grid goes, when it stops.
     * `grid` may be a sub-step's grid (feature playback) — the model is the same.
     */
    const planSpin = (grid, from, rolled, quick, frozen) => {
      const dir = look.up ? -1 : 1;
      const stopIdx = (r) => (look.order === 'together' ? 0 : look.order === 'rtl' ? spec.reels - 1 - r : r);
      const minRun = (quick ? 0.25 : look.minSecs) * 1000;
      const stagger = quick ? Math.min(90, look.stopStagger) : look.stopStagger;
      const brake = quick ? Math.min(220, look.brake) : look.brake;
      return reel.map((R, r) => {
        // Eine Walze, auf der jede Zelle gehalten ist, dreht sich nicht — sie
        // bekommt gar keinen Plan und bleibt, wo sie steht.
        if (frozen && frozen[r]) return null;
        calmCells(R);
        const k0 = from ? from[r] : R.k0;
        const ramp = rolled > 0 ? Math.max(0, ACCEL - rolled) : ACCEL;
        const run = runOf(ramp, look.speed);
        const startDelay = quick ? 0 : (r * look.startStagger);
        const minTs = Math.max(minRun, ramp) + stopIdx(r) * stagger + startDelay;
        // the grid lands ≥ AHEAD cells ahead — never inside the painted window
        const dMin = Math.max(AHEAD, look.speed * (minTs - run.off + brake / 3));
        let cells = Math.ceil(dMin);
        // Mit Streifen soll das Endbild AUF dem Streifen liegen: die Stelle
        // suchen, an der er genau dieses Fenster zeigt, und so weit
        // weiterdrehen, dass die Walze dort haelt. Findet sich keine (etwa
        // weil Echo und Runde nicht zusammenpassen), bleibt es beim alten Weg
        // — das Endbild kommt ohnehin aus `placed`, nie aus dem Streifen.
        const st = spec.strips && spec.strips[r];
        if (st && grid[r]) {
          const L = st.length;
          const wanted = [];
          for (let row = 0; row < spec.rows; row++) wanted.push(grid[r][row]);
          let at = -1;
          for (let q = 0; q < L && at < 0; q++) {
            let hit = true;
            for (let row = 0; row < spec.rows && hit; row++) {
              const sym = spec.symbols[st[(q + row) % L]];
              if (!sym || sym.id !== wanted[row]) hit = false;
            }
            if (hit) at = q;
          }
          if (at >= 0) {
            const kTry = k0 - dir * cells;
            const off = (((kTry - at) % L) + L) % L;
            if (off > 0) cells += dir > 0 ? off : L - off;
          }
        }
        const kG = k0 - dir * cells;
        const ts = cells / look.speed + run.off - brake / 3;
        // Kein Symbol vorgegeben (Hold-&-Spin-Respin auf freien Zellen) ⇒ die
        // Walze laeuft einfach weiter; `contentOf` nimmt dann den Streifen bzw.
        // die Fuellfolge. Frueher stand dort ein '?' im Raster.
        for (let row = 0; row < spec.rows; row++) {
          const id = grid[r] && grid[r][row] != null ? grid[r][row] : null;
          if (id === null) R.placed.delete(kG + row);
          else R.placed.set(kG + row, id);
        }
        return { k0, kG, ts, run, brake, dir, startDelay };
      });
    };
    const kAt = (p, t) => {
      const tt = t - p.startDelay;
      if (tt >= p.ts + p.brake) return p.kG;
      if (tt <= 0) return p.k0;
      if (tt < p.ts) return p.k0 - p.dir * p.run.dist(tt);
      const u = (tt - p.ts) / p.brake;
      const over = look.bounce * 0.4;
      // the ease-out lands exactly on the grid; with bounce it overshoots and returns
      const reach = p.run.dist(p.ts) + look.speed * p.brake / 3 * (1 - Math.pow(1 - u, 3));
      const wobble = over > 0 ? over * Math.sin(Math.PI * Math.min(1, u)) * (1 - u) : 0;
      return p.k0 - p.dir * (reach + wobble);
    };
    const spinEnd = (plan) => {
      const ends = plan.filter(Boolean).map((p) => p.startDelay + p.ts + p.brake);
      return ends.length ? Math.max.apply(null, ends) : 0;
    };
    /** Pullback: a short nudge against the running direction before the reels leave. */
    const PULL_MS = 120;

    idle();
    root.dataset.state = 'idle';

    function idle() {
      spec = readSpec(null);
      look = spec.look;
      if (needsBuild()) buildReels();
      clearLines();
      clear(confG);
      clear(coinsG);
      setShake(null);
      setHeader(spec, null);
      reel.forEach((R, r) => { calmCells(R); setK(R, r, Math.round(R.k0)); });
      showIdleText(spec);
    }

    return {
      play(o, opts) {
        cancel();
        const a = armed; armed = null;
        const now = performance.now();
        const rolled = a ? now - a.t0 : 0;
        root.dataset.state = 'playing';
        o = o || {};
        const prevReels = spec.reels, prevRows = spec.rows;
        spec = readSpec(o);
        look = spec.look;
        if (!GEO || spec.reels !== prevReels || spec.rows !== prevRows || needsBuild()) buildReels();
        const dd = o.details || {};
        const grid = Array.isArray(dd.grid) ? dd.grid : [];
        const d = {
          lineWins: Array.isArray(dd.lineWins) ? dd.lineWins.filter((w) => w && Number.isInteger(w.line)) : [],
          wayWins: Array.isArray(dd.wayWins) ? dd.wayWins.filter((w) => w && typeof w.symbol === 'string') : [],
          sumWins: Array.isArray(dd.sumWins) ? dd.sumWins.filter((w) => w && typeof w.symbol === 'string') : [],
          scatterCount: typeof dd.scatterCount === 'number' ? dd.scatterCount : 0,
          scatterPayBps: typeof dd.scatterPayBps === 'number' ? dd.scatterPayBps : 0,
          // Bonus-Symbol (08.09.2026): mit einem loest ES aus, nicht der Scatter.
          bonusCount: typeof dd.bonusCount === 'number' ? dd.bonusCount : null,
          triggered: !!(dd.freeSpins || dd.holdAndSpin),
        };
        setHeader(spec, o);
        clearLines();
        clear(confG);
        clear(coinsG);
        setShake(null);
        showIdleText(spec); idleG.setAttribute('visibility', 'hidden');
        stepT.textContent = '';

        const from = a ? reel.map((R, r) => rolledK(a, r, rolled)) : null;
        const plan = planSpin(grid, from, a && !a.reduced ? rolled : 0, false);
        const T = spinEnd(plan);
        const gridCell = (r, row) => reel[r].cells.get(plan[r].kG + row);

        // ── what happens after the reels stand: lines, hits, readout ─────────
        const LINE0 = T + LINE_WAIT;
        const lines = [];
        const liftAt = new Map();
        const cellsOfLine = (w) => {
          const geo = spec.paylines[w.line];
          if (!geo) return [];
          const pts = [];
          for (let k = 0; k < Math.min(spec.reels, Math.max(0, w.count | 0)); k++) {
            const r = w.direction === 'rtl' ? spec.reels - 1 - k : k;
            const row = Math.min(spec.rows - 1, Math.max(0, geo[r] | 0));
            pts.push({ r, row });
          }
          return pts;
        };
        if (look.lines !== 'off') {
          d.lineWins.forEach((w, i) => {
            const cells = cellsOfLine(w);
            if (cells.length < 2) return;
            const t0 = LINE0 + (look.cycle ? i * LINE_GAP : 0);
            let len = 0;
            const pts = cells.map((c) => ({ x: cx(c.r), y: cy(c.row) }));
            for (let j = 1; j < pts.length; j++) len += Math.hypot(pts[j].x - pts[j - 1].x, pts[j].y - pts[j - 1].y);
            for (const c of cells) { const key = c.r + ':' + c.row; if (!liftAt.has(key)) liftAt.set(key, t0); }
            const pl = el('polyline', { class: 'sca-slots-modular-line', points: pts.map((p) => p.x + ',' + p.y).join(' '),
              'stroke-dasharray': len, 'stroke-dashoffset': look.lines === 'trace' ? len : 0, visibility: 'hidden' }, linesG);
            lines.push({ pl, len, t0, line: w.line });
          });
        }
        // All-Way / total hits light their cells too — they have no line to trace.
        const wildId = (spec.symbols.find((s) => s.wild) || {}).id;
        const markCell = (r, row, t0) => { const key = r + ':' + row; if (!liftAt.has(key)) liftAt.set(key, t0); };
        d.wayWins.forEach((w, i) => {
          const t0 = LINE0 + (look.cycle ? i * LINE_GAP : 0);
          for (let r = 0; r < Math.min(w.count | 0, spec.reels); r++)
            for (let row = 0; row < spec.rows; row++) {
              const id = grid[r] && grid[r][row];
              if (w.wildOnly ? id === wildId : id === w.symbol || id === wildId) markCell(r, row, t0);
            }
        });
        d.sumWins.forEach((w, i) => {
          const t0 = LINE0 + (look.cycle ? i * LINE_GAP : 0);
          for (let r = 0; r < spec.reels; r++) for (let row = 0; row < spec.rows; row++) if (grid[r] && grid[r][row] === w.symbol) markCell(r, row, t0);
        });

        const scatterIds = new Set(spec.symbols.filter((s) => s.scatter).map((s) => s.id));
        // Mit Bonus-Symbol leuchten AUCH die Bonus-Zellen — aber nur, wenn das
        // Feature wirklich ausgeloest hat. Die Schwelle steht in der Config;
        // das Ergebnis sagt es genauer als jede nachgebaute Regel.
        const bonusIds = new Set(spec.symbols.filter((s) => s.bonus).map((s) => s.id));
        const scatterAt = [];
        const hot = (r, row) => {
          const id = grid[r] && grid[r][row];
          if (liftAt.has(r + ':' + row)) return false;
          if (d.scatterCount >= 3 && scatterIds.has(id)) return true;
          return d.triggered && bonusIds.has(id);
        };
        if (d.scatterCount >= 3 || (d.triggered && bonusIds.size)) {
          for (let r = 0; r < spec.reels; r++) for (let row = 0; row < spec.rows; row++) if (hot(r, row)) scatterAt.push([r, row]);
        }
        const nLines = Math.max(lines.length, d.wayWins.length, d.sumWins.length);
        let R0 = T + 300;
        if (nLines) R0 = Math.max(R0, LINE0 + (look.cycle ? nLines * LINE_GAP : LINE_DRAW) + 80);
        if (scatterAt.length) R0 = Math.max(R0, LINE0 + PULSE_MS + 80);
        const winTier = tierOf(look, o.multiplierBps);
        const countMs = look.countUp && o.win ? Math.min(1200, 400 + nLines * 120) : 0;
        const conf = winTier && winTier.particles ? confetti((Number(o.multiplierBps) | 0) + spec.reels * 7919, 26) : [];
        const doShake = !!(winTier && winTier.shake);

        // ── feature playback: every sub-step is a short re-spin ──────────────
        const steps = [];
        const fs = dd.freeSpins;
        if (fs && Array.isArray(fs.spins) && fs.spins.length) {
          const m = typeof fs.multiplierBps === 'number' && fs.multiplierBps > 0 ? fs.multiplierBps / 10000 : 1;
          let running = 0;
          fs.spins.forEach((sp, i) => {
            const pay = Math.round(((sp.lineWins || []).reduce((x, w) => x + (w.payBps || 0), 0)
              + (sp.wayWins || []).reduce((x, w) => x + (w.payBps || 0), 0)
              + (sp.sumWins || []).reduce((x, w) => x + (w.payBps || 0), 0)
              + (sp.scatterPayBps || 0)) * m);
            running += pay;
            steps.push({ kind: 'freeSpin', i: i + 1, n: fs.spins.length, grid: sp.grid || [], pay, running, more: sp.awardedMore || 0 });
          });
          if (steps.length) steps[steps.length - 1].totalBps = typeof fs.totalWinBps === 'number' ? fs.totalWinBps : running;
        }
        const hs = dd.holdAndSpin;
        if (hs && Array.isArray(hs.respins) && hs.respins.length) {
          // Die gehaltenen Muenzen: Zelle → Wert. Zellen und Werte der
          // STARTmuenzen kommen vom Server (`startCells`/`startCoins`); fehlen
          // sie (Alt-Runde), werden die Ausloeser-Zellen aus dem Raster gelesen.
          const coins = new Map();
          const sc = Array.isArray(hs.startCells) ? hs.startCells : [];
          const sv = Array.isArray(hs.startCoins) ? hs.startCoins : [];
          sc.forEach((cellIdx, k) => { if (Number.isInteger(cellIdx)) coins.set(cellIdx, sv[k] || 0); });
          if (!coins.size) {
            const triggerIds = new Set(spec.symbols.filter((sy) => sy.bonus || sy.scatter).map((sy) => sy.id));
            let k = 0;
            grid.forEach((col, r) => (col || []).forEach((id, row) => {
              if (triggerIds.has(id)) coins.set(r * spec.rows + row, sv[k++] || 0);
            }));
          }
          // Erster Schritt: die Ausloeser WERDEN zu Muenzen — ohne Drehen, nur
          // die Verwandlung. Ohne diesen Schritt taeuchten die Muenzen einfach auf.
          steps.push({ kind: 'hsStart', coins: [...coins], neu: [...coins.keys()], frozen: null, grid: null, pay: 0, running: 0 });
          hs.respins.forEach((rs, i) => {
            const neu = [];
            (rs.cells || []).forEach((cellIdx, k) => {
              coins.set(cellIdx, (rs.landed || [])[k] || 0);
              neu.push(cellIdx);
            });
            // Eine Walze, auf der jede Zelle eine Muenze traegt, steht still.
            const frozen = [];
            for (let r = 0; r < spec.reels; r++) {
              let alle = true;
              for (let row = 0; row < spec.rows; row++) if (!coins.has(r * spec.rows + row)) { alle = false; break; }
              frozen.push(alle);
            }
            // Freie Zellen bekommen KEIN Symbol vorgegeben: die Walze laeuft
            // dort einfach weiter, statt jedes Mal dasselbe Bild zu zeigen.
            const g = [];
            for (let r = 0; r < spec.reels; r++) {
              const col = [];
              for (let row = 0; row < spec.rows; row++) col.push(null);
              g.push(col);
            }
            steps.push({
              kind: 'respin', i: i + 1, n: hs.respins.length, grid: g, pay: 0, running: 0,
              locked: coins.size, coins: [...coins], neu, frozen,
            });
          });
          if (steps.length) steps[steps.length - 1].totalBps = typeof hs.featureWinBps === 'number' ? hs.featureWinBps : 0;
        }
        const cs = dd.cascade;
        if (cs && Array.isArray(cs.steps) && cs.steps.length > 1) {
          let running = cs.steps[0] && typeof cs.steps[0].stepWinBps === 'number' ? cs.steps[0].stepWinBps : 0;
          cs.steps.slice(1).forEach((s2, i) => {
            running += s2.stepWinBps || 0;
            steps.push({
              kind: 'cascade', i: i + 2, n: cs.steps.length, grid: s2.grid || [],
              pay: s2.stepWinBps || 0, running,
              // Die Zellen, die der VORIGE Schritt geraeumt hat — sie loesen
              // sich auf, der Rest rutscht nach. Der Server sagt, welche.
              cleared: Array.isArray(cs.steps[i].clearedCells) ? cs.steps[i].clearedCells : null,
            });
          });
          if (steps.length) steps[steps.length - 1].totalBps = typeof cs.totalWinBps === 'number' ? cs.totalWinBps : running;
        }
        const stepMs = steps.length ? Math.max(FEAT_MIN_STEP, Math.min(FEAT_STEP, Math.floor(FEAT_MAX_MS / steps.length))) : 0;
        // Mit Feature laeuft die KETTE ZUERST, die Auszahlung danach. Sonst
        // stuende die Endsumme samt Wortmarke und Konfetti schon auf dem
        // Schirm, bevor man gesehen hat, wie sie zustande kam — und die
        // Schrittzeile liegt auf derselben Zeile wie die Wortmarke (y 70.5).
        const hasChain = steps.length > 0;
        const CEL_MS = HOLD + countMs + (conf.length ? 300 : 0);
        const BASE_END = hasChain ? R0 : R0 + CEL_MS;

        // ── frames ──────────────────────────────────────────────────────────
        const frame = (t) => {
          plan.forEach((p, r) => { if (p) setK(reel[r], r, kAt(p, t)); });
          for (const [key, t0] of liftAt) {
            const parts = key.split(':');
            const c = gridCell(Number(parts[0]), Number(parts[1]));
            if (!c) continue;
            const p = easeOut((t - t0) / LIFT_MS);
            let lift = 0, scale = 1;
            if (p > 0 && look.symbols !== 'off') {
              const u = (t - t0) / 700;
              if (look.symbols === 'bounce') lift = GEO.cell * 0.06 * Math.abs(Math.sin(Math.PI * u));
              else if (look.symbols === 'flash') scale = 1 + 0.04 * (Math.floor(u * 4) % 2);
              else scale = 1 + 0.06 * p * (0.7 + 0.3 * Math.sin(Math.PI * u * 2));
            }
            setCell(c, p > 0 ? 'line' : null, lift + (look.symbols === 'off' ? 0 : 0.7 * p * (GEO.cell / 16)), scale);
          }
          const hotLines = badges.length ? new Set() : null;
          for (const l of lines) {
            const p = easeOut((t - l.t0) / LINE_DRAW);
            if (p <= 0) { l.pl.setAttribute('visibility', 'hidden'); continue; }
            l.pl.removeAttribute('visibility');
            if (hotLines) hotLines.add(l.line);
            if (look.lines === 'trace') l.pl.setAttribute('stroke-dashoffset', (l.len * (1 - p)).toFixed(3));
            else if (look.lines === 'pulse') l.pl.setAttribute('opacity', (0.55 + 0.45 * Math.abs(Math.sin((t - l.t0) / 420))).toFixed(3));
          }
          if (hotLines) markBadges(hotLines);
          if (scatterAt.length) {
            const u = (t - LINE0) / PULSE_MS;
            const s = u <= 0 || u >= 1 ? 1 : 1 + 0.08 * Math.pow(Math.sin(2 * Math.PI * u), 2);
            for (const [r, row] of scatterAt) { const c = gridCell(r, row); if (c) setCell(c, u > 0 ? 'scatter' : null, 0, s); }
          }
          if (!hasChain) celebrate(t - R0, t);
        };

        /**
         * Die Feier: Auszahlung mit Hochzaehler, Wortmarke, Wackeln, Konfetti.
         * `u` ist die Zeit SEIT ihrem Beginn — ohne Feature faengt sie bei R0
         * an, mit Feature erst nach der letzten Feature-Runde.
         */
        const celebrate = (u, tAbs) => {
          if (u < 0) return;
          const p = countMs > 0 ? Math.min(1, u / countMs) : 1;
          showReadout(o, d, look, Math.round(Number(o.multiplierBps || 0) * easeOut(p)));
          readG.setAttribute('opacity', easeOut(u / 250).toFixed(3));
          if (doShake && u < SHAKE_MS) {
            const v = u / SHAKE_MS;
            const amp = 1.6 * (1 - v);
            setShake({ x: amp * Math.sin(tAbs / 22), y: amp * 0.5 * Math.sin(tAbs / 31) });
          } else setShake(null);
          for (const c of conf) {
            const v = (u - c.delay) / c.dur;
            if (v <= 0 || v >= 1) { c.g.setAttribute('opacity', 0); continue; }
            c.g.setAttribute('opacity', (1 - v).toFixed(2));
            c.g.setAttribute('transform', 'translate(' + (c.x + c.drift * v).toFixed(2) + ' ' + (PANEL.y + v * PANEL.h).toFixed(2) + ') rotate(' + (c.spin * v).toFixed(0) + ')');
          }
        };

        /** One feature sub-step: a short re-spin onto its grid, with a label. */
        const COIN_IN_MS = 380;

        /**
         * EIN Kaskaden-Schritt, so wie er wirklich passiert: die gewinnenden
         * Zellen loesen sich auf, die uebrigen RUTSCHEN NACH UNTEN, und oben
         * kommen neue nach. Kein Neu-Drehen der Walze — genau das war es
         * frueher, und genau das hat der Server bis 08.09.2026 auch getan.
         *
         * `cleared` sind die Zellen, die der SERVER geraeumt hat (Walze·Reihen
         * + Reihe); `zielGrid` ist das Raster, das er danach gemeldet hat. Die
         * Anzeige erfindet nichts: sie ordnet nur zu, welches ueberlebende
         * Symbol wohin faellt (von unten nach oben, wie die Schwerkraft) und
         * welche Zellen oben neu sind.
         */
        const playTumble = (cleared, zielGrid) => new Promise((resolve) => {
          const rausSet = new Set(cleared);
          // Je Walze: die Zellen des aktuellen Bildes, und wohin sie fallen.
          const bahnen = [];
          for (let r = 0; r < spec.reels; r++) {
            const R = reel[r];
            const kG = plan[r] ? plan[r].kG : Math.round(R.k0);
            const raus = [];
            const bleibt = [];
            for (let row = spec.rows - 1; row >= 0; row--) {
              const c = R.cells.get(kG + row);
              if (!c) continue;
              if (rausSet.has(r * spec.rows + row)) raus.push(c);
              else bleibt.push({ c, von: row });
            }
            // `bleibt` ist von unten nach oben gesammelt ⇒ es fuellt von unten auf.
            const faellt = bleibt.map((b, i) => ({ ...b, nach: spec.rows - 1 - i }));
            const neuAnzahl = spec.rows - faellt.length;
            const neu = [];
            for (let row = 0; row < neuAnzahl; row++) {
              const id = (zielGrid[r] && zielGrid[r][row]) || '?';
              // Ueber dem Fenster einsetzen; der Ausschnitt der Walze schneidet sie ab.
              const g = makeCell(R.g, id, cx(r), cy(row));
              neu.push({ g: { g, cx: cx(r), cy: cy(row) }, nach: row, hoehe: neuAnzahl });
            }
            bahnen.push({ R, kG, raus, faellt, neu });
          }
          const t0 = performance.now();
          const clearMs = Math.max(60, look.clearMs);
          const fallMs = Math.max(60, look.fallMs);
          const ende = clearMs + fallMs;
          const frameT = (t) => {
            const uc = t / clearMs;
            const uf = (t - clearMs) / fallMs;
            for (const b of bahnen) {
              for (const c of b.raus) clearFrame(c, uc, look.clear);
              if (uf > 0) {
                // Schwerkraft: der Weg waechst mit dem QUADRAT der Zeit.
                const p = Math.min(1, uf);
                const f = p * p;
                for (const x of b.faellt) placeCell(x.c, (x.nach - x.von) * GEO.pitch * f, 1, 1, 0);
                for (const x of b.neu) placeCell(x.g, -(x.hoehe * GEO.pitch) * (1 - f), 1, 1, 0);
              }
            }
          };
          const fertig = () => {
            // Sauber aufsetzen: das neue Raster wird das Ruhebild der Walze.
            // Alle Zellen der Walze wegwerfen und aus `placed` neu malen —
            // billiger und sicherer, als jede einzelne zurueckzurechnen.
            bahnen.forEach((b, r) => {
              for (const x of b.neu) b.R.g.removeChild(x.g.g);
              for (const c of b.R.cells.values()) b.R.g.removeChild(c.g);
              b.R.cells.clear();
              for (let row = 0; row < spec.rows; row++) b.R.placed.set(b.kG + row, (zielGrid[r] && zielGrid[r][row]) || '?');
              setK(b.R, r, b.kG);
            });
            resolve();
          };
          const step = (nowF) => {
            const t = nowF - t0;
            if (t >= ende) { raf = 0; fertig(); return; }
            frameT(t);
            raf = requestAnimationFrame(step);
          };
          raf = requestAnimationFrame(step);
        });
        const playStep = (s, endOfChain) => new Promise((resolve) => {
          clearLines();
          clear(confG);
          setShake(null);
          const t0 = performance.now();
          // Hold & Spin: erst die Muenzen setzen, DANN drehen — die gehaltenen
          // liegen fest ueber den Walzen, die freien Walzen laufen darunter.
          // Kaskade: NICHT neu drehen — aufloesen und nachrutschen.
          if (s.kind === 'cascade' && s.cleared) {
            stepT.textContent = ctx.text('reveal.slotsm.cascade', { i: s.i, n: s.n });
            playTumble(s.cleared, s.grid).then(() => {
              if (endOfChain && look.featEnd && s.totalBps != null) {
                stepT.textContent = ctx.text('reveal.slotsm.featureEnd', { amount: ctx.fmt.mult(s.totalBps) });
              }
              resolve();
            });
            return;
          }
          const frisch = s.coins ? paintCoins(new Map(s.coins), new Set(s.neu || [])) : [];
          const sPlan = s.grid ? planSpin(s.grid, null, 0, true, s.frozen) : null;
          const spinMs = sPlan ? spinEnd(sPlan) + 220 : 0;
          const end = Math.max(spinMs, frisch.length ? COIN_IN_MS : 0);
          stepT.textContent = s.kind === 'freeSpin'
            ? ctx.text('reveal.slotsm.freeSpin', { i: s.i, n: s.n })
            : s.kind === 'respin'
              ? ctx.text('reveal.slotsm.respin', { i: s.i, n: s.n })
              : s.kind === 'hsStart'
                ? ctx.text('reveal.slotsm.coinsLocked', { n: (s.coins || []).length })
                : ctx.text('reveal.slotsm.cascade', { i: s.i, n: s.n });
          if (s.more && look.featRetrigger) stepT.textContent += ' · ' + ctx.text('reveal.slotsm.retrigger', { n: s.more });
          const stepFrame = (t) => {
            if (sPlan) sPlan.forEach((p, r) => { if (p) setK(reel[r], r, kAt(p, t)); });
            // Die neuen Muenzen kommen erst, wenn die Walzen stehen — sonst
            // saehe man sie ueber einer laufenden Walze schweben.
            if (frisch.length) coinIn(frisch, (t - Math.max(0, spinMs - COIN_IN_MS)) / COIN_IN_MS);
          };
          const finish = () => {
            stepFrame(end);
            if (endOfChain && look.featEnd && s.totalBps != null) {
              stepT.textContent = ctx.text('reveal.slotsm.featureEnd', { amount: ctx.fmt.mult(s.totalBps) });
            }
            resolve();
          };
          const step = (nowF) => {
            const t = nowF - t0;
            if (t >= Math.min(end, Math.max(stepMs, frisch.length ? COIN_IN_MS : 0))) { raf = 0; finish(); return; }
            stepFrame(t);
            raf = requestAnimationFrame(step);
          };
          raf = requestAnimationFrame(step);
        });

        return new Promise((resolve) => {
          pending = resolve;
          const settleEnd = () => {
            // Das Endbild: das Raster der Basis-Runde, seine Linien, die volle
            // Auszahlung. Die Muenzen eines Hold & Spin bleiben liegen — SIE
            // sind das Ergebnis der Runde, nicht das Raster darunter.
            reel.forEach((R, r) => { if (plan[r]) setK(R, r, plan[r].kG); });
            frame(hasChain ? R0 : BASE_END);
            showReadout(o, d, look, null);
            readG.setAttribute('opacity', 1);
            setShake(null);
          };
          const done = () => { root.dataset.state = 'done'; pending = null; resolve(); };
          if (opts && opts.reducedMotion) { settleEnd(); done(); return; }
          frame(0);
          const step = (nowF) => {
            const t = nowF - now;
            if (t >= BASE_END) {
              raf = 0;
              frame(BASE_END);
              if (!hasChain) showReadout(o, d, look, null);
              if (!steps.length) { done(); return; }
              // Feature: ansagen, die Kette abspielen — und ERST DANN feiern.
              if (look.featStart) stepT.textContent = ctx.text('reveal.slotsm.featureStart');
              let i = 0;
              const feier = () => {
                // Die Schrittzeile steht auf derselben Zeile wie die Wortmarke —
                // sie macht Platz, sobald die Auszahlung kommt.
                stepT.textContent = '';
                const c0 = performance.now();
                const tick = (nowC) => {
                  const u = nowC - c0;
                  if (u >= CEL_MS) { raf = 0; celebrate(CEL_MS, u); readG.setAttribute('opacity', 1); setShake(null); done(); return; }
                  celebrate(u, u);
                  raf = requestAnimationFrame(tick);
                };
                raf = requestAnimationFrame(tick);
              };
              const nextStep = () => {
                if (i >= steps.length) { settleEnd(); feier(); return; }
                const s = steps[i++];
                playStep(s, i === steps.length).then(nextStep);
              };
              raf = requestAnimationFrame(nextStep);
              return;
            }
            frame(t);
            raf = requestAnimationFrame(step);
          };
          raf = requestAnimationFrame(step);
        });
      },
      // Pre-roll: the round is submitted, the outcome still on its way. Nothing here
      // knows the result — the reels just leave their position at cruise speed. With a
      // wind-up they first nudge against the running direction, as a real reel does.
      arm(opts) {
        cancel();
        const a = { t0: performance.now(), k: reel.map((R) => R.k0), reduced: !!(opts && opts.reducedMotion) };
        armed = a;
        root.dataset.state = 'playing';
        clearLines();
        clear(confG);
        setShake(null);
        stepT.textContent = '';
        reel.forEach((R) => calmCells(R));
        showIdleText(spec); idleG.setAttribute('visibility', 'hidden');
        if (a.reduced) return;
        const dir = look.up ? -1 : 1;
        const run = runOf(ACCEL, look.speed);
        const roll = (nowF) => {
          const t = nowF - a.t0;
          const pull = look.pullback > 0 && t < PULL_MS ? -dir * look.pullback * (t / PULL_MS) : 0;
          reel.forEach((R, r) => setK(R, r, a.k[r] - dir * run.dist(Math.max(0, t - (look.pullback > 0 ? PULL_MS : 0))) + pull));
          raf = requestAnimationFrame(roll);
        };
        raf = requestAnimationFrame(roll);
      },
      // The round did not happen: settle every reel on the next whole cell, no result.
      disarm() {
        const a = armed;
        if (!a) return;
        armed = null;
        cancel();
        if (a.reduced) { idleG.removeAttribute('visibility'); root.dataset.state = 'idle'; return; }
        const t0 = performance.now();
        const rolled = t0 - a.t0;
        const dir = look.up ? -1 : 1;
        const stops = reel.map((R, r) => {
          const k = rolledK(a, r, rolled);
          let end = dir > 0 ? Math.floor(k) : Math.ceil(k);
          if (Math.abs(k - end) < 0.15) end -= dir;        // always some travel — no dead stop
          return { k, end };
        });
        const settle = (nowF) => {
          const u = Math.min(1, (nowF - t0) / SETTLE), e = 1 - Math.pow(1 - u, 3);
          stops.forEach((s, r) => setK(reel[r], r, s.k - (s.k - s.end) * e));
          if (u >= 1) { raf = 0; idleG.removeAttribute('visibility'); root.dataset.state = 'idle'; return; }
          raf = requestAnimationFrame(settle);
        };
        raf = requestAnimationFrame(settle);
      },
      reset() { cancel(); armed = null; idle(); root.dataset.state = 'idle'; },
      destroy() { cancel(); armed = null; },
    };
  },
};
