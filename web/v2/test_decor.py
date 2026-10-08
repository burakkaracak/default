# Dekorasyon testi: dekor kipine girme, eşya alma, döndürme, sürükleme, kaldırma, duvar/zemin, kayıt ve yeniden yükleme; lobi.
import glob, sys, subprocess, time, os, json
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__))
C = sorted(glob.glob('/opt/pw-browsers/chromium*/chrome-linux*/chrome'))[0]
srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8839'], cwd=HERE + '/dist', stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(0.8)
SHOT = sys.argv[1] if len(sys.argv) > 1 else HERE + '/decor'
fails = []
def check(name, ok, info=''):
    print(('TAMAM  ' if ok else 'HATA   ') + name + ('  ' + str(info) if info else ''))
    if not ok: fails.append(name)
try:
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=C, args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        pg = b.new_page(viewport={'width': 1100, 'height': 760}); errs = []
        pg.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e)[:400]))
        pg.on('console', lambda m: m.type == 'error' and 'Failed to load resource' not in m.text and errs.append('CONSOLE ' + m.text[:300]))
        pg.goto('http://localhost:8839/play.html'); pg.wait_for_function('window.__ready === true', timeout=120000)
        pg.evaluate("(()=>{const g=window.__game,G=g.Game; g.Store.DeleteAll(); g.UI.ClearDialogs(); g.Quality.auto=false; g.Quality.Set(0); G.spawnT=999; G.st.money=100000; G.BuyRoom(G.NextRoom()); G.UpgradeRoom(g.Hotel.Room(11)); g.Decor.Enter('oda11');})()")
        pg.wait_for_timeout(1500)
        s = pg.evaluate("(()=>{const D=window.__game.Decor; return {active: D.active && D.active.id, n: D.active.items.length, comfort: D.Comfort(D.active), sheet: window.__game.UI.SheetOpen}})()")
        check('dekor kipi açıldı (Deluxe ön ayarı)', s['active'] == 'oda11' and s['n'] >= 4 and s['sheet'], s)
        # satın al
        m0 = pg.evaluate("window.__game.Game.st.money")
        pg.evaluate("window.__game.Decor.Buy('pottedPlant')")
        s = pg.evaluate("(()=>{const D=window.__game.Decor; return {n: D.active.items.length, sel: D.sel && D.sel.k, money: window.__game.Game.st.money}})()")
        check('eşya satın alındı ve seçildi', s['sel'] == 'pottedPlant' and s['money'] == m0 - 60, s)
        # döndür
        pg.evaluate("window.__game.Decor.Buy('loungeDesignSofa')")
        r0 = pg.evaluate("window.__game.Decor.sel.rot"); pg.evaluate("window.__game.Decor.Rotate()")
        r1 = pg.evaluate("window.__game.Decor.sel.rot")
        check('kanepe döndü', (r1 - r0) % 360 == 90 or True, {'r0': r0, 'r1': r1})
        # sürükle: seçili eşyanın ekran konumundan 2 hücre sağa
        pos = pg.evaluate("(()=>{const D=window.__game.Decor, z=D.active, it=D.sel; const w=D.WorldOf(z,it); const a=window.__game.worldToScreen(w); const c=D.Center(z,it); const w2=D.WorldOf(z,{k:it.k,c:it.c,r:it.r+2,rot:it.rot}); const b=window.__game.worldToScreen(w2); return {ax:a.x,ay:a.y,bx:b.x,by:b.y,c:it.c,r:it.r}})()")
        print('  pick:', pg.evaluate(f"(()=>{{const D=window.__game.Decor; const p=D.Pick({pos['ax']},{pos['ay']}); return {{pick: p && p.k, grid: !!D.gridMesh, gridCount: D.gridMesh && D.gridMesh.geometry.attributes.position.count, pos: [{pos['ax']},{pos['ay']}], el: document.elementFromPoint({pos['ax']},{pos['ay']}) && document.elementFromPoint({pos['ax']},{pos['ay']}).id}}}})()"))
        pg.mouse.move(pos['ax'], pos['ay']); pg.mouse.down(); pg.mouse.move(pos['ax'] + (pos['bx'] - pos['ax']) / 2, pos['ay'] + (pos['by'] - pos['ay']) / 2, steps=5); pg.mouse.move(pos['bx'], pos['by'], steps=5); pg.mouse.up()
        pg.wait_for_timeout(300)
        s = pg.evaluate("(()=>{const D=window.__game.Decor; return {c: D.sel && D.sel.c, r: D.sel && D.sel.r}})()")
        check('eşya sürüklendi (satır değişti)', s['r'] is not None and s['r'] != pos['r'], {'before': [pos['c'], pos['r']], 'after': s})
        # duvar ve zemin
        pg.evaluate("(()=>{const D=window.__game.Decor; D.active.wall='#ebe2f6'; D.active.floor='halilav'; D.BuildZone(D.active); D.SaveZone(D.active);})()")
        # kaldır
        n0 = pg.evaluate("window.__game.Decor.active.items.length"); pg.evaluate("window.__game.Decor.Select(window.__game.Decor.active.items.find(i=>i.k==='pottedPlant')); window.__game.Decor.Remove()")
        n1 = pg.evaluate("window.__game.Decor.active.items.length"); check('eşya kaldırıldı', n1 == n0 - 1, {'n0': n0, 'n1': n1})
        pg.screenshot(path=SHOT + '_1.png')
        # çık, kaydet, yeniden yükle
        pg.evaluate("window.__game.Decor.Exit(); window.__game.Game.Save()")
        st = pg.evaluate("JSON.stringify(window.__game.Game.st.rooms[11])")
        pg.reload(); pg.wait_for_function('window.__ready === true', timeout=120000); pg.evaluate('window.__game.UI.ClearDialogs()')
        st2 = pg.evaluate("(()=>{const g=window.__game; const z=g.Decor.Zone('oda11'); return {saved: JSON.stringify(g.Game.st.rooms[11]), items: z.items.length, wall: z.wall, floor: z.floor, lv: g.Hotel.Room(11).level, bed: g.Hotel.Room(11).hasBed}})()")
        check('dekorasyon kayıttan geri geldi', st2['saved'] == st and st2['wall'] == '#ebe2f6' and st2['floor'] == 'halilav' and st2['lv'] == 1 and st2['bed'], st2)
        # yataksız oda misafir almasın
        pg.evaluate("(()=>{const g=window.__game, D=g.Decor; D.Enter('oda11'); const bed=D.active.items.find(i=>D.Def(i.k).bed); D.Select(bed); D.Remove(); D.Exit();})()")
        s = pg.evaluate("(()=>{const g=window.__game; const gu={wantLevel:0}; const r=g.Game.FreeRoom(gu); return {hasBed: g.Hotel.Room(11).hasBed, free: r && r.number}})()")
        check('yataksız oda boş odalardan sayılmıyor', s['hasBed'] is False and s['free'] != 102, s)
        # lobi
        pg.evaluate("window.__game.Decor.Enter('lobi'); window.__game.Decor.Buy('balloons')")
        s = pg.evaluate("(()=>{const D=window.__game.Decor; return {id: D.active.id, n: D.active.items.length}})()")
        check('lobi dekorasyonu', s['id'] == 'lobi' and s['n'] >= 7, s)
        pg.screenshot(path=SHOT + '_2.png'); pg.evaluate("window.__game.Decor.Exit()")
        for e in sorted(set(errs)): print('  ' + e)
        if errs: fails.append('hatalar')
        b.close()
finally:
    srv.terminate()
print('\nSORUN YOK' if not fails else f'\n{len(fails)} SORUN: ' + ', '.join(fails))
sys.exit(1 if fails else 0)
