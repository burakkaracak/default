// ============================================================================
// Music.cs · Kodla üretilen hafif, neşe dolu arka plan müziği (döngü)
// WebAudio: Sfx.ctx (ilk dokunuşta Sfx.Init ile kurulur) hazır olunca çalmaya başlar.
// ============================================================================
const Music = {
  src: null,        // AudioBufferSourceNode (çalarken)
  gain: null,
  clip: null,       // AudioBuffer
  data: null,       // Float32Array (üretilen örnekler)
  Rate: 22050,
  volume: 0.22,
  inited: false,
  want: false,      // çalması istenen durum
  get isPlaying() { return this.src != null; },

  Init(host, on) {
    this.inited = true;
    this.Set(on);
  },

  Set(on) {
    if (!this.inited) return;
    this.want = !!on;
    if (on && !this.isPlaying) this.Play();
    else if (!on && this.isPlaying) this.Stop();
  },

  // İlk kullanıcı dokunuşunda çağrılır (AudioContext ancak o zaman var)
  Resume() {
    if (!this.inited) return;
    if (this.want && !this.isPlaying) this.Play();
  },

  Play() {
    const ctx = Sfx.ctx;
    if (!ctx) return; // ses bağlamı henüz yok: Resume'da başlar
    if (!this.clip) {
      if (!this.data) this.data = this.Make();
      try {
        this.clip = ctx.createBuffer(1, this.data.length, this.Rate);
        this.clip.getChannelData(0).set(this.data);
      } catch (e) { this.clip = null; return; }
    }
    if (!this.gain) { this.gain = ctx.createGain(); this.gain.gain.value = this.volume; this.gain.connect(ctx.destination); }
    const s = ctx.createBufferSource();
    s.buffer = this.clip; s.loop = true;
    s.connect(this.gain);
    s.start();
    this.src = s;
  },

  Stop() {
    if (!this.src) return;
    try { this.src.stop(); } catch (e) { }
    try { this.src.disconnect(); } catch (e) { }
    this.src = null;
  },

  Freq(midi) { return 440 * Math.pow(2, (midi - 69) / 12); },

  Note(d, start, dur, midi, amp, decay, type) {
    const Rate = this.Rate;
    const s0 = Math.trunc(start * Rate);
    const len = Math.trunc((dur + 0.6) * Rate);
    const f = this.Freq(midi);
    const TWO_PI = 2 * Math.PI;
    for (let i = 0; i < len; i++) {
      let idx = s0 + i;
      if (idx >= d.length) idx -= d.length; // döngü sonunda başa sar
      if (idx < 0) continue;
      const t = i / Rate;
      let env = Math.exp(-t * decay) * Mathf.Clamp01(t * 120);
      if (t > dur) env *= Math.exp(-(t - dur) * 10);
      const ph = TWO_PI * f * t;
      let w;
      if (type === 0) w = Math.sin(ph) * 0.75 + Math.sin(ph * 2) * 0.18 + Math.sin(ph * 3) * 0.07; // elektrikli piyano
      else if (type === 1) w = Math.sin(ph) + 0.25 * Math.sin(ph * 2);                          // bas
      else w = Math.sin(ph + 0.4 * Math.sin(TWO_PI * 5 * t)) * 0.8 + Math.sin(ph * 2) * 0.1;    // melodi
      d[idx] += w * env * amp;
    }
  },

  Make() {
    const Rate = this.Rate;
    const bpm = 96;
    const beat = 60 / bpm;
    const bars = 16;
    const n = Math.trunc(Rate * beat * 4 * bars);
    const d = new Float32Array(n);
    const chords = [[60, 64, 67, 71], [57, 60, 64, 67], [53, 57, 60, 64], [55, 59, 62, 67]];
    const bass = [36, 33, 29, 31];
    const scale = [72, 74, 76, 79, 81, 84];
    const rnd = new SysRandom(11);
    let mel = 2;
    const noiseR = new SysRandom(3);

    for (let bar = 0; bar < bars; bar++) {
      const t0 = bar * 4 * beat;
      const ch = chords[bar % 4];
      // akorlar: 1. ve 3. vuruşta, hafif arpej
      for (let k = 0; k < ch.length; k++) {
        this.Note(d, t0 + k * 0.02, beat * 1.8, ch[k], 0.07, 1.6, 0);
        this.Note(d, t0 + 2 * beat + k * 0.02, beat * 1.8, ch[k], 0.055, 1.8, 0);
      }
      // bas
      const b = bass[bar % 4];
      this.Note(d, t0, beat * 1.4, b, 0.16, 2.5, 1);
      this.Note(d, t0 + 2.5 * beat, beat * 0.9, b + 7, 0.11, 3, 1);
      // melodi (ilk 4 ölçü sessiz, sonra kısa ezgiler)
      if (bar >= 4)
        for (let e = 0; e < 8; e++) {
          if (rnd.NextDouble() > (e % 2 === 0 ? 0.6 : 0.35)) continue;
          mel = Mathf.Clamp(mel + rnd.Next(-2, 3), 0, scale.length - 1);
          this.Note(d, t0 + e * beat / 2, beat * 0.45, scale[mel], 0.06, 4, 2);
        }
      // hafif ritim: ara vuruşlarda yumuşak tsss
      for (let e = 1; e < 8; e += 2) {
        const s0 = Math.trunc((t0 + e * beat / 2) * Rate);
        const len = Math.trunc(0.05 * Rate);
        for (let i = 0; i < len && s0 + i < n; i++) {
          const env = Math.exp(-i / Rate * 70);
          d[s0 + i] += (noiseR.NextDouble() * 2 - 1) * env * 0.025;
        }
      }
    }

    let peak = 0.001;
    for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(d[i]));
    for (let i = 0; i < n; i++) d[i] = d[i] / peak * 0.8;
    return d;
  },
};
