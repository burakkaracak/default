// Müzik: sakin, kendiliğinden üretilen iki döngü (gündüz ve gece). Her biri tek seferde bir tampona yazılır, sonra döngüyle çalar:
// sürekli ses üreteci çalıştırmadığı için telefonu yormaz. Gündüz ve gece arasında yumuşak geçiş yapar.
// iPhone Safari sesi ilk dokunuştan sonra başlatır: Sfx.Init içinden çağrılır. Ses kapalıysa ya da sayfa gizliyse susar.
const Music = {
  ctx: null, day: null, night: null, gDay: null, gNight: null, master: null, started: false, rate: 22050, building: 0, pausedByHidden: false,
  get On() { return !(Game.st && Game.st.music === false) && Sfx.volume > 0; },

  // bir döngü üret: chords = akorlar (Hz dizileri), bpm, arp deseni, yankı
  Make(opt) {
    const R = this.rate, beat = 60 / opt.bpm, bars = opt.chords.length * (opt.rep || 2), total = Math.floor(R * beat * 4 * bars), d = new Float32Array(total), rnd = new SysRandom(opt.seed);
    const tone = (t0, f, len, amp, harm) => { const i0 = Math.floor(t0 * R), n = Math.floor(len * R); for (let i = 0; i < n && i0 + i < total; i++) { const t = i / R, env = Math.min(1, t * 80) * Math.exp(-t * opt.decay) * (len - t > 0.05 ? 1 : (len - t) / 0.05); d[i0 + i] += amp * env * (Math.sin(6.2832 * f * t) + harm * Math.sin(12.566 * f * t) * 0.5 + harm * 0.3 * Math.sin(18.85 * f * t)); } };
    const pad = (t0, f, len, amp) => { const i0 = Math.floor(t0 * R), n = Math.floor(len * R); for (let i = 0; i < n && i0 + i < total; i++) { const t = i / R, env = Math.min(1, t * 1.5) * Math.min(1, (len - t) * 1.5); d[i0 + i] += amp * env * (Math.sin(6.2832 * f * t) + 0.5 * Math.sin(6.2832 * f * 1.003 * t)); } };
    for (let b = 0; b < bars; b++) {
      const ch = opt.chords[b % opt.chords.length], t0 = b * beat * 4;
      for (const f of ch) pad(t0, f / 2, beat * 4, 0.035);
      tone(t0, ch[0] / 4, beat * 2, 0.11, 0.1); // bas
      for (let s = 0; s < 8; s++) { if (rnd.NextDouble() < opt.rest) continue; const f = ch[(s * 3 + b) % ch.length] * (s % 4 === 3 ? 2 : 1); tone(t0 + s * beat / 2, f, beat * opt.len, opt.amp, 0.4); }
    }
    // yankı (üç tekrar) ve kenar yumuşatma: döngü çatlamasın diye sona doğru azalıp başa karışır
    const echo = Math.floor(R * beat * 0.75); for (let i = echo; i < total; i++) d[i] += d[i - echo] * 0.32;
    for (let i = echo * 2; i < total; i++) d[i] += d[i - echo * 2] * 0.1;
    const fade = Math.floor(R * 0.4); for (let i = 0; i < fade; i++) { const k = i / fade, j = total - fade + i; d[j] = d[j] * (1 - k) + d[i] * k * 0; d[i] *= k; }
    let pk = 0; for (let i = 0; i < total; i++) pk = Math.max(pk, Math.abs(d[i])); if (pk > 0) for (let i = 0; i < total; i++) d[i] *= 0.75 / pk;
    const buf = this.ctx.createBuffer(1, total, R); buf.getChannelData(0).set(d); return buf;
  },
  Init() {
    if (this.ctx || !Sfx.ctx) return; this.ctx = Sfx.ctx;
    this.master = this.ctx.createGain(); this.master.gain.value = 0; this.master.connect(this.ctx.destination);
    this.gDay = this.ctx.createGain(); this.gNight = this.ctx.createGain(); this.gDay.connect(this.master); this.gNight.connect(this.master); this.gDay.gain.value = 1; this.gNight.gain.value = 0;
    document.addEventListener('visibilitychange', () => { if (!this.ctx) return; if (document.hidden) { this.pausedByHidden = true; try { this.ctx.suspend(); } catch (e) { } } else if (this.pausedByHidden) { this.pausedByHidden = false; try { this.ctx.resume(); } catch (e) { } } });
    // önce gündüz döngüsü, biraz sonra gece döngüsü (tek karede ağır iş yapılmasın)
    setTimeout(() => { this.day = this.Make({ bpm: 84, seed: 11, decay: 2.4, len: 1.4, amp: 0.05, rest: 0.25, chords: [[262, 330, 392, 494], [220, 262, 330, 392], [175, 220, 262, 330], [196, 247, 294, 392]], rep: 2 }); this.Play(this.day, this.gDay); }, 400);
    setTimeout(() => { this.night = this.Make({ bpm: 62, seed: 5, decay: 1.5, len: 2, amp: 0.045, rest: 0.45, chords: [[220, 262, 330, 392], [175, 220, 262, 330], [147, 175, 220, 262], [165, 196, 247, 294]], rep: 2 }); this.Play(this.night, this.gNight); }, 2500);
  },
  Play(buf, g) { const s = this.ctx.createBufferSource(); s.buffer = buf; s.loop = true; s.connect(g); s.start(); this.started = true; },
  Frame(raw) {
    if (!this.ctx || !this.master) return;
    const want = this.On ? 0.55 : 0; this.master.gain.value += (want - this.master.gain.value) * Math.min(1, raw * 2);
    const nightK = Mathf.Clamp01(1 - World.daylight * 1.4); this.gNight.gain.value += (nightK - this.gNight.gain.value) * Math.min(1, raw);
    this.gDay.gain.value += ((1 - nightK) - this.gDay.gain.value) * Math.min(1, raw);
  },
  Render(body) {
    const d = document.createElement('div'); d.className = 'item'; d.innerHTML = `<div class="ic">🎵</div><div class="tx"><b>Müzik</b><small>Sakin gündüz ve gece müziği. Ses kapalıysa müzik de çalmaz.</small></div>`;
    const b = document.createElement('button'); b.className = Game.st.music === false ? 'ghost' : 'mint'; b.textContent = Game.st.music === false ? 'Kapalı' : 'Açık'; b.addEventListener('click', () => { Game.st.music = Game.st.music === false; Game.Save(); UI.RenderSheet(); }); d.appendChild(b); body.appendChild(d);
  },
};
if (typeof window !== 'undefined') window.__Music = Music;
