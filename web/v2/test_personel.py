# Yeni personel testi: tuvalet görevlisi, vale, kapı görevlisi (MoreStaff, 73_morestaff.js).
# Personel sekmesinde ne zaman çıktıkları, işleri, kayıt/yeniden yükleme.
import glob, sys, subprocess, time, os
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__))
C = sorted(glob.glob('/opt/pw-browsers/chromium*/chrome-linux*/chrome'))[0]
PORT = '8847'
srv = subprocess.Popen([sys.executable, '-m', 'http.server', PORT], cwd=HERE + '/dist', stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(0.8)
SHOT = sys.argv[1] if len(sys.argv) > 1 else HERE + '/pers'
fails = []
def check(name, ok, info=''):
    print(('TAMAM  ' if ok else 'HATA   ') + name + ('  ' + str(info) if info else ''))
    if not ok: fails.append(name)
def ev(pg, js): return pg.evaluate(js)
def look(pg, floor, x, z, dist=16, yaw=0):
    pg.evaluate(f"(()=>{{const g=window.__game; g.Hotel.SetView({floor}); g.Cam.follow=null; g.Cam.floor={floor}; g.Cam.target.set({x}, g.Hotel.FloorY({floor}), {z}); g.Cam.yawGoal={yaw}; g.Cam.distGoal={dist}; g.Cam.Snap && g.Cam.Snap();}})()")
def shot(pg, name):
    pg.evaluate('window.__noRender=0'); pg.wait_for_timeout(900); pg.screenshot(path=SHOT + '_' + name + '.png', timeout=120000); pg.evaluate('window.__noRender=1')
def wait_until(pg, js, timeout, step=500):
    t0 = time.time(); v = None
    while time.time() - t0 < timeout:
        pg.wait_for_timeout(step); pg.evaluate('window.__game.UI.ClearDialogs()'); v = pg.evaluate(js)
        if v: return True, v
    return False, v
G = "window.__game.Game"; M = "window.__ms"; W = "window.__wc"
TABTXT = f"(()=>{{{G}.MenuSheet('personel'); const t=document.querySelector('.sheet').innerText; window.__game.UI.CloseSheet(); return t}})()"
try:
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=C, args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        pg = b.new_page(viewport={'width': 1280, 'height': 800}); errs = []
        pg.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e)[:400]))
        pg.on('console', lambda m: m.type == 'error' and 'Failed to load resource' not in m.text and errs.append('CONSOLE ' + m.text[:300]))
        pg.goto(f'http://localhost:{PORT}/play.html'); pg.wait_for_function('window.__ready === true', timeout=90000)
        pg.evaluate("(()=>{const g=window.__game; g.Store.DeleteAll(); g.UI.ClearDialogs(); g.Quality.auto=false; g.Quality.Set(0); g.Game.spawnT=9999; g.Game.st.money=1e5; g.Game.st.tutorial=9; g.Game.st.stars=1; window.__noWedding=1; window.__noAway=1; window.__noDaily=1; window.__sub=6; window.__noRender=1;})()")
        pg.wait_for_timeout(500)
        t = ev(pg, TABTXT)
        check('başta yeni personel sekmede yok', 'Tuvalet görevlisi' not in t and 'Vale' not in t and 'Kapı görevlisi' not in t)
        ev(pg, f'{G}.st.stars=2; {W}.Buy(); window.__game.Park.Buy()')
        t = ev(pg, TABTXT)
        check('tuvalet + otopark + 2★ sonrası üçü de sekmede', 'Tuvalet görevlisi tut' in t and 'Vale tut' in t and 'Kapı görevlisi tut' in t, t[-300:].replace('\n', ' '))
        m0 = ev(pg, f'{G}.st.money')
        ev(pg, f'{G}.AddStaff("tuvaletci"); {G}.AddStaff("vale"); {G}.AddStaff("kapici"); {G}.AddStaff("receptionist"); {G}.BuyRoom({G}.NextRoom())')
        check('üçü işe alındı, ücret ödendi', ev(pg, f'["tuvaletci","vale","kapici"].every(r=>{G}.staff.some(s=>s.role===r))') and m0 - ev(pg, f'{G}.st.money') >= 450 + 800 + 600)
        t = ev(pg, TABTXT)
        check('tek kişilik kapı görevlisi ikinci kez tutulamaz', 'Kapı görevlisi tut' not in t and 'Vale tut' in t)
        # 1) tuvalet görevlisi: kirli + kâğıtsız tuvalet
        ev(pg, f'{G}.player.go.position.set(-8,0,2); {G}.player.path=[]; {G}.st.wc.dirt=4; {G}.st.wc.paper=0')
        ok, v = wait_until(pg, f'{G}.st.wc.dirt===0 && {G}.st.wc.paper>=8', 60)
        check('tuvalet görevlisi temizledi ve kâğıt doldurdu', ok, ev(pg, f'{G}.st.wc'))
        ok, v = wait_until(pg, f'(()=>{{const s={G}.staff.find(s=>s.role==="tuvaletci"); return s.path.length===0 && Math.hypot(s.pos.x-9.3,s.pos.z-2.6)<0.6}})()', 30)
        check('tuvalet görevlisi yerine döndü', ok)
        # 2) kapı görevlisi: gelen misafiri selamlar
        ev(pg, f'(()=>{{window.__noTaxi=1; const x={G}.Spawn("turist"); window.__k=x; window.__p0=x.patience;}})()')
        ok, v = wait_until(pg, 'window.__k.greeted===true', 60)
        check('kapı görevlisi misafiri selamladı', ok)
        check('selamlanan misafir daha sabırlı', abs(ev(pg, 'window.__k.patience') - ev(pg, 'window.__p0') * 1.3) < 0.01, [ev(pg, 'window.__p0'), ev(pg, 'window.__k.patience')])
        ok, v = wait_until(pg, 'window.__k.s===3', 60)
        check('selamlanan misafir odaya yerleşti', ok)
        # 3) vale: arabayla gelip park eden misafiri karşılar
        ev(pg, f'(()=>{{window.__noTaxi=0; const T=window.__game.Taxi; const old=T.Chance; T.Chance=()=>1; const x={G}.Spawn("is"); T.Chance=old; window.__v=x; window.__tr=T.trips.find(t=>t.g===x);}})()')
        info = ev(pg, '(()=>{const t=window.__tr; return t ? [!!t.slot, t.phase] : null})()')
        if not info or not info[0]:
            # rastgele taksi geldiyse yeniden dene
            for i in range(10):
                ev(pg, f'(()=>{{const T=window.__game.Taxi; const old=T.Chance; T.Chance=()=>1; const R=Math.random; const x={G}.Spawn("is"); T.Chance=old; window.__v=x; window.__tr=T.trips.find(t=>t.g===x);}})()')
                info = ev(pg, '(()=>{const t=window.__tr; return t ? [!!t.slot, t.phase] : null})()')
                if info and info[0]: break
        check('park eden araba geldi', bool(info and info[0]), info)
        look(pg, 0, -6, 7, 14, 0)
        ok, v = wait_until(pg, 'window.__tr.valeDone===true', 60, 300)
        check('vale arabayı karşıladı', ok, ev(pg, '[window.__tr.phase, !!window.__tr.valeBy]'))
        check('vale: misafir %10 fazla öder', abs(ev(pg, 'window.__v.payMul') - 1.3) < 0.01, ev(pg, 'window.__v.payMul'))
        shot(pg, 'vale')
        ok, v = wait_until(pg, f'(()=>{{const s={G}.staff.find(s=>s.role==="vale"); return !s.trip && Math.hypot(s.pos.x+2.4,s.pos.z-7.6)<0.6}})()', 30)
        check('vale yerine döndü', ok)
        look(pg, 0, 2, 6, 14, 0); shot(pg, 'kapi')
        # 4) kayıt / yeniden yükleme
        ev(pg, f'{G}.Save()'); pg.evaluate('window.__pause=1')
        pg.reload(); pg.wait_for_function('window.__ready === true', timeout=90000)
        pg.evaluate("window.__pause=1; window.__game.UI.ClearDialogs(); window.__noRender=1")
        check('yeniden yükleme: yeni personel korundu', ev(pg, f'["tuvaletci","vale","kapici"].every(r=>{G}.staff.filter(s=>s.role===r).length===1)'), ev(pg, f'{G}.st.extraStaff'))
        check('yeniden yükleme: vale ve kapı görevlisi dışarıda yerinde', ev(pg, f'{G}.staff.filter(s=>s.role==="vale"||s.role==="kapici").every(s=>s.pos.z>7.3)'))
        for e in sorted(set(errs)): print('  ' + e)
        if errs: fails.append('hatalar')
        b.close()
finally:
    srv.terminate()
print('\nSORUN YOK' if not fails else f'\n{len(fails)} SORUN: ' + ', '.join(fails))
sys.exit(1 if fails else 0)
