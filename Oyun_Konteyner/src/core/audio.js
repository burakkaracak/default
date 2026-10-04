// Web Audio ile küçük sentez sesler (dosya yok).
let ctx = null;
export const sfx = {
  on: true,
  ensure() {
    if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ctx = null; } }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  },
  tone(freq, dur = 0.12, type = 'sine', vol = 0.12, when = 0, slide = 0) {
    if (!this.on) return;
    const c = this.ensure(); if (!c) return;
    const t = c.currentTime + when;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
  },
  noise(dur = 0.2, vol = 0.08, when = 0, hp = 800) {
    if (!this.on) return;
    const c = this.ensure(); if (!c) return;
    const n = Math.floor(c.sampleRate * dur), buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = c.createBufferSource(), g = c.createGain(), f = c.createBiquadFilter();
    f.type = 'highpass'; f.frequency.value = hp; s.buffer = buf; g.gain.value = vol;
    s.connect(f).connect(g).connect(c.destination); s.start(c.currentTime + when);
  },
  click() { this.tone(660, 0.05, 'triangle', 0.06); },
  open() { this.tone(520, 0.08, 'sine', 0.07); this.tone(780, 0.1, 'sine', 0.05, 0.05); },
  close() { this.tone(600, 0.07, 'sine', 0.05, 0, -200); },
  coin() { this.tone(988, 0.08, 'square', 0.05); this.tone(1319, 0.18, 'square', 0.05, 0.07); },
  pickup() { this.tone(440, 0.06, 'triangle', 0.07, 0, 220); },
  drop() { this.tone(330, 0.08, 'triangle', 0.07, 0, -120); },
  success() { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.22, 'triangle', 0.07, i * 0.08)); },
  fail() { this.tone(300, 0.2, 'sawtooth', 0.04, 0, -120); },
  mail() { this.tone(880, 0.07, 'sine', 0.06); this.tone(1175, 0.12, 'sine', 0.05, 0.08); },
  horn() { this.tone(220, 0.35, 'sawtooth', 0.05); this.tone(277, 0.35, 'sawtooth', 0.04); },
  whoosh() { this.noise(0.45, 0.05, 0, 1200); },
  thud() { this.tone(110, 0.12, 'sine', 0.12, 0, -40); },
  sparkle() { for (let i = 0; i < 6; i++) this.tone(1400 + i * 180, 0.08, 'sine', 0.035, i * 0.05); },
  ship() { this.tone(98, 0.9, 'sawtooth', 0.05); this.tone(147, 0.9, 'sine', 0.05, 0.1); },
};
