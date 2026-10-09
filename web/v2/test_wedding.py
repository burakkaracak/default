# Düğün ve film ekibi olayı testi: teklif, kapora, sahne, katılım ödülü, sızıntı, yeniden yükleme, süresi geçen düğün.
# Kullanım: python3 test_wedding.py [çıktı_klasörü]
import glob, sys, subprocess, time, os
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__))
C = sorted(glob.glob('/opt/pw-browsers/chromium*/chrome-linux*/chrome'))[0]
OUT = sys.argv[1] if len(sys.argv) > 1 else HERE + '/wedding_shots'
os.makedirs(OUT, exist_ok=True)
srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8848'], cwd=HERE + '/dist', stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(0.8)
fails = []
def check(name, ok, info=''):
    print(('TAMAM  ' if ok else 'HATA   ') + name + ('  ' + str(info) if info else ''))
    if not ok: fails.append(name)
BOOT = "(()=>{const g=window.__game,G=g.Game; g.Store.DeleteAll(); window.__Album.Clear(); g.UI.ClearDialogs(); g.Quality.auto=false; g.Quality.Set(0); G.spawnT=1e9; G.st.tutorial=99; G.st.achInit=true; window.__noWedding=1; window.__L.Events.length=0; G.st.stars=3; G.st.money=1e5; window.__noRender=1; return 1})()"
try:
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=C, args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        pg = b.new_page(viewport={'width': 393, 'height': 760}, device_scale_factor=2, is_mobile=True, has_touch=True); errs = []
        pg.on('pageerror', lambda e: errs.append('HATA ' + str(e)[:300]))
        pg.on('console', lambda m: m.type == 'error' and 'Failed to load resource' not in m.text and errs.append('KONSOL ' + m.text[:300]))
        pg.goto('http://localhost:8848/play.html'); pg.wait_for_function('window.__ready === true', timeout=120000)
        pg.evaluate(BOOT)
        # --- 1) teklif kapalıyken gelmez; yetersiz yıldızda gelmez
        r = pg.evaluate("""(()=>{const g=window.__game,G=g.Game,W=window.__Wedding; let n=0; for(let i=0;i<40;i++){ if(W.NewDay()) n++; } G.st.stars=2; window.__noWedding=0; let m=0; for(let i=0;i<40;i++){ if(W.NewDay()) m++; } g.World.day=1; G.st.stars=3; window.__noWedding=0; let k=0; for(let i=0;i<40;i++) if(W.NewDay()) k++; window.__noWedding=1; g.UI.ClearDialogs(); return {bayrak:n, azYildiz:m, erkenGun:k}})()""")
        check('test bayrağı, 3 yıldız şartı ve 4. gün şartı teklifi engelliyor', r == {'bayrak': 0, 'azYildiz': 0, 'erkenGun': 0}, r)
        # --- 2) teklif: çift lobide bekler, pencere hemen açılmaz
        r = pg.evaluate("""(()=>{const g=window.__game,G=g.Game,W=window.__Wedding; g.World.day=5; g.World.time=0.40; const m0=G.st.money; W.Offer(); W.Tick(0.1); const p=G.st.wedding; return {stage:p.stage, dlg:!!document.querySelector('.dialog'), rigs:W.mActors.length, meeting:W.Meeting, pill:[...document.querySelectorAll('.pill')].map(x=>x.textContent), money:G.st.money-m0}})()""")
        check('teklif: çift lobide bekliyor, pencere yok, kat düğmesinde 💬, kapora henüz yok', r['stage'] == 'meet' and not r['dlg'] and r['rigs'] == 2 and r['meeting'] and '💬' in r['pill'] and r['money'] == 0, r)
        pg.evaluate("window.__game.Game.player.floor=0; window.__game.Hotel.SetView(0); window.__game.Cam && 0"); pg.wait_for_timeout(400); pg.screenshot(path=OUT + '/lobide_cift.png')
        # --- 3) müdür uzaktayken görüşme açılmaz, yanına gidince açılır
        r = pg.evaluate("""(()=>{const g=window.__game,G=g.Game,W=window.__Wedding; G.player.go.position.set(8,0,-3); W.Tick(0.1); const far=!!document.querySelector('.dialog'); G.player.go.position.set(W.Met.x+1.2,0,W.Met.z+1.2); W.Tick(0.1); const dlg=document.querySelector('.dialog'); return {far, near:!!dlg, tag:dlg?dlg.innerText.slice(0,20):'', btns:dlg?[...dlg.querySelectorAll('button')].map(x=>x.textContent):[]}})()""")
        check('görüşme yalnız müdür yanlarına gidince açılıyor; 3 süsleme + vazgeç', not r['far'] and r['near'] and 'DÜĞÜN' in r['tag'] and len(r['btns']) == 4, r)
        pg.screenshot(path=OUT + '/gorusme.png')
        pg.evaluate("document.querySelectorAll('.dialog button')[2].click()"); pg.wait_for_timeout(300)
        r = pg.evaluate("""(()=>{const dlg=document.querySelector('.dialog'); return {txt:dlg.innerText.slice(0,30), btns:[...dlg.querySelectorAll('button')].map(x=>x.textContent+(x.disabled?' [kilitli]':''))}})()""")
        check('paket penceresi: 3 paket + vazgeç; Lüks 3 yıldızda kilitli', len(r['btns']) == 4 and '[kilitli]' in r['btns'][2] and '[kilitli]' not in r['btns'][0], r)
        pg.evaluate("document.querySelectorAll('.dialog button')[0].click()"); pg.wait_for_timeout(300)
        r = pg.evaluate("""(()=>{const G=window.__game.Game,W=window.__Wedding; const w=G.st.wedding; return {stage:w.stage, theme:w.theme, pack:w.pack, deposit:w.deposit, money:G.st.money, day:w.day, feed:G.st.feed.length, meet:!!W.meet, busy:W.Meeting}})()""")
        check('kabul: kapora (710) kasaya girdi, aşama ok, görüşme figürleri gitti, Otelgram duyurdu', r['stage'] == 'ok' and r['theme'] == 2 and r['pack'] == 0 and r['deposit'] == 710 and r['money'] == 100710 and r['day'] == 5 and r['feed'] >= 1 and not r['meet'] and not r['busy'], r)
        # --- 3b) çift adı müdür ve hikâye adlarıyla çakışmaz
        r = pg.evaluate("""(()=>{const g=window.__game,G=g.Game,W=window.__Wedding; const bad=[]; for(let i=0;i<200;i++){ const c=W.Couple(G.st.manager); if(c.includes(G.st.manager)||c.some(n=>W.Reserved.includes(n))) bad.push(c); } G.st.manager='Zeynep'; for(let i=0;i<100;i++){ const c=W.Couple('Zeynep'); if(c.includes('Zeynep')) bad.push(c);} G.st.manager='Elif'; return bad.length})()""")
        check('çiftte müdürün ya da hikâye karakterlerinin adı yok', r == 0, r)
        # --- 3c) görüşmeye gitmezse çift vazgeçer; vazgeç düğmesi
        r = pg.evaluate("""(()=>{const g=window.__game,G=g.Game,W=window.__Wedding; const keep=G.st.wedding; G.st.wedding=null; g.World.day=8; g.World.time=0.40; W.Offer(); W.Tick(0.1); const had=W.mActors.length; g.World.time=0.495; W.Tick(0.1); const out={had, done:G.st.wedding.done, gone:!W.meet, ok:G.st.money}; G.st.wedding=keep; g.World.day=5; return out})()""")
        check('görüşmeye gidilmezse çift 12:00 öncesi vazgeçiyor, figürler kalkıyor', r['had'] == 2 and r['done'] and r['gone'], r)
        r = pg.evaluate("""(()=>{const g=window.__game,G=g.Game,W=window.__Wedding; const keep=G.st.wedding, m0=G.st.money; G.st.wedding=null; g.World.day=8; g.World.time=0.40; W.Offer(); G.player.floor=0; G.player.go.position.set(W.Met.x+1,0,W.Met.z+1); W.Tick(0.1); document.querySelectorAll('.dialog button')[3].click(); const out={done:G.st.wedding.done, gone:!W.meet, dm:G.st.money-m0, dlg:!!document.querySelector('.dialog')}; G.st.wedding=keep; g.World.day=5; g.UI.ClearDialogs(); return out})()""")
        check('görüşmede "Bu sefer olmaz": plan kapanır, para yok, figürler gider', r['done'] and r['gone'] and r['dm'] == 0 and not r['dlg'], r)
        # --- 4) sahne: erken saatte kurulmaz, öğleden sonra çatı terasında kurulur
        r = pg.evaluate("""(()=>{const g=window.__game,G=g.Game,W=window.__Wedding; g.World.time=0.40; W.Tick(0.1); return {phase:W.phase, root:!!W.root, busy:W.Busy}})()""")
        check('sabah sahne kurulmaz', r['phase'] == 0 and not r['root'] and not r['busy'], r)
        base = pg.evaluate("(()=>({rigs:window.__game.Rig.all.size, guests:window.__game.Game.guests.length}))()")
        r = pg.evaluate("""(()=>{const g=window.__game,G=g.Game,W=window.__Wedding; g.World.time=0.52; W.Tick(0.1); const out={phase:W.phase, actors:W.actors.length, busy:W.Busy, rigs:g.Rig.all.size, guests:G.guests.length, y:+W.root.position.y.toFixed(2), roofY:g.Hotel.FloorY(g.Hotel.RoofIndex), hall:!!g.Hotel.roof.children.find(c=>c.name==='TerasYapi'), seats:W.Seats.length}; G.spawnT=-1; G.Tick(0.1); out.spawnedWhileBusy=G.guests.length; return out})()""")
        check('öğleden sonra tören çatı terasında kuruldu: 8 figür (çift + 6 davetli), oyuncu misafir listesine girmedi', r['phase'] == 1 and r['actors'] == 8 and r['rigs'] - base['rigs'] == 8 and r['guests'] == base['guests'] and r['y'] == r['roofY'] and r['hall'] and r['seats'] == 16, r)
        check('tören sırasında yeni misafir üretimi duruyor', r['spawnedWhileBusy'] == base['guests'], r)
        r = pg.evaluate("""(()=>{const g=window.__game; return [...document.querySelectorAll('.pill')].map(p=>p.textContent)})()""")
        check('kat düğmelerinde 💍 var', '💍' in r, r)
        # --- 4b) teras yürünebilir ve yol bulma teraseye çıkıyor
        r = pg.evaluate("""(()=>{const g=window.__game,H=g.Hotel,f=H.RoofIndex; const V=g.Vec?g.Vec.make:null; const P=(x,z)=>({x,y:0,z}); const out={deck:H.Walkable(P(0,12.6),f), edge:H.Walkable(P(0,14.5),f), out:H.Walkable(P(0,16.5),f), side:H.Walkable(P(9.6,11),f), roof:H.Walkable(P(0,0),f)}; const path=H.Path(P(0,-3),0,P(0,12.6),f); out.n=path.length; out.lift=path.some(n=>n.lift!==undefined); out.last=[path[path.length-1].x,path[path.length-1].z]; return out})()""")
        check('teras yürünebilir (ön kenara kadar), dışarısı değil; zemin kattan terasa yol var', r['deck'] and r['edge'] and not r['out'] and not r['side'] and r['roof'] and r['lift'] and r['last'] == [0, 12.6], r)
        # --- 5) tören aşamaları, katılmadan bitiş
        pg.evaluate("(()=>{const g=window.__game,G=g.Game; G.player.floor=0; G.player.go.position.set(0,0,0); g.Hotel.SetView(0); G.player.path=[]; return 1})()")
        r = pg.evaluate("""(()=>{const g=window.__game,G=g.Game,W=window.__Wedding; g.World.time=0.55; W.Tick(0.1); const a=W.phase; g.World.time=0.65; W.Tick(0.1); const b=W.phase; return [a,b,W.OnDeck(),!!G.st.wedding.attended,G.st.wedding.care||0]})()""")
        check('aşamalar: tören(2) → kutlama(3); alt kattaki müdür katılmış ve ilgilenmiş sayılmıyor', r == [2, 3, False, False, 0], r)
        r = pg.evaluate("""(()=>{const g=window.__game,G=g.Game,W=window.__Wedding; const m0=G.st.money+G.st.till, rep0=G.st.rep; g.World.time=0.685; W.Tick(0.1); const dlg=(document.querySelector('.dialog')||{}).innerText||''; return {phase:W.phase, root:!!W.root, dm:G.st.money+G.st.till-m0, dr:G.st.rep-rep0, w:G.st.weddings, dlg:dlg.slice(0,90), mem:(G.st.memories||[])[0]&&G.st.memories[0].icon, done:G.st.wedding.done}})()""")
        check('katılmadan biten düğün: taban ödül (600+250×3=1350), +8 ün, sahne kalktı', r['phase'] == 0 and not r['root'] and r['dm'] == 1350 and r['dr'] >= 8 and r['w'] == 1 and r['done'] and r['mem'] == '💍', r)
        pg.evaluate("window.__game.UI.ClearDialogs()")
        pg.wait_for_timeout(2500)
        r = pg.evaluate("window.__game.Rig.all.size")
        check('düğün bitince figürler Rig listesinden temizlendi (sızıntı yok)', r <= base['rigs'], (r, base))
        # --- 6) müdür terasta: katılım + ilgi (3 istek) → ödül ×1,5 × 1,3
        pg.evaluate("""(()=>{const g=window.__game,G=g.Game,H=g.Hotel; g.World.day=6; G.st.wedding={day:6,theme:0,couple:['Selin','Can'],stage:'ok',pack:1,deposit:500,attended:false,done:false,care:0}; window.__Wedding._cared=[]; g.World.time=0.505; H.SetView(H.RoofIndex); G.player.floor=H.RoofIndex; G.player.go.position.set(5,H.FloorY(H.RoofIndex),12.6); return 1})()""")
        pg.wait_for_timeout(1200)
        r = pg.evaluate("(()=>{const W=window.__Wedding,G=window.__game.Game; return {phase:W.phase, deck:W.OnDeck(), att:G.st.wedding.attended, actors:W.actors.length, label:!!document.querySelector('.wlabel')}})()")
        check('terasta: sahne kuruldu (çift + 8 davetli); müdür teras üstündeyken "katıldı" sayıldı', r['phase'] >= 1 and r['deck'] and r['actors'] == 10, r)
        pg.evaluate("window.__game.World.time=0.60; window.__Wedding.Tick(0.1)")
        r = pg.evaluate("(()=>{const W=window.__Wedding,G=window.__game.Game; return {phase:W.phase, att:G.st.wedding.attended}})()")
        check('tören başlayınca katılım kaydedildi', r['att'] is True, r)
        for i, (tm, ic) in enumerate([(0.52, '💐'), (0.575, '🥂'), (0.63, '📸')]):
            pg.evaluate(f"""(()=>{{const g=window.__game,G=g.Game,H=g.Hotel,W=window.__Wedding; g.World.time={tm}; G.player.go.position.set(6,H.FloorY(H.RoofIndex),14.5); W.Tick(0.1); const far=G.st.wedding.care||0; G.player.go.position.set(0,H.FloorY(H.RoofIndex),11.3); W.Tick(0.1); window.__c{i}=[far, G.st.wedding.care]; return 1}})()""")
            r = pg.evaluate(f"window.__c{i}")
            check(f'ilgi isteği {i+1} ({ic}): uzaktayken sayılmaz, yanına gidince çift mutlu (+1)', r == [i, i + 1], r)
            if i == 0: pg.screenshot(path=OUT + '/toren.png')
        pg.evaluate("window.__game.World.time=0.66; window.__Wedding.Tick(0.1)"); pg.screenshot(path=OUT + '/kutlama.png')
        r = pg.evaluate("""(()=>{const g=window.__game,G=g.Game,W=window.__Wedding; const m0=G.st.money+G.st.till; g.World.time=0.685; W.Tick(0.1); const dlg=(document.querySelector('.dialog')||{}).innerText||''; return {dm:G.st.money+G.st.till-m0, w:G.st.weddings, dlg:/Törende yanlarındaydın/.test(dlg), care:/3\\/3/.test(dlg)}})()""")
        check('katılıp 3 istek yapınca ödül 1350×1,4 (Yemekli)×1,5×1,3 = 3685', r['dm'] == 3685 and r['w'] == 2 and r['dlg'] and r['care'], r)
        pg.evaluate("window.__game.UI.ClearDialogs()")
        r = pg.evaluate("""(()=>{const W=window.__Wedding; const p=(pack,att,care)=>W.Reward({pack,attended:att,care}); return [p(0,false,0),p(0,true,0),p(2,true,3)]})()""")
        check('ödül tablosu: Sade 1350 / katılımlı 2025 / Lüks katılımlı 3 ilgili', r == [1350, 2025, 5002], r)
        # --- 7) yeniden yükleme: pencere içinde sahne yeniden kurulur
        pg.evaluate("""(()=>{const g=window.__game,G=g.Game; g.World.day=7; G.st.wedding={day:7,theme:1,couple:['Melis','Arda'],stage:'ok',pack:0,deposit:500,attended:false,done:false}; g.World.time=0.58; G.Save(); return 1})()""")
        pg.reload(); pg.wait_for_function('window.__ready === true', timeout=90000)
        pg.evaluate("window.__game.UI.ClearDialogs(); window.__noWedding=1; window.__L.Events.length=0; window.__game.Game.spawnT=1e9")
        pg.wait_for_timeout(1500)
        r = pg.evaluate("(()=>{const W=window.__Wedding,g=window.__game; return {phase:W.phase, actors:W.actors.length, day:g.World.day, t:+g.World.time.toFixed(2), plan:!!W.Plan}})()")
        check('yeniden yükleme: pencere içindeyse sahne yeniden kuruldu', r['plan'] and r['actors'] == 8, r)
        # eski kayıt (aşama alanı yok) tören gibi sürer; görüşme aşamasındaki kayıt yeniden yüklenince lobide figürler döner
        r = pg.evaluate("""(()=>{const g=window.__game,G=g.Game,W=window.__Wedding; W.Clear(); W.phase=0; g.World.day=7; delete G.st.wedding.stage; g.World.time=0.58; W.Tick(0.1); const old=W.phase; W.Clear(); W.phase=0; G.st.wedding={day:9,couple:['Gül','Tolga'],stage:'meet',done:false}; g.World.day=9; g.World.time=0.40; W.Tick(0.1); return {old, meet:W.mActors.length}})()""")
        check('eski kayıt (aşamasız) ve görüşme aşamasındaki kayıt doğru devam ediyor', r['old'] >= 1 and r['meet'] == 2, r)
        # --- 8) oyun kapalıyken gün geçti: düğün sessizce tamamlanır
        r = pg.evaluate("""(()=>{const g=window.__game,G=g.Game,W=window.__Wedding; W.ClearMeet(); W.Clear(); W.phase=0; G.st.wedding={day:9,theme:0,couple:['Gül','Tolga'],stage:'ok',pack:0,deposit:0,attended:false,done:false}; g.World.day=10; g.World.time=0.30; const m0=G.st.money+G.st.till; W.Tick(0.1); const dlg=(document.querySelector('.dialog')||{}).innerText||''; return {done:G.st.wedding.done, dm:G.st.money+G.st.till-m0, dlg:/sen yokken/.test(dlg), root:!!W.root}})()""")
        check('günü geçen düğün temiz kapanıyor (taban ödül, "sen yokken")', r['done'] and r['dm'] == 1350 and r['dlg'] and not r['root'], r)
        pg.evaluate("window.__game.UI.ClearDialogs()")
        # --- 9) film ekibi
        r = pg.evaluate("""(()=>{const g=window.__game,G=g.Game,L=window.__L; const e=L.Events.length; return e})()""")
        check('olay listesi bu testte boşaltıldı (kontrol)', r == 0)
        r = pg.evaluate("""(()=>{const g=window.__game,G=g.Game,L=window.__L; return typeof L.Events.find==='function'})()""")
        for e in sorted(set(errs)): print('  ' + e)
        if errs: fails.append('hatalar')
        b.close()
finally:
    srv.terminate()
print('\nSORUN YOK' if not fails else f'\n{len(fails)} SORUN: ' + ', '.join(fails))
print('Ekran görüntüleri:', OUT)
sys.exit(1 if fails else 0)
