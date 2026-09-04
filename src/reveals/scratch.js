// Sol-Core reveal — scratch (single, Instant).
//
// A ticket with `engineConfig.fields` foil fields (3–25, laid out as a near-square grid).
// On play the fields are scratched clear one after another, each with a diagonal
// coin-stroke wipe, and reveal a multiplier symbol per field. A win shows the
// outcome's multiplier on THREE fields chosen by `details.prizeIndex` (on the classic
// 3×3 ticket: one of the eight lines); a blank shows fillers with no symbol on three
// fields, so a loss never looks like "almost" (no near-miss dressing). The ticket is
// turned by one of the eight grid symmetries chosen from a hash of the roll, so a loss
// is not always the same picture. Readout once all fields stand open.
//
// Text through `ctx.text(...)`, colours through the theme tokens. Design zone.

/** @type {import('../lib/reveal').RevealModule} */
export const reveal = {
  key: 'scratch',
  mechanic: 'single',
  strings: ['reveal.won', 'result.lost', 'reveal.roll', 'reveal.scratch.match', 'reveal.scratch.hint', 'reveal.scratch.tier', 'reveal.scratch.prize', 'reveal.scratch.blank'],

  mount(root, ctx) {
    const C = 'sca-scratch';
    const STAGGER_BUDGET = 1600;   // ms across all fields (first to last start)
    const FIELD_MS = 420;          // ms one field takes to be scratched clear
    const SHOW_MS = 260;           // readout fade after the last field

    const CSS = `
.${C}{position:absolute;inset:0;overflow:hidden;font-family:var(--mono);color:var(--fg);--u:3.6px;user-select:none;-webkit-user-select:none}
.${C} .${C}-ticket{position:absolute;left:17%;top:6%;width:66%;height:63%;box-sizing:border-box;border:1px solid var(--line);border-radius:calc(var(--u)*2);background:var(--panel)}
.${C} .${C}-head{position:absolute;left:25%;right:25%;top:9%;display:flex;justify-content:space-between;align-items:baseline;font-size:calc(var(--u)*3.2);line-height:1;letter-spacing:.14em;color:var(--muted);white-space:nowrap}
.${C} .${C}-head b{font-weight:600;color:var(--fg)}
.${C} .${C}-grid{position:absolute;left:25%;top:16%;width:50%;height:50%;display:grid;gap:calc(var(--u)*2)}
.${C} .${C}-field{position:relative;box-sizing:border-box;overflow:hidden;border-radius:calc(var(--u)*1.2);border:1px solid var(--line);background:var(--panel-strong);display:flex;align-items:center;justify-content:center;transition:border-color .25s ease,background-color .25s ease}
.${C} .${C}-sym{font-size:calc(var(--u)*5.2);font-weight:700;line-height:1;font-variant-numeric:tabular-nums;color:var(--fg);transition:color .25s ease}
.${C}.${C}-dense .${C}-sym{font-size:calc(var(--u)*3.2)}
.${C} .${C}-foil{position:absolute;inset:0;background-color:var(--night);background-image:repeating-linear-gradient(135deg,var(--panel-strong) 0,var(--panel-strong) calc(var(--u)*1.2),var(--line) calc(var(--u)*1.2),var(--line) calc(var(--u)*2.4));display:flex;align-items:center;justify-content:center}
.${C} .${C}-foil::after{content:'◎';font-size:calc(var(--u)*3.6);line-height:1;color:var(--faint)}
.${C}.${C}-dense .${C}-foil::after{font-size:calc(var(--u)*2.4)}
.${C} .${C}-edge{position:absolute;left:0;top:0;width:300%;height:calc(var(--u)*1.4);background:var(--fg);opacity:0;transform:translate(-50%,-50%) rotate(-45deg);transform-origin:center}
.${C} .${C}-field.${C}-open .${C}-foil{display:none}
.${C} .${C}-field.${C}-hit{border-color:var(--accent);background:var(--panel-strong)}
.${C} .${C}-field.${C}-hit .${C}-sym{color:var(--accent)}
.${C}.${C}-done .${C}-field:not(.${C}-hit) .${C}-sym{color:var(--muted)}
.${C}.${C}-done.${C}-loss .${C}-field{border-color:var(--line)}
.${C} .${C}-hint{position:absolute;left:0;right:0;top:78%;text-align:center;font-size:calc(var(--u)*3.3);line-height:1.3;color:var(--muted);white-space:nowrap;transition:opacity .2s ease}
.${C}.${C}-done .${C}-hint{opacity:0}
.${C} .${C}-readout{position:absolute;left:0;right:0;top:73%;text-align:center;opacity:0;transform:translateY(calc(var(--u)*1.5));transition:opacity .2s ease,transform .2s ease;font-variant-numeric:tabular-nums}
.${C}.${C}-done .${C}-readout{opacity:1;transform:none}
.${C} .${C}-mult{font-size:calc(var(--u)*6);font-weight:700;line-height:1.1;color:var(--fg)}
.${C} .${C}-res{font-size:calc(var(--u)*4.4);line-height:1.2;margin-top:calc(var(--u)*1.2);font-weight:600}
.${C}.${C}-win .${C}-mult,.${C}.${C}-win .${C}-res{color:var(--accent)}
.${C}.${C}-loss .${C}-mult,.${C}.${C}-loss .${C}-res{color:var(--red)}
.${C} .${C}-fiat{font-size:calc(var(--u)*3.2);line-height:1.2;margin-top:calc(var(--u)*.6);color:var(--muted)}
.${C} .${C}-roll{font-size:calc(var(--u)*3.3);line-height:1.2;margin-top:calc(var(--u)*1.2);color:var(--muted)}
.${C}.${C}-still .${C}-readout,.${C}.${C}-still .${C}-field,.${C}.${C}-still .${C}-sym,.${C}.${C}-still .${C}-hint{transition:none}
@media (prefers-reduced-motion:reduce){.${C} .${C}-readout,.${C} .${C}-field,.${C} .${C}-sym,.${C} .${C}-hint{transition:none}}
`;
    // The eight lines of the classic 3×3 ticket: a win's line is LINES[(prizeIndex - 1) mod 8].
    const LINES = [[3, 4, 5], [0, 4, 8], [0, 1, 2], [2, 4, 6], [6, 7, 8], [0, 3, 6], [2, 5, 8], [1, 4, 7]];
    // Filler tiers, distinct enough that no value has to appear three times on a 25-field ticket.
    const FILL = [1, 2, 5, 10, 50, 3, 20, 4, 15, 100, 7, 25, 1.5, 75, 30, 200];
    // Blank classic ticket: laid out so NO line carries two equal symbols.
    const BLANK9 = [1, 2, 5, 10, 50, 1, 2, 5, 10];
    // The eight symmetries of the 3×3 grid (rotations and reflections).
    const SYMS = [
      (r, c) => [r, c], (r, c) => [c, 2 - r], (r, c) => [2 - r, 2 - c], (r, c) => [2 - c, r],
      (r, c) => [r, 2 - c], (r, c) => [2 - r, c], (r, c) => [c, r], (r, c) => [2 - c, 2 - r],
    ];
    const hashOf = (roll) => { const x = Number(roll); const v = isFinite(x) ? x : 0; return Math.abs(Math.sin(v * 12.9898) * 43758.5453); };
    const perm9 = (k) => { const P = []; for (let i = 0; i < 9; i++) { const [r, c] = SYMS[k](i / 3 | 0, i % 3); P.push(r * 3 + c); } return P; };
    const sym = (m) => (Math.round(m * 100) / 100).toString() + '×';
    const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

    // Field count from the game's config (3–25); the classic ticket is 9.
    const configFields = () => {
      const f = Math.round(Number((ctx.engineConfig || {}).fields));
      return Number.isFinite(f) && f >= 3 && f <= 25 ? f : 9;
    };
    // Symbols for the outcome — pure function of fields / win / multiplierBps / prizeIndex / roll.
    // Returns { cells: number[n], hits: number[] }.
    const layout = (o, n) => {
      const m = Number(o.multiplierBps || 0) / 10000;
      const idx = Math.max(1, Math.round(Number((o.details && o.details.prizeIndex) || 1)));
      const h = hashOf(o.roll);
      if (n === 9) {
        const P = perm9(h % 8 | 0);
        const cells = BLANK9.slice();
        let line = null;
        if (o.win) {
          line = LINES[(idx - 1) % LINES.length];
          for (const i of line) cells[i] = m;
          const others = [1, 2, 5, 10, 50].filter((v) => v !== m);
          const count = (v) => cells.reduce((a, c, i) => a + (line.indexOf(i) < 0 && c === v ? 1 : 0), 0);
          for (let i = 0; i < 9; i++) {
            if (line.indexOf(i) >= 0 || cells[i] !== m) continue;
            let best = others[0];
            for (const v of others) if (count(v) < count(best)) best = v;
            cells[i] = best;
          }
        }
        const out = new Array(9);
        for (let i = 0; i < 9; i++) out[P[i]] = cells[i];
        return { cells: out, hits: line ? line.map((i) => P[i]) : [] };
      }
      // Generic ticket: fillers cycle through distinct tiers (each at most twice), the prize
      // symbol stands on three fields spread by prizeIndex, and never on a filler.
      const fillers = FILL.filter((v) => v !== m);
      const cells = [];
      for (let i = 0; i < n; i++) cells.push(fillers[(i + Math.floor(h) % fillers.length) % fillers.length]);
      const hits = [];
      if (o.win) {
        const step = Math.max(1, Math.floor(n / 3));
        for (let k = 0; k < Math.min(3, n); k++) hits.push((idx - 1 + k * step) % n);
        for (const i of hits) cells[i] = m;
      }
      return { cells, hits };
    };
    const foilClip = (d) => {
      if (d <= 0) return 'polygon(0 0,100% 0,100% 100%,0 100%)';
      if (d <= 100) return 'polygon(' + d + '% 0,100% 0,100% 100%,0 100%,0 ' + d + '%)';
      const e = d - 100;
      return 'polygon(100% ' + e + '%,100% 100%,' + e + '% 100%)';
    };

    const style = el('style'); style.textContent = CSS; root.appendChild(style);
    const wrap = el('div', C);
    const ticket = el('div', C + '-ticket');
    const head = el('div', C + '-head');
    const headL = el('b', null, ''); const headR = el('span', null, '');
    head.appendChild(headL); head.appendChild(headR);
    const grid = el('div', C + '-grid');
    const hint = el('div', C + '-hint', '');
    const readout = el('div', C + '-readout');
    const outMult = el('div', C + '-mult'); const outRes = el('div', C + '-res'); const outFiat = el('div', C + '-fiat'); const outRoll = el('div', C + '-roll');
    readout.appendChild(outMult); readout.appendChild(outRes); readout.appendChild(outFiat); readout.appendChild(outRoll);
    wrap.appendChild(ticket); wrap.appendChild(head); wrap.appendChild(grid); wrap.appendChild(hint); wrap.appendChild(readout);
    root.appendChild(wrap);

    let n = 0, fields = [], syms = [], foils = [], edges = [], shown = [];
    const buildGrid = (count) => {
      if (count === n) return;
      n = count;
      grid.innerHTML = ''; fields = []; syms = []; foils = []; edges = []; shown = [];
      const cols = Math.ceil(Math.sqrt(n));
      grid.style.gridTemplateColumns = 'repeat(' + cols + ',1fr)';
      grid.style.gridTemplateRows = 'repeat(' + Math.ceil(n / cols) + ',1fr)';
      wrap.classList.toggle(C + '-dense', n > 12);
      for (let i = 0; i < n; i++) {
        const f = el('div', C + '-field');
        const s = el('div', C + '-sym', '');
        const foil = el('div', C + '-foil');
        const edge = el('div', C + '-edge');
        foil.appendChild(edge); f.appendChild(s); f.appendChild(foil); grid.appendChild(f);
        fields.push(f); syms.push(s); foils.push(foil); edges.push(edge); shown.push(false);
      }
    };

    const measure = () => {
      const r = root.getBoundingClientRect();
      const side = Math.min(r.width, r.height) || 360;
      wrap.style.setProperty('--u', (side / 100).toFixed(3) + 'px');
    };
    measure();
    let ro = null;
    if (typeof ResizeObserver === 'function') { ro = new ResizeObserver(measure); ro.observe(root); }

    let raf = 0, timer = 0, pending = null;
    let cells = null, hits = [];

    const drawField = (i, d) => {
      if (d >= 200) { fields[i].classList.add(C + '-open'); return; }
      fields[i].classList.remove(C + '-open');
      foils[i].style.clipPath = foilClip(d);
      edges[i].style.left = (d / 2) + '%'; edges[i].style.top = (d / 2) + '%';
      edges[i].style.opacity = d > 0 ? '0.55' : '0';
    };
    // symbol text is written only when its field is actually touched by the stroke
    const touch = (i) => {
      if (shown[i] || !cells) return;
      shown[i] = true;
      syms[i].textContent = sym(cells[i]);
    };
    const clearMarks = () => {
      wrap.classList.remove(C + '-win', C + '-loss', C + '-done', C + '-still', C + '-live');
      outMult.textContent = ''; outRes.textContent = ''; outFiat.textContent = ''; outRoll.textContent = '';
      for (let i = 0; i < n; i++) { fields[i].classList.remove(C + '-hit', C + '-open'); shown[i] = false; syms[i].textContent = ''; drawField(i, 0); }
    };
    const cancel = () => {
      if (raf) cancelAnimationFrame(raf); raf = 0;
      if (timer) clearTimeout(timer); timer = 0;
      if (pending) { const r = pending; pending = null; r(); }
    };
    const finish = () => { root.dataset.state = 'done'; const r = pending; pending = null; if (r) r(); };

    const play = (outcome, opts) => {
      cancel();
      const o = outcome || {};
      const reduced = !!(opts && opts.reducedMotion);
      root.dataset.state = 'playing';
      buildGrid(configFields());
      clearMarks();
      if (reduced) wrap.classList.add(C + '-still');
      wrap.classList.add(C + '-live');
      measure();
      const L = layout(o, n); cells = L.cells; hits = L.hits;
      const idx = o.details && typeof o.details.prizeIndex === 'number' ? o.details.prizeIndex : null;
      const stagger = n > 1 ? STAGGER_BUDGET / (n - 1) : 0;
      const total = (n - 1) * stagger + FIELD_MS;

      const settle = () => {
        for (let i = 0; i < n; i++) { touch(i); drawField(i, 200); }
        for (const i of hits) fields[i].classList.add(C + '-hit');
        wrap.classList.add(o.win ? C + '-win' : C + '-loss');
        // the readout enters the DOM only now
        outMult.textContent = ctx.fmt.mult(o.multiplierBps);
        outRes.textContent = o.win ? ctx.fmt.won(o.payoutLamports) : ctx.fmt.lost();
        outFiat.textContent = (o.win && ctx.fmt.fiat(o.payoutLamports)) || '';
        const parts = [o.win ? (idx != null ? ctx.text('reveal.scratch.tier', { idx }) : ctx.text('reveal.scratch.prize')) : ctx.text('reveal.scratch.blank')];
        if (typeof o.roll === 'number' && isFinite(o.roll)) parts.push(ctx.text('reveal.roll', { roll: o.roll.toFixed(2) }));
        outRoll.textContent = parts.join(' · ');
        wrap.classList.add(C + '-done');
      };

      return new Promise((resolve) => {
        pending = resolve;
        if (reduced) { settle(); finish(); return; }
        const t0 = performance.now();
        const step = (now) => {
          const e = now - t0;
          for (let i = 0; i < n; i++) {
            let t = (e - i * stagger) / FIELD_MS; if (t < 0) t = 0; if (t > 1) t = 1;
            if (t > 0) touch(i);
            drawField(i, 200 * t);
          }
          if (e < total) { raf = requestAnimationFrame(step); return; }
          raf = 0;
          settle();
          timer = setTimeout(() => { timer = 0; finish(); }, SHOW_MS);
        };
        raf = requestAnimationFrame(step);
      });
    };

    const reset = () => {
      cancel();
      cells = null; hits = [];
      buildGrid(configFields());
      clearMarks();
      headL.textContent = String(n);
      headR.textContent = ctx.text('reveal.scratch.match');
      hint.textContent = ctx.text('reveal.scratch.hint', { n });
      root.dataset.state = 'idle';
    };

    reset();
    return {
      play,
      reset,
      destroy() { cancel(); if (ro) ro.disconnect(); ro = null; },
    };
  },
};
