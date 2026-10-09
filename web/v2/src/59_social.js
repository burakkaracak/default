// Otelgram (misafir paylaşımları, takipçi, yanıtlama), mektuplar ve misafirle sohbet.
// Sohbet kendi pencresidir ve oyunu durdurur (UI.overlay). Serbest yazışma için `sample` yeteneği gerekir; yoksa düğme gizlenir.
const Social = {
  sample: null, tried: false,
  First: ['ayse', 'mehmet', 'zeynep', 'can', 'selin', 'murat', 'deniz', 'burcu', 'kerem', 'ece', 'oguz', 'melis', 'arda', 'nehir', 'tolga', 'irem', 'baris', 'derya'],
  Suffix: ['_gezgin', '.travels', '_tatilde', '61', '_istanbul', '.foto', '_yolda', '34', '_kahve', '.blog'],
  Good: [
    '{otel} gerçekten harika! Oda {oda} tertemizdi, yatak bulut gibi.',
    "Personel çok güler yüzlü. {otel}'e kesinlikle tekrar geleceğim!",
    'Hafta sonu kaçamağı için {otel} birebir. Kahvaltıya bayıldım.',
    'Bu otelin havası başka. Lobide saatlerce oturabilirim.',
    'Resepsiyonda hiç beklemedim, odam hazırdı. Bravo {otel}!',
    'Oda {oda} manzarası ve dekorasyonu çok şık. 10/10',
  ],
  Bad: [
    "{otel}'de uzun süre bekledim, kimse ilgilenmedi.",
    'Oda {oda} biraz tozluydu, beklentimin altında kaldı.',
    'Fiyatına göre biraz pahalı geldi açıkçası.',
    'İsteğim unutuldu, kimse gelmedi. Hayal kırıklığı.',
  ],
  FacPosts: {
    havuz: ["Havuz keyfi! {otel}'in havuzu çok temiz.", 'Güneş, havuz ve kitap. Tatil tam olarak bu.'],
    kafe: ['{otel} kafesinin kahvesi şehrin en iyisi olabilir.', 'Kafede pasta ve kahve molası. Mutluluk!'],
    spa: ["{otel}'in spasında kendime geldim. Tavsiye ederim!"],
    bar: ['Çatı barında gün batımı... {otel} bir başka güzel.'],
    bahce: ['Çatıdaki bahçede çiçekler arasında yürüyüş. Huzur!'],
    restoran: ['{otel} restoranının tatlısı için bile tekrar gelinir!'],
  },

  // ---------------- veri ----------------
  Init() { this.Defaults(); },
  Defaults() { const st = Game.st; st.followers = st.followers ?? 50; st.feed = st.feed || []; st.letters = st.letters || []; st.arcs = st.arcs || {}; st.unread = st.unread || 0; st.unreadL = st.unreadL || 0; },
  GetSample() {
    if (this.tried) return; this.tried = true;
    try { if (window.claude && window.claude.use) window.claude.use('sample').then(s => { this.sample = s; }).catch(() => { }); } catch (e) { }
  },
  get AdsBonus() { return Math.min(0.25, (Game.st.followers || 0) / 6000); },
  Handle() { return '@' + Random.Pick(this.First) + Random.Pick(this.Suffix); },
  Fill(t, room) { return t.split('{otel}').join(Game.st.name).split('{oda}').join(room ? String(room.number) : '101'); },
  Likes(k) { return Math.round((Random.RangeInt(8, 30) + Game.st.followers * Random.Range(0.03, 0.09)) * k); },

  // Misafir ödeyince paylaşım yapabilir
  OnPaid(g, sat, room) {
    const t = g.type, fol = Game.st.followers;
    if (t.id === 'unlu' || t.id === 'fenomen') {
      const good = sat >= 3.5, big = t.id === 'unlu' ? 3 : 1.8;
      this.Add(t.id === 'unlu' ? '@' + g.name.toLowerCase() + '.official' : '@' + g.name.toLowerCase() + '.gezer',
        this.Fill(good ? "Bu gece {otel}'de kaldım. Herkese tavsiye ederim, çok özel bir yer!" : '{otel}... daha iyisini beklerdim.', room), this.Likes(big * 4), !good, 2);
      return;
    }
    if (sat >= 4.2 && Random.Chance(0.4)) {
      let l = this.Good;
      const built = Data.Facilities.filter(d => Facilities.Built(d.id) && this.FacPosts[d.id]);
      if (built.length && Random.Chance(0.3)) l = this.FacPosts[Random.Pick(built).id];
      this.Add(this.Handle(), this.Fill(Random.Pick(l), room), this.Likes(1), false, 0);
    } else if (sat <= 2.2 && Random.Chance(0.5)) this.Add(this.Handle(), this.Fill(Random.Pick(this.Bad), room), this.Likes(0.7), true, 0);
    // hikâye misafiri memnun ayrılırsa mutlaka mektup bırakır; diğerleri ara sıra sıradan mektup
    if (g.arcId && sat >= 4) this.AddLetter(g, room, sat);
    else if (!g.arcId && sat >= 4.4 && Random.Chance(0.25)) this.AddLetter(g, room, sat);
  },
  Share(text, kind, bad) { this.Add(kind === 2 ? '@yerel.gazete' : this.Handle(), this.Fill(text), kind === 2 ? Random.RangeInt(400, 900) : this.Likes(2.5), !!bad, kind); },
  Add(author, text, likes, bad, kind) {
    const st = Game.st; this.Defaults();
    st.postSeq = (st.postSeq || 0) + 1;
    const p = { id: st.postSeq, author, text, likes, bad, kind, day: World.day };
    st.feed.unshift(p); while (st.feed.length > 25) st.feed.pop();
    st.unread++;
    if (!bad) { const gain = Math.max(1, Math.trunc(likes / 6)); st.followers += gain; UI.Toast('📱 Otelgram: yeni paylaşım, +' + gain + ' takipçi', 'good'); if (kind === 2) st.rep += 4; }
    else { const loss = Math.max(1, Math.trunc(likes / 8)); st.followers = Math.max(10, st.followers - loss); st.rep = Math.max(0, st.rep - 1); UI.Toast('📱 Otelgram: olumsuz yorum, yanıt vermeyi dene', 'bad'); }
    return p;
  },

  // ---------------- mektuplar ----------------
  // Küçük, veriye dayalı hikâyeler: aynı tür misafir tekrar mektup bırakınca hikâye ilerler.
  Arcs: {
    balayi: { who: 'Ece ile Kaan', name: 'Ece', chapters: [
      'Odamızdaki çiçekler ve sizin güler yüzünüz balayımızı unutulmaz yaptı. Hâlâ ikimiz de gülümseyerek anlatıyoruz.',
      'Biz Ece ile Kaan, yine yazıyoruz! Evimizde yeni bir köşe ayırdık ve adını "Lavanta Köşesi" koyduk. İlk yıl dönümümüzde yine geleceğiz.',
      'Bir müjdemiz var: bir bebeğimiz olacak! Adını koyarken sizi de düşündük. Yine sizde kalmayı çok isteriz.',
    ] },
    emekli: { who: 'Nermin Hanım', name: 'Nermin', chapters: [
      'Evladım, yıllardır bu kadar rahat uyumamıştım. Çayınız için de sağ olun.',
      'Torunlarıma otelinizi anlattım, hepsi görmek istiyor. Size bahçede yetiştirdiğim kekik gönderdim.',
      'Bu yıl da geldim, odamı tanıdım! Siz de ailemden biri oldunuz artık, sağ olun, var olun.',
    ] },
    is: { who: 'Yazar Cem', name: 'Cem', chapters: [
      'Romanımın ilk bölümünü sizin sessiz köşenizde yazdım. Teşekkürler!',
      'Romanım bitti ve yayınevi kabul etti! Kitabın teşekkür bölümünde otelinizin adı geçecek.',
      'Kitabım çıktı! Size imzalı bir nüsha gönderiyorum. Odanızda yazmaya bir daha gelirim.',
    ] },
  },
  Generic: [
    'Burada çok güzel bir konaklama geçirdim. Güler yüzünüz için teşekkürler!',
    'Odanın temizliği ve rahatlığı için sağ olun. Tekrar gelirim.',
    'Resepsiyondaki sıcak karşılamanızı unutamadım. Kolay gelsin!',
    'Küçük ilgileriniz tatilimi güzelleştirdi. Teşekkürler.',
  ],
  // Hikâyesi bitmemiş bir türden misafir gelince, otelde hikâye misafiri yoksa ara sıra o karakter olur (gerçek tür, kılık değil)
  MaybeArc(g, force) {
    const id = g.type.id, arc = this.Arcs[id]; if (!arc) return false;
    const st = Game.st; this.Defaults();
    if ((st.arcs[id] || 0) >= arc.chapters.length) return false;
    if (Game.guests.some(x => x !== g && x.arcId)) return false;
    if (!force && !Random.Chance(0.3)) return false;
    g.arcId = id; g.name = arc.name; g.tag.text = Chat.Shown(g).icon + ' ' + arc.name;
    return true;
  },
  AddLetter(g, room, sat) {
    const st = Game.st; this.Defaults();
    const id = g.arcId, arc = id ? this.Arcs[id] : null; // yalnız hikâye misafiri (gerçek türüyle) hikâyeyi ilerletir
    let text, from = g.name, chap = 0, used = false;
    if (arc && (st.arcs[id] || 0) < arc.chapters.length) { chap = st.arcs[id] || 0; st.arcs[id] = chap + 1; text = arc.chapters[chap]; from = arc.who; used = true; }
    else text = Random.Pick(this.Generic);
    const mgr = Game.st.manager || 'Müdür';
    st.letters.unshift({ from, text: 'Sevgili ' + mgr + ',\n\n' + text + '\n\nSevgilerle,\n' + from, day: World.day, room: room ? room.number : null, arc: used ? chap + 1 : 0, read: false });
    while (st.letters.length > 25) st.letters.pop();
    st.unreadL++; st.rep += 2;
    UI.Toast('✉ ' + from + ' sana bir mektup bıraktı', 'good');
  },

  // ---------------- pencere ----------------
  Open(tab) {
    const st = Game.st; this.Defaults();
    UI.Sheet({ title: '📱 Otelgram', sub: st.followers + ' takipçi · ' + st.feed.length + ' paylaşım', tabs: [{ id: 'akis', label: '📱 Akış' }, { id: 'mektup', label: '✉ Mektuplar' }], tab, render: (body, t) => {
      if (t === 'akis') {
        st.unread = 0;
        if (!st.feed.length) body.innerHTML = '<div class="item"><div class="ic">🌙</div><div class="tx"><b>Henüz paylaşım yok</b><small>Misafirler memnun ayrılınca otelin hakkında yazarlar. Yorumlara cevap vererek takipçi kazanırsın.</small></div></div>';
        for (const p of st.feed) {
          const d = document.createElement('div'); d.className = 'item post' + (p.bad ? ' bad' : '');
          const rep = p.reply ? `<small class="rep">↪ Sen: ${UI.esc(p.reply)}</small>${p.react ? `<small class="rep">💬 ${UI.esc(p.react)}</small>` : ''}` : '';
          d.innerHTML = `<div class="ic">${p.kind === 2 ? '📰' : p.bad ? '😠' : '😊'}</div><div class="tx"><b>${UI.esc(p.author)}</b><small>${UI.esc(p.text)}</small><small>♥ ${p.likes} · Gün ${p.day}</small>${rep}</div>`;
          if (!p.reply && p.kind !== 2) { const b = document.createElement('button'); b.className = p.bad ? 'red' : 'pink'; b.textContent = 'Yanıtla'; b.addEventListener('click', () => Chat.StartPost(p)); d.appendChild(b); }
          body.appendChild(d);
        }
      } else {
        st.unreadL = 0;
        if (!st.letters.length) body.innerHTML = '<div class="item"><div class="ic">✉</div><div class="tx"><b>Henüz mektup yok</b><small>Çok mutlu ayrılan misafirler bazen sana mektup bırakır. Bazıları geri dönüp hikâyesini sürdürür.</small></div></div>';
        for (const l of st.letters) {
          const d = document.createElement('div'); d.className = 'item letter';
          d.innerHTML = `<div class="ic">${l.arc ? '💌' : '✉'}</div><div class="tx"><b>${UI.esc(l.from)}${l.arc ? ' · Bölüm ' + l.arc : ''}</b><small style="white-space:pre-line">${UI.esc(l.text)}</small><small>Gün ${l.day}${l.room ? ' · Oda ' + l.room : ''}</small></div>`;
          body.appendChild(d);
        }
      }
    } });
  },
  Frame() {
    // sohbet edilebilecek en yakın misafirin üstünde 💬
    if (UI.Blocking || Decor.active) return;
    const P = Game.player, v = Hotel.view; let best = null, bd = 1e9;
    for (const g of Game.guests) if (Chat.Can(g) && g.floor === v && !(g.liftT > 0)) { const d = Vec.flat(g.pos, P.go.position); if (d < bd) { bd = d; best = g; } }
    if (best) UI.Label('chat', V(best.pos.x, best.pos.y + 2.9, best.pos.z), '💬', 'need', () => Chat.StartGuest(best));
  },
};

// ================= Sohbet =================
const Chat = {
  open: false, mode: 'guest', who: null, post: null, msgs: [], choices: [], round: 0, mood: 0, typed: 0, busy: false, done: false, el: null, result: null,
  Can(g) { return g && !g.chatted && alive(g.go) && (g.s === Guest.S.Queue || g.s === Guest.S.Stay || g.s === Guest.S.Visit); },
  Shown(g) { return g.type.disguise ? Data.Guests.find(x => x.id === g.type.disguise) : g.type; }, // gizli misafirin görünen türü
  TypeName(g) { return this.Shown(g).name; },
  Second() {
    const l = [...TalkData.second.genel];
    for (const k of ['restoran', 'spa', 'havuz']) if (Facilities.Built(k)) l.push(TalkData.second[k][0]);
    return Random.Pick(l);
  },
  StartGuest(g) {
    if (this.open || !this.Can(g)) { if (g) UI.Toast(this.Shown(g).icon + ' ' + g.name + ' · ' + this.TypeName(g) + (g.room ? ' · Oda ' + g.room.number : ''), 'info'); return; }
    const key = g.type.disguise || g.type.id, T = TalkData.talks[key] || TalkData.talks.turist;
    const waiting = g.s === Guest.S.Queue;
    const talk = waiting && Random.Chance(0.6) ? TalkData.waiting : Random.Pick(T);
    this.Reset('guest'); this.who = g; g.chatted = true;
    this.Show(); this.Say(false, talk[0]); this.choices = talk[1]; this.Render();
  },
  StartPost(p) {
    if (this.open) return;
    this.Reset('post'); this.post = p; this.Show(); this.Say(false, p.text);
    this.choices = p.bad ? [
      ['Yaşadıklarınız için çok üzgünüz. Bir dahaki konaklamanızda sizi en güzel odamızda ağırlamak isteriz.', 'Bu ilgi için teşekkürler, bir şans daha vereceğim.', 2],
      ['Geri bildiriminiz için teşekkürler, ekibimizle ilgileniyoruz.', 'Umarım düzelir.', 1],
      ['Bence biraz abartıyorsunuz.', 'Bu cevaptan sonra hiç gelmem!', -2],
    ] : [
      ['Çok teşekkür ederiz! Sizi yine ağırlamak için sabırsızlanıyoruz ♥', 'Ben de tekrar gelmek için sabırsızlanıyorum! ♥', 2],
      ['Teşekkürler, yine bekleriz!', 'Mutlaka! 😊', 1],
      ['Tamam.', '...', 0],
    ];
    this.Render();
  },
  Reset(mode) { this.open = true; UI.overlay = true; this.mode = mode; this.who = null; this.post = null; this.msgs = []; this.choices = []; this.round = 0; this.mood = 0; this.typed = 0; this.busy = false; this.done = false; this.result = null; },
  Say(me, text) { this.msgs.push({ me, text }); },
  Pick(i) {
    const ch = this.choices[i]; if (!ch || this.busy) return;
    this.Say(true, ch[0]); this.choices = []; this.busy = true; this.Render();
    setTimeout(() => {
      if (!this.open) return; this.busy = false;
      this.Say(false, ch[1]); this.mood += ch[2]; this.round++; this.Next();
    }, 600);
  },
  Next() {
    if (this.mode === 'guest' && this.round === 1 && this.mood >= 0) {
      const t = this.Second(); this.busy = true; this.Render();
      setTimeout(() => { if (!this.open) return; this.busy = false; this.Say(false, t[0]); this.choices = t[1]; this.Render(); }, 500);
      return;
    }
    this.Finish();
  },
  // Kendin yaz (Claude): yalnız düğmeye basınca çağrılır
  async SendTyped(text) {
    text = String(text || '').trim();
    if (!text || this.busy || !Social.sample) return;
    this.Say(true, text); this.choices = []; this.busy = true; this.typed++; this.Render();
    const hist = this.msgs.map(m => (m.me ? 'Otel müdürü: ' : (this.mode === 'post' ? 'Yorumu yazan: ' : 'Misafir: ')) + m.text).join('\n');
    const hotel = Game.st.name; let prompt;
    if (this.mode === 'guest') {
      const g = this.who;
      prompt = 'Sevimli, aile dostu bir otel işletme oyunundasın ("' + hotel + '"). Bir misafiri canlandırıyorsun: adı ' + g.name + ', türü: ' + this.TypeName(g) + (g.room ? ', Oda ' + g.room.number : '') + '. Otel müdürüyle kısa bir sohbettesiniz.\n\nKonuşma:\n' + hist +
        '\n\nMisafir olarak müdürün son mesajına Türkçe, samimi, en fazla 2 kısa cümleyle cevap ver. Oyunun dünyasında kal, gerçek kişi ya da yer bilgisi verme. Müdürün mesajı seni ne kadar memnun etti: -1 (kaba), 0 (sıradan), 1 (iyi), 2 (çok nazik/yardımsever). ' +
        (this.typed >= 3 ? 'Bu son mesaj, sohbeti nazikçe bitir. ' : '') + 'Sadece şu JSON ile cevap ver: {"reply": "...", "mood": sayı}';
    } else {
      prompt = 'Sevimli bir otel işletme oyununda ("' + hotel + '"), Otelgram adlı sosyal medyada ' + this.post.author + ' kullanıcısı otel hakkında şu yorumu yazdı:\n"' + this.post.text + '"\n\nOtel müdürü şöyle yanıt verdi:\n"' + text +
        '"\n\nYorumu yazan kişi olarak müdürün yanıtına Türkçe, en fazla 2 kısa cümleyle karşılık ver. Yanıt seni ne kadar memnun etti: -2 (kaba), -1 (soğuk), 0 (sıradan), 1 (iyi), 2 (çok ilgili ve kibar). Sadece şu JSON ile cevap ver: {"reply": "...", "mood": sayı}';
    }
    try {
      const r = await Social.sample.json(prompt, { modelTier: 'quick', cache: false });
      if (!this.open) return;
      this.Say(false, String(r.reply || '😊').slice(0, 220)); this.mood += Mathf.Clamp(Math.round(+r.mood || 0), -2, 2); this.busy = false;
      if (this.mode === 'post' || this.typed >= 3) this.Finish(); else this.Render();
    } catch (e) {
      this.busy = false;
      if (e && e.code === 'not_granted') { Social.sample = null; this.Say(false, '(Serbest yazışma için izin verilmedi. Hazır cevaplardan seçebilirsin.)'); }
      else this.Say(false, '(Şu an cevap gelmedi, birazdan tekrar dene.)');
      if (this.mode === 'post' || !this.choices.length) this.Finish(); else this.Render();
    }
  },
  Finish() {
    this.done = true; this.choices = []; this.busy = false;
    const m = this.mood, st = Game.st;
    if (this.mode === 'guest') st.chats = (st.chats || 0) + 1; else st.replies = (st.replies || 0) + 1;
    if (this.mode === 'guest' && this.who) {
      const g = this.who;
      if (alive(g.go)) {
        g.sat = Mathf.Clamp(g.sat + Mathf.Clamp(m * 0.25, -0.5, 1), 1, 5);
        const pos = Vec.add(g.pos, V(0, 2.8, 0));
        if (m >= 3) { const tip = 15 + Game.Stars * 12; g.tips += tip; Tween.FloatText(pos, '♥♥ +' + UI.fmt(tip) + ' bahşiş', C(1, 0.5, 0.75), 0.12); this.result = g.name + ' sohbetten çok hoşlandı, çıkışta bahşiş bırakacak.'; }
        else if (m >= 1) { Tween.FloatText(pos, '♥', C(1, 0.5, 0.75), 0.14); this.result = g.name + ' sohbetten memnun kaldı.'; }
        else if (m < 0) { Tween.FloatText(pos, '☹', C(0.7, 0.7, 0.75), 0.14); this.result = g.name + ' pek hoşlanmadı.'; }
        else this.result = 'Kısa bir sohbet oldu.';
      }
    } else if (this.mode === 'post' && this.post) {
      const p = this.post;
      p.reply = this.msgs.filter(x => x.me).map(x => x.text).pop() || '';
      p.react = this.msgs.length > 2 ? this.msgs[this.msgs.length - 1].text : '';
      const gain = m >= 2 ? Math.max(3, Math.trunc(p.likes / (p.bad ? 6 : 10))) : m >= 1 ? Math.max(1, Math.trunc(p.likes / 15)) : m < 0 ? -Math.max(2, Math.trunc(p.likes / 8)) : 0;
      st.followers = Math.max(10, st.followers + gain);
      if (p.bad && m >= 2) { p.bad = false; st.rep += 2; }
      this.result = gain > 0 ? 'Yanıtın beğenildi: +' + gain + ' takipçi' : gain < 0 ? 'Yanıtın tepki çekti: ' + gain + ' takipçi' : 'Yanıt yayımlandı.';
      Game.Save();
    }
    Sfx.Play(m >= 2 ? 'ding' : 'pop', 0.6); this.Render();
  },
  Close() {
    if (!this.done && this.msgs.some(m => m.me)) this.Finish();
    this.open = false; UI.overlay = false;
    if (this.el) { this.el.remove(); this.el = null; }
    if (window.visualViewport) window.visualViewport.removeEventListener('resize', this._vv);
    if (this.result) UI.Toast(this.result, 'info'); this.result = null;
    if (UI.SheetIs('📱 Otelgram')) UI.RenderSheet();
  },

  // ---------------- DOM ----------------
  Show() {
    const w = document.createElement('div'); w.className = 'chat-wrap';
    w.innerHTML = `<div class="chat"><div class="chead"><div class="grow"><b></b><small></small></div><button class="icon ghost" data-x>✕</button></div><div class="msgs"></div><div class="choices"></div><div class="typebar" hidden><input type="text" maxlength="160" placeholder="Bir şey yaz..." enterkeyhint="send"><button class="mint" data-send>Gönder</button></div></div>`;
    w.querySelector('[data-x]').addEventListener('click', () => this.Close());
    const inp = w.querySelector('input'); const send = () => { const v = inp.value; inp.value = ''; this.SendTyped(v); };
    w.querySelector('[data-send]').addEventListener('click', send);
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); send(); } });
    UI.root.appendChild(w); this.el = w;
    const fit = () => { const vv = window.visualViewport; if (!vv) return; w.style.top = vv.offsetTop + 'px'; w.style.height = vv.height + 'px'; const m = w.querySelector('.msgs'); m.scrollTop = m.scrollHeight; };
    this._vv = fit; if (window.visualViewport) window.visualViewport.addEventListener('resize', fit); fit();
    Sfx.Play('pop', 0.6);
  },
  Render() {
    const w = this.el; if (!w) return;
    const g = this.who, p = this.post;
    w.querySelector('.chead b').textContent = this.mode === 'guest' ? ((g ? this.Shown(g).icon : '') + ' ' + (g ? g.name : '')) : ('📱 ' + (p ? p.author : ''));
    w.querySelector('.chead small').textContent = this.mode === 'guest' ? (g ? this.TypeName(g) + (g.room ? ' · Oda ' + g.room.number : g.s === Guest.S.Queue ? ' · sırada' : '') : '') : 'Otelgram yorumu';
    w.classList.toggle('post', this.mode === 'post');
    const m = w.querySelector('.msgs'); m.innerHTML = '';
    for (const x of this.msgs) { const b = document.createElement('div'); b.className = 'bub ' + (x.me ? 'me' : 'they'); b.textContent = x.text; m.appendChild(b); }
    if (this.busy) { const b = document.createElement('div'); b.className = 'bub they dots'; b.textContent = '…'; m.appendChild(b); }
    m.scrollTop = m.scrollHeight;
    const c = w.querySelector('.choices'); c.innerHTML = '';
    this.choices.forEach((ch, i) => { const b = document.createElement('button'); b.className = 'ghost'; b.textContent = ch[0]; b.addEventListener('click', () => this.Pick(i)); c.appendChild(b); });
    const canType = !!Social.sample && !this.done && !this.busy && (this.mode === 'post' ? this.typed === 0 : this.typed < 3);
    w.querySelector('.typebar').hidden = !canType;
    if (this.done) { const b = document.createElement('button'); b.className = 'gold'; b.textContent = 'Tamam' + (this.result ? ' · ' + this.result : ''); b.addEventListener('click', () => this.Close()); c.appendChild(b); }
  },
};
