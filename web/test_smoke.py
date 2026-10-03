# Bütün sistemleri hızlıca dener: satın almalar, menü sekmeleri, hikâye; hataları listeler
import glob, sys, subprocess, time, os
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__))
C = sorted(glob.glob('/opt/pw-browsers/chromium*/chrome-linux*/chrome'))[0]
srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8813'], cwd=HERE + '/dist', stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(0.8)
SHOT = sys.argv[1] if len(sys.argv) > 1 else HERE + '/smoke'
STEPS = r'''
const g = window.__game, gm = g.GameManager.I;
const log = [];
const tryit = (n, f) => { try { f(); } catch (e) { log.push(n + ': ' + e.message + ' @ ' + (e.stack || '').split('\n')[1]); } };
g.Popups.Clear();
gm.money = 10000000;
tryit('rooms', () => { for (let i = 0; i < 6; i++) gm.UnlockRoom(gm.NextLockedRoom()); });
tryit('cafe', () => gm.OpenCafe());
tryit('pool', () => gm.OpenPool());
tryit('wing', () => gm.OpenWing());
tryit('rooms2', () => { for (let i = 0; i < 4; i++) gm.UnlockRoom(gm.NextLockedRoom()); });
tryit('floor2', () => gm.OpenFloor2());
tryit('rooms3', () => { for (let i = 0; i < 6; i++) gm.UnlockRoom(gm.NextLockedRoom()); });
tryit('upgrade', () => { for (let i = 0; i < 16; i++) { gm.UpgradeRoom(i); gm.UpgradeRoom(i); } });
tryit('recep', () => gm.HireReceptionist());
tryit('cleaners', () => { gm.HireCleaner(); gm.HireCleaner(); gm.HireCleaner(); });
tryit('barista', () => gm.HireBarista());
tryit('restoran', () => { gm.OpenRestaurant(); gm.HireWaiter(); });
tryit('spa', () => { gm.OpenSpa(); gm.HireTherapist(); });
tryit('yeni misafir', () => { const G = g.Customer.G; for (const t of [5,6,7,8,9]) gm.QueueSpawn({type:t,vip:false,celebrity:false,inspector:false,regular:null,reservation:null}); });
tryit('ups', () => { for (let u = 0; u < 11; u++) gm.BuyUpgrade(u); });
tryit('decor', () => { for (let s = 0; s < 6; s++) gm.BuyDecor(s, 1); });
tryit('theme', () => { gm.BuyTheme(0, 1); gm.BuyTheme(1, 2); gm.BuyTheme(2, 3); gm.BuyTheme(3, 4); });
tryit('kind', () => { gm.BuyKind(0, 1); gm.BuyKind(1, 2); gm.BuyKind(2, 3); gm.BuyKind(3, 4); });
tryit('suite', () => gm.MakeSuite(4));
tryit('cat', () => gm.AdoptCat());
tryit('coop', () => gm.SetCoop(true));
tryit('story', () => g.Story.Begin());
tryit('event', () => g.Events.FireNow());
tryit('save', () => gm.Save());
g.Popups.Clear();
window.__smokeLog = log;
return log.join('\n') || 'OK';
'''
try:
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=C, args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        pg = b.new_page(viewport={'width': 1280, 'height': 800}); errs = []
        pg.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e)[:300]))
        pg.on('console', lambda m: m.type == 'error' and 'Failed to load resource' not in m.text and errs.append('CONSOLE ' + m.text[:300]))
        pg.goto('http://localhost:8813/play.html'); pg.wait_for_function('window.__ready === true', timeout=60000)
        pg.evaluate('window.__game.Store.DeleteAll()')
        print('steps:', pg.evaluate('(()=>{' + STEPS + '})()'))
        pg.evaluate('window.__sub = 6')
        pg.wait_for_timeout(15000)
        pg.screenshot(path=SHOT + '_world.png')
        for t in range(7):
            pg.evaluate(f'(()=>{{const gm=window.__game.GameManager.I; window.__game.Popups.Clear(); if(!gm.MenuOpen) gm.menu.Toggle(); gm.menu.tab={t};}})()')
            pg.wait_for_timeout(1500)
            pg.screenshot(path=f'{SHOT}_tab{t}.png')
        pg.evaluate('(()=>{const gm=window.__game.GameManager.I; if(gm.MenuOpen) gm.menu.Toggle(); window.__game.Popups.Clear();})()')
        pg.wait_for_timeout(20000)
        pg.screenshot(path=SHOT + '_world2.png')
        seen = set()
        for e in errs:
            if e in seen: continue
            seen.add(e); print(e)
        print('errors:', len(errs))
        b.close()
finally:
    srv.terminate()
