// Fotoğraf modu: otelin o anki görüntüsünü arayüz olmadan, alt köşesinde otel adı ve tarih ile kaydeder.
const Photo = {
  pending: false, flash: 0, downloads: null, btn: Rect.zero,

  Init() {
    RegisterGUI(9, () => this.OnGUI());
    try { if (window.claude && window.claude.use) window.claude.use('downloads').then(d => { this.downloads = d; }).catch(() => { }); } catch (e) { }
  },

  OnGUI() {
    const gm = GameManager.I;
    if (!gm || gm.MenuOpen || Popups.Open || Social.open || Chat.open) { this.btn = Rect.zero; return; }
    const s = gm.UIScale, sb = Social.Button(s);
    this.btn = new Rect(sb.x, sb.yMax + 12 * s, sb.width, 62 * s);
    GUI.Panel(this.btn, C(0.35, 0.55, 0.85, 0.95));
    const st = gm.btnStyle;
    st.fontSize = Mathf.RoundToInt(24 * s); st.normal.textColor = Col.white;
    if (GUI.Button(this.btn, '📷 Fotoğraf', st)) { this.pending = true; Sfx.Play('pop', 0.5); }
    if (this.flash > 0) {
      this.flash -= Time.unscaledDeltaTime * 2.5;
      GUI.color = C(1, 1, 1, Mathf.Clamp01(this.flash));
      GUI.DrawTexture(new Rect(0, 0, Screen.width, Screen.height), 'white');
      GUI.color = Col.white;
    }
  },

  // Çizimden hemen sonra çağrılır (WebGL tamponu o anda okunabilir)
  AfterRender() {
    if (!this.pending) return;
    this.pending = false;
    const gl = renderer.domElement, gm = GameManager.I;
    const cv = document.createElement('canvas');
    cv.width = gl.width; cv.height = gl.height;
    const ctx = cv.getContext('2d');
    ctx.filter = 'saturate(1.16) contrast(1.06)';
    ctx.drawImage(gl, 0, 0);
    ctx.filter = 'none';
    // alt şerit: otel adı, yıldız, gün
    const h = Math.round(cv.height * 0.07), k = cv.width / innerWidth;
    const grd = ctx.createLinearGradient(0, cv.height - h * 1.8, 0, cv.height);
    grd.addColorStop(0, 'rgba(20,24,40,0)'); grd.addColorStop(1, 'rgba(20,24,40,0.75)');
    ctx.fillStyle = grd; ctx.fillRect(0, cv.height - h * 1.8, cv.width, h * 1.8);
    ctx.font = `800 ${Math.round(h * 0.45)}px ${UI_FONT}`; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffd96b'; ctx.textAlign = 'left';
    ctx.fillText(gm.hotelName + '  ' + GameManager.StarText(gm.Stars), 24 * k, cv.height - h * 0.6);
    ctx.font = `600 ${Math.round(h * 0.32)}px ${UI_FONT}`; ctx.fillStyle = '#ffffff'; ctx.textAlign = 'right';
    ctx.fillText('Gün ' + gm.dayNight.day + ' · ' + gm.dayNight.Clock + ' · ' + new Date().toLocaleDateString('tr-TR'), cv.width - 24 * k, cv.height - h * 0.6);
    this.flash = 1;
    Sfx.Play('tick', 0.8);
    const name = 'otel-ustasi-gun-' + gm.dayNight.day + '.png';
    cv.toBlob(async blob => {
      if (!blob) return;
      if (this.downloads) {
        try { await this.downloads.save({ filename: name, data: blob }); gm.Notify('Fotoğraf kaydedildi'); }
        catch (e) { if (e && e.code !== 'declined') gm.Notify('Fotoğraf kaydedilemedi'); }
      } else {
        // artifact dışında (yerel deneme): bağlantıyla indir
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      }
    }, 'image/png');
  },
};
