// Sol-Core reveal — wheel (single, Interactive).
//
// An SVG wheel of N equal slices (one per table entry, labelled with its multiplier,
// tinted by tier) sits under a fixed pointer at the top. On play the rotor turns
// clockwise a fixed number of full turns plus the arc needed to bring the centre of
// `details.segmentIndex` under the pointer, with one cubic ease-out — no wobble, no
// edge stop. Then the landed slice is lit and the readout appears; before that the
// readout nodes are empty.
//
// Labels: the server's config echo carries `segmentMultipliersBps` (one per slice),
// so the idle wheel AND every round show the game's real table. Without an echo the
// slices are numbered neutrally — a label under the pointer can never contradict
// the readout.
//
// Text through `ctx.text(...)`, colours through the theme tokens. Design zone.

/** @type {import('../lib/reveal').RevealModule} */
export const reveal = {
  key: 'wheel',
  mechanic: 'single',
  strings: ['reveal.won', 'result.lost', 'reveal.roll', 'reveal.wheel.cap', 'reveal.wheel.landed'],

  mount(root, ctx) {
    const C = 'sca-wheel';
    const SPIN_MS = 2400, HOLD_MS = 260, TURNS = 4;
    const CX = 50, CY = 43, R = 31;

    const CSS = `
.${C}{position:absolute;inset:0;overflow:hidden;font-family:var(--mono);color:var(--fg);--u:3.6px;user-select:none;-webkit-user-select:none}
.${C} .${C}-svg{position:absolute;inset:0;width:100%;height:100%;display:block;font-family:var(--mono)}
.${C} .${C}-seg{transition:opacity .25s ease}
.${C} .${C}-seg path{stroke:var(--night);stroke-width:.7;stroke-linejoin:round}
.${C} .${C}-seg text{font-variant-numeric:tabular-nums;font-weight:600;letter-spacing:.02em}
.${C} .${C}-ring{fill:none;stroke:var(--line);stroke-width:.8}
.${C} .${C}-hub{fill:var(--night);stroke:var(--line);stroke-width:.8}
.${C} .${C}-ptr{fill:var(--fg);stroke:var(--night);stroke-width:.6;stroke-linejoin:round;transition:fill .25s ease}
.${C}.${C}-done .${C}-seg:not(.${C}-hit){opacity:.5}
.${C}.${C}-win .${C}-hit path{stroke:var(--accent);stroke-width:1.1}
.${C}.${C}-loss .${C}-hit path{stroke:var(--red);stroke-width:1.1}
.${C}.${C}-loss .${C}-hit text{fill:var(--red)}
.${C}.${C}-win .${C}-ptr{fill:var(--accent)}
.${C}.${C}-loss .${C}-ptr{fill:var(--red)}
.${C} .${C}-readout{position:absolute;left:0;right:0;top:78%;text-align:center;font-variant-numeric:tabular-nums}
.${C} .${C}-cap{font-size:calc(var(--u)*3.4);line-height:1.3;color:var(--muted);padding-top:calc(var(--u)*3)}
.${C} .${C}-out{opacity:0;transform:translateY(calc(var(--u)*1.5));transition:opacity .2s ease,transform .2s ease}
.${C}.${C}-done .${C}-out{opacity:1;transform:none}
.${C}.${C}-done .${C}-cap{display:none}
.${C} .${C}-mult{font-size:calc(var(--u)*6);font-weight:700;line-height:1.1}
.${C}.${C}-win .${C}-mult{color:var(--accent)}
.${C}.${C}-loss .${C}-mult{color:var(--red)}
.${C} .${C}-res{font-size:calc(var(--u)*4.2);line-height:1.2;margin-top:calc(var(--u)*1);font-weight:600}
.${C}.${C}-win .${C}-res{color:var(--accent)}
.${C}.${C}-loss .${C}-res{color:var(--red)}
.${C} .${C}-fiat{font-size:calc(var(--u)*3.2);line-height:1.2;margin-top:calc(var(--u)*.6);color:var(--muted)}
.${C} .${C}-roll{font-size:calc(var(--u)*3.2);line-height:1.2;margin-top:calc(var(--u)*1);color:var(--muted)}
.${C}.${C}-still .${C}-out,.${C}.${C}-still .${C}-seg,.${C}.${C}-still .${C}-ptr{transition:none}
@media (prefers-reduced-motion:reduce){.${C} .${C}-out,.${C} .${C}-seg,.${C} .${C}-ptr{transition:none}}
`;
    const shortMult = (bps) => (Number(bps || 0) / 10000).toFixed(2).replace(/\.?0+$/, '') + '×';
    const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
    const NS = 'http://www.w3.org/2000/svg';
    const svgEl = (tag, attrs) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };
    const pt = (a, r) => [CX + r * Math.sin(a), CY - r * Math.cos(a)];
    const f3 = (n) => n.toFixed(3);
    const slicePath = (a0, a1) => {
      const [x0, y0] = pt(a0, R), [x1, y1] = pt(a1, R);
      const large = (a1 - a0) > Math.PI ? 1 : 0;
      return 'M' + CX + ' ' + CY + 'L' + f3(x0) + ' ' + f3(y0) + 'A' + R + ' ' + R + ' 0 ' + large + ' 1 ' + f3(x1) + ' ' + f3(y1) + 'Z';
    };
    // The game's table from the config echo; null when the server does not send one.
    const configTable = () => {
      const cfg = ctx.engineConfig || {};
      const t = Array.isArray(cfg.segmentMultipliersBps) ? cfg.segmentMultipliersBps.map((b) => Math.round(Number(b))) : null;
      return t && t.length >= 2 && t.every((b) => Number.isFinite(b)) ? t : null;
    };
    // Table for a slice count: the config table when it fits (same count and — for a round —
    // the landed slice pays what the outcome says), otherwise neutral numbered slices.
    const NEUTRAL = {};
    const tableFor = (n, check) => {
      const t = configTable();
      if (t && t.length === n && (!check || t[check.idx] === Math.round(Number(check.multiplierBps)))) return t;
      if (!NEUTRAL[n]) { const u = []; for (let i = 0; i < n; i++) u.push(null); NEUTRAL[n] = u; }
      return NEUTRAL[n];
    };

    const style = el('style'); style.textContent = CSS; root.appendChild(style);
    const wrap = el('div', C);
    const svg = svgEl('svg', { viewBox: '0 0 100 100', class: C + '-svg', 'aria-hidden': 'true' });
    const rotor = svgEl('g', { class: C + '-rotor' });
    const ring = svgEl('circle', { class: C + '-ring', cx: CX, cy: CY, r: R + 0.9 });
    const hub = svgEl('circle', { class: C + '-hub', cx: CX, cy: CY, r: 5 });
    const ptr = svgEl('polygon', { class: C + '-ptr', points: '46.2,7 53.8,7 50,17.5' });
    svg.appendChild(ring); svg.appendChild(rotor); svg.appendChild(hub); svg.appendChild(ptr);
    const readout = el('div', C + '-readout');
    const cap = el('div', C + '-cap');
    const out = el('div', C + '-out');
    const outMult = el('div', C + '-mult'); const outRes = el('div', C + '-res'); const outFiat = el('div', C + '-fiat'); const outRoll = el('div', C + '-roll');
    out.appendChild(outMult); out.appendChild(outRes); out.appendChild(outFiat); out.appendChild(outRoll);
    readout.appendChild(cap); readout.appendChild(out);
    wrap.appendChild(svg); wrap.appendChild(readout);
    root.appendChild(wrap);

    const measure = () => {
      const r = root.getBoundingClientRect();
      const side = Math.min(r.width, r.height) || 360;
      wrap.style.setProperty('--u', (side / 100).toFixed(3) + 'px');
    };
    measure();
    let ro = null;
    if (typeof ResizeObserver === 'function') { ro = new ResizeObserver(measure); ro.observe(root); }

    let segTable = null, segNodes = [], rot = 0;
    let raf = 0, timer = 0, pending = null;

    const build = (n, check) => {
      const table = tableFor(n, check);
      if (table === segTable) return;
      segTable = table; segNodes = [];
      while (rotor.firstChild) rotor.removeChild(rotor.firstChild);
      const positive = table.filter((b) => b != null && b > 0);
      const tiers = Array.from(new Set(positive)).sort((a, b) => a - b);
      const fs = Math.max(3.1, Math.min(4.4, 26 / n));
      for (let i = 0; i < n; i++) {
        const a0 = i * 2 * Math.PI / n, a1 = (i + 1) * 2 * Math.PI / n;
        const midDeg = (i + 0.5) * 360 / n;
        const bps = table[i];
        const g = svgEl('g', { class: C + '-seg' });
        const path = svgEl('path', { d: slicePath(a0, a1) });
        let labelFill = 'var(--fg)';
        if (bps == null) { path.setAttribute('fill', 'var(--panel-strong)'); }
        else if (bps === 0) { path.setAttribute('fill', 'var(--panel-strong)'); labelFill = 'var(--muted)'; }
        else {
          const rank = tiers.indexOf(bps);
          const op = tiers.length > 1 ? 0.14 + 0.56 * rank / (tiers.length - 1) : 0.4;
          path.setAttribute('fill', 'var(--accent)');
          path.setAttribute('fill-opacity', op.toFixed(2));
          if (op >= 0.6) labelFill = 'var(--night)';
        }
        const text = svgEl('text', { x: CX, y: CY - 0.64 * R, 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': fs.toFixed(2), fill: labelFill, transform: 'rotate(' + midDeg.toFixed(3) + ' ' + CX + ' ' + CY + ')' });
        text.textContent = bps == null ? String(i + 1) : shortMult(bps);
        g.appendChild(path); g.appendChild(text); rotor.appendChild(g); segNodes.push(g);
      }
      const max = positive.length ? Math.max.apply(null, positive) : null;
      cap.textContent = ctx.text('reveal.wheel.cap', { n, max: max != null ? shortMult(max) : '—' });
    };
    const apply = (a) => { rot = a; rotor.setAttribute('transform', 'rotate(' + a.toFixed(3) + ' ' + CX + ' ' + CY + ')'); };
    const clearMarks = () => {
      wrap.classList.remove(C + '-win', C + '-loss', C + '-done', C + '-still');
      for (const g of segNodes) g.classList.remove(C + '-hit');
      outMult.textContent = ''; outRes.textContent = ''; outFiat.textContent = ''; outRoll.textContent = '';
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
      const d = o.details || {};
      const reduced = !!(opts && opts.reducedMotion);
      root.dataset.state = 'playing';
      clearMarks();
      if (reduced) wrap.classList.add(C + '-still');
      measure();
      const cfgN = (configTable() || []).length;
      const n = Math.max(2, Math.floor(Number(d.segments)) || cfgN || 6);
      let idx = Math.floor(Number(d.segmentIndex)); if (!(idx >= 0 && idx < n)) idx = 0;
      build(n, { idx, multiplierBps: o.multiplierBps });

      // centre of slice idx must sit at the top: rot ≡ -(idx + 0.5) * 360 / n  (mod 360)
      const targetMod = (((-(idx + 0.5) * 360 / n) % 360) + 360) % 360;
      const start = rot;
      const startMod = ((start % 360) + 360) % 360;
      const delta = TURNS * 360 + ((targetMod - startMod + 360) % 360);
      const target = start + delta;

      // The readout enters the DOM only here — the rotor rests.
      const land = () => {
        apply(target % 360);
        outMult.textContent = ctx.fmt.mult(o.multiplierBps);
        outRes.textContent = o.win ? ctx.fmt.won(o.payoutLamports) : ctx.fmt.lost();
        outFiat.textContent = (o.win && ctx.fmt.fiat(o.payoutLamports)) || '';
        const parts = [];
        if (typeof o.roll === 'number' && isFinite(o.roll)) parts.push(ctx.text('reveal.roll', { roll: o.roll.toFixed(2) }));
        parts.push(ctx.text('reveal.wheel.landed', { idx, n }));
        outRoll.textContent = parts.join(' · ');
        segNodes[idx].classList.add(C + '-hit');
        wrap.classList.add(o.win ? C + '-win' : C + '-loss');
        wrap.classList.add(C + '-done');
      };

      return new Promise((resolve) => {
        pending = resolve;
        if (reduced) { land(); finish(); return; }
        const t0 = performance.now();
        const step = (now) => {
          let t = (now - t0) / SPIN_MS; if (t < 0) t = 0; if (t > 1) t = 1;
          const p = 1 - Math.pow(1 - t, 3);
          apply(start + delta * p);
          if (t < 1) { raf = requestAnimationFrame(step); return; }
          raf = 0;
          land();
          timer = setTimeout(() => { timer = 0; finish(); }, HOLD_MS);
        };
        raf = requestAnimationFrame(step);
      });
    };

    const reset = () => {
      cancel();
      clearMarks();
      segTable = null;
      const cfg = ctx.engineConfig || {};
      const n = (configTable() || []).length || Math.max(2, Math.floor(Number(cfg.segmentCount)) || 6);
      build(n, null);
      apply(0);
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
