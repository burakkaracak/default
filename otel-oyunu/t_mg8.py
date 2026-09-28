# MG8 kontrolü: prestij projeleri + vakıf, dış görünüm, bayram sırası, yağmur halkası başlangıcı, gece iç mekân
import glob
CHROME=(sorted(glob.glob('/opt/pw-browsers/chromium*/chrome-linux*/chrome'))+['chromium'])[0]
from playwright.sync_api import sync_playwright
A="""(()=>{ state.tut=99; spawnT=1e9; ADMIN.allOpen(); state.money=5e6; const out=[]; const st0=stars;
  stars=()=>4; out.push('locked:'+!prjOpen()+' lockUI:'+/🔒 5★/.test(prjHtml())); buyPrj('park',true); out.push('no buy<5:'+prjLv('park'));
  stars=()=>5; const d0=worldDemand(); ['park','muze','anit'].forEach(k=>buyPrj(k,true)); buyPrj('muze',true);
  out.push('lv:'+prjLv('park')+prjLv('muze')+prjLv('anit')+' demand '+d0.toFixed(2)+'->'+worldDemand().toFixed(2)+' sat+'+prjSat()+' prjG:'+!!prjG+' kids:'+(prjG?prjG.children.length:0));
  const r0=state.rep, t={amen:0}; state.rep=50; prjDayEnd(t); out.push('muze inc:'+t.amen+' rep+'+(state.rep-50).toFixed(1));
  const m0=state.money, c0=charityCost(); donate(); donate(); donate(); out.push('charity n:'+charityN()+' title:'+charityTitle()+' paid:'+(m0-state.money)+' next:'+charityCost()+' c0:'+c0);
  mgmtTab='hotel'; hotelSub='gen'; openSheet('mgmt'); out.push('ui:'+/Prestij projeleri/.test(sheet.innerHTML)+/Hayır vakfı/.test(sheet.innerHTML)); closeSheet();
  // dış görünüm
  const d=cam.dist; toggleExtView(); out.push('ext:'+!!extView+' peek:'+peekFloor+' dist:'+cam.dist); updateExtView(); out.push('kept:'+!!extView); player.moving=true; updateExtView(); player.moving=false; out.push('exit on move:'+!extView+' dist back:'+(cam.dist===d)+' peek:'+peekFloor);
  // takvim
  out.push('cal:'+[14,15,21,22,24,25,8].map(d=>d+'='+calPhase(d)).join(','));
  // yağmur halkaları başlangıçta dışarıda mı
  let inside=0; splashes.forEach(r=>{ const x=r.position.x, z=r.position.z; if(x>-8&&x<8&&z<8) inside++; }); out.push('splash inside:'+inside+'/'+splashes.length);
  // gece iç mekân: tek sahip p26 (updateNightInterior kaldırıldı)
  out.push('nightInterior removed:'+(typeof updateNightInterior==='undefined'));
  // kayıt/yükleme
  save(); return out.join('\\n'); })()"""
with sync_playwright() as p:
    b=p.chromium.launch(executable_path=CHROME); pg=b.new_page(); errs=[]
    pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.goto('file:///home/user/default/otel-oyunu/test2.html'); pg.wait_for_timeout(1000)
    print(pg.evaluate(A)); pg.reload(); pg.wait_for_timeout(1000)
    print('reload prj:',pg.evaluate("JSON.stringify(state.prj)+' charity '+state.charity+' prjG '+!!prjG"))
    print('ERRORS:',errs[:5]); b.close()
