// Sol-Core reveal — slots-modular (single, Slot).
//
// One motion idea: five reel strips scroll downward and stop left to right, 250 ms
// apart, on the server's `details.grid`. Only then is each winning payline traced
// through its cells and the readout appears. Every frame is a pure function of
// (outcome, elapsed ms) — no randomness, and nothing is drawn, slowed or highlighted
// before its reel has stopped.
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
  ],

  mount(root, ctx) {
    const NS = 'http://www.w3.org/2000/svg';
    const PAYLINES = [
      [1, 1, 1, 1, 1], [0, 0, 0, 0, 0], [2, 2, 2, 2, 2], [0, 1, 2, 1, 0], [2, 1, 0, 1, 2],
      [0, 0, 1, 0, 0], [2, 2, 1, 2, 2], [1, 0, 0, 0, 1], [1, 2, 2, 2, 1], [1, 0, 1, 0, 1],
      [1, 2, 1, 2, 1], [0, 1, 0, 1, 0], [2, 1, 2, 1, 2], [1, 1, 0, 1, 1], [1, 1, 2, 1, 1],
      [0, 1, 1, 1, 0], [2, 1, 1, 1, 2], [0, 2, 0, 2, 0], [2, 0, 2, 0, 2], [0, 2, 2, 2, 0],
    ];
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
    const GX0 = 7, GY0 = 12, CELL = 16, PITCH = 17.5, HALF = CELL / 2;
    const STOP = [800, 1050, 1300, 1550, 1800];
    const FILL = [9, 13, 17, 22, 26];
    const LINE0 = 2000, LINE_GAP = 250, LINE_DRAW = 320, LIFT_MS = 200, PULSE_MS = 600, HOLD = 350;
    const MAXC = 38;

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
.${C} .${C}-line{fill:none;stroke:var(--accent);stroke-width:.9;stroke-linecap:round;stroke-linejoin:round}
.${C} .${C}-mult{font-size:7.5px;font-weight:700}
.${C} .${C}-out{font-size:4.2px;font-weight:600}
.${C} .${C}-fiat{font-size:3px;fill:var(--muted)}
.${C} .${C}-sub{font-size:3.4px;font-weight:600}
.${C} .${C}-det{font-size:3.1px}
.${C}[data-tone="win"] .${C}-mult,.${C}[data-tone="win"] .${C}-out{fill:var(--accent)}
.${C}[data-tone="loss"] .${C}-mult,.${C}[data-tone="loss"] .${C}-out{fill:var(--red)}
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

    const headL = el('text', { x: GX0, y: 6.8, class: 'sca-slots-modular-head' });
    const headR = el('text', { x: 93, y: 6.8, class: 'sca-slots-modular-head sca-slots-modular-end sca-slots-modular-muted' });
    el('rect', { x: 4.5, y: 9.5, width: 91, height: 56, rx: 2, fill: 'var(--panel)', stroke: 'var(--line)', 'stroke-width': 0.3 });
    const linesG = el('g', {});
    const defs = el('defs', {});
    const strips = [];
    for (let r = 0; r < 5; r++) {
      const cp = el('clipPath', { id: uid + '-' + r }, defs);
      el('rect', { x: GX0 + r * PITCH - 0.5, y: GY0 - 1.5, width: CELL + 1, height: 2 * PITCH + CELL + 3 }, cp);
      const g = el('g', { 'clip-path': 'url(#' + uid + '-' + r + ')' });
      strips.push(el('g', {}, g));
    }
    const idleG = el('g', {});
    const idle1 = el('text', { x: 50, y: 76.5, class: 'sca-slots-modular-sub sca-slots-modular-mid sca-slots-modular-muted' }, idleG);
    const idle2 = el('text', { x: 50, y: 83.5, class: 'sca-slots-modular-sub sca-slots-modular-mid' }, idleG);
    const idle3 = el('text', { x: 50, y: 90.5, class: 'sca-slots-modular-det sca-slots-modular-mid sca-slots-modular-muted' }, idleG);
    const idle4 = el('text', { x: 50, y: 95.5, class: 'sca-slots-modular-det sca-slots-modular-mid sca-slots-modular-muted' }, idleG);
    const readG = el('g', {});
    const mult = el('text', { x: 50, y: 75.5, class: 'sca-slots-modular-mult sca-slots-modular-mid' }, readG);
    const out = el('text', { x: 50, y: 82, class: 'sca-slots-modular-out sca-slots-modular-mid' }, readG);
    const fiat = el('text', { x: 50, y: 86.4, class: 'sca-slots-modular-fiat sca-slots-modular-mid' }, readG);
    const det1 = el('text', { x: 50, y: 91.5, class: 'sca-slots-modular-det sca-slots-modular-mid sca-slots-modular-muted' }, readG);
    const det2 = el('text', { x: 50, y: 96, class: 'sca-slots-modular-det sca-slots-modular-mid sca-slots-modular-muted' }, readG);

    const fmtPay = (bps) => (Number(bps || 0) / 10000).toFixed(2).replace(/\.?0+$/, '') + '×';
    const isEmoji = (g) => /\p{Extended_Pictographic}/u.test(g);
    const glyphSize = (g) => { if (isEmoji(g)) return 6.8; const n = g.length; return n <= 1 ? 7.4 : n === 2 ? 5.8 : 4.4; };
    const cx = (r) => GX0 + r * PITCH + HALF;
    const cy = (row) => GY0 + row * PITCH + HALF;
    // The render spec: the outcome's own echo first (a round always carries it), else the game's config.
    const readSpec = (o) => {
      const raw = (o && o.engineConfig) || ctx.engineConfig || {};
      const symbols = Array.isArray(raw.symbols) ? raw.symbols.filter((s) => s && typeof s.id === 'string') : [];
      const paylines = Array.isArray(raw.paylines) ? raw.paylines.filter((l) => Array.isArray(l) && l.length === 5) : [];
      const lineCount = Number.isInteger(raw.lineCount) ? raw.lineCount : (paylines.length || 20);
      return {
        symbols: symbols.length ? symbols : DEFAULT_SYMBOLS,
        paylines: paylines.length ? paylines : PAYLINES.slice(0, Math.min(20, lineCount)),
        lineCount,
      };
    };
    const filler = (symbols, r, j) => { const n = symbols.length; return symbols[(((j * 3 + r * 5) % n) + n) % n].id; };
    const reelPos = (t, T, dist) => {
      if (t <= 0) return 0; if (t >= T) return dist;
      const A = Math.min(200, T * 0.3), D = Math.min(350, T * 0.4), Cc = T - A - D;
      const v = dist / (A / 2 + Cc + D / 2);
      if (t < A) return v * t * t / (2 * A);
      if (t < A + Cc) return v * A / 2 + v * (t - A);
      const u = t - A - Cc;
      return v * A / 2 + v * Cc + v * (u - u * u / (2 * D));
    };
    const easeOut = (t) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
    const clear = (n) => { while (n.firstChild) n.removeChild(n.firstChild); };

    let cells = [];
    const makeCell = (parent, id, x, y) => {
      const art = symbolArt(id);
      const g = el('g', { class: 'sca-slots-modular-cell', transform: 'translate(' + x + ' ' + y + ')' }, parent);
      el('rect', { x: -HALF, y: -HALF, width: CELL, height: CELL, rx: 1.6 }, g);
      const t = el('text', { x: 0, y: 0.3, class: 'sca-slots-modular-glyph', style: 'fill:' + art.tint, 'font-size': glyphSize(art.glyph) }, g);
      t.textContent = art.glyph;
      return g;
    };
    const buildStrips = (spec, grid) => {
      cells = [];
      for (let r = 0; r < 5; r++) {
        clear(strips[r]);
        const col = [];
        const n = grid ? FILL[r] + 3 : 3;
        for (let k = 0; k < n; k++) {
          const id = grid ? (k < 3 ? ((grid[r] && grid[r][k] != null) ? grid[r][k] : '?') : filler(spec.symbols, r, k - FILL[r]))
            : filler(spec.symbols, r, k);
          const g = makeCell(strips[r], id, cx(r), cy(k));
          if (k < 3) col.push({ g, cx: cx(r), cy: cy(k) });
        }
        cells.push(col);
        strips[r].setAttribute('transform', 'translate(0 ' + (grid ? -FILL[r] * PITCH : 0) + ')');
      }
    };
    const setCell = (c, hot, lift, scale) => {
      if (hot) c.g.setAttribute('data-hot', hot); else c.g.removeAttribute('data-hot');
      c.g.setAttribute('transform', 'translate(' + c.cx + ' ' + (c.cy - lift).toFixed(3) + ') scale(' + scale.toFixed(4) + ')');
    };
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
    const showIdleText = (spec) => {
      readG.setAttribute('visibility', 'hidden'); idleG.removeAttribute('visibility');
      box.removeAttribute('data-tone');
      // the readout nodes are EMPTIED, not just hidden — a previous round's figures must
      // not sit in the DOM while the reels spin (docs/RULES.md, rule 16)
      mult.textContent = ''; out.textContent = ''; fiat.textContent = ''; det1.textContent = ''; det2.textContent = '';
      const pay = spec.symbols.filter((s) => !s.wild && !s.scatter && Array.isArray(s.paysBps))
        .map((s) => ({ id: s.id, top: Number(s.paysBps[2] || 0) })).sort((a, b) => b.top - a.top);
      const fmt = (s) => s.id + ' ' + fmtPay(s.top);
      idle1.textContent = ctx.text('reveal.slotsm.paytable');
      idle2.textContent = pay.slice(0, 3).map(fmt).join(' · ') || '—';
      idle3.textContent = pay.slice(3, 6).map(fmt).join(' · ');
      const hasWild = spec.symbols.some((s) => s.wild), hasSc = spec.symbols.some((s) => s.scatter);
      const bits = [ctx.text('reveal.slotsm.lines', { n: spec.lineCount })];
      if (hasWild) bits.push(ctx.text('reveal.slotsm.wilds'));
      if (hasSc) bits.push(ctx.text('reveal.slotsm.scatters'));
      idle4.textContent = bits.join(' · ');
    };
    const showReadout = (o, d) => {
      idleG.setAttribute('visibility', 'hidden'); readG.removeAttribute('visibility');
      const win = !!o.win;
      box.setAttribute('data-tone', win ? 'win' : 'loss');
      mult.textContent = ctx.fmt.mult(o.multiplierBps);
      out.textContent = win ? ctx.fmt.won(o.payoutLamports) : ctx.fmt.lost();
      fiat.textContent = (win && ctx.fmt.fiat(o.payoutLamports)) || '';
      const entries = d.lineWins.map((w) => 'L' + (w.line + 1) + ' ' + w.symbol + '×' + w.count + ' ' + fmtPay(w.payBps));
      if (d.scatterPayBps > 0) entries.push('scatter×' + d.scatterCount + ' ' + fmtPay(d.scatterPayBps));
      const lines = entries.length ? packDetail(entries) : [win ? '' : ctx.text('reveal.slotsm.noLine')];
      det1.textContent = lines[0] || ''; det2.textContent = lines[1] || '';
    };
    const setHeader = (spec, o) => {
      headL.textContent = '5×3 · ' + ctx.text('reveal.slotsm.lines', { n: spec.lineCount });
      headR.textContent = o && o.betLamports != null ? ctx.text('reveal.bet', { amount: ctx.fmt.sol(o.betLamports) }) : ctx.text('reveal.slotsm.spin');
    };

    const idle = () => { const spec = readSpec(null); clear(linesG); setHeader(spec, null); buildStrips(spec, null); showIdleText(spec); };
    idle();

    let raf = 0, pending = null;
    const cancel = () => {
      if (raf) cancelAnimationFrame(raf); raf = 0;
      if (pending) { const p = pending; pending = null; p(); }
    };

    idle();
    root.dataset.state = 'idle';

    return {
      play(o, opts) {
        cancel();
        root.dataset.state = 'playing';
        o = o || {};
        const spec = readSpec(o);
        const dd = o.details || {};
        const grid = Array.isArray(dd.grid) ? dd.grid : [];
        const d = {
          lineWins: Array.isArray(dd.lineWins) ? dd.lineWins.filter((w) => w && Number.isInteger(w.line)) : [],
          scatterCount: typeof dd.scatterCount === 'number' ? dd.scatterCount : 0,
          scatterPayBps: typeof dd.scatterPayBps === 'number' ? dd.scatterPayBps : 0,
        };
        setHeader(spec, o);
        buildStrips(spec, grid);
        clear(linesG);
        showIdleText(spec); idleG.setAttribute('visibility', 'hidden');

        const lines = [];
        const liftAt = new Map();
        d.lineWins.forEach((w, i) => {
          const geo = spec.paylines[w.line] || PAYLINES[w.line];
          if (!geo) return;
          const t0 = LINE0 + i * LINE_GAP;
          const pts = [];
          let len = 0;
          for (let r = 0; r < Math.min(5, Math.max(0, w.count | 0)); r++) {
            const row = Math.min(2, Math.max(0, geo[r] | 0));
            const p = { x: cx(r), y: cy(row) };
            if (pts.length) len += Math.hypot(p.x - pts[pts.length - 1].x, p.y - pts[pts.length - 1].y);
            pts.push(p);
            const key = r + ':' + row;
            if (!liftAt.has(key)) liftAt.set(key, t0);
          }
          if (pts.length < 2) return;
          const pl = el('polyline', { class: 'sca-slots-modular-line', points: pts.map((p) => p.x + ',' + p.y).join(' '),
            'stroke-dasharray': len, 'stroke-dashoffset': len, visibility: 'hidden' }, linesG);
          lines.push({ pl, len, t0 });
        });
        const scatterIds = new Set(spec.symbols.filter((s) => s.scatter).map((s) => s.id));
        const scatterCells = [];
        if (d.scatterCount >= 3) for (let r = 0; r < 5; r++) for (let row = 0; row < 3; row++) {
          if (scatterIds.has(grid[r] && grid[r][row]) && !liftAt.has(r + ':' + row)) scatterCells.push(cells[r][row]);
        }
        const nLines = lines.length;
        let R0 = STOP[4] + 300;
        if (nLines) R0 = Math.max(R0, LINE0 + nLines * LINE_GAP + 80);
        if (scatterCells.length) R0 = Math.max(R0, LINE0 + PULSE_MS + 80);
        const END = R0 + HOLD;

        const frame = (t) => {
          for (let r = 0; r < 5; r++) {
            const dist = FILL[r] * PITCH;
            strips[r].setAttribute('transform', 'translate(0 ' + (reelPos(t, STOP[r], dist) - dist).toFixed(3) + ')');
          }
          for (const [key, t0] of liftAt) {
            const [r, row] = key.split(':').map(Number);
            const p = easeOut((t - t0) / LIFT_MS);
            setCell(cells[r][row], p > 0 ? 'line' : null, 0.7 * p, 1 + 0.06 * p);
          }
          for (const l of lines) {
            const p = easeOut((t - l.t0) / LINE_DRAW);
            if (p <= 0) { l.pl.setAttribute('visibility', 'hidden'); continue; }
            l.pl.removeAttribute('visibility');
            l.pl.setAttribute('stroke-dashoffset', (l.len * (1 - p)).toFixed(3));
          }
          if (scatterCells.length) {
            const u = (t - LINE0) / PULSE_MS;
            const s = u <= 0 || u >= 1 ? 1 : 1 + 0.08 * Math.pow(Math.sin(2 * Math.PI * u), 2);
            for (const c of scatterCells) setCell(c, u > 0 ? 'scatter' : null, 0, s);
          }
          if (t >= R0) { showReadout(o, d); readG.setAttribute('opacity', easeOut((t - R0) / 250).toFixed(3)); }
        };

        return new Promise((resolve) => {
          pending = resolve;
          const done = () => { frame(END); root.dataset.state = 'done'; pending = null; resolve(); };
          if (opts && opts.reducedMotion) { done(); return; }
          frame(0);
          const t0 = performance.now();
          const step = (now) => {
            const t = now - t0;
            if (t >= END) { raf = 0; done(); return; }
            frame(t);
            raf = requestAnimationFrame(step);
          };
          raf = requestAnimationFrame(step);
        });
      },
      reset() { cancel(); idle(); root.dataset.state = 'idle'; },
      destroy() { cancel(); },
    };
  },
};
