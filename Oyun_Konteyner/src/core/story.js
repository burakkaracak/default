// Hikaye: bölümler, hedefler, bölüm sonu kutlaması. Hedefler data/chapters.json'dan okunur.
import CHAPTERS from '../data/chapters.json';
import CITIES from '../data/cities.json';
import { G, log } from './state.js';
import { bus } from './bus.js';
import { addMessage } from '../crm/inbox.js';
import { internal } from '../characters/comms.js';

export const CH_LIST = CHAPTERS.list;
export const chapter = () => CH_LIST.find((c) => c.id === (G.chapter || 1));

function checkGoal(g) {
  const c = g.check;
  switch (c.type) {
    case 'flag': return !!G.flags[c.flag];
    case 'stat': return (G.stats[c.stat] || 0) >= c.n;
    case 'met': return !!G.chars[c.who]?.met;
    case 'custLevel': return Object.values(G.customers || {}).filter((x) => x.level >= c.level && x.owner !== 'bunyamin' && (!c.region || CITIES.list.find((k) => k.id === x.city)?.region === c.region)).length >= c.n;
    case 'regionShip': return (G.stats.regionShip?.[c.region] || 0) >= c.n;
    case 'cash': return G.cash >= c.n;
    default: return false;
  }
}
export function goalsState() {
  const ch = chapter(); if (!ch || G.mode === 'free') return [];
  G.goalsDone ||= {};
  return ch.goals.map((g) => ({ ...g, done: !!G.goalsDone[ch.id + ':' + g.id] }));
}
export function evaluate() {
  if (!G || G.mode === 'free') return;
  const ch = chapter(); if (!ch) return;
  G.goalsDone ||= {};
  let changed = false;
  for (const g of ch.goals) {
    const k = ch.id + ':' + g.id;
    if (!G.goalsDone[k] && checkGoal(g)) { G.goalsDone[k] = true; changed = true; bus.emit('goalDone', g); }
  }
  const all = ch.goals.every((g) => G.goalsDone[ch.id + ':' + g.id]);
  if (all && !G.flags['chReady' + ch.id]) {
    G.flags['chReady' + ch.id] = true;
    if (ch.id !== 1) internal({ from: 'busra', via: 'wa', subject: `"${ch.name}" tamamlandı`, body: 'Davut Bey seni 3. kat toplantı odasına çağırıyor, ekibi de topladım. Pasta da var 🎂', kind: 'hatirlatma' });
    bus.emit('chapterReady', ch);
  }
  if (changed) bus.emit('goalsChanged');
}
export function canCelebrate() { const ch = chapter(); return ch && G.mode !== 'free' && G.flags['chReady' + ch.id] && !G.flags['chDone' + ch.id]; }
export function finishChapter() {
  const ch = chapter();
  G.flags['chDone' + ch.id] = true;
  const next = CH_LIST.find((c) => c.id === ch.id + 1);
  if (next) {
    G.chapter = next.id;
    log(`Yeni bölüm: ${next.name}`, 'good');
    internal({ from: 'davut', via: 'mail', subject: `Talimat · Bölüm ${next.id}: ${next.name}`, body: next.intro.replace(/^[^:]+: /, '').replace(/^"|"$/g, '') + '\n\nAçılan pazarlar: ' + next.unlock.map((id) => CITIES.list.find((c) => c.id === id)?.name).join(', '), kind: 'bolum' });
    bus.emit('chapterStart', next);
  } else { G.flags.storyComplete = true; bus.emit('storyComplete'); }
  return { ch, next };
}
for (const ev of ['tick', 'hour', 'orders', 'met', 'shipDeparted', 'delivered', 'custLevel', 'stat', 'flag', 'approval', 'mailSent']) bus.on(ev, () => { if (ev !== 'tick' || Math.random() < 0.05) evaluate(); });
export function setFlag(f, v = true) { G.flags[f] = v; bus.emit('flag', f); }
export function stat(k, d = 1) { G.stats[k] = (G.stats[k] || 0) + d; bus.emit('stat', k); }
