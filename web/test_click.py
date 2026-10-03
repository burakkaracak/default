# Gerçek fare/dokunma olaylarıyla menü düğmesini dener
import glob, sys, subprocess, time, os
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__))
C = sorted(glob.glob('/opt/pw-browsers/chromium*/chrome-linux*/chrome'))[0]
srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8812'], cwd=HERE + '/dist', stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(0.8)
S = sys.argv[1]
w, h, touch = int(sys.argv[2]), int(sys.argv[3]), sys.argv[4] == '1'
try:
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=C, args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        ctx = b.new_context(viewport={'width': w, 'height': h}, has_touch=touch, is_mobile=touch, device_scale_factor=2 if touch else 1)
        pg = ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e)[:300]))
        pg.goto('http://localhost:8812/play.html'); pg.wait_for_function('window.__ready === true', timeout=60000)
        pg.evaluate("window.__game.Popups.Clear(); window.__game.GameManager.I.money = 5000; window.__game.Store.DeleteAll()")
        pg.wait_for_timeout(1500)
        pg.screenshot(path=S + '_a.png')
        # menü düğmesinin yeri GameManager.menuBtn
        r = pg.evaluate("(()=>{const m=window.__game.GameManager.I.menuBtn; return [m.x+m.width/2, m.y+m.height/2]})()")
        print('menu btn at', r)
        if touch: pg.touchscreen.tap(r[0], r[1])
        else: pg.mouse.click(r[0], r[1])
        pg.wait_for_timeout(1500)
        print('menu open:', pg.evaluate("window.__game.GameManager.I.MenuOpen"))
        pg.screenshot(path=S + '_b.png')
        for e in errs: print(e)
        b.close()
finally:
    srv.terminate()
