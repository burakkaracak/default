// Ortak tuvalet ve malzeme rafı (havlu, tuvalet kâğıdı).
// Raf lobinin doğu duvarındadır, hep açıktır: müdür oradan eşya alır (elde yığın, kapasite "Taşıma sepeti" yükseltmesiyle artar).
// Tuvalet satın alınan bir tesistir: çıkış yapan misafir bankoya gitmeden uğrayabilir. Kâğıt biter, kirlenir; müdür, kat görevlisi (kâğıt) ve temizlikçi (temizlik) bakar.
const Wc = (() => {
  const PAPER_MAX = 8, DIRTY_AT = 4, COST = 600, UNLOCK = 1, USE_CHANCE = 0.45;
  const CABS = [{ z: 3.0 }, { z: 5.0 }];                       // iki kabin: kapı ortaları
  const FRONT = 10.9;                                           // kabinlerin ön duvarı (x)
  const DOOR = V(10.1, 0, 4.0);                                 // müdür/personel hizmet noktası
  const STATION = { towel: V(11.7, 0, -0.7), paper: V(11.7, 0, 0.95) };
  const S = { g: null, grp: null, t: 0, pick: 0, claim: {}, busy: [0, 0], leafs: [], dots: [], rolls: [], mess: null, work: 0, booted: false };
  const st = () => { const g = Game.st; return g.wc || (g.wc = { built: false, paper: PAPER_MAX, dirt: 0, uses: 0 }); };
  const built = () => !!(Game.st && Game.st.wc && Game.st.wc.built);
  const wood = C(0.62, 0.42, 0.26), wall = C(0.9, 0.86, 0.96), white = C(0.97, 0.97, 0.98), blue = C(0.55, 0.75, 0.95);

  // ---------------- görünüm ----------------
  function buildShelf(g) {
    // doğu duvarına dayalı raf: kuzey yarısı havlu, güney yarısı kâğıt
    U.Box('RafArka', g, V(12.7, 1.05, 0.1), V(0.12, 2.1, 2.6), wood);
    for (const y of [0.35, 0.95, 1.55]) U.Box('RafTaban', g, V(12.35, y, 0.1), V(0.6, 0.06, 2.6), C(0.78, 0.6, 0.42));
    for (const z of [-1.2, 1.4]) U.Box('RafYan', g, V(12.35, 1.05, z), V(0.6, 2.1, 0.07), wood);
    const tow = [C(1, 1, 1), C(0.8, 0.92, 1), C(0.98, 0.86, 0.9)];
    for (const [i, y] of [0.38, 0.98, 1.58].entries()) for (let k = 0; k < 3; k++) for (let j = 0; j < 3; j++)
      U.Box('Havlu', g, V(12.3, y + 0.06 + j * 0.1, -0.85 + k * 0.38), V(0.4, 0.09, 0.32), tow[(i + k + j) % 3]);
    for (const y of [0.38, 0.98, 1.58]) for (let k = 0; k < 4; k++) for (let j = 0; j < 2; j++)
      { U.Box('Kagit', g, V(12.3, y + 0.14 + j * 0.2, 0.55 + k * 0.17), V(0.2, 0.18, 0.2), white, 'Cylinder'); U.Box('KagitSerit', g, V(12.3, y + 0.14 + j * 0.2, 0.55 + k * 0.17), V(0.21, 0.05, 0.21), blue, 'Cylinder'); }
    U.Text(g, V(11.9, 2.7, -0.7), '🧺 HAVLU', 0.05, C(0.4, 0.3, 0.55), true, true);
    U.Text(g, V(11.9, 2.7, 0.95), '🧻 KÂĞIT', 0.05, C(0.4, 0.3, 0.55), true, true);
    // alma noktaları: yerde yumuşak halkalar
    for (const k of ['towel', 'paper']) {
      const p = STATION[k];
      U.Flat('Durak', g, V(p.x, 0.03, p.z), V(1.2, 0.02, 1.2), C(0.74, 0.62, 0.88, 0.55), 'Cylinder');
      U.Flat('DurakIc', g, V(p.x, 0.035, p.z), V(0.8, 0.02, 0.8), C(1, 0.95, 0.7, 0.55), 'Cylinder');
    }
  }
  function buildCabins(g) {
    if (S.grp) { Destroy(S.grp); S.grp = null; }
    S.leafs = []; S.dots = []; S.rolls = []; S.mess = null;
    if (!built()) return;
    S.grp = U.Pivot(g, null, 'Tuvalet'); const G = S.grp;
    U.Prim('TuvaletZemin', G, V(11.8, 0.02, 4.0), V(1.8, 0.03, 4.1), U.Mat(C(0.9, 0.93, 0.95), { tex: U.TileTex, tiling: { x: 2, y: 3 } })).castShadow = false;
    // duvarlar: ön duvar iki kapı boşluğuyla, kuzey/güney, ortadaki ayırıcı
    for (const [z0, z1] of [[2.0, 2.55], [3.45, 4.55], [5.45, 6.0]]) U.Box('TuvaletDuvar', G, V(FRONT, 0.8, (z0 + z1) / 2), V(0.1, 1.6, z1 - z0), wall);
    U.Box('TuvaletSerit', G, V(FRONT, 1.64, 4.0), V(0.14, 0.08, 4.1), C(0.74, 0.62, 0.88));
    for (const z of [2.0, 4.0, 6.0]) U.Box('TuvaletYan', G, V(11.8, 0.8, z), V(1.8, 1.6, 0.1), wall);
    U.Text(G, V(FRONT - 0.1, 2.2, 4.0), '🚻 TUVALET', 0.06, C(0.45, 0.3, 0.65), true, true);
    CABS.forEach((c, i) => {
      // kapı kanadı (kapalı), kullanım ışığı
      const leaf = U.Box('Kapi', G, V(FRONT - 0.02, 0.62, c.z), V(0.07, 1.24, 0.9), C(0.6, 0.78, 0.9)); S.leafs.push(leaf);
      U.Box('Kol', G, V(FRONT - 0.09, 0.7, c.z + 0.3), V(0.06, 0.06, 0.12), C(1, 0.85, 0.3));
      const dot = U.Box('Isik', G, V(FRONT - 0.1, 1.38, c.z), V(0.08, 0.12, 0.12), C(0.4, 0.9, 0.5)); S.dots.push(dot);
      // klozet: taban + kase + kapak arkası depo
      U.Box('Kloz', G, V(12.1, 0.2, c.z), V(0.5, 0.4, 0.42), white, 'Cylinder');
      U.Box('KlozKase', G, V(12.05, 0.42, c.z), V(0.5, 0.06, 0.44), C(0.93, 0.95, 0.98), 'Cylinder');
      U.Box('KlozDepo', G, V(12.5, 0.55, c.z), V(0.22, 0.7, 0.45), white);
      // kâğıt tutacağı yan duvarda; rulo kâğıt varken görünür
      U.Box('Tutac', G, V(11.9, 0.9, c.z + 0.86), V(0.06, 0.06, 0.2), C(0.7, 0.7, 0.75));
      const roll = U.Box('Rulo', G, V(11.9, 0.9, c.z + 0.86), V(0.22, 0.2, 0.22), white, 'Cylinder'); roll.rotation.x = Math.PI / 2; S.rolls.push(roll);
      // lavabo
      U.Box('Lavabo', G, V(12.45, 0.9, c.z + 0.7), V(0.36, 0.1, 0.3), white);
      U.Box('Musluk', G, V(12.6, 1.0, c.z + 0.7), V(0.05, 0.16, 0.05), C(0.75, 0.78, 0.82));
    });
    // ıslak zemin (kirliyken görünür)
    S.mess = U.Flat('IslakZemin', G, V(10.2, 0.04, 4.0), V(1.5, 0.01, 2.6), C(0.55, 0.65, 0.6, 0.65), 'Cylinder'); S.mess.visible = false;
    refreshVis();
  }
  function refreshVis() {
    const w = st();
    S.rolls.forEach(r => { if (alive(r)) r.visible = w.paper > 0; });
    if (S.mess && alive(S.mess)) S.mess.visible = w.dirt >= DIRTY_AT;
    S.dots.forEach((d, i) => { if (alive(d)) d.material = U.Mat(S.busy[i] > 0 ? C(0.95, 0.35, 0.35) : C(0.4, 0.9, 0.5)); });
  }

  // ---------------- durum ----------------
  const Need = {
    paper: () => built() && st().paper <= 1,
    dirt: () => built() && st().dirt >= DIRTY_AT,
    any: () => Need.paper() || Need.dirt(),
  };
  function use() { const w = st(); w.paper = Math.max(0, w.paper - 1); w.dirt++; w.uses++; refreshVis(); }
  function fillPaper() { const w = st(); w.paper = PAPER_MAX; refreshVis(); Sfx.Play('tick', 0.5); }
  function clean() { const w = st(); w.dirt = 0; refreshVis(); Sfx.Play('clean', 0.6); U.Burst(V(10.2, 0.8, 4.0), C(0.8, 0.95, 1), C(1, 1, 1), 25, 3); }

  // ---------------- misafir ----------------
  // Çıkış yapan misafir: bankoya gitmeden önce tuvalete uğrayabilir. true = misafir tuvalet yolunda.
  function offer(guest) {
    if (!built() || !(S.always || Random.Chance(USE_CHANCE))) return false;
    if (Need.any() && (st().paper <= 0 || Need.dirt())) {
      // kâğıt yok ya da kirli: vazgeçer, memnuniyet düşer
      guest.sat -= 0.5; guest.ShowMood('😖', C(1, 0.7, 0.6), 2.5);
      Tween.FloatText(Vec.add(guest.pos, V(0, 2.2, 0)), st().paper <= 0 ? '🧻 Kâğıt yok!' : '🚽 Tuvalet kirli!', C(1, 0.7, 0.6), 0.09);
      return false;
    }
    const i = S.busy[0] <= S.busy[1] ? 0 : 1, c = CABS[i];
    S.busy[i] = 1; guest.wc = { i, phase: 'go', t: 0 };
    guest.s = Guest.S.Wc; guest.rig.act = Rig.Act.None;
    guest.path = [V(guest.pos.x, 0, 0.4), V(10.1, 0, 0.4), V(10.1, 0, c.z), V(FRONT - 0.5, 0, c.z)];
    return true;
  }
  function guestTick(guest, dt) {
    const w = guest.wc; if (!w) { backToDesk(guest); return; }
    if (w.phase === 'go') {
      w.phase = 'in'; w.t = Random.Range(2.4, 3.6); guest.hidden = true; refreshVis();
      return;
    }
    w.t -= dt;
    if (w.t > 0) return;
    guest.hidden = false; S.busy[w.i] = 0; use();
    guest.sat += 0.25; guest.ShowMood('🙂', Col.white, 1.5); Sfx.Play('tick', 0.4);
    guest.wc = null; backToDesk(guest);
  }
  function backToDesk(guest) {
    guest.s = Guest.S.Checkout; guest.hidden = false;
    guest.path = [V(10.1, 0, 0.4), V(0.9, 0, -0.2), V(0.9, 0, -2.0)];
  }

  // ---------------- personel ----------------
  // kind: 'clean' (temizlikçi) ya da 'paper' (kat görevlisi). Boştaki personel çağırır; true = iş aldı.
  function claim(staff, kind) {
    const need = kind === 'clean' ? Need.dirt() : Need.paper();
    if (!need || S.claim[kind]) return false;
    S.claim[kind] = staff; staff.wcJob = kind; staff.wcT = 0; staff.Go(DOOR, 0); return true;
  }
  function release(staff) { if (staff.wcJob && S.claim[staff.wcJob] === staff) S.claim[staff.wcJob] = null; staff.wcJob = null; staff.wcT = 0; if (staff.rig) staff.rig.act = Rig.Act.None; }
  // true = personel hâlâ bu işte (diğer görevlere bakma)
  function staffWork(staff, dt) {
    const kind = staff.wcJob; if (!kind) return false;
    if (!(kind === 'clean' ? Need.dirt() : Need.paper())) { release(staff); return false; }
    if (staff.floor !== 0 || Vec.flat(staff.pos, DOOR) > 0.9) { if (!staff.path.length) staff.Go(DOOR, 0); return true; }
    staff.rig.act = Rig.Act.Clean; staff.rig.Tick(0);
    staff.wcT += dt / (kind === 'clean' ? 4 : 2.2) * (staff.Eff ?? 1); Game.ShowProgress(V(DOOR.x, 0, DOOR.z), staff.wcT);
    if (staff.wcT >= 1) { if (kind === 'clean') clean(); else fillPaper(); release(staff); staff.idleT = 0.5; staff.GainXP && staff.GainXP(5); }
    return true;
  }

  // ---------------- müdür ----------------
  function playerTick(dt) {
    const P = Game.player; if (!P || P.liftT > 0 || P.floor !== 0) { S.work = 0; return; }
    // raftan al
    S.pick -= dt;
    for (const k of ['towel', 'paper']) {
      if (k === 'paper' && !built()) continue;
      if (P.Near(STATION[k], 0.85) && P.CarryFree > 0 && S.pick <= 0) {
        if (P.CarryAdd(k)) { S.pick = 0.3; Sfx.Play('tick', 0.35); }
      }
    }
    if (!built()) { S.work = 0; return; }
    const w = st(), near = P.Near(DOOR, 2.3);
    // kâğıt rafını doldur
    if (near && w.paper < PAPER_MAX && P.Count('paper') > 0) {
      S.work = 0; S.give = (S.give || 0) - dt;
      if (S.give <= 0 && P.CarryTake('paper')) { S.give = 0.25; w.paper = Math.min(PAPER_MAX, w.paper + 2); refreshVis(); Sfx.Play('tick', 0.5); if (w.paper >= PAPER_MAX) { Sfx.Play('ding', 0.4); Tween.FloatText(V(DOOR.x, 1.8, DOOR.z), '🧻 Doldu', C(0.8, 1, 0.85), 0.09); } }
      return;
    }
    // temizle
    if (near && Need.dirt()) {
      P.rig.act = Rig.Act.Clean; S.work += dt / 2.6; Game.ShowProgress(V(DOOR.x, 0, DOOR.z), S.work);
      if (S.work >= 1) { S.work = 0; clean(); P.rig.act = Rig.Act.None; }
      S.cleaning = true; return;
    }
    if (S.cleaning) { S.cleaning = false; if (P.rig.act === Rig.Act.Clean) P.rig.act = Rig.Act.None; }
    S.work = 0;
  }
  function labels() {
    if (Hotel.view !== 0) return;
    const stars = Game.Stars;
    if (!built()) {
      if (stars >= UNLOCK && Game.st.money >= COST * 0.5) UI.Label('wcbuy', V(11.6, 1.8, 4.0), '➕ 🚻 Tuvalet ' + UI.fmt(COST), 'buy', () => Game.BuildSheet && Game.BuildSheet('tesis'));
      return;
    }
    const w = st(), parts = [];
    if (w.paper <= 0) parts.push('🧻 Kâğıt bitti'); else if (w.paper <= 1) parts.push('🧻 Kâğıt azaldı');
    if (w.dirt >= DIRTY_AT) parts.push('🧹 Tuvalet kirli');
    if (!parts.length) return;
    UI.Label('wc', V(11.4, 2.3, 4.0), parts.join(' · '), 'need', () => {
      const P = Game.player;
      if (w.dirt >= DIRTY_AT || P.Count('paper') > 0) P.GoTo(DOOR, 0);
      else { P.GoTo(STATION.paper, 0); UI.Toast('Önce raftan kâğıt al 🧻', 'info'); }
    });
  }

  // ---------------- satın alma ----------------
  function buy() {
    if (built()) return false;
    if (Game.Stars < UNLOCK) { UI.Toast('Tuvalet için ' + UNLOCK + ' yıldız gerekir', 'bad'); return false; }
    if (!Game.Pay(COST)) return false;
    const w = st(); w.built = true; w.paper = PAPER_MAX; w.dirt = 0;
    buildCabins(S.g);
    if (S.grp) Tween.Pop(S.grp, 0.2);
    U.Burst(V(11.5, 1.4, 4.0), C(1, 0.85, 0.3), C(0.5, 0.9, 1), 90, 6);
    Sfx.Play('build', 0.8); UI.Toast('🚻 Tuvalet açıldı! Kâğıt rafından kâğıt alıp doldurmayı unutma', 'good');
    Hotel.SetView(0); Game.Save();
    if (UI.SheetOpen) UI.RenderSheet();
    return true;
  }

  const api = {
    get S() { return S; },
    Built: built, Need, STATION, DOOR, PAPER_MAX, DIRTY_AT,
    // müdür/personel yürümesin diye tuvalet kutusu
    Blocks(p) { return built() && p.x > FRONT - 0.2 && p.z > 1.9 && p.z < 6.1; },
    Boot() { st(); S.booted = true; },
    BuildLobby(g) { S.g = g; buildShelf(g); buildCabins(g); },
    Tick(dt) {
      if (!S.booted) return;
      S.t += dt;
      playerTick(dt);
      labels();
    },
    Offer: offer, GuestTick: guestTick, Claim: claim, StaffWork: staffWork, Buy: buy,
    // havlu isteği için: yığında havlu yoksa rafa yönlendir
    FetchTowel() { const P = Game.player; P.GoTo(STATION.towel, 0); UI.Toast('Önce raftan havlu al 🧺', 'info'); },
    SheetItem(body) {
      const it = document.createElement('div');
      if (built()) {
        const w = st();
        it.className = 'item done';
        it.innerHTML = `<div class="ic">🚻</div><div class="tx"><b>Ortak tuvalet · açık</b><small>Zemin kat · ${w.uses} kullanım · kâğıt ${w.paper}/${PAPER_MAX}${w.dirt >= DIRTY_AT ? ' · kirli' : ''}. Kâğıdı raftan alıp doldur; temizlikçi temizler, kat görevlisi kâğıt doldurur.</small></div>`;
        const b = document.createElement('button'); b.className = 'ghost'; b.textContent = 'Göster'; b.addEventListener('click', () => { Hotel.SetView(0); Game.player.GoTo(DOOR, 0); UI.CloseSheet(); }); it.appendChild(b);
      } else if (Game.Stars < UNLOCK) {
        it.className = 'item locked';
        it.innerHTML = `<div class="ic">🔒</div><div class="tx"><b>Ortak tuvalet</b><small>${UNLOCK} yıldız gerekir · Zemin kat</small></div>`;
      } else {
        it.className = 'item';
        it.innerHTML = `<div class="ic">🚻</div><div class="tx"><b>Ortak tuvalet</b><small>Zemin kat · Çıkış yapan misafirler uğrar. Kâğıt biter, kirlenir: temiz tutarsan misafir memnun kalır.</small></div>`;
        const b = document.createElement('button'); b.className = 'mint'; b.textContent = UI.fmt(COST); b.addEventListener('click', () => buy()); it.appendChild(b);
      }
      body.appendChild(it);
    },
  };
  if (typeof window !== 'undefined') window.__wc = api; // test/hata ayıklama erişimi
  return api;
})();
