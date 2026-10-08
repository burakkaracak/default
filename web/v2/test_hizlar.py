# Yeni özellikler: hız yükseltmeleri, oda parçaları, bankodaki para yığını, kuyruk çubuğu, eski kayıt uyumu.
import glob, sys, subprocess, time, os
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__))
C = sorted(glob.glob('/opt/pw-browsers/chromium*/chrome-linux*/chrome'))[0]
srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8834'], cwd=HERE + '/dist', stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(0.8)
OUT = sys.argv[1] if len(sys.argv) > 1 else '/tmp'
fails = []
def check(n, ok, info=''):
    print(('TAMAM  ' if ok else 'HATA   ') + n + ('  ' + str(info) if info else ''))
    if not ok: fails.append(n)
try:
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=C, args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        pg = b.new_page(viewport={'width': 1280, 'height': 800}); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)[:300]))
        pg.on('console', lambda m: m.type == 'error' and 'Failed to load resource' not in m.text and errs.append(m.text[:300]))
        pg.goto('http://localhost:8834/play.html'); pg.wait_for_function('window.__ready === true', timeout=90000)
        E = lambda s: pg.evaluate(s)
        E("(()=>{const g=window.__game; g.Store.DeleteAll(); g.UI.ClearDialogs(); g.Quality.auto=false; g.Quality.Set(0); g.Game.spawnT=999; window.__noRender=1;})()")
        # hız yükseltmeleri
        r = E("(()=>{const G=window.__game.Game; G.st.money=20000; const s0=G.player.speed; const e0=G.AddStaff('cleaner'); const st=G.staff[0]; const sp0=st.speed; const ef0=st.Eff; G.BuyUpgrade('me'); G.BuyUpgrade('me'); G.BuyUpgrade('staff'); return [s0, G.player.speed, ef0, st.Eff, sp0, st.speed, G.st.money]})()")
        check('hız yükseltme: oyuncu +%20, personel +%8', abs(r[1] / r[0] - 1.2) < 1e-6 and abs(r[3] / r[2] - 1.08) < 1e-6 and r[5] > r[4], r)
        # oda parçaları
        r = E("(()=>{const g=window.__game, G=g.Game; const room=g.Hotel.Room(101)||[...g.Hotel.rooms.values()].find(x=>x.level>=0); const p0=g.Decor.RoomPrice(room); G.BuyPart(room,1); G.BuyPart(room,1); G.BuyPart(room,2); const p1=g.Decor.RoomPrice(room); const sat=G.PartSat(room); G.UpgradeRoom(room); return [p0,p1,sat,G.PartLv(room,1),G.PartLv(room,2), g.Decor.RoomPrice(room), room.level]})()")
        check('oda parçaları fiyatı artırır, sınıf yükselince korunur', r[1] > r[0] and r[3] == 2 and r[4] == 1 and r[5] > r[1], r)
        # para yığını
        r = E("(()=>{const g=window.__game,G=g.Game; G.st.till=0; G.tillAge=0; G.Earn(300,g.Vec.V ? g.Vec.V(0,1,0) : new (G.player.pos.constructor)(0,1,0),0); return [G.st.till, G.st.money]})()") if False else None
        E("(()=>{const G=window.__game.Game; G.player.floor=1; G.player.go.position.set(0,3.4,-8); G.st.money=1000; G.st.till=0; G.tillAge=0; G.st.till=900; G.RefreshPile();})()")
        n = E("window.__game.Game.pile.length")
        check('bankoda para yığını çizildi', n >= 20, n)
        E("(()=>{const g=window.__game; g.Hotel.SetView(0)})()")
        E("window.__sub=1; window.__noRender=0")
        pg.wait_for_timeout(1500)
        pg.screenshot(path=OUT + '/hizlar_yigin.png')
        E("window.__sub=6; window.__noRender=1")
        pg.wait_for_timeout(1500)
        r = E("(()=>{const G=window.__game.Game; G.tillAge=24.9; return null})()")
        pg.wait_for_timeout(3000)
        r = E("(()=>{const G=window.__game.Game; return [G.st.till, Math.round(G.st.money), G.pile.length]})()")
        check('25 sn sonra para kendiliğinden kasaya geçti', r[0] == 0 and r[1] == 1900 and r[2] == 0, r)
        # oyuncu bankoya gelince topla
        r = E("(()=>{const g=window.__game,G=g.Game; G.player.floor=0; G.player.go.position.set(12,0,6); G.st.till=500; G.tillAge=0; G.RefreshPile(); return G.pile.length})()")
        E("(()=>{const g=window.__game,G=g.Game; G.player.go.position.set(0,0,-4.9)})()")
        pg.wait_for_timeout(1500)
        r = E("(()=>{const G=window.__game.Game; return [G.st.till, Math.round(G.st.money)]})()")
        check('bankoya gelince para toplandı', r[0] == 0 and r[1] == 2400, r)
        # kuyruk çubuğu
        E("(()=>{const g=window.__game,G=g.Game; G.player.go.position.set(12,0,6); G.st.money=0; G.Spawn('turist'); G.Spawn('is'); G.Spawn('emekli'); window.__sub=6; window.__noRender=0;})()")
        for _ in range(30):
            pg.wait_for_timeout(1000)
            if E('window.__game.Game.queue.length') >= 3: break
        pg.wait_for_timeout(1500)
        q = E("[window.__game.Game.queue.length, document.querySelectorAll('#world-labels .wlabel i').length]")
        pg.screenshot(path=OUT + '/hizlar_kuyruk.png')
        check('kuyrukta bekleyen misafirlere sabır çubuğu', q[0] >= 2 and q[1] >= q[0], q)
        # menü Gelişim sekmesi + oda sayfası görünümü
        E("window.__game.Game.MenuSheet('gelisim')"); pg.wait_for_timeout(500); pg.screenshot(path=OUT + '/hizlar_gelisim.png')
        E("window.__game.UI.CloseSheet && window.__game.UI.CloseSheet()")
        E("(()=>{const g=window.__game,G=g.Game; G.player.floor=1; G.player.go.position.set(0,3.4,-6.2); G.RoomSheet([...g.Hotel.rooms.values()].find(x=>x.level>=0))})()"); pg.wait_for_timeout(500); pg.screenshot(path=OUT + '/hizlar_oda.png')
        # eski kayıt (yeni alanlar yok) yükle
        E("(()=>{const g=window.__game,G=g.Game; delete G.st.upg; delete G.st.comp; delete G.st.till; G.Save();})()")
        pg.reload(); pg.wait_for_function('window.__ready === true', timeout=90000)
        r = E("(()=>{const G=window.__game.Game; return [typeof G.st.till, JSON.stringify(G.st.upg), JSON.stringify(G.st.comp), G.player.speed, G.UpgMul('staff')]})()")
        check('eski kayıt yüklendi (yeni alan yok)', r[0] == 'number' and r[1] == '{}' and r[3] == 5.6 and r[4] == 1, r)
        check('JS hatası yok', not errs, errs[:3])
        b.close()
finally:
    srv.terminate()
print('\n%d SORUN' % len(fails) if fails else '\nSORUN YOK')
