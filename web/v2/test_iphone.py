# iPhone testi (Otel Ustası 2): iPhone 14 Pro boyutunda (dokunmatik, 3x) açar; hata, binen arayüz kutuları, taşan yazı ve soluk renk denetler.
# Kullanım: python3 test_iphone.py [çıktı_klasörü]
import glob, sys, subprocess, time, os, base64
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__))
C = sorted(glob.glob('/opt/pw-browsers/chromium*/chrome-linux*/chrome'))[0]
OUT = sys.argv[1] if len(sys.argv) > 1 else HERE + '/iphone_shots'
os.makedirs(OUT, exist_ok=True)
srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8835'], cwd=HERE + '/dist', stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(0.8)
UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'
SIZES = [('cerceve', 376, 643), ('tamekran', 393, 760)]
SETUP = "(()=>{const g=window.__game; g.Store.DeleteAll(); g.UI.ClearDialogs(); g.Quality.auto=false; return 'ok'})()"
def go(x, z, f=0): return f"(()=>{{const g=window.__game,G=g.Game; g.UI.ClearDialogs(); g.UI.CloseSheet(); G.player.floor={f}; G.player.go.position.set({x},g.Hotel.FloorY({f}),{z}); g.Hotel.SetView({f}); g.Cam.Snap(); return 1}})()"
GROW = "(()=>{const g=window.__game,G=g.Game; G.st.money=1e6; for(let i=0;i<5;i++) G.BuyRoom(G.NextRoom()); G.BuyFloor(); G.AddStaff('receptionist'); G.AddStaff('cleaner'); for(const t of ['turist','aile','is']) G.Spawn(t); G.st.money=2345; g.UI.ClearDialogs(); return 1})()"
SCENES = [
    ('1_baslangic', None),
    ('2_lobi', go(0, 2)),
    ('3_resepsiyon', go(0, -4.9)),
    ('4_buyumus', GROW + ';' + go(-4, 0, 1)),
    ('5_cati', go(0, 0, 3)),
    ('6_gece', "(()=>{window.__game.World.time=0.9; return 1})()" + ';' + go(0, 9.5, 0)),
    ('7_insa', "(()=>{window.__game.Game.BuildSheet('oda'); return 1})()"),
    ('8_menu', "(()=>{window.__game.UI.CloseSheet(); window.__game.Game.MenuSheet('personel'); return 1})()"),
    ('9_pencere', "(()=>{window.__game.UI.CloseSheet(); window.__game.Game.OnNewDay(); return 1})()"),
]
COLOR_JS = r'''async (b64) => { const im = new Image(); im.src = 'data:image/png;base64,' + b64; await im.decode();
  const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d'); x.drawImage(im, 0, 0);
  const y0 = Math.floor(im.height * 0.35), y1 = Math.floor(im.height * 0.75), d = x.getImageData(0, y0, im.width, y1 - y0).data;
  let sat = 0, lum = 0, n = 0; for (let i = 0; i < d.length; i += 16) { const r = d[i]/255, g = d[i+1]/255, bb = d[i+2]/255;
    const mx = Math.max(r,g,bb), mn = Math.min(r,g,bb); sat += mx ? (mx - mn) / mx : 0; lum += (mx + mn) / 2; n++; }
  return { sat: sat / n, lum: lum / n }; }'''
# Arayüz denetimi: görünür HUD kutuları birbirine biniyor mu, ekran dışına taşıyor mu, yazı kutusundan taşıyor mu
UI_JS = r'''(()=>{const bad=[]; const els=[...document.querySelectorAll('#ui .card, #ui button, #ui .pill, #ui .sheet, #ui .dialog')].filter(e=>e.offsetParent!==null && !e.closest('.sheet .body') && !e.closest('.dialog .btns'));
  const R=els.map(e=>({e,r:e.getBoundingClientRect(),n:(e.id||e.className||e.tagName)+':'+(e.textContent||'').trim().slice(0,18)}));
  const ov=e=>e.classList.contains('sheet')||e.classList.contains('dialog')||e.closest('.sheet, .dialog');
  for(let i=0;i<R.length;i++) for(let j=i+1;j<R.length;j++){const a=R[i],b=R[j]; if(a.e.contains(b.e)||b.e.contains(a.e)||ov(a.e)||ov(b.e)) continue; if(a.r.left<b.r.right-2&&b.r.left<a.r.right-2&&a.r.top<b.r.bottom-2&&b.r.top<a.r.bottom-2) bad.push('binişme: '+a.n+' / '+b.n);}
  for(const a of R){ if(a.r.left<-1||a.r.top<-1||a.r.right>innerWidth+1||a.r.bottom>innerHeight+1) bad.push('taşma: '+a.n); }
  for(const e of document.querySelectorAll('#ui .card *, #ui .sheet .body *, #ui .dialog *')){ if(e.children.length) continue; if(e.scrollWidth>e.clientWidth+2 && getComputedStyle(e).overflow!=='auto' && getComputedStyle(e).whiteSpace==='nowrap') bad.push('yazı taşıyor: '+(e.textContent||'').trim().slice(0,30)); }
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
            pg.goto('http://localhost:8835/play.html'); pg.wait_for_function('window.__ready === true', timeout=120000)
            pg.evaluate(SETUP)
            pg.add_style_tag(content='* { animation: none !important; transition: none !important; }')  # başsız tarayıcıda animasyon zamanlaması güvenilmez
            print(f'== {name} {w}x{h}: grafik', pg.evaluate('window.__game.Quality.names[window.__game.Quality.level]'))
            for (sc, js) in SCENES:
                if js: pg.evaluate(js)
                pg.wait_for_timeout(2200)
                ui = pg.evaluate(UI_JS)
                shot = pg.screenshot(path=f'{OUT}/{name}_{sc}.png')
                col = pg.evaluate(COLOR_JS, base64.b64encode(shot).decode())
                issues = []
                if ui: issues.append('; '.join(sorted(set(ui)))[:300])
                if sc in ('1_baslangic', '2_lobi', '4_buyumus') and col['sat'] < 0.07: issues.append('renkler soluk')
                if sc in ('1_baslangic', '2_lobi', '4_buyumus') and col['lum'] > 0.92: issues.append('görüntü fazla beyaz')
                print(f'  {sc}: doygunluk {col["sat"]:.2f}, parlaklık {col["lum"]:.2f}' + ('' if not issues else '  <-- ' + ' | '.join(issues)))
                problems += [f'{name}/{sc}: {i}' for i in issues]
            for e in sorted(set(errs)): print('  ' + e); problems.append(f'{name}: {e}')
            ctx.close()
        b.close()
finally:
    srv.terminate()
print('\nSORUN YOK' if not problems else f'\n{len(problems)} SORUN:\n' + '\n'.join(problems))
print('Ekran görüntüleri:', OUT)
sys.exit(1 if problems else 0)
