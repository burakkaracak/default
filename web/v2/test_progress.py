# Başarımlar, anı albümü, anılar ve zincir (şubeler) testi.
# Kullanım: python3 test_progress.py [çıktı_klasörü]
import glob, sys, subprocess, time, os
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__))
C = sorted(glob.glob('/opt/pw-browsers/chromium*/chrome-linux*/chrome'))[0]
OUT = sys.argv[1] if len(sys.argv) > 1 else HERE + '/progress_shots'
os.makedirs(OUT, exist_ok=True)
srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8847'], cwd=HERE + '/dist', stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(0.8)
fails = []
def check(name, ok, info=''):
    print(('TAMAM  ' if ok else 'HATA   ') + name + ('  ' + str(info) if info else ''))
    if not ok: fails.append(name)
try:
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=C, args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        pg = b.new_page(viewport={'width': 393, 'height': 760}, device_scale_factor=2, is_mobile=True, has_touch=True); errs = []
        pg.on('pageerror', lambda e: errs.append('HATA ' + str(e)[:300]))
        pg.on('console', lambda m: m.type == 'error' and 'Failed to load resource' not in m.text and errs.append('KONSOL ' + m.text[:300]))
        pg.goto('http://localhost:8847/play.html'); pg.wait_for_function('window.__ready === true', timeout=120000)
        pg.evaluate("(()=>{const g=window.__game,G=g.Game; g.Store.DeleteAll(); window.__Album.Clear(); g.UI.ClearDialogs(); g.Quality.auto=false; g.Quality.Set(0); G.spawnT=1e9; G.st.tutorial=99; window.__noWedding=1; window.__L.Events.length=0; window.__noRender=1; return 1})()")
        # --- 1) eski kayıt: sağlanmış başarımlar sessizce verilir, ödül yok
        r = pg.evaluate("""(()=>{const g=window.__game,G=g.Game,A=window.__Ach; G.st.achInit=false; G.st.ach={}; G.st.served=60; G.st.earned=20000; const m0=G.st.money; A.t=0; A.Tick(0.1);
          const n=Object.keys(G.st.ach).length; return {n, dm:G.st.money-m0, init:G.st.achInit, toasts:[...document.querySelectorAll('.toast')].filter(t=>/Başarım/.test(t.textContent)).length}})()""")
        check('eski kayıtta başarımlar sessiz verildi (ödül yok, toast yağmuru yok)', r['n'] >= 4 and r['dm'] == 0 and r['init'] and r['toasts'] <= 1, r)
        # --- 2) yeni kazanım ödül + toast
        r = pg.evaluate("""(()=>{const g=window.__game,G=g.Game,A=window.__Ach; const m0=G.st.money; G.st.replies=1; A.t=0; A.Tick(0.1); return {dm:G.st.money-m0, done:A.Done('yanit1'), toast:[...document.querySelectorAll('.toast')].map(t=>t.textContent).join('|')}})()""")
        check('yeni başarım ödül verdi ve bildirildi', r['done'] and r['dm'] == 100 and 'Kibar cevap' in r['toast'], r)
        r = pg.evaluate("""(()=>{const g=window.__game,G=g.Game,A=window.__Ach; const m0=G.st.money; A.t=0; A.Tick(0.1); A.t=0; A.Tick(0.1); return G.st.money-m0})()""")
        check('aynı başarım ikinci kez ödül vermedi', r == 0, r)
        # --- 3) menü sekmesi
        pg.evaluate("window.__game.Game.MenuSheet('basarim')"); pg.wait_for_timeout(300)
        r = pg.evaluate("(()=>({items:document.querySelectorAll('.sheet .item').length, done:document.querySelectorAll('.sheet .item.done').length, stat:document.querySelector('.sheet .stat b').textContent, tabs:document.querySelectorAll('.sheet .tabs button').length}))()")
        check('Başarımlar sekmesi tüm listeyi gösteriyor', r['items'] == pg.evaluate('window.__Ach.List.length') and r['done'] >= 5, r); pg.screenshot(path=OUT + '/basarim.png')
        pg.evaluate("window.__game.UI.CloseSheet()")
        # --- 4) albüm
        pg.evaluate("window.__Album.Clear(); window.__game.Game.st.photos=0; window.__game.Game.st.memories=[]; window.__noRender=0; window.__game.Photo=window.__game.Photo; document.getElementById('b-photo').click()"); pg.wait_for_timeout(1500)
        r = pg.evaluate("(()=>({n:window.__Album.Items().length, photos:window.__game.Game.st.photos, ok:window.__Album.Items()[0] && window.__Album.Items()[0].u.startsWith('data:image/jpeg')}))()")
        check('fotoğraf çekmek albüme küçük JPEG ekledi', r['n'] == 1 and r['photos'] == 1 and r['ok'], r)
        r = pg.evaluate("""(()=>{const A=window.__Album; A.Clear(); const cv=document.createElement('canvas'); cv.width=900; cv.height=500; cv.getContext('2d').fillRect(0,0,900,500); for(let i=0;i<15;i++) A.Add(cv); const items=A.Items(); return {n:items.length, size:Math.round(localStorage.getItem(A.Key).length/1024)}})()""")
        check('albüm en çok 12 fotoğraf tutuyor', r['n'] == 12, r)
        r = pg.evaluate("""(()=>{const A=window.__Album; const cv=document.createElement('canvas'); cv.width=900; cv.height=500; const x=cv.getContext('2d'); for(let i=0;i<4000;i++){x.fillStyle='rgb('+(i*37%255)+','+(i*91%255)+','+(i*13%255)+')'; x.fillRect((i*53)%900,(i*29)%500,40,40);} const real=Storage.prototype.setItem; let calls=0; Storage.prototype.setItem=function(k,v){ if(k===A.Key){ calls++; if(calls<3) throw new DOMException('kota','QuotaExceededError'); } return real.call(this,k,v); }; const n0=A.Items().length; const ok=A.Add(cv); Storage.prototype.setItem=real; return {ok, n0, n1:A.Items().length, calls}})()""")
        check('depo dolarsa en eski fotoğraf atılıp yeniden deneniyor, hata yok', r['ok'] and r['calls'] >= 3 and r['n1'] <= r['n0'], r)
        pg.evaluate("(()=>{const A=window.__Album; A.Memory('⭐','3 yıldızlı otel oldun'); A.Memory('💍','Düğün yaptın'); window.__game.Game.MenuSheet('album')})()"); pg.wait_for_timeout(500)
        r = pg.evaluate("(()=>({thumbs:document.querySelectorAll('.sheet .ph img').length, mem:document.querySelectorAll('.sheet .item').length}))()")
        check('Albüm sekmesi fotoğrafları ve anıları gösteriyor', r['thumbs'] == pg.evaluate('window.__Album.Items().length') and r['thumbs'] >= 8 and r['mem'] >= 2, r); pg.screenshot(path=OUT + '/album.png')
        pg.evaluate("document.querySelector('.sheet .ph').click()"); pg.wait_for_timeout(300)
        check('fotoğrafa dokununca büyük hali açılıyor', pg.evaluate("!!document.querySelector('.dialog img')")); pg.evaluate("window.__game.UI.ClearDialogs(); window.__game.UI.CloseSheet()")
        pg.evaluate("window.__Album.Clear()"); check('albüm temizlenebiliyor', pg.evaluate("window.__Album.Items().length") == 0)
        pg.evaluate("window.__noRender=1")
        # --- 5) zincir
        r = pg.evaluate("""(()=>{const g=window.__game,G=g.Game,Ch=window.__Chain; G.st.money=1e6; G.st.stars=2; const c=Ch.Cities[0]; const m0=G.st.money; Ch.Open(c); const closed=Ch.Get(c.id).lv===0 && G.st.money===m0; g.UI.ClearDialogs(); return {closed, count:Ch.Count}})()""")
        check('yıldız yetmezse şube açılmıyor, para kesilmiyor', r['closed'] and r['count'] == 0, r)
        r = pg.evaluate("""(()=>{const g=window.__game,G=g.Game,Ch=window.__Chain; G.st.stars=3; const c=Ch.Cities[0]; const m0=G.st.money; const pm0=window.__L.PriceMul(); Ch.Open(c); g.UI.ClearDialogs(); return {lv:Ch.Get(c.id).lv, paid:m0-G.st.money, count:Ch.Count, pm:+(window.__L.PriceMul()/pm0).toFixed(3)}})()""")
        check('3 yıldızda Bodrum açıldı, bedel kesildi, oda fiyatı %5 arttı', r['lv'] == 1 and r['paid'] == 25000 and r['count'] == 1 and r['pm'] == 1.05, r)
        r = pg.evaluate("""(()=>{const g=window.__game,G=g.Game,Ch=window.__Chain; const c=Ch.Cities[0]; G.st.dayLog=[10000,10000,10000]; const d0=Ch.Daily(c); Ch.Hire(c); const d1=Ch.Daily(c); Ch.Upgrade(c); const d2=Ch.Daily(c); Ch.Upgrade(c); const d3=Ch.Daily(c); Ch.Upgrade(c); return {d0,d1,d2,d3,lv:Ch.Get(c.id).lv, mgr:Ch.Get(c.id).mgr}})()""")
        check('şube kazancı: müdürsüz yarı, müdürle tam, seviyeyle artıyor (10.000/gün ana otelde)', r['d0'] == 1000 and r['d1'] == 2000 and r['d2'] == 3500 and r['d3'] == 5500 and r['lv'] == 3, r)
        r = pg.evaluate("""(()=>{const g=window.__game,G=g.Game,Ch=window.__Chain; G.st.dayLog=[]; G.st.earned=30000; G.st.earnedMark=24000; const m0=G.st.money; const res=Ch.NewDay(); return {total:res.total, dm:G.st.money-m0, log:G.st.dayLog, lines:res.out.length}})()""")
        check('yeni günde şube kazancı ana otelin dünkü kazancından hesaplanıp ödeniyor', r['total'] == 3300 and r['dm'] == 3300 and r['log'] == [6000] and r['lines'] == 1, r)
        r = pg.evaluate("""(()=>{const g=window.__game,G=g.Game,Ch=window.__Chain; G.st.dayLog=[8000]; G.st.earned=0; G.st.earnedMark=0; G.OnNewDay(); const t=(document.querySelector('.dialog')||{}).innerText||''; const ok=/Bodrum şubesi/.test(t); g.UI.ClearDialogs(); return {ok}})()""")
        check('yeni gün raporunda şube satırı görünüyor', r['ok'], r)
        r = pg.evaluate("""(()=>{const g=window.__game,G=g.Game,Ch=window.__Chain; G.st.stars=4; Ch.Open(Ch.Cities[1]); g.UI.ClearDialogs(); window.__Ach.t=0; window.__Ach.Tick(0.1); window.__Ach.t=0; window.__Ach.Tick(0.1); return {count:Ch.Count, a1:window.__Ach.Done('zincir1'), a2:window.__Ach.Done('zincir2'), mem:(G.st.memories||[]).length}})()""")
        check('iki şube açılınca zincir başarımları ve anılar yazıldı', r['count'] == 2 and r['a1'] and r['a2'] and r['mem'] >= 2, r)
        pg.evaluate("window.__game.Game.MenuSheet('zincir')"); pg.wait_for_timeout(300); pg.screenshot(path=OUT + '/zincir.png'); pg.evaluate("window.__game.UI.CloseSheet()")
        r = pg.evaluate("window.__game.Chat && window.__game.Social ? 1 : 0")
        # --- 6) kayıt ve yeniden yükleme
        before = pg.evaluate("(()=>{const G=window.__game.Game; G.Save(); return {ach:Object.keys(G.st.ach).length, chain:JSON.stringify(G.st.chain), mem:G.st.memories.length, size:Math.round(JSON.stringify(G.st).length/1024), dayLog:G.st.dayLog.length}})()")
        pg.reload(); pg.wait_for_function('window.__ready === true', timeout=90000); pg.evaluate("window.__game.UI.ClearDialogs(); window.__pause=1")
        after = pg.evaluate("(()=>{const G=window.__game.Game; return {ach:Object.keys(G.st.ach).length, chain:JSON.stringify(G.st.chain), mem:G.st.memories.length, size:Math.round(JSON.stringify(G.st).length/1024), dayLog:G.st.dayLog.length}})()")
        check('yeniden yükleme: başarım, şube, anı korundu', before == after, (before, after))
        check('kayıt boyutu makul (<60 KB)', after['size'] < 60, after)
        # eski kayıt: yeni alanlar yokken
        r = pg.evaluate("""(()=>{const g=window.__game,G=g.Game; for(const k of ['ach','achInit','memories','chain','dayLog','seasonsSeen','flags']) delete G.st[k]; try{ window.__Ach.t=0; window.__Ach.Tick(0.1); window.__Chain.Get('bodrum'); window.__Chain.NewDay(); window.__Album.Memory('x','y'); G.MenuSheet('basarim'); g.UI.CloseSheet(); G.MenuSheet('album'); g.UI.CloseSheet(); G.MenuSheet('zincir'); g.UI.CloseSheet(); return 'ok'}catch(e){return String(e)} })()""")
        check('alanları eksik eski kayıtta hata çıkmıyor', r == 'ok', r)
        for e in sorted(set(errs)): print('  ' + e)
        if errs: fails.append('hatalar')
        b.close()
finally:
    srv.terminate()
print('\nSORUN YOK' if not fails else f'\n{len(fails)} SORUN: ' + ', '.join(fails))
print('Ekran görüntüleri:', OUT)
sys.exit(1 if fails else 0)
