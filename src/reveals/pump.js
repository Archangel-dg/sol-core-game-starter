// Sol-Core reveal — pump (session, Curve).
//
// One balloon in the centre with the multiplier printed on it. Every pump of the session
// puffs the balloon up one notch (a scale step with a short vertical stretch) and the
// number ticks to that pump's multiplier. A cash-out ties the balloon off (knot band,
// accent outline); a bust starts exactly like another pump and pops halfway through the
// puff — the balloon vanishes, a thin ring fades and the burst multiplier stands in red.
// The readout enters the DOM only at the end — while pumping the nodes are EMPTY.
// The whole frame is a pure function of (transcript, elapsed time): one rAF loop.
//
// INCREMENTAL: `play(o, { from })` renders the first `from` pumps of the SAME session
// (`o.sessionId`) instantly and animates only the new pump (or the ending).
//
// Fairness (docs/RULES.md, rule 16): each notch is the same size for every outcome and a
// bursting pump starts exactly like a surviving one — nothing about the balloon hints at
// the burst point before the pop; status, multiplier and payout come from the transcript.
// Text through `ctx.text(...)`, colours through the theme tokens. Design zone.

/** @type {import('../lib/reveal').RevealModule} */
export const reveal = {
  key: 'pump',
  mechanic: 'session',
  strings: ['reveal.won', 'result.lost', 'reveal.pump.title', 'reveal.pump.pumps', 'reveal.pump.burstAt', 'reveal.pump.sub'],

  mount(root, ctx) {
    const C = 'sca-pump';
    const LEAD = 320;                   // ms of rest before a pump
    const PUFF = 0.55;                  // share of a pump step spent inflating (rest = settle)
    const POP_AT = 0.5;                 // share of a step at which a bursting pump pops
    const POP = 110;                    // ms the pop scale-up / fade takes
    const RING = 280;                   // ms the burst ring takes to fade
    const BUST_HOLD = 520;              // ms the red burst reading stands alone before the readout
    const TIE = 420;                    // ms the tie-off shows before the readout
    const TAIL = 340;                   // ms the readout takes to settle
    const CY = 40, RY = 15, KNOT = 17.4, SCALE_CAP = 1.5;
    // ~500 ms per pump; long transcripts (max 30 pumps) are compressed to stay under 4.5 s.
    const stepMs = (n) => (n <= 6 ? 500 : Math.max(150, Math.floor(2900 / n)));
    // Notch size depends only on the pump index — the same for every outcome, so the size of
    // the balloon never hints at where the burst point lies.
    const S = (k) => Math.min(SCALE_CAP, 0.92 + 0.6 * (1 - Math.exp(-k / 6)));

    const CSS = `
.${C}{position:absolute;inset:0;overflow:hidden;font-family:var(--mono);color:var(--fg);--u:3.6px;user-select:none;-webkit-user-select:none;font-variant-numeric:tabular-nums}
.${C} .${C}-head{position:absolute;left:6%;right:6%;top:5%;display:flex;justify-content:space-between;align-items:baseline;gap:calc(var(--u)*2.5);font-size:calc(var(--u)*3.2);line-height:1;letter-spacing:.05em;color:var(--muted);white-space:nowrap}
.${C} .${C}-title{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis}
.${C} .${C}-run{flex:0 0 auto;font-weight:600;color:var(--fg);letter-spacing:0}
.${C}.${C}-win .${C}-run{color:var(--accent)}
.${C}.${C}-loss .${C}-run{color:var(--red)}
.${C} .${C}-svg{position:absolute;inset:0;width:100%;height:100%;display:block;overflow:visible}
.${C} .${C}-string{fill:none;stroke:var(--muted);stroke-width:.7;stroke-linecap:round}
.${C} .${C}-body{fill:var(--panel-strong);stroke:var(--fg);stroke-width:.9;stroke-linejoin:round;transition:stroke .25s ease}
.${C} .${C}-shine{fill:var(--line)}
.${C} .${C}-knot{fill:var(--fg);transition:fill .25s ease}
.${C} .${C}-tie{fill:var(--accent);opacity:0;transition:opacity .25s ease}
.${C} .${C}-num{fill:var(--fg);font-family:var(--mono);font-size:5.6px;font-weight:700;text-anchor:middle;dominant-baseline:middle;font-variant-numeric:tabular-nums;transition:fill .25s ease}
.${C}.${C}-tied .${C}-body,.${C}.${C}-tied .${C}-knot{stroke:var(--accent);fill:var(--panel-strong)}
.${C}.${C}-tied .${C}-knot{fill:var(--accent)}
.${C}.${C}-tied .${C}-tie{opacity:1}
.${C}.${C}-tied .${C}-num{fill:var(--accent)}
.${C} .${C}-ring{fill:none;stroke:var(--red);stroke-width:.8;opacity:0}
.${C} .${C}-burst{position:absolute;left:0;right:0;top:40%;transform:translateY(-50%);text-align:center;display:none;pointer-events:none}
.${C}.${C}-popped .${C}-burst{display:block}
.${C} .${C}-burst-l{font-size:calc(var(--u)*3.2);line-height:1.2;letter-spacing:.05em;color:var(--muted)}
.${C} .${C}-burst-v{font-size:calc(var(--u)*8);line-height:1.15;font-weight:700;color:var(--red)}
.${C} .${C}-hint{position:absolute;left:0;right:0;top:81%;text-align:center;font-size:calc(var(--u)*3.1);line-height:1.3;color:var(--muted);white-space:nowrap;transition:opacity .2s ease}
.${C}.${C}-live .${C}-hint{opacity:0}
.${C} .${C}-readout{position:absolute;left:0;right:0;top:77%;text-align:center;opacity:0;transform:translateY(calc(var(--u)*1.5));transition:opacity .22s ease,transform .22s ease}
.${C}.${C}-done .${C}-readout{opacity:1;transform:none}
.${C} .${C}-mult{font-size:calc(var(--u)*6);font-weight:700;line-height:1.1;color:var(--fg)}
.${C}.${C}-loss .${C}-mult{color:var(--muted)}
.${C} .${C}-res{font-size:calc(var(--u)*4.4);line-height:1.2;margin-top:calc(var(--u)*1.1);font-weight:600}
.${C}.${C}-win .${C}-res{color:var(--accent)}
.${C}.${C}-loss .${C}-res{color:var(--red)}
.${C} .${C}-fiat{font-size:calc(var(--u)*3.1);line-height:1.2;margin-top:calc(var(--u)*.6);color:var(--muted)}
.${C} .${C}-sub{font-size:calc(var(--u)*3.1);line-height:1.2;margin-top:calc(var(--u)*1);color:var(--muted);white-space:nowrap}
.${C}.${C}-still .${C}-body,.${C}.${C}-still .${C}-knot,.${C}.${C}-still .${C}-tie,.${C}.${C}-still .${C}-num,.${C}.${C}-still .${C}-readout,.${C}.${C}-still .${C}-hint,.${C}.${C}-still .${C}-run{transition:none!important}
@media (prefers-reduced-motion:reduce){.${C} .${C}-body,.${C} .${C}-knot,.${C} .${C}-tie,.${C} .${C}-num,.${C} .${C}-readout,.${C} .${C}-hint,.${C} .${C}-run{transition:none!important}}
`;
    const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
    const NS = 'http://www.w3.org/2000/svg';
    const svgEl = (tag, attrs) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };
    const fmt = (v) => (Math.round(v * 1000) / 1000).toString();
    const BAL_D = 'M0 -15 C8.5 -15 13.5 -8.5 13.5 -1 C13.5 7 7 14.6 0 15 C-7 14.6 -13.5 7 -13.5 -1 C-13.5 -8.5 -8.5 -15 0 -15 Z';

    const style = el('style'); style.textContent = CSS; root.appendChild(style);
    const box = el('div', C);
    const head = el('div', C + '-head');
    const title = el('span', C + '-title', '');
    const run = el('span', C + '-run', '');
    head.appendChild(title); head.appendChild(run);
    box.appendChild(head);
    const svg = svgEl('svg', { class: C + '-svg', viewBox: '0 0 100 100', preserveAspectRatio: 'xMidYMid meet', 'aria-hidden': 'true' });
    const string = svgEl('path', { class: C + '-string', d: '' });
    const ring = svgEl('circle', { class: C + '-ring', cx: '50', cy: String(CY), r: String(RY) });
    const bal = svgEl('g', { class: C + '-bal' });
    const body = svgEl('path', { class: C + '-body', d: BAL_D });
    const shine = svgEl('ellipse', { class: C + '-shine', cx: '-5.5', cy: '-6.5', rx: '2.6', ry: '4.6', transform: 'rotate(-32 -5.5 -6.5)' });
    const knot = svgEl('path', { class: C + '-knot', d: 'M-2.2 14.4 L0 17.4 L2.2 14.4 Z' });
    const tie = svgEl('rect', { class: C + '-tie', x: '-3.2', y: '13.9', width: '6.4', height: '1.7', rx: '.85' });
    const num = svgEl('text', { class: C + '-num', x: '0', y: '1.4' });
    num.textContent = '1.00×';
    bal.appendChild(body); bal.appendChild(shine); bal.appendChild(knot); bal.appendChild(tie); bal.appendChild(num);
    svg.appendChild(string); svg.appendChild(ring); svg.appendChild(bal);
    box.appendChild(svg);
    const burst = el('div', C + '-burst');
    const burstL = el('div', C + '-burst-l', '');
    const burstV = el('div', C + '-burst-v', '');
    burst.appendChild(burstL); burst.appendChild(burstV);
    box.appendChild(burst);
    const hint = el('div', C + '-hint', ctx.hint || '');
    box.appendChild(hint);
    const readout = el('div', C + '-readout');
    const multEl = el('div', C + '-mult', '');
    const resEl = el('div', C + '-res', '');
    const fiatEl = el('div', C + '-fiat', '');
    const subEl = el('div', C + '-sub', '');
    readout.appendChild(multEl); readout.appendChild(resEl); readout.appendChild(fiatEl); readout.appendChild(subEl);
    box.appendChild(readout);
    root.appendChild(box);

    const measure = () => { const w = root.getBoundingClientRect().width || 360; box.style.setProperty('--u', (w / 100) + 'px'); };
    measure();
    let ro = null;
    if (typeof ResizeObserver === 'function') { ro = new ResizeObserver(measure); ro.observe(root); }

    let raf = 0, timer = null, pending = null, tl = null;
    let shown = null;   // { key, n } — the session and pump count standing on the field
    const setClass = (cls, on) => box.classList.toggle(C + '-' + cls, !!on);
    const setBalloon = (sx, sy, opacity) => {
      bal.setAttribute('transform', 'translate(50 ' + CY + ') scale(' + fmt(sx) + ' ' + fmt(sy) + ')');
      bal.setAttribute('opacity', fmt(opacity));
      const y0 = CY + KNOT * sy;
      string.setAttribute('d', 'M50 ' + fmt(y0) + ' C52.5 ' + fmt(y0 + 3) + ' 47.5 ' + fmt(y0 + 6) + ' 50 ' + fmt(y0 + 8.5));
    };
    // One puff: scale from S(i-1) towards S(i) with a short vertical stretch that settles.
    const puff = (i, p) => {
      const q = Math.min(1, p / PUFF);
      const e = 1 - Math.pow(1 - q, 3);
      const s = S(i - 1) + (S(i) - S(i - 1)) * e;
      const amt = Math.sin(Math.PI * q) * 0.07;
      return { sx: s * (1 - amt * 0.6), sy: s * (1 + amt), settled: q >= 1 };
    };

    function frame(t) {
      const { n, step, busted, live, pumps: ps, tSteps, tPop, tRead } = tl;
      let k = 0, sx = S(0), sy = S(0), opacity = 1, ringOp = 0, ringR = RY;
      if (t < LEAD) { k = 0; }
      else if (t < tSteps) {
        const i = Math.min(n, Math.floor((t - LEAD) / step) + 1);
        const r = puff(i, (t - LEAD - (i - 1) * step) / step);
        sx = r.sx; sy = r.sy; k = r.settled ? i : i - 1;
      } else if (busted) {
        k = n;
        const r = puff(n + 1, Math.min(POP_AT, (t - tSteps) / step));
        sx = r.sx; sy = r.sy;
        if (t >= tPop) {
          const q = Math.min(1, (t - tPop) / POP);
          sx *= 1 + 0.12 * q; sy *= 1 + 0.12 * q; opacity = 1 - q;
          const q2 = Math.min(1, (t - tPop) / RING);
          ringR = RY * r.sy * (1 + 0.3 * q2); ringOp = 0.8 * (1 - q2);
        }
      } else {
        k = n; sx = sy = S(n);
      }
      setBalloon(sx, sy, opacity);
      ring.setAttribute('r', fmt(ringR)); ring.setAttribute('opacity', fmt(ringOp));
      const bps = k > 0 ? (ps[k - 1] && ps[k - 1].multiplierBps) : 10000;
      num.textContent = ctx.fmt.mult(bps);
      run.textContent = ctx.text('reveal.pump.pumps', { n: k });
      setClass('tied', !busted && !live && t >= tSteps);
      setClass('popped', busted && t >= tPop);
      setClass('loss', busted && t >= tPop);
      if (busted && t >= tPop && !burstV.textContent) { burstL.textContent = ctx.text('reveal.pump.burstAt'); burstV.textContent = ctx.fmt.mult(tl.o.burstMultiplierBps); }
      setClass('win', !busted && !live && t >= tRead);
      if (!live && t >= tRead && !multEl.textContent) fillReadout(tl.o);   // the readout enters the DOM only now
      setClass('done', !live && t >= tRead);
    }

    function build(o) {
      const ps = Array.isArray(o.pumps) ? o.pumps : [];
      const n = ps.length;
      const live = o.status === 'active';
      const busted = o.status === 'busted';
      const step = stepMs(n);
      const tSteps = LEAD + n * step;
      const t = { o, n, step, busted, live, pumps: ps, tSteps, tPop: Infinity, tRead: 0, tEnd: 0 };
      if (busted) { t.tPop = tSteps + step * POP_AT; t.tRead = t.tPop + BUST_HOLD; }
      else t.tRead = tSteps + TIE;
      t.tEnd = live ? tSteps : t.tRead + TAIL;
      return t;
    }
    function fillReadout(o) {
      const n = Array.isArray(o.pumps) ? o.pumps.length : 0;
      multEl.textContent = ctx.fmt.mult(o.multiplierBps);
      resEl.textContent = o.win ? ctx.fmt.won(o.payoutLamports) : ctx.fmt.lost();
      fiatEl.textContent = (o.win && ctx.fmt.fiat(o.payoutLamports)) || '';
      subEl.textContent = ctx.text('reveal.pump.sub', { bet: ctx.fmt.sol(o.betLamports), n });
    }
    function cancel() {
      if (raf) cancelAnimationFrame(raf); raf = 0;
      if (timer) clearTimeout(timer); timer = null;
      if (pending) { const p = pending; pending = null; p(); }
    }
    function idle() {
      box.classList.remove(C + '-live', C + '-tied', C + '-popped', C + '-loss', C + '-win', C + '-done', C + '-still');
      title.textContent = ctx.text('reveal.pump.title');
      hint.textContent = ctx.hint || '';
      setBalloon(S(0), S(0), 1);
      ring.setAttribute('opacity', '0');
      num.textContent = '1.00×';
      run.textContent = ctx.text('reveal.pump.pumps', { n: 0 });
      burstL.textContent = ''; burstV.textContent = '';
      multEl.textContent = ''; resEl.textContent = ''; fiatEl.textContent = ''; subEl.textContent = '';
    }

    idle();
    root.dataset.state = 'idle';

    return {
      play(o, opts) {
        cancel();
        idle();
        measure();
        o = o || {};
        tl = build(o);
        const from = opts && Number.isInteger(opts.from) ? Math.max(0, Math.min(tl.n, opts.from)) : 0;
        const inc = from > 0 && !!shown && shown.key === o.sessionId && shown.n === from;
        // Caught-up frame: the first `from` pumps stand, the next one gets its usual lead.
        const skip = inc ? (from < tl.n ? from * tl.step : tl.busted ? Math.max(0, tl.tSteps - LEAD) : Math.max(0, tl.tSteps - 100)) : 0;
        setClass('live', true);
        setClass('still', true);
        root.dataset.state = 'playing';
        return new Promise((resolve) => {
          pending = resolve;
          const fin = () => {
            frame(tl.tEnd);
            shown = { key: o.sessionId, n: tl.n };
            root.dataset.state = 'done';
            raf = 0; timer = null;
            const p = pending; pending = null; if (p) p();
          };
          if (opts && opts.reducedMotion) { frame(tl.tEnd); timer = setTimeout(fin, 20); return; }
          frame(skip);
          void box.offsetWidth;
          setClass('still', false);
          const t0 = performance.now() - skip;
          const tick = (now) => {
            const t = now - t0;
            if (t >= tl.tEnd) { fin(); return; }
            frame(t);
            raf = requestAnimationFrame(tick);
          };
          raf = requestAnimationFrame(tick);
        });
      },
      reset() { cancel(); shown = null; idle(); root.dataset.state = 'idle'; },
      destroy() { cancel(); if (ro) ro.disconnect(); ro = null; },
    };
  },
};
