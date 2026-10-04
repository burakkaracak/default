// Gelen Kutusu: Müşteriler ve İç Yazışmalar. Mesaj düğmeleri kayda uygun olsun diye isimli eylemlerle çalışır.
import { G } from '../core/state.js';
import { bus } from '../core/bus.js';

export const ACTIONS = {}; // ad -> fn(msg, args) ; true dönerse mesajın düğmeleri kapanır
export function registerAction(name, fn) { ACTIONS[name] = fn; }

let seq = 1;
export function addMessage(m) {
  G.inbox ||= [];
  const msg = Object.assign({ id: 'm' + Date.now().toString(36) + (seq++), ch: 'musteri', from: '', fromId: null, subject: '', body: '', day: G.day, min: G.min, read: false, actions: [], done: false }, m);
  G.inbox.unshift(msg);
  if (G.inbox.length > 260) G.inbox.length = 260;
  bus.emit('mail', msg);
  return msg;
}
export function runAction(msg, a) {
  const fn = ACTIONS[a.act];
  if (!fn) return;
  const r = fn(msg, a.args || {}, a);
  Promise.resolve(r).then((res) => { if (res !== false) { msg.done = true; msg.chosen = a.label; } bus.emit('inboxChanged'); });
}
export const unread = (ch) => (G.inbox || []).filter((m) => !m.read && (!ch || m.ch === ch)).length;
export const pendingActions = () => (G.inbox || []).filter((m) => !m.done && m.actions?.length).length;
