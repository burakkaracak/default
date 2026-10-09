# Elif dokunuşları testi: özel günler (tarih değiştirilerek), otel defteri notları, kıyafet ve şapka, tablolar, kedi, müzik, ipuçları.
# Kullanım: python3 test_elif.py [çıktı_klasörü]
import glob, sys, subprocess, time, os
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__))
C = sorted(glob.glob('/opt/pw-browsers/chromium*/chrome-linux*/chrome'))[0]
OUT = sys.argv[1] if len(sys.argv) > 1 else HERE + '/elif_shots'
os.makedirs(OUT, exist_ok=True)
srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8849'], cwd=HERE + '/dist', stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(0.8)
fails = []
def check(name, ok, info=''):
    print(('TAMAM  ' if ok else 'HATA   ') + name + ('  ' + str(info) if info else ''))
    if not ok: fails.append(name)
BOOT = "(()=>{const g=window.__game,G=g.Game; g.Store.DeleteAll(); window.__Album.Clear(); g.UI.ClearDialogs(); g.Quality.auto=false; g.Quality.Set(0); G.spawnT=1e9; G.st.tutorial=99; G.st.achInit=true; window.__noWedding=1; window.__L.Events.length=0; window.__noRender=1; window.__today=null; return 1})()"
try:
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=C, args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        pg = b.new_page(viewport={'width': 393, 'height': 760}, device_scale_factor=2, is_mobile=True, has_touch=True); errs = []
        pg.on('pageerror', lambda e: errs.append('HATA ' + str(e)[:300]))
        pg.on('console', lambda m: m.type == 'error' and 'Failed to load resource' not in m.text and errs.append('KONSOL ' + m.text[:300]))
        pg.goto('http://localhost:8849/play.html'); pg.wait_for_function('window.__ready === true', timeout=120000)
        pg.evaluate(BOOT)
        # --- 1) özel günler
        r = pg.evaluate("""(()=>{const S=window.__Special,out={}; for(const d of ['2026-05-10','2026-05-09','2027-05-09','2026-10-29','2026-10-30','2026-01-01','2026-02-14','2026-03-08','2026-04-23','2026-04-19','2026-05-19','2026-07-01']){ window.__today=d; const m=S.Today(); out[d]=m&&m.id;} window.__today=null; return out})()""")
        exp = {'2026-05-10': 'anneler', '2026-05-09': None, '2027-05-09': 'anneler', '2026-10-29': 'ekim29', '2026-10-30': None, '2026-01-01': 'yilbasi', '2026-02-14': 'sevgililer', '2026-03-08': 'kadinlar', '2026-04-23': 'dogum', '2026-04-19': 'yildonumu', '2026-05-19': 'mayis19', '2026-07-01': None}
        check('sabit özel günler ve Anneler Günü (Mayıs\'ın 2. pazarı) doğru bulunuyor', r == exp, r)
        r = pg.evaluate("""(()=>{const S=window.__Special,E=window.__ElifData; E.birthday=[14,6]; E.anniversary=[3,9]; window.__today='2026-06-14'; const a=S.Today(); window.__today='2026-09-03'; const b=S.Today(); window.__today='2026-06-15'; const c=S.Today(); E.birthday=null; E.anniversary=null; window.__today=null; return [a&&a.id, b&&b.id, c&&c.id]})()""")
        check('kişisel yuva: doğum günü ve yıldönümü tanımlanınca tanınıyor, boşken hiçbir şey çıkmıyor', r == ['dogum', 'yildonumu', None], r)
        r = pg.evaluate("""(()=>{const g=window.__game,G=g.Game,S=window.__Special; window.__today='2026-10-29'; const m0=G.st.money; S.t=0; S.Tick(0.1); const first={gift:G.st.money-m0, dlg:/Cumhuriyet/.test((document.querySelector('.dialog')||{}).innerText||''), deco:!!S.deco, key:Object.keys(G.st.celebrated)}; g.UI.ClearDialogs(); S.t=0; S.Tick(0.1); first.again=G.st.money-m0-first.gift; first.dlg2=!!document.querySelector('.dialog'); return first})()""")
        check('özel gün: kutlama penceresi, hediye, süsleme; aynı yıl ikinci kez tekrarlanmıyor', r['dlg'] and r['gift'] > 0 and r['deco'] and r['key'] == ['ekim292026'] and r['again'] == 0 and not r['dlg2'], r)
        pg.screenshot(path=OUT + '/ozel_gun.png')
        r = pg.evaluate("""(()=>{const g=window.__game,G=g.Game,S=window.__Special; window.__today='2026-10-30'; S.t=0; S.Tick(0.1); return {deco:!!S.deco, id:S.decoId}})()""")
        check('özel gün geçince süsleme kalkıyor', not r['deco'] and r['id'] is None, r)
        # --- 2) notlar
        r = pg.evaluate("""(()=>{const g=window.__game,G=g.Game,S=window.__Special; window.__today=null; g.World.day=1; G.st.notesRead=[]; G.st.noteLog=[]; const a=(S.Pending()||{}).id; g.World.day=2; const b=(S.Pending()||{}).id; return [a,b]})()""")
        check('not, koşulu sağlanınca bekliyor (gün 1: yok, gün 2: n1)', r == [None, 'n1'], r)
        pg.evaluate("(()=>{const g=window.__game,G=g.Game; G.player.floor=0; g.Hotel.SetView(0); window.__Special.Frame(); return 1})()"); pg.wait_for_timeout(500)
        check('lobide "defterde bir not var" etiketi görünüyor', pg.evaluate("[...document.querySelectorAll('.wlabel')].some(l=>/not var/.test(l.textContent))"))
        r = pg.evaluate("""(()=>{const g=window.__game,G=g.Game,S=window.__Special; S.Read(S.Pending()); const dlg=!!document.querySelector('.dialog'); g.UI.ClearDialogs(); return {dlg, next:(S.Pending()||{}).id, log:G.st.noteLog.length, read:G.st.notesRead.length}})()""")
        check('not okunur, kayda yazılır, aynı not tekrar çıkmaz', r['dlg'] and r['next'] is None and r['log'] == 1 and r['read'] == 1, r)
        r = pg.evaluate("""(()=>{const g=window.__game,G=g.Game,S=window.__Special,E=window.__ElifData; E.personal=[{id:'p1', when:{day:1}, from:'Burak', text:'Deneme notu'}]; const p=S.Pending(); E.personal=[]; return p&&p.id})()""")
        check('kişisel not yuvası çalışıyor (Burak notu eklenince çıkıyor)', r == 'p1', r)
        pg.evaluate("window.__game.Game.MenuSheet('album')"); pg.wait_for_timeout(300)
        check('Albüm sekmesinde NOTLAR bölümü var', pg.evaluate("/NOTLAR/.test(document.querySelector('.sheet .body').innerText)")); pg.evaluate("window.__game.UI.CloseSheet()")
        # --- 3) kıyafet
        r = pg.evaluate("""(()=>{const g=window.__game,G=g.Game,P=G.player; G.MenuSheet('ayar'); const imgs=document.querySelectorAll('.of img').length, ofs=document.querySelectorAll('.of').length; const old=P.rig, n0=g.Rig.all.size; document.querySelectorAll('.of')[7].click(); return {imgs, ofs, look:G.st.look, swapped:P.rig!==old, destroyed:old.go.userData.destroyed, n:g.Rig.all.size-n0}})()""")
        check('Ayarlar\'da 12 kıyafet önizlemeli; seçince model değişti, eskisi yok edildi', r['ofs'] == 12 and r['imgs'] == 12 and r['look'] == 'character-male-b' and r['swapped'] and r['destroyed'], r)
        pg.evaluate("window.__noRender=0"); pg.wait_for_timeout(1500); pg.evaluate("window.__noRender=1")
        r = pg.evaluate("window.__game.Rig.all.size")
        check('eski model Rig listesinden temizlendi (sızıntı yok)', r <= 2, r)
        r = pg.evaluate("""(()=>{const g=window.__game,G=g.Game; [...document.querySelectorAll('.sheet .grid3 button')][3].click(); return {hat:G.st.hat, mesh:!!window.__Outfit.hat, child:G.player.go.children.some(c=>c.name==='Sapka')}})()""")
        check('şapka takıldı (silindir), oyuncunun çocuğu', r['hat'] == 'silindir' and r['mesh'] and r['child'], r)
        pg.evaluate("window.__game.UI.CloseSheet()")
        # --- 3b) lobi tabloları: yükleme, albüm yedeği, kaldırma
        pg.evaluate("window.__Gallery.Clear(); window.__Album.Clear()")
        r = pg.evaluate("(()=>{const G=window.__Gallery; G.Init(); return {planes:G.planes.length, vis:G.planes.some(p=>p.visible), src:G.Sources().length}})()")
        check('fotoğraf yokken tablolar düz kalıyor', r['planes'] == 2 and not r['vis'] and r['src'] == 0, r)
        import base64
        png = pg.evaluate("(()=>{const c=document.createElement('canvas'); c.width=300; c.height=200; const x=c.getContext('2d'); x.fillStyle='#e0508a'; x.fillRect(0,0,300,200); x.fillStyle='#fff'; x.fillRect(100,60,100,80); return c.toDataURL('image/png')})()")
        buf = base64.b64decode(png.split(',')[1])
        pg.evaluate("window.__game.Game.MenuSheet('album')"); pg.wait_for_timeout(300)
        pg.set_input_files('.sheet input[type=file]', files=[{'name': 'elif1.png', 'mimeType': 'image/png', 'buffer': buf}, {'name': 'elif2.png', 'mimeType': 'image/png', 'buffer': buf}])
        pg.wait_for_timeout(1500)
        r = pg.evaluate("(()=>{const G=window.__Gallery; return {n:G.Items().length, jpeg:G.Items()[0].startsWith('data:image/jpeg'), vis:G.planes.filter(p=>p.visible).length, map:G.planes.filter(p=>p.material.map).length, thumbs:document.querySelectorAll('.sheet .photos .ph').length}})()")
        check('2 fotoğraf yüklendi, küçük JPEG saklandı, iki tablo da dolu', r['n'] == 2 and r['jpeg'] and r['vis'] == 2 and r['map'] == 2, r)
        pg.screenshot(path=OUT + '/tablolar_ayar.png')
        pg.evaluate("document.querySelector('.sheet .photos .ph').click()"); pg.wait_for_timeout(300)
        check('fotoğrafa dokununca kaldırılıyor', pg.evaluate("window.__Gallery.Items().length") == 1)
        r = pg.evaluate("""(()=>{const G=window.__Gallery; for(let i=0;i<8;i++){ G.Add; } const a=[]; for(let i=0;i<9;i++) a.push(G.Items()[0]); localStorage.setItem(G.Key, JSON.stringify(a)); const n=G.Items().length; G.Clear(); return n})()""")
        pg.evaluate("window.__game.UI.CloseSheet()")
        # albüm yedeği: yüklenen yok, albümde fotoğraf var
        pg.evaluate("""(()=>{const A=window.__Album,G=window.__Gallery; G.Clear(); const cv=document.createElement('canvas'); cv.width=640; cv.height=360; const x=cv.getContext('2d'); x.fillStyle='#4a9fe0'; x.fillRect(0,0,640,360); A.Add(cv); return 1})()""")
        pg.wait_for_timeout(800)
        r = pg.evaluate("(()=>{const G=window.__Gallery; return {src:G.Sources().length, vis:G.planes.filter(p=>p.visible).length}})()")
        check('yüklenen yoksa albümdeki fotoğraf tabloya asılıyor', r['src'] == 1 and r['vis'] == 2, r)
        # bozuk resim: düz tablo kalır, hata yok
        r = pg.evaluate("""(()=>{const G=window.__Gallery; localStorage.setItem(G.Key, JSON.stringify(['data:image/png;base64,AAAA'])); G.Refresh(); return 1})()""")
        pg.wait_for_timeout(600)
        r = pg.evaluate("window.__Gallery.planes.every(p=>!p.visible)")
        check('bozuk resimde tablolar düz kalıyor, hata çıkmıyor', r)
        pg.evaluate("window.__Gallery.Clear(); window.__Gallery.Refresh()")
        # --- 3c) kedi
        r = pg.evaluate("""(()=>{const g=window.__game,G=g.Game,P=window.__Pets; const c=P.cat; let meshes=0; c.go.traverse(o=>{ if(o.isMesh) meshes++; }); G.player.floor=0; g.Hotel.SetView(0); P.Frame(); const v0=c.go.visible; g.Hotel.SetView(1); P.Frame(); const v1=c.go.visible; g.Hotel.SetView(0); P.Frame(); c.go.position.set(-6,0,2); const p0=G.st.pets||0; const a=P.Tap({x:-5.8,y:0,z:2}), n1=G.st.pets-p0; const b=P.Tap({x:-5.8,y:0,z:2}), n2=G.st.pets-p0; const far=P.Tap({x:5,y:0,z:2}); return {inGuests:G.guests.length, meshes, v0, v1, a, n1, b, n2, far}})()""")
        check('kedi: misafir listesinde değil, 3 çizimlik ağ, yalnız lobide görünür', r['inGuests'] == 0 and r['meshes'] <= 5 and r['v0'] and not r['v1'], r)
        check('kedi: dokununca sevilir, bekleme süresi var, uzağa dokunmak sevmez', r['a'] and r['n1'] == 1 and r['b'] and r['n2'] == 1 and not r['far'], r)
        r = pg.evaluate("""(()=>{const g=window.__game,G=g.Game,P=window.__Pets; const c=P.cat; c.state='walk'; c.target=V=null; return 1})()""") if False else None
        r = pg.evaluate("""(()=>{const g=window.__game,P=window.__Pets,c=P.cat; c.state='idle'; c.t=0; c.go.position.set(-8,0,2); const pts=[]; for(let i=0;i<60;i++){ const s=c.constructor.Spot(); pts.push(s); } const ok=pts.every(s=>Math.abs(s.x)>=2.4 && s.z>=-2.1 && s.z<=5.1 && s.x<=-2.4); return {ok, name:c.tag.text}})()""")
        check('kedi: gezinti noktaları kuyruk ve yürüyüş yolundan uzak', r['ok'], r)
        r = pg.evaluate("""(()=>{const g=window.__game,G=g.Game; G.st.pets=9; const A=window.__Ach; A.t=0; A.Tick(0.1); window.__Pets.cat.loveCd=0; window.__Pets.cat.Pet(); A.t=0; A.Tick(0.1); return A.Done('kedi10')})()""")
        check('kedi: 10 sevgide başarım açılıyor', r)
        # --- 3d) müzik
        r = pg.evaluate("""(async()=>{const g=window.__game,M=window.__Music; if(!window.__Sfx0){} g.Game.st.music=true; try{ window.AudioContext||window.webkitAudioContext }catch(e){} const Sfx=g.Game&&window.__sfx; return !!(window.AudioContext||window.webkitAudioContext)})()""")
        pg.evaluate("window.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyX'}))"); pg.wait_for_timeout(300)
        r = pg.evaluate("(()=>{const M=window.__Music; return {ctx:!!M.ctx, master:!!M.master}})()")
        check('müzik: ilk dokunuş/tuş sonrası başlatılıyor', r['ctx'] and r['master'], r)
        pg.wait_for_timeout(4500)
        r = pg.evaluate("(()=>{const M=window.__Music; return {day:M.day&&Math.round(M.day.duration), night:M.night&&Math.round(M.night.duration), started:M.started}})()")
        check('müzik: gündüz ve gece döngüleri üretildi (her biri ~20-30 sn)', r['day'] and r['night'] and 15 <= r['day'] <= 45 and 15 <= r['night'] <= 60, r)
        r = pg.evaluate("""(()=>{const g=window.__game,M=window.__Music,t0=performance.now(); const b=M.Make({bpm:84,seed:3,decay:2.4,len:1.4,amp:0.05,rest:0.25,chords:[[262,330,392,494],[220,262,330,392],[175,220,262,330],[196,247,294,392]],rep:2}); return {ms:Math.round(performance.now()-t0), len:+b.duration.toFixed(1)}})()""")
        check('müzik: bir döngünün üretimi 1,5 sn\'den kısa (başsız, yavaş ortamda)', r['ms'] < 1500, r); print('   üretim süresi:', r)
        r = pg.evaluate("""(()=>{const g=window.__game,M=window.__Music; g.Game.st.music=true; g.Game.st.sound=true; g.Sfx0=1; for(let i=0;i<40;i++) M.Frame(0.1); const on=M.master.gain.value; g.Game.st.music=false; for(let i=0;i<40;i++) M.Frame(0.1); const off=M.master.gain.value; g.Game.st.music=true; return {on:+on.toFixed(2), off:+off.toFixed(2)}})()""")
        check('müzik: açıkken ses, ayardan kapatınca sessiz', r['on'] > 0.4 and r['off'] < 0.05, r)
        r = pg.evaluate("""(()=>{const g=window.__game,M=window.__Music; g.World.time=0.9; g.World.Apply(); for(let i=0;i<60;i++) M.Frame(0.1); const n=M.gNight.gain.value, d=M.gDay.gain.value; g.World.time=0.5; g.World.Apply(); for(let i=0;i<60;i++) M.Frame(0.1); return {geceN:+n.toFixed(2), geceD:+d.toFixed(2), gunN:+M.gNight.gain.value.toFixed(2), gunD:+M.gDay.gain.value.toFixed(2)}})()""")
        check('müzik: gece döngüsüne, gündüz döngüsüne yumuşak geçiş', r['geceN'] > 0.8 and r['geceD'] < 0.2 and r['gunN'] < 0.2 and r['gunD'] > 0.8, r)
        # --- 3e) ipuçları
        r = pg.evaluate("""(()=>{const g=window.__game,G=g.Game,H=window.__Hints; g.UI.ClearDialogs(); g.UI.CloseSheet(); G.st.hints={}; G.st.tutorial=2; H.t=0; H.last=-999; H.Tick(0.1); const a=Object.keys(G.st.hints).length; G.st.tutorial=99; G.st.served=5; H.t=0; H.Tick(0.1); const b=Object.keys(G.st.hints); const txt=document.getElementById('hint').textContent; H.t=0; H.Tick(0.1); const c=Object.keys(G.st.hints).length; return {ogretici:a, ilk:b, txt:txt.slice(0,30), araSure:c}})()""")
        check('ipucu: öğretici sürerken çıkmaz; sonra bir tane gösterilir; 75 sn dolmadan ikincisi çıkmaz', r['ogretici'] == 0 and len(r['ilk']) == 1 and r['araSure'] == 1 and r['txt'], r)
        r = pg.evaluate("""(()=>{const g=window.__game,G=g.Game,H=window.__Hints; const first=Object.keys(G.st.hints)[0]; H.last=-999; G.st.hints={[first]:1}; H.t=0; H.Tick(0.1); return Object.keys(G.st.hints).filter(k=>k!==first).length})()""")
        check('ipucu: aynı ipucu ikinci kez çıkmaz, sıradaki gelir', r == 1, r)
        r = pg.evaluate("""(()=>{const g=window.__game,G=g.Game,H=window.__Hints; G.st.hints={}; H.last=-999; H.t=0; G.MenuSheet('otel'); H.Tick(0.1); const sheet=Object.keys(G.st.hints).length; g.UI.CloseSheet(); return sheet})()""")
        check('ipucu: menü açıkken çıkmaz', r == 0, r)
        # --- 3f) mevsim ve gece efektleri
        r = pg.evaluate("""(()=>{const g=window.__game,G=g.Game,L=window.__L; g.Quality.Set(1); g.World.day=15; g.World.weather='sunny'; L.TickFX(0.05); const f=L.fx; const a=f.leaf.visible; g.World.weather='rainy'; L.TickFX(0.05); const b=f.leaf.visible; g.World.weather='sunny'; g.World.day=22; L.TickFX(0.05); const c=f.leaf.visible; g.World.day=1; L.TickFX(0.05); const d=f.leaf.visible; g.Quality.Set(0); g.World.day=15; L.TickFX(0.05); const e=f.leaf.visible; g.Quality.Set(1); return {sonbahar:a, yagmurda:b, yaz:c, ilkbahar:d, dusukKalite:e}})()""")
        check('mevsim yaprakları: sonbahar ve ilkbaharda, yağmurda ve yazın değil, düşük kalitede yok', r == {'sonbahar': True, 'yagmurda': False, 'yaz': False, 'ilkbahar': True, 'dusukKalite': False}, r)
        r = pg.evaluate("""(()=>{const g=window.__game,G=g.Game,L=window.__L; g.World.day=15; g.World.weather='sunny'; g.World.time=0.9; g.World.Apply(); L.TickFX(0.05); const night=L.fx.fly.visible; g.World.time=0.5; g.World.Apply(); L.TickFX(0.05); const day=L.fx.fly.visible; g.World.time=0.9; g.World.Apply(); g.World.day=22; L.TickFX(0.05); const kis=L.fx.fly.visible; g.World.weather='rainy'; g.World.day=15; L.TickFX(0.05); const rain=L.fx.fly.visible; g.World.weather='sunny'; g.World.time=0.5; g.World.Apply(); return {night, day, kis, rain}})()""")
        check('ateş böcekleri: yalnız sakin gecelerde (gündüz, kış, yağmurda yok)', r == {'night': True, 'day': False, 'kis': False, 'rain': False}, r)
        # --- 4) kayıt ve yeniden yükleme
        pg.evaluate("window.__game.Game.Save()")
        pg.reload(); pg.wait_for_function('window.__ready === true', timeout=90000); pg.evaluate("window.__game.UI.ClearDialogs(); window.__noWedding=1; window.__game.Game.spawnT=1e9")
        pg.wait_for_timeout(800)
        r = pg.evaluate("(()=>{const G=window.__game.Game; return {look:G.st.look, hat:G.st.hat, mesh:!!window.__Outfit.hat, notes:G.st.noteLog.length, cel:Object.keys(G.st.celebrated)}})()")
        check('yeniden yükleme: kıyafet, şapka, notlar ve kutlama kaydı korundu', r['look'] == 'character-male-b' and r['hat'] == 'silindir' and r['mesh'] and r['notes'] == 1 and r['cel'] == ['ekim292026'], r)
        r = pg.evaluate("""(()=>{const g=window.__game,G=g.Game,S=window.__Special; window.__today='2026-10-29'; g.UI.ClearDialogs(); S.t=0; S.Tick(0.1); const again=!!document.querySelector('.dialog'); window.__today=null; return {again, deco:!!S.deco}})()""")
        check('yeniden yükleme sonrası aynı gün tekrar kutlama penceresi çıkmıyor (süsleme duruyor)', not r['again'] and r['deco'], r)
        pg.screenshot(path=OUT + '/yukleme_sonrasi.png')
        for e in sorted(set(errs)): print('  ' + e)
        if errs: fails.append('hatalar')
        b.close()
finally:
    srv.terminate()
print('\nSORUN YOK' if not fails else f'\n{len(fails)} SORUN: ' + ', '.join(fails))
print('Ekran görüntüleri:', OUT)
sys.exit(1 if fails else 0)
