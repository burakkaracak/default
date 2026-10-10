# Tuvalet + eşya yığını testi: raf, taşıma kapasitesi/yükseltme, tuvalet satın alma, misafir kullanımı, kâğıt/kirlilik,
# müdür ve personelin bakımı, havlu isteği (yığından), kayıt/yeniden yükleme.
import glob, sys, subprocess, time, os
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__))
C = sorted(glob.glob('/opt/pw-browsers/chromium*/chrome-linux*/chrome'))[0]
PORT = '8843'
srv = subprocess.Popen([sys.executable, '-m', 'http.server', PORT], cwd=HERE + '/dist', stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(0.8)
SHOT = sys.argv[1] if len(sys.argv) > 1 else HERE + '/wc'
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
try:
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=C, args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        pg = b.new_page(viewport={'width': 1280, 'height': 800}); errs = []
        pg.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e)[:400]))
        pg.on('console', lambda m: m.type == 'error' and 'Failed to load resource' not in m.text and errs.append('CONSOLE ' + m.text[:300]))
        pg.goto(f'http://localhost:{PORT}/play.html'); pg.wait_for_function('window.__ready === true', timeout=90000)
        pg.evaluate("(()=>{const g=window.__game; g.Store.DeleteAll(); g.UI.ClearDialogs(); g.Quality.auto=false; g.Quality.Set(0); g.Game.spawnT=9999; g.Game.st.money=1e5; g.Game.st.rep=400; g.Game.st.stars=5; window.__noWedding=1; window.__sub=6; window.__noRender=1;})()")
        pg.wait_for_timeout(500)
        G = "window.__game.Game"; W = "window.__wc"
        check('tuvalet başta yok, raf var', ev(pg, f'!{W}.Built()') and ev(pg, f'{G}.player.CarryCap') == 2)
        # 1) raftan havlu alma (kapasite 2)
        ev(pg, TP, [11.7, -0.7]); ok, n = wait_until(pg, f'{G}.player.Count("towel")>=2 && {G}.player.Count("towel")', 6)
        pg.wait_for_timeout(1500)
        check('raftan havlu alındı, kapasite 2 aşılmadı', ev(pg, f'{G}.player.Count("towel")') == 2 and ev(pg, f'{G}.player.items.length') == 2, ev(pg, f'{G}.player.items'))
        check('yığın görseli var', ev(pg, f'!!{G}.player.stackG'))
        # 2) kapasite yükseltmesi
        ev(pg, f'{G}.BuyUpgrade("carry")')
        check('Taşıma sepeti: kapasite 3', ev(pg, f'{G}.player.CarryCap') == 3 and ev(pg, f'{G}.UpgLv("carry")') == 1)
        pg.wait_for_timeout(1000)
        check('kapasite artınca bir eşya daha alındı', ev(pg, f'{G}.player.items.length') == 3, ev(pg, f'{G}.player.items'))
        n = ev(pg, f"(()=>{{{G}.MenuSheet('gelisim'); return document.querySelectorAll('.sheet .item').length}})()")
        txt = ev(pg, "document.querySelector('.sheet') ? document.querySelector('.sheet').innerText : ''")
        check('Gelişim sayfası taşıma sepetini gösteriyor', 'Taşıma sepeti' in txt and 'eşya' in txt, txt[:120].replace('\n', ' '))
        ev(pg, 'window.__game.UI.CloseSheet()')
        # kâğıt rafı: tuvalet yokken kâğıt alınmaz
        ev(pg, f'{G}.player.items=[]; {G}.player.RefreshCarry()'); ev(pg, TP, [11.7, 0.95]); pg.wait_for_timeout(1200)
        check('tuvalet yokken kâğıt alınmaz', ev(pg, f'{G}.player.Count("paper")') == 0)
        # 3) tuvalet satın al
        m0 = ev(pg, f'{G}.st.money'); ok = ev(pg, f'{W}.Buy()')
        check('tuvalet satın alındı, 600 ödendi', ok and ev(pg, f'{W}.Built()') and abs((m0 - ev(pg, f'{G}.st.money')) - 600) < 1, ev(pg, f'{G}.st.wc'))
        check('kabin görseli ve kabin içi yürünemez', ev(pg, f'!!{W}.S.grp && {W}.S.rolls.length==2 && {W}.Blocks({{x:12,y:0,z:4}}) && !window.__game.Hotel.Walkable({{x:12,y:0,z:4}},0)'))
        ev(pg, TP, [11.7, 0.95]); pg.wait_for_timeout(1200)
        check('tuvalet açılınca kâğıt alınır', ev(pg, f'{G}.player.Count("paper")') >= 1, ev(pg, f'{G}.player.items'))
        look(pg, 0, 10, 2, 13, 0); shot(pg, 'raf_kabin')
        # 4) misafir: oda + resepsiyonist, giriş, çıkış → tuvalet
        ev(pg, f'{G}.AddStaff("receptionist"); {G}.BuyRoom({G}.NextRoom()); {W}.S.always=1; {G}.spawnT=9999')
        ev(pg, f'{G}.player.items=[]; {G}.player.RefreshCarry()'); ev(pg, TP, [-8, 2])
        ev(pg, f'(()=>{{const x={G}.Spawn("turist"); window.__tg=x; x.pos.set(0,0,6); }})()')
        ok, v = wait_until(pg, f'window.__tg.s===3', 60)
        check('misafir odaya yerleşti', ok)
        p0, d0, u0 = ev(pg, f'[{G}.st.wc.paper,{G}.st.wc.dirt,{G}.st.wc.uses]')
        ev(pg, "(()=>{window.__seen=false; setInterval(()=>{const x=window.__tg; if(!x) return; window.__log=window.__log||[]; const k=[x.s,x.wc&&x.wc.phase,x.hidden,x.path.length].join(); if(window.__log[window.__log.length-1]!==k) window.__log.push(k); if(x.wc&&x.wc.phase==='in'&&x.hidden) window.__seen=true},20)})()")
        ev(pg, 'window.__tg.t = window.__tg.stayLen; window.__tg.room.request=null')
        ok, v = wait_until(pg, 'window.__tg.s===7', 40)
        check('çıkışta misafir tuvalete yöneldi', ok, ev(pg, 'window.__tg.s'))
        ok, v = wait_until(pg, 'window.__seen', 30, 150)
        check('misafir kabine girdi (görünmez)', ok, ev(pg, 'window.__log'))
        ok, v = wait_until(pg, f'{G}.st.served>=1 || window.__tg.s!==7', 30)
        pg.wait_for_timeout(500)
        p1, d1, u1 = ev(pg, f'[{G}.st.wc.paper,{G}.st.wc.dirt,{G}.st.wc.uses]')
        check('kullanım: kâğıt -1, kirlilik +1, sayaç +1', (p1, d1, u1) == (p0 - 1, d0 + 1, u0 + 1), (p0, d0, u0, p1, d1, u1))
        ok, v = wait_until(pg, 'window.__tg.s===5 || window.__tg.s===undefined || !window.__tg.go.parent', 60)
        check('misafir bankoda ödeyip çıktı (takılmadı)', ok and ev(pg, f'{G}.st.earned') > 0, ev(pg, f'{G}.st.earned'))
        # 5) kâğıt bitti → misafir vazgeçer, memnuniyet düşer
        ev(pg, f'{G}.st.wc.paper=0; {G}.st.wc.dirt=0')
        ev(pg, f'(()=>{{const x={G}.Spawn("turist"); window.__g2=x; x.sat=3; window.__r=window.__wc.Offer(x); window.__s2=x.sat;}})()')
        check('kâğıt yokken misafir vazgeçer (-0.5)', ev(pg, 'window.__r') is False and abs(ev(pg, 'window.__s2') - 2.5) < 0.01)
        look(pg, 0, 10, 2, 13, 0); pg.evaluate('window.__noRender=0')
        ok, v = wait_until(pg, "[...document.querySelectorAll('.wlabel')].some(e=>e.textContent.includes('Kâğıt bitti') && e.style.display!=='none')", 15)
        check('"Kâğıt bitti" etiketi çıktı', ok)
        pg.evaluate('window.__noRender=1')
        # 6) müdür kâğıt doldurur
        ev(pg, f'{G}.player.items=["paper","paper","paper"]; {G}.player.RefreshCarry()'); ev(pg, TP, [10.1, 4.0])
        ok, v = wait_until(pg, f'{G}.st.wc.paper>=6', 10)
        check('müdür kâğıtla dolduruyor', ok, ev(pg, f'[{G}.st.wc.paper, {G}.player.items]'))
        # 7) müdür temizler
        ev(pg, f'{G}.st.wc.dirt=4; {W}.S.always=0'); ev(pg, TP, [10.1, 4.0])
        ok, v = wait_until(pg, f'{G}.st.wc.dirt===0', 10)
        check('müdür kirli tuvaleti temizliyor', ok)
        # 9) havlu isteği yığından
        ev(pg, f'{W}.S.always=0; {G}.spawnT=9999; {G}.player.items=[]; {G}.player.RefreshCarry()')
        ev(pg, f'[...window.__game.Hotel.rooms.values()].filter(r=>r.state==="dirty").forEach(r=>{G}.CleanDone(r,false))')
        ev(pg, f'(()=>{{const r=[...window.__game.Hotel.rooms.values()].find(x=>x.level>=0); window.__rm=r; const x={G}.Spawn("emekli"); window.__tg=x; x.pos.set(0,0,6);}})()')
        ok, v = wait_until(pg, 'window.__tg.s===3', 60)
        ev(pg, f'(()=>{{const r=window.__tg.room; r.request={{def:window.__game.Data.Requests[0], t:0, guest:window.__tg}}; {G}.OnRequest && {G}.OnRequest(r); window.__tg.nextReq=1e9;}})()')
        ev(pg, f'(()=>{{const r=window.__tg.room; {G}.player.floor=r.floor; {G}.player.go.position.copy(r.inside); {G}.player.path=[];}})()')
        pg.wait_for_timeout(2500)
        check('havlu yokken istek karşılanmaz', ev(pg, 'window.__tg.room.request!==null'))
        ev(pg, f'{G}.player.items=["towel"]; {G}.player.RefreshCarry()')
        ok, v = wait_until(pg, 'window.__tg.room.request===null', 8)
        check('havluyla istek karşılandı, yığından 1 havlu gitti', ok and ev(pg, f'{G}.player.Count("towel")') == 0)
        # 8) personel: temizlikçi + kat görevlisi
        ev(pg, f'{G}.AddStaff("cleaner"); {G}.AddStaff("bellhop"); {G}.st.wc.dirt=4; {G}.st.wc.paper=0'); ev(pg, TP, [-8, 2])
        ok, v = wait_until(pg, f'{G}.st.wc.dirt===0 && {G}.st.wc.paper>=8', 90)
        check('temizlikçi temizledi, kat görevlisi kâğıt doldurdu', ok, ev(pg, f'{G}.st.wc'))
        # 10) kayıt / yeniden yükleme
        ev(pg, f'{G}.st.wc.paper=5; {G}.st.wc.dirt=2; {G}.Save()')
        pg.evaluate('window.__pause=1')
        pg.reload(); pg.wait_for_function('window.__ready === true', timeout=90000)
        pg.evaluate("window.__pause=1; window.__game.UI.ClearDialogs(); window.__noRender=1")
        w2 = ev(pg, f'{G}.st.wc')
        check('yeniden yükleme: tuvalet korundu', w2 and w2['built'] and w2['paper'] == 5 and w2['dirt'] == 2 and ev(pg, f'!!{W}.S.grp'), w2)
        check('yeniden yükleme: taşıma sepeti seviyesi korundu', ev(pg, f'{G}.UpgLv("carry")') == 1)
        look(pg, 0, 8, 2, 20, 0); shot(pg, 'lobi')
        for e in sorted(set(errs)): print('  ' + e)
        if errs: fails.append('hatalar')
        b.close()
finally:
    srv.terminate()
print('\nSORUN YOK' if not fails else f'\n{len(fails)} SORUN: ' + ', '.join(fails))
sys.exit(1 if fails else 0)
