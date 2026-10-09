# Bulut kaydı (Lavanta Koyu): birden çok "cihaz" aynı sahte veritabanını paylaşır. Kayıp senaryoları denenir.
import glob, sys, subprocess, time, os, json
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__))
C = sorted(glob.glob('/opt/pw-browsers/chromium*/chrome-linux*/chrome'))[0]
srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8837'], cwd=HERE + '/dist', stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(0.8)
CLOUD = {}
MOCK = '''
window.claude = { use: async (n) => {
  const delay = window.__cloudDelay || 0;
  if (n === 'user') return { id: async () => 'kullanici1' };
  if (n === 'db') return { doc: (p) => ({
     get: async () => { await new Promise(r => setTimeout(r, delay)); const v = JSON.parse(await window.cloudGet(p)); return { exists: !!v, data: () => v }; },
     set: async (d) => { await window.cloudSet(p, JSON.stringify(d)); },
  }) };
  return null; } };
'''
fails = []
def check(name, ok, info=''):
    print(('TAMAM  ' if ok else 'HATA   ') + name + ('  ' + str(info) if info else ''))
    if not ok: fails.append(name)
def device(b, delay=0):
    c = b.new_context(viewport={'width': 800, 'height': 600})
    c.expose_function('cloudGet', lambda p: json.dumps(CLOUD.get(p)))
    c.expose_function('cloudSet', lambda p, d: CLOUD.__setitem__(p, json.loads(d)))
    c.add_init_script(f'window.__cloudDelay = {delay};' + MOCK)
    pg = c.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://localhost:8837/play.html'); pg.wait_for_function('window.__ready === true', timeout=120000)
    pg.evaluate('window.__noRender=1; window.__game.UI.ClearDialogs()')
    return c, pg, errs
def push(pg): pg.evaluate("(async()=>{ window.__game.Game.Save(); await window.__game.Cloud.Push(); })()"); pg.wait_for_timeout(400)
def state(pg): return pg.evaluate("(()=>{const g=window.__game, G=g.Game; return {day: g.World.day, money: Math.round(G.st.money), name: G.st.name, rooms: G.OpenRooms().length, popup: g.UI.dialogs.length ? g.UI.dialogs[0].title : null}})()")
PROGRESS = "(()=>{const g=window.__game, G=g.Game; g.UI.ClearDialogs(); G.st.money=1e6; for(let i=0;i<4;i++) G.BuyRoom(G.NextRoom()); G.st.money=777777; G.st.name='Elif Otel'; g.World.day=9; G.Save();})()"
try:
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=C, args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        cA, A, eA = device(b); A.evaluate(PROGRESS); push(A)
        doc = CLOUD.get('data/users/kullanici1/kayit2'); check('A buluta yazdı', doc is not None and 'Elif Otel' in doc['data'])
        cB, B, eB = device(b); s = state(B); check('boş cihaz buluttan yükledi', s['name'] == 'Elif Otel' and s['day'] == 9 and s['rooms'] == 5, s); cB.close()
        cC, Cp, eC = device(b)
        Cp.evaluate("(()=>{const g=window.__game; g.Store.DeleteAll(); g.Store.Set('game', Object.assign(g.Game.Default(), {name:'Boş Otel'})); g.Store.Save(); g.Game.loaded=false;})()")
        Cp.reload(); Cp.wait_for_function('window.__ready === true', timeout=120000); Cp.evaluate('window.__game.UI.ClearDialogs()')
        s = state(Cp); check('yeni başlamış cihaz buluttaki ilerlemeyi aldı', s['name'] == 'Elif Otel' and s['day'] == 9, s)
        push(Cp); check('yeni cihaz buluttaki kaydı ezmedi', 'Elif Otel' in CLOUD['data/users/kullanici1/kayit2']['data']); cC.close()
        cD, D, eD = device(b, delay=20000); s = state(D); check('geç bulut: oyun açıldı', s is not None, s)
        push(D); check('geç bulut: buluttaki kayıt ezilmedi', 'Elif Otel' in CLOUD['data/users/kullanici1/kayit2']['data'])
        D.wait_for_timeout(12000); s = D.evaluate("(()=>{const g=window.__game; return g.UI.dialogs.length ? g.UI.dialogs[0].title : null})()")
        check('geç bulut: yükleme önerildi', s == 'Bulutta daha ilerideki kaydın var', s); cD.close()
        cE, E, eE = device(b); E.evaluate("(()=>{const g=window.__game; g.World.day=15; g.Game.Save();})()"); push(E)
        A.evaluate("(()=>{const g=window.__game; g.UI.ClearDialogs(); g.Game.st.money=1; g.Game.Save();})()"); push(A)
        d = json.loads(CLOUD['data/users/kullanici1/kayit2']['data']); check('çakışma: ilerideki kayıt korundu', d['game']['day'] == 15, d['game']['day'])
        s = A.evaluate("(()=>{const g=window.__game; return g.UI.dialogs.length ? g.UI.dialogs[0].title : null})()"); check('çakışma: eski cihaza yükleme önerildi', s == 'Bulutta daha ilerideki kaydın var', s)
        cE.close(); cA.close()
        cF, F, eF = device(b); F.evaluate("(()=>{const g=window.__game; g.UI.ClearDialogs(); g.Game.st.money=4242; g.Game.Save();})()")
        F.reload(); F.wait_for_function('window.__ready === true', timeout=120000); F.evaluate('window.__game.UI.ClearDialogs()')
        s = state(F); check('yenileme sonrası kayıt duruyor', s['money'] == 4242 and s['day'] == 15, s)
        push(F); F.evaluate("localStorage.clear(); window.__game.Game.loaded=false")
        F.reload(); F.wait_for_function('window.__ready === true', timeout=120000); F.evaluate('window.__game.UI.ClearDialogs()')
        s = state(F); check('depolama silinince buluttan döndü', s['money'] == 4242 and s['day'] == 15, s)
        for e in eA + eE + eF: print('sayfa hatası:', e)
        cF.close(); b.close()
finally:
    srv.terminate()
print('\nSORUN YOK' if not fails else f'\n{len(fails)} SORUN: ' + ', '.join(fails))
sys.exit(1 if fails else 0)
