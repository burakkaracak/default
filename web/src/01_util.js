// Küçük yardımcılar
function arrRemove(arr, x) { const i = arr.indexOf(x); if (i >= 0) { arr.splice(i, 1); return true; } return false; }
function fmt1(v) { return (Math.round(v * 10) / 10).toFixed(1).replace('.', ','); }
function fmt(v, d) { return v.toFixed(d).replace('.', ','); }
function pad2(n) { n = Math.floor(n); return (n < 10 ? '0' : '') + n; }
function trUpper(s) { return String(s).toLocaleUpperCase('tr-TR'); }
function nfmt(v) { return Math.round(v).toLocaleString('tr-TR'); }
