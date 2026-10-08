# Tesis testi: bütün tesisler kurulur, personel tutulur, misafirler tesislere zorla gönderilir (window.__fac.ForceVisit);
# servis, ödeme, memnuniyet, kat alınınca çatının taşınması, kayıt/yeniden yükleme denetlenir. Her tesisin ekran görüntüsü alınır.
import glob, sys, subprocess, time, os, json
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__))
C = sorted(glob.glob('/opt/pw-browsers/chromium*/chrome-linux*/chrome'))[0]
PORT = '8841'
srv = subprocess.Popen([sys.executable, '-m', 'http.server', PORT], cwd=HERE + '/dist', stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(0.8)
SHOT = sys.argv[1] if len(sys.argv) > 1 else HERE + '/fac'
fails = []
def check(name, ok, info=''):
    print(('TAMAM  ' if ok else 'HATA   ') + name + ('  ' + str(info) if info else ''))
    if not ok: fails.append(name)
STATE = '''(()=>{const g=window.__game, G=g.Game, F=window.__game.Facilities; return {money:Math.round(G.st.money), served:G.st.served, day:g.World.day, roof:g.Hotel.RoofIndex, floors:g.Hotel.floors,
  guests:G.guests.map(x=>({n:x.name,t:x.type.id,s:x.s,f:x.floor,sat:+x.sat.toFixed(2),ph:x.fv?x.fv.phase:null,sub:x.fv?x.fv.sub:null,fac:x.fv?x.fv.fac.id:null,path:x.path.length,y:+x.pos.y.toFixed(2),x:+x.pos.x.toFixed(1),z:+x.pos.z.toFixed(1)})),
  staff:G.staff.map(s=>({r:s.role,f:s.floor,x:+s.pos.x.toFixed(1),z:+s.pos.z.toFixed(1),y:+s.pos.y.toFixed(2),path:s.path.length})),
  fac:Object.fromEntries(Object.entries(F.S.fac).map(([k,f])=>[k,{built:f.built,go:!!f.go,n:f.guests.length}])), stats:G.st.facStats||{}, bloom:+F.bloom.toFixed(2)}})()'''
# kamera bir noktaya sabitlenir (ekran görüntüsü için)
def look(pg, floor, x, z, dist=16, yaw=0):
    pg.evaluate(f"(()=>{{const g=window.__game; g.Hotel.SetView({floor}); g.Cam.follow=null; g.Cam.floor={floor}; g.Cam.target.set({x}, g.Hotel.FloorY({floor}), {z}); g.Cam.yawGoal={yaw}; g.Cam.distGoal={dist}; g.Cam.Snap();}})()")
def shot(pg, name):
    pg.evaluate('window.__noRender=0'); pg.wait_for_timeout(900); pg.screenshot(path=SHOT + '_' + name + '.png', timeout=120000); pg.evaluate('window.__noRender=1')
def wait_until(pg, cond, timeout, step=700):
    t0 = time.time(); s = None
    while time.time() - t0 < timeout:
        pg.wait_for_timeout(step); pg.evaluate('window.__game.UI.ClearDialogs()'); s = pg.evaluate(STATE)
        if cond(s): return True, s
    return False, s
try:
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=C, args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        pg = b.new_page(viewport={'width': 1280, 'height': 800}); errs = []
        pg.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e)[:400]))
        pg.on('console', lambda m: m.type == 'error' and 'Failed to load resource' not in m.text and errs.append('CONSOLE ' + m.text[:300]))
        pg.goto(f'http://localhost:{PORT}/play.html'); pg.wait_for_function('window.__ready === true', timeout=90000)
        pg.evaluate("(()=>{const g=window.__game; window.__game.Facilities = window.__fac; g.Store.DeleteAll(); g.UI.ClearDialogs(); g.Quality.auto=false; g.Quality.Set(0); g.Game.spawnT=9999; g.Game.st.money=1e6; g.Game.st.rep=400; g.Game.st.stars=5; window.__sub=6; window.__noRender=1; g.Game.player.GoTo(g.Hotel.Lobby.lounge,0);})()")
        # 1) hepsini kur, personel tut, odalar aç
        r = pg.evaluate("""(()=>{const g=window.__game,G=g.Game,F=window.__fac; const ids=['kafe','bahce','havuz','spor','restoran','spa','bar']; const built=ids.map(i=>F.Buy(i));
          const roles=['barista','asci','garson','terapist','cankurtaran','barmen','bahcivan']; const hired=roles.map(r=>G.AddStaff(r)); const rec=G.AddStaff('receptionist'); const cl=G.AddStaff('cleaner');
          for(let i=0;i<5;i++) G.BuyRoom(G.NextRoom());
          return {built, hired, rec, cl, flags:Object.keys(G.st.facilities).length, roles:F.StaffRoles(), staff:G.staff.length, rooms:G.OpenRooms().length}})()""")
        check('7 tesis kuruldu, 7 tesis personeli + resepsiyonist + temizlikçi tutuldu', all(r['built']) and all(r['hired']) and r['rec'] and r['cl'] and r['flags'] == 7 and r['staff'] == 9 and r['rooms'] == 6, r)
        check('StaffRoles bütün rolleri veriyor', sorted(r['roles']) == sorted(['barista', 'asci', 'garson', 'terapist', 'cankurtaran', 'barmen', 'bahcivan']), r['roles'])
        s = pg.evaluate(STATE)
        check('bütün tesislerin görseli var', all(v['go'] for v in s['fac'].values()), s['fac'])
        # personel yerine gitsin
        ok, s = wait_until(pg, lambda s: all(x['path'] == 0 for x in s['staff']) and all((x['f'] == s['roof']) == (x['r'] in ('cankurtaran', 'barmen', 'bahcivan')) for x in s['staff'] if x['r'] not in ('receptionist', 'cleaner')), 60)
        check('tesis personeli yerine gitti (çatı olanlar çatıda)', ok, s['staff'])
        money0 = s['money']
        # 2) her tesise misafir gönder
        plan = [('kafe', ['is', 'turist'], 0, 4.9, 4.1), ('restoran', ['balayi', 'emekli'], 0, 5.0, -4.1), ('spa', ['balayi', 'emekli', 'turist'], 0, -7.9, -4.1),
                ('havuz', ['aile', 'turist'], 'roof', 0.8, 0.3), ('bar', ['is', 'balayi'], 'roof', 6.4, -5.0), ('bahce', ['emekli', 'aile'], 'roof', -8, 0.3), ('spor', ['ogrenci', 'turist'], 'roof', 7.7, 4.7)]
        for fid, types, fl, cx, cz in plan:
            m0 = pg.evaluate('Math.round(window.__game.Game.st.money)')
            names = pg.evaluate("(([fid, types])=>{const g=window.__game,G=g.Game; return types.map(t=>{const x=G.Spawn(t); x.pos.set(0,0,12); const ok=window.__fac.ForceVisit(x,fid); return [x.name, ok];});})", [fid, types])
            check(fid + ': ForceVisit kabul edildi', all(n[1] for n in names), names)
            # misafir tesise varsın (bekliyor ya da keyif)
            ok, s = wait_until(pg, lambda s: any(x['fac'] == fid and x['ph'] in ('wait', 'enjoy') and x['path'] == 0 for x in s['guests']), 60)
            check(fid + ': misafir tesise vardı', ok, [x for x in s['guests'] if x['fac'] == fid])
            floor = s['roof'] if fl == 'roof' else 0
            if ok and fl == 'roof': check(fid + ': misafir çatı katında', all(x['f'] == s['roof'] for x in s['guests'] if x['fac'] == fid), [x for x in s['guests'] if x['fac'] == fid])
            look(pg, floor, cx, cz, 15 if fl == 'roof' else 14)
            if fid == 'havuz':
                ok2, s2 = wait_until(pg, lambda s: any(x['fac'] == fid and x['sub'] == 2 for x in s['guests']), 40)
                check('havuz: misafir yüzüyor', ok2, [x for x in s2['guests'] if x['fac'] == fid])
            if fid in ('restoran', 'spa', 'kafe', 'bar'):
                ok2, s2 = wait_until(pg, lambda s: any(x['fac'] == fid and x['ph'] == 'enjoy' for x in s['guests']), 60)
                check(fid + ': personel servis etti (keyif aşaması)', ok2, [x for x in s2['guests'] if x['fac'] == fid])
            shot(pg, fid)
            # bitsin: misafirler gitsin, para artsın
            ok, s = wait_until(pg, lambda s: not any(x['t'] and x['fac'] == fid for x in s['guests']) and not any(x['s'] == 6 for x in s['guests']), 120)
            st = s['stats'].get(fid, {'n': 0, 'earn': 0})
            check(fid + ': ziyaret tamamlandı (' + str(len(types)) + ' misafir)', ok and st['n'] == len(types), {'stats': st, 'guests': s['guests']})
            if fid == 'bahce': check('bahçe ücretsiz', st['earn'] == 0, st)
            else: check(fid + ': para arttı', s['money'] > m0 and st['earn'] > 0, {'m0': m0, 'm1': s['money'], 'earn': st['earn']})
            # misafirler sokağa çıkana kadar bekle
            wait_until(pg, lambda s: all(x['s'] == 5 and x['z'] > 7 for x in s['guests']) or not s['guests'], 60)
        # 3) oyuncu servis etsin: barista'yı kaldıramayız; kafeye barista olmadan test → ikinci kafe kurma yerine spa'da oyuncu terapist yerine masaj yapsın
        pg.evaluate("(()=>{const g=window.__game,G=g.Game; const t=G.staff.find(s=>s.role==='terapist'); t.destroy(); G.staff.splice(G.staff.indexOf(t),1); G.st.extraStaff[t.role]--; delete G.st.staffData[t.key]; G.player.GoTo(g.Hotel.Lobby.lounge,0); const x=G.Spawn('balayi'); x.pos.set(0,0,12); window.__fac.ForceVisit(x,'spa',0);})()")
        ok, s = wait_until(pg, lambda s: any(x['fac'] == 'spa' and x['ph'] == 'wait' and x['path'] == 0 for x in s['guests']), 60)
        check('oyuncu testi: misafir spada masaj bekliyor', ok, s['guests'])
        pg.evaluate("(()=>{const g=window.__game,G=g.Game; const x=G.guests.find(q=>q.fv&&q.fv.fac.id==='spa'); const at=x.fv.spot.at||x.fv.spot.p; G.player.GoTo(new g.THREE.Vector3(at.x,0,at.z),0);})()")
        ok, s = wait_until(pg, lambda s: any(x['fac'] == 'spa' and x['ph'] == 'enjoy' for x in s['guests']), 60)
        check('oyuncu masaj yaptı (keyif aşaması)', ok, s['guests'])
        wait_until(pg, lambda s: not any(x['s'] == 6 for x in s['guests']), 90)
        # 4) sabırsızlık: kafede barista yokken 35 sn bekleyen misafir kızıp gider
        pg.evaluate("(()=>{const g=window.__game,G=g.Game; const t=G.staff.find(s=>s.role==='barista'); t.destroy(); G.staff.splice(G.staff.indexOf(t),1); G.st.extraStaff[t.role]--; delete G.st.staffData[t.key]; G.player.GoTo(g.Hotel.Lobby.lounge,0); const x=G.Spawn('is'); x.pos.set(0,0,12); x.sat=3; window.__fac.ForceVisit(x,'kafe');})()")
        ok, s = wait_until(pg, lambda s: any(x['fac'] == 'kafe' and x['ph'] == 'wait' for x in s['guests']), 60)
        ok, s = wait_until(pg, lambda s: any(x['s'] == 5 and x['t'] == 'is' for x in s['guests']) or not s['guests'], 90)
        g = [x for x in s['guests'] if x['t'] == 'is']
        check('servis gelmeyince misafir 35 sn sonra kızıp gitti (sat düştü)', ok and (not g or g[0]['sat'] < 3), g)
        wait_until(pg, lambda s: not s['guests'], 60)
        # 5) doğal akış: çıkışta ödeyen misafir tesise uğrar (Offer)
        pg.evaluate("(()=>{const g=window.__game,G=g.Game; window.__fac.S.alwaysOffer=true; G.player.GoTo(g.Hotel.Lobby.lounge,0); G.Spawn('balayi');})()")
        ok, s = wait_until(pg, lambda s: any(x['s'] == 6 for x in s['guests']), 200)
        check('doğal akış: çıkışta ödeyen misafir tesise gitti', ok, s['guests'])
        vis = s['guests'][0]['fac'] if s['guests'] else None
        # 6) çatıdaki misafir varken kat alınınca misafir yeni çatıya taşınır
        pg.evaluate("(()=>{const g=window.__game,G=g.Game; for(const q of G.guests){ if(q.s===6) continue; } const x=G.Spawn('aile'); x.pos.set(0,0,12); window.__fac.ForceVisit(x,'havuz');})()")
        ok, s = wait_until(pg, lambda s: any(x['fac'] == 'havuz' and x['f'] == s['roof'] and x['path'] == 0 for x in s['guests']), 90)
        check('kat testi: aile havuzda', ok, [x for x in s['guests'] if x['fac'] == 'havuz'])
        r = pg.evaluate("(()=>{const g=window.__game,G=g.Game; const a=G.BuyFloor(); return [a, g.Hotel.RoofIndex, g.Hotel.floors]})()")
        pg.wait_for_timeout(300); pg.evaluate('window.__game.UI.ClearDialogs()'); s = pg.evaluate(STATE)
        pool = [x for x in s['guests'] if x['fac'] == 'havuz']
        check('kat alındı, havuzdaki misafir ve çatı personeli yeni çatı katına taşındı', r[0] and r[1] == 3 and all(x['f'] == 3 and abs(x['y'] - 3 * 3.4) < 1.2 for x in pool) and all(x['f'] == 3 for x in s['staff'] if x['r'] in ('cankurtaran', 'barmen', 'bahcivan')), {'r': r, 'pool': pool, 'staff': s['staff']})
        check('çatı tesisleri yeniden kuruldu', all(s['fac'][k]['go'] for k in ('havuz', 'bar', 'bahce', 'spor')), s['fac'])
        look(pg, 3, 1, 0, 26); shot(pg, 'cati')
        ok, s = wait_until(pg, lambda s: not any(x['s'] == 6 for x in s['guests']), 150)
        check('kat sonrası ziyaretler tamamlandı', ok and s['stats']['havuz']['n'] >= 3, {'stats': s['stats'], 'guests': s['guests']})
        # 7) bahçe çiçeklenmesi: gün değişince azalır, bahçıvan geri getirir
        pg.evaluate("(()=>{const g=window.__game,G=g.Game; const t=G.staff.find(s=>s.role==='bahcivan'); t.destroy(); G.staff.splice(G.staff.indexOf(t),1); G.st.extraStaff[t.role]--; delete G.st.staffData[t.key]; g.World.time=0.249;})()")
        ok, s = wait_until(pg, lambda s: s['day'] >= 2 and s['bloom'] < 0.7, 30)
        b1 = s['bloom']
        check('gün değişince bahçe çiçeklenmesi azaldı', ok, {'bloom': b1})
        pg.evaluate("(()=>{const G=window.__game.Game; G.AddStaff('bahcivan');})()")
        ok, s = wait_until(pg, lambda s: s['bloom'] >= 0.98, 90)
        check('bahçıvan çiçekleri yeniden açtırdı', b1 < 0.7 and ok, {'sonra_gun': b1, 'simdi': s['bloom']})
        check('GardenBonus > 0', pg.evaluate('window.__fac.GardenBonus') > 0.3, pg.evaluate('window.__fac.GardenBonus'))
        # 8) sayfa: tesisler sekmesi
        n = pg.evaluate("(()=>{window.__game.Game.BuildSheet('tesis'); return document.querySelectorAll('.sheet .item').length})()")
        check('Tesisler sekmesi 7 öğe gösteriyor', n == 7, n)
        pg.evaluate('window.__noRender=0'); pg.wait_for_timeout(800); pg.screenshot(path=SHOT + '_sheet.png', timeout=120000); pg.evaluate('window.__noRender=1; window.__game.UI.CloseSheet()')
        # gece görünümü (ışıklar)
        pg.evaluate("(()=>{const g=window.__game; g.World.time=0.92; g.World.Apply();})()")
        look(pg, 3, 1, -1, 24); shot(pg, 'cati_gece'); look(pg, 0, 0, 0, 24); shot(pg, 'lobi_gece')
        pg.evaluate("(()=>{const g=window.__game; g.World.time=0.4; g.World.Apply();})()")
        # 9) kayıt ve yeniden yükleme
        pg.evaluate('window.__pause=1; window.__game.Game.Save()'); before = pg.evaluate(STATE)
        pg.reload(); pg.wait_for_function('window.__ready === true', timeout=90000); pg.evaluate("window.__pause=1; window.__game.UI.ClearDialogs(); window.__game.Facilities=window.__fac; window.__noRender=1; window.__game.Quality.Set(0)")
        after = pg.evaluate(STATE)
        if after['money'] != before['money'] or after['stats'] != before['stats']: print('   fark:', {'money': (before['money'], after['money']), 'stats': (before['stats'], after['stats'])})
        check('yeniden yükleme: tesisler, personel, istatistik ve para korundu', all(v['built'] and v['go'] for v in after['fac'].values()) and len(after['fac']) == 7 and sorted(x['r'] for x in after['staff']) == sorted(x['r'] for x in before['staff']) and after['money'] == before['money'] and after['stats'] == before['stats'] and after['roof'] == 3, {'fac': all(v['built'] and v['go'] for v in after['fac'].values()), 'staff': (sorted(x['r'] for x in before['staff']), sorted(x['r'] for x in after['staff'])), 'money': (before['money'], after['money']), 'roof': after['roof']})
        look(pg, 0, 0, 0, 26); shot(pg, 'lobi'); look(pg, 3, 1, 0, 26); shot(pg, 'cati2')
        for e in sorted(set(errs)): print('  ' + e)
        if errs: fails.append('hatalar')
        b.close()
finally:
    srv.terminate()
print('\nSORUN YOK' if not fails else f'\n{len(fails)} SORUN: ' + ', '.join(fails))
sys.exit(1 if fails else 0)
