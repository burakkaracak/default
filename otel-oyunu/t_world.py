import glob
CHROME=(sorted(glob.glob('/opt/pw-browsers/chromium*/chrome-linux*/chrome'))+['chromium'])[0]
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(executable_path=CHROME); pg=b.new_page(); errs=[]
    pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.goto('file:///home/user/default/otel-oyunu/test2.html'); pg.wait_for_timeout(1000)
    print(pg.evaluate("""(()=>{ state.tut=99; spawnT=1e9; ADMIN.allOpen(); state.money=1e6; const out=[];
      state.day=9; out.push('bayram:'+calPhase()+' dem:'+worldDemand().toFixed(2)+' famW:'+worldTypeW('family'));
      state.day=16; const setH=h=>{ for(let t=0;t<1;t+=0.002){ if(hourOf(t)%24>=h){ state.t=t; return; } } }; setH(19.3); out.push('ramazan:'+calPhase()+' iftar:'+iftarOn()+' restBonus:'+worldAmenBonus('rest')); updateCalendar();
      state.news={k:'fuar',day:state.day}; out.push('news:'+newsToday().n+' bizW:'+worldTypeW('business').toFixed(1));
      state.rival={name:'X',q:90,price:1,promo:state.day,bought:false}; buildRival(); out.push('rivalFloors:'+rivalFloors()+' nf:'+rivalVis.userData.nf);
      const pull0=rivalPull(); state.priceWar=state.day; out.push('pull '+pull0.toFixed(2)+'->'+rivalPull().toFixed(2)+' priceMul:'+priceMult().toFixed(2)); state.priceWar=0;
      buyShop('simit'); buyShop('taksi'); buyShop('hediye'); out.push('shops:'+Object.keys(state.shops)+' shopG:'+(shopG?shopG.children.length:0)+' patMul:'+shopPatMul());
      const t={amen:0}; const m0=state.money; shopsDayEnd(t); out.push('shop income:'+(state.money-m0));
      const bad=[]; ['L','R'].forEach(s=>{ const sp=s==='L'?L.spawnL:L.spawnR; if(!findPath(0,sp.x,sp.z,0,5)) bad.push(s); }); out.push('paths bad:'+bad);
      mgmtTab='hotel'; hotelSub='city'; openSheet('mgmt'); out.push('ui:'+/Şehir takvimi/.test(sheet.innerHTML)+/Esnaf/.test(sheet.innerHTML));
      return out.join('\\n'); })()"""))
    print('errs',errs[:3]); b.close()
