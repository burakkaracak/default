// Low-poly karakter: büyük kafa, sevimli oranlar. Kollar ve bacaklar yürürken sallanır.
import * as THREE from 'three';
import { Parts, shade, blobShadow } from '../locations/builder.js';

function limb(parts) { const g = parts.toGroup(); return g; }

export function makePerson(look, opt = {}) {
  const L = Object.assign({ skin: '#E2B98F', hair: 'short', hairColor: '#2B2118', top: '#888', bottom: '#333' }, look);
  const root = new THREE.Group();
  const body = new THREE.Group(); root.add(body);
  const shadowOn = !!opt.shadow;

  // Bacaklar (kalça pivotu)
  const mkLeg = (x) => {
    const piv = new THREE.Group(); piv.position.set(x, 0.62, 0);
    const p = new Parts();
    if (L.skirt) p.box(0.17, 0.5, 0.17, L.skin, 0, -0.62, 0); else p.box(0.17, 0.6, 0.18, L.bottom, 0, -0.6, 0);
    p.box(0.19, 0.1, 0.27, '#2A2626', 0, -0.62, 0.04);
    const m = limb(p); piv.add(m); body.add(piv); return piv;
  };
  const legL = mkLeg(-0.1), legR = mkLeg(0.1);

  // Gövde
  const t = new Parts();
  const topC = L.vest ? L.top : L.top;
  t.box(0.44, 0.5, 0.27, topC, 0, 0.6, 0);
  if (L.skirt) t.box(0.46, 0.22, 0.3, L.bottom, 0, 0.5, 0);
  if (L.jacket) { t.box(0.46, 0.46, 0.06, shade(L.top, 0.85), -0.12, 0.62, 0.13); t.box(0.46, 0.46, 0.06, shade(L.top, 0.85), 0.12, 0.62, 0.13); t.box(0.1, 0.3, 0.02, '#F2F0EB', 0, 0.78, 0.15); }
  if (L.tie) t.box(0.06, 0.28, 0.02, L.tie, 0, 0.78, 0.165);
  if (L.vest) { t.box(0.46, 0.44, 0.29, L.vest, 0, 0.64, 0); t.box(0.47, 0.04, 0.3, '#E8E8D0', 0, 0.78, 0); }
  if (L.cardigan) { t.box(0.46, 0.48, 0.29, L.top, 0, 0.6, 0); t.box(0.08, 0.4, 0.02, '#EDE6D6', 0, 0.66, 0.15); }
  if (L.extra?.includes('bag')) { t.box(0.04, 0.5, 0.3, '#4A3A2C', 0.2, 0.6, 0); t.box(0.3, 0.3, 0.1, '#5A4636', 0.16, 0.5, -0.18); }
  t.box(0.12, 0.08, 0.12, L.skin, 0, 1.1, 0);
  const torso = t.toGroup(shadowOn); body.add(torso);

  // Kollar (omuz pivotu)
  const mkArm = (x, side) => {
    const piv = new THREE.Group(); piv.position.set(x, 1.05, 0);
    const p = new Parts();
    const sleeve = L.vest ? L.vest : L.jacket || L.cardigan ? shade(L.top, L.jacket ? 0.92 : 1) : L.top;
    p.box(0.13, 0.36, 0.14, sleeve, 0, -0.38, 0);
    p.box(0.11, 0.12, 0.12, L.skin, 0, -0.5, 0);
    if (side > 0 && L.extra?.includes('watch')) p.box(0.12, 0.04, 0.13, '#C9B37A', 0, -0.4, 0);
    if (side > 0 && L.extra?.includes('phone')) p.box(0.07, 0.14, 0.03, '#1C1C1E', 0.02, -0.56, 0.07);
    if (side < 0 && L.extra?.includes('clipboard')) { p.box(0.22, 0.3, 0.02, '#8B6A4A', 0.05, -0.66, 0.1); p.box(0.18, 0.24, 0.01, '#F5F2EA', 0.05, -0.63, 0.115); }
    if (side < 0 && L.extra?.includes('tablet')) p.box(0.2, 0.26, 0.02, '#2A2B2E', 0.05, -0.64, 0.1);
    const m = limb(p); piv.add(m); body.add(piv); return piv;
  };
  const armL = mkArm(-0.29, -1), armR = mkArm(0.29, 1);

  // Kafa
  const head = new THREE.Group(); head.position.y = 1.16; body.add(head);
  const h = new Parts();
  h.box(0.4, 0.42, 0.38, L.skin, 0, -0.2, 0);
  h.box(0.05, 0.05, 0.02, '#2A2421', -0.09, 0.02, 0.19); h.box(0.05, 0.05, 0.02, '#2A2421', 0.09, 0.02, 0.19);
  h.box(0.06, 0.035, 0.03, shade(L.skin, 0.88), 0, -0.07, 0.2);
  h.box(0.05, 0.08, 0.06, shade(L.skin, 0.95), -0.215, -0.04, 0); h.box(0.05, 0.08, 0.06, shade(L.skin, 0.95), 0.215, -0.04, 0);
  const HC = L.hairColor;
  switch (L.hair) {
    case 'short': h.box(0.43, 0.12, 0.41, HC, 0, 0.16, -0.01); h.box(0.43, 0.22, 0.1, HC, 0, 0.0, -0.16); h.box(0.06, 0.14, 0.34, HC, -0.205, 0.04, -0.02); h.box(0.06, 0.14, 0.34, HC, 0.205, 0.04, -0.02); break;
    case 'side': h.box(0.43, 0.1, 0.41, HC, 0, 0.17, -0.01); h.box(0.25, 0.06, 0.41, HC, -0.08, 0.25, -0.01); h.box(0.43, 0.22, 0.1, HC, 0, -0.01, -0.16); h.box(0.06, 0.12, 0.34, HC, -0.205, 0.05, -0.02); h.box(0.06, 0.12, 0.34, HC, 0.205, 0.05, -0.02); break;
    case 'bald': h.box(0.06, 0.14, 0.3, HC, -0.205, -0.02, -0.03); h.box(0.06, 0.14, 0.3, HC, 0.205, -0.02, -0.03); h.box(0.42, 0.14, 0.06, HC, 0, -0.04, -0.18); break;
    case 'bun': h.box(0.43, 0.12, 0.41, HC, 0, 0.16, -0.01); h.box(0.43, 0.3, 0.12, HC, 0, -0.06, -0.15); h.box(0.06, 0.24, 0.32, HC, -0.21, -0.02, -0.03); h.box(0.06, 0.24, 0.32, HC, 0.21, -0.02, -0.03); h.sph(0.13, HC, 0, 0.18, -0.24, 6); break;
    case 'long': h.box(0.44, 0.12, 0.42, HC, 0, 0.16, -0.01); h.box(0.46, 0.62, 0.14, HC, 0, -0.42, -0.16); h.box(0.07, 0.5, 0.3, HC, -0.22, -0.28, -0.03); h.box(0.07, 0.5, 0.3, HC, 0.22, -0.28, -0.03); h.box(0.2, 0.06, 0.06, HC, -0.1, 0.13, 0.18); break;
    case 'cap': h.box(0.44, 0.13, 0.42, HC, 0, 0.15, 0); h.box(0.3, 0.03, 0.18, HC, 0, 0.14, 0.27); break;
  }
  if (L.helmet) { h.box(0.46, 0.15, 0.44, L.helmet, 0, 0.17, 0); h.box(0.5, 0.03, 0.5, L.helmet, 0, 0.15, 0.03); }
  if (L.glasses) { h.box(0.13, 0.09, 0.02, '#1E1E1E', -0.09, 0.02, 0.2); h.box(0.13, 0.09, 0.02, '#1E1E1E', 0.09, 0.02, 0.2); h.box(0.07, 0.02, 0.02, '#1E1E1E', 0, 0.04, 0.2); }
  const bc = L.beardColor || HC;
  if (L.beard === 'full') { h.box(0.41, 0.2, 0.08, bc, 0, -0.26, 0.17); h.box(0.06, 0.24, 0.3, bc, -0.2, -0.2, 0.04); h.box(0.06, 0.24, 0.3, bc, 0.2, -0.2, 0.04); }
  if (L.beard === 'stubble') h.box(0.41, 0.15, 0.05, shade(L.skin, 0.72), 0, -0.29, 0.175);
  if (L.mustache) h.box(0.2, 0.05, 0.04, bc === HC && L.hair === 'bald' ? '#3A2E26' : bc, 0, -0.12, 0.2);
  if (L.extra?.includes('earrings')) { h.box(0.03, 0.06, 0.03, '#D9C27A', -0.23, -0.12, 0.02); h.box(0.03, 0.06, 0.03, '#D9C27A', 0.23, -0.12, 0.02); }
  head.add(h.toGroup(shadowOn));
  head.children[0].position.y = 0.2;

  const sh = blobShadow(0.42); root.add(sh);

  // Taşınan koliler
  const carry = new THREE.Group(); carry.position.set(0, 0.85, 0.32); body.add(carry);

  const s = opt.scale || 1; root.scale.setScalar(s);
  const state = { phase: Math.random() * 6, moving: 0 };
  return {
    root, body, head, legL, legR, armL, armR, carry,
    animate(dt, speed01) {
      state.moving += (speed01 - state.moving) * Math.min(1, dt * 10);
      state.phase += dt * (4 + 7 * state.moving);
      const a = Math.sin(state.phase) * 0.7 * state.moving;
      legL.rotation.x = a; legR.rotation.x = -a;
      const carrying = carry.children.length > 0;
      if (carrying) { armL.rotation.x = armR.rotation.x = -1.2; }
      else { armL.rotation.x = -a * 0.8; armR.rotation.x = a * 0.8; }
      body.position.y = Math.abs(Math.sin(state.phase)) * 0.05 * state.moving + (1 - state.moving) * Math.sin(state.phase * 0.35) * 0.008;
      head.rotation.z = Math.sin(state.phase * 0.25) * 0.03 * (1 - state.moving);
    },
    wave(t) { armR.rotation.x = -2.6 + Math.sin(t * 10) * 0.3; armR.rotation.z = 0.3; },
  };
}
