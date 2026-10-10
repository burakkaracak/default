# iPhone testi (Lavanta Koyu): iPhone 14 Pro boyutunda (dokunmatik, 3x) açar; hata, binen arayüz kutuları, taşan yazı ve soluk renk denetler.
# Kullanım: python3 test_iphone.py [çıktı_klasörü] [--cihaz mac|iphone15|iphone14|hepsi]  (varsayılan: iphone14)
import glob, sys, subprocess, time, os, base64
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__))
C = sorted(glob.glob('/opt/pw-browsers/chromium*/chrome-linux*/chrome'))[0]
ARGS = [a for a in sys.argv[1:] if not a.startswith('--')]
CIHAZ = sys.argv[sys.argv.index('--cihaz') + 1] if '--cihaz' in sys.argv else 'iphone14'
if CIHAZ in ARGS: ARGS.remove(CIHAZ)
OUT = ARGS[0] if ARGS else HERE + '/iphone_shots'
os.makedirs(OUT, exist_ok=True)
srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8835'], cwd=HERE + '/dist', stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(0.8)
def iua(v): return f'Mozilla/5.0 (iPhone; CPU iPhone OS {v}_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/{v}.0 Mobile/15E148 Safari/604.1'
MAC_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
# Her profil: (ad, genişlik, yükseklik, piksel yoğunluğu, dokunmatik, tarayıcı kimliği)
# MacBook Air 13,6" M2: 2560x1664 ekran, varsayılan ölçek 1470x956 @2; Chrome tam ekranda araç çubuğu yok.
# iPhone 14 Pro / 15 Pro: ikisi de 393x852 @3 (aynı mantıksal ölçü). Safari dikey: alt çubuklu 393x659, çubuklar kapalı 393x760; yatay ~852x330.
PROFILES = {
    'mac': [('mac_tamekran', 1470, 956, 2, False, MAC_UA), ('mac_pencere', 1470, 830, 2, False, MAC_UA)],
    'iphone15': [('i15_dikey', 393, 659, 3, True, iua(18)), ('i15_dikey_tam', 393, 760, 3, True, iua(18)), ('i15_yatay', 852, 330, 3, True, iua(18))],
    'iphone14': [('i14_dikey', 393, 659, 3, True, iua(17)), ('i14_dikey_tam', 393, 760, 3, True, iua(17)), ('i14_yatay', 852, 330, 3, True, iua(17))],
}
PROFILES['yatay'] = [p for p in PROFILES['iphone14'] if 'yatay' in p[0]]
PROFILES['hepsi'] = PROFILES['mac'] + PROFILES['iphone15'] + PROFILES['iphone14']
SIZES = PROFILES[CIHAZ]
STATS_JS = "(()=>{const g=window.__game,r=g.renderer,i=r.info,pr=r.getPixelRatio(); return {kalite:g.Quality.names[g.Quality.level],oran:+pr.toFixed(2),piksel:Math.round(innerWidth*pr*innerHeight*pr/1e5)/10,cagri:i.render.calls,ucgen:Math.round(i.render.triangles/1000),geo:i.memory.geometries,doku:i.memory.textures,js:performance.memory?Math.round(performance.memory.usedJSHeapSize/1048576):-1}})()" 
SETUP = "(()=>{const g=window.__game; g.Store.DeleteAll(); g.UI.ClearDialogs(); g.Quality.auto=false; window.__noWedding=1; return 'ok'})()"
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
    ('10_dekor', "(()=>{const g=window.__game; g.UI.ClearDialogs(); g.Decor.Enter('oda11'); return 1})()"),
    ('11_dekor_secim', "(()=>{const g=window.__game; g.Decor.Buy('loungeChair'); return 1})()"),
    ('12_lobi_dekor', "(()=>{const g=window.__game; g.Decor.Exit(); g.Decor.Enter('lobi'); return 1})()"),
    ('13_personel', "(()=>{const g=window.__game; g.Decor.Exit(); g.Game.MenuSheet('personel'); return 1})()"),
    ('14_sohbet', "(()=>{const g=window.__game,G=g.Game; g.UI.CloseSheet(); g.UI.ClearDialogs(); const r=g.Hotel.Room(11); const x=G.Spawn('turist'); x.path=[]; x.room=r; r.guest=x; r.state='occupied'; x.floor=1; x.pos.set(r.inside.x, g.Hotel.FloorY(1), r.inside.z); x.EnterRoom(); g.Chat.StartGuest(x); g.Chat.Say(true,'Evet, her köşesiyle biz ilgileniyoruz. Hoş geldiniz!'); g.Chat.Say(false,'Ne güzel, insan bunu hissediyor. Teşekkürler!'); g.Chat.Render(); return 1})()"),
    ('15_sohbet_yazma', "(()=>{const g=window.__game; g.Social.sample={json:async()=>({reply:'x',mood:1})}; g.Chat.Render(); return 1})()"),
    ('16_otelgram', "(()=>{const g=window.__game,G=g.Game; g.Chat.Close(); g.Social.sample=null; g.Social.Add('@ayse_gezgin','Oda 102 manzarası ve dekorasyonu çok şık. 10/10',33,false,0); g.Social.Add('@kotu.yorum','Oda biraz tozluydu, beklentimin altında kaldı.',20,true,0); g.UI.ClearDialogs(); g.Social.Open('akis'); return 1})()"),
    ('18_basarim', "(()=>{const g=window.__game; g.UI.CloseSheet(); g.UI.ClearDialogs(); g.Game.MenuSheet('basarim'); return 1})()"),
    ('19_album', "(()=>{const g=window.__game; g.Album=window.__Album; const cv=document.createElement('canvas'); cv.width=800; cv.height=450; const x=cv.getContext('2d'); x.fillStyle='#9ad0f3'; x.fillRect(0,0,800,450); x.fillStyle='#f6e6c6'; x.fillRect(0,300,800,150); window.__Album.Add(cv); window.__Album.Memory('⭐','2 yıldızlı otel oldun'); g.Game.MenuSheet('album'); return 1})()"),
    ('20_zincir', "(()=>{const g=window.__game; g.Game.st.stars=4; g.Game.st.money=500000; g.Game.st.dayLog=[8000]; window.__Chain.Open(window.__Chain.Cities[0]); g.UI.ClearDialogs(); g.Game.MenuSheet('zincir'); return 1})()"),
    ('21_dugun_teklif', "(()=>{const g=window.__game; g.UI.CloseSheet(); window.__Wedding.Offer(); return 1})()"),
    ('22_dugun_sahne', "(()=>{const g=window.__game,G=g.Game,W=window.__Wedding; g.UI.ClearDialogs(); G.st.wedding={day:g.World.day,theme:1,couple:['Selin','Can'],deposit:500,attended:false,done:false}; g.World.time=0.56; G.player.floor=0; G.player.go.position.set(-6,0,12); g.Hotel.SetView(0); g.Cam.follow=G.player.go; g.Cam.Snap(); return 1})()"),
    ('17_mektup', "(()=>{const g=window.__game,G=g.Game; g.Social.AddLetter({type:g.Data.Guests.find(q=>q.id==='balayi'),name:'Ece'}, null, 4.8); g.UI.ClearDialogs(); g.Social.Open('mektup'); return 1})()"),
    ('23_kiyafet', "(()=>{const g=window.__game; g.UI.ClearDialogs(); g.UI.CloseSheet(); g.Game.MenuSheet('ayar'); const b=document.querySelector('.sheet .body'); b.scrollTop=b.scrollHeight; return 1})()"),
    ('24_tablolar', "(()=>{const g=window.__game; g.UI.CloseSheet(); const c=document.createElement('canvas'); c.width=640; c.height=480; const x=c.getContext('2d'); x.fillStyle='#e8a0c0'; x.fillRect(0,0,640,480); window.__Gallery.Save([c.toDataURL('image/jpeg',0.8)]); window.__Gallery.Init(); g.Game.MenuSheet('album'); return 1})()"),
    ('25_ozel_gun', "(()=>{const g=window.__game; g.UI.CloseSheet(); g.UI.ClearDialogs(); window.__Gallery.Clear(); window.__today='2026-10-29'; window.__Special.t=0; window.__Special.Tick(0.1); g.Game.player.floor=0; g.Hotel.SetView(0); g.Game.player.go.position.set(0,0,2); g.Cam.follow=g.Game.player.go; g.Cam.Snap(); return 1})()"),
    ('26_kedi', "(()=>{const g=window.__game; g.UI.ClearDialogs(); window.__today=null; const c=window.__Pets.cat; c.go.position.set(-3,0,3); c.target=c.go.position.clone(); c.state='idle'; c.t=99; g.Game.player.go.position.set(-1,0,3.5); g.Cam.distGoal=9; g.Cam.Snap(); return 1})()"),
    ('27_ipucu', "(()=>{const g=window.__game; window.__Hints.last=-999; g.Game.st.hints={}; g.Game.st.tutorial=99; g.Game.st.served=5; window.__Hints.t=0; window.__Hints.Tick(0.1); return 1})()"),
]
COLOR_JS = r'''async (b64) => { const im = new Image(); im.src = 'data:image/png;base64,' + b64; await im.decode();
  const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d'); x.drawImage(im, 0, 0);
  const y0 = Math.floor(im.height * 0.35), y1 = Math.floor(im.height * 0.75), d = x.getImageData(0, y0, im.width, y1 - y0).data;
  let sat = 0, lum = 0, n = 0; for (let i = 0; i < d.length; i += 16) { const r = d[i]/255, g = d[i+1]/255, bb = d[i+2]/255;
    const mx = Math.max(r,g,bb), mn = Math.min(r,g,bb); sat += mx ? (mx - mn) / mx : 0; lum += (mx + mn) / 2; n++; }
  return { sat: sat / n, lum: lum / n }; }'''
# Arayüz denetimi: görünür HUD kutuları birbirine biniyor mu, ekran dışına taşıyor mu, yazı kutusundan taşıyor mu
UI_JS = r'''(()=>{const bad=[]; const els=[...document.querySelectorAll('#ui .card, #ui button, #ui .pill, #ui .sheet, #ui .dialog, #ui .chat')].filter(e=>e.offsetParent!==null && !e.closest('.sheet .body') && !e.closest('.dialog .btns') && !e.closest('.chat .msgs'));
  const R=els.map(e=>({e,r:e.getBoundingClientRect(),n:(e.id||e.className||e.tagName)+':'+(e.textContent||'').trim().slice(0,18)}));
  const ov=e=>e.classList.contains('sheet')||e.classList.contains('dialog')||e.classList.contains('chat')||e.closest('.sheet, .dialog, .chat');
  for(let i=0;i<R.length;i++) for(let j=i+1;j<R.length;j++){const a=R[i],b=R[j]; if(a.e.contains(b.e)||b.e.contains(a.e)||ov(a.e)||ov(b.e)) continue; if(a.r.left<b.r.right-2&&b.r.left<a.r.right-2&&a.r.top<b.r.bottom-2&&b.r.top<a.r.bottom-2) bad.push('binişme: '+a.n+' / '+b.n);}
  for(const a of R){ if(a.r.left<-1||a.r.top<-1||a.r.right>innerWidth+1||a.r.bottom>innerHeight+1) bad.push('taşma: '+a.n); }
  for(const e of document.querySelectorAll('#ui .card *, #ui .sheet .body *, #ui .dialog *')){ if(e.children.length) continue; if(e.scrollWidth>e.clientWidth+2 && getComputedStyle(e).overflow!=='auto' && getComputedStyle(e).whiteSpace==='nowrap') bad.push('yazı taşıyor: '+(e.textContent||'').trim().slice(0,30)); }
  return bad;})()'''
problems = []
try:
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=C, args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        for (name, w, h, dpr, touch, UA) in SIZES:
            ctx = b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=dpr, is_mobile=touch, has_touch=touch, user_agent=UA)
            pg = ctx.new_page(); errs = []
            pg.on('pageerror', lambda e: errs.append('HATA ' + str(e)[:300]))
            pg.on('console', lambda m: m.type == 'error' and 'Failed to load resource' not in m.text and errs.append('KONSOL ' + m.text[:300]))
            pg.goto('http://localhost:8835/play.html'); pg.wait_for_function('window.__ready === true', timeout=120000)
            real = pg.evaluate("(()=>{const q=window.__game.Quality,l=q.level,pr=q.PixelRatio(); return {kalite:q.names[l],oran:+pr.toFixed(2),mpx:Math.round(innerWidth*pr*innerHeight*pr/1e5)/10}})()")
            pg.evaluate(SETUP)
            pg.evaluate("(()=>{const q=window.__game.Quality; q.Set(0)})()")  # başsız yazılım çizimi Yüksek/Orta'da çok yavaş; düzen denetimi Düşük'te yapılır
            pg.add_style_tag(content='* { animation: none !important; transition: none !important; }')  # başsız tarayıcıda animasyon zamanlaması güvenilmez
            print(f'== {name} {w}x{h} @{dpr}x: gerçek cihazda grafik {real["kalite"]}, piksel oranı {real["oran"]}, çizilen {real["mpx"]} Mpx')
            for (sc, js) in SCENES:
                if js: pg.evaluate(js)
                pg.wait_for_timeout(2200)
                ui = pg.evaluate(UI_JS); st = pg.evaluate(STATS_JS)
                shot = pg.screenshot(path=f'{OUT}/{name}_{sc}.png')
                col = pg.evaluate(COLOR_JS, base64.b64encode(shot).decode())
                issues = []
                if ui: issues.append('; '.join(sorted(set(ui)))[:300])
                if sc in ('1_baslangic', '2_lobi', '4_buyumus') and col['sat'] < 0.07: issues.append('renkler soluk')
                if sc in ('1_baslangic', '2_lobi', '4_buyumus') and col['lum'] > 0.92: issues.append('görüntü fazla beyaz')
                print(f'  {sc}: doygunluk {col["sat"]:.2f}, parlaklık {col["lum"]:.2f}' + f' | {st["kalite"]} x{st["oran"]} {st["piksel"]}Mpx çağrı {st["cagri"]} üçgen {st["ucgen"]}b geo {st["geo"]} doku {st["doku"]} js {st["js"]}MB' + ('' if not issues else '  <-- ' + ' | '.join(issues)))
                problems += [f'{name}/{sc}: {i}' for i in issues]
            for e in sorted(set(errs)): print('  ' + e); problems.append(f'{name}: {e}')
            ctx.close()
        b.close()
finally:
    srv.terminate()
print('\nSORUN YOK' if not problems else f'\n{len(problems)} SORUN:\n' + '\n'.join(problems))
print('Ekran görüntüleri:', OUT)
sys.exit(1 if problems else 0)
