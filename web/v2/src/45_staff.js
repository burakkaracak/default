// Personel: resepsiyonist (bankoda bekler, sırayı alır), temizlikçi (kirli odaları temizler), kat görevlisi (istekleri taşır), tesis personeli (Facilities).
// Her çalışanın seviyesi (XP), morali ve kişiliği var: hız ve maaşı etkiler. Veri Game.st.staffData[key] içinde saklanır.
class Staff extends Behaviour {
  static Traits = [
    { id: 'titiz', name: 'Titiz', icon: '✨', desc: 'İşini özenle yapar: misafirler biraz daha memnun kalır.', speed: 0.95, moraleDecay: 1, sat: 0.2 },
    { id: 'neseli', name: 'Neşeli', icon: '😊', desc: 'Morali kolay bozulmaz, etrafına da neşe saçar.', speed: 1, moraleDecay: 0.6, sat: 0.1 },
    { id: 'hizli', name: 'Hızlı', icon: '⚡', desc: 'Herkesten çabuk iş bitirir.', speed: 1.18, moraleDecay: 1.1, sat: 0 },
    { id: 'dalgin', name: 'Dalgın', icon: '💭', desc: 'Biraz yavaş ama maaşı düşük.', speed: 0.85, moraleDecay: 1, sat: 0, wage: 0.8 },
    { id: 'caliskan', name: 'Çalışkan', icon: '💪', desc: 'Yorulmak bilmez; morali yavaş düşer.', speed: 1.05, moraleDecay: 0.75, sat: 0 },
  ];
  static XP = [0, 60, 160, 320];  // seviye 1-4 eşikleri
  static MaxLevel = 4;
  static TrainCost(lv) { return [0, 180, 400, 900][lv] || 0; }

  constructor(role, key) {
    super(); this.go.name = 'Personel';
    this.role = role; this.key = key;
    const sd = Game.st.staffData[key] || {};
    this.name = sd.name || Random.Pick(Random.Chance(0.5) ? Data.Names.f : Data.Names.m);
    this.lv = sd.lv || 1; this.xp = sd.xp || 0; this.morale = sd.morale ?? 0.85;
    this.trait = Staff.Traits.find(t => t.id === sd.trait) || Random.Pick(Staff.Traits);
    this.look = sd.look;
    const def = Data.Staff[role];
    if (!this.look) this.look = def.look ? Random.Pick(def.look) : role === 'receptionist' ? 'character-female-d' : role === 'cleaner' ? Random.Pick(['character-female-b', 'character-male-b']) : 'character-male-e';
    this.rig = Rig.Model(this.go, this.look, 1.72);
    this.floor = 0; this.path = []; this.liftT = 0; this.task = null; this.work = 0; this.idleT = 0; this.tasksDone = sd.tasks || 0;
    this.go.position.set(10, 0, 4);
    this.tag = U.Text(this.go, V(0, 2.2, 0), def.icon + ' ' + this.name, 0.055, C(0.75, 0.95, 1), true);
    this.mood = U.Text(this.go, V(0, 2.65, 0), '', 0.09, Col.white, true); this.mood.obj.visible = false; this.moodT = 0;
    if (role === 'receptionist') { this.go.position.copy(Hotel.Lobby.deskBack); setEuler(this.go, 0, 0, 0); }
    this.Persist();
  }
  get pos() { return this.go.position; }
  get def() { return Data.Staff[this.role]; }
  // hız/verim çarpanı: seviye, kişilik, moral
  get Eff() { return (1 + 0.2 * (this.lv - 1)) * this.trait.speed * (this.morale < 0.3 ? 0.6 : this.morale < 0.55 ? 0.85 : 1) * Game.UpgMul('staff'); }
  get speed() { const m = Game.UpgMul('staff'); return 3.6 * Math.min(1.5, this.Eff / m) * m; }  // yükseltme üst sınırın dışında
  set speed(v) { }
  get Wage() { return Math.round(this.def.wage * (1 + 0.15 * (this.lv - 1)) * (this.trait.wage || 1)); }
  get NextXP() { return Staff.XP[this.lv] ?? null; }
  Persist() { Game.st.staffData[this.key] = { name: this.name, lv: this.lv, xp: this.xp, morale: this.morale, trait: this.trait.id, look: this.look, tasks: this.tasksDone }; }
  Rename(n) { this.name = n; this.tag.text = this.def.icon + ' ' + n; this.Persist(); }
  ShowMood(t, sec = 2) { this.mood.text = t; this.mood.obj.visible = true; this.moodT = sec; }
  GainXP(n) {
    this.tasksDone++; this.xp += n;
    if (this.lv < Staff.MaxLevel && this.xp >= Staff.XP[this.lv]) { this.lv++; this.ShowMood('⬆ Lv ' + this.lv, 3); UI.Toast(this.name + ' seviye atladı: ' + this.lv, 'good'); Sfx.Play('unlock', 0.5); U.Burst(Vec.add(this.pos, V(0, 2, 0)), C(1, 0.85, 0.3), C(0.5, 0.9, 1), 30, 4); }
    this.Persist();
  }
  Train() {
    if (this.lv >= Staff.MaxLevel) return false;
    const cost = Staff.TrainCost(this.lv); if (!Game.Pay(cost)) return false;
    this.lv++; this.xp = Math.max(this.xp, Staff.XP[this.lv - 1]); this.ShowMood('🎓', 3); this.Persist(); UI.Toast(this.name + ' eğitim aldı: seviye ' + this.lv, 'good'); Sfx.Play('unlock', 0.5); return true;
  }
  Bonus() {
    const cost = this.Wage * 2; if (!Game.Pay(cost)) return false;
    this.morale = Math.min(1, this.morale + 0.4); this.ShowMood('🥰', 3); this.Persist(); UI.Toast(this.name + ' ikramiyeye çok sevindi', 'good'); Sfx.Play('heart', 0.6); return true;
  }
  NewDay() {
    this.morale = Math.max(0, this.morale - 0.1 * this.trait.moraleDecay);
    if (this.morale < 0.3) this.ShowMood('😞', 4);
    this.Persist();
  }
  Go(p, f) { this.path = Hotel.Path(this.pos, this.floor, p, f ?? this.floor); }
  Update() {
    const dt = Time.deltaTime; if (dt <= 0) return;
    if (this.moodT > 0) { this.moodT -= dt; if (this.moodT <= 0) this.mood.obj.visible = false; }
    if (this.liftT > 0) { this.liftT -= dt; this.rig.Tick(0); if (this.liftT <= 0) { this.floor = this.liftTo; this.pos.y = Hotel.FloorY(this.floor); } return; }
    if (this.path.length) {
      const n = this.path[0];
      if (n.lift !== undefined) { this.path.shift(); this.liftTo = n.lift; this.liftT = 0.9; this.pos.set(n.x, this.pos.y, n.z); return; }
      if (!U.Walk(this.go, this.path, this.speed, this.rig)) return;
    }
    if (this.role === 'receptionist') return this.ReceptionTick(dt);
    if (this.role === 'cleaner') return this.CleanerTick(dt);
    if (this.role === 'bellhop') return this.BellhopTick(dt);
    Facilities.StaffTick(this, dt);
  }
  ReceptionTick(dt) {
    this.rig.Tick(0); setEuler(this.go, 0, 0, 0);
    const g = Game.queue[0];
    if (!g || g.slot !== 0 || Vec.flat(g.pos, Hotel.QueueSlot(0)) > 0.6) { this.work = 0; return; }
    const room = Game.FreeRoom(g);
    if (!room) return;
    this.work += dt / 2.0 * this.Eff; Game.ShowProgress(Hotel.Lobby.desk, this.work);
    if (this.work >= 1) { this.work = 0; g.sat += this.trait.sat; g.Assign(room); Sfx.Play('ding', 0.5); this.GainXP(5); }
  }
  CleanerTick(dt) {
    if (!this.task) {
      this.idleT -= dt; if (this.idleT > 0) { this.rig.Tick(0); return; }
      const r = Game.DirtyRooms().filter(x => !x.claimed).sort((a, b) => Math.abs(a.floor - this.floor) - Math.abs(b.floor - this.floor))[0];
      if (!r) { this.idleT = 1.5; this.rig.Tick(0); if (this.floor !== 0 && Random.Chance(0.02)) this.Go(V(10, 0, 4), 0); return; }
      this.task = r; r.claimed = this; this.work = 0; this.Go(r.inside, r.floor); return;
    }
    const r = this.task;
    if (r.state !== 'dirty') { r.claimed = null; this.task = null; return; }
    this.rig.act = Rig.Act.Clean; this.rig.Tick(0);
    this.work += dt / 4.5 * this.Eff; Game.ShowProgress(V(r.x, Hotel.FloorY(r.floor), r.z), this.work);
    if (this.work >= 1) { Game.CleanDone(r, false); if (r.guestNext) { } this.rig.act = Rig.Act.None; r.claimed = null; this.task = null; this.idleT = 0.5; this.GainXP(6); }
  }
  BellhopTick(dt) {
    if (!this.task) {
      this.idleT -= dt; if (this.idleT > 0) { this.rig.Tick(0); return; }
      const r = Game.RequestRooms().filter(x => !x.request.claimed)[0];
      if (!r) { this.idleT = 1.5; this.rig.Tick(0); return; }
      this.task = r; r.request.claimed = this; this.work = 0; this.Go(r.inside, r.floor); return;
    }
    const r = this.task;
    if (!r.request) { this.task = null; return; }
    this.rig.Tick(0); this.work += dt / 2.2 * this.Eff; Game.ShowProgress(V(r.x, Hotel.FloorY(r.floor), r.z), this.work);
    if (this.work >= 1) { if (r.request.guest && alive(r.request.guest)) r.request.guest.sat += this.trait.sat; Game.RequestDone(r, false); this.task = null; this.idleT = 0.4; this.GainXP(6); }
  }
}
