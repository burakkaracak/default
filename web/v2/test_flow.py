# Oyun akışı testi: misafir gelir, karşılanır, odaya çıkar, istek, çıkış ve ödeme; temizlik; oda/kat satın alma; personel.
# Hızlandırılmış zaman (window.__sub). Sonunda beklenen durumları denetler.
import glob, sys, subprocess, time, os, json
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__))
C = sorted(glob.glob('/opt/pw-browsers/chromium*/chrome-linux*/chrome'))[0]
srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8833'], cwd=HERE + '/dist', stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(0.8)
SHOT = sys.argv[1] if len(sys.argv) > 1 else HERE + '/flow'
fails = []
def check(name, ok, info=''):
    print(('TAMAM  ' if ok else 'HATA   ') + name + ('  ' + str(info) if info else ''))
    if not ok: fails.append(name)
STATE = '''(()=>{const g=window.__game, G=g.Game; return {money:Math.round(G.st.money), served:G.st.served, guests:G.guests.map(x=>({n:x.name,s:x.s,f:x.floor,room:x.room?x.room.number:null,slot:x.slot})), queue:G.queue.length,
  rooms:[...g.Hotel.rooms.values()].filter(r=>r.level>=0).map(r=>({n:r.number,st:r.state,req:r.request?r.request.def.id:null})), player:{f:G.player.floor,x:+G.player.pos.x.toFixed(1),z:+G.player.pos.z.toFixed(1),path:G.player.path.length}, day:g.World.day, staff:G.staff.map(s=>s.role)}})()'''
try:
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=C, args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        pg = b.new_page(viewport={'width': 1280, 'height': 800}); errs = []
        pg.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e)[:400]))
        pg.on('console', lambda m: m.type == 'error' and 'Failed to load resource' not in m.text and errs.append('CONSOLE ' + m.text[:300]))
        pg.goto('http://localhost:8833/play.html'); pg.wait_for_function('window.__ready === true', timeout=90000)
        pg.evaluate("(()=>{const g=window.__game; g.Store.DeleteAll(); g.UI.ClearDialogs(); g.Game.st.money=120; g.Quality.auto=false; g.Quality.Set(0); g.Game.spawnT=999; g.Game.player.GoTo(g.Hotel.Lobby.deskBack,0); g.Game.Spawn('turist'); window.__sub=6; window.__noRender=1;})()")
        pg.wait_for_timeout(3000); print('fps:', pg.evaluate("(()=>{const f0=window.__game.Time.frameCount; return new Promise(r=>setTimeout(()=>r(window.__game.Time.frameCount-f0),2000))})()") / 2)
        # 1) misafir gelsin ve karşılansın
        t0 = time.time(); ok = False
        while time.time() - t0 < 40:
            pg.wait_for_timeout(1000); pg.evaluate('window.__game.UI.ClearDialogs()')
            s = pg.evaluate(STATE)
            if any(x['s'] >= 2 for x in s['guests']): ok = True; break
        check('misafir karşılandı ve odaya gönderildi', ok, s['guests'])
        pg.evaluate('window.__noRender=0'); pg.wait_for_timeout(1500); pg.screenshot(path=SHOT + '_1.png'); pg.evaluate('window.__noRender=1')
        # 2) odaya girdi, konaklıyor
        t0 = time.time(); ok = False
        while time.time() - t0 < 40:
            pg.wait_for_timeout(1000)
            s = pg.evaluate(STATE)
            if any(x['s'] == 3 for x in s['guests']): ok = True; break
        check('misafir odaya yerleşti (1. kat)', ok and any(x['f'] == 1 for x in s['guests']), s['guests'])
        pg.evaluate("window.__game.Hotel.SetView(1); window.__game.Game.player.GoTo(window.__game.Hotel.Room(10).inside, 1)")
        pg.evaluate('window.__noRender=0'); pg.wait_for_timeout(2500); pg.screenshot(path=SHOT + '_2.png'); pg.evaluate('window.__noRender=1')
        # 3) istek gelsin, oyuncu odada halletsin
        t0 = time.time(); ok = False
        while time.time() - t0 < 60:
            pg.wait_for_timeout(1000)
            s = pg.evaluate(STATE)
            if any(r['req'] for r in s['rooms']):
                pg.evaluate("window.__game.Game.player.GoTo(window.__game.Hotel.Room(10).inside, 1)")
            g = [x for x in s['guests'] if x['s'] == 3]
            if s['served'] >= 1 or not g: break
        # 4) çıkış ve ödeme
        t0 = time.time()
        while time.time() - t0 < 90 and s['served'] < 1:
            pg.wait_for_timeout(1000); pg.evaluate('window.__game.UI.ClearDialogs()'); s = pg.evaluate(STATE)
        check('misafir ödedi (served=1, para arttı)', s['served'] >= 1 and s['money'] > 120, {'money': s['money'], 'served': s['served']})
        check('oda kirlendi ya da oyuncu hemen temizledi', any(r['st'] in ('dirty', 'clean') for r in s['rooms']), s['rooms'])
        # 5) oyuncu temizlesin
        pg.evaluate("window.__game.Game.player.GoTo(window.__game.Hotel.Room(10).inside, 1)")
        t0 = time.time()
        while time.time() - t0 < 40:
            pg.wait_for_timeout(1000); pg.evaluate('window.__game.UI.ClearDialogs()'); s = pg.evaluate(STATE)
            if all(r['st'] != 'dirty' for r in s['rooms']): break
        check('oyuncu odayı temizledi', all(r['st'] != 'dirty' for r in s['rooms']), s['rooms'])
        pg.evaluate('window.__noRender=0'); pg.wait_for_timeout(1500); pg.screenshot(path=SHOT + '_3.png'); pg.evaluate('window.__noRender=1')
        # 6) oda al, kat al, personel tut (para verip)
        r = pg.evaluate("(()=>{const g=window.__game,G=g.Game; G.st.money=50000; const a=G.BuyRoom(G.NextRoom()); const b=G.BuyRoom(G.NextRoom()); const c=G.UpgradeRoom(g.Hotel.Room(11)); const d=G.BuyFloor(); const e=G.AddStaff('receptionist'); const f=G.AddStaff('cleaner'); const h=G.AddStaff('bellhop'); return [a,b,c,d,e,f,h, g.Hotel.floors, G.OpenRooms().length, G.staff.length]})()")
        check('oda/kat/personel satın alma', all(r[:7]) and r[7] == 2 and r[8] == 3 and r[9] == 3, r)
        # 7) personel çalışsın: 3 misafir gelsin, resepsiyonist yerleştirsin; temizlikçi temizlesin
        pg.evaluate("(()=>{const g=window.__game,G=g.Game; G.player.GoTo(g.Hotel.Lobby.lounge,0); for(const t of ['is','aile','emekli']) G.Spawn(t); window.__sub=8;})()")
        t0 = time.time(); ok = False
        while time.time() - t0 < 150:
            pg.wait_for_timeout(1500); pg.evaluate('window.__game.UI.ClearDialogs()'); s = pg.evaluate(STATE)
            if s['served'] >= 3 and all(r['st'] != 'dirty' for r in s['rooms']) and not any(x['s'] == 3 for x in s['guests']): ok = True; break
        check('personel: 3 misafir daha ağırlandı ve odalar temizlendi', ok, {'served': s['served'], 'rooms': s['rooms'], 'guests': s['guests']})
        pg.evaluate('window.__noRender=0'); pg.wait_for_timeout(1500); pg.screenshot(path=SHOT + '_4.png'); pg.evaluate('window.__noRender=1')
        # 8) kayıt ve yeniden yükleme
        before = pg.evaluate(STATE); pg.evaluate("window.__game.Game.Save()")
        pg.reload(); pg.wait_for_function('window.__ready === true', timeout=90000); pg.evaluate('window.__game.UI.ClearDialogs()')
        after = pg.evaluate(STATE)
        check('kayıt yüklendi', after['money'] == before['money'] and len(after['rooms']) == len(before['rooms']) and sorted(after['staff']) == sorted(before['staff']), {'before': before['money'], 'after': after['money'], 'staff': after['staff']})
        for e in sorted(set(errs)): print('  ' + e)
        if errs: fails.append('hatalar')
        b.close()
finally:
    srv.terminate()
print('\nSORUN YOK' if not fails else f'\n{len(fails)} SORUN: ' + ', '.join(fails))
sys.exit(1 if fails else 0)
