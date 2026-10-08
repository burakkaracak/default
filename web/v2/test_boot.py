# Oyunu başsız tarayıcıda açar: hataları yazar, ekran görüntüsü alır.
# Kullanım: python3 test_boot.py çıktı.png [en] [boy] [saniye] [js] [--touch]
import glob, sys, subprocess, time, os
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__))
C = sorted(glob.glob('/opt/pw-browsers/chromium*/chrome-linux*/chrome'))[0]
args = [a for a in sys.argv[1:] if not a.startswith('--')]
touch = '--touch' in sys.argv
port = 8831
srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(port)], cwd=HERE + '/dist', stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(0.8)
out = args[0] if len(args) > 0 else HERE + '/shot.png'
w, h = (int(args[1]), int(args[2])) if len(args) > 2 else (1280, 800)
wait = float(args[3]) if len(args) > 3 else 5
js = args[4] if len(args) > 4 else None
try:
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=C, args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        ctx = b.new_context(viewport={'width': w, 'height': h}, has_touch=touch, is_mobile=touch, device_scale_factor=2 if touch else 1)
        pg = ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e)[:500]))
        pg.on('console', lambda m: m.type in ('error', 'warning') and 'Failed to load resource' not in m.text and errs.append(m.type + ' ' + m.text[:400]))
        pg.goto(f'http://localhost:{port}/play.html')
        try: pg.wait_for_function('window.__ready === true', timeout=90000)
        except Exception as e: errs.append('READY TIMEOUT')
        if js: print('JS:', pg.evaluate(js))
        pg.wait_for_timeout(int(wait * 1000))
        pg.screenshot(path=out)
        seen = set()
        for e in errs:
            if e in seen: continue
            seen.add(e); print(e)
        print('errors:', len(errs))
        b.close()
finally:
    srv.terminate()
