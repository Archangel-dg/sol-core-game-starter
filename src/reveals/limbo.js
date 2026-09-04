// Sol-Core reveal — limbo (single, Instant).
//
// One motion idea: a big multiplier counter climbs from 1.00× at a constant log-speed
// (1.3 decades per second) after a fixed 450 ms hold and stops dead at the server's
// crash multiplier. A cursor on a fixed 1×–1000× log scale on the right climbs with it;
// the player's target is a thin amber line on that scale and never moves. It never
// slows, pauses or parks near the target; the scale never rescales to the crash point.
// Win and multiplier are read from the outcome, never recomputed from the crash value.
//
// Text through `ctx.text(...)`, colours through the theme tokens. Design zone.

/** @type {import('../lib/reveal').RevealModule} */
export const reveal = {
  key: 'limbo',
  mechanic: 'single',
  strings: [
    'reveal.won', 'result.lost',
    'reveal.limbo.target', 'reveal.limbo.multiplier', 'reveal.limbo.climbing',
    'reveal.limbo.crashed', 'reveal.limbo.reached', 'reveal.limbo.missed',
  ],

  mount(root, ctx) {
    const AX = 78, Y_TOP = 22, Y_BOT = 74, DECADES = 3; // log scale 1× .. 1000×
    const TX = 62;       // where the target line starts (the counter must end left of it)
    const PRE = 450;     // fixed hold at 1.00× before the climb (same for every outcome)
    const RATE = 1.3;    // decades per second — constant, independent of crash/target
    const SETTLE = 800;  // time the stopped value stands before play() resolves

    const C = 'sca-limbo';           // class prefix — every rule is scoped with it
    const CSS = `
.${C}{position:absolute;inset:0;background:var(--night);font-family:var(--mono)}
.${C} svg{position:absolute;inset:0;width:100%;height:100%;display:block}
.${C} text{font-family:var(--mono);font-variant-numeric:tabular-nums;fill:var(--fg)}
.${C} .${C}-muted{fill:var(--muted)}
.${C} .${C}-faint{fill:var(--faint)}
.${C} .${C}-target{font-size:3.6px;font-weight:600;text-anchor:end;fill:var(--amber)}
.${C} .${C}-big{font-size:12px;font-weight:700}
.${C} .${C}-big[data-wide]{font-size:9.5px}
.${C} .${C}-cap{font-size:3.2px}
.${C} .${C}-tick{font-size:3.1px}
.${C} .${C}-mult{font-size:6px;font-weight:700;text-anchor:middle}
.${C} .${C}-out{font-size:4.4px;font-weight:600;text-anchor:middle}
.${C} .${C}-fiat{font-size:3.1px;text-anchor:middle;fill:var(--muted)}
.${C} .${C}-readout{opacity:0;transition:opacity .25s linear}
.${C}[data-tone] .${C}-readout{opacity:1}
.${C}[data-tone="win"] .${C}-mult,.${C}[data-tone="win"] .${C}-out,.${C}[data-tone="win"] .${C}-cap{fill:var(--accent)}
.${C}[data-tone="win"] .${C}-tline{stroke:var(--accent);stroke-width:0.9}
.${C}[data-tone="win"] .${C}-target{fill:var(--accent)}
.${C}[data-tone="loss"] .${C}-big,.${C}[data-tone="loss"] .${C}-mult,.${C}[data-tone="loss"] .${C}-out,.${C}[data-tone="loss"] .${C}-cap{fill:var(--red)}
.${C}[data-tone="loss"] .${C}-cursor{stroke:var(--red)}
.${C}[data-tone="loss"] .${C}-col{fill:var(--red)}
@media (prefers-reduced-motion:reduce){.${C} *{transition:none!important}}
`;
    const st = document.createElement('style');
    st.textContent = CSS;
    root.appendChild(st);

    const yOf = (v) => {
      const f = Math.min(1, Math.max(0, Math.log10(Math.max(1e-9, v)) / DECADES));
      return Y_BOT - (Y_BOT - Y_TOP) * f;
    };
    const f3 = (n) => n.toFixed(3);

    // fixed log scale on the right: ticks and labels (static, so they go into the skeleton)
    const ticks = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000].map((v) => {
      const y = f3(yOf(v));
      const major = [1, 2, 5, 10, 100, 1000].includes(v);
      let s = '<line x1="' + AX + '" x2="' + (AX + (major ? 2 : 1.2)) + '" y1="' + y + '" y2="' + y + '" stroke="' + (major ? 'var(--muted)' : 'var(--line)') + '" stroke-width="0.4"/>';
      if (major && v !== 5) s += '<text x="' + (AX + 3.2) + '" y="' + f3(yOf(v) + 1.1) + '" class="sca-limbo-tick sca-limbo-muted">' + v + '×</text>';
      return s;
    }).join('');

    // static skeleton: the HTML parser puts <svg> and its children into the SVG namespace by itself
    const box = document.createElement('div');
    box.className = 'sca-limbo';
    box.innerHTML =
      '<svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">' +
        '<text x="92" y="12" class="sca-limbo-target"></text>' +
        '<line x1="' + AX + '" x2="' + AX + '" y1="' + (Y_TOP - 1) + '" y2="' + Y_BOT + '" stroke="var(--line)" stroke-width="0.5"/>' +
        ticks +
        '<rect x="' + (AX - 2.8) + '" width="1.8" y="' + Y_BOT + '" height="0" class="sca-limbo-col" fill="var(--faint)"/>' +
        '<line x1="' + TX + '" x2="' + (AX + 2) + '" y1="0" y2="0" class="sca-limbo-tline" stroke="var(--amber)" stroke-width="0.5"/>' +
        '<line x1="' + (AX - 6) + '" x2="' + AX + '" y1="' + Y_BOT + '" y2="' + Y_BOT + '" class="sca-limbo-cursor" stroke="var(--fg)" stroke-width="0.7" stroke-linecap="round"/>' +
        '<text x="8" y="50" class="sca-limbo-big sca-limbo-faint"></text>' +
        '<text x="8" y="57.5" class="sca-limbo-cap sca-limbo-muted"></text>' +
        '<g class="sca-limbo-readout">' +
          '<text x="50" y="85" class="sca-limbo-mult"></text>' +
          '<text x="50" y="92" class="sca-limbo-out"></text>' +
          '<text x="50" y="97" class="sca-limbo-fiat"></text>' +
        '</g>' +
      '</svg>';
    root.appendChild(box);

    const q = (cls) => box.querySelector('.' + cls);
    const tgtTxt = q('sca-limbo-target');
    const col = q('sca-limbo-col');
    const tline = q('sca-limbo-tline');
    const cursor = q('sca-limbo-cursor');
    const big = q('sca-limbo-big');
    const cap = q('sca-limbo-cap');
    const mult = q('sca-limbo-mult');
    const out = q('sca-limbo-out');
    const fiat = q('sca-limbo-fiat');
    const fmtX = (v) => v.toFixed(2) + '×';

    const setValue = (v) => {
      const y = f3(yOf(v));
      const label = fmtX(v);
      big.textContent = label;
      if (label.length > 6) big.setAttribute('data-wide', ''); else big.removeAttribute('data-wide');
      cursor.setAttribute('y1', y); cursor.setAttribute('y2', y);
      col.setAttribute('y', y); col.setAttribute('height', f3(Y_BOT - Number(y)));
    };
    const setTarget = (t) => {
      const y = f3(yOf(t));
      tline.setAttribute('y1', y); tline.setAttribute('y2', y);
      tgtTxt.textContent = ctx.text('reveal.limbo.target', { x: fmtX(t) });
    };
    const neutral = (armed) => {
      box.removeAttribute('data-tone');
      big.setAttribute('class', armed ? 'sca-limbo-big' : 'sca-limbo-big sca-limbo-faint');
      cap.textContent = ctx.text(armed ? 'reveal.limbo.climbing' : 'reveal.limbo.multiplier');
      mult.textContent = ''; out.textContent = ''; fiat.textContent = '';
    };
    // Captions follow o.win only (comparison-free): with drawRule 'lose' an exact hit loses,
    // so wording like "below target" could contradict the frame.
    const finish = (o) => {
      const win = !!o.win;
      box.setAttribute('data-tone', win ? 'win' : 'loss');
      big.setAttribute('class', 'sca-limbo-big');
      cap.textContent = ctx.text(win ? 'reveal.limbo.reached' : 'reveal.limbo.missed');
      mult.textContent = ctx.fmt.mult(o.multiplierBps);
      out.textContent = win ? ctx.fmt.won(o.payoutLamports) : ctx.fmt.lost();
      fiat.textContent = (win && ctx.fmt.fiat(o.payoutLamports)) || '';
    };
    // Idle target: the game's minimum target (config echo), at least 2×.
    const idle = () => {
      const cfg = ctx.engineConfig || {};
      const min = Number(cfg.minTargetBps) / 10000;
      setTarget(Number.isFinite(min) && min > 1 ? Math.max(min, 1.01) : 2);
      setValue(1);
      neutral(false);
    };
    idle();

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
        const d = (o && o.details) || {};
        const target = Number.isFinite(d.targetMultiplierBps) ? d.targetMultiplierBps / 10000 : 2;
        const crash = Number.isFinite(d.crashMultiplierBps) ? d.crashMultiplierBps / 10000 : (Number.isFinite(o && o.roll) ? o.roll : 1);
        setTarget(target);
        neutral(true);
        setValue(1);
        return new Promise((resolve) => {
          pending = resolve;
          const done = () => { finish(o); root.dataset.state = 'done'; pending = null; resolve(); };
          if (opts && opts.reducedMotion) { setValue(crash); done(); return; }
          const t0 = performance.now();
          const step = (now) => {
            const el = now - t0;
            if (el < PRE) { raf = requestAnimationFrame(step); return; }
            // constant log-speed: value = 10^(RATE * seconds). Stops the instant it reaches the crash.
            const v = Math.pow(10, RATE * (el - PRE) / 1000);
            if (v >= crash) {
              raf = 0;
              setValue(crash);
              cap.textContent = ctx.text('reveal.limbo.crashed'); // neutral: no tone until finish()
              timer = setTimeout(() => { timer = 0; done(); }, SETTLE);
              return;
            }
            setValue(v);
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
