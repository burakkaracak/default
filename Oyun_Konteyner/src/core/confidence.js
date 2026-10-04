// Özgüven ve Analiz Döngüsü. Karar ekranında uzun beklemek Analiz'i doldurur; harekete geçmek Özgüven'i artırır.
// Alt mesaj: küçük adım atmak ödüllendirilir. Ceza yok, sadece nazik iç sesler.
import { G } from './state.js';
import { bus } from './bus.js';
import { clamp, pick } from './util.js';

export const ABILITIES = [
  { id: 'smallDiscount', at: 25, name: 'Küçük indirim yetkisi', desc: '%5\'e kadar indirimi Harun Bey\'e sormadan verebilirsin.' },
  { id: 'selfFair', at: 45, name: 'Kendi fuarını ayarla', desc: 'Bölgesel fuarlara Davut Bey onayı olmadan katılabilirsin.' },
  { id: 'strategy', at: 65, name: 'Bünyamin\'e strateji öner', desc: 'Bir odak bölge seç: o bölgede cevap oranı bu çeyrek %25 artar.' },
  { id: 'calm', at: 85, name: 'Sakin zihin', desc: 'Analiz Döngüsü çok daha yavaş dolar.' },
];
const VOICES = [
  [25, ['Biraz daha düzelteyim mi?', 'Bu virgül doğru yerde mi?', 'Bir kez daha okusam...']],
  [50, ['Ya yanlış anlarlarsa?', 'Belki bir tablo daha eklerim.', 'Mükemmel olmadan göndermesem mi?']],
  [75, ['Analiz döngüsündeyim galiba...', 'Bünyamin olsa çoktan göndermişti.', 'Tamam, son bir kez daha bakıp...']],
  [96, ['Yeterince iyi = gönderilebilir. Hadi!', 'Fırsat kaçmadan karar ver!']],
];
export const conf = {
  active: null, t: 0, voiceStep: 0,
  has(id) { const a = ABILITIES.find((x) => x.id === id); return !!a && G.player.ozguven >= a.at; },
  startDecision(kind) { this.active = kind; this.t = 0; this.voiceStep = 0; },
  endDecision() { this.active = null; },
  decided(kind, good = true) {
    const quick = G.player.analiz < 40;
    this.gain(good ? (quick ? 5 : 3) : 2, quick ? 'Çabuk karar' : 'Karar verdin');
    G.player.analiz = Math.max(0, G.player.analiz - 45);
    this.voiceStep = 0; this.t = 0;
  },
  gain(d, why) {
    const before = G.player.ozguven;
    G.player.ozguven = clamp(before + d, 0, 100);
    for (const a of ABILITIES) if (before < a.at && G.player.ozguven >= a.at) bus.emit('ability', a);
    bus.emit('ozguven', d, why);
  },
  update(dt) {
    if (!G) return;
    if (this.active) {
      this.t += dt;
      if (this.t > 10) {
        const rate = this.has('calm') ? 1.2 : 3.2;
        G.player.analiz = clamp(G.player.analiz + rate * dt, 0, 100);
        const v = VOICES[this.voiceStep];
        if (v && G.player.analiz >= v[0]) { bus.emit('innerVoice', pick(v[1])); this.voiceStep++; }
        if (G.player.analiz >= 100 && !this.overflowed) { this.overflowed = true; bus.emit('analysisOverflow', this.active); }
      }
    } else {
      G.player.analiz = Math.max(0, G.player.analiz - dt * 1.5);
      if (G.player.analiz < 80) this.overflowed = false;
    }
  },
};
