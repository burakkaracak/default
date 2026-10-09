# Müzik testi: şarkı oyuna gömülü değil; Ayarlar'dan seçilen ses dosyası IndexedDB'ye yazılır, döngüyle çalar, yeniden yüklemede geri gelir.
# Test dosyası: kısa üretilmiş bir WAV. Kullanım: python3 test_music.py
import glob, sys, subprocess, time, os, struct, math
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__))
C = sorted(glob.glob('/opt/pw-browsers/chromium*/chrome-linux*/chrome'))[0]
srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8849'], cwd=HERE + '/dist', stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(0.8)
fails = []
def check(name, ok, info=''):
    print(('TAMAM  ' if ok else 'HATA   ') + name + ('  ' + str(info) if info else ''))
    if not ok: fails.append(name)
wav = '/tmp/test_sarki.wav'
R = 8000; n = R * 2
data = b''.join(struct.pack('<h', int(8000 * math.sin(2 * math.pi * 440 * i / R))) for i in range(n))
open(wav, 'wb').write(b'RIFF' + struct.pack('<I', 36 + len(data)) + b'WAVEfmt ' + struct.pack('<IHHIIHH', 16, 1, 1, R, R * 2, 2, 16) + b'data' + struct.pack('<I', len(data)) + data)
BOOT = "(()=>{const g=window.__game,G=g.Game; g.Store.DeleteAll(); g.UI.ClearDialogs(); g.Quality.auto=false; g.Quality.Set(0); G.spawnT=1e9; G.st.tutorial=99; G.st.achInit=true; window.__noWedding=1; window.__noRender=1; return 1})()"
try:
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=C, args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'])
        pg = b.new_page(viewport={'width': 393, 'height': 760}, device_scale_factor=2, is_mobile=True, has_touch=True); errs = []
        pg.on('pageerror', lambda e: errs.append('HATA ' + str(e)[:300]))
        pg.goto('http://localhost:8849/play.html'); pg.wait_for_function('window.__ready === true', timeout=120000)
        pg.evaluate(BOOT)
        pg.evaluate("window.__game.Sfx.Init()"); pg.wait_for_timeout(800)
        r = pg.evaluate("(()=>{const M=window.__Music; return {ctx:!!M.ctx, has:M.Has, src:!!M.src}})()")
        check('şarkı seçilmemişken müzik çalmıyor (eski gündüz/gece döngüleri yok)', r['ctx'] and not r['has'] and not r['src'], r)
        # Ayarlar → Şarkı seç: gerçek dosya seçici
        pg.evaluate("(()=>{const d=document.createElement('div'); d.id='tmpm'; d.style.cssText='position:fixed;top:0;left:0;z-index:99;background:#fff'; document.body.appendChild(d); window.__Music.Render(d)})()")
        has_btn = pg.evaluate("[...document.querySelectorAll('#tmpm button')].some(x=>x.textContent==='Şarkı seç')")
        check('Ayarlar müzik satırında "Şarkı seç" düğmesi var', has_btn, has_btn)
        with pg.expect_file_chooser() as fc:
            pg.evaluate("[...document.querySelectorAll('#tmpm button')].find(x=>x.textContent==='Şarkı seç').click()")
        fc.value.set_files(wav); pg.wait_for_timeout(1500)
        r = pg.evaluate("(()=>{const M=window.__Music; return {has:M.Has, name:M.name, src:!!M.src, loop:M.src&&M.src.loop, dur:+(M.buf&&M.buf.duration||0).toFixed(1)}})()")
        check('seçilen dosya çözüldü ve döngüde çalıyor', r['has'] and r['src'] and r['loop'] and r['name'] == 'test_sarki' and r['dur'] == 2.0, r)
        pg.evaluate("window.__game.Game.st.music=true; window.__Music.Frame(1)"); pg.wait_for_timeout(200)
        r = pg.evaluate("(()=>{const M=window.__Music; M.Frame(1); return +M.master.gain.value.toFixed(2)})()")
        check('ses açıkken müzik duyulur seviyede', r > 0.3, r)
        pg.evaluate("window.__game.Game.st.music=false"); r = pg.evaluate("(()=>{const M=window.__Music; for(let i=0;i<30;i++) M.Frame(1); return +M.master.gain.value.toFixed(2)})()")
        check('müzik kapalıyken susuyor', r < 0.02, r)
        pg.evaluate("window.__game.Game.st.music=true; window.__game.Game.Save()")
        pg.reload(); pg.wait_for_function('window.__ready === true', timeout=90000)
        pg.evaluate("window.__noRender=1; window.__game.Sfx.Init()"); pg.wait_for_timeout(1500)
        r = pg.evaluate("(()=>{const M=window.__Music; return {has:M.Has, src:!!M.src, name:M.name}})()")
        check('yeniden yüklemede şarkı depodan geri geldi ve çalıyor', r['has'] and r['src'], r)
        pg.evaluate("window.__Music.Remove()"); pg.wait_for_timeout(300)
        r = pg.evaluate("(()=>{const M=window.__Music; return {has:M.Has, src:!!M.src}})()")
        check('Kaldır: şarkı silindi, müzik durdu', not r['has'] and not r['src'], r)
        bad = pg.evaluate("window.__Music.SetFile(new File(['abc'],'x.mp3'))")
        check('bozuk dosya hata metni döndürüyor, oyun çökmüyor', isinstance(bad, str) and 'açılamadı' in bad, bad)
        for e in sorted(set(errs)): print('  ' + e)
        if errs: fails.append('hatalar')
        b.close()
finally:
    srv.terminate()
print('\nSORUN YOK' if not fails else f'\n{len(fails)} SORUN: ' + ', '.join(fails))
sys.exit(1 if fails else 0)
