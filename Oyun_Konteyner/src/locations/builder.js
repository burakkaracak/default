// Low-poly yapı taşları: malzeme önbelleği, renge göre birleştirilen statik geometri, mobilya modelleri.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const matCache = new Map();
export function mat(color, opt = {}) {
  const key = color + (opt.glass ? 'g' : '') + (opt.emissive ? 'e' : '') + (opt.opacity ?? '');
  let m = matCache.get(key);
  if (!m) {
    if (opt.glass) m = new THREE.MeshLambertMaterial({ color, transparent: true, opacity: opt.opacity ?? 0.28, depthWrite: false });
    else if (opt.emissive) m = new THREE.MeshBasicMaterial({ color });
    else if (opt.opacity != null) m = new THREE.MeshLambertMaterial({ color, transparent: true, opacity: opt.opacity, depthWrite: false });
    else m = new THREE.MeshLambertMaterial({ color });
    matCache.set(key, m);
  }
  return m;
}

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(1, 1, 1), _p = new THREE.Vector3();
const BOX = new THREE.BoxGeometry(1, 1, 1);
const cylCache = new Map();
function cylGeo(rt, rb, seg) { const k = rt + ':' + rb + ':' + seg; let g = cylCache.get(k); if (!g) { g = new THREE.CylinderGeometry(rt, rb, 1, seg); cylCache.set(k, g); } return g; }
const sphCache = new Map();
function sphGeo(seg) { let g = sphCache.get(seg); if (!g) { g = new THREE.SphereGeometry(1, seg, Math.max(4, seg - 2)); sphCache.set(seg, g); } return g; }

// Parça listesi: modeller önce burada (orijinde) kurulur, sonra gruba ya da toplu geometriye eklenir.
export class Parts {
  constructor() { this.items = []; }
  _push(geo, color, x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0, opt) {
    _e.set(rx, ry, rz); _q.setFromEuler(_e); _p.set(x, y, z); _s.set(sx, sy, sz);
    _m.compose(_p, _q, _s);
    this.items.push({ geo: geo.clone().applyMatrix4(_m), color, opt });
    return this;
  }
  // y = alt yüzey
  box(w, h, d, color, x = 0, y = 0, z = 0, ry = 0, opt) { return this._push(BOX, color, x, y + h / 2, z, w, h, d, 0, ry, 0, opt); }
  boxR(w, h, d, color, x, y, z, rx, ry, rz, opt) { return this._push(BOX, color, x, y, z, w, h, d, rx, ry, rz, opt); }
  cyl(r, h, color, x = 0, y = 0, z = 0, seg = 8, rTop = null, opt) { return this._push(cylGeo(rTop ?? 1, 1, seg), color, x, y + h / 2, z, r, h, r, 0, 0, 0, opt); }
  cylR(r, h, color, x, y, z, rx, ry, rz, seg = 8) { return this._push(cylGeo(1, 1, seg), color, x, y, z, r, h, r, rx, ry, rz); }
  sph(r, color, x = 0, y = 0, z = 0, seg = 6, sy = 1) { return this._push(sphGeo(seg), color, x, y, z, r, r * sy, r); }
  add(parts, x = 0, y = 0, z = 0, ry = 0, s = 1) {
    _e.set(0, ry, 0); _q.setFromEuler(_e); _p.set(x, y, z); _s.set(s, s, s); _m.compose(_p, _q, _s);
    const M = _m.clone();
    for (const it of parts.items) this.items.push({ geo: it.geo.clone().applyMatrix4(M), color: it.color, opt: it.opt });
    return this;
  }
  // Renge göre birleştirip mesh grubu döndürür.
  toGroup(shadow = false) {
    const g = new THREE.Group();
    const by = new Map();
    for (const it of this.items) {
      const k = it.color + (it.opt?.glass ? '|g' : '') + (it.opt?.emissive ? '|e' : '');
      if (!by.has(k)) by.set(k, { color: it.color, opt: it.opt, geos: [] });
      by.get(k).geos.push(it.geo);
    }
    for (const { color, opt, geos } of by.values()) {
      const geo = geos.length === 1 ? geos[0] : mergeGeometries(geos, false);
      const mesh = new THREE.Mesh(geo, mat(color, opt || {}));
      if (shadow && !opt?.glass) { mesh.castShadow = true; mesh.receiveShadow = true; }
      g.add(mesh);
    }
    return g;
  }
}

// ---------- Mobilya modelleri (orijinde, ön yüz +z) ----------
const WOOD = '#8B6A4A', DARK = '#2F2F31', METAL = '#8C9096';
export const models = {
  sofa(c, len = 2.1) {
    const p = new Parts(), d = 0.9;
    p.box(len, 0.22, d, c, 0, 0.12, 0);
    p.box(len - 0.3, 0.16, d - 0.25, shade(c, 1.06), 0, 0.34, 0.08);
    p.box(len, 0.5, 0.22, c, 0, 0.3, -d / 2 + 0.11);
    p.box(0.17, 0.42, d, shade(c, 0.94), -len / 2 + 0.085, 0.12, 0);
    p.box(0.17, 0.42, d, shade(c, 0.94), len / 2 - 0.085, 0.12, 0);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) p.box(0.06, 0.12, 0.06, DARK, sx * (len / 2 - 0.12), 0, sz * (d / 2 - 0.12));
    p.box(0.42, 0.3, 0.1, shade(c, 1.12), -len / 4, 0.48, -d / 2 + 0.28, 0.1);
    return p;
  },
  armchair(c) {
    const p = new Parts();
    p.box(0.8, 0.2, 0.8, c, 0, 0.18, 0);
    p.box(0.62, 0.12, 0.6, shade(c, 1.07), 0, 0.38, 0.06);
    p.box(0.8, 0.56, 0.16, c, 0, 0.36, -0.32);
    p.box(0.12, 0.34, 0.74, shade(c, 0.93), -0.34, 0.36, 0);
    p.box(0.12, 0.34, 0.74, shade(c, 0.93), 0.34, 0.36, 0);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) p.box(0.05, 0.18, 0.05, WOOD, sx * 0.32, 0, sz * 0.32);
    return p;
  },
  corner(c) {
    const p = models.sofa(c, 2.5);
    const q = new Parts();
    q.box(0.9, 0.22, 1.1, c, 0, 0.12, 0); q.box(0.7, 0.16, 1.0, shade(c, 1.06), 0.05, 0.34, 0.05);
    q.box(0.17, 0.42, 1.1, shade(c, 0.94), 0.37, 0.12, 0);
    p.add(q, 0.8, 0, 0.95);
    return p;
  },
  bed(c) {
    const p = new Parts();
    p.box(1.7, 0.3, 2.1, shade(c, 0.85), 0, 0.08, 0);
    p.box(1.6, 0.22, 2.0, '#F4F1EA', 0, 0.38, 0.03);
    p.box(1.8, 1.0, 0.14, c, 0, 0.08, -1.05);
    p.box(0.6, 0.14, 0.35, '#FFFFFF', -0.4, 0.6, -0.75); p.box(0.6, 0.14, 0.35, '#FFFFFF', 0.4, 0.6, -0.75);
    p.box(1.62, 0.06, 0.9, shade(c, 1.1), 0, 0.6, 0.5);
    return p;
  },
  table(c) {
    const p = new Parts(), w = c === null ? WOOD : c;
    p.box(1.9, 0.06, 0.95, w, 0, 0.72, 0);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) p.box(0.07, 0.72, 0.07, DARK, sx * 0.85, 0, sz * 0.38);
    return p;
  },
  chair(c) {
    const p = new Parts();
    p.box(0.46, 0.08, 0.46, c, 0, 0.44, 0);
    p.box(0.44, 0.48, 0.07, c, 0, 0.5, -0.2);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) p.box(0.04, 0.44, 0.04, WOOD, sx * 0.19, 0, sz * 0.19);
    return p;
  },
  coffee(c) {
    const p = new Parts(), w = c || WOOD;
    p.cyl(0.55, 0.06, w, 0, 0.38, 0, 14);
    p.cyl(0.12, 0.38, DARK, 0, 0, 0, 8);
    p.cyl(0.32, 0.03, DARK, 0, 0, 0, 10);
    return p;
  },
  tv(c) {
    const p = new Parts(), w = c || WOOD;
    p.box(1.9, 0.45, 0.45, w, 0, 0.1, 0);
    p.box(0.6, 0.38, 0.02, shade(w, 0.85), -0.6, 0.14, 0.23); p.box(0.6, 0.38, 0.02, shade(w, 0.85), 0.6, 0.14, 0.23);
    for (const sx of [-1, 1]) p.box(0.05, 0.1, 0.4, DARK, sx * 0.85, 0, 0);
    return p;
  },
  console(c) {
    const p = new Parts(), w = c || WOOD;
    p.box(1.4, 0.07, 0.4, w, 0, 0.8, 0);
    p.box(1.3, 0.25, 0.36, shade(w, 0.9), 0, 0.55, 0);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) p.box(0.04, 0.55, 0.04, '#B8A26A', sx * 0.64, 0, sz * 0.16);
    return p;
  },
  desk(top = '#D8CDB8', leg = DARK) {
    const p = new Parts();
    p.box(1.6, 0.05, 0.75, top, 0, 0.74, 0);
    p.box(0.05, 0.74, 0.7, leg, -0.75, 0, 0); p.box(0.05, 0.74, 0.7, leg, 0.75, 0, 0);
    p.box(0.55, 0.36, 0.03, '#1E1F22', 0.1, 0.84, -0.2); p.box(0.08, 0.1, 0.08, '#1E1F22', 0.1, 0.79, -0.2);
    p.box(0.51, 0.31, 0.01, '#5E7C93', 0.1, 0.865, -0.183, 0, { emissive: true });
    p.box(0.42, 0.02, 0.15, '#DDD', 0.1, 0.79, 0.05);
    return p;
  },
  officeChair(c = '#2F3033') {
    const p = new Parts();
    p.box(0.5, 0.08, 0.48, c, 0, 0.45, 0); p.box(0.48, 0.55, 0.07, c, 0, 0.55, 0.22);
    p.cyl(0.04, 0.42, METAL, 0, 0.04, 0, 6); p.cyl(0.3, 0.04, DARK, 0, 0, 0, 5);
    return p;
  },
  plant(s = 1) {
    const p = new Parts();
    p.cyl(0.22 * s, 0.38 * s, '#D6CBB6', 0, 0, 0, 8, 0.85);
    p.sph(0.36 * s, '#5F7A4E', 0, 0.75 * s, 0, 5, 1.2); p.sph(0.25 * s, '#6E8A57', 0.15 * s, 1.0 * s, 0.05, 5);
    return p;
  },
  tallPlant() {
    const p = new Parts();
    p.cyl(0.24, 0.45, '#2F2F31', 0, 0, 0, 8, 0.8);
    p.cyl(0.03, 0.9, '#6B5A45', 0, 0.45, 0, 5);
    p.sph(0.35, '#5B7A4A', 0, 1.45, 0, 5, 1.3); p.sph(0.28, '#6D8C55', 0.2, 1.2, 0.1, 5); p.sph(0.26, '#55724A', -0.2, 1.25, -0.05, 5);
    return p;
  },
  lamp(c = '#E9DEC6') {
    const p = new Parts();
    p.cyl(0.16, 0.03, DARK, 0, 0, 0, 10); p.cyl(0.02, 1.4, DARK, 0, 0.03, 0, 5);
    p.cyl(0.22, 0.28, c, 0, 1.4, 0, 10, 0.6, { emissive: true });
    return p;
  },
  rug(w, d, c) { const p = new Parts(); p.box(w, 0.02, d, c, 0, 0.005, 0); return p; },
  shelf(w = 1.6, c = '#CDBFA6') {
    const p = new Parts();
    for (let i = 0; i < 4; i++) p.box(w, 0.04, 0.35, c, 0, 0.02 + i * 0.5, 0);
    p.box(0.04, 1.6, 0.35, c, -w / 2, 0, 0); p.box(0.04, 1.6, 0.35, c, w / 2, 0, 0);
    const cols = ['#9C905C', '#4A4D52', '#B86A4B', '#E9E0CF', '#7D8A5C'];
    for (let i = 0; i < 3; i++) for (let j = 0; j < 4; j++) if ((i + j) % 3 !== 1) p.box(0.18, 0.32, 0.22, cols[(i * 4 + j) % 5], -w / 2 + 0.3 + j * 0.35, 0.06 + i * 0.5, 0);
    return p;
  },
  car(c = '#2F3540') {
    const p = new Parts();
    p.box(2.0, 0.5, 4.2, c, 0, 0.3, 0);
    p.box(1.7, 0.5, 2.1, shade(c, 1.15), 0, 0.8, -0.2);
    p.box(1.72, 0.4, 2.0, '#9FB7C8', 0, 0.85, -0.2, 0, { glass: true, opacity: 0.7 });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) p.cylR(0.32, 0.25, '#1C1C1E', sx * 0.95, 0.32, sz * 1.35, 0, 0, Math.PI / 2, 10);
    p.box(0.4, 0.12, 0.05, '#F6E7B0', -0.65, 0.55, 2.1, 0, { emissive: true }); p.box(0.4, 0.12, 0.05, '#F6E7B0', 0.65, 0.55, 2.1, 0, { emissive: true });
    return p;
  },
  container(c = '#3E6A7A', len = 6) {
    const p = new Parts();
    p.box(len, 0.08, 2.4, '#5A4E3E', 0, 0, 0);
    p.box(len, 2.5, 0.06, c, 0, 0.08, -1.2); p.box(len, 2.5, 0.06, c, 0, 0.08, 1.2);
    p.box(len, 0.06, 2.4, shade(c, 0.9), 0, 2.58, 0);
    p.box(0.06, 2.5, 2.4, shade(c, 0.85), -len / 2, 0.08, 0);
    for (let i = 0; i < len / 0.5; i++) { p.box(0.04, 2.4, 0.02, shade(c, 0.8), -len / 2 + 0.25 + i * 0.5, 0.13, -1.23); p.box(0.04, 2.4, 0.02, shade(c, 0.8), -len / 2 + 0.25 + i * 0.5, 0.13, 1.23); }
    return p;
  },
  truck(c = '#E7E2D8') {
    const p = new Parts();
    p.box(2.4, 2.2, 2.2, c, 0, 0.6, 0);
    p.box(2.2, 0.8, 0.05, '#9FB7C8', 0, 1.7, 1.11, 0, { glass: true, opacity: 0.8 });
    p.box(2.3, 0.4, 6.6, '#3A3B3E', 0, 0.45, -4.4);
    for (const sx of [-1, 1]) for (const sz of [0.4, -2.5, -6.2]) p.cylR(0.45, 0.3, '#1C1C1E', sx * 1.05, 0.45, sz, 0, 0, Math.PI / 2, 10);
    return p;
  },
  pallet() { const p = new Parts(); for (let i = 0; i < 3; i++) p.box(1.2, 0.04, 0.12, '#B79B72', 0, 0.12, -0.45 + i * 0.45); for (let i = 0; i < 3; i++) p.box(0.12, 0.12, 1.0, '#9C8160', -0.5 + i * 0.5, 0, 0); return p; },
  planks() { const p = models.pallet(); for (let i = 0; i < 5; i++) p.box(1.1, 0.12, 0.18, i % 2 ? '#C49A6C' : '#B58B5E', 0, 0.16 + Math.floor(i / 2) * 0.12, -0.3 + (i % 3) * 0.3); return p; },
  fabricRolls(cols) { const p = new Parts(); cols.forEach((c, i) => p.cylR(0.14, 1.4, c, 0, 0.16 + (i % 2) * 0.27, -0.42 + i * 0.28, 0, 0, Math.PI / 2, 8)); return p; },
  cans() { const p = new Parts(); const cs = ['#A7B3A0', '#E9E0CF', '#4A4D52', '#B86A4B']; for (let i = 0; i < 6; i++) p.cyl(0.13, 0.32, cs[i % 4], -0.3 + (i % 3) * 0.3, 0, (i < 3 ? -0.15 : 0.15), 8); return p; },
  metalBars() { const p = new Parts(); for (let i = 0; i < 6; i++) p.box(1.4, 0.06, 0.06, '#9AA0A8', 0, 0.06 + Math.floor(i / 3) * 0.07, -0.12 + (i % 3) * 0.12); return p; },
  foam() { const p = new Parts(); for (let i = 0; i < 3; i++) p.box(1.0, 0.25, 0.7, i % 2 ? '#F1E3A8' : '#EAD58E', 0, i * 0.25, 0); return p; },
  boxStack(n, c = '#C9A97F') { const p = new Parts(); for (let i = 0; i < n; i++) p.box(0.55, 0.4, 0.45, i % 2 ? c : shade(c, 0.92), (i % 2) * 0.05, i * 0.4, 0); return p; },
  forklift() {
    const p = new Parts();
    p.box(1.0, 0.6, 1.6, '#E2B33C', 0, 0.25, 0); p.box(0.9, 0.9, 0.06, DARK, 0, 0.85, -0.1);
    p.box(0.08, 1.8, 0.08, DARK, -0.3, 0.2, 0.85); p.box(0.08, 1.8, 0.08, DARK, 0.3, 0.2, 0.85);
    p.box(0.12, 0.05, 1.0, DARK, -0.25, 0.2, 1.35); p.box(0.12, 0.05, 1.0, DARK, 0.25, 0.2, 1.35);
    for (const sx of [-1, 1]) for (const sz of [-0.5, 0.5]) p.cylR(0.22, 0.2, '#1C1C1E', sx * 0.5, 0.22, sz, 0, 0, Math.PI / 2, 8);
    return p;
  },
  machine(kind, c) {
    const p = new Parts();
    if (kind === 'ahsap') { p.box(1.8, 0.85, 1.0, '#6F6A62', 0, 0, 0); p.box(1.9, 0.06, 1.1, '#C49A6C', 0, 0.85, 0); p.cylR(0.25, 0.03, '#C8CCD0', 0, 0.95, 0, Math.PI / 2, 0, 0, 12); }
    else if (kind === 'demir') { p.box(1.6, 0.8, 0.9, '#55595F', 0, 0, 0); p.box(0.5, 0.6, 0.5, '#2F3236', 0.5, 0.8, -0.1); p.cyl(0.05, 0.4, '#E07B2E', -0.4, 0.8, 0.1, 6); }
    else if (kind === 'doseme') { p.box(2.0, 0.75, 1.0, '#7B6B52', 0, 0, 0); p.box(1.6, 0.18, 0.7, '#9C905C', 0, 0.75, 0); }
    else if (kind === 'kumas') { p.box(2.2, 0.85, 1.2, '#D8CDB8', 0, 0, 0); p.box(0.25, 0.25, 1.2, '#4A4D52', 0.6, 0.85, 0); p.box(1.0, 0.02, 0.9, '#B86A4B', -0.4, 0.86, 0); }
    else if (kind === 'boya') { p.box(1.8, 2.0, 0.12, '#A7B3A0', 0, 0, -0.6); p.box(0.12, 2.0, 1.2, '#A7B3A0', -0.9, 0, 0); p.box(0.12, 2.0, 1.2, '#A7B3A0', 0.9, 0, 0); p.box(1.4, 0.6, 0.8, '#6E7568', 0, 0, 0); }
    else if (kind === 'kalite') { p.box(1.6, 0.8, 0.9, '#E6E8EA', 0, 0, 0); p.cyl(0.03, 0.8, DARK, 0.6, 0.8, -0.3, 5); p.box(0.4, 0.06, 0.25, '#FFF7DA', 0.5, 1.6, -0.2, 0, { emissive: true }); }
    else if (kind === 'paket') { p.box(2.0, 0.8, 1.0, '#BDA57D', 0, 0, 0); p.cylR(0.18, 0.9, '#D9C9A6', 0.6, 0.98, 0, Math.PI / 2, 0, 0, 10); p.box(0.6, 0.35, 0.5, '#C9A97F', -0.4, 0.8, 0); }
    else p.box(1.6, 0.8, 1.0, c || METAL, 0, 0, 0);
    return p;
  },
};

// Ürün ailesine göre model
export function productModel(modelId, fabricHex, woodHex) {
  switch (modelId) {
    case 'sofa': return models.sofa(fabricHex);
    case 'armchair': return models.armchair(fabricHex);
    case 'corner': return models.corner(fabricHex);
    case 'bed': return models.bed(fabricHex);
    case 'table': return models.table(woodHex || WOOD);
    case 'chair': return models.chair(fabricHex);
    case 'coffee': return models.coffee(woodHex);
    case 'tv': return models.tv(woodHex);
    case 'console': return models.console(woodHex);
    default: return models.armchair(fabricHex);
  }
}

export function shade(hex, f) {
  const c = new THREE.Color(hex);
  c.r = Math.min(1, c.r * f); c.g = Math.min(1, c.g * f); c.b = Math.min(1, c.b * f);
  return '#' + c.getHexString();
}

// Bir yazıyı yere/duvara konan küçük tabelaya çevirir.
export function textSprite(text, opt = {}) {
  const cv = document.createElement('canvas');
  const fs = opt.size || 44, pad = 18;
  const ctx = cv.getContext('2d');
  ctx.font = `600 ${fs}px Montserrat, system-ui, sans-serif`;
  const w = Math.ceil(ctx.measureText(text).width) + pad * 2;
  cv.width = w; cv.height = fs + pad * 1.6;
  const c2 = cv.getContext('2d');
  c2.font = `600 ${fs}px Montserrat, system-ui, sans-serif`;
  c2.fillStyle = opt.bg || 'rgba(43,45,47,0.82)';
  const r = cv.height / 2;
  c2.beginPath(); c2.roundRect(0, 0, cv.width, cv.height, r); c2.fill();
  c2.fillStyle = opt.color || '#F4EFE6'; c2.textBaseline = 'middle'; c2.textAlign = 'center';
  c2.fillText(text, cv.width / 2, cv.height / 2 + 2);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 2;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: opt.depthTest ?? true, transparent: true }));
  const h = opt.h || 0.42; sp.scale.set(h * cv.width / cv.height, h, 1);
  sp.renderOrder = 10;
  return sp;
}

// Yerde parlayan etkileşim halkası
export function ringMesh(r = 0.9, color = '#9C905C') {
  const g = new THREE.RingGeometry(r * 0.82, r, 32); g.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.75, depthWrite: false }));
  m.position.y = 0.03; m.renderOrder = 2;
  const fill = new THREE.Mesh(new THREE.CircleGeometry(r * 0.82, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.16, depthWrite: false }));
  fill.position.y = 0.025; m.add(fill); fill.position.y = -0.005;
  return m;
}

const blobTex = (() => {
  const cv = document.createElement('canvas'); cv.width = cv.height = 64;
  const c = cv.getContext('2d'); const g = c.createRadialGradient(32, 32, 2, 32, 32, 31);
  g.addColorStop(0, 'rgba(0,0,0,0.38)'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(cv); return t;
})();
export function blobShadow(r = 0.45) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(r * 2, r * 2).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false }));
  m.position.y = 0.02; m.renderOrder = 1; return m;
}
