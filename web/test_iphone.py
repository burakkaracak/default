# iPhone testi: oyunu iPhone 14 Pro'daki claude.ai çerçevesi boyutunda (dokunmatik, 3x ekran, Safari kimliği) açar.
# Kendiliğinden denetler: hata, taşan yazı, birbirine binen üst kutular, soluk renk. Her sahnenin ekran görüntüsünü kaydeder.
# Kullanım: python3 test_iphone.py [çıktı_klasörü]
# Not: Bu Chromium'da bir taklittir; Safari'nin kendi çizim farkları ancak gerçek telefonda görülür.
import glob, sys, subprocess, time, os, base64, json
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__))
C = sorted(glob.glob('/opt/pw-browsers/chromium*/chrome-linux*/chrome'))[0]
OUT = sys.argv[1] if len(sys.argv) > 1 else HERE + '/iphone_shots'
os.makedirs(OUT, exist_ok=True)
srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8817'], cwd=HERE + '/dist', stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(0.8)
UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'
# claude.ai çerçevesi (Safari'de) ve ana ekrandan tam ekran açılış
SIZES = [('cerceve', 376, 643), ('tamekran', 393, 760)]

SETUP = r'''(()=>{const g=window.__game, gm=g.GameManager.I; g.Store.DeleteAll(); g.Popups.Clear(); g.Quality.auto=false; gm.celebT=0; return 'ok'})()'''
GROW = r'''(()=>{const g=window.__game, gm=g.GameManager.I; gm.money=1e7;
for(let i=0;i<6;i++) gm.UnlockRoom(gm.NextLockedRoom()); gm.OpenCafe(); gm.OpenPool(); gm.OpenRestaurant(); gm.OpenSpa(); gm.OpenWing();
for(let i=0;i<4;i++) gm.UnlockRoom(gm.NextLockedRoom()); gm.HireReceptionist(); gm.HireCleaner(); g.Popups.Clear(); gm.celebT=0; gm.money=1234; return 'ok'})()'''
def go(x, z): return f'(()=>{{const g=window.__game,gm=g.GameManager.I; g.Popups.Clear(); gm.celebT=0; if(gm.menu.open) gm.menu.Toggle();  gm.player.transform.position.set({x},0,{z}); gm.camFollow.Snap(); return 1}})()'
SCENES = [
    ('1_baslangic', None, None),
    ('2_lobi_sol', go(-11, -3), None),
    ('3_lobi_sag', go(8, -3), None),
    ('4_odalar', go(0, 3), None),
    ('5_buyumus_otel', GROW, go(2, -3)),
    ('6_dis_bahce', go(-24, -12), None),
    ('7_restoran_spa', go(27, -13), None),
    ('8_otelgram', go(0, -3), '(()=>{window.__game.Social.open=true; return 1})()'),
    ('9_menu', go(0, -3), '(()=>{const m=window.__game.GameManager.I.menu; if(!m.open) m.Toggle(); m.tab=0; return 1})()'),
]
# Renk: 3B sahnenin orta bölgesindeki ortalama doygunluk ve parlaklık (soluk/sisli görüntüyü yakalar)
COLOR_JS = r'''async (b64) => { const im = new Image(); im.src = 'data:image/png;base64,' + b64; await im.decode();
  const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d'); x.drawImage(im, 0, 0);
  const y0 = Math.floor(im.height * 0.35), y1 = Math.floor(im.height * 0.75), d = x.getImageData(0, y0, im.width, y1 - y0).data;
  let sat = 0, lum = 0, n = 0; for (let i = 0; i < d.length; i += 16) { const r = d[i]/255, g = d[i+1]/255, bb = d[i+2]/255;
    const mx = Math.max(r,g,bb), mn = Math.min(r,g,bb); sat += mx ? (mx - mn) / mx : 0; lum += (mx + mn) / 2; n++; }
  return { sat: sat / n, lum: lum / n }; }'''
OVERLAP_JS = r'''(()=>{const gm=window.__game.GameManager.I, R=gm.hudRects||{}, k=Object.keys(R), bad=[];
  for(let i=0;i<k.length;i++) for(let j=i+1;j<k.length;j++){const a=R[k[i]], b=R[k[j]];
    if(a.x < b.x+b.width-1 && b.x < a.x+a.width-1 && a.y < b.y+b.height-1 && b.y < a.y+a.height-1) bad.push(k[i]+' / '+k[j]);}
  const p=window.__game.Photo.btn; if(p && p.width) for(const n of k){const a=R[n]; if(n!=='otelgram' && a.x < p.x+p.width-1 && p.x < a.x+a.width-1 && a.y < p.y+p.height-1 && p.y < a.y+a.height-1) bad.push(n+' / fotoğraf');}
  const sw=innerWidth, sh=innerHeight; for(const n of k){const a=R[n]; if(a.x < -1 || a.y < -1 || a.x+a.width > sw+1 || a.y+a.height > sh+1) bad.push(n+' ekran dışına taşıyor');}
  return bad;})()'''
problems = []
try:
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=C, args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        for (name, w, h) in SIZES:
            ctx = b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=3, is_mobile=True, has_touch=True, user_agent=UA)
            pg = ctx.new_page(); errs = []
            pg.on('pageerror', lambda e: errs.append('HATA ' + str(e)[:300]))
            pg.on('console', lambda m: m.type == 'error' and 'Failed to load resource' not in m.text and errs.append('KONSOL ' + m.text[:300]))
            pg.goto('http://localhost:8817/play.html'); pg.wait_for_function('window.__ready === true', timeout=90000)
            pg.evaluate(SETUP)
            info = pg.evaluate('(()=>{const g=window.__game; return {grafik:g.Quality.names[g.Quality.level], piksel:g.renderer.getPixelRatio(), olcek:+g.GUI.scale.toFixed(3)}})()')
            print(f'== {name} {w}x{h}: {info}')
            for (sc, js1, js2) in SCENES:
                if js1: pg.evaluate(js1)
                if js2: pg.evaluate(js2)
                pg.wait_for_timeout(2500)
                pg.evaluate('window.__game.GUI.overflows.length=0; window.__game.GUI.audit=true')
                pg.wait_for_timeout(400)
                over = pg.evaluate('window.__game.GUI.overflows'); pg.evaluate('window.__game.GUI.audit=false')
                hud = [] if sc in ('8_otelgram', '9_menu') else pg.evaluate(OVERLAP_JS)
                shot = pg.screenshot(path=f'{OUT}/{name}_{sc}.png')
                col = pg.evaluate(COLOR_JS, base64.b64encode(shot).decode())
                line = f'  {sc}: doygunluk {col["sat"]:.2f}, parlaklık {col["lum"]:.2f}'
                issues = []
                if over: issues.append('taşan yazı: ' + ', '.join(sorted(set(o['text'] for o in over)))[:300])
                if hud: issues.append('binen kutular: ' + ', '.join(hud))
                if sc not in ('8_otelgram', '9_menu') and col['sat'] < 0.15: issues.append('renkler soluk')
                if sc not in ('8_otelgram', '9_menu') and col['lum'] > 0.9: issues.append('görüntü fazla beyaz')
                print(line + ('' if not issues else '  <-- ' + ' | '.join(issues)))
                problems += [f'{name}/{sc}: {i}' for i in issues]
            for e in sorted(set(errs)): print('  ' + e); problems.append(f'{name}: {e}')
            ctx.close()
        b.close()
finally:
    srv.terminate()
print('\nSORUN YOK' if not problems else f'\n{len(problems)} SORUN:\n' + '\n'.join(problems))
print('Ekran görüntüleri:', OUT)
sys.exit(1 if problems else 0)
