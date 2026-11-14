/* ==========================================================================
   ntell.ai — the orb's satellites
   Four small worlds that orbit the signal orb in the hero, one per industry.
   Each is a real 3D model, built here from code and lit in WebGL (three.js),
   drawn on a transparent layer over the orb. An invisible sphere the size of
   the orb holds the depth buffer, so a satellite that passes behind the orb is
   hidden by it exactly as it would be.

   Turning the orb turns the system. The satellite at the front names the
   industry the hero is talking about (see createHeroCopy in main.js).

   This file is optional. Without WebGL it does nothing and the hero works as
   it did before. With reduced motion requested the satellites are drawn once,
   standing still, and redrawn only when an industry is picked.
   ========================================================================== */
import * as THREE from '../assets/vendor/three.module.min.js';

const TAU = Math.PI * 2;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (t) => { t = clamp(t); return t * t * (3 - 2 * t); };
const easeOut = (t) => 1 - Math.pow(1 - clamp(t), 3);
const easeIn = (t) => Math.pow(clamp(t), 3);
const easeBack = (t, c = 1.7) => { t = clamp(t); return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
const span = (t, a, b) => clamp((t - a) / (b - a));
const fract = (v) => v - Math.floor(v);
const wrapPi = (a) => { a = (a + Math.PI) % TAU; if (a < 0) a += TAU; return a - Math.PI; };

/* The palette is the logo's: paper white, ink, and the orb's crimson. */
const PAL = {
  white: 0xF8F4F5, bone: 0xE9E2E5, ink: 0x2A1A22, night: 0x17090C,
  crimson: 0xD7143C, deep: 0x9A0B2B, rose: 0xF0567A, blush: 0xF5B9C5, glow: 0xFF3D63
};

/* ---------------------------------------------------------------------
   Geometry. Everything is rounded a little, the way a moulded object is.
   --------------------------------------------------------------------- */

// A box with rounded edges and corners, centred on the origin.
function rbox(w, h, d, r = 0.04, n = 3) {
  r = Math.min(r, w / 2 - 1e-4, h / 2 - 1e-4, d / 2 - 1e-4);
  const hx = w / 2, hy = h / 2, hz = d / 2;
  const axis = (half) => {
    const a = [];
    for (let k = 0; k <= n; k++) a.push(-half + (r * k) / n);
    for (let k = 0; k <= n; k++) a.push(half - r + (r * k) / n);
    return a;
  };
  const ax = axis(hx), ay = axis(hy), az = axis(hz);
  const pos = [], nor = [], idx = [];
  const push = (x, y, z) => {
    const cx = clamp(x, -hx + r, hx - r), cy = clamp(y, -hy + r, hy - r), cz = clamp(z, -hz + r, hz - r);
    let nx = x - cx, ny = y - cy, nz = z - cz;
    const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    pos.push(cx + nx * r, cy + ny * r, cz + nz * r); nor.push(nx, ny, nz);
  };
  const face = (ua, va, at, flip) => {
    const base = pos.length / 3, nu = ua.length, nv = va.length;
    for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { const p = at(ua[i], va[j]); push(p[0], p[1], p[2]); }
    for (let j = 0; j < nv - 1; j++) for (let i = 0; i < nu - 1; i++) {
      const a = base + j * nu + i, b = a + 1, c = a + nu, e = c + 1;
      if (flip) idx.push(a, c, b, b, c, e); else idx.push(a, b, c, b, e, c);
    }
  };
  face(ax, ay, (u, v) => [u, v, hz], false);
  face(ax, ay, (u, v) => [u, v, -hz], true);
  face(az, ay, (u, v) => [hx, v, u], true);
  face(az, ay, (u, v) => [-hx, v, u], false);
  face(ax, az, (u, v) => [u, hy, v], true);
  face(ax, az, (u, v) => [u, -hy, v], false);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setIndex(idx);
  return g;
}

// A turned shape: a profile in (radius, height) swept round the vertical axis.
// The profile is drawn bottom to top with the outside on the right, from straight
// lines and arcs. Each piece carries its own normals, so a line meets an arc
// smoothly where they are tangent and crisply where they are not.
function lathe(draw, radial = 40) {
  const strips = [];
  const api = {
    line(r0, y0, r1, y1) {
      const dr = r1 - r0, dy = y1 - y0, l = Math.hypot(dr, dy) || 1;
      strips.push([[r0, y0, dy / l, -dr / l], [r1, y1, dy / l, -dr / l]]);
      return api;
    },
    // sign -1 turns the normals inward, for a hollow (a fillet) rather than a bulge
    arc(cr, cy, rad, a0, a1, n = 5, sign = 1) {
      const s = [];
      for (let k = 0; k <= n; k++) { const a = a0 + ((a1 - a0) * k) / n; s.push([cr + rad * Math.cos(a), cy + rad * Math.sin(a), sign * Math.cos(a), sign * Math.sin(a)]); }
      strips.push(s);
      return api;
    },
    // a free curve through points, with normals averaged along it
    curve(pts) {
      const s = pts.map((p, i) => {
        const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
        const dr = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dr, dy) || 1;
        return [p[0], p[1], dy / l, -dr / l];
      });
      strips.push(s);
      return api;
    }
  };
  draw(api);
  const pos = [], nor = [], idx = [];
  strips.forEach((s) => {
    const base = pos.length / 3, m = s.length;
    for (let j = 0; j <= radial; j++) {
      const ph = (j / radial) * TAU, c = Math.cos(ph), sn = Math.sin(ph);
      for (let k = 0; k < m; k++) { pos.push(s[k][0] * c, s[k][1], s[k][0] * sn); nor.push(s[k][2] * c, s[k][3], s[k][2] * sn); }
    }
    // wind every strip so its faces look the way its normals do
    const a0 = s[0], a1 = s[1];
    const out = (a1[1] - a0[1]) * a0[2] - (a1[0] - a0[0]) * a0[3] >= 0;
    for (let j = 0; j < radial; j++) for (let k = 0; k < m - 1; k++) {
      const a = base + j * m + k, b = a + 1, c = a + m, e = c + 1;
      if (out) idx.push(a, b, c, b, e, c); else idx.push(a, c, b, b, c, e);
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setIndex(idx);
  return g;
}

// A cylinder (or cone frustum) standing on y = 0, with eased top and bottom edges.
function rcyl(rTop, rBot, h, b = 0.02, radial = 36) {
  b = Math.min(b, h / 2 - 1e-4, rTop - 1e-4, rBot - 1e-4);
  return lathe((p) => p
    .line(0, 0, rBot - b, 0)
    .arc(rBot - b, b, b, -Math.PI / 2, 0, 4)
    .line(rBot, b, rTop, h - b)
    .arc(rTop - b, h - b, b, 0, Math.PI / 2, 4)
    .line(rTop - b, h, 0, h), radial);
}

// Smooth normals for an extruded shape: faces that meet at less than the crease
// angle share a normal, weighted by area, so a single bevel reads as a rounded edge
// while the large flat faces stay flat.
function soften(geo, creaseDeg = 55) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  const p = g.attributes.position, n = p.count;
  const fn = new Float32Array(n * 3), un = new Float32Array(n * 3);
  const map = new Map();
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), ab = new THREE.Vector3(), ac = new THREE.Vector3();
  for (let i = 0; i < n; i += 3) {
    a.fromBufferAttribute(p, i); b.fromBufferAttribute(p, i + 1); c.fromBufferAttribute(p, i + 2);
    ab.subVectors(b, a); ac.subVectors(c, a); ab.cross(ac);
    const l = ab.length() || 1;
    for (let k = 0; k < 3; k++) {
      const v = i + k;
      fn[v * 3] = ab.x; fn[v * 3 + 1] = ab.y; fn[v * 3 + 2] = ab.z;
      un[v * 3] = ab.x / l; un[v * 3 + 1] = ab.y / l; un[v * 3 + 2] = ab.z / l;
      const key = `${Math.round(p.getX(v) * 2e3)},${Math.round(p.getY(v) * 2e3)},${Math.round(p.getZ(v) * 2e3)}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(v);
    }
  }
  const cos = Math.cos((creaseDeg * Math.PI) / 180);
  const out = new Float32Array(n * 3);
  map.forEach((list) => {
    list.forEach((v) => {
      let x = 0, y = 0, z = 0;
      list.forEach((w) => {
        if (un[v * 3] * un[w * 3] + un[v * 3 + 1] * un[w * 3 + 1] + un[v * 3 + 2] * un[w * 3 + 2] >= cos) { x += fn[w * 3]; y += fn[w * 3 + 1]; z += fn[w * 3 + 2]; }
      });
      const l = Math.hypot(x, y, z) || 1;
      out[v * 3] = x / l; out[v * 3 + 1] = y / l; out[v * 3 + 2] = z / l;
    });
  });
  g.setAttribute('normal', new THREE.BufferAttribute(out, 3));
  return g;
}

// A flat outline given thickness, centred on its depth, with a softened edge.
function slab(points, depth, bevel = 0.02) {
  const shape = new THREE.Shape(points.map((q) => new THREE.Vector2(q[0], q[1])));
  const g = new THREE.ExtrudeGeometry(shape, { depth: depth - bevel * 2, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelOffset: -bevel, bevelSegments: 2, curveSegments: 8 });
  g.translate(0, 0, -(depth - bevel * 2) / 2);
  return soften(g);
}

/* ---------------------------------------------------------------------
   The kit: one set of materials and shared shapes for every satellite.
   --------------------------------------------------------------------- */
export function createKit() {
  const std = (color, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.6, metalness: 0 }, o));
  const mat = {
    white: std(PAL.white, { roughness: 0.56 }),
    bone: std(PAL.bone, { roughness: 0.42 }),
    ink: std(PAL.ink, { roughness: 0.4 }),
    blush: std(PAL.blush, { roughness: 0.5 }),
    crimson: new THREE.MeshPhysicalMaterial({ color: PAL.crimson, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.18 }),
    glow: new THREE.MeshBasicMaterial({ color: PAL.glow, toneMapped: false }),
    lamp: new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false })
  };
  const mesh = (geo, material, parent, x = 0, y = 0, z = 0) => {
    const m = new THREE.Mesh(geo, material);
    m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
    if (parent) parent.add(m);
    return m;
  };
  const group = (parent, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); if (parent) parent.add(g); return g; };
  const haze = (color, opacity = 1) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, toneMapped: false });
  const geo = {
    // the platform every satellite stands on: a white deck over a crimson keel
    deck: lathe((p) => p.line(0.905, 0.012, 0, 0.012), 72),
    rim: lathe((p) => p
      .line(0.84, -0.12, 0.955, -0.12)
      .arc(0.955, -0.075, 0.045, -Math.PI / 2, 0, 5)
      .line(1, -0.075, 1, -0.045)
      .arc(0.955, -0.045, 0.045, 0, Math.PI / 2, 5)
      .line(0.955, 0, 0.92, 0)
      .line(0.92, 0, 0.905, 0.012), 72),
    keel: lathe((p) => p.arc(0, 0.901, 1.361, -Math.PI / 2, -0.848, 14), 72),
    ping: new THREE.TorusGeometry(1.02, 0.014, 6, 96).rotateX(Math.PI / 2)
  };
  return { mat, mesh, group, haze, geo, gsap: window.gsap || null };
}

/* ---------------------------------------------------------------------
   The satellites. Each builder fills s.body, standing on y = 0 inside a
   deck of radius 1, and may set s.tick(t) for its loop and s.parts for the
   pieces that assemble when it comes to the front.
   --------------------------------------------------------------------- */

// Enterprise: a headquarters. Three towers, floors lighting in waves, a beacon sending.
function enterprise(s, kit) {
  const { mat, mesh, group } = kit;
  const col = new THREE.Color(), dummy = new THREE.Object3D();
  const sets = [];
  const tower = (x, z, w, h, d, material, cols, rows, off, on, ph) => {
    const g = group(s.body, x, 0, z);
    mesh(rbox(w, h, d, 0.05), material, g, 0, h / 2, 0);
    // windows on the two faces that show: front and right
    const ww = (w - 0.12) / cols * 0.72, wh = 0.075, n = cols * rows * 2;
    const inst = new THREE.InstancedMesh(rbox(ww, wh, 0.02, 0.008, 1), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), n);
    const meta = [];
    let k = 0;
    for (let f = 0; f < 2; f++) for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const u = (c - (cols - 1) / 2) * ((w - 0.12) / cols), y = 0.17 + r * ((h - 0.3) / Math.max(1, rows - 1));
      dummy.position.set(f ? w / 2 + 0.002 : u, y, f ? -u : d / 2 + 0.002);
      dummy.rotation.set(0, f ? Math.PI / 2 : 0, 0); dummy.updateMatrix();
      inst.setMatrixAt(k, dummy.matrix); meta.push({ r, c: c + f * cols }); k++;
    }
    inst.castShadow = false; g.add(inst);
    sets.push({ inst, meta, off: new THREE.Color(off), on: new THREE.Color(on), ph, rows });
    return g;
  };
  const A = tower(-0.1, -0.24, 0.5, 1.46, 0.5, mat.white, 3, 9, 0x3A2A33, 0xFF2E58, 0);
  const B = tower(0.45, 0.2, 0.42, 0.98, 0.42, mat.ink, 2, 6, 0x4B3944, 0xFFD3DC, 1.6);
  const C = tower(-0.45, 0.36, 0.44, 0.56, 0.44, mat.crimson, 2, 3, 0xA20D2D, 0xFFFFFF, 3.1);
  mesh(rbox(0.3, 0.1, 0.3, 0.03), mat.crimson, C, 0, 0.6, 0);
  mesh(rbox(0.2, 0.07, 0.16, 0.02), mat.bone, B, -0.04, 1.01, 0.04);
  mesh(rbox(0.36, 0.06, 0.36, 0.02), mat.bone, A, 0, 1.485, 0);
  // the mast, and the signal it sends
  mesh(new THREE.CylinderGeometry(0.013, 0.018, 0.34, 10), mat.ink, A, 0, 1.68, 0);
  const beacon = mesh(new THREE.SphereGeometry(0.058, 20, 14), s.glow, A, 0, 1.88, 0);
  beacon.castShadow = false;
  const rings = [0, 1, 2].map(() => {
    const m = mesh(new THREE.TorusGeometry(0.16, 0.012, 8, 48), s.haze(0), A, 0, 1.88, 0);
    m.rotation.x = Math.PI / 2; m.castShadow = m.receiveShadow = false;
    return m;
  });
  s.parts = [A, B, C];
  s.tick = (t) => {
    sets.forEach((w) => {
      for (let i = 0; i < w.meta.length; i++) {
        const m = w.meta[i];
        // light climbs each tower floor by floor, with a few windows that keep their own hours
        const wave = Math.sin(t * 1.25 - m.r * 0.62 + w.ph);
        const own = Math.sin(t * 0.7 + m.r * 2.3 + m.c * 4.1 + w.ph * 3);
        col.copy(w.off).lerp(w.on, smooth((Math.max(wave, own * 0.9) - 0.15) * 2.4));
        w.inst.setColorAt(i, col);
      }
      w.inst.instanceColor.needsUpdate = true;
    });
    rings.forEach((r, k) => {
      const u = fract(t * 0.42 + k / 3);
      r.scale.setScalar(0.35 + u * 2.5); r.material.opacity = Math.pow(1 - u, 1.6) * 0.85;
    });
    beacon.scale.setScalar(1 + 0.16 * Math.sin(t * 5.3));
  };
}

// Financial services: a bank. Columns and a pediment, with a coin that keeps arriving.
function finance(s, kit) {
  const { mat, mesh, group } = kit;
  s.body.scale.setScalar(0.92);
  const hall = group(s.body);
  mesh(rbox(1.56, 0.09, 1.16, 0.03), mat.white, hall, 0, 0.045, 0);
  mesh(rbox(1.4, 0.09, 1.0, 0.03), mat.bone, hall, 0, 0.135, 0);
  mesh(rbox(1.0, 0.6, 0.56, 0.03), mat.ink, hall, 0, 0.48, -0.08);
  mesh(rbox(0.19, 0.36, 0.03, 0.012), mat.crimson, hall, 0, 0.36, 0.205);
  const shaft = rcyl(0.058, 0.068, 0.52, 0.012, 20), cap = rbox(0.18, 0.04, 0.18, 0.012, 2);
  const cols = [];
  [[-0.5, 0.33], [-0.167, 0.33], [0.167, 0.33], [0.5, 0.33], [-0.5, -0.02], [0.5, -0.02], [-0.5, -0.37], [0.5, -0.37]].forEach((q) => {
    const g = group(hall, q[0], 0.18, q[1]);
    mesh(cap, mat.white, g, 0, 0.02, 0); mesh(shaft, mat.white, g, 0, 0.04, 0); mesh(cap, mat.white, g, 0, 0.58, 0);
    cols.push(g);
  });
  const roof = group(hall, 0, 0.78, -0.02);
  mesh(rbox(1.28, 0.1, 0.94, 0.025), mat.white, roof, 0, 0.05, 0);
  mesh(slab([[-0.68, 0], [0.68, 0], [0, 0.36]], 0.96, 0.02), mat.white, roof, 0, 0.1, 0);
  const seal = mesh(rcyl(0.085, 0.085, 0.03, 0.01, 28), mat.crimson, roof, 0, 0.215, 0.475);
  seal.rotation.x = Math.PI / 2;
  // the coin
  const coin = group(s.body, 0, 1.78, -0.02);
  const spin = group(coin);
  const disc = mesh(rcyl(0.25, 0.25, 0.07, 0.022, 44), mat.bone, spin, 0, 0, -0.035);
  disc.rotation.x = Math.PI / 2;
  [1, -1].forEach((side) => {
    const ring = mesh(new THREE.TorusGeometry(0.165, 0.018, 8, 44), mat.crimson, spin, 0, 0, side * 0.036);
    ring.castShadow = false;
    const dot = mesh(new THREE.SphereGeometry(0.075, 20, 12), mat.crimson, spin, 0, 0, side * 0.03);
    dot.scale.z = 0.3; dot.castShadow = false;
  });
  s.parts = [cols[0], cols[1], cols[2], cols[3], roof];
  s.tick = (t) => {
    // it hovers and turns, drops into the roof, the bank takes it with a small bump, and the next one arrives
    const u = fract(t / 5.2);
    const drop = easeIn(span(u, 0.62, 0.74)), back = easeBack(span(u, 0.84, 0.98), 2.2);
    const gone = u >= 0.74 && u < 0.84;
    coin.visible = !gone;
    coin.position.y = 1.78 + 0.04 * Math.sin(t * 2.1) - drop * 0.62;
    const k = u < 0.74 ? 1 - drop * 0.75 : back;
    coin.scale.setScalar(Math.max(0.001, k));
    spin.rotation.y = t * 2.4 + drop * 5;
    const bump = Math.sin(span(u, 0.73, 0.86) * Math.PI);
    hall.scale.set(1 + 0.035 * bump, 1 - 0.05 * bump, 1 + 0.035 * bump);
  };
}

// Government: a capitol. A colonnade, a dome, a flag in the wind, and services going out to people.
function government(s, kit) {
  const { mat, mesh, group } = kit;
  s.body.scale.setScalar(0.9);
  const b = group(s.body);
  mesh(rbox(1.62, 0.08, 1.08, 0.03), mat.bone, b, 0, 0.04, 0);
  mesh(rbox(0.56, 0.04, 0.2, 0.015), mat.white, b, 0, 0.02, 0.6);
  mesh(rbox(1.38, 0.36, 0.7, 0.03), mat.white, b, 0, 0.26, -0.1);
  mesh(rbox(0.15, 0.25, 0.03, 0.012), mat.ink, b, 0, 0.205, 0.252);
  [-0.48, -0.24, 0.24, 0.48].forEach((x) => mesh(rbox(0.085, 0.15, 0.03, 0.012), mat.ink, b, x, 0.27, 0.252));
  const shaft = rcyl(0.038, 0.044, 0.36, 0.008, 16);
  const cols = [-0.6, -0.36, -0.12, 0.12, 0.36, 0.6].map((x) => mesh(shaft, mat.white, b, x, 0.08, 0.4));
  const top = group(b, 0, 0.44, 0);
  mesh(rbox(1.54, 0.07, 1.02, 0.025), mat.white, top, 0, 0.035, 0);
  mesh(slab([[-0.34, 0], [0.34, 0], [0, 0.15]], 0.14, 0.015), mat.white, top, 0, 0.07, 0.42);
  mesh(rbox(0.66, 0.2, 0.6, 0.025), mat.white, top, 0, 0.17, -0.1);
  const crown = group(top, 0, 0.27, -0.1);
  mesh(rcyl(0.27, 0.27, 0.16, 0.012, 40), mat.white, crown);
  mesh(lathe((p) => p.line(0.274, 0.05, 0.274, 0.11), 40), mat.ink, crown).castShadow = false;
  mesh(lathe((p) => p.arc(0, 0.16, 0.27, 0, Math.PI / 2, 12), 44), mat.crimson, crown);
  mesh(rcyl(0.05, 0.055, 0.09, 0.01, 20), mat.white, crown, 0, 0.42, 0);
  mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.6, 8), mat.ink, crown, 0, 0.8, 0);
  mesh(new THREE.SphereGeometry(0.026, 12, 8), mat.ink, crown, 0, 1.1, 0);
  // the flag
  const FW = 0.4, FH = 0.24;
  const fg = new THREE.PlaneGeometry(FW, FH, 16, 5);
  fg.translate(FW / 2, 0, 0);
  const flag = mesh(fg, new THREE.MeshStandardMaterial({ color: PAL.blush, roughness: 0.6, side: THREE.DoubleSide }), crown, 0.011, 0.96, 0);
  const rest = fg.attributes.position.array.slice();
  // services going out: three small lights circling the dome
  const halo = mesh(new THREE.TorusGeometry(0.47, 0.007, 6, 72), s.haze(0.55), crown, 0, 0.2, 0);
  halo.rotation.x = Math.PI / 2 - 0.16; halo.castShadow = halo.receiveShadow = false;
  const pips = [0, 1, 2].map(() => { const m = mesh(new THREE.SphereGeometry(0.038, 14, 10), s.glow, halo); m.castShadow = false; return m; });
  s.parts = [cols[0], cols[1], cols[2], cols[3], cols[4], cols[5], top];
  s.tick = (t) => {
    const p = fg.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = rest[i * 3], y = rest[i * 3 + 1], k = x / FW;
      p.setZ(i, Math.sin(x * 15 - t * 6.2) * 0.05 * k + Math.sin(x * 7 - t * 3.7 + y * 6) * 0.025 * k);
      p.setY(i, y - 0.03 * k * k + Math.cos(x * 15 - t * 6.2) * 0.008 * k);
    }
    p.needsUpdate = true; fg.computeVertexNormals();
    pips.forEach((m, k) => { const a = t * 0.9 + (k * TAU) / 3; m.position.set(Math.cos(a) * 0.47, Math.sin(a) * 0.47, 0); });
  };
}

// FMCG and consumer: products on a shelf, read by a scanner as they stand there.
function consumer(s, kit) {
  const { mat, mesh, group } = kit;
  const items = [];
  const item = (x, z, mid, rot = 0) => { const g = group(s.body, x, 0, z); g.rotation.y = rot; items.push({ g, mid, x, z }); return g; };
  // a carton with a gable top
  const carton = item(-0.4, -0.2, 0.45, 0.42);
  mesh(rbox(0.46, 0.62, 0.36, 0.03), mat.crimson, carton, 0, 0.31, 0);
  mesh(rbox(0.468, 0.2, 0.368, 0.02), mat.white, carton, 0, 0.3, 0);
  const gable = mesh(slab([[-0.18, 0], [0.18, 0], [0.02, 0.17], [-0.02, 0.17]], 0.46, 0.015), mat.crimson, carton, 0, 0.615, 0);
  gable.rotation.y = Math.PI / 2;
  mesh(rbox(0.46, 0.075, 0.04, 0.012), mat.white, carton, 0, 0.815, 0);
  // a bottle
  const bottle = item(0.32, -0.24, 0.5);
  mesh(lathe((p) => p
    .line(0, 0, 0.15, 0)
    .arc(0.15, 0.03, 0.03, -Math.PI / 2, 0, 4)
    .line(0.18, 0.03, 0.18, 0.5)
    .curve([[0.18, 0.5], [0.178, 0.535], [0.168, 0.572], [0.148, 0.606], [0.12, 0.634], [0.094, 0.656], [0.076, 0.68], [0.068, 0.71]])
    .line(0.068, 0.71, 0.068, 0.8)
    .line(0.068, 0.8, 0, 0.8), 44), mat.white, bottle);
  mesh(lathe((p) => p.line(0.184, 0.14, 0.184, 0.4), 44), mat.blush, bottle).castShadow = false;
  mesh(rcyl(0.086, 0.086, 0.12, 0.018, 28), mat.crimson, bottle, 0, 0.77, 0);
  // a can
  const can = item(0.2, 0.44, 0.26);
  mesh(rcyl(0.17, 0.17, 0.46, 0.035, 40), mat.ink, can);
  mesh(lathe((p) => p.line(0.173, 0.15, 0.173, 0.31), 40), mat.blush, can).castShadow = false;
  mesh(rcyl(0.135, 0.135, 0.012, 0.004, 32), mat.bone, can, 0, 0.455, 0);
  // a tub
  const tub = item(-0.3, 0.46, 0.14);
  mesh(rcyl(0.17, 0.14, 0.2, 0.025, 36), mat.blush, tub);
  mesh(rcyl(0.18, 0.18, 0.055, 0.02, 36), mat.white, tub, 0, 0.19, 0);
  // the scanner: a ring of light that sweeps the shelf
  const scan = mesh(new THREE.TorusGeometry(0.97, 0.015, 8, 96), s.haze(0.9), s.body);
  scan.rotation.x = Math.PI / 2; scan.castShadow = scan.receiveShadow = false;
  const sheet = mesh(new THREE.CircleGeometry(0.96, 64), s.haze(0.06), s.body);
  sheet.rotation.x = -Math.PI / 2; sheet.material.side = THREE.DoubleSide; sheet.castShadow = sheet.receiveShadow = false;
  s.parts = items.map((it) => it.g);
  s.tick = (t) => {
    const y = 0.05 + 1.0 * (0.5 - 0.5 * Math.cos(t * 1.05));
    scan.position.y = y; sheet.position.y = y;
    scan.material.opacity = 0.55 + 0.4 * Math.sin(t * 1.05) ** 2;
    // each product lifts a little as the light passes it
    items.forEach((it) => { const d = (y - it.mid) / 0.2; it.g.position.y = 0.075 * Math.exp(-d * d); });
  };
}

const BUILDERS = { enterprise, finance, government, consumer };
const GLOW = new THREE.Color(PAL.glow), PALE = new THREE.Color(0xFFE4EA), TINT = new THREE.Color();
export const ORDER = ['enterprise', 'finance', 'government', 'consumer'];

export function buildSatellite(key, kit) {
  const root = new THREE.Group(), body = new THREE.Group();
  root.add(body);
  const s = { key, root, body, parts: [], tick: null, tl: null, t0: 0, lum: [] };
  // whatever glows on a satellite is crimson against the page and turns pale as it passes in front of the orb
  s.glow = new THREE.MeshBasicMaterial({ color: PAL.glow, toneMapped: false });
  s.lum.push(s.glow);
  s.haze = (opacity) => { const m = kit.haze(PAL.glow, opacity); s.lum.push(m); return m; };
  s.tint = (a) => { TINT.copy(GLOW).lerp(PALE, a); s.lum.forEach((m) => m.color.copy(TINT)); };
  kit.mesh(kit.geo.deck, kit.mat.white, root).castShadow = false;
  kit.mesh(kit.geo.rim, kit.mat.crimson, root);
  kit.mesh(kit.geo.keel, kit.mat.crimson, root);
  const ping = kit.mesh(kit.geo.ping, s.haze(0), root, 0, -0.04, 0);
  ping.castShadow = ping.receiveShadow = false;
  body.position.y = 0.012;
  BUILDERS[key](s, kit);
  // coming to the front: the pieces rise out of the deck one after another
  s.play = () => {
    if (!kit.gsap || !s.parts.length) return;
    if (s.tl) s.tl.kill();
    s.tl = kit.gsap.timeline();
    s.tl.fromTo(ping.scale, { x: 1, z: 1 }, { x: 1.75, z: 1.75, duration: 1.1, ease: 'expo.out' }, 0)
      .fromTo(ping.material, { opacity: 0.9 }, { opacity: 0, duration: 1.1, ease: 'power2.out' }, 0);
    s.parts.forEach((p, i) => {
      s.tl.fromTo(p.scale, { x: 0.82, y: 0.3, z: 0.82 }, { x: 1, y: 1, z: 1, duration: 0.85, ease: 'back.out(2.2)' }, i * 0.06);
    });
  };
  return s;
}

/* ---------------------------------------------------------------------
   The studio: renderer, light and reflections, shared by the hero and by
   any page that wants to show the models on their own.
   --------------------------------------------------------------------- */
export function createStudio(canvas, opts = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();

  // a small bright room to reflect: soft white all round, one broad lamp up and to the left
  const room = new THREE.Scene();
  const wall = new THREE.Mesh(new THREE.BoxGeometry(20, 20, 20), new THREE.MeshBasicMaterial({ color: 0x77706F, side: THREE.BackSide }));
  room.add(wall);
  const panel = (color, k, x, y, z, w, h) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k), side: THREE.DoubleSide }));
    m.position.set(x, y, z); m.lookAt(0, 0, 0); room.add(m);
  };
  panel(0xffffff, 7, -6, 8, 6, 9, 9);
  panel(0xffffff, 1.6, 8, 3, 3, 5, 8);
  panel(0xFFB3C3, 1.2, 0, -9, 0, 12, 12);
  panel(0xffffff, 1.2, 0, 4, -9, 14, 5);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(room, 0.035).texture;
  scene.environmentIntensity = opts.env ?? 0.3;
  pmrem.dispose();

  const hemi = new THREE.HemisphereLight(0xffffff, 0xEFA9B8, 0.62);
  const key = new THREE.DirectionalLight(0xFFF8F4, 3.0);
  key.position.set(-3.6, 7.2, 5.2);
  key.castShadow = true;
  const sm = opts.shadowSize || 2048, ext = opts.shadowExtent || 2.7;
  key.shadow.mapSize.set(sm, sm);
  Object.assign(key.shadow.camera, { left: -ext, right: ext, top: ext, bottom: -ext, near: 1, far: 22 });
  key.shadow.bias = -0.0004; key.shadow.normalBias = 0.012; key.shadow.radius = opts.shadowRadius || 3.5;
  const fill = new THREE.DirectionalLight(0xFFE3EA, 0.7);
  fill.position.set(6, 2.5, 4);
  const rim = new THREE.DirectionalLight(0xffffff, 0.6);
  rim.position.set(3, 5, -6);
  scene.add(hemi, key, key.target, fill, rim);
  return { THREE, renderer, scene, lights: { hemi, key, fill, rim } };
}

/* ---------------------------------------------------------------------
   The hero system: the satellites on one orbit round the signal orb.

   Three things can be turned, each from its own place. A drag that starts
   on the orb turns the orb alone (main.js). A drag that starts in the orbit
   round it, on a satellite at the side or in the space between them, turns
   the orbit: sideways brings the next satellite to the front, up and down
   tips the plane of the orbit, far enough to look at the satellites from
   above or from underneath but never over the top. A sideways swipe on a
   trackpad turns it too. And a drag that starts on the satellite at the
   front turns that one model on its own disc, a little to either side; at
   the end of that travel the drag carries on into turning the orbit.

   The orbit is seen from only just above its own plane, so each model is
   met from the front, and the one at the front faces straight out.
   --------------------------------------------------------------------- */
const N = ORDER.length, STEP = TAU / N;
const CAM_D = 11;                 // camera distance, in orb radii
const CAM_EL = (10 * Math.PI) / 180;  // how far above the orbit's plane the camera sits: only just, for a front view
const PLANE_Y = -0.04;            // the orbit runs round the orb at its equator
const ECC = 0.35;                 // the orbit swings a little wider behind the orb
const ORB_VIS = 0.9925;           // the drawn orb's radius as a share of its element's half-size
const POSE = { enterprise: 2.2, finance: 1.4, government: 1.1, consumer: 2.3 };  // each loop's best moment, for the still version
const SPAN_W = 2.42, SPAN_H = 1.84; // the layer's size, in orb diameters
const TIP_MIN = -0.6, TIP_MAX = 0.45; // how far the orbit's plane can be tipped: back to see it from below, forward to look down on it
const SPIN_MAX = 0.8;             // how far the model at the front can be turned on its disc, to either side
const TAKE = 0.56;                // how far towards the front a satellite must come before the hero changes over to it

async function initHero(ntell) {
  const stage = document.getElementById('heroStage');
  const gsap = window.gsap;
  if (!stage || !gsap || !ntell) return;
  const signal = ntell.signal, hero = ntell.hero, flow = ntell.flow;
  const still = !!ntell.reduce;
  // No WebGL 2, no satellites. A throwaway canvas is asked first, so nothing is logged when the answer is no.
  // A browser that would draw them in software (no graphics hardware) also goes without, unless they are only
  // drawn once: moving, they would cost the whole page its smoothness. window.NTELL_3D = true overrides that,
  // for testing.
  const forced = window.NTELL_3D === true;
  try {
    const gl = document.createElement('canvas').getContext('webgl2', { failIfMajorPerformanceCaveat: !forced && !still });
    if (!gl) return;
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    const name = String((info && gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) || gl.getParameter(gl.RENDERER) || '');
    const lose = gl.getExtension('WEBGL_lose_context');
    if (lose) lose.loseContext();
    if (!forced && !still && /swiftshader|llvmpipe|softpipe|software|basic render/i.test(name)) return;
  } catch (err) { return; }

  // Everything heavy is done a piece at a time, a frame apart, while the opening animation still covers
  // the page: the studio, each model, the shaders, and one unseen frame that sends it all to the graphics
  // card. By the time the hero is shown there is nothing left to wait for, so nothing can make it stutter.
  // The page says when that can start without being seen as a stutter (ntell.calm, in main.js): at once
  // under the opening video, otherwise when the hero's own entrance has finished.
  const nextFrame = () => new Promise((done) => requestAnimationFrame(() => done()));
  if (!still && ntell.calm) await ntell.calm;
  await nextFrame();
  const canvas = document.createElement('canvas');
  let studio;
  try { studio = createStudio(canvas, { shadowSize: window.innerWidth < 860 ? 1024 : 2048 }); } catch (err) { return; }
  const { renderer, scene } = studio;
  const kit = createKit();
  await nextFrame();

  const camera = new THREE.PerspectiveCamera(17, SPAN_W / SPAN_H, 1, 40);
  camera.position.set(0, Math.sin(CAM_EL) * CAM_D, Math.cos(CAM_EL) * CAM_D);
  camera.lookAt(0, 0, 0);
  const toCamera = camera.position.clone().normalize();

  // the orb itself is drawn on its own canvas underneath. Here it only holds depth, and catches shadows.
  const occluder = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 40), new THREE.MeshBasicMaterial({ colorWrite: false }));
  occluder.renderOrder = -2;
  const catcher = new THREE.Mesh(new THREE.SphereGeometry(1.004, 64, 40), new THREE.ShadowMaterial({ color: 0x4A0414, opacity: 0.34 }));
  catcher.receiveShadow = true; catcher.renderOrder = -1;
  scene.add(occluder, catcher);
  // the orb's own light on whatever passes close to it
  scene.add(new THREE.PointLight(0xFF2F5C, 2.2, 3.4, 1.6));

  const sats = [];
  for (let i = 0; i < N; i++) {
    const s = buildSatellite(ORDER[i], kit);
    s.t0 = -i * 1.7; scene.add(s.root); sats.push(s);
    await nextFrame();
  }

  // the orbit: a hairline, with two small signals travelling along it
  const rig = new THREE.Group();
  scene.add(rig);
  let ringMesh = null;
  const beads = [0, 1].map(() => { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), kit.mat.glow); rig.add(m); return m; });

  const wrap = document.createElement('div');
  wrap.className = still ? 'sats sats--still' : 'sats'; wrap.setAttribute('aria-hidden', 'true');
  wrap.appendChild(canvas);
  // moving, the layer follows the travelling orb; still, it sits in the stage over the static one
  if (still) stage.appendChild(wrap); else document.getElementById('signal').after(wrap);
  // two places to take hold: the orbit (everything round the orb), and over it the orb itself
  if (!still) {
    const zone = document.createElement('span'), core = document.createElement('span');
    zone.className = 'hero__orbit'; core.className = 'hero__core';
    stage.prepend(zone, core);
  }

  // hit areas: real buttons, so each satellite can be reached by pointer, touch or keyboard
  const names = hero ? hero.items.map((it) => it.name) : ORDER;
  const hits = ORDER.map((key, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'sat-hit'; b.dataset.sat = key;
    b.setAttribute('aria-label', `Show ${names[i]}`);
    b.addEventListener('click', () => goTo(i));
    b.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') S.hover = i; });
    b.addEventListener('pointerleave', () => { if (S.hover === i) S.hover = -1; });
    b.addEventListener('focus', () => { S.focus = i; });
    b.addEventListener('blur', () => { if (S.focus === i) S.focus = -1; });
    stage.appendChild(b);
    return b;
  });
  const tip = document.createElement('span');
  tip.className = 'sat-tip cap'; tip.setAttribute('aria-hidden', 'true');
  stage.appendChild(tip);

  const S = {
    yaw: 0, vel: 0, target: 0,        // the orbit's turn, its speed, and where it is coming to rest
    slot: 0, index: 0,                // the satellite the hero is showing: counted round and round, and as its place in ORDER
    tip: 0, chain: 0,                 // how far the plane is tipped, and the speed of any scroll a drag has handed on
    dragging: false, wheeling: false, touch: false, touched: false,
    hover: -1, focus: -1,
    deploy: 0, spinIn: 0, nudge: 0, launched: false, warm: false,
    local: false, held: 0,            // this drag began on the satellite at the front, and which one that was
    ring: 1.62, ecc: ECC, size: 0.31, s0: 1, W: 1, H: 1, shown: false, t: 0, last: 0, lastSurge: 0
  };
  // Quality steps down if frames run long: full, then standard pixel density, then no shadows, then off.
  const G = { level: 0, ema: 16, n: 0, last: 0, off: false };
  function easeOff() {
    G.level++; G.n = 0; G.ema = 16;
    if (G.level === 1) { renderer.setPixelRatio(1); renderer.setSize(S.W, S.H, false); }
    else if (G.level === 2) { studio.lights.key.castShadow = false; catcher.visible = false; }
    else { G.off = true; wrap.style.visibility = 'hidden'; stage.classList.remove('has-sats'); document.documentElement.classList.remove('sats-on'); }
  }
  const screen = sats.map(() => ({ x: 0, y: 0, r: 0, on: false, d: 0, cur: null }));
  const hov = sats.map(() => 0);
  const spins = sats.map(() => 0);   // each model's own turn on its disc
  const mod = (i) => ((i % N) + N) % N;
  // a circle across the front and at the sides, drawn out to a point of an egg behind the orb
  const radius = (th) => S.ring * (1 + S.ecc * Math.pow(Math.max(0, -Math.cos(th)), 1.5));

  function build() {
    const r = stage.getBoundingClientRect();
    S.s0 = Math.max(40, r.width);
    S.W = Math.round(S.s0 * SPAN_W); S.H = Math.round(S.s0 * SPAN_H);
    const dpr = G.level ? 1 : Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(dpr); renderer.setSize(S.W, S.H, false);
    wrap.style.width = `${S.W}px`; wrap.style.height = `${S.H}px`;
    wrap.style.margin = `${-S.H / 2}px 0 0 ${-S.W / 2}px`;
    // the invisible sphere must cover the drawn orb exactly, so the field of view is set from its silhouette
    const rho = ((still ? 1 : ORB_VIS) * S.s0) / S.H;
    camera.fov = (2 * Math.atan(Math.tan(Math.asin(1 / CAM_D)) / rho) * 180) / Math.PI;
    camera.aspect = S.W / S.H; camera.updateProjectionMatrix();
    // the orbit is as wide as the page allows on the narrower side of the orb
    // (where the text sits beside the orb, that side ends at the text)
    const cx = r.left + r.width / 2, half = S.s0 / 2;
    const lede = document.getElementById('heroLedes'), lr = lede ? lede.getBoundingClientRect() : null;
    const beside = lr && lr.left < r.left && lr.bottom > r.top && lr.top < r.bottom && window.innerWidth > 860;
    let edge = 0;
    document.querySelectorAll('.hero__word, .hero__lede').forEach((w) => { edge = Math.max(edge, w.getBoundingClientRect().right); });
    const room = Math.min(beside ? cx - edge - 14 : cx, window.innerWidth - cx) / half;
    const compact = window.innerWidth < 860;
    S.size = compact ? 0.37 : 0.36;
    S.ring = clamp((room - S.size * 1.25) / 1.07, 1.36, compact ? 1.56 : 1.66);
    if (ringMesh) { rig.remove(ringMesh); ringMesh.geometry.dispose(); ringMesh.material.dispose(); }
    const px = 1 / half, pts = [];
    for (let j = 0; j < 96; j++) { const a = (j / 96) * TAU, rr = radius(a); pts.push(new THREE.Vector3(Math.sin(a) * rr, 0, Math.cos(a) * rr)); }
    ringMesh = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 240, 0.62 * px, 6, true), kit.haze(PAL.ink, 0.2));
    ringMesh.position.y = PLANE_Y;
    rig.add(ringMesh);
    beads.forEach((b) => b.scale.setScalar(2.4 * px));
  }

  // The hero shows one satellite at a time. Which one is kept as a count that runs on round the orbit,
  // so going forwards from the last to the first is one step, not all the way back.
  function setSlot(slot, dir) {
    S.slot = slot;
    const i = mod(slot);
    if (i === S.index) return;
    S.index = i;
    sats[i].t0 = S.t;
    if (!still) sats[i].play();
    if (hero) hero.show(i, dir);
    if (flow && !still && S.t - S.lastSurge > 0.5) { flow.surge(); S.lastSurge = S.t; }
  }
  // while a hand is turning it: change over once the next satellite is most of the way to the front
  function follow() {
    let p = -S.yaw / STEP - S.slot, guard = 0;
    while (p > TAKE && guard++ < N) { setSlot(S.slot + 1, 1); p -= 1; }
    while (p < -TAKE && guard++ < N) { setSlot(S.slot - 1, -1); p += 1; }
  }
  // when the hand lets go: choose the satellite to come to rest on (lead is how far its speed would carry it)
  function settle(lead) {
    const slot = Math.round(-S.yaw / STEP - lead);
    setSlot(slot, slot >= S.slot ? 1 : -1);
    S.target = -slot * STEP;
  }
  // turn to a satellite by the shorter way round
  function goTo(i) {
    let d = mod(i) - mod(S.slot);
    if (d > N / 2) d -= N; if (d < -N / 2) d += N;
    if (!d) return;
    S.dragging = false; S.touched = true;
    setSlot(S.slot + d, d > 0 ? 1 : -1);
    S.target = -S.slot * STEP;
    if (still) frame();
  }
  const step = (d) => goTo(S.index + d);

  let dragAt = 0;
  signal.on('dragstart', (type, target) => {
    S.dragging = true; S.touched = true; S.touch = type !== 'mouse';
    S.local = !!(target && target.closest && target.closest('.sat-hit') === hits[S.index]);
    S.held = S.index;
    S.vel = 0; S.chain = 0; dragAt = performance.now();
  });
  signal.on('drag', (dx, dy) => {
    const r = Math.max(40, signal.pos.r);
    const now = performance.now(), dt = clamp((now - dragAt) / 1000, 0.004, 0.1);
    dragAt = now;
    // On the satellite at the front, sideways turns that model on its disc. At the end of its travel, and
    // everywhere else in the orbit, sideways turns the orbit.
    let side = dx;
    if (S.local && S.index !== S.held) S.local = false;   // once the orbit has moved on, the drag is the orbit's
    if (S.local) {
      const per = Math.max(60, r * 0.5), want = spins[S.index] + dx / per;
      spins[S.index] = clamp(want, -SPIN_MAX, SPIN_MAX);
      side = (want - spins[S.index]) * per;
    }
    const d = side / (r * 0.92);
    S.yaw += d; S.vel = lerp(S.vel, d / dt, 0.4);
    follow();
    // up and down tips it; a drag that is mostly sideways hardly tips it at all
    const reach = r * (S.touch ? 1.25 : 1.7);
    const share = smooth((Math.abs(dy) / (Math.abs(dx) + Math.abs(dy) + 1e-3)) * 1.8);
    const want = S.tip + (dy * share) / reach;
    S.tip = clamp(want, TIP_MIN, TIP_MAX);
    // at the end of its travel a finger's drag carries on into the page, the way one scroller hands on to the next
    if (S.touch && want !== S.tip) {
      const px = -(want - S.tip) * reach;
      window.scrollBy(0, px);
      S.chain = lerp(S.chain, px / dt, 0.5);
    } else S.chain = 0;
  });
  signal.on('release', () => {
    if (!S.dragging) return;
    S.dragging = false;
    if (performance.now() - dragAt > 120) { S.vel = 0; S.chain = 0; }
    // a flick can carry it over the next boundary, but never past a satellite it has not reached
    settle(clamp((S.vel * 0.22) / STEP, -0.49, 0.49));
    S.vel = clamp(S.vel, -7, 7);
    // and a scroll that was handed on keeps a little of its speed
    if (Math.abs(S.chain) > 320) {
      const y = window.scrollY + clamp(S.chain * 0.3, -900, 900);
      if (ntell.lenis) ntell.lenis.scrollTo(y, { duration: 0.9 }); else window.scrollTo({ top: y, behavior: 'smooth' });
    }
    S.chain = 0;
  });
  // a tap that lands on a satellite brings it round; anything else is the orb's
  signal.on('tap', (x, y) => {
    let best = -1, bd = 1e9;
    screen.forEach((p, i) => { if (!p.on) return; const d = Math.hypot(x - p.x, y - p.y); if (d < p.r * 1.15 && d < bd) { bd = d; best = i; } });
    if (best < 0) return false;
    if (best === S.index) sats[best].play(); else goTo(best);
    return true;
  });
  stage.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { step(1); e.preventDefault(); }
    else if (e.key === 'ArrowLeft') { step(-1); e.preventDefault(); }
  });
  // a sideways swipe on a trackpad (or shift and the wheel) turns the orbit; up and down still scrolls the page
  let wheelT = 0;
  stage.addEventListener('wheel', (e) => {
    if (still || !S.launched || G.off || signal.state.stageU > 0.3) return;
    const dx = e.deltaX * (e.deltaMode === 1 ? 16 : 1);
    if (Math.abs(dx) < 0.5 || Math.abs(dx) < Math.abs(e.deltaY) * 1.3) return;
    e.preventDefault(); e.stopPropagation();
    S.wheeling = true; S.touched = true; S.vel = 0;
    S.yaw -= clamp(dx, -90, 90) / Math.max(40, signal.pos.r * 1.7);
    follow();
    clearTimeout(wheelT);
    wheelT = setTimeout(() => { S.wheeling = false; settle(0); }, 140);
  }, { passive: false });

  const v = new THREE.Vector3(), up = new THREE.Vector3(), e = new THREE.Euler(), qRig = new THREE.Quaternion(), q = new THREE.Quaternion();
  const fixed = { x: 0, y: 0, r: 1, home: 1, live: true };
  function frame() {
    let pos = signal.pos;
    if (still || S.warm) { const r = stage.getBoundingClientRect(); fixed.x = r.left + r.width / 2; fixed.y = r.top + r.height / 2; fixed.r = r.width / 2; pos = fixed; }
    if (still) { S.yaw = S.target; S.vel = 0; }
    if (!pos.live || !(S.launched || S.warm) || G.off) return;
    const now = still ? 0 : performance.now() / 1000, dt = Math.min(0.05, now - S.last || 0.016);
    S.last = now; S.t = now;
    // the satellites belong to the hero: they draw back into the orb as it rolls away
    const home = smooth((pos.home - 0.42) / 0.5);
    if (!S.warm) {
      if (home <= 0.002) {
        if (S.shown) { wrap.style.visibility = 'hidden'; S.shown = false; G.last = 0; stage.classList.remove('has-sats'); }
        if (!S.dragging) S.tip = 0;   // and the orbit is level again when they come back
        return;
      }
      if (!S.shown) { S.shown = true; wrap.style.visibility = 'visible'; stage.classList.add('has-sats'); }
      if (!still && !forced) {
        const real = performance.now(), gap = real - G.last;
        G.last = real;
        if (gap < 250) { G.ema += (gap - G.ema) * 0.05; G.n++; }
        if (G.n > 100 && G.ema > 36) { easeOff(); if (G.off) return; }
      }
      // turning: free while a hand is on it, then a spring to the chosen satellite
      if (S.dragging) S.vel *= 0.86;
      else if (!S.wheeling) {
        S.vel += ((S.target - S.yaw) * 46 - S.vel * 10.5) * dt;
        S.yaw += S.vel * dt;
      }
    }

    const t = now;
    const yaw = S.yaw + S.nudge + Math.sin(t * 0.45) * 0.012 - (1 - easeOut(S.spinIn)) * TAU * 0.86;
    qRig.setFromEuler(e.set(S.tip, 0, -0.085));
    rig.quaternion.copy(qRig);
    up.set(0, 1, 0).applyQuaternion(qRig);
    const k = (2 * pos.r) / S.s0;
    if (!S.warm) {
      if (!still) wrap.style.transform = `translate3d(${pos.x.toFixed(2)}px,${pos.y.toFixed(2)}px,0) scale(${k.toFixed(4)})`;
      wrap.style.opacity = home.toFixed(3);
    }
    const sr = stage.getBoundingClientRect();
    const away = signal.state.stageU > 0.3;
    let tipOn = -1;

    for (let i = 0; i < N; i++) {
      const s = sats[i];
      const th = yaw + i * STEP;
      const dep = clamp(S.deploy * 1.5 - i * 0.1) * home;
      const front = smooth(1 - Math.abs(wrapPi(th)) / STEP);
      hov[i] += (((S.hover === i || S.focus === i) ? 1 : 0) - hov[i]) * (1 - Math.exp(-dt * 10));
      const rr = radius(th) * lerp(0.3, 1, easeBack(dep, 1.2));
      // its place on the orbit: tip the plane and everything on it tips too
      v.set(Math.sin(th) * rr, PLANE_Y + 0.03 * Math.sin(t * 0.9 + i * 1.9) + 0.04 * front, Math.cos(th) * rr).applyQuaternion(qRig);
      s.root.position.copy(v);
      s.root.scale.setScalar(Math.max(0.0001, S.size * (0.84 + 0.36 * front) * smooth(dep) * (1 + 0.08 * hov[i])));
      // Each model looks outward from the orb, so the one at the front faces straight out of the page. A model
      // turned on its disc keeps that turn while it is at the front, and comes back square as it moves away.
      if (i !== S.index && !S.warm) spins[i] *= Math.exp(-dt * 5);
      s.root.quaternion.copy(qRig).multiply(q.setFromEuler(e.set(0.05 * front, th + spins[i], 0.04 * Math.sin(t * 0.7 + i * 2.1) * (1 - front))));
      if (s.tick) s.tick(still ? POSE[s.key] : t - s.t0);
      s.tint(front);

      // where it is on the page, for its hit area
      const sc = screen[i], rad = s.root.scale.x;
      v.addScaledVector(up, rad * 0.45);
      const near = v.dot(toCamera) > 0;
      v.project(camera);
      sc.x = pos.x + v.x * (S.W / 2) * k; sc.y = pos.y - v.y * (S.H / 2) * k;
      sc.r = rad * (S.s0 / 2) * k * 1.15;
      const inside = Math.hypot(sc.x - pos.x, sc.y - pos.y) < pos.r * 0.94;
      sc.on = !away && !S.warm && dep > 0.9 && (near || !inside);
      const b = hits[i], d = Math.round(Math.max(44, sc.r * 2));
      b.style.transform = `translate3d(${(sc.x - sr.left - d / 2).toFixed(1)}px,${(sc.y - sr.top - d / 2).toFixed(1)}px,0)`;
      if (d !== sc.d) { sc.d = d; b.style.width = b.style.height = `${d}px`; }
      b.classList.toggle('is-off', !sc.on);
      if (sc.cur !== (i === S.index)) { sc.cur = i === S.index; b.setAttribute('aria-pressed', sc.cur ? 'true' : 'false'); }
      if (sc.on && hov[i] > 0.3 && i !== S.index) tipOn = i;
    }
    if (tipOn >= 0) {
      const sc = screen[tipOn];
      if (tip.textContent !== names[tipOn]) tip.textContent = names[tipOn];
      tip.style.transform = `translate3d(${(sc.x - sr.left).toFixed(1)}px,${(sc.y - sr.top + sc.r + 12).toFixed(1)}px,0) translateX(-50%)`;
    }
    tip.classList.toggle('is-on', tipOn >= 0);

    beads.forEach((b, j) => { const a = t * 0.22 + j * Math.PI + yaw, rr = radius(a); b.position.set(Math.sin(a) * rr, PLANE_Y, Math.cos(a) * rr); b.visible = S.deploy > 0.9; });
    ringMesh.material.opacity = 0.2 * smooth(S.deploy * 1.4 - 0.4);
    renderer.render(scene, camera);
  }

  function launch() {
    if (S.launched) return;
    S.launched = true;
    gsap.to(S, { deploy: 1, duration: 2.1, ease: 'power2.out', delay: 0.35 });
    gsap.to(S, { spinIn: 1, duration: 2.9, ease: 'none', delay: 0.35 });
    gsap.delayedCall(1.9, () => { sats[S.index].t0 = S.t; sats[S.index].play(); });
    // if nobody has turned it yet, it leans a little towards the next satellite and back, once: an invitation
    gsap.delayedCall(6.5, () => {
      if (S.touched || S.dragging || signal.state.stageU > 0.05) return;
      gsap.timeline()
        .to(S, { nudge: -0.2, duration: 0.9, ease: 'sine.inOut' })
        .to(S, { nudge: 0, duration: 1.2, ease: 'sine.inOut' });
    });
  }

  build();
  let rt = 0;
  const rebuild = () => { clearTimeout(rt); rt = setTimeout(() => { build(); if (still) frame(); }, 120); };
  window.addEventListener('resize', rebuild);
  // the orbit is fitted to the headline beside it, and the headline is only its true width once its font is in
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(rebuild);
  window.addEventListener('load', rebuild);
  if (hero) hero.onPick((i) => goTo(i));
  ntell.satellites = { goTo, step, state: S, sats, spins };
  document.documentElement.classList.add('sats-on');
  if (still) {
    S.launched = true; S.deploy = 1; S.spinIn = 1; S.touched = true;
    frame();
    window.addEventListener('load', frame);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(frame);
    return;
  }
  const hint = document.getElementById('heroHint');
  if (hint) hint.textContent = 'Drag the orbit to turn it';
  // warm up: shaders first (off the main thread where the browser can), then one frame nobody sees
  try { if (renderer.compileAsync) await renderer.compileAsync(scene, camera); else renderer.compile(scene, camera); } catch (err) { /* it will compile on first use instead */ }
  await nextFrame();
  S.warm = true; S.deploy = 1; S.spinIn = 1;
  frame();
  S.warm = false; S.deploy = 0; S.spinIn = 0;
  await nextFrame();
  gsap.ticker.add(frame);
  if (signal.started) launch(); else signal.on('start', launch);
}

if (typeof window !== 'undefined' && window.ntell && document.getElementById('heroStage')) {
  initHero(window.ntell).catch(() => { /* the hero works without its satellites */ });
}
