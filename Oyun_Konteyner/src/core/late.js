// Oyunun ileri aşamaları: stratejik ortaklık, yurt dışı showroom, Bünyamin'e strateji önerisi.
import { G, log } from './state.js';
import { bus } from './bus.js';
import { choose, toast, alertBox, confetti } from '../ui/dom.js';
import { fmtTLk } from './util.js';
import { addMessage, registerAction } from '../crm/inbox.js';
import { cust, setLevel, cityOf } from '../crm/customers.js';
import { registerTalk } from '../ui/talk.js';
import { conf } from './confidence.js';
import { addTrust, requestApproval, registerApply } from '../characters/approvals.js';
import { spend } from '../economy/economy.js';
import { addRep } from '../crm/outreach.js';
import { setFlag } from './story.js';
import CITIES from '../data/cities.json';

bus.on('strategicOffer', (c) => {
  if (c.stratOffered) return; c.stratOffered = true;
  addMessage({ ch: 'musteri', from: c.name, fromId: c.id, cust: c.id, subject: 'Stratejik ortaklık önerisi', body: `Burak Bey,\n\nBirlikte çok iyi iş çıkardık. ${cityOf(c.city).name} pazarında Live & Feel'in ana ortağı olmak istiyoruz: yıllık hacim taahhüdü, ortak pazarlama ve öncelikli üretim.\n\n${c.contact}`, kind: 'strateji', actions: [{ label: 'Ortaklığı kabul et', act: 'acceptStrategic' }, { label: 'Şimdilik düzenli müşteri olarak kalalım', act: 'ack' }] });
});
registerAction('acceptStrategic', (msg) => { const c = cust(msg.cust); setLevel(c, 5, 'stratejik ortaklık'); c.sat = Math.min(100, c.sat + 10); addRep(c.city, 8); confetti(80); conf.gain(6, 'Stratejik ortak'); return true; });

const SHOWROOM_COST = 6000000;
function openAbroad(cityId) {
  if (G.cash < SHOWROOM_COST) return toast('Kasada yeterli para yok (' + fmtTLk(SHOWROOM_COST) + ').', 'bad');
  spend(SHOWROOM_COST, 'yatirim', 'Yurt dışı showroom ' + cityOf(cityId).name);
  (G.abroad ||= []).push(cityId); setFlag('abroadShowroom');
  for (const c of CITIES.list.filter((x) => x.region === cityOf(cityId).region)) addRep(c.id, 12);
  G.brandPremium = (G.brandPremium || 0) + 0.03;
  confetti(120); bus.emit('sfx', 'success');
  alertBox('Live & Feel ' + cityOf(cityId).name, `İlk yurt dışı showroom'umuz ${cityOf(cityId).name}'da açıldı! Bölgedeki marka itibarı yükseldi, liste fiyatlarına %3 marka primi eklendi.`, 'Muhteşem');
}
registerApply('abroadShowroom', ({ city }) => openAbroad(city));
registerTalk((who) => {
  const out = [];
  if (who === 'davut' && ((G.chapter || 1) >= 5 || G.mode === 'free')) out.push({ label: '🌐 Yurt dışında showroom açalım', sub: fmtTLk(SHOWROOM_COST), fn: async () => {
    const cands = CITIES.list.filter((c) => !c.owner && (G.openCities || []).includes(c.id) || (G.mode === 'free' && !c.owner));
    const v = await choose('Hangi şehirde?', 'Showroom, bölgedeki itibarı ve fiyat kabulünü artırır.', cands.slice(0, 10).map((c) => ({ label: `${c.flag} ${c.name}`, sub: `itibar ${Math.round(G.reputation?.[c.country] ?? 10)}`, value: c.id })));
    if (!v) return 'keep';
    if (await requestApproval({ who: 'davut', type: 'invest', title: 'Yurt dışı showroom: ' + cityOf(v).name, amountTL: SHOWROOM_COST, act: 'abroadShowroom', args: { city: v } }, { channel: 'yuz' })) openAbroad(v);
    return true;
  } });
  if (who === 'bunyamin' && conf.has('strategy')) out.push({ label: '🧭 Bölge stratejisi öner', sub: G.focusRegion ? 'odak: ' + CITIES.regions[G.focusRegion] : 'özgüven yeteneği', fn: async (api, say) => {
    const v = await choose('Odak bölge', 'Bu çeyrek hangi bölgeye yüklenelim? (cevap oranı +%25)', ['kafkasya', 'balkanlar', 'avrupa', 'ortaasya', 'uzakdogu'].map((r) => ({ label: CITIES.regions[r], value: r })));
    if (!v) return 'keep';
    G.focusRegion = v; addTrust('bunyamin', 3); conf.gain(3, 'İnisiyatif aldın'); bus.emit('achv', 'firstInitiative');
    say(`“İyi fikir. ${CITIES.regions[v]} bu çeyrek senin odağın. Arkandayım.”`);
  } });
  return out;
});
bus.on('monthStart', () => { if (G && G.focusRegion && Math.random() < 0.34) { G.focusRegion = null; } });
