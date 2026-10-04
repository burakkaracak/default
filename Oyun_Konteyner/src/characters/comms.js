// Şirket içi iletişim kuralları:
// - Mailde herkes "Bey/Hanım" ile hitap eder; üst kadro (Davut, Harun, İbrahim) ise ilk isimle yazar.
// - WhatsApp'ta Bünyamin Burak'a "abi", Burak Bünyamin'e "reis" der; Büşra ile "kuzen" denir.
// - Semanur ile sadece mail. İbrahim Bey maili pek kullanmaz, telefonu sever.
import { G, CH, charDef } from '../core/state.js';
import { addMessage } from '../crm/inbox.js';

export const isTop = (id) => !!charDef(id)?.top;
export const channelsOf = (id) => charDef(id)?.channels || ['yuz', 'telefon', 'mail'];
export const can = (id, ch) => channelsOf(id).includes(ch);
const first = (id) => charDef(id)?.name.split(' ')[0] || id;
const formal = (id) => first(id) + (charDef(id)?.female ? ' Hanım' : ' Bey');

// Hitap: from kişisi to kişisine, kanal: mail | wa | yuz | telefon
export function salute(from, to, via) {
  if (via === 'wa') {
    if (from === 'bunyamin' && to === 'burak') return 'Abi';
    if (from === 'burak' && to === 'bunyamin') return 'Reis';
    if ((from === 'busra' && to === 'burak') || (from === 'burak' && to === 'busra')) return 'Kuzen';
    return isTop(from) ? first(to) : formal(to);
  }
  if (via === 'mail') return isTop(from) ? first(to) : formal(to);
  // Yüz yüze / telefon
  if (from === 'ibrahim' && to === 'burak') return 'Oğlum';
  if (from === 'harun' && to === 'burak') return 'Yeğenim';
  if (from === 'davut' && to === 'burak') return 'Burak';
  if (from === 'bunyamin' && to === 'burak') return 'Abi';
  if (from === 'busra' && to === 'burak') return 'Kuzen';
  return formal(to);
}
export function nameOf(id) { return charDef(id)?.name || id; }
// Kişinin diğerlerince anılışı (dialog başlıkları vb.)
export function refName(id, by = 'burak', via = 'yuz') {
  if (id === 'burak') return 'Burak';
  if (via === 'wa' && id === 'bunyamin' && by === 'burak') return 'Bünyamin (Reis)';
  if (via === 'wa' && id === 'busra') return 'Büşra (Kuzen)';
  return formal(id);
}
function signature(from) {
  const c = charDef(from);
  if (!c) return '';
  if (isTop(from)) return c.name.split(' ')[0];
  return `Saygılarımla,\n${c.name}\n${c.title}`;
}
// Kural uygulanmış iç mesaj. via: mail | wa | call
export function internal({ from, to = 'burak', via = 'mail', subject, body, kind, actions, order, read, cust, ...extra }) {
  if (from === 'semanur') via = 'mail';
  if (via === 'wa' && !can(from, 'wa') && from !== 'burak') via = 'mail';
  if (from === 'ibrahim' && via === 'mail') via = 'call';
  const outgoing = from === 'burak';
  const fromName = nameOf(from);
  let ch = 'ic', text = body, subj = subject;
  if (via === 'mail') text = `${salute(from, to, 'mail')},\n\n${body.charAt(0).toUpperCase() + body.slice(1)}\n\n${signature(from)}`;
  if (via === 'wa') { ch = 'wa'; text = `${salute(from, to, 'wa')}, ${body.charAt(0).toLowerCase() + body.slice(1)}`; }
  if (via === 'call') { subj = `📞 ${outgoing ? nameOf(to) + ' arandı' : fromName + ' aradı'}: ${subject}`; text = `${salute(from, to, 'telefon')}, ${body.charAt(0).toLowerCase() + body.slice(1)}`; }
  return addMessage({ ch, from: fromName, fromId: from, to, toName: nameOf(to), outgoing, read: read ?? outgoing, subject: subj, body: text, kind, actions: actions || [], order, cust, via, ...extra });
}
