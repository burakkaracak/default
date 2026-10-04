// Oyun zamanı: gün 08:00'de başlar, 20:00'de biter (gece atlanır). 1 gün ≈ 4 dakika.
import { G, B } from './state.js';
import { bus } from './bus.js';

const T = B.time;
export const DAY_START = T.dayStartHour * 60;
export const DAY_END = T.dayEndHour * 60;
export const DAY_LEN = DAY_END - DAY_START;
export const DAYS_PER_MONTH = T.daysPerWeek * T.weeksPerMonth;
export const DAYS_PER_SEASON = DAYS_PER_MONTH * T.monthsPerSeason;
const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const DAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'];
const DAYS_S = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum'];
const SEASONS = { 11: 'Kış', 0: 'Kış', 1: 'Kış', 2: 'İlkbahar', 3: 'İlkbahar', 4: 'İlkbahar', 5: 'Yaz', 6: 'Yaz', 7: 'Yaz', 8: 'Sonbahar', 9: 'Sonbahar', 10: 'Sonbahar' };

export const time = {
  hold: 0, // 0'dan büyükse zaman durur (açık pencere vb.)
  dayEnded: false,
  get paused() { return G.speed === 0 || this.hold > 0 || this.dayEnded; },
  monthIndex(d = G.day) { return (T.startMonth + Math.floor((d - 1) / DAYS_PER_MONTH)) % 12; },
  monthName(d = G.day) { return MONTHS[this.monthIndex(d)]; },
  monthNo(d = G.day) { return Math.floor((d - 1) / DAYS_PER_MONTH) + 1; },
  year(d = G.day) { return 2026 + Math.floor((T.startMonth + Math.floor((d - 1) / DAYS_PER_MONTH)) / 12); },
  season(d = G.day) { return SEASONS[this.monthIndex(d)]; },
  seasonIndex(d = G.day) { return ['Kış', 'İlkbahar', 'Yaz', 'Sonbahar'].indexOf(this.season(d)); },
  quarter(d = G.day) { return Math.floor((d - 1) / DAYS_PER_SEASON) + 1; },
  dayOfWeek(d = G.day) { return (d - 1) % T.daysPerWeek; },
  dayName(d = G.day) { return DAYS[this.dayOfWeek(d) % 5]; },
  dayShort(d = G.day) { return DAYS_S[this.dayOfWeek(d) % 5]; },
  week(d = G.day) { return Math.floor((d - 1) / T.daysPerWeek) + 1; },
  dayOfMonth(d = G.day) { return ((d - 1) % DAYS_PER_MONTH) + 1; },
  isMonthEnd(d = G.day) { return d % DAYS_PER_MONTH === 0; },
  isQuarterEnd(d = G.day) { return d % DAYS_PER_SEASON === 0; },
  clock(m = G.min) { const h = Math.floor(m / 60), mm = Math.floor(m % 60); return String(h).padStart(2, '0') + ':' + String(mm).padStart(2, '0'); },
  dateLabel(d = G.day) { return `${this.dayOfMonth(d)}. gün · ${this.monthName(d)} ${this.year(d)}`; },
  shortDate(d) { return `${this.monthName(d).slice(0, 3)} ${this.dayOfMonth(d)}`; },
  // Gerçek saniyeyi oyun dakikasına çevirip ilerletir.
  advance(dtReal) {
    if (this.paused) return;
    let dm = dtReal * (DAY_LEN / T.realSecondsPerDay) * G.speed * (this.slow || 1);
    while (dm > 0 && !this.dayEnded) {
      const step = Math.min(dm, 5);
      dm -= step;
      const prevH = Math.floor(G.min / 60);
      G.min += step;
      bus.emit('tick', step);
      const h = Math.floor(G.min / 60);
      if (h !== prevH) bus.emit('hour', h);
      if (G.min >= DAY_END) { G.min = DAY_END; this.dayEnded = true; bus.emit('dayEnd', G.day); }
    }
  },
  // Kurgu gereği zaman atlatma (yolculuk vb.): yolda geçen dakika simülasyonu yürütür.
  skip(minutes) {
    let left = minutes;
    while (left > 0 && !this.dayEnded) {
      const step = Math.min(left, 5); left -= step;
      const prevH = Math.floor(G.min / 60);
      G.min += step; bus.emit('tick', step);
      if (Math.floor(G.min / 60) !== prevH) bus.emit('hour', Math.floor(G.min / 60));
      if (G.min >= DAY_END) { G.min = DAY_END; this.dayEnded = true; bus.emit('dayEnd', G.day); }
    }
  },
  startNextDay() {
    G.day += 1; G.min = DAY_START; this.dayEnded = false;
    bus.emit('dayStart', G.day);
    if (this.dayOfWeek() === 0) bus.emit('weekStart', this.week());
    if ((G.day - 1) % DAYS_PER_MONTH === 0) bus.emit('monthStart', this.monthNo());
  },
};
