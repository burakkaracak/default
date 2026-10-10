# Restoran mutfağı testi: pişir → tezgâh → taşı → masaya koy → yemek → kirli tabak → topla → bulaşık.
# Müdürle tam döngü, yalnız personelle (aşçı + garson) döngü, spa'nın eski servisinin bozulmaması.
import glob, sys, subprocess, time, os
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__))
C = sorted(glob.glob('/opt/pw-browsers/chromium*/chrome-linux*/chrome'))[0]
PORT = '8845'
srv = subprocess.Popen([sys.executable, '-m', 'http.server', PORT], cwd=HERE + '/dist', stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(0.8)
SHOT = sys.argv[1] if len(sys.argv) > 1 else HERE + '/rest'
fails = []
def check(name, ok, info=''):
    print(('TAMAM  ' if ok else 'HATA   ') + name + ('  ' + str(info) if info else ''))
    if not ok: fails.append(name)
def ev(pg, js, arg=None): return pg.evaluate(js, arg) if arg is not None else pg.evaluate(js)
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
TP = "(([x,z])=>{const P=window.__game.Game.player; P.go.position.set(x,0,z); P.floor=0; P.path=[]; P.go.position.y=0;})"
G = "window.__game.Game"; F = "window.__fac.S.fac.restoran"
SPOT = F + ".spots[0]"
try:
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=C, args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        pg = b.new_page(viewport={'width': 1280, 'height': 800}); errs = []
        pg.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e)[:400]))
        pg.on('console', lambda m: m.type == 'error' and 'Failed to load resource' not in m.text and errs.append('CONSOLE ' + m.text[:300]))
        pg.goto(f'http://localhost:{PORT}/play.html'); pg.wait_for_function('window.__ready === true', timeout=90000)
        pg.evaluate("(()=>{const g=window.__game; g.Store.DeleteAll(); g.UI.ClearDialogs(); g.Quality.auto=false; g.Quality.Set(0); g.Game.spawnT=9999; g.Game.st.money=1e5; g.Game.st.rep=400; g.Game.st.stars=5; window.__noWedding=1; window.__sub=6; window.__noRender=1;})()")
        pg.wait_for_timeout(500)
        check('restoran satın alındı (mutfak modu)', ev(pg, "window.__fac.Buy('restoran')") and ev(pg, F + ".L.mode") == 'kitchen')
        look(pg, 0, 5.5, -4.2, 13)
        # 1) müdürle tam döngü
        ev(pg, f"(()=>{{const x={G}.Spawn('turist'); x.pos.set(0,0,12); window.__fac.ForceVisit(x,'restoran',0);}})()")
        ok, s = wait_until(pg, "(()=>{const g=window.__game.Game.guests.find(q=>q.fv&&q.fv.fac.id==='restoran'); return g && g.fv.phase==='wait' && g.fv.seated && !g.path.length})()", 40)
        check('misafir masaya oturdu, yemek bekliyor', ok)
        ev(pg, TP, [6.3, -6.38])
        ok, n = wait_until(pg, F + '.plates>=1 && ' + F + '.plates', 15)
        check('müdür pişirdi: tezgâhta tabak var', ok, n)
        pg.wait_for_timeout(5000)
        check('tezgâh en çok 4 tabak tutuyor', ev(pg, F + '.plates') == 4, ev(pg, F + '.plates'))
        shot(pg, 'tezgah')
        ev(pg, TP, [6.3, -5.0])
        ok, n = wait_until(pg, f'{G}.player.Count("plate")>=1 && {G}.player.Count("plate")', 6)
        check('tezgâhtan tabak alındı (bekleyen misafir kadar)', ok and n == 1 and ev(pg, F + '.plates') == 3, [n, ev(pg, F + '.plates')])
        check('elde tabak yığını görseli', ev(pg, f'!!{G}.player.stackG'))
        ev(pg, TP, [3.9, -2.1])
        ok, s = wait_until(pg, "(()=>{const g=window.__game.Game.guests.find(q=>q.fv&&q.fv.fac.id==='restoran'); return g && g.fv.phase==='enjoy'})()", 6)
        check('tabak masaya kondu, misafir yemeye başladı', ok and ev(pg, SPOT + '.plate') == 'food' and ev(pg, f'{G}.player.Count("plate")') == 0, ev(pg, SPOT + '.plate'))
        look(pg, 0, 3.5, -3.0, 9); shot(pg, 'masa')
        ev(pg, TP, [0, 3])  # müdür uzaklaşsın: kirli tabağı kendisi toplamasın
        ok, s = wait_until(pg, SPOT + '.dirty === true', 60)
        check('yemek bitti: masada kirli tabak, masa boş sayılmıyor', ok and ev(pg, SPOT + '.plate') == 'dirty')
        wait_until(pg, f"{G}.guests.filter(q=>q.fv).length===0", 30)
        check('misafir kirli masayı kullanılamaz bırakıyor', ev(pg, "window.__fac.S.fac.restoran.spots.filter(s=>!s.by&&!s.dirty).length") == 6)
        ev(pg, TP, [3.9, -2.1])
        ok, n = wait_until(pg, f'{G}.player.Count("dirty")', 6)
        check('müdür kirli tabağı topladı', ok and ev(pg, SPOT + '.dirty') is False and ev(pg, SPOT + '.plate') is None, n)
        ev(pg, TP, [8.2, -4.95]); ok, n = wait_until(pg, f'{G}.player.Count("dirty")===0', 5)
        check('bulaşık tezgâhına bırakıldı', ok)
        check('misafir ödedi (restoran kazancı)', ev(pg, f'({G}.st.facStats||{{}}).restoran&&{G}.st.facStats.restoran.earn') > 0)
        # 2) yalnız personelle döngü: aşçı + garson, müdür uzakta
        ev(pg, f"{G}.AddStaff('asci'); {G}.AddStaff('garson')")
        ev(pg, TP, [0, 3])
        m0 = ev(pg, f'{G}.st.money+({G}.st.till||0)')
        ev(pg, f"(()=>{{for(const t of ['balayi','emekli','turist']){{const x={G}.Spawn(t); x.pos.set(0,0,12); window.__fac.ForceVisit(x,'restoran');}}}})()")
        ok, s = wait_until(pg, "(()=>{const gs=window.__game.Game.guests.filter(q=>q.fv&&q.fv.fac.id==='restoran'); return gs.length>=3 && gs.every(q=>q.fv.phase==='enjoy'||q.fv.phase==='wait')&&gs.some(q=>q.fv.phase==='enjoy')})()", 90)
        check('aşçı pişirdi, garson tabak taşıdı: misafirler yemeye başladı', ok)
        look(pg, 0, 5.2, -4.2, 11); shot(pg, 'personel')
        ok, s = wait_until(pg, f"{G}.guests.filter(q=>q.fv&&q.fv.fac.id==='restoran').length===0 && !window.__fac.S.fac.restoran.spots.some(s=>s.dirty)", 200)
        check('3 misafir yedi, gitti ve garson kirli tabakları topladı', ok, ev(pg, "window.__fac.S.fac.restoran.spots.map(s=>s.plate||'-').join('')"))
        check('personel ziyaretleri kazanç getirdi', ev(pg, f'{G}.st.money+({G}.st.till||0)') > m0)
        ok, _ = wait_until(pg, f"{G}.staff.filter(s=>s.role==='garson').every(s=>!s.items.includes('dirty'))", 30)
        check('garson kirli tabakları bulaşığa bıraktı', ok)
        # 3) spa'nın eski servisi bozulmadı
        check('spa satın alındı', ev(pg, "window.__fac.Buy('spa')"))
        ev(pg, f"{G}.AddStaff('terapist')")
        ev(pg, f"(()=>{{const x={G}.Spawn('emekli'); x.pos.set(0,0,12); window.__fac.ForceVisit(x,'spa');}})()")
        ok, s = wait_until(pg, "window.__game.Game.guests.some(q=>q.fv&&q.fv.fac.id==='spa'&&q.fv.phase==='enjoy')", 90)
        check('spa: terapist hâlâ masaj yapıyor (eski servis)', ok)
        ok, s = wait_until(pg, "!window.__game.Game.guests.some(q=>q.fv)", 120)
        check('spa ziyareti tamamlandı', ok and (ev(pg, f'{G}.st.facStats.spa.n') >= 1))
        check('hata yok', not errs, errs[:3])
        b.close()
finally:
    srv.terminate()
print('\nSORUN YOK' if not fails else f'\n{len(fails)} SORUN: ' + ', '.join(fails))
sys.exit(1 if fails else 0)
