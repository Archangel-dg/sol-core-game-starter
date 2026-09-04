// Sol-Core reveal — slots-3x3 (single, Slot).
//
// One motion idea: three symbol strips scroll downward behind a 3×3 window, opacity-
// blurred by speed, and stop left → right ≥ 350 ms apart with one fixed ease-out each,
// exactly on the server's centre-line symbols (`details.line`). Rows above/below are
// the strip's fixed neighbours. A triple lights all three centre cells, a pair the two
// matching ones; then the readout appears.
//
// The reels never snap. Every round starts FROM THE POSITION the reels are in — the
// idle board, the previous result, or the pre-roll: `arm()` (the round is submitted,
// the outcome still on its way) lets the strips roll at cruise speed; `play()` picks,
// per reel, the first stop time at or after its minimum where the constant run plus the
// fixed ease-out lands exactly on the target symbol. Speed is one constant for every
// reel and every outcome; only the travelled distance differs, in whole laps.
// `idle()` keeps every reel on the symbol it stands on; `disarm()` (the round failed)
// settles each reel on the next whole symbol without a result.
//
// The symbol set and the paytable preview come from the game's config echo
// (`engineConfig.symbolTable`) — a game with its own symbols shows them, idle and in
// every round. Every stop is the same fixed ease-out; no reel slows near a match.
//
// Text through `ctx.text(...)`, colours through the theme tokens (symbol tints follow
// src/lib/symbolArt.ts). Design zone.

/** @type {import('../lib/reveal').RevealModule} */
export const reveal = {
  key: 'slots-3x3',
  mechanic: 'single',
  strings: ['reveal.won', 'result.lost', 'reveal.slots3.centre', 'reveal.slots3.triple', 'reveal.slots3.pair', 'reveal.slots3.none'],

  mount(root, ctx) {
    const NS = 'http://www.w3.org/2000/svg';
    const K = 'sca-slots-3x3';
    const KNOWN = {
      ace: ['A', '#f43f5e'], king: ['K', '#f59e0b'], queen: ['Q', '#a855f7'], jack: ['J', '#3b82f6'],
      ten: ['10', '#22c55e'], nine: ['9', '#14b8a6'], wild: ['WI', '#eab308'], scatter: ['SC', '#8b5cf6'],
      star: ['ST', '#8b5cf6'], cherry: ['CH', '#ef4444'], lemon: ['LE', '#facc15'], bell: ['BE', '#f59e0b'],
      seven: ['7', '#ef4444'], diamond: ['DI', '#38bdf8'], bar: ['BAR', '#94a3b8'], coin: ['CO', '#eab308'],
      gem: ['GE', '#06b6d4'], crown: ['CR', '#f59e0b'], skull: ['SK', '#64748b'], fish: ['FI', '#0ea5e9'],
    };
    const PALETTE = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#14b8a6', '#f43f5e', '#eab308'];
    const GREEN = '#22c55e';
    // Engine defaults (DEFAULT_SLOT_SYMBOLS) — used only without a config echo.
    const DEFAULT_TABLE = [['cherry', 20000], ['lemon', 40000], ['bell', 100000], ['seven', 250000], ['diamond', 1000000]];
    const IDLE_POS = [0, 4, 8];
    const RX = [8, 37, 66], RW = 26, WY = 13, CH = 19, WH = 57, MID = WY + CH;
    // Motion: cruise VNOM symbols/ms (one constant), ACCEL ms linear ramp from rest,
    // DECEL ms cubic ease-out onto the target. Reel r stops no earlier than BASE[r] ms
    // after the roll began and ≥ GAP ms after its left neighbour.
    const VNOM = 0.02, ACCEL = 160, DECEL = 450, BASE = [750, 1100, 1450], GAP = 350;
    const SHOW = 100, TAIL = 350, SETTLE = 260;

    const C = K;                         // class prefix — every rule is scoped with it
    const CSS = `
.${C}{position:absolute;inset:0;background:var(--night);font-family:var(--mono)}
.${C} svg{position:absolute;inset:0;width:100%;height:100%;display:block}
.${C} text{font-family:var(--mono);font-variant-numeric:tabular-nums;fill:var(--fg)}
.${C} .${C}-muted{fill:var(--muted)}
.${C} .${C}-sub{font-size:3.2px;text-anchor:end}
.${C} .${C}-pay{font-size:3.2px;text-anchor:middle}
.${C} .${C}-kind{font-size:3.2px;text-anchor:middle}
.${C} .${C}-mult{font-size:9px;font-weight:700;text-anchor:middle}
.${C} .${C}-out{font-size:3.8px;font-weight:600;text-anchor:middle}
.${C} .${C}-fiat{font-size:2.9px;text-anchor:middle;fill:var(--muted)}
.${C} .${C}-bg{fill:var(--panel-strong);stroke:var(--line);stroke-width:.4}
.${C} .${C}-band{fill:var(--line)}
.${C} .${C}-dim{fill:var(--night);opacity:.55}
.${C} .${C}-mark{fill:var(--muted)}
.${C} .${C}-hi{fill:var(--accent);fill-opacity:.14;stroke:var(--accent);stroke-width:.7;opacity:0;transition:opacity .2s linear}
.${C} .${C}-hi.${C}-on{opacity:1}
.${C} .${C}-facet{fill:none;stroke:var(--night);stroke-width:1.2;opacity:.55}
.${C} .${C}-ink{fill:var(--night);font-weight:700;text-anchor:middle}
.${C} .${C}-readout{opacity:0;transition:opacity .2s linear}
.${C}[data-tone] .${C}-readout{opacity:1}
.${C}[data-tone] .${C}-table{display:none}
.${C}[data-tone="win"] .${C}-mult,.${C}[data-tone="win"] .${C}-out{fill:var(--accent)}
.${C}[data-tone="loss"] .${C}-mult,.${C}[data-tone="loss"] .${C}-out{fill:var(--red)}
@media (prefers-reduced-motion:reduce){.${C} *{transition:none!important}}
`;
    const st = document.createElement('style');
    st.textContent = CSS;
    root.appendChild(st);

    const box = document.createElement('div');
    box.className = K;
    root.appendChild(box);
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    box.appendChild(svg);

    const el = (tag, attrs, parent) => {
      const n = document.createElementNS(NS, tag);
      for (const k in attrs) n.setAttribute(k, attrs[k]);
      (parent || svg).appendChild(n);
      return n;
    };
    const txt = (x, y, cls, s, parent) => { const t = el('text', { x, y, 'class': cls }, parent); t.textContent = s; return t; };
    const uid = K + '-' + Math.floor(performance.now() * 1000).toString(36); // unique clip ids per mount

    const artOf = (id) => {
      const k = KNOWN[String(id).toLowerCase()];
      if (k) return { glyph: k[0], tint: k[1] };
      let h = 0; for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
      return { glyph: String(id).slice(0, 2).toUpperCase(), tint: PALETTE[h % PALETTE.length] };
    };
    const drawIcon = (id, g) => {
      const a = artOf(id), t = a.tint, key = String(id).toLowerCase();
      if (key === 'cherry') {
        el('path', { d: 'M14 21C15 13 20 8 31 6', stroke: GREEN, 'stroke-width': 2.4, fill: 'none', 'stroke-linecap': 'round' }, g);
        el('path', { d: 'M27 23C26 15 28 10 31 6', stroke: GREEN, 'stroke-width': 2.4, fill: 'none', 'stroke-linecap': 'round' }, g);
        el('path', { d: 'M31 6c4-1 6 1 7 4c-4 1-6-1-7-4z', fill: GREEN }, g);
        el('circle', { cx: 13, cy: 28, r: 8, fill: t }, g);
        el('circle', { cx: 27, cy: 30, r: 7, fill: t }, g);
      } else if (key === 'lemon') {
        el('ellipse', { cx: 20, cy: 21, rx: 14, ry: 10, transform: 'rotate(-25 20 21)', fill: t }, g);
        el('circle', { cx: 32.7, cy: 15.1, r: 2.4, fill: t }, g);
        el('circle', { cx: 7.3, cy: 26.9, r: 2.4, fill: t }, g);
      } else if (key === 'bell') {
        el('path', { d: 'M20 5a2.6 2.6 0 0 1 2.6 2.6v1.6c5.6 1.7 8.4 6.6 8.4 12.4v4.4l3 3.6v1.4H6v-1.4l3-3.6v-4.4c0-5.8 2.8-10.7 8.4-12.4V7.6A2.6 2.6 0 0 1 20 5z', fill: t }, g);
        el('circle', { cx: 20, cy: 34, r: 2.8, fill: t }, g);
      } else if (key === 'seven') {
        const s = txt(21, 33, '', '7', g);
        s.setAttribute('style', 'font-size:34px;font-weight:800;text-anchor:middle;fill:' + t);
        s.setAttribute('transform', 'skewX(-8)');
      } else if (key === 'diamond') {
        el('polygon', { points: '7,15 14,7 26,7 33,15 20,35', fill: t }, g);
        el('path', { d: 'M7 15H33M14 7L17 15L20 35M26 7L23 15', 'class': K + '-facet' }, g);
      } else if (key === 'bar') {
        el('rect', { x: 5, y: 13, width: 30, height: 14, rx: 2, fill: t }, g);
        const s = txt(20, 23.8, K + '-ink', 'BAR', g); s.setAttribute('style', 'font-size:9px');
      } else if (key === 'star') {
        const p = []; for (let i = 0; i < 10; i++) { const r = i % 2 ? 6.4 : 15, an = -Math.PI / 2 + i * Math.PI / 5; p.push((20 + r * Math.cos(an)).toFixed(2) + ',' + (21 + r * Math.sin(an)).toFixed(2)); }
        el('polygon', { points: p.join(' '), fill: t }, g);
      } else {
        el('rect', { x: 6, y: 6, width: 28, height: 28, rx: 4, fill: t, 'fill-opacity': .22, stroke: t, 'stroke-width': 1.5 }, g);
        const s = txt(20, a.glyph.length > 2 ? 23.6 : 24.4, '', a.glyph, g);
        s.setAttribute('style', 'font-size:' + (a.glyph.length > 2 ? 9 : 12) + 'px;font-weight:700;text-anchor:middle;fill:' + t);
      }
    };
    const icon = (id, x, y, size, parent) => {
      const g = el('g', { transform: 'translate(' + (x - size / 2).toFixed(3) + ' ' + (y - size / 2).toFixed(3) + ') scale(' + (size / 40).toFixed(4) + ')' }, parent);
      drawIcon(id, g);
      return g;
    };

    // ── the game's symbol table (config echo) or the engine defaults ───────
    const tableOf = () => {
      const raw = (ctx.engineConfig || {}).symbolTable;
      const rows = Array.isArray(raw) ? raw.filter((s) => s && typeof s.id === 'string').map((s) => [s.id, Math.round(Number(s.multiplierBps) || 0)]) : [];
      return rows.length >= 2 ? rows : DEFAULT_TABLE;
    };
    // Fixed strip order from the table: every symbol twice, low-paying ones once more —
    // neighbours above and below come from here and never from the outcome.
    const stripOf = (table) => {
      const ids = table.map((r) => r[0]);
      const base = [];
      for (let i = 0; i < ids.length; i++) { base.push(ids[i]); if (i < Math.ceil(ids.length / 2)) base.push(ids[(i + 2) % ids.length]); }
      for (let i = ids.length - 1; i >= 0; i--) base.push(ids[i]);
      return base;
    };

    // ── static chrome
    const sub = txt(RX[2] + RW, 8.2, K + '-sub ' + K + '-muted', '');
    el('polygon', { points: '4,' + (MID + 6) + ' 4,' + (MID + 13) + ' 6.5,' + (MID + 9.5), 'class': K + '-mark' });
    el('polygon', { points: '96,' + (MID + 6) + ' 96,' + (MID + 13) + ' 93.5,' + (MID + 9.5), 'class': K + '-mark' });

    // ── reels
    const reels = RX.map((x, r) => {
      const cid = uid + '-c' + r;
      const cp = el('clipPath', { id: cid });
      el('rect', { x, y: WY, width: RW, height: WH, rx: 2 }, cp);
      el('rect', { x, y: WY, width: RW, height: WH, rx: 2, 'class': K + '-bg' });
      el('rect', { x, y: MID, width: RW, height: CH, 'class': K + '-band' });
      const strip = el('g', {}, el('g', { 'clip-path': 'url(#' + cid + ')' }));
      el('rect', { x, y: WY, width: RW, height: CH, 'class': K + '-dim' });
      el('rect', { x, y: MID + CH, width: RW, height: CH, 'class': K + '-dim' });
      const hi = el('rect', { x: x + .4, y: MID + .4, width: RW - .8, height: CH - .8, rx: 1.2, 'class': K + '-hi' });
      return { x, strip, hi, cycle: null, pos: 0 };
    });
    const sameCycle = (a, b) => !!a && !!b && a.length === b.length && a.every((id, i) => id === b[i]);
    const buildStrip = (reel, cycle) => {
      reel.cycle = cycle;
      while (reel.strip.firstChild) reel.strip.removeChild(reel.strip.firstChild);
      for (let j = 0; j < cycle.length + 3; j++) icon(cycle[j % cycle.length], reel.x + RW / 2, WY + j * CH + CH / 2, 13, reel.strip);
    };
    const setPos = (reel, pos, speed) => {
      const L = reel.cycle.length;
      reel.pos = ((pos % L) + L) % L;
      reel.strip.setAttribute('transform', 'translate(0 ' + (-reel.pos * CH).toFixed(3) + ')');
      reel.strip.setAttribute('opacity', (1 - .58 * Math.min(1, (speed || 0) / VNOM)).toFixed(3));
    };

    // ── bottom: paytable preview (idle) / readout (final)
    const tableG = el('g', { 'class': K + '-table' });
    const buildTable = (table) => {
      while (tableG.firstChild) tableG.removeChild(tableG.firstChild);
      const rows = table.slice(0, 6);
      const gap = Math.min(17, 84 / rows.length);
      const x0 = 50 - gap * (rows.length - 1) / 2;
      rows.forEach((p, i) => {
        const cx = x0 + i * gap;
        icon(p[0], cx, 80.5, 8, tableG);
        txt(cx, 92.5, K + '-pay ' + K + '-muted', (p[1] / 10000).toFixed(0) + '×', tableG);
      });
    };
    const readout = el('g', { 'class': K + '-readout' });
    const kind = txt(50, 75.5, K + '-kind ' + K + '-muted', '', readout);
    const mult = txt(50, 85.5, K + '-mult', '', readout);
    const out = txt(50, 93, K + '-out', '', readout);
    const fiat = txt(50, 97.6, K + '-fiat', '', readout);

    const lineOf = (o, fallback) => { const l = o && o.details && Array.isArray(o.details.line) ? o.details.line : []; return [0, 1, 2].map((i) => String(l[i] == null ? fallback : l[i])); };
    const cycleFor = (base, line) => { const c = base.slice(); for (const id of line) if (c.indexOf(id) < 0) c.push(id); return c; };
    const spread = (i, seed) => { const v = Math.sin(i * 12.9898 + seed * 78.233) * 43758.5453; return v - Math.floor(v); };
    const seedOf = (line) => { let h = 0; for (const ch of line.join('|')) h = (h * 31 + ch.charCodeAt(0)) % 100003; return h; };
    const targetPos = (cycle, id, r, seed) => {
      const occ = []; cycle.forEach((c, j) => { if (c === id) occ.push(j); });
      const j = occ[Math.floor(spread(r + 1, seed) * occ.length) % occ.length];
      return ((j - 1) % cycle.length + cycle.length) % cycle.length;
    };

    let table = tableOf(), base = stripOf(table);
    const clearReadout = () => { kind.textContent = ''; mult.textContent = ''; out.textContent = ''; fiat.textContent = ''; };
    const idle = () => {
      table = tableOf(); base = stripOf(table);
      delete box.dataset.tone;
      sub.textContent = ctx.text('reveal.slots3.centre');
      buildTable(table);
      reels.forEach((reel, r) => {
        // the strip is rebuilt only when the symbol set changed (mount, new config);
        // otherwise a reel keeps the symbol it stands on — no snap between rounds
        if (!sameCycle(reel.cycle, base)) { buildStrip(reel, base); setPos(reel, IDLE_POS[r] % base.length, 0); }
        else setPos(reel, Math.round(reel.pos), 0);
        reel.hi.classList.remove(K + '-on');
      });
      clearReadout();
    };
    const finish = (o, line) => {
      const k = o.details && o.details.outcome;
      let lit = [];
      if (k === 'triple') lit = [0, 1, 2];
      else if (k === 'pair') {
        const p = line[0] === line[1] || line[0] === line[2] ? line[0] : line[1] === line[2] ? line[1] : null;
        if (p !== null) lit = [0, 1, 2].filter((i) => line[i] === p);
      }
      reels.forEach((reel, r) => reel.hi.classList.toggle(K + '-on', lit.indexOf(r) >= 0));
      kind.textContent = ctx.text(k === 'triple' ? 'reveal.slots3.triple' : k === 'pair' ? 'reveal.slots3.pair' : 'reveal.slots3.none');
      mult.textContent = ctx.fmt.mult(o.multiplierBps);
      out.textContent = o.win ? ctx.fmt.won(o.payoutLamports) : ctx.fmt.lost();
      fiat.textContent = (o.win && ctx.fmt.fiat(o.payoutLamports)) || '';
      box.dataset.tone = o.win ? 'win' : 'loss';
    };

    // ── motion ──────────────────────────────────────────────────────────
    // A run from rest ramps linearly over ACCEL ms to VNOM; a run that continues a
    // pre-roll has `ramp` ms of that ramp left. `off` is the time a ramped run lags
    // behind a constant one — it makes the stop-time equation exact either way.
    const runOf = (ramp) => {
      const v0 = VNOM * (1 - ramp / ACCEL), acc = ramp > 0 ? (VNOM - v0) / ramp : 0;
      return {
        off: ramp * ramp / (2 * ACCEL),
        dist: (t) => (t <= 0 ? 0 : t < ramp ? v0 * t + acc * t * t / 2 : v0 * ramp + acc * ramp * ramp / 2 + VNOM * (t - ramp)),
        speed: (t) => (t <= 0 ? 0 : t < ramp ? v0 + acc * t : VNOM),
      };
    };
    const REST = runOf(ACCEL);
    let raf = 0, pending = null, armed = null;
    const cancel = () => {
      if (raf) cancelAnimationFrame(raf); raf = 0;
      if (pending) { const p = pending; pending = null; p(); }
    };
    // Where the pre-roll has taken reel r after `rolled` ms.
    const rolledPos = (a, r, rolled) => (a.reduced ? a.p[r] : a.p[r] - REST.dist(rolled));
    idle();
    root.dataset.state = 'idle';

    return {
      play(o, opts) {
        cancel();
        const a = armed; armed = null;
        const now = performance.now();
        const rolled = a ? now - a.t0 : 0;
        o = o || {};
        const line = lineOf(o, base[0]);
        const cycle = cycleFor(base, line);
        const seed = seedOf(line);
        root.dataset.state = 'playing';
        delete box.dataset.tone;
        // empty the readout and drop the last round's highlight BEFORE the reels move —
        // a previous result must not sit in the DOM during the spin (docs/RULES.md, rule 16)
        clearReadout();
        reels.forEach((reel) => reel.hi.classList.remove(K + '-on'));
        let prevTs = -Infinity;
        const plan = reels.map((reel, r) => {
          // the strip changes only in the fallback case (a line symbol outside the table)
          if (!sameCycle(reel.cycle, cycle)) buildStrip(reel, cycle);
          const L = cycle.length;
          const p0 = a ? rolledPos(a, r, rolled) : reel.pos;
          const tgt = targetPos(cycle, line[r], r, seed);
          const need = (((p0 - tgt) % L) + L) % L;           // symbols down to the target
          const ramp = a && !a.reduced ? Math.max(0, ACCEL - rolled) : ACCEL;
          const run = runOf(ramp);
          const minTs = Math.max(BASE[r] - rolled, ramp, prevTs + GAP);
          // first stop at/after the minimum that lands exactly: run + ease-out = need + n laps
          let n = 0, ts;
          for (;;) { ts = (need + n * L) / VNOM + run.off - DECEL / 3; if (ts >= minTs) break; n++; }
          prevTs = ts;
          return { p0, tgt, ts, run };
        });
        const T = Math.max.apply(null, plan.map((p) => p.ts + DECEL));
        const at = (p, t) => {
          if (t >= p.ts + DECEL) return { pos: p.tgt, v: 0 };
          if (t < p.ts) return { pos: p.p0 - p.run.dist(t), v: p.run.speed(t) };
          const u = (t - p.ts) / DECEL;
          return { pos: p.p0 - (p.run.dist(p.ts) + VNOM * DECEL / 3 * (1 - Math.pow(1 - u, 3))), v: VNOM * (1 - u) * (1 - u) };
        };
        return new Promise((resolve) => {
          pending = resolve;
          const done = () => { finish(o, line); root.dataset.state = 'done'; pending = null; resolve(); };
          if (opts && opts.reducedMotion) { plan.forEach((p, r) => setPos(reels[r], p.tgt, 0)); done(); return; }
          let shown = false;
          const frame = (nowF) => {
            const t = nowF - now;
            plan.forEach((p, r) => { const s = at(p, t); setPos(reels[r], s.pos, s.v); });
            if (!shown && t >= T + SHOW) { shown = true; finish(o, line); }
            if (t >= T + TAIL) { raf = 0; done(); return; }
            raf = requestAnimationFrame(frame);
          };
          raf = requestAnimationFrame(frame);
        });
      },
      // Pre-roll: the round is submitted, the outcome still on its way. Nothing here
      // knows the result — the reels just leave their position at cruise speed.
      arm(opts) {
        cancel();
        const a = { t0: performance.now(), p: reels.map((reel) => reel.pos), reduced: !!(opts && opts.reducedMotion) };
        armed = a;
        root.dataset.state = 'playing';
        delete box.dataset.tone;
        clearReadout();
        reels.forEach((reel) => reel.hi.classList.remove(K + '-on'));
        if (a.reduced) return;
        const roll = (nowF) => {
          const t = nowF - a.t0;
          reels.forEach((reel, r) => setPos(reel, a.p[r] - REST.dist(t), REST.speed(t)));
          raf = requestAnimationFrame(roll);
        };
        raf = requestAnimationFrame(roll);
      },
      // The round did not happen: settle every reel on the next whole symbol, no result.
      disarm() {
        const a = armed;
        if (!a) return;
        armed = null;
        cancel();
        if (a.reduced) { root.dataset.state = 'idle'; return; }
        const t0 = performance.now();
        const rolled = t0 - a.t0;
        const stops = reels.map((reel, r) => {
          const p = rolledPos(a, r, rolled);
          let end = Math.floor(p);
          if (p - end < 0.15) end -= 1;                  // always some travel — no dead stop
          return { p, end };
        });
        const settle = (nowF) => {
          const u = Math.min(1, (nowF - t0) / SETTLE), e = 1 - Math.pow(1 - u, 3);
          stops.forEach((st, r) => setPos(reels[r], st.p - (st.p - st.end) * e, 3 * (st.p - st.end) * (1 - u) * (1 - u) / SETTLE));
          if (u >= 1) { raf = 0; root.dataset.state = 'idle'; return; }
          raf = requestAnimationFrame(settle);
        };
        raf = requestAnimationFrame(settle);
      },
      reset() { cancel(); armed = null; idle(); root.dataset.state = 'idle'; },
      destroy() { cancel(); armed = null; },
    };
  },
};
