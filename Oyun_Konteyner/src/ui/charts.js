// Küçük SVG grafikler (çizgi, çubuk). Renkler tasarım paletinden.
const NS = 'http://www.w3.org/2000/svg';
export function lineChart(series, opt = {}) {
  const W = opt.w || 600, H = opt.h || 170, pad = { l: 44, r: 10, t: 10, b: 22 };
  const all = series.flatMap((s) => s.data.map((d) => d[1]));
  if (!all.length) { const e = document.createElement('div'); e.className = 'muted'; e.textContent = 'Henüz veri yok.'; return e; }
  let mn = Math.min(...all), mx = Math.max(...all); if (opt.zero) mn = Math.min(0, mn); if (mx === mn) { mx += 1; mn -= 1; }
  const xs = series[0].data.map((d) => d[0]); const x0 = Math.min(...xs), x1 = Math.max(...xs) || 1;
  const X = (x) => pad.l + ((x - x0) / Math.max(1, x1 - x0)) * (W - pad.l - pad.r);
  const Y = (y) => pad.t + (1 - (y - mn) / (mx - mn)) * (H - pad.t - pad.b);
  const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('class', 'chart'); svg.style.height = (opt.hpx || 160) + 'px';
  let s = '';
  for (let i = 0; i <= 3; i++) { const v = mn + (mx - mn) * i / 3; s += `<line x1="${pad.l}" x2="${W - pad.r}" y1="${Y(v)}" y2="${Y(v)}" stroke="#E6DCCB" stroke-width="1"/><text x="${pad.l - 6}" y="${Y(v) + 3}" text-anchor="end" font-size="10" fill="#55585C">${opt.fmt ? opt.fmt(v) : v.toFixed(1)}</text>`; }
  for (const se of series) {
    const pts = se.data.map((d) => `${X(d[0]).toFixed(1)},${Y(d[1]).toFixed(1)}`).join(' ');
    s += `<polyline points="${pts}" fill="none" stroke="${se.color}" stroke-width="2.2" stroke-linejoin="round"/>`;
    const last = se.data[se.data.length - 1]; if (last) s += `<circle cx="${X(last[0])}" cy="${Y(last[1])}" r="3.5" fill="${se.color}"/>`;
  }
  s += `<text x="${pad.l}" y="${H - 6}" font-size="10" fill="#55585C">${opt.xl ? opt.xl(x0) : x0}</text><text x="${W - pad.r}" y="${H - 6}" font-size="10" text-anchor="end" fill="#55585C">${opt.xl ? opt.xl(x1) : x1}</text>`;
  let lx = pad.l + 6; for (const se of series) { s += `<rect x="${lx}" y="${pad.t + 2}" width="10" height="3" fill="${se.color}"/><text x="${lx + 14}" y="${pad.t + 7}" font-size="10" fill="#2B2D2F">${se.name}</text>`; lx += 20 + se.name.length * 6; }
  svg.innerHTML = s; return svg;
}
export function barChart(rows, opt = {}) {
  // rows: [{label, values:[{v,color}]}]
  const W = opt.w || 600, H = opt.h || 170, pad = { l: 44, r: 10, t: 12, b: 22 };
  const vals = rows.flatMap((r) => r.values.map((x) => x.v)); if (!vals.length) { const e = document.createElement('div'); e.className = 'muted'; e.textContent = 'Henüz veri yok.'; return e; }
  const mx = Math.max(1, ...vals), mn = Math.min(0, ...vals);
  const Y = (y) => pad.t + (1 - (y - mn) / (mx - mn)) * (H - pad.t - pad.b);
  const bw = (W - pad.l - pad.r) / rows.length;
  const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('class', 'chart'); svg.style.height = (opt.hpx || 160) + 'px';
  let s = `<line x1="${pad.l}" x2="${W - pad.r}" y1="${Y(0)}" y2="${Y(0)}" stroke="#D8CCB6"/>`;
  for (let i = 0; i <= 2; i++) { const v = mn + (mx - mn) * i / 2; s += `<text x="${pad.l - 6}" y="${Y(v) + 3}" text-anchor="end" font-size="10" fill="#55585C">${opt.fmt ? opt.fmt(v) : Math.round(v)}</text>`; }
  rows.forEach((r, i) => {
    const n = r.values.length; const w = (bw * 0.7) / n;
    r.values.forEach((x, j) => { const y0 = Y(Math.max(0, x.v)), y1 = Y(Math.min(0, x.v)); s += `<rect x="${pad.l + i * bw + bw * 0.15 + j * w}" y="${y0}" width="${w - 1}" height="${Math.max(1, y1 - y0)}" rx="2" fill="${x.color}"/>`; });
    s += `<text x="${pad.l + i * bw + bw / 2}" y="${H - 6}" text-anchor="middle" font-size="10" fill="#55585C">${r.label}</text>`;
  });
  svg.innerHTML = s; return svg;
}
