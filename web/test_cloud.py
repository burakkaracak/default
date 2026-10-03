# Bulut kaydı: iki ayrı tarayıcı (iki cihaz) aynı sahte veritabanını paylaşır
import glob, sys, subprocess, time, os, json
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__))
C = sorted(glob.glob('/opt/pw-browsers/chromium*/chrome-linux*/chrome'))[0]
srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8814'], cwd=HERE + '/dist', stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(0.8)
store = {}
MOCK = '''
window.__cloudStore = window.__cloudInit || {};
window.claude = { use: async (n) => {
  if (n === 'user') return { id: async () => 'kullanici1' };
  if (n === 'db') return { doc: (p) => ({
     get: async () => { const v = window.__cloudStore[p]; return { exists: !!v, data: () => v }; },
     set: async (d) => { window.__cloudStore[p] = JSON.parse(JSON.stringify(d)); },
  }) };
  return null; } };
'''
try:
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=C, args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        # Cihaz 1
        c1 = b.new_context(viewport={'width': 800, 'height': 600}); c1.add_init_script(MOCK)
        p1 = c1.new_page(); p1.goto('http://localhost:8814/play.html'); p1.wait_for_function('window.__ready === true', timeout=60000)
        p1.evaluate("(()=>{const g=window.__game; g.Popups.Clear(); const gm=g.GameManager.I; gm.money=777777; gm.SetHotelName('Bulut Otel'); gm.Save();})()")
        p1.wait_for_timeout(500)
        p1.evaluate("window.__cloudPush && 0")
        # Push'u doğrudan çağır (15 sn beklemeden)
        p1.evaluate("(async()=>{ const e=new Event('visibilitychange'); Object.defineProperty(document,'hidden',{value:true,configurable:true}); document.dispatchEvent(e); })()")
        p1.wait_for_timeout(1500)
        cloud = p1.evaluate('window.__cloudStore')
        print('buluttaki belgeler:', list(cloud.keys()), 'boyut:', len(json.dumps(cloud)))
        # Cihaz 2: boş localStorage, aynı bulut
        c2 = b.new_context(viewport={'width': 800, 'height': 600}); c2.add_init_script('window.__cloudInit = ' + json.dumps(cloud) + ';' + MOCK)
        p2 = c2.new_page(); p2.goto('http://localhost:8814/play.html'); p2.wait_for_function('window.__ready === true', timeout=60000)
        print('cihaz 2:', p2.evaluate("(()=>{const gm=window.__game.GameManager.I; return gm.money + ' / ' + gm.hotelName + ' / banner=' + gm.banner})()"))
        b.close()
finally:
    srv.terminate()
