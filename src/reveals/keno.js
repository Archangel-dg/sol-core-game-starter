// Sol-Core reveal — keno (single, Table).
//
// A board of 1–pool fills the square. On play the player's picks are outlined, then the
// drawn numbers land one after another in `details.drawn` order (~120 ms apart) as
// filled balls; a ball on a pick is a hit and turns accent, and the hits counter in the
// header ticks up as hits land — never ahead of the visible balls. Once all balls stand
// the readout appears (multiplier, won/lost, hits).
//
// The pool is CONFIG, not outcome: `engineConfig.pool` (20–80) builds the board, idle
// and per round alike. The hit count is the server's `details.hits`, never recomputed.
//
// Text through `ctx.text(...)`, colours through the theme tokens. Design zone.

/** @type {import('../lib/reveal').RevealModule} */
export const reveal = {
  key: 'keno',
  mechanic: 'single',
  strings: ['reveal.won', 'result.lost', 'reveal.keno.hits', 'reveal.keno.hint', 'reveal.keno.sub'],

  mount(root, ctx) {
    const C = 'sca-keno';
    const STEP = 120, BALL_MS = 200, READOUT_MS = 200;
    const POOL_DEFAULT = 40;

    const CSS = `
.${C}{position:absolute;inset:0;overflow:hidden;font-family:var(--mono);color:var(--fg);--u:3.6px;user-select:none;-webkit-user-select:none;font-variant-numeric:tabular-nums}
.${C} .${C}-head{position:absolute;left:8%;right:8%;top:5.5%;display:flex;justify-content:space-between;align-items:baseline;font-size:calc(var(--u)*3.2);line-height:1;letter-spacing:.14em;color:var(--muted);white-space:nowrap}
.${C} .${C}-head b{font-weight:600;color:var(--fg)}
.${C} .${C}-hits{color:var(--fg);letter-spacing:.06em;transition:color .2s ease}
.${C}.${C}-live .${C}-hits.${C}-lit{color:var(--accent)}
.${C} .${C}-board{position:absolute;left:8%;top:13.5%;width:84%;height:54%;display:grid;gap:calc(var(--u)*1.2)}
.${C} .${C}-cell{position:relative;box-sizing:border-box;overflow:hidden;border-radius:calc(var(--u)*1.1);border:1px solid var(--line);background:var(--panel);display:flex;align-items:center;justify-content:center;transition:border-color .2s ease,color .2s ease}
.${C} .${C}-num{font-size:calc(var(--u)*3.4);font-weight:500;line-height:1;color:var(--muted);transition:color .2s ease}
.${C}.${C}-dense .${C}-num{font-size:calc(var(--u)*2.6)}
.${C} .${C}-cell.${C}-pick{border:calc(var(--u)*.45) solid var(--fg)}
.${C} .${C}-cell.${C}-pick .${C}-num{color:var(--fg);font-weight:700}
.${C} .${C}-ball{position:absolute;left:9%;top:9%;width:82%;height:82%;border-radius:50%;background:var(--fg);color:var(--night);display:flex;align-items:center;justify-content:center;font-size:calc(var(--u)*3.4);font-weight:700;line-height:1;opacity:0;transform:scale(.4)}
.${C}.${C}-dense .${C}-ball{font-size:calc(var(--u)*2.6)}
.${C} .${C}-cell.${C}-hit .${C}-ball{background:var(--accent)}
.${C} .${C}-cell.${C}-hit{border-color:var(--accent)}
.${C}.${C}-done .${C}-cell:not(.${C}-pick):not(.${C}-drawn) .${C}-num{color:var(--faint)}
.${C} .${C}-hint{position:absolute;left:0;right:0;top:76%;text-align:center;font-size:calc(var(--u)*3.3);line-height:1.3;color:var(--muted);white-space:nowrap;transition:opacity .2s ease}
.${C}.${C}-live .${C}-hint{opacity:0}
.${C} .${C}-readout{position:absolute;left:0;right:0;top:71.5%;text-align:center;opacity:0;transform:translateY(calc(var(--u)*1.5));transition:opacity .2s ease,transform .2s ease}
.${C}.${C}-done .${C}-readout{opacity:1;transform:none}
.${C} .${C}-mult{font-size:calc(var(--u)*6);font-weight:700;line-height:1.1;color:var(--fg)}
.${C}.${C}-loss .${C}-mult{color:var(--red)}
.${C} .${C}-res{font-size:calc(var(--u)*4.4);line-height:1.2;margin-top:calc(var(--u)*1.2);font-weight:600}
.${C}.${C}-win .${C}-res{color:var(--accent)}
.${C}.${C}-loss .${C}-res{color:var(--red)}
.${C} .${C}-fiat{font-size:calc(var(--u)*3.2);line-height:1.2;margin-top:calc(var(--u)*.6);color:var(--muted)}
.${C} .${C}-sub{font-size:calc(var(--u)*3.3);line-height:1.2;margin-top:calc(var(--u)*1.2);color:var(--muted)}
.${C}.${C}-still .${C}-readout,.${C}.${C}-still .${C}-cell,.${C}.${C}-still .${C}-num,.${C}.${C}-still .${C}-hint,.${C}.${C}-still .${C}-hits{transition:none}
@media (prefers-reduced-motion:reduce){.${C} .${C}-readout,.${C} .${C}-cell,.${C} .${C}-num,.${C} .${C}-hint,.${C} .${C}-hits{transition:none}}
`;
    const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
    const ints = (a) => (Array.isArray(a) ? a : []).map((v) => Math.round(Number(v))).filter((v) => isFinite(v) && v >= 1);
    const easeOut = (t) => 1 - (1 - t) * (1 - t) * (1 - t);

    const style = el('style'); style.textContent = CSS; root.appendChild(style);
    const wrap = el('div', C);
    const head = el('div', C + '-head');
    const title = el('b', null, '');
    const hitsEl = el('span', C + '-hits', '');
    head.appendChild(title); head.appendChild(hitsEl);
    const board = el('div', C + '-board');
    const hint = el('div', C + '-hint', '');
    const readout = el('div', C + '-readout');
    const outMult = el('div', C + '-mult'); const outRes = el('div', C + '-res'); const outFiat = el('div', C + '-fiat'); const outSub = el('div', C + '-sub');
    readout.appendChild(outMult); readout.appendChild(outRes); readout.appendChild(outFiat); readout.appendChild(outSub);
    wrap.appendChild(head); wrap.appendChild(board); wrap.appendChild(hint); wrap.appendChild(readout);
    root.appendChild(wrap);

    // The pool from the game's config (20–80); the board is rebuilt only when it changes.
    const configPool = () => {
      const p = Math.round(Number((ctx.engineConfig || {}).pool));
      return Number.isFinite(p) && p >= 2 && p <= 200 ? p : POOL_DEFAULT;
    };
    let pool = 0; let cells = [], balls = [];
    const buildBoard = (n) => {
      if (n === pool) return;
      pool = n;
      board.innerHTML = ''; cells = []; balls = [];
      const cols = n <= 40 ? 8 : 10;
      wrap.classList.toggle(C + '-dense', n > 40);
      board.style.gridTemplateColumns = 'repeat(' + cols + ',1fr)';
      board.style.gridTemplateRows = 'repeat(' + Math.ceil(n / cols) + ',1fr)';
      for (let i = 1; i <= n; i++) {
        const c = el('div', C + '-cell');
        const num = el('span', C + '-num', String(i));
        const b = el('div', C + '-ball', String(i));
        c.appendChild(num); c.appendChild(b); board.appendChild(c);
        cells.push(c); balls.push(b);
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

    const drawBall = (n, isHit, t) => {
      const c = cells[n - 1], b = balls[n - 1]; if (!c) return;
      if (t <= 0) { b.style.opacity = '0'; b.style.transform = 'scale(.4)'; c.classList.remove(C + '-drawn', C + '-hit'); return; }
      const k = easeOut(t);
      b.style.opacity = String(Math.min(1, t * 2));
      b.style.transform = 'scale(' + (0.4 + 0.6 * k).toFixed(3) + ')';
      c.classList.add(C + '-drawn');
      // the hit colour arrives with the ball, not before it
      if (isHit && t >= 0.5) c.classList.add(C + '-hit'); else c.classList.remove(C + '-hit');
    };
    const setHits = (h, total, lit) => {
      hitsEl.textContent = ctx.text('reveal.keno.hits', { h, n: total });
      hitsEl.classList.toggle(C + '-lit', !!lit);
    };
    const clearMarks = () => {
      wrap.classList.remove(C + '-win', C + '-loss', C + '-done', C + '-still', C + '-live');
      for (let i = 0; i < cells.length; i++) { cells[i].classList.remove(C + '-pick', C + '-drawn', C + '-hit'); balls[i].style.opacity = '0'; balls[i].style.transform = 'scale(.4)'; }
      outMult.textContent = ''; outRes.textContent = ''; outFiat.textContent = ''; outSub.textContent = '';
    };
    const cancel = () => {
      if (raf) cancelAnimationFrame(raf); raf = 0;
      if (timer) clearTimeout(timer); timer = 0;
      if (pending) { const r = pending; pending = null; r(); }
    };
    const finish = () => { const r = pending; pending = null; if (r) r(); };

    const play = (outcome, opts) => {
      cancel();
      const o = outcome || {};
      const d = o.details || {};
      const reduced = !!(opts && opts.reducedMotion);
      root.dataset.state = 'playing';
      const picks = ints(d.picks);
      const drawn = ints(d.drawn);
      // pool from config; a number beyond it (mismatched config) still gets a board big enough
      const need = Math.max(configPool(), ...picks, ...drawn);
      buildBoard(need);
      clearMarks();
      if (reduced) wrap.classList.add(C + '-still');
      wrap.classList.add(C + '-live');
      measure();
      const pickSet = new Set(picks);
      for (const p of picks) if (cells[p - 1]) cells[p - 1].classList.add(C + '-pick');
      const isHit = drawn.map((n) => pickSet.has(n));
      const hitsFinal = Number(d.hits) || 0;   // server value only
      setHits(0, picks.length, false);

      const settle = () => {
        for (let i = 0; i < drawn.length; i++) drawBall(drawn[i], isHit[i], 1);
        setHits(hitsFinal, picks.length, hitsFinal > 0);
        outMult.textContent = ctx.fmt.mult(o.multiplierBps);
        outRes.textContent = o.win ? ctx.fmt.won(o.payoutLamports) : ctx.fmt.lost();
        outFiat.textContent = (o.win && ctx.fmt.fiat(o.payoutLamports)) || '';
        outSub.textContent = ctx.text('reveal.keno.sub', { hits: hitsFinal, picks: picks.length, drawn: drawn.length });
        wrap.classList.add(o.win ? C + '-win' : C + '-loss');
        wrap.classList.add(C + '-done');
        root.dataset.state = 'done';
      };

      return new Promise((resolve) => {
        pending = resolve;
        if (reduced) { settle(); finish(); return; }
        const total = Math.max(0, drawn.length - 1) * STEP + BALL_MS;
        const t0 = performance.now();
        const step = (now) => {
          const e = now - t0;
          let seen = 0;
          for (let i = 0; i < drawn.length; i++) {
            let t = (e - i * STEP) / BALL_MS; if (t < 0) t = 0; if (t > 1) t = 1;
            drawBall(drawn[i], isHit[i], t);
            if (t >= 0.5 && isHit[i]) seen++;
          }
          setHits(seen, picks.length, seen > 0);
          if (e < total) { raf = requestAnimationFrame(step); return; }
          raf = 0;
          settle();
          timer = setTimeout(() => { timer = 0; finish(); }, READOUT_MS);
        };
        raf = requestAnimationFrame(step);
      });
    };

    const reset = () => {
      cancel();
      buildBoard(configPool());
      clearMarks();
      title.textContent = '1–' + pool;
      hitsEl.textContent = ''; hitsEl.classList.remove(C + '-lit');
      hint.textContent = ctx.text('reveal.keno.hint');
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
