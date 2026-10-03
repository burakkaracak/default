# Oyunu başsız tarayıcıda açar: hataları yazar, ekran görüntüsü alır
import glob, sys, subprocess, time, os
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__))
C = sorted(glob.glob('/opt/pw-browsers/chromium*/chrome-linux*/chrome'))[0]
port = 8811
srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(port)], cwd=HERE + '/dist', stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(0.8)
out = sys.argv[1] if len(sys.argv) > 1 else HERE + '/shot.png'
w, h = (int(sys.argv[2]), int(sys.argv[3])) if len(sys.argv) > 3 else (1280, 800)
wait = float(sys.argv[4]) if len(sys.argv) > 4 else 6
js = sys.argv[5] if len(sys.argv) > 5 else None
try:
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=C, args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        pg = b.new_page(viewport={'width': w, 'height': h})
        errs = []
        pg.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e)[:400]))
        pg.on('console', lambda m: m.type in ('error', 'warning') and errs.append(m.type + ' ' + m.text[:400]))
        pg.goto(f'http://localhost:{port}/play.html')
        try: pg.wait_for_function('window.__ready === true', timeout=60000)
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
