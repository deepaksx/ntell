/* ==========================================================================
   ntell.ai — motion layer
   Vanilla JS on GSAP (ScrollTrigger, SplitText) and Lenis. No build step.
   Everything here is progressive: without it the page is complete and static.
   ========================================================================== */
(() => {
  'use strict';

  const html = document.documentElement;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeIO = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const easeBack = (t) => { const c = 1.6; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const libs = window.gsap && window.ScrollTrigger && window.SplitText;

  // Without the libraries the page stays as authored: static and complete.
  if (!libs) { html.classList.remove('js'); return; }

  gsap.registerPlugin(ScrollTrigger, SplitText);
  ScrollTrigger.config({ ignoreMobileResize: true });
  const mq = gsap.matchMedia();
  const DESK = '(min-width: 900px)';
  const MOB = '(max-width: 899px)';

  const C = { ink: '#2A1A22', paper: '#F4F4F6', accent: '#D7143C', ring: '#F0A9B8' };

  /* ---------------------------------------------------------------------
     Smooth scroll
     --------------------------------------------------------------------- */
  let lenis = null;
  if (!reduce && window.Lenis) {
    lenis = new Lenis({ lerp: 0.105, smoothWheel: true, wheelMultiplier: 1 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  const scrollToTarget = (target, offset = 0) => {
    if (lenis) lenis.scrollTo(target, { offset, duration: 1.5 });
    else if (target === 0) window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    else target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  };

  /* ---------------------------------------------------------------------
     Reveal helpers
     --------------------------------------------------------------------- */
  const splitLines = (el, start = 'top 88%') => {
    SplitText.create(el, {
      type: 'lines', mask: 'lines', linesClass: 'line', autoSplit: true,
      onSplit(self) {
        return gsap.from(self.lines, {
          yPercent: 112, duration: 1.15, ease: 'expo.out', stagger: 0.085,
          scrollTrigger: { trigger: el, start, once: true }
        });
      }
    });
  };
  const reveals = (scope) => {
    if (reduce) return;
    $$('[data-lines]', scope).forEach((el) => splitLines(el));
    $$('[data-reveal]', scope).forEach((el) => {
      gsap.from(el, {
        y: 26, autoAlpha: 0, duration: 1.05, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 91%', once: true }
      });
    });
  };
  const rise = (targets, trigger, vars = {}) => {
    if (reduce || !targets.length) return;
    gsap.from(targets, Object.assign({
      y: 32, autoAlpha: 0, duration: 0.95, ease: 'power3.out', stagger: 0.08,
      scrollTrigger: { trigger, start: 'top 86%', once: true }
    }, vars));
  };

  const rr = (ctx, x, y, w, h, r) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  };
  const onVisible = (el, cb) => {
    if (!('IntersectionObserver' in window)) { cb(true); return; }
    new IntersectionObserver((es) => es.forEach((e) => cb(e.isIntersecting)), { rootMargin: '120px' }).observe(el);
  };
  // small deterministic generator so the hero composition is the same on every load
  const seeded = (seed) => () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };

  /* ---------------------------------------------------------------------
     The orb, rendered as a real sphere. The logo's six-circle pattern is laid
     on the surface as two rosettes, so it turns in 3D when the ball rolls.
     Lighting stays fixed to the screen, as on the logo.
     --------------------------------------------------------------------- */
  function createOrb(canvas) {
    const ctx = canvas.getContext('2d');
    const N = canvas.width, cx = N / 2, cy = N / 2, R = N / 2 - 3;
    const ALPHA = (38 * Math.PI) / 180, SEG = 60;
    const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    const norm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
    const circles = [];
    [1, -1].forEach((pole) => {
      for (let j = 0; j < 6; j++) {
        const phi = (j * Math.PI) / 3 + (pole < 0 ? Math.PI / 6 : 0);
        const c = [Math.sin(ALPHA) * Math.cos(phi), Math.sin(ALPHA) * Math.sin(phi), pole * Math.cos(ALPHA)];
        const u = norm(cross(c, [0, 0, 1])), v = cross(c, u);
        const pts = [];
        for (let k = 0; k <= SEG; k++) {
          const th = (k / SEG) * Math.PI * 2, ca = Math.cos(ALPHA), sa = Math.sin(ALPHA);
          pts.push([
            ca * c[0] + sa * (Math.cos(th) * u[0] + Math.sin(th) * v[0]),
            ca * c[1] + sa * (Math.cos(th) * u[1] + Math.sin(th) * v[1]),
            ca * c[2] + sa * (Math.cos(th) * u[2] + Math.sin(th) * v[2])
          ]);
        }
        circles.push(pts);
      }
    });

    // orientation, row-major 3x3. Starts a few degrees off the logo's pose so it reads as a ball.
    let M = [1, 0, 0, 0, 1, 0, 0, 0, 1];
    let dirty = true;
    const mul = (a, b) => {
      const o = new Array(9);
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) o[r * 3 + c] = a[r * 3] * b[c] + a[r * 3 + 1] * b[3 + c] + a[r * 3 + 2] * b[6 + c];
      return o;
    };
    const axisRot = (ax, ang) => {
      const [x, y, z] = norm(ax), c = Math.cos(ang), s = Math.sin(ang), t = 1 - c;
      return [t * x * x + c, t * x * y - s * z, t * x * z + s * y, t * x * y + s * z, t * y * y + c, t * y * z - s * x, t * x * z - s * y, t * y * z + s * x, t * z * z + c];
    };
    const rotate = (ax, ang) => { if (Math.abs(ang) < 1e-5) return; M = mul(axisRot(ax, ang), M); dirty = true; };
    const orthonormalise = () => {
      let a = norm([M[0], M[1], M[2]]);
      let b = [M[3], M[4], M[5]];
      const d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
      b = norm([b[0] - d * a[0], b[1] - d * a[1], b[2] - d * a[2]]);
      const c = cross(a, b);
      M = [a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]];
    };
    rotate([1, 0.35, 0], 0.22);

    function draw() {
      dirty = false;
      ctx.clearRect(0, 0, N, N);
      const base = ctx.createRadialGradient(cx - R * 0.22, cy - R * 0.28, 0, cx - R * 0.22, cy - R * 0.28, R * 1.35);
      base.addColorStop(0, '#FF6F86'); base.addColorStop(0.42, '#E5174A'); base.addColorStop(0.8, '#C20E36'); base.addColorStop(1, '#930A29');
      ctx.fillStyle = base; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();

      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, R - 0.5, 0, Math.PI * 2); ctx.clip();
      ctx.lineWidth = R * 0.034; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(255,255,255,0.44)';
      ctx.beginPath();
      for (let i = 0; i < circles.length; i++) {
        const pts = circles[i];
        let pen = false;
        for (let k = 0; k < pts.length; k++) {
          const p = pts[k];
          const z = M[6] * p[0] + M[7] * p[1] + M[8] * p[2];
          if (z <= 0.015) { pen = false; continue; }
          const x = cx + (M[0] * p[0] + M[1] * p[1] + M[2] * p[2]) * R;
          const y = cy - (M[3] * p[0] + M[4] * p[1] + M[5] * p[2]) * R;
          if (pen) ctx.lineTo(x, y); else { ctx.moveTo(x, y); pen = true; }
        }
      }
      ctx.stroke();
      // the limb falls into shadow, which also softens the lines as they turn away
      const rim = ctx.createRadialGradient(cx, cy, R * 0.5, cx, cy, R);
      rim.addColorStop(0, 'rgba(120,6,34,0)'); rim.addColorStop(0.8, 'rgba(120,6,34,0.16)'); rim.addColorStop(1, 'rgba(96,4,26,0.62)');
      ctx.fillStyle = rim; ctx.fillRect(0, 0, N, N);
      const spec = ctx.createRadialGradient(cx - R * 0.36, cy - R * 0.42, 0, cx - R * 0.36, cy - R * 0.42, R * 0.62);
      spec.addColorStop(0, 'rgba(255,255,255,0.34)'); spec.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = spec; ctx.fillRect(0, 0, N, N);
      ctx.restore();
    }

    return {
      // dx, dy in screen pixels (y down); the ball rolls over the page without slipping
      roll(dx, dy, radius) {
        const d = Math.hypot(dx, dy);
        if (d < 0.01) return;
        rotate([dy, dx, 0], clamp(d / Math.max(radius, 1), 0, 0.9));
      },
      spin(ax, ang) { rotate(ax, ang); },
      // ease back to the logo's own pose (pattern facing the viewer)
      settle(k) {
        const flip = M[8] < 0;
        const T = flip ? [1, 0, 0, 0, -1, 0, 0, 0, -1] : [1, 0, 0, 0, 1, 0, 0, 0, 1];
        let diff = 0;
        for (let i = 0; i < 9; i++) { diff += Math.abs(T[i] - M[i]); M[i] += (T[i] - M[i]) * k; }
        if (diff > 0.002) { orthonormalise(); dirty = true; }
      },
      render() { if (dirty) draw(); }
    };
  }

  /* ---------------------------------------------------------------------
     The travelling signal. The orb sits large on the hero stage, where it can
     be dragged to turn it. It rolls away as the page scrolls, docks on the
     full stop of each chapter heading, rides a rail at the page edge between
     them, and lands as the dot of the wordmark in the footer.
     --------------------------------------------------------------------- */
  function createSignal() {
    const el = $('#signal'), rail = $('#rail'), label = $('#railLabel');
    const stage = $('#heroStage'), hint = $('#heroHint');
    const orb = createOrb($('#signalCanvas'));
    // Anchors are read live each frame: SplitText re-creates heading nodes when it re-splits.
    const anchors = () => $$('[data-orb]').map((node) => ({
      node, mode: node.dataset.orb || 'rail',
      k: node.classList.contains('dot') ? 1.5 : 1
    }));
    const st = { on: false, pop: 1, lx: null, ly: 0, ls: 0, dockedAt: -1, section: '', t: 0, stageU: 0 };
    const pos = { x: 0, y: 0, r: 0, live: false, home: 1 };
    const drag = { on: false, orbit: false, x: 0, y: 0, vx: 0, vy: 0, moved: 0, used: false };
    let onTap = null;
    // the satellites (js/satellites.js) listen in on the orb: when it starts, and how it is being dragged
    const subs = {};
    const emit = (name, a, b) => { let res; (subs[name] || []).forEach((fn) => { const r = fn(a, b); if (r) res = r; }); return res; };
    // where a sticky heading rests, read once per layout
    const sticks = new Map();
    window.addEventListener('resize', () => sticks.clear());
    const stickTop = (head) => {
      if (!sticks.has(head)) { const cs = getComputedStyle(head); sticks.set(head, cs.position === 'sticky' ? parseFloat(cs.top) || 0 : null); }
      return sticks.get(head);
    };

    // Drag to turn. A drag that starts on the orb turns the orb alone, with a little momentum when it is let
    // go. One that starts in the orbit round it (on a satellite, or in the space between them) belongs to the
    // satellites: it turns and tips their orbit, and the orb is left as it is.
    if (!reduce && stage) {
      stage.addEventListener('pointerdown', (e) => {
        if (!st.on || st.stageU > 0.3) return;
        drag.on = true; drag.x = e.clientX; drag.y = e.clientY; drag.vx = 0; drag.vy = 0; drag.moved = 0;
        drag.orbit = !!(subs.drag && e.target.closest && e.target.closest('.sat-hit, .hero__orbit'));
        try { stage.setPointerCapture(e.pointerId); } catch (err) { /* capture is a nicety */ }
        stage.classList.add('is-dragging');
        if (drag.orbit) emit('dragstart', e.pointerType, e.target);
        e.preventDefault();
      });
      stage.addEventListener('pointermove', (e) => {
        if (!drag.on) return;
        const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
        drag.x = e.clientX; drag.y = e.clientY; drag.moved += Math.hypot(dx, dy);
        if (drag.orbit) emit('drag', dx, dy);
        else { drag.vx = dx; drag.vy = dy; orb.roll(dx, dy, Math.max(pos.r * 0.6, 40)); }
        if (!drag.used && drag.moved > 14) { drag.used = true; if (hint) hint.classList.remove('is-on'); }
      });
      const end = (e) => {
        if (!drag.on) return;
        drag.on = false; stage.classList.remove('is-dragging');
        // a cancelled touch means the page took the gesture to scroll: that is not a tap
        const tap = e.type === 'pointerup' && drag.moved < 6;
        if (drag.orbit) { drag.orbit = false; emit('release'); if (tap) emit('tap', e.clientX, e.clientY); return; }
        if (tap) { drag.vx = 0; drag.vy = 0; }
        // a tap that lands on a satellite belongs to the satellite, not to the orb
        if (tap && !emit('tap', e.clientX, e.clientY) && onTap) { onTap(pos.x, pos.y); orb.spin([0.2, 1, 0.1], 0.5); }
      };
      stage.addEventListener('pointerup', end);
      stage.addEventListener('pointercancel', end);
    }

    function frame(time) {
      if (!st.on) return;
      const dt = Math.min(0.05, time - st.t || 0.016); st.t = time;
      const vw = window.innerWidth, vh = window.innerHeight;
      const maxS = Math.max(1, document.documentElement.scrollHeight - vh);
      const sy = window.scrollY, remain = maxS - sy;
      const relY = vh * 0.4, catY = vh * 0.74, D = vh * 0.36, focY = vh * 0.5;
      const gutter = parseFloat(getComputedStyle($('.nav__inner')).paddingRight) || 24;
      const R = { x: vw - Math.max(11, gutter / 2), y: vh * (0.26 + 0.48 * clamp(sy / maxS)), s: vw < 900 ? 10 : 13 };

      const A = [], P = [];
      anchors().forEach((a) => {
        const r = a.node.getBoundingClientRect();
        if (!r.width && !r.height) return;
        const pt = { x: r.left + r.width / 2, y: r.top + r.height / 2, s: Math.max(r.width, r.height) * a.k, rel: relY };
        // a heading that sticks holds the orb for as long as it is stuck: the orb leaves only when the heading does
        const head = a.node.closest('.chapter__head');
        const top = head ? stickTop(head) : null;
        if (top !== null) pt.rel = Math.min(relY, top + (pt.y - head.getBoundingClientRect().top) - 0.5);
        A.push(a); P.push(pt);
      });
      const n = P.length; if (!n) return;
      const v = [], u = [];
      for (let i = 0; i < n; i++) {
        if (i === 0) v[i] = 1;
        else if (A[i].mode === 'direct') {
          const a = P[i - 1].y, b = P[i].y;
          v[i] = b - a > 1 ? clamp((focY - a) / (b - a)) : (b <= focY ? 1 : 0);
        } else {
          const c = Math.max(catY, P[i].y - remain - 0.5);
          v[i] = 1 - clamp((P[i].y - c) / D);
        }
        if (A[i].mode === 'stage') u[i] = clamp(sy / (vh * 0.55));
        else u[i] = A[i + 1] && A[i + 1].mode === 'direct' ? 0 : clamp((P[i].rel - P[i].y) / D);
      }
      st.stageU = A[0].mode === 'stage' ? u[0] : 1;
      if (stage) stage.classList.toggle('is-away', st.stageU > 0.3);
      let k = 0;
      for (let i = n - 1; i > 0; i--) { if (v[i] > 0) { k = i; break; } }

      const mix = (a, b, t) => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), s: lerp(a.s, b.s, t) });
      let p, railness = 0, docked = false;
      if (v[k] >= 1) {
        const eu = easeIO(u[k]);
        // leaving the stage, the ball shrinks early so it reads as rolling away into the distance
        p = mix(P[k], R, eu);
        if (A[k].mode === 'stage') p.s = lerp(P[k].s, R.s, easeOut(u[k]));
        railness = eu;
        if (u[k] <= 0) { docked = true; if (st.dockedAt !== k) { st.dockedAt = k; hit(A[k].node); if (k > 0) emit('dock'); } } else st.dockedAt = -1;
      } else if (A[k].mode === 'direct') {
        p = mix(P[k - 1], P[k], v[k]); st.dockedAt = -1;
      } else {
        const eu = easeIO(u[k - 1]), ev = easeIO(v[k]);
        const from = mix(P[k - 1], R, eu);
        if (A[k - 1].mode === 'stage') from.s = lerp(P[k - 1].s, R.s, easeOut(u[k - 1]));
        p = mix(from, P[k], ev);
        railness = eu * (1 - ev); st.dockedAt = -1;
      }
      // how much of its hero size the orb still has; only counted while it is on, or leaving, the stage,
      // so the field belongs to the hero and never comes back when the orb grows again further down
      const nearStage = A[0].mode === 'stage' && (k === 0 || (k === 1 && v[1] < 1));
      const home = nearStage ? clamp(p.s / Math.max(1, P[0].s)) : 0;
      // only a hand on the orb itself is felt by the orb: moving over it, or turning the orbit, leaves it alone
      const held = drag.on && !drag.orbit;
      p.s *= st.pop * (held ? 1.02 : 1);

      // roll: with the scroll always, with any sideways travel, and with whatever spin a drag left behind
      const radius = Math.max(p.s / 2, 64);
      if (st.lx !== null) orb.roll((p.x - st.lx) * 0.9, sy - st.ls, radius);
      st.lx = p.x; st.ly = p.y; st.ls = sy;
      const coasting = Math.abs(drag.vx) + Math.abs(drag.vy) > 0.08;
      if (!held && coasting) { orb.roll(drag.vx, drag.vy, Math.max(p.s * 0.3, 40)); drag.vx *= 0.955; drag.vy *= 0.955; }
      if (docked && k === n - 1) orb.settle(0.07);
      else if (!held && !coasting) orb.spin([0.25, 1, 0.12], dt * (0.1 + 0.25 * clamp(p.s / 400)));
      orb.render();

      el.style.transform = `translate3d(${p.x.toFixed(2)}px,${p.y.toFixed(2)}px,0) scale(${(p.s / 100).toFixed(4)})`;
      pos.x = p.x; pos.y = p.y; pos.r = p.s / 2; pos.home = home; pos.live = true;

      rail.style.opacity = (railness * 0.95).toFixed(3);
      if (railness > 0.02) {
        label.style.top = `${R.y - rail.getBoundingClientRect().top}px`;
        if (label.textContent !== st.section) label.textContent = st.section;
      }
      if (hint && !drag.used) hint.classList.toggle('is-on', st.hintReady === true && st.stageU < 0.04);
    }
    function hit(node) {
      if (!node.classList || !node.classList.contains('dot')) return;
      node.classList.remove('is-hit'); void node.offsetWidth; node.classList.add('is-hit');
    }

    return {
      pos,
      start() {
        if (reduce || !$('[data-orb]')) return;
        html.classList.add('signal-on');
        st.on = true; st.pop = 0; st.started = true;
        emit('start');
        gsap.ticker.add(frame);
        gsap.set(el, { opacity: 1 });
        gsap.to(st, { pop: 1, duration: 1.5, ease: 'elastic.out(1, 0.72)' });
        const kick = { v: 0.11 };
        gsap.to(kick, { v: 0, duration: 2.2, ease: 'power3.out', onUpdate: () => orb.spin([0.2, 1, 0], kick.v) });
        gsap.delayedCall(3.2, () => { st.hintReady = true; });
      },
      onTap(fn) { onTap = fn; },
      on(name, fn) { (subs[name] = subs[name] || []).push(fn); },
      state: st,
      get started() { return st.started === true; },
      setSection(name) { st.section = name; },
      hide(flag) { gsap.to(el, { autoAlpha: flag ? 0 : 1, duration: 0.25, overwrite: true }); }
    };
  }

  /* ---------------------------------------------------------------------
     Sound and touch. One sound for everything: a short, dry tick, the kind a
     picker wheel makes as it passes each value. It is heard when a satellite
     comes to the front and when the orb lands on a heading's full stop, and
     on phones that can, it is felt as well. The tick is built once here from
     the same samples every time, so it never varies, and there are no audio
     files. Browsers only allow sound after a first tap, click or key press:
     a visitor who has only scrolled hears nothing until then. The button in
     the nav turns it all off, and the choice is remembered.
     --------------------------------------------------------------------- */
  function createFeedback() {
    const btn = $('#soundToggle'), KEY = 'ntell-sound';
    let on = true, ctx = null, out = null, click = null, last = 0, armed = false, sw = null;
    try { on = window.localStorage.getItem(KEY) !== 'off'; } catch (err) { /* nowhere to keep the choice */ }
    const paint = () => {
      if (!btn) return;
      btn.classList.toggle('is-off', !on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      btn.setAttribute('title', on ? 'Sound on' : 'Sound off');
    };
    // the audio engine is only made inside a real gesture, which is the only place a browser lets it start
    const wake = () => {
      armed = true;
      if (!on) return;
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        try { ctx = new AC(); } catch (err) { ctx = null; return; }
        // the tick: a few milliseconds of noise with a little body, gone almost as it starts
        const sr = ctx.sampleRate, n = Math.floor(sr * 0.03);
        click = ctx.createBuffer(1, n, sr);
        const d = click.getChannelData(0), rnd = seeded(11);
        for (let i = 0; i < n; i++) {
          const t = i / sr, env = Math.exp(-t / 0.0026) * (1 - Math.exp(-t / 0.0002));
          d[i] = ((rnd() * 2 - 1) * 0.5 + Math.sin(2 * Math.PI * 1750 * t) * 0.5) * env;
        }
        // kept soft: nothing boomy underneath it, nothing sharp on top
        out = ctx.createGain(); out.gain.value = 0.42;
        const low = ctx.createBiquadFilter(); low.type = 'highpass'; low.frequency.value = 650;
        const high = ctx.createBiquadFilter(); high.type = 'lowpass'; high.frequency.value = 5600;
        out.connect(low); low.connect(high); high.connect(ctx.destination);
      }
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    };
    ['pointerdown', 'keydown', 'touchend'].forEach((ev) => window.addEventListener(ev, wake, { capture: true, passive: true }));
    const buzz = () => {
      if (!on || !armed) return;
      try {
        if (navigator.vibrate) { navigator.vibrate(8); return; }
        // iPhones have no vibration call, but Safari gives a switch control a tick when it flips
        if (!window.matchMedia('(pointer: coarse)').matches) return;
        if (!sw) {
          sw = document.createElement('label');
          sw.setAttribute('aria-hidden', 'true');
          sw.style.cssText = 'position:fixed;left:-200px;top:0;opacity:0;pointer-events:none';
          const box = document.createElement('input');
          box.type = 'checkbox'; box.setAttribute('switch', ''); box.tabIndex = -1;
          sw.appendChild(box); document.body.appendChild(sw);
        }
        sw.click();
      } catch (err) { /* feedback is a nicety */ }
    };
    const fx = {
      tick() {
        buzz();
        if (!on || !ctx || ctx.state !== 'running') return;
        const now = performance.now();
        if (now - last < 45) return;
        last = now;
        const src = ctx.createBufferSource();
        src.buffer = click; src.connect(out); src.start();
      }
    };
    if (btn) btn.addEventListener('click', () => {
      on = !on;
      try { window.localStorage.setItem(KEY, on ? 'on' : 'off'); } catch (err) { /* not kept, that is all */ }
      paint();
      if (on) { wake(); last = 0; fx.tick(); }
    });
    paint();
    return fx;
  }

  /* ---------------------------------------------------------------------
     The hero's words follow the orb's satellites. Each industry has one
     paragraph in #heroLedes; its data attributes carry the word that ends the
     headline, the label above it and the link below. Whichever satellite is
     at the front is the one the hero talks about. This part needs no WebGL:
     the list in the hero's footer picks an industry on its own.
     --------------------------------------------------------------------- */
  function createHeroCopy(fx) {
    const box = $('#heroLedes'), word = $('#heroWord'), label = $('#heroLabel');
    const ledes = box ? $$('.hero__lede', box) : [];
    if (ledes.length < 2 || !word || !label) return null;
    const items = ledes.map((el) => ({ el, key: el.dataset.sat, name: el.dataset.name, word: el.dataset.word, label: el.dataset.label, cta: el.dataset.cta, href: el.dataset.href }));
    const n = items.length;
    const more = $('#heroMore'), status = $('#heroStatus'), picks = $$('.hero__pick');
    const stack = (host, cls, texts) => {
      host.textContent = '';
      host.classList.add(`${cls}s`);
      return texts.map((t, i) => {
        const s = document.createElement('span');
        s.className = cls + (i ? '' : ' is-on'); s.textContent = t;
        if (i) s.setAttribute('aria-hidden', 'true');
        host.appendChild(s);
        return s;
      });
    };
    const words = stack(word, 'hero__word', items.map((it) => it.word));
    const labels = stack(label, 'hero__tag', items.map((it) => it.label));
    let cur = 0, pick = null, moreTl = null, moreW = null;
    // The headline is set as large as its column allows, and its longest version has to fit on one line.
    // So the size is taken from that one: measured at full size, then scaled down just enough.
    const title = word.closest('.hero__title');
    const fit = () => {
      title.style.removeProperty('--fit');
      const widest = Math.max.apply(null, words.map((w) => w.getBoundingClientRect().width));
      // beside the orb, a little of the column is left clear so the headline never reaches the satellites
      const room = window.innerWidth > 860 ? title.clientWidth - 44 : title.clientWidth * 0.985;
      const k = room / Math.max(1, widest);
      if (k < 1) title.style.setProperty('--fit', k.toFixed(4));
    };
    fit();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
    let fitT = 0;
    window.addEventListener('resize', () => { clearTimeout(fitT); fitT = setTimeout(fit, 100); });
    const mark = (list, i) => list.forEach((el, k) => { el.classList.toggle('is-on', k === i); if (k === i) el.removeAttribute('aria-hidden'); else el.setAttribute('aria-hidden', 'true'); });
    if (!reduce) [words, labels, ledes].forEach((list) => { gsap.set(list[0], { autoAlpha: 1 }); gsap.set(list.slice(1), { autoAlpha: 0 }); });
    // which versions are on screen, coming or going. Every change starts from wherever each one is now,
    // so turning quickly, or back the way you came, never makes anything jump.
    const seen = [words, labels, ledes].map((list) => list.map((el, k) => k === 0));
    const swap = (list, vis, i, from, into, out) => {
      list.forEach((el, k) => {
        if (k === i) {
          if (!vis[k]) gsap.set(el, from);
          vis[k] = true;
          gsap.to(el, Object.assign({ overwrite: true }, into));
        } else if (vis[k]) {
          gsap.to(el, Object.assign({ overwrite: true, onComplete: () => { vis[k] = false; gsap.set(el, { autoAlpha: 0 }); } }, out));
        }
      });
    };

    function show(i, dir = 1) {
      i = ((i % n) + n) % n;
      if (i === cur) return;
      cur = i;
      const it = items[i];
      mark(words, i); mark(labels, i); mark(ledes, i);
      picks.forEach((p) => { const on = p.dataset.sat === it.key; p.classList.toggle('is-on', on); p.setAttribute('aria-pressed', on ? 'true' : 'false'); });
      if (status) status.textContent = `Now showing: ${it.name}`;
      if (fx) fx.tick();
      const swapMore = () => { if (!more) return; more.setAttribute('href', it.href); $('span', more).textContent = it.cta; };
      if (reduce) { swapMore(); return; }
      // The headline word: the old one fades where it stands, then the new one rises through the line's mask
      // from below, the way every heading on the page arrives. Nothing is ever cut off against the line above.
      swap(words, seen[0], i, { yPercent: 108, autoAlpha: 1 },
        { yPercent: 0, autoAlpha: 1, duration: 0.8, ease: 'expo.out', delay: 0.1 },
        { yPercent: -12, autoAlpha: 0, duration: 0.18, ease: 'power1.out' });
      // the label and the paragraph leave first and arrive second, so two versions are never read at once
      swap(labels, seen[1], i, { y: 8 * dir, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: 0.5, ease: 'power3.out', delay: 0.16 },
        { y: -6 * dir, autoAlpha: 0, duration: 0.16, ease: 'power1.out' });
      swap(ledes, seen[2], i, { y: 12, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: 0.6, ease: 'power3.out', delay: 0.2 },
        { y: -6, autoAlpha: 0, duration: 0.18, ease: 'power1.out' });
      // the second button changes its words while they are out of sight, and its width eases to fit them
      if (more) {
        const txt = $('span', more);
        if (moreTl) moreTl.kill();
        if (moreW) moreW.kill();
        moreTl = gsap.timeline()
          .to(txt, { autoAlpha: 0, duration: 0.12, ease: 'power1.out' })
          .call(() => {
            const w0 = more.getBoundingClientRect().width;
            swapMore();
            gsap.set(more, { width: 'auto' });
            const w1 = more.getBoundingClientRect().width;
            moreW = gsap.fromTo(more, { width: w0 }, { width: w1, duration: 0.45, ease: 'power3.out', clearProps: 'width' });
          })
          .to(txt, { autoAlpha: 1, duration: 0.35, ease: 'power2.out' });
      }
    }
    picks.forEach((p) => p.addEventListener('click', () => {
      const i = items.findIndex((it) => it.key === p.dataset.sat);
      if (i < 0) return;
      if (pick) pick(i); else { let d = i - cur; if (d > n / 2) d -= n; if (d < -n / 2) d += n; show(i, d >= 0 ? 1 : -1); }
    }));
    return {
      items, show,
      get index() { return cur; },
      // the satellites take over choosing: they turn first, and call show() as each one arrives
      onPick(fn) { pick = fn; }
    };
  }

  /* ---------------------------------------------------------------------
     The field. The orb sits in a field of lines the way a pole sits in a
     magnetic field: lines stream in from the left and are drawn into it, a
     few leave the far side in step, and the rest sweep round it.
     Every line is a streamline of one smooth field, traced outward from the
     orb on each frame, so nothing ever jumps. The field leans as the page
     scrolls, shrinks with the orb as it rolls away, and bends round the
     pointer as it would round a second pole. It is drawn on one fixed layer
     behind the whole page, so no section edge ever cuts it.
     --------------------------------------------------------------------- */
  function createFlow(canvas, signalPos) {
    const ctx = canvas.getContext('2d');
    const stage = $('#heroStage');
    const S = { intro: reduce ? 1 : 0 };
    const MAX = 150;          // most steps any one line is traced
    const KAPPA = 0.86;       // how hard the orb draws the field in (1 would pull every nearby line into it)
    const WK = 0.0125;        // wavenumber of the slow ripple that travels down the lines
    const smooth = (t) => { t = clamp(t); return t * t * (3 - 2 * t); };
    // the pointer: where it is, where its pole has glided to, how strongly it is felt, how hard it is pressed
    const ptr = { x: 0, y: 0, sx: 0, sy: 0, k: 0, target: 0, press: 0, pressT: 0, pv: 0 };
    let W = 1, H = 1, dpr = 1, compact = false, time = 0, last = 0, cleared = false;
    let inb = [], outb = [], byp = [];
    let surge = 0, kick = 0, kickV = 0, tilt = 0, tiltV = 0, scrollV = 0, lastSy = window.scrollY, dash = 0;
    // the field as it stands on this frame
    let ox = 0, oy = 0, R = 1, kR2 = 0, ca = 1, sa = 0, h = 8, wAmp = 0, gcx = 0, reach2 = 1;
    let pA2 = 0, pS2 = 1, pTx = 1, pTy = 0, pV = 0;
    let vx = 0, vy = 0;

    function build() {
      W = Math.max(1, window.innerWidth); H = Math.max(1, window.innerHeight);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      compact = W < 860;
      const rnd = seeded(7);
      const buf = () => new Float32Array((MAX + 2) * 2);
      const nIn = compact ? 20 : 34;
      // lines that end on the orb: evenly spaced across it, so the same flux runs between every pair
      inb = Array.from({ length: nIn }, (_, i) => ({
        s: lerp(-0.965, 0.965, i / (nIn - 1)),
        hot: i % 6 === 2, alpha: 0.5 + rnd() * 0.5, lw: 0.8 + rnd() * 0.55,
        pulses: [i % 2 ? rnd() : -1, rnd() > 0.72 ? rnd() : -1], speed: 0.05 + rnd() * 0.06,
        buf: buf(), n: 0
      }));
      // lines that leave it: fewer, and in step
      const nOut = compact ? 5 : 7;
      outb = Array.from({ length: nOut }, (_, j) => ({ s: (j - (nOut - 1) / 2) * (compact ? 0.3 : 0.235), buf: buf(), n: 0 }));
      // lines that pass above and below without touching it
      const nBy = compact ? 3 : 5;
      byp = [];
      [-1, 1].forEach((side) => { for (let m = 0; m < nBy; m++) byp.push({ side, m, alpha: 0.4 + rnd() * 0.35, lw: 0.7 + rnd() * 0.45, a: buf(), b: buf(), na: 0, nb: 0 }); });
      cleared = false;
    }

    // The undisturbed field: a steady stream along (ca, sa) plus the orb's pull. Sets vx, vy.
    function base(x, y) {
      const X = x - ox, Y = y - oy;
      const r2 = Math.max(X * X + Y * Y, R * R * 0.3);
      const q = kR2 / (r2 * r2);
      const a = (X * X - Y * Y) * q, b = -2 * X * Y * q;
      vx = ca + ca * a - sa * b;
      vy = sa - sa * a - ca * b;
    }
    // The field with the pointer's pole and the travelling ripple added. Both come from a stream
    // function, so lines part and close again around them instead of being shoved aside.
    function field(x, y) {
      base(x, y);
      const bx = vx, by = vy;
      let px = 0, py = 0;
      if (pA2 > 0.5) {
        const zx = x - ptr.sx, zy = y - ptr.sy;
        const xi = zx * pTx + zy * pTy, eta = zy * pTx - zx * pTy;
        const D = xi * xi + eta * eta + pS2, D2 = D * D;
        const ux = (2 * eta * eta / D2 - 1 / D) * pA2 * pV;
        const ue = (-2 * xi * eta / D2) * pA2 * pV;
        px = ux * pTx - ue * pTy; py = ux * pTy + ue * pTx;
      }
      if (wAmp) {
        const wv = wAmp * Math.sin(((x - ox) * ca + (y - oy) * sa) * WK - time * 1.15);
        px -= sa * wv; py += ca * wv;
      }
      // the disturbance never outweighs the field itself, so every line keeps making headway and none can curl up
      const bm = bx * bx + by * by, pm = px * px + py * py;
      if (pm > 0.7 * bm) { const k = Math.sqrt(0.7 * bm / pm); px *= k; py *= k; }
      vx = bx + px; vy = by + py;
    }
    // The stream function of the same field: constant along every line. Used to place the lines that pass the orb by.
    function psi(x, y) {
      const X = x - ox, Y = y - oy;
      const eta = Y * ca - X * sa, xi = X * ca + Y * sa;
      let p = eta * (1 + kR2 / Math.max(X * X + Y * Y, R * R * 0.3));
      if (pA2 > 0.5) {
        const zx = x - ptr.sx, zy = y - ptr.sy;
        const pxi = zx * pTx + zy * pTy, pe = zy * pTx - zx * pTy;
        p -= pV * pA2 * pe / (pxi * pxi + pe * pe + pS2);
      }
      if (wAmp) p += (wAmp / WK) * Math.cos(xi * WK - time * 1.15);
      return p;
    }
    // Follow the field from (x, y) in even steps, downstream (dir 1) or upstream (dir -1). Returns the point count.
    function trace(x, y, dir, buf) {
      let n = 0, lx = dir * ca, ly = dir * sa;
      buf[n++] = x; buf[n++] = y;
      for (let i = 0; i < MAX; i++) {
        field(x, y);
        let m = Math.sqrt(vx * vx + vy * vy);
        if (m > 1e-5) { lx = dir * vx / m; ly = dir * vy / m; }
        field(x + lx * h * 0.5, y + ly * h * 0.5);
        m = Math.sqrt(vx * vx + vy * vy);
        if (m > 1e-5) { lx = dir * vx / m; ly = dir * vy / m; }
        x += lx * h; y += ly * h;
        buf[n++] = x; buf[n++] = y;
        const gx = x - gcx, gy = y - oy;
        if (gx * gx + gy * gy > reach2 || x < -30 || x > W + 30 || y < -60 || y > H + 60) break;
      }
      return n >> 1;
    }

    function draw(dt) {
      // where the orb is, and how much of its field shows
      let strength;
      const sRect = stage.getBoundingClientRect(), stageR = sRect.width / 2;
      if (signalPos && signalPos.live) { ox = signalPos.x; oy = signalPos.y; R = signalPos.r; strength = clamp((signalPos.home - 0.12) / 0.5); }
      else { ox = sRect.left + stageR; oy = sRect.top + stageR; R = stageR; strength = 1; }
      const I = S.intro;
      const fade = smooth(strength) * clamp(I * 2.4);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (fade <= 0.003 || R < 5) { if (!cleared) { ctx.clearRect(0, 0, W, H); cleared = true; } return; }
      cleared = false;
      ctx.clearRect(0, 0, W, H);

      // this frame's field: it switches on with the intro, breathes a little, leans with the scroll, rings after a tap
      const live = !reduce;
      const kappa = Math.min(0.985, KAPPA * easeOut(clamp(I / 0.85)) * (1 + (live ? 0.035 * Math.sin(time * 0.55) : 0) + 0.13 * kick));
      kR2 = kappa * R * R;
      const ang = tilt + (live ? Math.sin(time * 0.31 + 1.3) * 0.02 : 0);
      ca = Math.cos(ang); sa = Math.sin(ang);
      h = clamp(R * 0.058, 2.5, compact ? 8 : 11);
      wAmp = live ? 0.05 : 0;
      const reach = R * (compact ? 3.3 : 4.9);
      gcx = ox + R * (compact ? 0 : 0.5); reach2 = reach * reach;
      const thin = clamp(R / 120, 0.45, 1);

      // the pointer's pole: sized to the orb, aligned with the field where it sits, fading as it nears the orb itself
      let pk = ptr.k, pA = 0;
      if (pk > 0.004) {
        pA = clamp(R * 0.34, 14, compact ? 46 : 68) * (1 + 0.5 * ptr.press);
        pk *= smooth((Math.hypot(ptr.sx - ox, ptr.sy - oy) - R - pA * 0.35) / (pA * 1.5));
      }
      if (pk > 0.004) {
        pA2 = 0; base(ptr.sx, ptr.sy);
        pV = Math.sqrt(vx * vx + vy * vy);
        if (pV > 1e-4) { pTx = vx / pV; pTy = vy / pV; }
        pV = Math.min(pV, 1.5);
        pA2 = pA * pA * pk; pS2 = pA * pA * 1.22;
      } else pA2 = 0;

      // trace every line from the orb outward
      const nx = -sa, ny = ca, rr = R * 0.985;
      for (let i = 0; i < inb.length; i++) {
        const l = inb[i], c = Math.sqrt(1 - l.s * l.s) * rr, t = l.s * rr;
        l.n = trace(ox - ca * c + nx * t, oy - sa * c + ny * t, -1, l.buf);
      }
      for (let i = 0; i < outb.length; i++) {
        const l = outb[i], c = Math.sqrt(1 - l.s * l.s) * rr, t = l.s * rr;
        l.n = trace(ox + ca * c + nx * t, oy + sa * c + ny * t, 1, l.buf);
      }
      const dPsi = (1 + kappa) * 1.93 / (inb.length - 1);
      for (let i = 0; i < byp.length; i++) {
        const l = byp[i];
        const target = ((1 + kappa) * 0.965 + (l.m + 1) * dPsi) * R * l.side;
        const p0 = Math.abs(target) / R;
        let Y = (p0 + Math.sqrt(Math.max(0, p0 * p0 - 4 * kappa))) / 2 * R * l.side;
        // settle the crossing point on the line's own flux value, so the pointer bends it rather than pins it
        for (let it = 0; it < 3; it++) {
          const x = ox + nx * Y, y = oy + ny * Y;
          field(x, y);
          Y -= clamp((psi(x, y) - target) / Math.max(0.12, vx * ca + vy * sa), -R * 0.4, R * 0.4);
        }
        if (Math.abs(Y) < R * 1.04) Y = R * 1.04 * l.side;
        const x0 = ox + nx * Y, y0 = oy + ny * Y;
        l.na = trace(x0, y0, -1, l.a); l.nb = trace(x0, y0, 1, l.b);
      }

      // the light the orb throws on the page, and the shadow it rests on
      const glowA = 0.16 * fade;
      if (glowA > 0.003) {
        const g = ctx.createRadialGradient(ox, oy, R * 0.6, ox, oy, R * 2.3);
        g.addColorStop(0, `rgba(229,23,74,${glowA})`); g.addColorStop(1, 'rgba(229,23,74,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(ox, oy, R * 2.3, 0, Math.PI * 2); ctx.fill();
        ctx.save(); ctx.translate(ox, oy + R * 1.2); ctx.scale(1, 0.1);
        const sh = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 0.95);
        sh.addColorStop(0, `rgba(23,9,12,${0.2 * fade})`); sh.addColorStop(1, 'rgba(23,9,12,0)');
        ctx.fillStyle = sh; ctx.beginPath(); ctx.arc(0, 0, R * 0.95, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      }
      // the pointer's pole shows only as the faintest lift in the paper where the lines part
      if (pA2 > 4) {
        const lr = pA * 1.9;
        const here = smooth(1 - (Math.hypot(ptr.sx - gcx, ptr.sy - oy) - R) / (reach * 0.8 - R));
        const lens = ctx.createRadialGradient(ptr.sx, ptr.sy, 0, ptr.sx, ptr.sy, lr);
        lens.addColorStop(0, `rgba(255,255,255,${0.42 * pk * fade * here})`); lens.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = lens; ctx.beginPath(); ctx.arc(ptr.sx, ptr.sy, lr, 0, Math.PI * 2); ctx.fill();
      }

      // lines are strongest at the orb and thin away with distance, as a field does
      const shade = (col, peak) => {
        const g = ctx.createRadialGradient(ox, oy, R * 0.9, gcx, oy, reach);
        g.addColorStop(0, `rgba(${col},${peak})`); g.addColorStop(0.16, `rgba(${col},${peak * 0.7})`);
        g.addColorStop(0.42, `rgba(${col},${peak * 0.3})`); g.addColorStop(0.72, `rgba(${col},${peak * 0.08})`);
        g.addColorStop(1, `rgba(${col},0)`);
        return g;
      };
      const gInk = shade('23,9,12', 0.3 * fade), gHot = shade('215,20,60', 0.56 * fade), gOut = shade('215,20,60', 0.62 * fade);
      const path = (buf, n) => { ctx.moveTo(buf[0], buf[1]); for (let k = 1; k < n; k++) ctx.lineTo(buf[k * 2], buf[k * 2 + 1]); };
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';

      for (let i = 0; i < byp.length; i++) {
        const l = byp[i];
        ctx.strokeStyle = gInk; ctx.globalAlpha = l.alpha; ctx.lineWidth = l.lw * thin;
        ctx.beginPath();
        ctx.moveTo(l.a[(l.na - 1) * 2], l.a[(l.na - 1) * 2 + 1]);
        for (let k = l.na - 2; k >= 0; k--) ctx.lineTo(l.a[k * 2], l.a[k * 2 + 1]);
        for (let k = 1; k < l.nb; k++) ctx.lineTo(l.b[k * 2], l.b[k * 2 + 1]);
        ctx.stroke();
      }
      const speedUp = 1 + surge * 3.2;
      const span = (R * 1.7) / h;
      for (let i = 0; i < inb.length; i++) {
        const l = inb[i];
        ctx.strokeStyle = l.hot ? gHot : gInk; ctx.globalAlpha = l.hot ? 1 : l.alpha; ctx.lineWidth = (l.hot ? l.lw + 0.35 : l.lw) * thin;
        ctx.beginPath(); path(l.buf, l.n); ctx.stroke();
        if (I < 0.9 || !live) continue;
        // signals running down the line towards the orb, quickening as they near it
        ctx.globalAlpha = 1;
        for (let j = 0; j < l.pulses.length; j++) {
          let u = l.pulses[j];
          if (u < 0) continue;
          u += dt * l.speed * (0.45 + 1.7 * u) * speedUp;
          if (u >= 1) u = 0;
          l.pulses[j] = u;
          const at = (1 - u) * span, k = Math.floor(at);
          if (k >= l.n - 1) continue;
          const vis = smooth((u - 0.04) / 0.5);
          if (vis <= 0) continue;
          const f = at - k;
          const x = lerp(l.buf[k * 2], l.buf[k * 2 + 2], f), y = lerp(l.buf[k * 2 + 1], l.buf[k * 2 + 3], f);
          ctx.fillStyle = `rgba(215,20,60,${vis * 0.9 * fade * fade})`;
          ctx.beginPath(); ctx.arc(x, y, (l.hot ? 2.6 : 1.9) * (0.55 + 0.45 * thin) * (1 + surge * 0.6), 0, Math.PI * 2); ctx.fill();
        }
      }
      // what leaves: a few clear lines, pulsing in step
      const bp = easeOut(clamp((I - 0.5) / 0.5));
      if (bp > 0.003) {
        ctx.strokeStyle = gOut; ctx.globalAlpha = 1;
        for (let i = 0; i < outb.length; i++) {
          const l = outb[i], n = Math.max(2, Math.round(l.n * bp));
          ctx.lineWidth = 1.15 * thin; ctx.setLineDash([]);
          ctx.beginPath(); path(l.buf, n); ctx.stroke();
          ctx.lineWidth = (3.2 + surge * 1.6) * thin; ctx.setLineDash([0.1, 22]); ctx.lineDashOffset = -(dash % 22.1);
          ctx.beginPath(); path(l.buf, n); ctx.stroke();
        }
        ctx.setLineDash([]);
      }
      ctx.globalAlpha = 1;
    }

    function step(now) {
      const t = now / 1000, dt = Math.min(0.05, t - last || 0.016);
      last = t; time = t;
      // the pole eases in and out, and glides after the pointer rather than jumping to it
      if (ptr.k < 0.02) { ptr.sx = ptr.x; ptr.sy = ptr.y; }
      const follow = 1 - Math.exp(-dt * 13);
      ptr.sx += (ptr.x - ptr.sx) * follow; ptr.sy += (ptr.y - ptr.sy) * follow;
      ptr.k += (ptr.target - ptr.k) * (1 - Math.exp(-dt * 5.5));
      // pressing widens the pole on a soft spring; a tap on the orb makes the whole field ring
      ptr.pv += ((ptr.pressT - ptr.press) * 120 - ptr.pv * 13) * dt; ptr.press += ptr.pv * dt;
      kickV += (-kick * 60 - kickV * 7) * dt; kick += kickV * dt;
      surge = Math.max(0, surge - dt * 0.85);
      dash += dt * 44 * (1 + surge * 2.4);
      // the field leans against the scroll, then swings back and settles like a compass needle
      const sy = window.scrollY;
      scrollV += ((sy - lastSy) / dt - scrollV) * (1 - Math.exp(-dt * 9));
      lastSy = sy;
      tiltV += ((clamp(scrollV / 3600, -1, 1) * -0.3 - tilt) * 42 - tiltV * 7.5) * dt; tilt += tiltV * dt;
      draw(dt);
    }

    build();
    if (reduce) draw(0); else {
      gsap.ticker.add(() => step(performance.now()));
      const seen = (e) => { ptr.x = e.clientX; ptr.y = e.clientY; ptr.target = 1; };
      const gone = () => { ptr.target = 0; ptr.pressT = 0; };
      window.addEventListener('pointermove', seen, { passive: true });
      window.addEventListener('pointerdown', (e) => {
        seen(e);
        if (!(e.target.closest && e.target.closest('a, button, #heroStage'))) ptr.pressT = 1;
      }, { passive: true });
      window.addEventListener('pointerup', (e) => { ptr.pressT = 0; if (e.pointerType !== 'mouse') ptr.target = 0; }, { passive: true });
      window.addEventListener('pointercancel', gone, { passive: true });
      window.addEventListener('blur', gone);
      document.documentElement.addEventListener('mouseleave', gone);
    }
    let rt = 0;
    window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { build(); if (reduce) draw(0); }, 120); });
    return {
      state: S,
      // a tap on the orb: the field rings, and the lines leaving it quicken
      surge() { surge = 1; kickV += 8; }
    };
  }

  /* ---------------------------------------------------------------------
     The shift: a layered organisation becomes small teams with agent rings.
     --------------------------------------------------------------------- */
  function createShiftViz(canvas) {
    const ctx = canvas.getContext('2d');
    const state = { p: reduce ? 1 : 0, appear: reduce ? 1 : 0 };
    const VW = 700, VH = 470;
    let W = 1, H = 1, dpr = 1, s = 1, ox = 0, oy = 0, visible = false, rot = 0, last = 0;

    const L3 = Array.from({ length: 12 }, (_, i) => 62 + i * 52.4);
    const L2 = Array.from({ length: 6 }, (_, i) => (L3[i * 2] + L3[i * 2 + 1]) / 2);
    const L1 = [0, 1, 2].map((i) => (L2[i * 2] + L2[i * 2 + 1]) / 2);
    const yA = [44, 152, 268, 384];
    const pods = [128, 350, 572], leadY = 150, ringY = 338, ringR = 76, topY = 40;

    const E = [];
    E.push({ ax: 350, ay: yA[0], bx: 350, by: topY, type: 'gen', to: 'gen', lvl: 0, idx: 0 });
    L1.forEach((x, i) => E.push({ ax: x, ay: yA[1], bx: pods[i], by: leadY, type: 'gen', to: 'gen', lvl: 1, idx: i, pod: i }));
    L2.forEach((x, i) => {
      const pod = Math.floor(i / 2), keep = i % 2 === 0;
      E.push({ ax: x, ay: yA[2], bx: keep ? pods[pod] + 94 : x, by: keep ? 222 : yA[2] + 46, type: i % 3 === 0 ? 'gen' : 'spec', to: keep ? 'spec' : 'out', lvl: 2, idx: i, pod });
    });
    L3.forEach((x, i) => E.push({ ax: x, ay: yA[3], type: i % 5 === 1 ? 'gen' : 'spec', to: 'agent', lvl: 3, idx: i, pod: Math.floor(i / 4), slot: i % 4 }));
    E.forEach((e) => { e.d = 0.1 + (3 - e.lvl) * 0.045 + e.idx * 0.009; });

    function build() {
      const r = canvas.getBoundingClientRect();
      W = Math.max(1, r.width); H = Math.max(1, r.height);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      s = Math.min(W / VW, H / VH); ox = (W - VW * s) / 2; oy = (H - VH * s) / 2;
    }
    function person(x, y, filled, alpha, k) {
      if (alpha <= 0.01) return;
      const z = 12.5 * k;
      ctx.globalAlpha = alpha; ctx.lineWidth = 1.7;
      ctx.fillStyle = filled ? C.ink : C.paper; ctx.strokeStyle = C.ink;
      ctx.beginPath(); ctx.arc(x, y + z * 0.95, z * 0.86, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(x, y - z * 0.5, z * 0.46, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    function agent(x, y, alpha, k) {
      if (alpha <= 0.01) return;
      const z = 11.5 * k;
      ctx.globalAlpha = alpha; ctx.lineWidth = 1.9; ctx.strokeStyle = C.accent; ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.moveTo(x, y - z); ctx.lineTo(x, y - z - 5 * k); ctx.stroke();
      rr(ctx, x - z, y - z, z * 2, z * 2, 5.5 * k); ctx.fill(); ctx.stroke();
      ctx.fillStyle = C.accent;
      ctx.beginPath(); ctx.arc(x - z * 0.4, y - z * 0.05, 1.9 * k, 0, Math.PI * 2); ctx.arc(x + z * 0.4, y - z * 0.05, 1.9 * k, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x, y - z - 6 * k, 1.8 * k, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }
    function elbow(x0, y0, x1, y1, midY, prog) {
      const pts = [[x0, y0], [x0, midY], [x1, midY], [x1, y1]];
      let total = 0; const lens = [];
      for (let i = 0; i < 3; i++) { const l = Math.abs(pts[i + 1][0] - pts[i][0]) + Math.abs(pts[i + 1][1] - pts[i][1]); lens.push(l); total += l; }
      let left = total * prog;
      ctx.beginPath(); ctx.moveTo(x0, y0);
      for (let i = 0; i < 3 && left > 0; i++) {
        const t = Math.min(1, left / (lens[i] || 1));
        ctx.lineTo(lerp(pts[i][0], pts[i + 1][0], t), lerp(pts[i][1], pts[i + 1][1], t));
        left -= lens[i];
      }
      ctx.stroke();
    }
    function draw() {
      const p = state.p, ap = state.appear;
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * ox, dpr * oy);
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      const cA = (1 - clamp(p / 0.26)) * clamp(ap * 1.3 - 0.2);
      const cB = clamp((p - 0.6) / 0.32);

      if (cA > 0.01) {
        ctx.strokeStyle = C.ink; ctx.lineWidth = 1.3; ctx.globalAlpha = 0.55 * cA;
        const drawP = clamp(ap * 1.6);
        L1.forEach((x) => elbow(350, yA[0] + 22, x, yA[1] - 22, (yA[0] + yA[1]) / 2 + 6, drawP));
        L2.forEach((x, i) => elbow(L1[Math.floor(i / 2)], yA[1] + 22, x, yA[2] - 22, (yA[1] + yA[2]) / 2 + 6, drawP));
        L3.forEach((x, i) => elbow(L2[Math.floor(i / 2)], yA[2] + 22, x, yA[3] - 22, (yA[2] + yA[3]) / 2 + 6, drawP));
        ctx.globalAlpha = 1;
      }
      if (cB > 0.01) {
        ctx.strokeStyle = C.ink; ctx.lineWidth = 1.4; ctx.globalAlpha = 0.6;
        pods.forEach((x) => elbow(350, topY + 22, x, leadY - 22, (topY + leadY) / 2 + 6, cB));
        pods.forEach((x) => {
          elbow(x, leadY + 22, x, ringY - ringR, leadY + 40, cB);
          ctx.beginPath(); ctx.moveTo(x + 14, leadY + 6);
          const ex = lerp(x + 14, x + 94, clamp(cB * 2)), ey = lerp(leadY + 6, 202, clamp(cB * 2 - 1));
          ctx.lineTo(ex, leadY + 6); if (cB > 0.5) ctx.lineTo(x + 94, ey); ctx.stroke();
        });
        ctx.globalAlpha = 1;
        ctx.strokeStyle = C.ring; ctx.lineWidth = 1.8;
        pods.forEach((x) => { ctx.beginPath(); ctx.arc(x, ringY, ringR, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * cB); ctx.stroke(); });
      }

      E.forEach((e) => {
        const q = easeIO(clamp((p - e.d) / 0.52));
        let bx = e.bx, by = e.by;
        if (e.to === 'agent') {
          const a = rot + e.slot * (Math.PI / 2) + e.pod * 0.7 - Math.PI / 4;
          bx = pods[e.pod] + Math.cos(a) * ringR; by = ringY + Math.sin(a) * ringR;
        }
        const x = lerp(e.ax, bx, q), y = lerp(e.ay, by, q) - Math.sin(Math.PI * q) * (e.to === 'agent' ? 18 : 8);
        const show = clamp(ap * 1.9 - e.lvl * 0.3);
        const pop = easeBack(show);
        if (e.to === 'agent') {
          const m = clamp((q - 0.35) / 0.4);
          person(x, y, e.type === 'gen', (1 - m) * show, pop * (1 - m * 0.25));
          agent(x, y, m, 0.8 + 0.2 * m);
        } else if (e.to === 'out') {
          const o = 1 - clamp(q * 1.5);
          person(x, y, e.type === 'gen', o * show, pop * (0.6 + 0.4 * o));
        } else {
          const filled = e.to === 'gen' ? true : (q < 0.5 ? e.type === 'gen' : false);
          person(x, y, filled, show, pop);
        }
      });
    }
    function step() {
      const now = performance.now() / 1000, dt = Math.min(0.05, now - last || 0.016);
      last = now;
      rot += dt * 0.32 * clamp((state.p - 0.7) / 0.3);
      draw();
    }
    build();
    if (reduce) draw();
    else { gsap.ticker.add(() => { if (visible) step(); }); onVisible(canvas, (v) => { visible = v; }); }
    let rt = 0;
    window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { build(); draw(); }, 120); });
    return { state, rebuild: () => { build(); draw(); } };
  }

  /* ---------------------------------------------------------------------
     Sections
     --------------------------------------------------------------------- */
  function initAbout() {
    const sec = $('#about');
    if (reduce) return;
    reveals(sec);
    rise($$('.trio__item', sec), $('.trio', sec), { stagger: 0.12 });
    splitLines($('#mission'), 'top 84%');
    rise($$('.values li', sec), $('.values', sec), { stagger: 0.09 });
  }

  function initWhat() {
    const sec = $('#what');
    if (reduce) return;
    reveals(sec);
    rise($$('.lineitem', sec), $('#lines'), { y: 56, stagger: 0.1, duration: 1.05, ease: 'expo.out' });
    rise($$('.traits li', sec), $('.traits', sec), { y: 14, stagger: 0.04, duration: 0.7 });
  }

  function initShift() {
    const sec = $('#shift'), canvas = $('#shiftCanvas');
    const viz = createShiftViz(canvas);
    const states = $$('.shift__state', sec), formula = $('.shift__formula', sec);
    const setState = (p) => {
      states[0].classList.toggle('is-on', p < 0.5);
      states[1].classList.toggle('is-on', p >= 0.5);
    };
    if (reduce) { setState(1); return; }
    reveals(sec);
    const legend = $('.shift__legend', sec);
    if (legend) gsap.set(legend, { autoAlpha: 0 });
    ScrollTrigger.create({
      trigger: canvas, start: 'top 85%', once: true,
      onEnter: () => {
        gsap.to(viz.state, { appear: 1, duration: 1.6, ease: 'power2.out' });
        if (legend) gsap.to(legend, { autoAlpha: 1, duration: 0.9, delay: 0.5 });
      }
    });
    mq.add({ desk: DESK, mob: MOB }, (ctx) => {
      const desk = ctx.conditions.desk;
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: desk
          ? { trigger: $('.shift__stage', sec), start: 'top top', end: '+=135%', pin: true, scrub: true, invalidateOnRefresh: true }
          : { trigger: canvas, start: 'top 72%', end: 'bottom 38%', scrub: 0.5 },
        onUpdate: () => setState(viz.state.p)
      });
      tl.to(viz.state, { p: 1, duration: 1 }, 0.06)
        .fromTo(formula, { opacity: 0.14 }, { opacity: 1, duration: 0.22 }, 0.8)
        .to({}, { duration: 0.1 });
      requestAnimationFrame(() => viz.rebuild());
      return () => { viz.state.p = 0; setState(0); gsap.set(formula, { clearProps: 'opacity' }); };
    });
  }

  function initGap() {
    const sec = $('#gap');
    if (reduce) return;
    reveals(sec);
    const man = $('#manifesto');
    SplitText.create(man, {
      type: 'words', wordsClass: 'w', autoSplit: true,
      onSplit(self) {
        return gsap.fromTo(self.words, { opacity: 0.14 }, {
          opacity: 1, ease: 'none', stagger: 0.08,
          scrollTrigger: { trigger: man, start: 'top 80%', end: 'bottom 48%', scrub: true }
        });
      }
    });
    $$('.take', sec).forEach((li) => {
      const tl = gsap.timeline({ scrollTrigger: { trigger: li, start: 'top 86%', once: true }, defaults: { ease: 'power3.out' } });
      tl.fromTo(li, { '--rule': 0 }, { '--rule': 1, duration: 1.2, ease: 'expo.out' }, 0)
        .from($('.take__title', li), { y: 28, autoAlpha: 0, duration: 0.95 }, 0.05)
        .from($('.take__body', li), { y: 20, autoAlpha: 0, duration: 0.95 }, 0.15)
        .from($('.take__not', li), { autoAlpha: 0, duration: 0.7 }, 0.3)
        .fromTo($('s', li), { '--strike': '0%' }, { '--strike': '100%', duration: 0.9, ease: 'power2.inOut' }, 0.75);
    });
  }

  function initBring() {
    const sec = $('#approach');
    const dots = $('.art--adopt .art__dots', sec);
    const NS = 'http://www.w3.org/2000/svg';
    for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) {
      const el = document.createElementNS(NS, 'circle');
      el.setAttribute('cx', 30 + c * 40); el.setAttribute('cy', 30 + r * 40); el.setAttribute('r', 10);
      dots.appendChild(el);
    }
    const dotEls = $$('circle', dots);
    if (reduce) { dotEls.forEach((d) => { d.style.fill = C.accent; }); return; }
    reveals(sec);

    const pillars = $$('.pillar', sec);
    pillars.forEach((p, i) => {
      if (i === pillars.length - 1) return;
      gsap.to(p, {
        scale: 1 - (pillars.length - 1 - i) * 0.034, ease: 'none',
        scrollTrigger: { trigger: pillars[i + 1], start: 'top bottom', endTrigger: pillars[pillars.length - 1], end: 'top 20%', scrub: true }
      });
    });

    // bespoke deployment: the piece that fits
    const fit = gsap.timeline({ scrollTrigger: { trigger: pillars[0], start: 'top 62%', toggleActions: 'play none none reset' } });
    fit.from('.art--fit .art__grid rect', { opacity: 0, scale: 0.6, transformOrigin: '50% 50%', duration: 0.6, ease: 'back.out(1.6)', stagger: { each: 0.04, from: 'random' } })
      .from('.art--fit .art__slot', { opacity: 0, duration: 0.4 }, 0.2)
      .from('.art--fit .art__piece', { x: 58, y: -92, rotation: 16, opacity: 0, transformOrigin: '50% 50%', duration: 1.1, ease: 'back.out(1.25)' }, 0.5)
      .to('.art--fit .art__slot', { opacity: 0, duration: 0.3 }, '-=0.3');

    // strategic partnership: two paths, one outcome
    const paths = $$('.art--align .art__path');
    paths.forEach((pth) => { const l = pth.getTotalLength(); gsap.set(pth, { strokeDasharray: l, strokeDashoffset: l }); });
    gsap.timeline({ scrollTrigger: { trigger: pillars[1], start: 'top 62%', toggleActions: 'play none none reset' } })
      .from('.art--align > circle', { scale: 0, transformOrigin: '50% 50%', duration: 0.5, ease: 'back.out(2)', stagger: 0.1 })
      .to(paths, { strokeDashoffset: 0, duration: 1.3, ease: 'power2.inOut', stagger: 0.12 }, 0.15)
      .from('.art--align .art__target', { scale: 0, transformOrigin: '50% 50%', duration: 0.7, ease: 'back.out(2)' }, '-=0.45');

    // change management: adoption spreads until everyone is in
    gsap.timeline({ scrollTrigger: { trigger: pillars[2], start: 'top 62%', toggleActions: 'play none none reset' } })
      .to(dotEls.slice(0, 21), { fill: C.accent, duration: 0.35, stagger: { each: 0.045, grid: [5, 5], from: 'start', axis: null } })
      .to(dotEls.slice(21), { fill: C.accent, duration: 0.4, stagger: 0.16 }, '+=0.45');

    gsap.from('.apart li', {
      autoAlpha: 0, y: 22, duration: 0.9, ease: 'power3.out', stagger: 0.08,
      scrollTrigger: { trigger: pillars[3], start: 'top 68%', once: true }
    });
  }

  // On a phone each capability row is its name alone and opens on a tap (the styles are in the phone block of
  // the stylesheet). The button is a real one, so it also works from a keyboard and is announced properly.
  function initRowTaps() {
    let t = 0;
    const settle = () => { clearTimeout(t); t = setTimeout(() => ScrollTrigger.refresh(), 220); };
    $$('.row').forEach((row, i) => {
      const text = $('p', row), name = $('h4', row);
      if (!text || !name) return;
      text.id = text.id || `cap-${i + 1}`;
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'row__toggle';
      b.setAttribute('aria-expanded', 'false'); b.setAttribute('aria-controls', text.id);
      b.setAttribute('aria-label', `${name.textContent}: details`);
      b.addEventListener('click', () => {
        b.setAttribute('aria-expanded', row.classList.toggle('is-open') ? 'true' : 'false');
        settle();
      });
      row.appendChild(b);
    });
    html.classList.add('taps');
  }

  // Each industry is a chapter: a heading that stays put while its rows come in beside it.
  function initChapter(ch) {
    reveals($('.chapter__head', ch));
    const rows = $$('.row', ch);
    rise(rows, $('.rows', ch), { y: 22, stagger: 0.055, duration: 0.8, scrollTrigger: { trigger: $('.rows', ch), start: 'top 84%', once: true } });
  }
  // The financial services chapter holds the pinned product gallery, so the chapters
  // below it are set up after the gallery (see boot) to measure correctly.
  function initIndustries() {
    const sec = $('#industries');
    if (reduce) return;
    reveals($('.wrap', sec));
    rise($$('.indnav a', sec), $('.indnav', sec), { y: 18, stagger: 0.05, duration: 0.7 });
    initChapter($('#ind-fs'));
  }
  function initIndustriesRest() {
    if (reduce) return;
    $$('#industries .chapter:not(#ind-fs)').forEach(initChapter);
  }

  function productTimeline(prod) {
    const tl = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' } });
    const q = (s) => $$(s, prod);
    tl.from(q('.prod__info > *'), { y: 22, autoAlpha: 0, duration: 0.8, stagger: 0.06 }, 0);
    if (prod.classList.contains('prod--p360')) {
      tl.from(q('.win'), { y: 34, autoAlpha: 0, duration: 0.9 }, 0.1)
        .from(q('.kpi'), { y: 14, autoAlpha: 0, scale: 0.94, duration: 0.5, stagger: 0.06 }, 0.4)
        .from(q('.alert'), { autoAlpha: 0, x: -16, duration: 0.5 }, 0.95)
        .from(q('.ava'), { yPercent: 55, autoAlpha: 0, duration: 0.9, ease: 'back.out(1.2)' }, 1.0)
        .from(q('.ava__say'), { scale: 0.6, autoAlpha: 0, transformOrigin: '20% 100%', duration: 0.45, ease: 'back.out(2)' }, 1.5)
        .from(q('.chat'), { y: 46, autoAlpha: 0, scale: 0.96, transformOrigin: '100% 100%', duration: 0.8 }, 1.25)
        .from(q('.chat__q'), { autoAlpha: 0, y: 10, scale: 0.9, transformOrigin: '100% 100%', duration: 0.45 }, 1.75)
        .from(q('.chat__steps li'), { autoAlpha: 0, x: -10, duration: 0.4, stagger: 0.38 }, 2.2)
        .from(q('.chat__a'), { autoAlpha: 0, y: 8, duration: 0.5 }, 3.4)
        .from(q('.chat__actions .mini'), { autoAlpha: 0, y: 8, duration: 0.4, stagger: 0.08 }, 3.7);
    } else if (prod.classList.contains('prod--ms')) {
      tl.from(q('.win'), { y: 34, autoAlpha: 0, duration: 0.9 }, 0.1)
        .from(q('.tbl tbody tr'), { autoAlpha: 0, x: -12, duration: 0.45, stagger: 0.12 }, 0.5)
        .from(q('.ms__board .badge'), { scale: 0, duration: 0.5, ease: 'back.out(2.2)' }, 1.0)
        .from(q('.shap i'), { scaleX: 0, duration: 0.8, ease: 'expo.out', stagger: 0.12 }, 0.7)
        .from(q('.psi__bar'), { scaleY: 0, duration: 0.7, ease: 'expo.out', stagger: 0.11 }, 1.2)
        .from(q('.psi__bar b'), { autoAlpha: 0, duration: 0.3, stagger: 0.11 }, 1.6)
        .from(q('.psi__limit'), { scaleX: 0, duration: 0.7, ease: 'power2.inOut' }, 1.5)
        .from(q('.ms__drift .badge'), { scale: 0, duration: 0.5, ease: 'back.out(2.2)' }, 2.3)
        .from(q('.ms__alert'), { autoAlpha: 0, y: 10, duration: 0.5 }, 2.4);
    } else {
      const flow = $('.flow', prod), nodes = $$('[data-node]', prod);
      flow.classList.add('flow--anim');
      tl.from(q('.win'), { y: 34, autoAlpha: 0, duration: 0.9 }, 0.1)
        .from(nodes, { autoAlpha: 0, y: 14, duration: 0.45, stagger: 0.06 }, 0.45)
        .from(q('.branch'), { autoAlpha: 0, y: -8, duration: 0.4, stagger: 0.08 }, 0.9);
      nodes.forEach((nd, i) => tl.call(() => nd.classList.add('is-on'), null, 1.2 + i * 0.42));
      tl.from(q('.decision__card'), { autoAlpha: 0, y: 16, duration: 0.6, stagger: 0.12 }, 1.2 + nodes.length * 0.42 - 0.2);
    }
    return tl;
  }

  function initWork() {
    const sec = $('#work'), pin = $('#workPin'), track = $('#workTrack');
    const prods = $$('[data-prod]', sec), bar = $('#workBar'), count = $('#workCount');
    if (reduce) return;
    reveals(sec);
    const tls = prods.map(productTimeline);

    mq.add({ desk: DESK, mob: MOB }, (ctx) => {
      if (ctx.conditions.desk) {
        pin.classList.add('is-pinned');
        const dist = () => Math.max(0, track.scrollWidth - window.innerWidth);
        const tw = gsap.to(track, {
          x: () => -dist(), ease: 'none',
          scrollTrigger: {
            trigger: pin, start: 'center center', end: () => `+=${dist()}`, pin: true, scrub: true, invalidateOnRefresh: true,
            onUpdate(self) {
              bar.style.transform = `scaleX(${(1 + self.progress * 2) / 3})`;
              count.textContent = `0${Math.min(3, 1 + Math.round(self.progress * 2))}`;
            }
          }
        });
        ScrollTrigger.create({ trigger: pin, start: 'top 62%', once: true, onEnter: () => tls[0].play() });
        prods.slice(1).forEach((prod, i) => {
          ScrollTrigger.create({ trigger: prod, containerAnimation: tw, start: 'left 68%', once: true, onEnter: () => tls[i + 1].play() });
        });
      } else {
        prods.forEach((prod, i) => ScrollTrigger.create({ trigger: prod, start: 'top 72%', once: true, onEnter: () => tls[i].play() }));
      }
      return () => { pin.classList.remove('is-pinned'); gsap.set(track, { clearProps: 'transform' }); };
    });

    $$('#loop li').forEach((li) => {
      gsap.timeline({ scrollTrigger: { trigger: li, start: 'top 90%', once: true } })
        .from($('b', li), { yPercent: 105, duration: 1.15, ease: 'expo.out' }, 0)
        .from($('span', li), { autoAlpha: 0, x: 16, duration: 0.8, ease: 'power3.out' }, 0.25)
        .fromTo(li, { '--rule': 0 }, { '--rule': 1, duration: 1.3, ease: 'expo.out' }, 0.1);
    });
  }

  function initEngage() {
    const sec = $('#engage'), gates = $('#gates'), spine = $('.gates__spine', gates);
    const nodes = $$('.gate__node', gates), items = $$('.gate', gates);
    const size = () => {
      const gr = gates.getBoundingClientRect();
      const a = nodes[0].getBoundingClientRect(), b = nodes[nodes.length - 1].getBoundingClientRect();
      spine.style.top = `${a.top + a.height / 2 - gr.top}px`;
      spine.style.height = `${b.top - a.top}px`;
    };
    size();
    window.addEventListener('resize', size);
    if (reduce) return;
    reveals(sec);
    gates.classList.add('gates--anim');
    gates.style.setProperty('--fill', 0);
    ScrollTrigger.addEventListener('refreshInit', size);
    const update = () => {
      const focY = window.innerHeight * 0.5;
      const a = nodes[0].getBoundingClientRect(), b = nodes[nodes.length - 1].getBoundingClientRect();
      const ay = a.top + a.height / 2, by = b.top + b.height / 2;
      gates.style.setProperty('--fill', clamp((focY - ay) / Math.max(1, by - ay)).toFixed(4));
      nodes.forEach((nd, i) => { const r = nd.getBoundingClientRect(); items[i].classList.toggle('is-passed', r.top + r.height / 2 <= focY + 2); });
    };
    ScrollTrigger.create({ trigger: gates, start: 'top bottom', end: 'bottom top', onUpdate: update, onRefresh: update });
    items.forEach((it) => {
      gsap.from($$(':scope > :not(.gate__node)', it), {
        x: 24, autoAlpha: 0, duration: 0.95, ease: 'power3.out', stagger: 0.07,
        scrollTrigger: { trigger: it, start: 'top 80%', once: true }
      });
    });
  }

  function initDeliver() {
    const sec = $('#deliver');
    if (reduce) return;
    reveals(sec);
    rise($$('.owns li', sec), $('.owns', sec), { y: 30, stagger: 0.09 });
    // Dubai in the middle of one working day's sweep
    const path = $('#arcPath'), arc = $('.arc', sec), dotsEl = $$('.arc i', sec);
    const len = path.getTotalLength();
    gsap.set(path, { strokeDasharray: len, strokeDashoffset: len });
    gsap.timeline({ scrollTrigger: { trigger: $('.places', sec), start: 'top 86%', once: true }, defaults: { ease: 'power3.out' } })
      .to(path, { strokeDashoffset: 0, duration: 1.5, ease: 'power2.inOut' }, 0)
      .from(dotsEl, { scale: 0, duration: 0.6, ease: 'back.out(2.4)', stagger: { each: 0.12, from: 'center' } }, 0.5)
      .from($$('.place', sec), { y: 24, autoAlpha: 0, duration: 0.8, stagger: { each: 0.1, from: 'center' } }, 0.55);
    void arc;
  }

  function initWho() {
    const sec = $('#team');
    if (reduce) return;
    reveals(sec);
    $$('[data-marquee]', sec).forEach((row) => {
      const dir = parseFloat(row.dataset.marquee);
      gsap.fromTo(row, { xPercent: dir < 0 ? 0 : -26 }, {
        xPercent: dir < 0 ? -22 : -4, ease: 'none',
        scrollTrigger: { trigger: row.parentElement, start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });
    rise($$('.member', sec), $('.team__grid', sec), { y: 30, stagger: 0.06, duration: 0.8 });
  }

  function initContact() {
    const sec = $('#contact'), panel = $('#contactPanel');
    const copy = $('#copyMail');
    copy.addEventListener('click', () => {
      const text = copy.dataset.copy, span = $('span', copy);
      const done = () => { copy.classList.add('is-done'); span.textContent = 'Copied'; setTimeout(() => { copy.classList.remove('is-done'); span.textContent = 'Copy address'; }, 1800); };
      const select = () => { const r = document.createRange(); r.selectNodeContents($('#mailLink')); const s = window.getSelection(); s.removeAllRanges(); s.addRange(r); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done).catch(select);
      else select();
    });
    if (reduce) return;
    reveals(sec);
    gsap.from(panel, { scale: 0.93, ease: 'none', scrollTrigger: { trigger: panel, start: 'top bottom', end: 'top 35%', scrub: true } });
    rise($$('.way', sec), $('.ways', sec), { y: 40, stagger: 0.1 });
    const ava = $('.team__ava', sec);
    gsap.set(ava, { clipPath: 'inset(-200% -200% 0 -200%)' });
    gsap.from($('img', ava), { yPercent: 100, ease: 'none', scrollTrigger: { trigger: panel, start: 'top 92%', end: 'top 52%', scrub: true } });
    gsap.from($('.ava__say', ava), { scale: 0.5, autoAlpha: 0, transformOrigin: '100% 50%', duration: 0.5, ease: 'back.out(2)', scrollTrigger: { trigger: panel, start: 'top 55%', toggleActions: 'play none none reverse' } });
  }

  function initFooter() {
    if (reduce) return;
    const foot = $('#foot');
    gsap.from($$('.foot__top > *, .foot__nav > div', foot), {
      y: 24, autoAlpha: 0, duration: 0.9, ease: 'power3.out', stagger: 0.07,
      scrollTrigger: { trigger: foot, start: 'top 88%', once: true }
    });
    gsap.from($('.foot__mark svg', foot), {
      yPercent: 38, autoAlpha: 0, duration: 1.3, ease: 'expo.out',
      scrollTrigger: { trigger: $('.foot__mark', foot), start: 'top 96%', once: true }
    });
  }

  /* ---------------------------------------------------------------------
     Navigation
     --------------------------------------------------------------------- */
  function initNav(signal) {
    const nav = $('#nav'), burger = $('#burger'), menu = $('#menu');
    let open = false;
    const setMenu = (flag) => {
      if (open === flag) return;
      open = flag;
      burger.setAttribute('aria-expanded', flag ? 'true' : 'false');
      burger.setAttribute('aria-label', flag ? 'Close menu' : 'Open menu');
      if (flag) {
        menu.hidden = false; nav.classList.remove('is-hidden');
        requestAnimationFrame(() => menu.classList.add('is-open'));
        if (lenis) lenis.stop();
        if (!reduce) gsap.from($$('.menu__links a', menu), { yPercent: 60, autoAlpha: 0, duration: 0.8, ease: 'expo.out', stagger: 0.05, delay: 0.2 });
      } else {
        menu.classList.remove('is-open');
        setTimeout(() => { if (!open) menu.hidden = true; }, 720);
        if (lenis) lenis.start();
      }
      signal.hide(flag);
    };
    burger.addEventListener('click', () => setMenu(!open));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

    document.addEventListener('click', (e) => {
      const a = e.target.closest && e.target.closest('a[href^="#"]');
      if (!a) return;
      const id = a.getAttribute('href');
      const target = id === '#top' || id === '#' ? 0 : $(id);
      if (target === null) return;
      e.preventDefault();
      setMenu(false);
      scrollToTarget(target, target === 0 ? 0 : -56);
    });

    ScrollTrigger.create({
      start: 0, end: 'max',
      onUpdate(self) {
        const y = self.scroll();
        nav.classList.toggle('is-solid', y > 24);
        if (!open) nav.classList.toggle('is-hidden', self.direction === 1 && y > 520);
      }
    });

    $$('[data-rail]').forEach((sec) => {
      ScrollTrigger.create({
        trigger: sec, start: 'top 55%', end: 'bottom 55%',
        onToggle: (self) => { if (self.isActive) signal.setSection(sec.dataset.rail); }
      });
    });
  }

  /* ---------------------------------------------------------------------
     Boot: the opening sting plays on every load, then the hero sequence
     --------------------------------------------------------------------- */
  // The satellites' 3D library is large. It is fetched only once the opening animation is under way, so it
  // cannot hold that up, and not at all for a visitor who has asked their browser to save data.
  let asked = false;
  function fetchSatellites() {
    if (asked) return;
    asked = true;
    const net = navigator.connection;
    if (net && net.saveData) return;
    import('./satellites.js').catch(() => { /* the hero works without its satellites */ });
  }

  function boot() {
    const loader = $('#loader'), video = $('#loaderVideo'), mark = $('#loaderMark');
    const signal = createSignal();
    const flow = createFlow($('#flowCanvas'), signal.pos);
    const fx = createFeedback();
    signal.onTap((x, y) => { flow.surge(x, y); fx.tick(); });
    signal.on('dock', () => fx.tick());
    const hero = createHeroCopy(fx);
    // what js/satellites.js needs to join in
    window.ntell = { reduce, signal, flow, hero, fx, lenis };

    // sections are initialised top to bottom so pinned scenes measure correctly
    initAbout();
    initWhat();
    initRowTaps();
    initIndustries();
    initWork();
    initIndustriesRest();
    initShift();
    initGap();
    initBring();
    initEngage();
    initDeliver();
    initWho();
    initContact();
    initFooter();
    initNav(signal);

    if (reduce) { if (loader) loader.remove(); fetchSatellites(); return; }

    const intro = gsap.timeline({ paused: true, defaults: { ease: 'expo.out' } });
    intro
      .from('.nav__inner > *', { y: -22, autoAlpha: 0, duration: 0.9, stagger: 0.07 }, 0)
      .call(() => signal.start(), null, 0.1)
      .to(flow.state, { intro: 1, duration: 2.6, ease: 'power2.out' }, 0.15)
      .from('.hero__label', { autoAlpha: 0, y: 14, duration: 0.8 }, 0.25)
      .from('.hero__line-in', { yPercent: 114, duration: 1.3, stagger: 0.12 }, 0.3)
      .from('.hero__ledes, .hero__cta > *', { autoAlpha: 0, y: 24, duration: 1, stagger: 0.08 }, 0.8)
      .from('.hero__meta > *', { autoAlpha: 0, y: 10, duration: 0.7, stagger: 0.05 }, 1.1);

    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    const hash = window.location.hash;
    window.scrollTo(0, 0);
    if (lenis) lenis.stop();

    let lifted = false;
    const lift = (quick) => {
      if (lifted) return; lifted = true;
      fetchSatellites();
      if (lenis) lenis.start();
      const out = gsap.timeline({ onComplete: () => loader.remove() });
      if (quick) out.to(loader, { autoAlpha: 0, duration: 0.35, ease: 'power1.out' });
      else out.to(loader, { clipPath: 'inset(0 0 100% 0)', duration: 1.05, ease: 'expo.inOut' });
      intro.delay(quick ? 0.05 : 0.45).restart(true);
      if (hash && hash.length > 1 && $(hash)) setTimeout(() => scrollToTarget($(hash), -56), quick ? 500 : 1300);
    };

    gsap.set(loader, { clipPath: 'inset(0 0 0% 0)' });
    // the animation plays on every load; the button and Escape are there for anyone in a hurry
    const skipNow = () => { if (lifted) return; video.pause(); lift(true); };
    const skipBtn = $('#loaderSkip');
    if (skipBtn) skipBtn.addEventListener('click', skipNow);
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape') skipNow(); });

    // Play the supplied sting from the first frame of the mark to the full wordmark.
    // The video is asked to play at once: a phone does not fetch a video until it is. While it is on its way
    // the logo's orb waits on screen. If the video starts in time, it takes over. If it does not (a slow
    // connection, or a phone that refuses to autoplay, as low power mode does), the wordmark is drawn in
    // round the orb instead. Either way there is an opening, and it ends on the same frame.
    const END = 3.45;
    let started = false, drawn = false;
    const watch = () => { if (lifted) return; if (video.currentTime >= END || video.ended) { video.pause(); lift(false); } else requestAnimationFrame(watch); };
    const takeOver = () => {
      if (started || drawn || lifted) return;
      started = true;
      fetchSatellites();
      if (mark) gsap.to(mark, { autoAlpha: 0, duration: 0.18, ease: 'power1.out' });
      video.playbackRate = 1.12;
      requestAnimationFrame(watch);
    };
    const drawInstead = () => {
      if (started || drawn || lifted) return;
      drawn = true;
      loader.classList.add('is-drawn');
      fetchSatellites();
      video.pause();
      gsap.set(video, { autoAlpha: 0 });
      if (!mark) { lift(true); return; }
      gsap.timeline({ onComplete: () => lift(false) })
        .fromTo('.loader__letters', { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 1, ease: 'expo.out' })
        .to({}, { duration: 0.75 });
    };
    video.addEventListener('error', drawInstead);
    // (when every source has failed, the video is left with none: that is only known a moment after the last error)
    $$('source', video).forEach((src) => src.addEventListener('error', () => setTimeout(() => { if (video.networkState === 3) drawInstead(); }, 80)));
    if (video.readyState < 1) video.addEventListener('loadedmetadata', () => { if (video.currentTime < 0.25) { try { video.currentTime = 0.3; } catch (e) { /* it starts from the top */ } } }, { once: true });
    const asking = video.play();
    if (asking && asking.catch) asking.catch((err) => { if (!err || err.name !== 'AbortError') drawInstead(); });
    // The video takes over when its clock is moving and it is past its blank opening frames. The clock is
    // watched, not an event, because the video may have begun on its own before this script was listening.
    const from = Math.max(video.currentTime, 0.28);
    const moving = () => {
      if (started || drawn || lifted) return;
      if (!video.paused && video.currentTime > from + 0.04) takeOver(); else requestAnimationFrame(moving);
    };
    requestAnimationFrame(moving);
    // never hold the page hostage to the video
    setTimeout(drawInstead, 2400);
    setTimeout(() => lift(false), 7000);
  }

  boot();

  const refresh = () => ScrollTrigger.refresh();
  window.addEventListener('load', refresh);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);
})();
