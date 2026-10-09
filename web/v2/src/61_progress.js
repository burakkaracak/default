// İlerleme: başarımlar (Ach), anı albümü ve anılar (Album), otel zinciri / şubeler (Chain).
// Albüm fotoğrafları kayıtta değil, bu cihazın deposunda tutulur (buluta gitmez). Anı metinleri kayıttadır.

// ================= Başarımlar =================
const Ach = {
  List: [
    { id: 'misafir1', icon: '🛎', name: 'İlk misafir', desc: 'İlk misafirini ağırla', cur: () => Game.st.served, target: 1, reward: 50 },
    { id: 'misafir10', icon: '🧳', name: 'On misafir', desc: '10 misafir ağırla', cur: () => Game.st.served, target: 10, reward: 100 },
    { id: 'misafir50', icon: '🧳', name: 'Elli misafir', desc: '50 misafir ağırla', cur: () => Game.st.served, target: 50, reward: 300 },
    { id: 'misafir150', icon: '🏨', name: 'Dolu dolu', desc: '150 misafir ağırla', cur: () => Game.st.served, target: 150, reward: 800 },
    { id: 'misafir500', icon: '🏆', name: 'Koyun gözdesi', desc: '500 misafir ağırla', cur: () => Game.st.served, target: 500, reward: 3000, mem: true },
    { id: 'oda4', icon: '🚪', name: 'Dört oda', desc: '4 oda aç', cur: () => Game.OpenRooms().length, target: 4, reward: 100 },
    { id: 'oda10', icon: '🚪', name: 'On oda', desc: '10 oda aç', cur: () => Game.OpenRooms().length, target: 10, reward: 400 },
    { id: 'oda20', icon: '🏢', name: 'Yirmi oda', desc: '20 oda aç', cur: () => Game.OpenRooms().length, target: 20, reward: 1200 },
    { id: 'oda40', icon: '🏙', name: 'Dev otel', desc: '40 oda aç', cur: () => Game.OpenRooms().length, target: 40, reward: 4000, mem: true },
    { id: 'kat2', icon: '⬆', name: 'Yükseliş', desc: '2. katı aç', cur: () => Hotel.floors, target: 2, reward: 300 },
    { id: 'kat4', icon: '🗼', name: 'Gökdelen', desc: '4. katı aç', cur: () => Hotel.floors, target: 4, reward: 2500 },
    { id: 'tesis1', icon: '☕', name: 'İlk tesis', desc: 'Bir tesis aç', cur: () => Ach.Facs(), target: 1, reward: 200 },
    { id: 'tesis4', icon: '🍝', name: 'Dört tesis', desc: '4 tesis aç', cur: () => Ach.Facs(), target: 4, reward: 1000 },
    { id: 'tesis7', icon: '🌴', name: 'Her şey var', desc: '7 tesisin hepsini aç', cur: () => Ach.Facs(), target: 7, reward: 5000, mem: true },
    { id: 'personel3', icon: '👥', name: 'Küçük ekip', desc: '3 personel çalıştır', cur: () => Game.staff.length, target: 3, reward: 200 },
    { id: 'personel10', icon: '👥', name: 'Büyük aile', desc: '10 personel çalıştır', cur: () => Game.staff.length, target: 10, reward: 1500 },
    { id: 'usta', icon: '🎓', name: 'Usta personel', desc: 'Bir personeli 4. seviyeye çıkar', cur: () => Math.max(0, ...Game.staff.map(s => s.lv)), target: 4, reward: 800 },
    { id: 'yildiz2', icon: '⭐', name: 'İki yıldız', desc: '2 yıldızlı otel ol', cur: () => Game.Stars, target: 2, reward: 300 },
    { id: 'yildiz3', icon: '⭐', name: 'Üç yıldız', desc: '3 yıldızlı otel ol', cur: () => Game.Stars, target: 3, reward: 1000 },
    { id: 'yildiz4', icon: '🌟', name: 'Dört yıldız', desc: '4 yıldızlı otel ol', cur: () => Game.Stars, target: 4, reward: 3000 },
    { id: 'yildiz5', icon: '🌟', name: 'Beş yıldız', desc: '5 yıldızlı otel ol', cur: () => Game.Stars, target: 5, reward: 10000, mem: true },
    { id: 'dekor', icon: '🎨', name: 'Dekoratör', desc: 'Bir odanın konforunu 100 yap', cur: () => Math.max(0, ...Game.OpenRooms().map(r => { const z = Decor.Zone('oda' + r.id); return z ? Decor.Comfort(z) : 0; })), target: 100, reward: 1000 },
    { id: 'takip100', icon: '📱', name: 'Takipçi 100', desc: "Otelgram'da 100 takipçi", cur: () => Game.st.followers, target: 100, reward: 200 },
    { id: 'takip500', icon: '📱', name: 'Takipçi 500', desc: "Otelgram'da 500 takipçi", cur: () => Game.st.followers, target: 500, reward: 1500 },
    { id: 'yanit1', icon: '💬', name: 'Kibar cevap', desc: 'Bir Otelgram yorumuna yanıt ver', cur: () => Game.st.replies || 0, target: 1, reward: 100 },
    { id: 'yanit10', icon: '💬', name: 'Yorum ustası', desc: '10 yoruma yanıt ver', cur: () => Game.st.replies || 0, target: 10, reward: 800 },
    { id: 'sohbet10', icon: '🗨', name: 'Sohbetçi', desc: '10 misafirle sohbet et', cur: () => Game.st.chats || 0, target: 10, reward: 500 },
    { id: 'mektup1', icon: '✉', name: 'İlk mektup', desc: 'Bir misafirden mektup al', cur: () => (Game.st.letters || []).length, target: 1, reward: 150 },
    { id: 'hikaye', icon: '💌', name: 'Hikâyenin sonu', desc: 'Bir mektup hikâyesini sonuna kadar oku', cur: () => Math.max(0, ...Object.values(Game.st.arcs || {})), target: 3, reward: 1000, mem: true },
    { id: 'milyoner', icon: '🎩', name: 'Sürpriz!', desc: 'Gizli milyonerden bahşiş al', cur: () => (Game.st.flags || {}).milyoner ? 1 : 0, target: 1, reward: 500 },
    { id: 'mufettis', icon: '🕵', name: 'Müfettiş onayı', desc: 'Müfettişten iyi rapor al', cur: () => (Game.st.flags || {}).mufettis ? 1 : 0, target: 1, reward: 500 },
    { id: 'tamirci', icon: '🔧', name: 'Tamirci', desc: '3 arızayı kendin onar', cur: () => Game.st.repairs || 0, target: 3, reward: 400 },
    { id: 'foto1', icon: '📷', name: 'İlk fotoğraf', desc: 'Bir fotoğraf çek', cur: () => Game.st.photos || 0, target: 1, reward: 100 },
    { id: 'foto10', icon: '🖼', name: 'Anı defteri', desc: '10 fotoğraf çek', cur: () => Game.st.photos || 0, target: 10, reward: 500 },
    { id: 'mevsim', icon: '🍂', name: 'Dört mevsim', desc: 'Dört mevsimi de gör', cur: () => (Game.st.seasonsSeen || []).length, target: 4, reward: 1000 },
    { id: 'dugun1', icon: '💍', name: 'İlk düğün', desc: 'Otelinde bir düğün yap', cur: () => Game.st.weddings || 0, target: 1, reward: 1000, mem: true },
    { id: 'dugun5', icon: '💐', name: 'Düğün sarayı', desc: '5 düğün yap', cur: () => Game.st.weddings || 0, target: 5, reward: 4000 },
    { id: 'zincir1', icon: '🌊', name: 'İkinci şube', desc: 'İlk şubeni aç', cur: () => Chain.Count, target: 1, reward: 1500, mem: true },
    { id: 'zincir2', icon: '🎈', name: 'Otel zinciri', desc: 'İki şubenin ikisini de aç', cur: () => Chain.Count, target: 2, reward: 5000, mem: true },
    { id: 'para10k', icon: '💰', name: 'On bin', desc: 'Toplam 10.000 ₺ kazan', cur: () => Game.st.earned, target: 10000, reward: 500 },
    { id: 'para100k', icon: '💰', name: 'Yüz bin', desc: 'Toplam 100.000 ₺ kazan', cur: () => Game.st.earned, target: 100000, reward: 3000 },
    { id: 'para1m', icon: '🤑', name: 'Milyoner otelci', desc: 'Toplam 1.000.000 ₺ kazan', cur: () => Game.st.earned, target: 1e6, reward: 20000, mem: true },
  ],
  t: 2,
  Facs() { return Data.Facilities.filter(d => Facilities.Built(d.id)).length; },
  Done(id) { return !!(Game.st.ach && Game.st.ach[id]); },
  Count() { return this.List.filter(a => this.Done(a.id)).length; },
  Tick(dt) {
    this.t -= dt; if (this.t > 0) return; this.t = 2;
    const st = Game.st; st.ach = st.ach || {};
    // ilk çalıştırma: zaten sağlanmış başarımlar ödülsüz ve sessizce verilir (eski kayıtlarda toast yağmuru olmasın)
    if (!st.achInit) {
      let n = 0; for (const a of this.List) if (a.cur() >= a.target) { st.ach[a.id] = World.day; n++; }
      st.achInit = true; if (n >= 3) UI.Toast('🏆 ' + n + ' başarım zaten kazanılmıştı: Menü → Başarımlar', 'info'); return;
    }
    for (const a of this.List) {
      if (st.ach[a.id] || a.cur() < a.target) continue;
      st.ach[a.id] = World.day; st.money += a.reward;
      UI.Toast('🏆 Başarım: ' + a.name + ' · +' + UI.fmt(a.reward), 'good'); Sfx.Play('unlock', 0.6);
      if (a.mem) Album.Memory(a.icon, 'Başarım: ' + a.name);
      Game.Save();
    }
  },
  Render(body) {
    const st = Game.st, n = this.Count();
    const h = document.createElement('div'); h.className = 'stat'; h.innerHTML = `<span>🏆 Başarımlar</span><b>${n}/${this.List.length}</b>`; body.appendChild(h);
    const m = document.createElement('div'); m.className = 'meter'; m.innerHTML = `<i style="width:${Math.round(100 * n / this.List.length)}%"></i>`; body.appendChild(m);
    const ord = this.List.slice().sort((a, b) => (this.Done(b.id) ? 0 : 1) - (this.Done(a.id) ? 0 : 1) || 0);
    for (const a of ord) {
      const done = this.Done(a.id), cur = Math.min(a.target, Math.floor(a.cur())), d = document.createElement('div');
      d.className = 'item ' + (done ? 'done' : 'locked');
      const prog = done ? `Gün ${st.ach[a.id]} · kazanıldı` : (a.target > 1 ? `${cur}/${a.target >= 1e5 ? UI.fmt(a.target).slice(1) : a.target} · ödül ${UI.fmt(a.reward)}` : 'ödül ' + UI.fmt(a.reward));
      d.innerHTML = `<div class="ic">${done ? a.icon : '🔒'}</div><div class="tx"><b>${UI.esc(a.name)}</b><small>${UI.esc(a.desc)}</small><small>${prog}</small>${!done && a.target > 1 ? `<div class="meter"><i style="width:${Math.round(100 * cur / a.target)}%"></i></div>` : ''}</div>`;
      body.appendChild(d);
    }
  },
};

// ================= Anı albümü =================
const Album = {
  Key: 'otel2_album', Max: 12, Size: 640,
  Items() { try { const a = JSON.parse(localStorage.getItem(this.Key) || '[]'); return Array.isArray(a) ? a.filter(x => x && typeof x.u === 'string') : []; } catch (e) { return []; } },
  Save(a) {
    for (let k = 0; k < 6; k++) { try { localStorage.setItem(this.Key, JSON.stringify(a)); return true; } catch (e) { if (!a.length) return false; a.shift(); } } // kota dolarsa en eskiyi at
    return false;
  },
  Clear() { try { localStorage.removeItem(this.Key); } catch (e) { } },
  // çizim tuvalinden küçük bir JPEG anı kaydeder
  Add(cv) {
    try {
      const k = Math.min(1, this.Size / cv.width), t = document.createElement('canvas'); t.width = Math.round(cv.width * k); t.height = Math.round(cv.height * k);
      t.getContext('2d').drawImage(cv, 0, 0, t.width, t.height);
      const a = this.Items(); a.push({ u: t.toDataURL('image/jpeg', 0.7), day: World.day, clock: World.Clock, stars: Game.Stars, name: Game.st.name });
      while (a.length > this.Max) a.shift();
      this.Save(a); return a.length;
    } catch (e) { return 0; }
  },
  Memory(icon, text) { const st = Game.st; st.memories = st.memories || []; st.memories.unshift({ day: World.day, icon, text }); while (st.memories.length > 40) st.memories.pop(); },
  Render(body) {
    const items = this.Items().reverse(), st = Game.st;
    const h = document.createElement('div'); h.className = 'stat'; h.innerHTML = `<span>📸 Fotoğraflar</span><b>${items.length}/${this.Max}</b>`; body.appendChild(h);
    if (!items.length) { const e = document.createElement('div'); e.className = 'item'; e.innerHTML = '<div class="ic">📷</div><div class="tx"><b>Albüm boş</b><small>Sağ üstteki 📷 düğmesiyle fotoğraf çek. Fotoğraflar bu cihazda saklanır.</small></div>'; body.appendChild(e); }
    const g = document.createElement('div'); g.className = 'photos';
    for (const p of items) { const c = document.createElement('div'); c.className = 'ph'; c.innerHTML = `<img alt="" src="${p.u}"><small>Gün ${p.day} · ${UI.esc(p.clock)} · ${'★'.repeat(p.stars)}</small>`; c.addEventListener('click', () => UI.Dialog({ tag: 'ANI', title: 'Gün ' + p.day + ' · ' + p.clock, html: `<img alt="" style="width:100%;border-radius:14px;margin-bottom:10px" src="${p.u}">`, buttons: [{ text: 'Kapat', cls: 'gold' }] })); g.appendChild(c); }
    body.appendChild(g);
    if ((st.noteLog || []).length) { const nn = document.createElement('div'); nn.className = 'sec'; nn.textContent = '💌 NOTLAR'; body.appendChild(nn); for (const n of st.noteLog) { const d = document.createElement('div'); d.className = 'item'; d.innerHTML = `<div class="ic">💌</div><div class="tx"><b>${UI.esc(n.from)}</b><small style="white-space:pre-line">${UI.esc(n.text)}</small><small>Gün ${n.day}</small></div>`; body.appendChild(d); } }
    const mm = document.createElement('div'); mm.className = 'sec'; mm.textContent = 'ANILAR'; body.appendChild(mm);
    const ms = st.memories || [];
    if (!ms.length) { const e = document.createElement('div'); e.className = 'item'; e.innerHTML = '<div class="ic">📖</div><div class="tx"><b>Henüz anı yok</b><small>Yeni yıldız, düğün, büyük başarımlar ve yeni şubeler buraya yazılır.</small></div>'; body.appendChild(e); }
    for (const m of ms) { const d = document.createElement('div'); d.className = 'item'; d.innerHTML = `<div class="ic">${m.icon}</div><div class="tx"><b>${UI.esc(m.text)}</b><small>Gün ${m.day}</small></div>`; body.appendChild(d); }
  },
};

// ================= Zincir: şubeler (arka planda kazanır) =================
// Şubeler oynanabilir ikinci otel değildir; her yeni günün sonunda kazanç getirir.
// Günlük kazanç = ana otelin son 3 günlük ortalama kazancı × şehir payı × seviye payı × (şube müdürü varsa 1, yoksa 0,5).
// Böylece şube, ana otelin büyüklüğüne göre kendiliğinden ölçeklenir (ölçüm: 2★/4 oda ≈ 2.000/gün, 3★/10 Deluxe oda ≈ 11.500/gün).
const Chain = {
  Cities: [
    { id: 'bodrum', name: 'Bodrum', icon: '🌊', stars: 3, cost: 25000, share: 1, desc: 'Beyaz badanalı duvarlar, palmiyeler ve deniz manzarası. Turistler ve balayı çiftleri bayılır.', bias: { turist: 1.3, balayi: 1.25 } },
    { id: 'kapadokya', name: 'Kapadokya', icon: '🎈', stars: 4, cost: 80000, share: 1.3, desc: 'Peri bacaları ve sabah gökyüzünü dolduran sıcak hava balonları. Balayı çiftleri hayran kalır.', bias: { balayi: 1.5, turist: 1.2 } },
  ],
  LevelMul: [0, 0.2, 0.35, 0.55], UpCost: [0, 0, 15000, 40000], ManagerCost: 5000,
  Get(id) { const st = Game.st; st.chain = st.chain || {}; return st.chain[id] || (st.chain[id] = { lv: 0, mgr: false, earned: 0 }); },
  get Count() { return this.Cities.filter(c => this.Get(c.id).lv > 0).length; },
  Avg() { const a = Game.st.dayLog || []; return a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0; },
  Daily(c) { const b = this.Get(c.id); if (b.lv <= 0) return 0; return Math.round(this.Avg() * c.share * this.LevelMul[b.lv] * (b.mgr ? 1 : 0.5)); },
  Bias(typeId) { let k = 1; for (const c of this.Cities) if (this.Get(c.id).lv > 0 && c.bias[typeId]) k *= c.bias[typeId]; return k; },
  Lines: {
    bodrum: ['Sezon doldu, plajdan misafir akını!', 'Gün batımı terasında yer kalmadı.', 'Bir tekne turu grubu bütün odaları tuttu.'],
    kapadokya: ['Sabah balonları izlemek için misafirler erkenden kalktı.', 'Kar yağdı, şöminenin başı doldu.', 'Fotoğrafçılar vadiyi bu otelden çekmek istiyor.'],
  },
  // yeni gün: şube kazançlarını öder, rapor satırları döner
  NewDay() {
    const st = Game.st, out = []; let total = 0;
    st.dayLog = st.dayLog || []; st.dayLog.push(Math.max(0, st.earned - (st.earnedMark || 0))); st.earnedMark = st.earned; while (st.dayLog.length > 3) st.dayLog.shift();
    for (const c of this.Cities) { const b = this.Get(c.id); if (b.lv <= 0) continue; const n = this.Daily(c); b.earned += n; total += n; out.push({ c, n, line: Random.Pick(this.Lines[c.id]) }); }
    if (total) { Game.st.money += total; Game.st.chainEarned = (Game.st.chainEarned || 0) + total; }
    return { total, out };
  },
  Open(c) {
    const b = this.Get(c.id);
    if (b.lv > 0) return; if (Game.Stars < c.stars) { UI.Toast(c.name + ' için ' + c.stars + ' yıldız gerekir', 'bad'); return; }
    if (!Game.Pay(c.cost)) return;
    b.lv = 1; Game.Save(); Sfx.Play('unlock', 0.9); U.Burst(Vec.add(Game.player.go.position, V(0, 2.2, 0)), C(1, 0.85, 0.3), C(0.5, 0.9, 1), 80, 6);
    Album.Memory(c.icon, c.name + ' şubesini açtın'); Social.Share('{otel} büyüyor: ' + c.name + ' şubesi açıldı!', 1, false);
    UI.Dialog({ tag: 'YENİ ŞUBE', title: c.icon + ' ' + c.name + ' şubesi açıldı!', html: `<p>${UI.esc(c.desc)}</p><p>Şube her yeni günün sonunda kazanç getirir. Bir şube müdürü tutarsan kazanç iki katına çıkar.</p>`, buttons: [{ text: 'Harika!', cls: 'gold' }] });
    UI.RenderSheet();
  },
  Upgrade(c) { const b = this.Get(c.id); if (b.lv < 1 || b.lv >= 3) return; if (!Game.Pay(this.UpCost[b.lv + 1])) return; b.lv++; Game.Save(); UI.Toast(c.name + ' şubesi büyüdü: seviye ' + b.lv, 'good'); UI.RenderSheet(); },
  Hire(c) { const b = this.Get(c.id); if (b.lv < 1 || b.mgr) return; if (!Game.Pay(this.ManagerCost)) return; b.mgr = true; Game.Save(); UI.Toast(c.name + ' şubesine müdür geldi', 'good'); UI.RenderSheet(); },
  Render(body) {
    const tot = Game.st.chainEarned || 0;
    const h = document.createElement('div'); h.className = 'stat'; h.innerHTML = `<span>🏙 Şube kazancı (toplam)</span><b>${UI.fmt(tot)}</b>`; body.appendChild(h);
    const info = document.createElement('div'); info.className = 'item'; info.innerHTML = '<div class="ic">ℹ</div><div class="tx"><small>Şubeler arka planda kendiliğinden kazanır, her yeni günün sonunda ödenir. Her şube ana otelin oda fiyatlarını %5 artırır.</small></div>'; body.appendChild(info);
    for (const c of this.Cities) {
      const b = this.Get(c.id), d = document.createElement('div');
      if (b.lv <= 0) {
        const locked = Game.Stars < c.stars; d.className = 'item' + (locked ? ' locked' : '');
        d.innerHTML = `<div class="ic">${locked ? '🔒' : c.icon}</div><div class="tx"><b>${c.name}</b><small>${UI.esc(c.desc)}</small><small>${locked ? c.stars + ' yıldız gerekir' : 'Günlük ≈ ' + UI.fmt(Math.round(this.Avg() * c.share * this.LevelMul[1] * 0.5)) + ' (müdürsüz, seviye 1)'}</small></div>`;
        if (!locked) { const bt = document.createElement('button'); bt.className = 'mint'; bt.textContent = UI.fmt(c.cost); bt.addEventListener('click', () => this.Open(c)); d.appendChild(bt); }
      } else {
        d.className = 'item done';
        d.innerHTML = `<div class="ic">${c.icon}</div><div class="tx"><b>${c.name} · seviye ${b.lv}${b.mgr ? ' · müdürlü' : ''}</b><small>Günlük ≈ ${UI.fmt(this.Daily(c))} · toplam ${UI.fmt(b.earned)}</small>${b.mgr ? '' : '<small>Şube müdürü yok: kazanç yarıya iner</small>'}</div>`;
        const col = document.createElement('div'); col.className = 'col';
        if (!b.mgr) { const bt = document.createElement('button'); bt.className = 'gold'; bt.textContent = '👔 ' + UI.fmt(this.ManagerCost); bt.addEventListener('click', () => this.Hire(c)); col.appendChild(bt); }
        if (b.lv < 3) { const bt = document.createElement('button'); bt.className = 'sea'; bt.textContent = '⬆ ' + UI.fmt(this.UpCost[b.lv + 1]); bt.addEventListener('click', () => this.Upgrade(c)); col.appendChild(bt); }
        d.appendChild(col);
      }
      body.appendChild(d);
    }
  },
};
if (typeof window !== 'undefined') { window.__Ach = Ach; window.__Album = Album; window.__Chain = Chain; }
