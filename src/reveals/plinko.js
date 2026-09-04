// Sol-Core reveal — plinko (single, Interactive).
//
// One motion idea: a ball drops through the pin triangle, one hop per row, turning
// left or right exactly as `details.path` says (0 = left, 1 = right), and comes to
// rest in bucket `details.slot`. Every hop takes the same time — the tempo never
// slows near a bucket — and the bucket lights only when the ball is in it.
//
// Geometry follows the game: the idle board is built from `engineConfig.rows`
// (and the real bucket paytable, if the server echoes it); each round is built
// from `details.rows` / `details.paytableBps`, so 8 rows draw 9 buckets and
// 16 rows draw 17 — never a default board pretending to be the game.
//
// Fairness (docs/RULES.md, rule 16): the path, the slot, win, multiplier and
// payout are read verbatim from the outcome. Nothing is derived, nothing is
// random, and the readout nodes stay empty until the ball has settled.
//
// Text goes through `ctx.text(...)` (four languages); colours through the theme
// tokens in globals.css. Edit freely — this file is design zone.

/** @type {import('../lib/reveal').RevealModule} */
export const reveal = {
  key: 'plinko',
  mechanic: 'single',
  strings: [
    'reveal.won',
    'result.lost',
    'reveal.plinko.rows',
    'reveal.plinko.head',
    'reveal.plinko.risk.low',
    'reveal.plinko.risk.medium',
    'reveal.plinko.risk.high',
    'reveal.plinko.risk.base',
    'reveal.plinko.oneBall',
    'reveal.plinko.balls',
  ],

  mount(root, ctx) {
    const NS = 'http://www.w3.org/2000/svg';
    const CX = 50, DROP_Y = 12.5, PIN_TOP = 19, PIN_BOT = 61, BUCKET_Y = 65, BUCKET_H = 5; // viewBox units (0..100)
    const SETTLE = 350;
    const ROWS_MIN = 1, ROWS_MAX = 16, ROWS_DEFAULT = 12;

    const C = 'sca-plinko';           // class prefix — every rule is scoped with it
    const CSS = `
.${C}{position:absolute;inset:0;background:var(--night);font-family:var(--mono)}
.${C} svg{position:absolute;inset:0;width:100%;height:100%;display:block}
.${C} text{font-family:var(--mono);font-variant-numeric:tabular-nums;fill:var(--fg)}
.${C} .${C}-head{font-size:3.4px;font-weight:600}
.${C} .${C}-sub{font-size:3.4px;text-anchor:end;fill:var(--muted)}
.${C} .${C}-lbl{font-size:3.1px;text-anchor:middle;fill:var(--muted);transition:fill .25s linear}
.${C} .${C}-pin{fill:var(--muted);transition:fill .15s linear}
.${C} .${C}-pin.${C}-hit{fill:var(--fg)}
.${C} .${C}-bucket{fill:var(--panel-strong);stroke:var(--line);stroke-width:.3;transition:fill .25s linear,stroke .25s linear}
.${C} .${C}-ball{fill:var(--fg)}
.${C} .${C}-mult{font-size:6px;font-weight:700;text-anchor:middle}
.${C} .${C}-out{font-size:4.4px;font-weight:600;text-anchor:middle}
.${C} .${C}-fiat{font-size:3.1px;text-anchor:middle;fill:var(--muted)}
.${C} .${C}-readout{opacity:0;transition:opacity .25s linear}
.${C}[data-tone] .${C}-readout{opacity:1}
.${C}[data-tone="win"] .${C}-mult,.${C}[data-tone="win"] .${C}-out{fill:var(--accent)}
.${C}[data-tone="loss"] .${C}-mult,.${C}[data-tone="loss"] .${C}-out{fill:var(--red)}
.${C}[data-tone="win"] .${C}-bucket.${C}-lit{fill:var(--accent);fill-opacity:.35;stroke:var(--accent)}
.${C}[data-tone="loss"] .${C}-bucket.${C}-lit{fill:var(--red);fill-opacity:.35;stroke:var(--red)}
.${C}[data-tone="win"] .${C}-lbl.${C}-lit{fill:var(--accent);font-weight:700}
.${C}[data-tone="loss"] .${C}-lbl.${C}-lit{fill:var(--red);font-weight:700}
@media (prefers-reduced-motion:reduce){.${C} *{transition:none!important}}
`;
    const st = document.createElement('style');
    st.textContent = CSS;
    root.appendChild(st);

    const box = document.createElement('div');
    box.className = 'sca-plinko';
    root.appendChild(box);

    const el = (tag, attrs, parent) => {
      const n = document.createElementNS(NS, tag);
      for (const k in attrs) n.setAttribute(k, attrs[k]);
      (parent || svg).appendChild(n);
      return n;
    };
    const svg = el('svg', { viewBox: '0 0 100 100', preserveAspectRatio: 'xMidYMid meet' }, box);
    const head = el('text', { x: 6, y: 8, class: 'sca-plinko-head' });
    const sub = el('text', { x: 94, y: 8, class: 'sca-plinko-sub' });
    const boardG = el('g', {}); // pins + buckets + labels, rebuilt per board
    const ball = el('circle', { class: 'sca-plinko-ball', cx: CX, cy: DROP_Y, r: 1.6 });
    const readout = el('g', { class: 'sca-plinko-readout' });
    const mult = el('text', { x: 50, y: 87.5, class: 'sca-plinko-mult' }, readout);
    const out = el('text', { x: 50, y: 94, class: 'sca-plinko-out' }, readout);
    const fiat = el('text', { x: 50, y: 98.6, class: 'sca-plinko-fiat' }, readout);

    // ── helpers ──────────────────────────────────────────────────────────
    const clampRows = (v, fallback) => {
      const n = Math.round(Number(v));
      return Number.isFinite(n) ? Math.min(ROWS_MAX, Math.max(ROWS_MIN, n)) : fallback;
    };
    const fmtBucket = (bps) => { // ≤ 4 characters so it fits under its bucket
      const v = Number(bps || 0) / 10000;
      if (v >= 1000) return Math.round(v / 1000) + 'k';
      if (v >= 100) return String(Math.round(v));
      if (v >= 1) return v.toFixed(1);
      return v.toFixed(2);
    };
    const riskText = (base) =>
      base === 1.35 ? ctx.text('reveal.plinko.risk.low')
        : base === 1.8 ? ctx.text('reveal.plinko.risk.medium')
          : base === 2.3 ? ctx.text('reveal.plinko.risk.high')
            : ctx.text('reveal.plinko.risk.base', { base: Number(base).toFixed(2) });
    // Preview paytable when the server did not echo one (same formula as the engine, RTP 97 %).
    const binom = (n, k) => { let r = 1; for (let i = 1; i <= k; i++) r = r * (n - i + 1) / i; return r; };
    const defaultTable = (rows, base) => {
      const raw = [], probs = [];
      for (let k = 0; k <= rows; k++) { probs.push(binom(rows, k) / Math.pow(2, rows)); raw.push(Math.pow(base, Math.abs(k - rows / 2))); }
      const ev = raw.reduce((s, m, k) => s + m * probs[k], 0);
      return raw.map((m) => Math.round(m * (0.97 / ev) * 10000));
    };
    const tableFor = (rows, base, candidate) =>
      Array.isArray(candidate) && candidate.length === rows + 1 ? candidate : defaultTable(rows, base);

    // ── board ────────────────────────────────────────────────────────────
    let B = null; // { rows, h, pinY(j), pins[j][k], buckets[], labels[] }
    const buildBoard = (rows, table, headText, subText) => {
      while (boardG.firstChild) boardG.removeChild(boardG.firstChild);
      const h = Math.min(3.6, 90 / (2 * (rows + 1))); // half pin spacing
      const pinR = Math.min(0.9, h * 0.26);
      const pinY = (j) => PIN_TOP + (rows > 1 ? j * (PIN_BOT - PIN_TOP) / (rows - 1) : 0);
      const pins = [];
      for (let j = 0; j < rows; j++) {
        const row = [];
        for (let k = 0; k <= j + 2; k++) {
          row.push(el('circle', { class: 'sca-plinko-pin', cx: (CX + (2 * k - (j + 2)) * h).toFixed(3), cy: pinY(j).toFixed(3), r: pinR }, boardG));
        }
        pins.push(row);
      }
      const buckets = [], labels = [];
      for (let k = 0; k <= rows; k++) {
        const x = CX + (2 * k - rows) * h;
        buckets.push(el('rect', { class: 'sca-plinko-bucket', x: (x - h + 0.35).toFixed(3), y: BUCKET_Y, width: (2 * h - 0.7).toFixed(3), height: BUCKET_H, rx: 0.8 }, boardG));
        const t = el('text', { class: 'sca-plinko-lbl', x: x.toFixed(3), y: k % 2 === 0 ? 75.2 : 79.6 }, boardG); // staggered so 4-char labels never touch
        t.textContent = fmtBucket(table[k]);
        labels.push(t);
      }
      head.textContent = headText;
      sub.textContent = subText;
      ball.setAttribute('r', Math.min(1.7, h * 0.5).toFixed(3));
      B = { rows, h, pinY, pins, buckets, labels };
    };
    const setBall = (x, y) => { ball.setAttribute('cx', x.toFixed(3)); ball.setAttribute('cy', y.toFixed(3)); };
    const neutral = () => {
      box.removeAttribute('data-tone');
      mult.textContent = ''; out.textContent = ''; fiat.textContent = '';
      if (!B) return;
      for (const row of B.pins) for (const p of row) p.classList.remove('sca-plinko-hit');
      for (const b of B.buckets) b.classList.remove('sca-plinko-lit');
      for (const l of B.labels) l.classList.remove('sca-plinko-lit');
    };
    // The readout is written only here — the ball is in its bucket.
    const light = (slot, o) => {
      const win = !!o.win;
      if (B.buckets[slot]) B.buckets[slot].classList.add('sca-plinko-lit');
      if (B.labels[slot]) B.labels[slot].classList.add('sca-plinko-lit');
      box.setAttribute('data-tone', win ? 'win' : 'loss');
      mult.textContent = ctx.fmt.mult(o.multiplierBps);
      out.textContent = win ? ctx.fmt.won(o.payoutLamports) : ctx.fmt.lost();
      fiat.textContent = (win && ctx.fmt.fiat(o.payoutLamports)) || '';
    };
    // Ball waypoints: drop point → the pin it meets in every row → the bucket centre.
    const waypoints = (bits, slot) => {
      const pts = [{ x: CX, y: DROP_Y, row: -1, k: 1 }];
      let rights = 0;
      for (let j = 0; j < B.rows; j++) {
        pts.push({ x: CX + (2 * rights - j) * B.h, y: B.pinY(j), row: j, k: rights + 1 }); // pin hit in row j
        rights += bits[j];
      }
      pts.push({ x: CX + (2 * slot - B.rows) * B.h, y: BUCKET_Y + BUCKET_H / 2, row: -1, k: 0 });
      return pts;
    };
    // Idle: the game's own geometry. Rows and, where the server echoes it, the
    // real bucket paytable come from engineConfig — a creator with a custom
    // table sees that table before the first ball drops.
    const idle = () => {
      const cfg = ctx.engineConfig || {};
      const rows = clampRows(cfg.rows, ROWS_DEFAULT);
      const base = Number(cfg.base) || 1.8;
      buildBoard(rows, tableFor(rows, base, cfg.paytableBps), ctx.text('reveal.plinko.rows', { rows }), '');
      neutral();
      setBall(CX, DROP_Y);
    };
    idle();

    // ── playback ─────────────────────────────────────────────────────────
    let raf = 0, timer = 0, pending = null;
    const cancel = () => {
      if (raf) cancelAnimationFrame(raf); raf = 0;
      if (timer) clearTimeout(timer); timer = 0;
      if (pending) { const p = pending; pending = null; p(); }
    };

    idle();
    root.dataset.state = 'idle';

    return {
      play(o, opts) {
        cancel();
        root.dataset.state = 'playing';
        o = o || {};
        const d = o.details || {};
        const rows = clampRows(d.rows, ROWS_DEFAULT);
        const base = Number(d.base) || 1.8;
        const table = tableFor(rows, base, d.paytableBps);
        const path = typeof d.path === 'string' ? d.path : '';
        const bits = []; // 1 = right, 0 = left — one bit per row, exactly as the server encodes it
        for (let j = 0; j < rows; j++) bits.push(path.charAt(j) === '1' ? 1 : 0);
        const slot = Number.isFinite(d.slot) ? Math.min(rows, Math.max(0, d.slot)) : bits.reduce((s, b) => s + b, 0);
        const balls = Number(d.balls) || 1;
        buildBoard(
          rows,
          table,
          ctx.text('reveal.plinko.head', { rows, risk: riskText(base) }),
          balls > 1 ? ctx.text('reveal.plinko.balls', { n: balls }) : ctx.text('reveal.plinko.oneBall'),
        );
        neutral();
        const pts = waypoints(bits, slot);
        const HOP = Math.min(240, Math.max(120, Math.round(2100 / (rows + 1)))); // ms per hop, constant for the whole drop
        const total = HOP * (pts.length - 1);
        setBall(pts[0].x, pts[0].y);
        return new Promise((resolve) => {
          pending = resolve;
          const done = () => {
            const last = pts[pts.length - 1];
            setBall(last.x, last.y);
            for (const p of pts) if (p.row >= 0 && B.pins[p.row][p.k]) B.pins[p.row][p.k].classList.add('sca-plinko-hit');
            light(slot, o);
            root.dataset.state = 'done';
            pending = null;
            resolve();
          };
          if (opts && opts.reducedMotion) { done(); return; }
          const t0 = performance.now();
          let hit = 0; // waypoints already passed (their pins are marked as hit)
          const step = (now) => {
            const t = Math.max(0, Math.min(total, now - t0)); // rAF timestamps can precede t0
            const i = Math.min(pts.length - 2, Math.floor(t / HOP));
            const u = Math.min(1, (t - i * HOP) / HOP);
            while (hit <= i) { const p = pts[hit]; if (p.row >= 0 && B.pins[p.row][p.k]) B.pins[p.row][p.k].classList.add('sca-plinko-hit'); hit++; }
            const a = pts[i], b = pts[i + 1];
            const dx = b.x - a.x, dy = b.y - a.y;
            const lift = a.row >= 0 ? 0.3 * dy : 0; // bounce off a pin: brief rise, then fall
            const x = a.x + dx * (1 - (1 - u) * (1 - u)); // sideways kick fades out
            const y = a.y + dy * u * u - lift * 4 * u * (1 - u); // gravity fall minus the bounce arc
            setBall(x, y);
            if (t < total) { raf = requestAnimationFrame(step); return; }
            raf = 0;
            timer = setTimeout(() => { timer = 0; done(); }, SETTLE);
          };
          raf = requestAnimationFrame(step);
        });
      },
      reset() { cancel(); idle(); root.dataset.state = 'idle'; },
      destroy() { cancel(); },
    };
  },
};
