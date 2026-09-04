// Sol-Core reveal — dice (single, Instant).
//
// One motion idea: the needle and the big number travel from the low end of the range
// to the server's rollValue with a single cubic ease-out. The target tick and the win
// zone stand still the whole time — the needle never slows, pauses or parks near the
// win line. Win/loss and the multiplier are read from the outcome, never recomputed.
//
// Geometry follows the game: the bar spans `engineConfig.rangeMin … rangeMax` (a dice
// game with a 1–6 range draws a 1–6 bar, not 0–100); per round the target and roll
// come from `details`.
//
// Text through `ctx.text(...)`, colours through the theme tokens. Design zone.

/** @type {import('../lib/reveal').RevealModule} */
export const reveal = {
  key: 'dice',
  mechanic: 'single',
  strings: ['reveal.won', 'result.lost', 'reveal.dice.over', 'reveal.dice.under', 'reveal.dice.chance'],

  mount(root, ctx) {
    const NS = 'http://www.w3.org/2000/svg';
    const X0 = 8, X1 = 92, BAR_Y = 57, BAR_H = 8; // bar geometry in viewBox units (0..100 square)
    const DURATION = 1800, SETTLE = 300;

    const C = 'sca-dice';           // class prefix — every rule is scoped with it
    const CSS = `
.${C}{position:absolute;inset:0;background:var(--night);font-family:var(--mono)}
.${C} svg{position:absolute;inset:0;width:100%;height:100%;display:block}
.${C} text{font-family:var(--mono);font-variant-numeric:tabular-nums;fill:var(--fg)}
.${C} .${C}-muted{fill:var(--muted)}
.${C} .${C}-faint{fill:var(--faint)}
.${C} .${C}-big{font-size:18px;font-weight:700;text-anchor:middle;transition:fill .25s linear}
.${C} .${C}-head{font-size:3.6px;font-weight:600}
.${C} .${C}-sub{font-size:3.4px;text-anchor:end}
.${C} .${C}-tick{font-size:3.2px;text-anchor:middle}
.${C} .${C}-mult{font-size:6px;font-weight:700;text-anchor:middle}
.${C} .${C}-out{font-size:4.4px;font-weight:600;text-anchor:middle}
.${C} .${C}-fiat{font-size:3.1px;text-anchor:middle;fill:var(--muted)}
.${C} .${C}-zone{transition:fill-opacity .3s linear,fill .3s linear}
.${C} .${C}-needle line,.${C} .${C}-needle path{transition:stroke .25s linear,fill .25s linear}
.${C}[data-tone="win"] .${C}-big,.${C}[data-tone="win"] .${C}-out{fill:var(--accent)}
.${C}[data-tone="loss"] .${C}-big,.${C}[data-tone="loss"] .${C}-out{fill:var(--red)}
.${C}[data-tone="win"] .${C}-needle line{stroke:var(--accent)}
.${C}[data-tone="win"] .${C}-needle path{fill:var(--accent)}
.${C}[data-tone="loss"] .${C}-needle line{stroke:var(--red)}
.${C}[data-tone="loss"] .${C}-needle path{fill:var(--red)}
.${C} .${C}-readout{opacity:0;transition:opacity .25s linear}
.${C}[data-tone] .${C}-readout{opacity:1}
@media (prefers-reduced-motion:reduce){.${C} *{transition:none!important}}
`;
    const st = document.createElement('style');
    st.textContent = CSS;
    root.appendChild(st);

    const box = document.createElement('div');
    box.className = 'sca-dice';
    root.appendChild(box);

    const el = (tag, attrs, parent) => {
      const n = document.createElementNS(NS, tag);
      for (const k in attrs) n.setAttribute(k, attrs[k]);
      (parent || svg).appendChild(n);
      return n;
    };
    const svg = el('svg', { viewBox: '0 0 100 100', preserveAspectRatio: 'xMidYMid meet' }, box);

    // header: bet description (left) and win chance (right)
    const head = el('text', { x: X0, y: 12, class: 'sca-dice-head' });
    const sub = el('text', { x: X1, y: 12, class: 'sca-dice-sub sca-dice-muted' });
    // big number
    const big = el('text', { x: 50, y: 42, class: 'sca-dice-big sca-dice-faint' });
    // bar: base, win zone, loss zone, target tick, tick labels
    el('rect', { x: X0, y: BAR_Y, width: X1 - X0, height: BAR_H, rx: 1, fill: 'var(--panel-strong)', stroke: 'var(--line)', 'stroke-width': 0.3 });
    const zoneWin = el('rect', { y: BAR_Y, height: BAR_H, rx: 1, class: 'sca-dice-zone', fill: 'var(--accent)', 'fill-opacity': 0.22 });
    const zoneLoss = el('rect', { y: BAR_Y, height: BAR_H, rx: 1, class: 'sca-dice-zone', fill: 'var(--red)', 'fill-opacity': 0 });
    const tgt = el('line', { y1: BAR_Y - 3, y2: BAR_Y + BAR_H + 3, stroke: 'var(--amber)', 'stroke-width': 0.6 });
    const tgtLbl = el('text', { y: BAR_Y - 6.8, class: 'sca-dice-tick', fill: 'var(--amber)' });
    const ticksG = el('g', {});
    // needle: vertical line through the bar plus a small triangle above it
    const needle = el('g', { class: 'sca-dice-needle' });
    el('line', { x1: 0, x2: 0, y1: BAR_Y - 1.5, y2: BAR_Y + BAR_H + 1.5, stroke: 'var(--fg)', 'stroke-width': 0.9, 'stroke-linecap': 'round' }, needle);
    el('path', { d: 'M-2 ' + (BAR_Y - 5) + ' L2 ' + (BAR_Y - 5) + ' L0 ' + (BAR_Y - 2) + ' Z', fill: 'var(--fg)' }, needle);
    // readout
    const readout = el('g', { class: 'sca-dice-readout' });
    const mult = el('text', { x: 50, y: 84, class: 'sca-dice-mult' }, readout);
    const out = el('text', { x: 50, y: 91, class: 'sca-dice-out' }, readout);
    const fiat = el('text', { x: 50, y: 96, class: 'sca-dice-fiat' }, readout);

    // ── range from the game's config — the bar is the game's range, not 0–100 ──
    let lo = 0, hi = 100, decimals = 2;
    const readRange = () => {
      const cfg = ctx.engineConfig || {};
      const a = Number(cfg.rangeMin), b = Number(cfg.rangeMax), d = Number(cfg.decimals);
      lo = Number.isFinite(a) ? a : 0;
      hi = Number.isFinite(b) && b > lo ? b : lo + 100;
      decimals = Number.isInteger(d) ? Math.min(4, Math.max(0, d)) : 2;
      while (ticksG.firstChild) ticksG.removeChild(ticksG.firstChild);
      for (let i = 0; i <= 4; i++) {
        const v = lo + (hi - lo) * i / 4;
        const x = X0 + (X1 - X0) * i / 4;
        el('line', { x1: x, x2: x, y1: BAR_Y + BAR_H, y2: BAR_Y + BAR_H + 1.5, stroke: 'var(--line)', 'stroke-width': 0.4 }, ticksG);
        el('text', { x, y: BAR_Y + BAR_H + 6, class: 'sca-dice-tick sca-dice-muted' }, ticksG).textContent = fmtV(v);
      }
    };
    const fmtV = (v) => Number(v).toFixed(decimals);
    const xOf = (v) => X0 + (X1 - X0) * Math.min(1, Math.max(0, (v - lo) / (hi - lo || 1)));

    const setNeedle = (v) => {
      needle.setAttribute('transform', 'translate(' + xOf(v).toFixed(3) + ' 0)');
      big.textContent = fmtV(v);
    };
    const setBet = (direction, target, winChance) => {
      const tx = xOf(target);
      if (direction === 'under') {
        zoneWin.setAttribute('x', X0); zoneWin.setAttribute('width', Math.max(0, tx - X0));
        zoneLoss.setAttribute('x', tx); zoneLoss.setAttribute('width', Math.max(0, X1 - tx));
      } else {
        zoneWin.setAttribute('x', tx); zoneWin.setAttribute('width', Math.max(0, X1 - tx));
        zoneLoss.setAttribute('x', X0); zoneLoss.setAttribute('width', Math.max(0, tx - X0));
      }
      tgt.setAttribute('x1', tx); tgt.setAttribute('x2', tx);
      tgtLbl.setAttribute('x', Math.min(X1 - 6, Math.max(X0 + 6, tx)));
      tgtLbl.textContent = fmtV(target);
      head.textContent = ctx.text(direction === 'under' ? 'reveal.dice.under' : 'reveal.dice.over', { target: fmtV(target) });
      sub.textContent = winChance > 0 ? ctx.text('reveal.dice.chance', { pct: (winChance * 100).toFixed(2) }) : '';
    };
    const neutral = () => {
      box.removeAttribute('data-tone');
      zoneWin.setAttribute('fill-opacity', 0.22);
      zoneLoss.setAttribute('fill-opacity', 0);
      big.setAttribute('class', 'sca-dice-big sca-dice-faint');
      mult.textContent = ''; out.textContent = ''; fiat.textContent = '';
    };
    // The readout is written only here — the needle has stopped.
    const finish = (o) => {
      const win = !!o.win;
      box.setAttribute('data-tone', win ? 'win' : 'loss');
      big.setAttribute('class', 'sca-dice-big');
      zoneWin.setAttribute('fill-opacity', win ? 0.8 : 0.1);
      zoneLoss.setAttribute('fill-opacity', win ? 0 : 0.55);
      mult.textContent = ctx.fmt.mult(o.multiplierBps);
      out.textContent = win ? ctx.fmt.won(o.payoutLamports) : ctx.fmt.lost();
      fiat.textContent = (win && ctx.fmt.fiat(o.payoutLamports)) || '';
    };
    const idle = () => {
      readRange();
      setBet('over', lo + (hi - lo) / 2, 0);
      setNeedle(lo);
      neutral();
    };
    idle();

    let raf = 0, timer = 0, pending = null;
    const cancel = () => {
      if (raf) cancelAnimationFrame(raf); raf = 0;
      if (timer) clearTimeout(timer); timer = 0;
      if (pending) { const p = pending; pending = null; p(); }
    };
    const easeOut = (t) => 1 - Math.pow(1 - t, 3);

    idle();
    root.dataset.state = 'idle';

    return {
      play(o, opts) {
        cancel();
        root.dataset.state = 'playing';
        readRange();
        const d = (o && o.details) || {};
        const direction = d.direction === 'under' ? 'under' : 'over';
        const target = Number.isFinite(d.target) ? d.target : lo + (hi - lo) / 2;
        const winChance = Number.isFinite(d.winChance) ? d.winChance : 0;
        const roll = Number.isFinite(d.rollValue) ? d.rollValue : (Number.isFinite(o && o.roll) ? o.roll : lo);
        setBet(direction, target, winChance);
        neutral();
        setNeedle(lo);
        return new Promise((resolve) => {
          pending = resolve;
          const done = () => { finish(o); root.dataset.state = 'done'; pending = null; resolve(); };
          if (opts && opts.reducedMotion) { setNeedle(roll); done(); return; }
          const t0 = performance.now();
          const step = (now) => {
            const t = Math.min(1, (now - t0) / DURATION);
            setNeedle(lo + (roll - lo) * easeOut(t));
            if (t < 1) { raf = requestAnimationFrame(step); return; }
            raf = 0;
            setNeedle(roll);
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
