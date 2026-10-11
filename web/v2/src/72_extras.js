// Otopark (satın alınır: arabayla gelenler park eder, +%20 ödeme), Geliştirme ofisi (yere para yatırarak gelişim), Yeni otele geçiş (kalıcı gelir bonusu).

// ---------------- Otopark ----------------
const Park = {
  Cost: 2500, Unlock: 2, g: null,
  slots: [{ x: -12.4, busy: false }, { x: -8.8, busy: false }, { x: -5.2, busy: false }], Z: 8.05,
  Built() { return !!(Game.st && Game.st.park); },
  Boot() { if (this.Built()) this.Build(); },
  Take() { const s = this.slots.find(x => !x.busy); if (s) s.busy = true; return s || null; },
  Release(s) { if (s) s.busy = false; },
  Build() {
    if (this.g && alive(this.g)) Destroy(this.g);
    const g = this.g = U.Pivot(W, V(), 'Otopark');
    U.Box('OtoparkZemin', g, V(-8.8, 0.035, this.Z), V(11.4, 0.04, 1.9), C(0.3, 0.31, 0.36)).castShadow = false;
    for (const x of [-14.5, -10.6, -7.0, -3.4]) U.Box('Cizgi', g, V(x, 0.07, this.Z), V(0.1, 0.01, 1.7), C(1, 1, 1));
    U.Box('PDirek', g, V(-3.1, 0.9, 7.5), V(0.1, 1.8, 0.1), C(0.4, 0.4, 0.45)); U.Box('PTabela', g, V(-3.1, 1.9, 7.5), V(0.7, 0.7, 0.08), C(0.25, 0.45, 0.85));
    U.Text(g, V(-3.1, 1.9, 7.56), 'P', 0.08, C(1, 1, 1), true, true);
  },
  Buy() {
    if (this.Built()) return false;
    if (Game.Stars < this.Unlock) { UI.Toast('Otopark için ' + this.Unlock + ' yıldız gerekir', 'bad'); return false; }
    if (!Game.Pay(this.Cost)) return false;
    Game.st.park = true; this.Build(); if (this.g) Tween.Pop(this.g, 0.2);
    Sfx.Play('build', 0.8); UI.Toast('🅿 Otopark açıldı! Arabayla gelen misafirler artık park ediyor', 'good'); Game.Save();
    if (UI.SheetOpen) UI.RenderSheet(); return true;
  },
  SheetItem(body) {
    const it = document.createElement('div'), locked = Game.Stars < this.Unlock;
    it.className = 'item' + (this.Built() ? ' done' : locked ? ' locked' : '');
    it.innerHTML = `<div class="ic">${locked && !this.Built() ? '🔒' : '🅿'}</div><div class="tx"><b>Otopark${this.Built() ? ' · açık' : ''}</b><small>Otelin önünde. Arabayla gelen misafir çoğalır, park eden %20 fazla öder. ${locked && !this.Built() ? this.Unlock + ' yıldız gerekir.' : ''}</small></div>`;
    if (!this.Built() && !locked) { const b = document.createElement('button'); b.className = 'mint'; b.textContent = UI.fmt(this.Cost); b.addEventListener('click', () => this.Buy()); it.appendChild(b); }
    body.appendChild(it);
  },
};

// ---------------- Geliştirme ofisi: halının üstünde dur, para sıradaki gelişime akar ----------------
const Hr = {
  pad: V(11.2, 0, 8.4), g: null, t: 0, ring: null, hint: 0,
  Boot() {
    const g = this.g = U.Pivot(W, V(), 'GelistirmeOfisi');
    U.Box('OfisGovde', g, V(11.2, 0.75, 7.62), V(2.2, 1.5, 0.7), C(0.9, 0.82, 0.95)); U.Box('OfisCati', g, V(11.2, 1.58, 7.7), V(2.4, 0.14, 1.0), C(0.62, 0.45, 0.82));
    U.Box('OfisPencere', g, V(11.2, 0.95, 8.0), V(1.2, 0.5, 0.04), C(0.7, 0.88, 0.97));
    U.Text(g, V(11.2, 2.0, 7.7), '🧑‍💼 GELİŞTİRME', 0.05, C(0.4, 0.28, 0.6), true, true);
    this.ring = U.Flat('GelistirmeHalka', g, V(this.pad.x, 0.045, this.pad.z), V(1.4, 0.03, 1.4), C(1, 0.85, 0.3, 0.8), 'Cylinder');
    U.Flat('GelistirmeIc', g, V(this.pad.x, 0.05, this.pad.z), V(1.0, 0.03, 1.0), C(1, 0.96, 0.7, 0.9), 'Cylinder');
  },
  // sıradaki gelişim: en ucuz sonraki seviye
  Next() {
    let best = null;
    for (const k of Object.keys(Data.Upgrades)) { const u = Data.Upgrades[k], lv = Game.UpgLv(k); if (lv >= u.cost.length) continue; const c = u.cost[lv]; if (!best || c < best.cost) best = { k, cost: c, u }; }
    return best;
  },
  Tick(dt) {
    const P = Game.player, st = Game.st; if (!P || !st) return;
    if (this.ring && alive(this.ring)) this.ring.scale.setScalar(1 + 0.05 * Math.sin(Time.time * 3));
    const n = this.Next(); st.hr = st.hr || { k: '', paid: 0 };
    if (n && st.hr.k !== n.k) { st.hr.k = n.k; st.hr.paid = Math.min(st.hr.paid, n.cost - 1); if (st.hr.paid < 0) st.hr.paid = 0; }
    if (Hotel.view === 0 && n && Vec.flat(P.pos, this.pad) < 10) {
      UI.Label('hr', V(this.pad.x, 1.9, this.pad.z), `${n.u.icon} ${n.u.name} · ${UI.fmt(st.hr.paid)}/${UI.fmt(n.cost)}`, 'buy', () => P.GoTo(this.pad, 0));
    }
    if (!n || P.floor !== 0 || P.liftT > 0 || UI.Blocking || !P.Near(this.pad, 0.8)) return;
    if (st.money < 1) { this.hint -= dt; if (this.hint <= 0) { this.hint = 6; UI.Hint('Geliştirme için paran yetmiyor', 2); } return; }
    // para kasadan halıya akar: yaklaşık 4 saniyede tamamlanır
    const chunk = Math.min(n.cost - st.hr.paid, st.money, Math.max(1, n.cost * dt / 4));
    this.t -= dt;
    st.money -= chunk; st.hr.paid += chunk;
    if (this.t <= 0) { this.t = 0.12; Tween.FloatText(Vec.add(P.pos, V(Random.Range(-0.3, 0.3), 1.9, 0)), '₺', C(1, 0.85, 0.3), 0.09); Sfx.Play('tick', 0.3); }
    if (st.hr.paid >= n.cost - 0.01) {
      st.hr.paid = 0; st.money += n.cost; // BuyUpgrade bedeli kendisi düşer
      Game.BuyUpgrade(n.k);
    }
  },
};

// ---------------- Yeni otele geçiş ----------------
const NewHotel = {
  Count() { return (Game.st && Game.st.hotels) || 1; },
  Mul() { return 1 + 0.15 * (this.Count() - 1); },
  Can() { return Hotel.floors >= Data.Floor.Max && Game.Stars >= 5; },
  Render(body) {
    const n = this.Count(), d = document.createElement('div'), can = this.Can();
    d.className = 'item' + (can ? '' : ' locked');
    d.innerHTML = `<div class="ic">🏙</div><div class="tx"><b>Yeni otele geç · ${n}. otel</b><small>${can ? 'Bu oteli zirveye taşıdın! Yeni bir otelde baştan başla: ünün, başarımların ve anıların kalır, her otel için kalıcı <b>+%15 gelir</b>. Şu an +%' + Math.round((this.Mul() - 1) * 100) + '.' : 'Zirveye çık: ' + Data.Floor.Max + ' oda katı ve 5 yıldız gerekir. Yeni otel kalıcı +%15 gelir getirir.'}</small></div>`;
    if (can) { const b = document.createElement('button'); b.className = 'gold'; b.textContent = 'Geç'; b.addEventListener('click', () => this.Confirm()); d.appendChild(b); }
    body.appendChild(d);
  },
  Confirm() {
    UI.Dialog({ tag: 'YENİ OTEL', title: '🏙 Yeni otele geçilsin mi?', html: '<p>Mevcut otel, odalar, personel ve para sıfırlanır. Başarımların, anıların, albümün ve zincirin kalır. Yeni yerin: <b>' + World.Themes[this.Count() % World.Themes.length].name + '</b>. Yeni otelde <b>her kazanç +%' + Math.round((this.Mul() + 0.15 - 1) * 100) + '</b> olur.</p>', buttons: [{ text: 'Evet, geç', cls: 'gold', act: () => this.Go() }, { text: 'Vazgeç', cls: 'ghost' }] });
  },
  Go() {
    const old = Game.st, fresh = Game.Default(), n = this.Count() + 1;
    for (const k of ['manager', 'look', 'hat', 'celebrated', 'notesRead', 'noteLog', 'ach', 'achInit', 'memories', 'chain', 'chainEarned', 'pets', 'catName', 'flags', 'followers', 'sound', 'music', 'hints', 'photos', 'weddings', 'seasonsSeen', 'chats', 'replies', 'daily', 'lastSeen', 'tutorial', 'questDone']) if (old[k] !== undefined) fresh[k] = old[k];
    fresh.hotels = n; fresh.name = 'Lavanta Oteli ' + n; fresh.money = Data.StartMoney + 400 * (n - 1); fresh.questIdx = 0; fresh.questDone = false;
    Game.loaded = false;
    Store.Set('game', fresh); Store.Save(true);
    try { Store.Raw().__backupDeclined = String(Cloud.backupAt); Store.Touch && Store.Touch(); Store.Save(true); } catch (e) { }
    location.reload();
  },
};
