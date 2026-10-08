# Otelgram, sohbet, mektup testi: veri yolu, oyunun durması, yazarken oyun tuşlarının çalışmaması, kayıt/yeniden yükleme.
# Kullanım: python3 test_social.py [çıktı_klasörü]
import glob, sys, subprocess, time, os
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__))
C = sorted(glob.glob('/opt/pw-browsers/chromium*/chrome-linux*/chrome'))[0]
OUT = sys.argv[1] if len(sys.argv) > 1 else HERE + '/social_shots'
os.makedirs(OUT, exist_ok=True)
srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8845'], cwd=HERE + '/dist', stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(0.8)
fails = []
def check(name, ok, info=''):
    print(('TAMAM  ' if ok else 'HATA   ') + name + ('  ' + str(info) if info else ''))
    if not ok: fails.append(name)
SEAT = """(()=>{const g=window.__game,G=g.Game; const r=g.Hotel.Room(11); const x=G.Spawn(window.__t||'turist'); x.path=[]; x.room=r; r.guest=x; r.state='occupied'; x.floor=1; x.pos.set(r.inside.x, g.Hotel.FloorY(1), r.inside.z); x.EnterRoom(); g.Hotel.SetView(1); window.__x=x; return [x.name, x.type.id]})()"""
try:
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=C, args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        pg = b.new_page(viewport={'width': 393, 'height': 760}, device_scale_factor=2, is_mobile=True, has_touch=True); errs = []
        pg.on('pageerror', lambda e: errs.append('HATA ' + str(e)[:300]))
        pg.on('console', lambda m: m.type == 'error' and 'Failed to load resource' not in m.text and errs.append('KONSOL ' + m.text[:300]))
        pg.goto('http://localhost:8845/play.html'); pg.wait_for_function('window.__ready === true', timeout=120000)
        pg.evaluate("(()=>{const g=window.__game,G=g.Game; g.Store.DeleteAll(); g.UI.ClearDialogs(); g.Quality.auto=false; g.Quality.Set(0); G.spawnT=1e9; G.st.money=1e6; G.st.tutorial=99; for(let i=0;i<3;i++) G.BuyRoom(G.NextRoom()); g.UI.ClearDialogs(); window.__noRender=1; return 1})()")
        # --- 1) sohbet oyunu durdurur ve misafiri etkiler
        info = pg.evaluate(SEAT); pg.wait_for_timeout(300)
        pg.evaluate("(()=>{const g=window.__game; g.Chat.StartGuest(window.__x); window.__sat0=window.__x.sat; return 1})()")
        pg.wait_for_timeout(300)
        t0 = pg.evaluate("window.__game.Time.time")
        pg.wait_for_timeout(1200)
        s = pg.evaluate("(()=>{const g=window.__game; return {open:g.Chat.open, blocking:g.UI.Blocking, ts:g.Time.timeScale, ch:g.Chat.choices.length, dom:!!document.querySelector('.chat'), msgs:document.querySelectorAll('.bub').length}})()")
        t1 = pg.evaluate("window.__game.Time.time")
        check('sohbet açıldı, oyun durdu', s['open'] and s['blocking'] and s['ts'] == 0 and s['ch'] == 3 and s['dom'], s)
        check('sohbet sırasında oyun saati ilerlemedi', abs(t1 - t0) < 0.05, (t0, t1))
        pg.screenshot(path=OUT + '/sohbet.png')
        # en iyi cevapları seç (en yüksek puan)
        for _ in range(3):
            pg.evaluate("(()=>{const C=window.__game.Chat; if(!C.choices.length) return; let b=0; C.choices.forEach((c,i)=>{ if(c[2]>C.choices[b][2]) b=i; }); C.Pick(b);})()")
            pg.wait_for_timeout(1500)
        s = pg.evaluate("(()=>{const g=window.__game,C=g.Chat,x=window.__x; return {done:C.done, mood:C.mood, sat:x.sat, sat0:window.__sat0, tips:x.tips, chatted:x.chatted}})()")
        check('sohbet bitti: memnuniyet arttı', s['done'] and s['sat'] > s['sat0'] and s['chatted'], s)
        check('çok iyi sohbet bahşiş getirdi', s['mood'] >= 3 and s['tips'] > 0, s)
        pg.screenshot(path=OUT + '/sohbet_bitti.png')
        pg.evaluate("window.__game.Chat.Close()")
        s = pg.evaluate("(()=>{const g=window.__game; return {open:g.Chat.open, blocking:g.UI.Blocking, dom:!!document.querySelector('.chat-wrap'), again:g.Chat.Can(window.__x)}})()")
        check('sohbet kapandı, oyun devam ediyor, ikinci kez sohbet edilemez', not s['open'] and not s['blocking'] and not s['dom'] and not s['again'], s)
        # --- 2) gizli misafir sıradan tür gibi konuşur
        pg.evaluate("window.__t='milyoner'"); pg.evaluate(SEAT)
        s = pg.evaluate("(()=>{const g=window.__game,x=window.__x; g.Chat.StartGuest(x); const first=g.Chat.msgs[0].text; const pool=[...g.TalkData.talks.turist,g.TalkData.waiting].map(t=>t[0]); const r={type:x.type.id, first, inTurist:pool.includes(first), tag:x.tag.text}; g.Chat.Close(); return r})()")
        check('gizli milyoner turist gibi konuşuyor, etiketi turist', s['inTurist'] and s['tag'].startswith('🧳'), s)
        pg.evaluate("window.__t='turist'")
        # --- 3) serbest yazma: yeteneği yokken düğme gizli
        s = pg.evaluate("(()=>{const g=window.__game; g.Social.sample=null; g.Social.GetSample(); const x=window.__x; x.chatted=false; g.Chat.StartGuest(x); const hidden=document.querySelector('.typebar').hidden; g.Chat.Close(); return {hidden}})()")
        check('Claude yeteneği yokken "kendin yaz" çubuğu gizli, hata yok', s['hidden'], s)
        # --- 4) serbest yazma sahte yetenekle: oyun tuşları çalışmasın
        pg.evaluate("window.__x.chatted=false; window.__game.Social.sample={json: async (p)=>({reply:'Ne güzel, teşekkürler!', mood:2})}; window.__game.Chat.StartGuest(window.__x); window.__game.Chat.choices=[]; window.__game.Chat.Render()")
        pg.wait_for_timeout(200)
        yaw0 = pg.evaluate("window.__game.Cam.yawGoal"); pos0 = pg.evaluate("(()=>{const p=window.__game.Game.player.go.position; return [p.x,p.z]})()")
        pg.click('.typebar input'); pg.keyboard.type('wasdqe merhaba')
        yaw1 = pg.evaluate("window.__game.Cam.yawGoal"); keys = pg.evaluate("window.__game.Chat.el.querySelector('input').value")
        check('yazarken kamera dönmedi, tuşlar oyuna gitmedi', yaw0 == yaw1 and keys == 'wasdqe merhaba', {'yaw': (yaw0, yaw1), 'value': keys})
        pg.screenshot(path=OUT + '/yazma.png')
        pg.keyboard.press('Enter'); pg.wait_for_timeout(1200)
        s = pg.evaluate("(()=>{const C=window.__game.Chat; return {typed:C.typed, mood:C.mood, last:C.msgs[C.msgs.length-1].text, busy:C.busy}})()")
        check('yazılan mesaja cevap geldi', s['typed'] == 1 and s['mood'] == 2 and 'güzel' in s['last'], s)
        pg.evaluate("window.__game.Chat.Close(); window.__game.Social.sample=null")
        # --- 5) ödemede paylaşım, Otelgram, yanıt, takipçi
        pg.evaluate("window.__game.UI.ClearDialogs()")
        n = pg.evaluate("(()=>{const g=window.__game,G=g.Game; const x=G.guests[0]; for(let i=0;i<40;i++) g.Social.OnPaid({type:{id:'turist'}, name:'Deneme', pos:x.pos}, 4.8, x.room); return G.st.feed.length})()")
        check('memnun ödemeler Otelgram paylaşımı üretti', n > 0, n)
        pg.evaluate("(()=>{const g=window.__game,G=g.Game; g.Social.Add('@kotu.yorum','Oda tozluydu',40,true,0); window.__f0=G.st.followers; window.__rep0=G.st.rep; window.__p=G.st.feed[0]; g.Social.Open('akis'); return 1})()")
        pg.wait_for_timeout(400)
        s = pg.evaluate("(()=>{const g=window.__game; return {unread:g.Game.st.unread, posts:document.querySelectorAll('.sheet .post').length, btns:[...document.querySelectorAll('.sheet .post button')].length}})()")
        check('Otelgram akışı açıldı, yanıtla düğmeleri var', s['posts'] > 0 and s['btns'] > 0 and s['unread'] == 0, s)
        pg.screenshot(path=OUT + '/otelgram.png')
        pg.evaluate("window.__game.Chat.StartPost(window.__p)"); pg.wait_for_timeout(300)
        pg.evaluate("window.__game.Chat.Pick(0)"); pg.wait_for_timeout(1500)
        s = pg.evaluate("(()=>{const g=window.__game,G=g.Game,p=window.__p; return {f0:window.__f0, f1:G.st.followers, replied:!!p.reply, bad:p.bad, done:g.Chat.done}})()")
        check('kibar yanıt takipçi kazandırdı ve kötü yorumu yumuşattı', s['f1'] > s['f0'] and s['replied'] and not s['bad'], s)
        pg.evaluate("window.__game.Chat.Close()")
        # --- 6) mektup ve hikâye
        s = pg.evaluate("(()=>{const g=window.__game,G=g.Game; const mk=t=>({type:Data0.find(q=>q.id===t), name:'Misafir'}); return 0})()") if False else None
        res = pg.evaluate("(()=>{const g=window.__game,G=g.Game; G.st.letters=[]; G.st.arcs={}; const t=g.Data.Guests.find(q=>q.id==='balayi'); const out=[]; for(let i=0;i<4;i++){ g.Social.AddLetter({type:t,name:'Ece'}, null, 4.8); out.push(G.st.letters[0].arc);} g.UI.ClearDialogs(); return {arcs:out, n:G.st.letters.length, unreadL:G.st.unreadL, first:G.st.letters[3].text.slice(0,30), manager:G.st.manager}})()")
        check('mektup hikâyesi bölüm bölüm ilerliyor (1,2,3, sonra sıradan)', res['arcs'] == [1, 2, 3, 0], res)
        check('mektup yöneticiye hitap ediyor', res['first'].startswith('Sevgili ' + res['manager']), res)
        pg.evaluate("window.__game.Social.Open('mektup')"); pg.wait_for_timeout(300)
        n = pg.evaluate("document.querySelectorAll('.sheet .letter').length")
        check('mektuplar sekmesi dolu', n == 4, n); pg.screenshot(path=OUT + '/mektuplar.png')
        pg.evaluate("window.__game.UI.CloseSheet()")
        # --- 7) isim çakışması
        bad = pg.evaluate("(()=>{const g=window.__game,G=g.Game; let c=0; for(let i=0;i<60;i++){ const x=G.Spawn(); if(x.name===G.st.manager) c++; x.destroy(); G.OnGuestGone(x);} return c})()")
        check('hiçbir misafir müdürün adını taşımıyor', bad == 0, bad)
        # --- 8) kayıt ve yeniden yükleme
        before = pg.evaluate("(()=>{const G=window.__game.Game; G.Save(); return {f:G.st.followers, feed:G.st.feed.length, letters:G.st.letters.length, arcs:JSON.stringify(G.st.arcs)}})()")
        pg.reload(); pg.wait_for_function('window.__ready === true', timeout=90000); pg.evaluate("window.__game.UI.ClearDialogs(); window.__pause=1")
        after = pg.evaluate("(()=>{const G=window.__game.Game; return {f:G.st.followers, feed:G.st.feed.length, letters:G.st.letters.length, arcs:JSON.stringify(G.st.arcs)}})()")
        check('yeniden yükleme: takipçi, akış, mektup ve hikâye korundu', before == after, (before, after))
        s = pg.evaluate("(()=>{const g=window.__game; return g.Game.st.feed.length<=25 && g.Game.st.letters.length<=25})()")
        check('akış ve mektup listesi sınırlı (en çok 25)', s)
        # eski kayıt: yeni alanlar yokken
        s = pg.evaluate("(()=>{const g=window.__game,G=g.Game; delete G.st.feed; delete G.st.letters; delete G.st.arcs; delete G.st.followers; g.Social.Defaults(); g.Social.Open('akis'); const ok=Array.isArray(G.st.feed)&&G.st.followers===50; g.UI.CloseSheet(); return ok})()")
        check('eski kayıtta yeni alanlar varsayılanla doluyor', s)
        for e in sorted(set(errs)): print('  ' + e)
        if errs: fails.append('hatalar')
        b.close()
finally:
    srv.terminate()
print('\nSORUN YOK' if not fails else f'\n{len(fails)} SORUN: ' + ', '.join(fails))
print('Ekran görüntüleri:', OUT)
sys.exit(1 if fails else 0)
