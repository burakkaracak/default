// Oyunun kaydedilen bütün durumu G içinde durur (düz JSON). Üç boyutlu nesneler burada tutulmaz.
import balance from '../data/balance.json';
import products from '../data/products.json';
import characters from '../data/characters.json';

export const B = balance;
export const P = products;
export const CH = characters;

export let G = null;
export function setG(g) { G = g; }

export function freshState(mode) {
  const free = mode === 'free';
  const g = {
    v: 1, mode, created: Date.now(), savedAt: Date.now(),
    day: 1, min: B.time.dayStartHour * 60, speed: 1,
    cash: free ? B.freeModeCashTL : B.startCashTL,
    fx: { USD: B.fxStart.USD, EUR: B.fxStart.EUR, hist: [[1, B.fxStart.USD, B.fxStart.EUR]] },
    mat: { stock: {}, price: {}, hist: {} },
    player: { loc: 'store', floor: 2, x: -6, z: -2.2, rot: 0, carry: [], ozguven: 15, analiz: 0 },
    factory: { stations: {}, areas: {}, wos: {}, nextWo: 1, staff: [], nextStaff: 1 },
    orders: [], nextOrder: 1,
    shipments: [], nextShip: 1,
    chars: {},
    showroom: { items: { '0:0': { fam: 'kanepe', fabric: 'keten', color: 'krem', q: 3 }, '0:1': { fam: 'berjer', fabric: 'kadife', color: 'yesil', q: 3 }, '0:4': { fam: 'sehpa', fabric: 'keten', color: 'bej', q: 3 } }, stock: [], floors: { 0: true, 2: true, 3: true } },
    open: { families: P.families.filter((f) => f.open || free).map((f) => f.id), fabrics: P.fabrics.filter((f) => f.open || free).map((f) => f.id) },
    stats: { shipped: 0, produced: 0, revenueTL: 0, mailsSent: 0, containers: 0 },
    month: { income: 0, expense: 0, hist: [] },
    flags: {}, ach: {}, log: [], seen: {},
  };
  for (const m of P.materials) { g.mat.stock[m.id] = m.start * (free ? 3 : 1); g.mat.price[m.id] = m.priceTL; g.mat.hist[m.id] = [m.priceTL]; }
  for (const c of CH.list) if (!c.player) g.chars[c.id] = { trust: c.trust ?? 40, met: false };
  return g;
}

// Mutlak zaman (dakika). Planlanan olaylar bununla karşılaştırılır.
export const now = () => (G.day - 1) * 1440 + G.min;
export const absOf = (day, min) => (day - 1) * 1440 + min;

export function family(id) { return P.families.find((f) => f.id === id); }
export function fabric(id) { return P.fabrics.find((f) => f.id === id); }
export function color(id) { return P.colors.find((c) => c.id === id); }
export function charDef(id) { return CH.list.find((c) => c.id === id); }

export function log(text, kind = 'info') {
  G.log.unshift({ d: G.day, m: G.min, text, kind });
  if (G.log.length > 120) G.log.length = 120;
}
