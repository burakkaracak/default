# Bulut kaydı: birden çok "cihaz" (ayrı tarayıcı) aynı sahte veritabanını paylaşır.
# Kayıp senaryolarını dener: boş cihaz, sıfırdan başlamış cihaz, geç gelen bulut, iki cihaz çakışması, otel değiştirme.
import glob, sys, subprocess, time, os, json
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__))
C = sorted(glob.glob('/opt/pw-browsers/chromium*/chrome-linux*/chrome'))[0]
srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8814'], cwd=HERE + '/dist', stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(0.8)
# Ortak bulut: sayfalar arasında Python üzerinden paylaşılır (expose_function)
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
    pg.goto('http://localhost:8814/play.html'); pg.wait_for_function('window.__ready === true', timeout=90000)
    return c, pg, errs

def push(pg):
    pg.evaluate("(async()=>{ window.__game.GameManager.I.Save(); window.__game.Store.Save(); await window.__cloud.Push(); })()")
    pg.wait_for_timeout(400)

def state(pg):
    return pg.evaluate("(()=>{const gm=window.__game.GameManager.I; return {day: gm.dayNight.day, money: gm.money, name: gm.hotelName, popup: window.__game.Popups.Current ? window.__game.Popups.Current.title : null}})()")

PROGRESS = "(()=>{const g=window.__game, gm=g.GameManager.I; g.Popups.Clear(); gm.money=777777; gm.SetHotelName('Elif Otel'); gm.dayNight.day=9; for(let i=0;i<5;i++) gm.UnlockRoom(gm.NextLockedRoom()); gm.Save(); g.Store.Save();})()"
try:
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=C, args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        # 1) Cihaz A ilerler ve buluta yazar
        cA, A, eA = device(b)
        A.evaluate(PROGRESS); push(A)
        doc = CLOUD.get('data/users/kullanici1/kayit')
        check('A buluta yazdı', doc is not None and 'Elif Otel' in doc['data'])

        # 2) Boş cihaz B: buluttan yüklemeli
        cB, B, eB = device(b)
        s = state(B); check('boş cihaz buluttan yükledi', s['name'] == 'Elif Otel' and s['day'] == 9, s)
        cB.close()

        # 3) Sıfırdan başlamış cihaz C (kendi boş oyunu daha YENİ zamanlı): buluttaki ilerlemiş kayıt kazanmalı
        cC, Cp, eC = device(b)
        Cp.evaluate("(()=>{const g=window.__game; g.Store.DeleteAll(); g.Store.SetString('o4_hotel','Boş Otel'); g.Store.SetInt('o4_day',1); g.Store.Save(); g.Chain.switching=true;})()")
        Cp.reload(); Cp.wait_for_function('window.__ready === true', timeout=90000)
        s = state(Cp); check('yeni başlamış cihaz buluttaki ilerlemeyi aldı', s['name'] == 'Elif Otel' and s['day'] == 9, s)
        push(Cp)
        check('yeni cihaz buluttaki kaydı ezmedi', 'Elif Otel' in CLOUD['data/users/kullanici1/kayit']['data'])
        cC.close()

        # 4) Bulut geç cevap veriyor (20 sn): oyun boş açılır ama buluttakini ezmemeli, yüklemeyi önermeli
        cD, D, eD = device(b, delay=20000)
        s = state(D); check('geç bulut: oyun açıldı', s is not None, s)
        push(D)
        check('geç bulut: buluttaki kayıt ezilmedi', 'Elif Otel' in CLOUD['data/users/kullanici1/kayit']['data'])
        D.wait_for_timeout(12000)
        s = state(D); check('geç bulut: yükleme önerildi', s['popup'] == 'Bulutta daha ilerideki kaydın var', s)
        cD.close()

        # 5) Çakışma: A eski bazdan yazmaya çalışırken E daha ileri gitmiş
        cE, E, eE = device(b)
        E.evaluate("(()=>{const g=window.__game, gm=g.GameManager.I; g.Popups.Clear(); gm.dayNight.day=15; gm.Save(); g.Store.Save();})()"); push(E)
        A.evaluate("(()=>{const g=window.__game, gm=g.GameManager.I; g.Popups.Clear(); gm.money=1; gm.Save(); g.Store.Save();})()"); push(A)
        d = json.loads(CLOUD['data/users/kullanici1/kayit']['data'])
        check('çakışma: ilerideki kayıt korundu', d.get('o4_day') == '15', d.get('o4_day'))
        s = state(A); check('çakışma: eski cihaza yükleme önerildi', s['popup'] == 'Bulutta daha ilerideki kaydın var', s)
        cE.close(); cA.close()

        # 6) Yenileme: aynı cihazda sayfa yenilenince kayıt kalmalı
        cF, F, eF = device(b)
        F.evaluate("(()=>{const g=window.__game, gm=g.GameManager.I; g.Popups.Clear(); gm.money=4242; gm.Save(); g.Store.Save();})()")
        F.reload(); F.wait_for_function('window.__ready === true', timeout=90000)
        s = state(F); check('yenileme sonrası kayıt duruyor', s['money'] == 4242 and s['day'] == 15, s)
        # 7) Depolama silinmiş gibi (localStorage temiz): buluttan dönmeli
        push(F)
        F.evaluate("localStorage.clear()"); F.evaluate("window.__game.Chain.switching=true")
        F.reload(); F.wait_for_function('window.__ready === true', timeout=90000)
        s = state(F); check('depolama silinince buluttan döndü', s['money'] == 4242 and s['day'] == 15, s)
        for e in eA + eE + eF: print('sayfa hatası:', e)
        cF.close(); b.close()
finally:
    srv.terminate()
print('\nSORUN YOK' if not fails else f'\n{len(fails)} SORUN: ' + ', '.join(fails))
sys.exit(1 if fails else 0)
