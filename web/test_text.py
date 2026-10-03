# Arayüz yazılarının kutularına sığıp sığmadığını farklı ekran boyutlarında denetler
import glob, sys, subprocess, time, os, json
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__))
C = sorted(glob.glob('/opt/pw-browsers/chromium*/chrome-linux*/chrome'))[0]
srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8815'], cwd=HERE + '/dist', stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(0.8)
SETUP = r'''(()=>{const g=window.__game, gm=g.GameManager.I; g.Store.DeleteAll(); g.Popups.Clear(); gm.money=1e7;
for(let i=0;i<6;i++) gm.UnlockRoom(gm.NextLockedRoom()); gm.OpenCafe(); gm.OpenPool(); gm.OpenRestaurant(); gm.OpenWing();
for(let i=0;i<4;i++) gm.UnlockRoom(gm.NextLockedRoom()); gm.HireReceptionist(); gm.HireCleaner(); gm.HireBarista(); gm.HireWaiter();
gm.BuyTheme(0,1); gm.BuyKind(1,2); g.Story.Begin(); g.Popups.Clear(); gm.celebT=0; return 'ok'})()'''
sizes = [(1280, 800), (1512, 945), (390, 844), (844, 390)]
res = {}
try:
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=C, args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        for (w, h) in sizes:
            pg = b.new_page(viewport={'width': w, 'height': h})
            pg.goto('http://localhost:8815/play.html'); pg.wait_for_function('window.__ready === true', timeout=60000)
            pg.evaluate(SETUP)
            found = {}
            def grab(where):
                pg.evaluate('window.__game.GUI.overflows.length=0; window.__game.GUI.audit=true')
                pg.wait_for_timeout(500)
                for o in pg.evaluate('window.__game.GUI.overflows'):
                    found.setdefault(o['text'], (where, o))
                pg.evaluate('window.__game.GUI.audit=false')
            grab('HUD')
            for t in range(7):
                for sy in [0, 500, 1000, 1600, 2500, 4000]:
                    pg.evaluate(f'''(()=>{{const gm=window.__game.GameManager.I, m=gm.menu; if(!m.open) m.Toggle(); m.tab={t};
                      for (const k of ['scroll','staffScroll','questScroll','storyScroll','upScroll','decorScroll','setScroll']) if (m[k]) m[k]={{x:0,y:{sy}}}; }})()''')
                    grab(f'menü sekme {t} kaydırma {sy}')
            pg.evaluate('(()=>{const gm=window.__game.GameManager.I; if(gm.menu.open) gm.menu.Toggle();})()')
            pg.evaluate("(()=>{const g=window.__game; g.GameManager.I.Celebrate('Başkanlık Süiti!','Oda 101 ve 102 birleşti. Sadece VIP ve ünlüler kalır. Gecelik ₺1.234.'); })()")
            grab('kutlama')
            pg.evaluate("(()=>{const g=window.__game; g.GameManager.I.celebT=0; g.GameManager.I.OfferStory(); })()")
            grab('hikâye penceresi')
            pg.evaluate("(()=>{const g=window.__game; g.Popups.Clear(); g.Events.FireNow(); })()")
            grab('olay penceresi')
            pg.evaluate("(()=>{const g=window.__game; g.Popups.Clear(); g.GameManager.I.OfferOffline(200); })()")
            grab('sen yokken')
            res[f'{w}x{h}'] = found
            pg.close()
        b.close()
finally:
    srv.terminate()
for k, f in res.items():
    print(f'== {k}: {len(f)} taşan yazı')
    for t, (where, o) in list(f.items())[:40]:
        print(f'  [{where}] "{t}"  yazı {o["w"]}x{o["h"]} / kutu {o["boxW"]}x{o["boxH"]} (font {o["fs"]})')
