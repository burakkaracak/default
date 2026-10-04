// Üretim simülasyonu: iş emirleri (WO) reçetedeki istasyonlardan birim birim geçer.
// Oyuncu istasyonda durursa yardım eder, çıkış tepsisindeki ürünleri taşıyabilir. Depocu yoksa forklift yavaş taşır.
import { G, B, P, family, log } from '../core/state.js';
import { bus } from '../core/bus.js';
import { clamp, rand, pick } from '../core/util.js';
import locs from '../data/locations.json';

export const STATIONS = locs.factory.stations;
export const ST = Object.fromEntries(STATIONS.map((s) => [s.id, s]));
const FIRST_NAMES = ['Ahmet', 'Mehmet', 'Ali', 'Hasan', 'Mustafa', 'Hüseyin', 'Osman', 'Yusuf', 'Kemal', 'Recep', 'Emre', 'Cem', 'Murat', 'Zeynep', 'Ayşe', 'Fatma', 'Elif', 'Hatice', 'Merve', 'Deniz', 'Selin', 'Gül', 'Erkan', 'Tuncay', 'Sinan', 'Okan'];
const LAST = ['Usta', 'Yılmaz', 'Demir', 'Kaya', 'Çelik', 'Şahin', 'Aydın', 'Öztürk', 'Arslan', 'Doğan', 'Kılıç', 'Koç'];
export const ROLES = {
  usta: { name: 'Usta', desc: 'Bir istasyonda çalışır; yeteneği hız ve kaliteyi belirler.' },
  depocu: { name: 'Depocu', desc: 'İstasyonlar arası taşımayı yapar (forklift beklemeye gerek kalmaz).' },
  kalite: { name: 'Kalite Kontrolcü', desc: 'Kalite kontrol istasyonunda çalışır; hatalı ürünü yakalar, yıldızı yükseltir.' },
  tasarimci: { name: 'İç Mimar / Tasarımcı', desc: 'Tasarım stüdyosunda araştırma puanı üretir; showroom güzelliğini artırır.' },
  satis: { name: 'Satış Asistanı', desc: 'Basit müşteri isteklerini (katalog, fiyat listesi) senin yerine cevaplar.' },
};

export function initFactory(g) {
  for (const s of STATIONS) g.factory.stations[s.id] = { lvl: 1, q: [], cur: null, out: {}, outT: 0, block: null };
  // Başlangıç kadrosu: kalite kontrol ve depocu yok.
  const start = [['ahsap', 3], ['demir', 2], ['doseme', 3], ['kumas', 2], ['boya', 2], ['paket', 2]];
  for (const [st, sk] of start) hire(g, 'usta', sk, st, true);
}

export function newWorker(role, skill) {
  const name = pick(FIRST_NAMES) + ' ' + (role === 'usta' && Math.random() < 0.5 ? 'Usta' : pick(LAST));
  const sk = skill ?? clamp(Math.round(rand(1, 4.4)), 1, 5);
  const base = B.salaries[role];
  return { name, role, skill: sk, xp: 0, motiv: rand(0.75, 0.95), salary: Math.round(base * (0.75 + sk * 0.12) / 500) * 500, station: null, look: Math.floor(Math.random() * 5) };
}
export function hire(g, role, skill, station, silent) {
  const w = newWorker(role, skill); w.id = 'w' + g.factory.nextStaff++; w.station = station || null;
  if (role === 'kalite') w.station = 'kalite';
  g.factory.staff.push(w);
  if (!silent) { log(`${w.name} (${ROLES[role].name}) işe başladı.`, 'good'); bus.emit('staffChanged'); }
  return w;
}

const st = (id) => G.factory.stations[id];
export const workersAt = (id) => G.factory.staff.filter((w) => w.station === id && (w.role === 'usta' || w.role === 'kalite'));
export const depocular = () => G.factory.staff.filter((w) => w.role === 'depocu');
export const slots = (id) => st(id).lvl + (id === 'kalite' ? 0 : 0);
export const qcStaffed = () => workersAt('kalite').length > 0;

export const runtime = { playerStation: null }; // oyuncunun içinde durduğu istasyon

function lvlMult(id) {
  let m = 1 + 0.3 * (st(id).lvl - 1);
  if (G.factory.areas.ekhol && (id === 'doseme' || id === 'kumas')) m *= 1.6;
  if (G.factory.areas.ikincikat && (id === 'paket' || id === 'kalite')) m *= 1.4;
  return m;
}
export function stationSpeed(id) {
  let s = 0;
  for (const w of workersAt(id)) s += (0.5 + w.skill / 6) * w.motiv;
  if (runtime.playerStation === id && G.player.loc === 'factory') s += B.playerHelpBonus;
  return s * lvlMult(id);
}
export function recipe(wo) { return family(wo.fam).stations; }
export function nextStation(wo, from) {
  const r = recipe(wo); let i = r.findIndex((x) => x[0] === from);
  for (let j = i + 1; j < r.length; j++) {
    if (r[j][0] === 'kalite' && !qcStaffed() && runtime.playerStation !== 'kalite') continue;
    return r[j][0];
  }
  return 'dock';
}
function needMinutes(wo, sid) {
  const r = recipe(wo).find((x) => x[0] === sid); const size = P.sizes.find((s) => s.id === wo.size);
  return (r ? r[1] : 20) * (size?.timeMult || 1) * (wo.erpClean ? 0.9 : 1);
}

export function matNeeds(wo) {
  const f = family(wo.fam), m = { ...f.materials };
  const kum = m.kumas || 0; delete m.kumas;
  if (kum > 0 && !f.fabricless) m[wo.fabric] = (m[wo.fabric] || 0) + kum * (wo.size === 'ozel' ? 1.15 : 1);
  return m;
}
function hasMaterials(wo) { const m = matNeeds(wo); for (const k in m) if ((G.mat.stock[k] || 0) < m[k] - 1e-6) return k; return null; }
function consume(wo) { const m = matNeeds(wo); for (const k in m) G.mat.stock[k] = Math.max(0, (G.mat.stock[k] || 0) - m[k]); }

export function createWO(spec) {
  const id = 'WO' + String(G.factory.nextWo++).padStart(3, '0');
  const wo = Object.assign({ id, order: null, purpose: 'stock', fam: 'kanepe', fabric: 'keten', color: 'krem', size: 'std', qty: 1, released: 0, packed: 0, shipped: 0, qSum: 0, qN: 0, created: G.day, prio: 0, wrong: null, fake: false, erpClean: false }, spec);
  G.factory.wos[id] = wo;
  const first = recipe(wo)[0][0];
  enqueue(first, wo.id, wo.qty);
  bus.emit('woCreated', wo);
  return wo;
}
export function enqueue(sid, woId, n) {
  if (sid === 'dock') { const wo = G.factory.wos[woId]; if (!wo) return; wo.packed += n; G.stats.produced += n; bus.emit('packed', wo, n); if (wo.packed >= wo.qty && !wo.doneDay) { wo.doneDay = G.day; bus.emit('woDone', wo); } return; }
  const q = st(sid).q, last = q[q.length - 1];
  if (last && last.wo === woId) last.n += n; else q.push({ wo: woId, n });
}
const qCount = (sid) => st(sid).q.reduce((a, e) => a + e.n, 0);
export const outCount = (sid) => Object.values(st(sid).out).reduce((a, b) => a + b, 0);
export const inCount = qCount;

function takeNext(sid) {
  const s = st(sid);
  if (!s.q.length) return null;
  // Öncelikli işler önce
  let idx = 0, best = -1;
  s.q.forEach((e, i) => { const p = G.factory.wos[e.wo]?.prio || 0; if (p > best) { best = p; idx = i; } });
  const e = s.q[idx]; const wo = G.factory.wos[e.wo];
  if (!wo) { s.q.splice(idx, 1); return null; }
  const isFirst = recipe(wo)[0][0] === sid;
  if (isFirst) {
    const miss = hasMaterials(wo);
    if (miss) { if (s.block !== miss) { s.block = miss; bus.emit('materialShort', miss, wo); } return null; }
    consume(wo); wo.released++;
  }
  s.block = null;
  e.n--; if (e.n <= 0) s.q.splice(idx, 1);
  return { wo: wo.id, p: 0, need: needMinutes(wo, sid) };
}

function unitQuality(sid) {
  const ws = workersAt(sid);
  let skill = ws.length ? ws.reduce((a, w) => a + w.skill, 0) / ws.length : 3;
  if (runtime.playerStation === sid && !ws.length) skill = 3;
  const lvl = st(sid).lvl;
  return clamp(0.55 * skill + 0.45 * (2 + lvl) + rand(-0.6, 0.6) + (G.research?.qualityBonus || 0), 1, 5);
}

export function tick(dm) {
  const dep = depocular();
  const transferT = dep.length ? B.depocuTransferMinutes / Math.min(3, dep.length) : B.autoTransferMinutes;
  for (const s of STATIONS) {
    const S = st(s.id);
    const sp = stationSpeed(s.id);
    if (s.id === 'kalite' && sp === 0 && S.q.length) { // kontrolcü yoksa bekleyenler doğrudan pakete geçer
      for (const e of S.q) enqueue(nextStation(G.factory.wos[e.wo] || { fam: 'kanepe' }, 'kalite'), e.wo, e.n);
      S.q = [];
    }
    if (sp > 0) {
      if (!S.cur) S.cur = takeNext(s.id);
      if (S.cur) {
        S.cur.p += dm * sp;
        if (S.cur.p >= S.cur.need) {
          const wo = G.factory.wos[S.cur.wo];
          if (wo) {
            let q = unitQuality(s.id);
            if (s.id === 'kalite') q = Math.max(q, 3.2);
            wo.qSum += q; wo.qN++;
            S.out[wo.id] = (S.out[wo.id] || 0) + 1;
          }
          S.cur = null;
          bus.emit('unitDone', s.id);
        }
      }
    }
    // Taşıma (forklift / depocu)
    if (outCount(s.id) > 0) {
      S.outT += dm;
      if (S.outT >= transferT) { S.outT = 0; for (const wo in S.out) { if (S.out[wo] > 0) enqueue(nextStation(G.factory.wos[wo] || { fam: 'kanepe' }, s.id), wo, S.out[wo]); } S.out = {}; bus.emit('transferred', s.id); }
    } else S.outT = 0;
  }
}

// Oyuncu istasyon alanına girince/dururken: bırak ve al.
export function playerAtStation(sid) {
  let changed = false;
  const carry = G.player.carry;
  for (let i = carry.length - 1; i >= 0; i--) {
    const c = carry[i]; const wo = G.factory.wos[c.wo];
    if (!wo) { carry.splice(i, 1); continue; }
    if (nextStation(wo, c.from) === sid) { enqueue(sid, c.wo, c.n); carry.splice(i, 1); changed = 'drop'; }
  }
  if (sid !== 'dock') {
    const S = st(sid);
    let free = capacity() - carry.reduce((a, c) => a + c.n, 0);
    for (const wo in S.out) {
      if (free <= 0) break;
      const n = Math.min(free, S.out[wo]);
      if (n > 0) { S.out[wo] -= n; if (S.out[wo] <= 0) delete S.out[wo]; free -= n; const ex = carry.find((c) => c.wo === wo && c.from === sid); if (ex) ex.n += n; else carry.push({ wo, from: sid, n }); changed = changed || 'pick'; S.outT = 0; }
    }
  }
  return changed;
}
export const capacity = () => B.carryCapacity + (G.flags.carryBonus || 0);
export const carried = () => G.player.carry.reduce((a, c) => a + c.n, 0);

export function woStars(wo) {
  if (!wo.qN) return 0;
  let q = wo.qSum / wo.qN + (qcStaffed() ? 0.3 : 0);
  return clamp(Math.round(q), 1, 5);
}
export function woProgress(wo) {
  // Kaba ilerleme: tamamlanan istasyon-birim sayısı / toplam
  const r = recipe(wo).length;
  return clamp((wo.qN / (wo.qty * r)) * 0.9 + (wo.packed / wo.qty) * 0.1, 0, 1);
}
export function stationLoadMinutes(sid) {
  const S = st(sid); let m = S.cur ? Math.max(0, S.cur.need - S.cur.p) : 0;
  for (const e of S.q) { const wo = G.factory.wos[e.wo]; if (wo) m += needMinutes(wo, sid) * e.n; }
  return m;
}
// Termin tahmini (gün): darboğaz istasyonun yükü + bu işin süresi
export function estimateDays(fam, qty, size = 'std') {
  const f = family(fam); let worst = 0;
  for (const [sid, min] of f.stations) {
    const sp = Math.max(0.35, stationSpeed(sid) - (runtime.playerStation === sid ? B.playerHelpBonus * lvlMult(sid) : 0));
    const load = stationLoadMinutes(sid) + min * qty * (size === 'ozel' ? 1.45 : 1);
    worst = Math.max(worst, load / sp);
  }
  return Math.ceil(worst / B.workMinutesPerDay + f.stations.length * (depocular().length ? 0.05 : 0.25) + 0.5);
}
export function monthlySalaries() { return G.factory.staff.reduce((a, w) => a + w.salary, 0); }

// Çalışanların zamanla gelişmesi
bus.on('dayEnd', () => {
  if (!G) return;
  for (const w of G.factory.staff) {
    if (w.station || w.role === 'depocu') { w.xp += 1; if (w.xp >= 12 * w.skill && w.skill < 5) { w.skill++; w.xp = 0; log(`${w.name} ustalaştı: yetenek ${w.skill}.`, 'good'); } }
    w.motiv = clamp(w.motiv + rand(-0.03, 0.025) + (G.flags.teamEvent ? 0.05 : 0), 0.55, 1.1);
  }
});
