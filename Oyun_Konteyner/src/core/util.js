export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const rand = (a, b) => a + Math.random() * (b - a);
export const randi = (a, b) => Math.floor(rand(a, b + 1));
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const chance = (p) => Math.random() < p;
export const uid = (p = 'id') => p + Math.random().toString(36).slice(2, 9);
export const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
export const fmtInt = (n) => Math.round(n).toLocaleString('tr-TR');
export const fmtTL = (n) => (n < 0 ? '−' : '') + '₺' + Math.abs(Math.round(n)).toLocaleString('tr-TR');
export const fmtTLk = (n) => {
  const a = Math.abs(n), s = n < 0 ? '−' : '';
  if (a >= 1e6) return s + '₺' + (a / 1e6).toLocaleString('tr-TR', { maximumFractionDigits: 2 }) + ' Mn';
  if (a >= 1e4) return s + '₺' + (a / 1e3).toLocaleString('tr-TR', { maximumFractionDigits: 0 }) + ' B';
  return fmtTL(n);
};
export const fmtCur = (n, cur) => (cur === 'EUR' ? '€' : cur === 'USD' ? '$' : '₺') + Math.round(n).toLocaleString('tr-TR');
export const pct = (v, d = 0) => '%' + (v * 100).toLocaleString('tr-TR', { maximumFractionDigits: d });
export const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export function weighted(items, wfn) {
  let tot = 0; for (const it of items) tot += Math.max(0, wfn(it));
  let r = Math.random() * tot;
  for (const it of items) { r -= Math.max(0, wfn(it)); if (r <= 0) return it; }
  return items[items.length - 1];
}
