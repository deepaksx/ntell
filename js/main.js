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
     The travelling signal. The orb sits large on the hero stage, rolls away
     as the page scrolls, docks on the full stop of each chapter heading,
     rides a rail at the page edge between them, and lands as the dot of the
     wordmark in the footer.
     --------------------------------------------------------------------- */
  function createSignal() {
    const el = $('#signal'), rail = $('#rail'), label = $('#railLabel');
    const orb = createOrb($('#signalCanvas'));
    // Anchors are read live each frame: SplitText re-creates heading nodes when it re-splits.
    const anchors = () => $$('[data-orb]').map((node) => ({
      node, mode: node.dataset.orb || 'rail',
      k: node.classList.contains('dot') ? 1.5 : 1
    }));
    const st = { on: false, pop: 1, lx: null, ly: 0, ls: 0, dockedAt: -1, section: '', t: 0 };
    const pos = { x: 0, y: 0, r: 0, live: false };

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
        A.push(a); P.push({ x: r.left + r.width / 2, y: r.top + r.height / 2, s: Math.max(r.width, r.height) * a.k });
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
        else u[i] = A[i + 1] && A[i + 1].mode === 'direct' ? 0 : clamp((relY - P[i].y) / D);
      }
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
        if (u[k] <= 0) { docked = true; if (st.dockedAt !== k) { st.dockedAt = k; hit(A[k].node); } } else st.dockedAt = -1;
      } else if (A[k].mode === 'direct') {
        p = mix(P[k - 1], P[k], v[k]); st.dockedAt = -1;
      } else {
        const eu = easeIO(u[k - 1]), ev = easeIO(v[k]);
        const from = mix(P[k - 1], R, eu);
        if (A[k - 1].mode === 'stage') from.s = lerp(P[k - 1].s, R.s, easeOut(u[k - 1]));
        p = mix(from, P[k], ev);
        railness = eu * (1 - ev); st.dockedAt = -1;
      }
      p.s *= st.pop;

      // roll: with the scroll always, and with any sideways travel
      const radius = Math.max(p.s / 2, 64);
      if (st.lx !== null) orb.roll((p.x - st.lx) * 0.9, sy - st.ls, radius);
      st.lx = p.x; st.ly = p.y; st.ls = sy;
      if (docked && k === n - 1) orb.settle(0.07);
      else orb.spin([0.25, 1, 0.12], dt * (0.1 + 0.25 * clamp(p.s / 400)));
      orb.render();

      el.style.transform = `translate3d(${p.x.toFixed(2)}px,${p.y.toFixed(2)}px,0) scale(${(p.s / 100).toFixed(4)})`;
      pos.x = p.x; pos.y = p.y; pos.r = p.s / 2; pos.live = true;

      rail.style.opacity = (railness * 0.95).toFixed(3);
      if (railness > 0.02) {
        label.style.top = `${R.y - rail.getBoundingClientRect().top}px`;
        if (label.textContent !== st.section) label.textContent = st.section;
      }
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
        st.on = true; st.pop = 0;
        gsap.ticker.add(frame);
        gsap.set(el, { opacity: 1 });
        gsap.to(st, { pop: 1, duration: 1.5, ease: 'elastic.out(1, 0.72)' });
        const kick = { v: 0.11 };
        gsap.to(kick, { v: 0, duration: 2.2, ease: 'power3.out', onUpdate: () => orb.spin([0.2, 1, 0], kick.v) });
      },
      setSection(name) { st.section = name; },
      hide(flag) { gsap.to(el, { autoAlpha: flag ? 0 : 1, duration: 0.25, overwrite: true }); }
    };
  }

  /* ---------------------------------------------------------------------
     Hero graphic: many scattered signals flow into the orb and leave as a few
     clear, evenly spaced lines. Insight in, decisions out. The lines follow
     the orb wherever it rolls.
     --------------------------------------------------------------------- */
  function createHeroViz(canvas, signalPos) {
    const ctx = canvas.getContext('2d');
    const stage = $('#heroStage');
    const S = { intro: reduce ? 1 : 0, scroll: 0, mx: 0, my: 0, tx: 0, ty: 0 };
    let W = 1, H = 1, dpr = 1, compact = false, lines = [], visible = true, time = 0, last = 0;

    function build() {
      const r = canvas.getBoundingClientRect();
      W = Math.max(1, r.width); H = Math.max(1, r.height);
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      compact = W < 860;
      const rnd = seeded(7);
      const n = compact ? 26 : 46;
      lines = Array.from({ length: n }, (_, i) => ({
        f: (i + 0.5) / n,
        sx: -0.05 - rnd() * 0.1,
        sy: (i + 0.5) / n + (rnd() - 0.5) * 0.05,
        amp: 16 + rnd() * 52, w: 0.22 + rnd() * 0.5, ph: rnd() * 6.28,
        hot: i % 6 === 2, alpha: 0.09 + rnd() * 0.15, lw: 0.8 + rnd() * 0.6,
        pulses: [rnd(), rnd() > 0.45 ? rnd() : -1], speed: 0.055 + rnd() * 0.075
      }));
    }
    const bez = (p0, p1, p2, p3, t) => {
      const u = 1 - t, a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
      return [a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]];
    };

    function draw(dt) {
      const rect = canvas.getBoundingClientRect();
      let ox, oy, R;
      if (signalPos && signalPos.live) { ox = signalPos.x - rect.left; oy = signalPos.y - rect.top; R = signalPos.r; }
      else { const s = stage.getBoundingClientRect(); ox = s.left + s.width / 2 - rect.left; oy = s.top + s.height / 2 - rect.top; R = s.width / 2; }
      const sRect = stage.getBoundingClientRect();
      const stageR = sRect.width / 2;
      const fade = 1 - clamp((S.scroll - 0.22) / 0.5);
      const I = S.intro;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      if (fade <= 0.002) return;

      // the light the orb throws on the page, and the shadow it rests on
      const glowA = 0.16 * fade * clamp(I * 2) * clamp(R / (stageR * 0.5));
      if (glowA > 0.003) {
        const g = ctx.createRadialGradient(ox, oy, R * 0.6, ox, oy, R * 2.3);
        g.addColorStop(0, `rgba(229,23,74,${glowA})`); g.addColorStop(1, 'rgba(229,23,74,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(ox, oy, R * 2.3, 0, Math.PI * 2); ctx.fill();
        ctx.save(); ctx.translate(ox, oy + R * 1.2); ctx.scale(1, 0.1);
        const sh = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 0.95);
        sh.addColorStop(0, `rgba(23,9,12,${0.2 * fade * clamp(I * 2)})`); sh.addColorStop(1, 'rgba(23,9,12,0)');
        ctx.fillStyle = sh; ctx.beginPath(); ctx.arc(0, 0, R * 0.95, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      }

      const yTop = compact ? -0.02 * H : -0.04 * H;
      const yBot = compact ? Math.min(H, sRect.bottom - rect.top + stageR * 0.7) : 1.04 * H;
      const tp = easeOut(clamp(I / 0.75));
      ctx.lineCap = 'round';
      lines.forEach((l) => {
        const sx = l.sx * W;
        const sy = lerp(yTop, yBot, l.sy) + Math.sin(time * l.w + l.ph) * 7 + S.my * 10 * (l.f - 0.5);
        const th = lerp(118, 242, l.f) * (Math.PI / 180);
        const ex = ox + Math.cos(th) * R * 0.985, ey = oy - Math.sin(th) * R * 0.985;
        const dx = ex - sx;
        const wob = Math.sin(time * l.w * 1.3 + l.ph * 2) * l.amp;
        const p0 = [sx, sy], p1 = [sx + dx * 0.42, sy + wob + S.my * 12];
        const p2 = [ex - dx * 0.3, ey + (ey - oy) * 1.35 - wob * 0.25], p3 = [ex, ey];
        const col = l.hot ? '215,20,60' : '23,9,12';
        const a = (l.hot ? 0.5 : l.alpha) * fade;
        const grad = ctx.createLinearGradient(sx, 0, ex, 0);
        // lines stay almost invisible where they pass behind the text, and gather strength towards the orb
        const quiet = compact ? 0.12 : 0.4;
        grad.addColorStop(0, `rgba(${col},0)`); grad.addColorStop(quiet, `rgba(${col},${a * 0.05})`);
        grad.addColorStop(Math.min(0.95, quiet + 0.24), `rgba(${col},${a * 0.6})`); grad.addColorStop(1, `rgba(${col},${a})`);
        ctx.strokeStyle = grad; ctx.lineWidth = l.hot ? l.lw + 0.4 : l.lw;
        ctx.beginPath(); ctx.moveTo(p0[0], p0[1]);
        if (tp >= 1) ctx.bezierCurveTo(p1[0], p1[1], p2[0], p2[1], p3[0], p3[1]);
        else {
          const q0 = [lerp(p0[0], p1[0], tp), lerp(p0[1], p1[1], tp)], q1 = [lerp(p1[0], p2[0], tp), lerp(p1[1], p2[1], tp)], q2 = [lerp(p2[0], p3[0], tp), lerp(p2[1], p3[1], tp)];
          const r0 = [lerp(q0[0], q1[0], tp), lerp(q0[1], q1[1], tp)], r1 = [lerp(q1[0], q2[0], tp), lerp(q1[1], q2[1], tp)];
          ctx.bezierCurveTo(q0[0], q0[1], r0[0], r0[1], lerp(r0[0], r1[0], tp), lerp(r0[1], r1[1], tp));
        }
        ctx.stroke();
        if (I >= 0.9) {
          for (let i = 0; i < l.pulses.length; i++) {
            let u = l.pulses[i];
            if (u < 0) continue;
            u += dt * l.speed * (0.45 + 1.7 * u);
            if (u >= 1) u = 0;
            l.pulses[i] = u;
            const pt = bez(p0, p1, p2, p3, u);
            const vis = clamp((u - (compact ? 0.15 : 0.42)) / 0.3);
            if (vis <= 0) continue;
            ctx.fillStyle = `rgba(215,20,60,${vis * 0.9 * fade})`;
            ctx.beginPath(); ctx.arc(pt[0], pt[1], l.hot ? 2.6 : 1.9, 0, Math.PI * 2); ctx.fill();
          }
        }
      });

      // what leaves: a few straight, evenly spaced lines, pulsing in step
      const bp = easeOut(clamp((I - 0.55) / 0.45)) * fade * clamp(R / (stageR * 0.45));
      if (bp > 0.003) {
        const K = compact ? 5 : 7;
        for (let j = 0; j < K; j++) {
          const dy = (j - (K - 1) / 2) * R * (compact ? 0.21 : 0.17);
          const x0 = ox + Math.sqrt(Math.max(0, R * R - dy * dy)) - 1, y = oy + dy;
          const x1 = lerp(x0, W + 12, bp);
          const g = ctx.createLinearGradient(x0, 0, W, 0);
          g.addColorStop(0, `rgba(215,20,60,${0.5 * bp})`); g.addColorStop(1, 'rgba(215,20,60,0)');
          ctx.strokeStyle = g; ctx.lineWidth = 1.1; ctx.setLineDash([]);
          ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
          ctx.lineWidth = 3.2; ctx.setLineDash([0.1, 22]); ctx.lineDashOffset = -(time * 44) % 22.1;
          ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
        }
        ctx.setLineDash([]);
      }
    }

    function step(now) {
      const t = now / 1000, dt = Math.min(0.05, t - last || 0.016);
      last = t; time = t;
      S.mx += (S.tx - S.mx) * 0.05; S.my += (S.ty - S.my) * 0.05;
      draw(dt);
    }

    build();
    if (reduce) draw(0); else {
      gsap.ticker.add(() => { if (visible) step(performance.now()); });
      window.addEventListener('pointermove', (e) => { S.tx = (e.clientX / window.innerWidth) * 2 - 1; S.ty = (e.clientY / window.innerHeight) * 2 - 1; }, { passive: true });
      onVisible(canvas, (v) => { visible = v; });
    }
    let rt = 0;
    window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { build(); if (reduce) draw(0); }, 120); });
    return { state: S };
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
    gsap.from($('.facts', sec), { y: 36, autoAlpha: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: $('.facts', sec), start: 'top 88%', once: true } });
    splitLines($('#mission'), 'top 84%');
    rise($$('.values li', sec), $('.values', sec), { stagger: 0.09 });
  }

  function initWhat() {
    const sec = $('#what'), venn = $('.venn', sec);
    if (reduce) return;
    reveals(sec);
    // two disciplines slide together into one shared core
    gsap.fromTo(venn, { '--gap': 1 }, { '--gap': 0, ease: 'none', scrollTrigger: { trigger: $('#duo'), start: 'top 78%', end: 'top 22%', scrub: 0.4 } });
    $$('.duo__col', sec).forEach((col, i) => {
      gsap.from($$(':scope > *', col), { x: i === 0 ? -28 : 28, autoAlpha: 0, duration: 0.95, ease: 'power3.out', stagger: 0.07, scrollTrigger: { trigger: col, start: 'top 82%', once: true } });
      rise($$('.deflist li', col), $('.deflist', col), { y: 18, stagger: 0.06 });
    });
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
    ScrollTrigger.create({ trigger: canvas, start: 'top 85%', once: true, onEnter: () => gsap.to(viz.state, { appear: 1, duration: 1.6, ease: 'power2.out' }) });
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

  function initValue() {
    const sec = $('#value');
    if (reduce) return;
    reveals(sec);
    $$('[data-bridge]', sec).forEach((fig) => {
      const tl = gsap.timeline({ scrollTrigger: { trigger: fig, start: 'top 78%', once: true } });
      tl.from(fig, { y: 40, autoAlpha: 0, duration: 1, ease: 'power3.out' })
        .from($$('.brow__k', fig), { autoAlpha: 0, x: -14, duration: 0.6, ease: 'power2.out', stagger: 0.07 }, 0.15)
        .from($$('.brow__track i', fig), { scaleX: 0, duration: 0.85, ease: 'expo.out', stagger: 0.11 }, 0.25);
    });
  }

  function initIndustries() {
    const sec = $('#industries'), panels = $$('.ind__panel', sec);
    const wide = () => window.matchMedia('(min-width: 1100px)').matches;
    const activate = (p) => {
      if (p.classList.contains('is-active')) return;
      panels.forEach((x) => { const on = x === p; x.classList.toggle('is-active', on); $('.ind__tab', x).setAttribute('aria-expanded', on ? 'true' : 'false'); });
      if (!reduce) gsap.from($$('.ind__intro > *, .ind__list li, .ind__k, .chips li', p), { y: 16, autoAlpha: 0, duration: 0.7, ease: 'power3.out', stagger: 0.026, delay: wide() ? 0.38 : 0.15, overwrite: true });
      setTimeout(() => ScrollTrigger.refresh(), 950);
    };
    panels.forEach((p) => {
      $('.ind__tab', p).addEventListener('click', () => activate(p));
      let timer = 0;
      p.addEventListener('pointerenter', (e) => {
        if (e.pointerType !== 'mouse' || !wide()) return;
        timer = setTimeout(() => activate(p), 140);
      });
      p.addEventListener('pointerleave', () => clearTimeout(timer));
    });
    if (reduce) return;
    reveals(sec);
    gsap.from(panels, {
      y: 60, autoAlpha: 0, duration: 1.1, ease: 'expo.out', stagger: 0.08,
      scrollTrigger: { trigger: $('#ind'), start: 'top 82%', once: true }
    });
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

  function initRoadmap() {
    const sec = $('#products');
    if (reduce) return;
    reveals(sec);
    // built in order: the foundation first, solutions on top, then the control layer over all of it
    const tl = gsap.timeline({ scrollTrigger: { trigger: $('#tiers'), start: 'top 70%', once: true }, defaults: { ease: 'power3.out' } });
    tl.from($$('.tier__k', sec), { autoAlpha: 0, x: -14, duration: 0.6, stagger: { each: 0.12, from: 'end' } }, 0)
      .from($$('.tier--foundation .pcard', sec), { y: 70, autoAlpha: 0, duration: 1, ease: 'expo.out', stagger: 0.12 }, 0)
      .from($$('.tier--solutions .pcard', sec), { y: -46, autoAlpha: 0, duration: 0.85, ease: 'back.out(1.3)', stagger: 0.08 }, 0.55)
      .from($$('.tier--control .pcard', sec), { scaleX: 0.6, autoAlpha: 0, transformOrigin: '50% 50%', duration: 0.9, ease: 'expo.out' }, 1.25);
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
  function boot() {
    const loader = $('#loader'), video = $('#loaderVideo');
    const signal = createSignal();
    const heroViz = createHeroViz($('#heroCanvas'), signal.pos);

    // sections are initialised top to bottom so pinned scenes measure correctly
    initAbout();
    initWhat();
    initShift();
    initGap();
    initBring();
    initValue();
    initIndustries();
    initWork();
    initRoadmap();
    initEngage();
    initDeliver();
    initWho();
    initContact();
    initFooter();
    initNav(signal);

    if (reduce) { if (loader) loader.remove(); return; }

    gsap.to(heroViz.state, { scroll: 1, ease: 'none', scrollTrigger: { trigger: '#top', start: 'top top', end: 'bottom top', scrub: true } });

    const intro = gsap.timeline({ paused: true, defaults: { ease: 'expo.out' } });
    intro
      .from('.nav__inner > *', { y: -22, autoAlpha: 0, duration: 0.9, stagger: 0.07 }, 0)
      .call(() => signal.start(), null, 0.1)
      .to(heroViz.state, { intro: 1, duration: 2.6, ease: 'power2.out' }, 0.15)
      .from('.hero__label', { autoAlpha: 0, y: 14, duration: 0.8 }, 0.25)
      .from('.hero__line-in', { yPercent: 114, duration: 1.3, stagger: 0.12 }, 0.3)
      .from('.hero__lede, .hero__cta > *', { autoAlpha: 0, y: 24, duration: 1, stagger: 0.08 }, 0.8)
      .from('.hero__meta > *', { autoAlpha: 0, y: 10, duration: 0.7, stagger: 0.05 }, 1.1);

    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    const hash = window.location.hash;
    window.scrollTo(0, 0);
    if (lenis) lenis.stop();

    let lifted = false;
    const lift = (quick) => {
      if (lifted) return; lifted = true;
      if (lenis) lenis.start();
      const out = gsap.timeline({ onComplete: () => loader.remove() });
      if (quick) out.to(loader, { autoAlpha: 0, duration: 0.35, ease: 'power1.out' });
      else out.to(loader, { clipPath: 'inset(0 0 100% 0)', duration: 1.05, ease: 'expo.inOut' });
      intro.delay(quick ? 0.05 : 0.45).restart(true);
      if (hash && hash.length > 1 && $(hash)) setTimeout(() => scrollToTarget($(hash), -56), quick ? 500 : 1300);
    };

    gsap.set(loader, { clipPath: 'inset(0 0 0% 0)' });

    // play the supplied sting from the first frame of the mark to the full wordmark
    const END = 3.45;
    let started = false;
    const watch = () => { if (lifted) return; if (video.currentTime >= END || video.ended) { video.pause(); lift(false); } else requestAnimationFrame(watch); };
    const begin = () => {
      if (started || lifted) return; started = true;
      try { video.currentTime = 0.3; } catch (e) { /* not seekable yet */ }
      video.playbackRate = 1.12;
      const p = video.play();
      if (p && p.catch) p.catch(() => lift(true));
      requestAnimationFrame(watch);
    };
    if (video.readyState >= 2) begin(); else video.addEventListener('loadeddata', begin, { once: true });
    video.addEventListener('error', () => lift(true), { once: true });
    // never hold the page hostage to the sting: slow networks and blocked autoplay skip it
    setTimeout(() => { if (!started) lift(true); }, 2600);
    setTimeout(() => lift(false), 6200);
  }

  boot();

  const refresh = () => ScrollTrigger.refresh();
  window.addEventListener('load', refresh);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);
})();
