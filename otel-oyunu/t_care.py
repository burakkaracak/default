# MG11-D3..6: kayıt sürümü/yedek rotasyonu/kurtarma ekranı, erişilebilirlik sınıfları + hareketi azalt, şehir sesleri hatasız, ayarlar/rehber
import glob
CHROME=(sorted(glob.glob('/opt/pw-browsers/chromium*/chrome-linux*/chrome'))+['chromium'])[0]
from playwright.sync_api import sync_playwright
A="""(()=>{ const out=[]; try{ state.tut=99; ADMIN.allOpen(); closeModal();
  // kayıt: sv + savedAt + yedek rotasyonu + bak2'den yükleme
  save(); const cur=JSON.parse(localStorage.getItem(SAVE_KEY)); out.push('save sv:'+cur.sv+' savedAt:'+(cur.savedAt>0));
  localStorage.setItem(SAVE_KEY+'_bak',JSON.stringify(Object.assign({},cur,{day:7}))); rotateBackup(); localStorage.setItem(SAVE_KEY+'_bak',JSON.stringify(Object.assign({},cur,{day:8})));
  out.push('rotated: bak day '+JSON.parse(localStorage.getItem(SAVE_KEY+'_bak')).day+' bak2 day '+JSON.parse(localStorage.getItem(SAVE_KEY+'_bak2')).day);
  localStorage.setItem(SAVE_KEY,'{bozuk'); localStorage.setItem(SAVE_KEY+'_bak','x'); const L=loadState(); out.push('loadState from bak2: '+(L&&L.day===7)); save();
  out.push('slotInfo:'+JSON.stringify(slotInfo(SAVE_KEY+'_bak2')).slice(0,80));
  lastUserT=performance.now(); openRecovery(); out.push('recovery modal:'+/Kayıt kurtarma/.test(modal.innerHTML)+' restore buttons:'+modal.querySelectorAll('[data-rc]').length); closeModal();
  // göç
  state.sv=0; state.a11y=null; runMigrations(); out.push('migr: a11y '+JSON.stringify(state.a11y)+' sv '+state.sv);
  // erişilebilirlik
  a11y().big=true; a11y().motion=true; applyA11y(); out.push('classes: big '+document.body.classList.contains('a11y-big')+' motion '+document.body.classList.contains('a11y-motion')+' hc '+document.body.classList.contains('a11y-hc'));
  shake=0; camShake(0.5); out.push('camShake blocked:'+(shake===0)); a11y().motion=false; applyA11y(); camShake(0.5); out.push('camShake works:'+(shake>0)); shake=0;
  lastUserT=performance.now(); openSettings(); out.push('settings a11y buttons:'+modal.querySelectorAll('[data-a11y]').length+' recover btn:'+!!modal.querySelector('#sRecover')); lastUserT=performance.now(); modal.querySelector('[data-a11y="hc"]').click(); out.push('hc toggled:'+document.body.classList.contains('a11y-hc')); closeModal();
  // sesler: ctx yokken hatasız, CITY_SND tüm şehirler
  let ok=true; try{ updateCare(1); ambOne('gull'); ambOne('wave'); pinkBurst(0.1,0.01,300,0); }catch(e){ ok=false; out.push('snd err '+e); } out.push('sound no-throw:'+ok+' cities:'+CITIES.every(c=>CITY_SND[c.name]));
  out.push('guide:'+/Erişilebilirlik/.test(JSON.stringify(GUIDE))+/Kayıt güvenliği/.test(JSON.stringify(GUIDE))+/Şehir sesleri/.test(JSON.stringify(GUIDE)));
  a11y().big=false; a11y().hc=false; applyA11y(); save(); }catch(e){ out.push('EXC '+e.stack); } return out.join('\\n'); })()"""
with sync_playwright() as p:
    b=p.chromium.launch(executable_path=CHROME); pg=b.new_page(); errs=[]
    pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.goto('file:///home/user/default/otel-oyunu/test2.html'); pg.wait_for_timeout(1000)
    print(pg.evaluate(A)); pg.reload(); pg.wait_for_timeout(1200)
    print('reload:',pg.evaluate("(()=>({sv:state.sv,a11y:JSON.stringify(state.a11y),motionClass:document.body.classList.contains('a11y-motion')}))()"))
    print('ERRORS:',errs[:5]); b.close()
