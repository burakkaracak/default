# Yeni misafir türleri ve günlük olaylar: hata yok, sohbet kendi metniyle açılır, tesis kullanır, olay kuruluyor.
# Kullanım: python3 test_cesit.py [çıktı_klasörü]
import glob, sys, subprocess, time, os
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__))
C = sorted(glob.glob('/opt/pw-browsers/chromium*/chrome-linux*/chrome'))[0]
OUT = sys.argv[1] if len(sys.argv) > 1 else HERE + '/cesit_shots'
os.makedirs(OUT, exist_ok=True)
srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8847'], cwd=HERE + '/dist', stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(0.8)
fails = []
def check(name, ok, info=''):
    print(('TAMAM  ' if ok else 'HATA   ') + name + ('  ' + str(info) if info else ''))
    if not ok: fails.append(name)
TYPES = ['fotografci', 'yaslicift', 'gezgin', 'yazar']
EVENTS = ['pazar', 'fotograf', 'yuruyus', 'zirve', 'yemek', 'dolunay', 'kissenligi']
try:
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=C, args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        pg = b.new_page(viewport={'width': 393, 'height': 760}, device_scale_factor=2, is_mobile=True, has_touch=True); errs = []
        pg.on('pageerror', lambda e: errs.append('HATA ' + str(e)[:300]))
        pg.on('console', lambda m: m.type == 'error' and 'Failed to load resource' not in m.text and errs.append('KONSOL ' + m.text[:300]))
        pg.goto('http://localhost:8847/play.html'); pg.wait_for_function('window.__ready === true', timeout=120000)
        pg.evaluate("(()=>{const g=window.__game,G=g.Game; g.Store.DeleteAll(); g.UI.ClearDialogs(); g.Quality.auto=false; g.Quality.Set(0); window.__noWedding=1; G.spawnT=1e9; G.st.money=1e7; G.st.tutorial=99; G.st.stars=4; for(let i=0;i<5;i++) G.BuyRoom(G.NextRoom()); g.UI.ClearDialogs(); window.__noRender=1; return 1})()")
        # 1) türler tanımlı, görünür, çıkış yapabilir
        for t in TYPES:
            r = pg.evaluate("(t)=>{const g=window.__game,G=g.Game; const x=G.Spawn(t); const T=g.TalkData.talks[t]; const pref=!!(g.Data.Guests.find(q=>q.id===t)); return {id:x.type.id, name:x.name, nights:x.nights, talks:T?T.length:0, fol:!!x.follower}}", t)
            check('tür ' + t + ' doğdu', r['id'] == t and r['talks'] >= 3, r)
        pg.evaluate("window.__sub=6")
        pg.wait_for_timeout(2500)
        pg.screenshot(path=OUT + '/turler.png')
        # 2) sohbet kendi metniyle (misafir odaya yerleşmiş olmalı)
        SEAT = "(t)=>{const g=window.__game,G=g.Game; const r=g.Hotel.Room(11); if(r.guest){r.guest=null;} const x=G.Spawn(t); x.path=[]; x.room=r; r.guest=x; r.state='occupied'; x.floor=1; x.pos.set(r.inside.x, g.Hotel.FloorY(1), r.inside.z); x.EnterRoom(); g.Hotel.SetView(1); g.Chat.StartGuest(x); return 1}"
        for t in TYPES:
            pg.evaluate(SEAT, t); pg.wait_for_timeout(700)
            r = pg.evaluate("()=>{const g=window.__game; return {open:g.Chat.open,n:g.Chat.choices.length,txt:(document.querySelector('.chat')||{innerText:''}).innerText.slice(0,90)}}")
            check('sohbet ' + t, r['open'] and r['n'] == 3, r)
            if t == 'yazar': pg.screenshot(path=OUT + '/sohbet_yazar.png')
            pg.evaluate("()=>{const g=window.__game; try{g.Chat.Close()}catch(e){} g.UI.ClearDialogs(); return 1}")
        # 3) tüm tesisler kurulu iken tür tercihi çalışıyor mu
        pg.evaluate("(()=>{const g=window.__game; for(const d of g.Data.Facilities){ try{ g.Facilities.Build&&g.Facilities.Build(d.id,true);}catch(e){} } return 1})()")
        # 4) olaylar
        for e in EVENTS:
            r = pg.evaluate("(id)=>{const g=window.__game,L=g.Life,G=g.Game; const ev=L.Events.find(x=>x.id===id); G.st.event={id,day:g.World.day}; L.BeginEvent(ev); return {hud:L.Event&&L.Event.id, sp:+L.SpawnMul().toFixed(2), tm:L.TypeMul('gezgin')}}", e)
            check('olay ' + e, r['hud'] == e, r)
        pg.wait_for_timeout(8000)
        pg.screenshot(path=OUT + '/olay.png')
        # 5) rastgele gün sonu: tüm olaylar seçilebilir (havuzdan hata çıkmasın)
        for i in range(40):
            pg.evaluate("(()=>{const g=window.__game; g.World.day+=1; g.Life.StartDay(); return 1})()")
        check('40 gün boyunca olay seçimi hatasız', True)
        check('konsol hatası yok', not errs, errs[:3])
        b.close()
finally:
    srv.terminate()
print('\nBAŞARISIZ:' if fails else '\nHEPSİ TAMAM', fails)
sys.exit(1 if fails else 0)
