# MG11-D1 zorluk eğrisi: kriz sıklığı/çifte kriz (5★), rakip reklam kampanyası + karşı kampanya, düşük moralde istifa + geri kazanma,
# sabah brifingi öğeleri, bot davranışı
import glob
CHROME=(sorted(glob.glob('/opt/pw-browsers/chromium*/chrome-linux*/chrome'))+['chromium'])[0]
from playwright.sync_api import sync_playwright
A="""(()=>{ const out=[]; try{ state.tut=99; spawnT=1e9; ADMIN.allOpen(); state.money=5e6; closeModal(); const r0=Math.random;
  out.push('2★: on '+curveOn()+' gap '+crisisGapDays()+' chance '+crisisChance());
  Object.keys(state.rooms).slice(0,8).forEach(k=>{ const R=RT(+k); if(R.guest){ standUp(R.guest); checkout(R.guest); } upgradeRoomMax(+k); }); state.rep=90;
  out.push('5★: stars '+stars()+' on '+curveOn()+' gap '+crisisGapDays()+' chance '+crisisChance());
  // çifte kriz
  Math.random=()=>0.01; state.crisisDue2=null; planSecondCrisis('power'); out.push('second crisis:'+state.crisisDue2);
  const setH=h=>{ for(let t=0;t<1;t+=0.0005){ const x=hourOf(t)%24; if(x>=h&&x<h+0.5){ state.t=t; return; } } }; setH(12); state.crisis=null; state.crisisDue=null; curveT=0; updateCurve(1); out.push('moved to due:'+state.crisisDue+' due2:'+state.crisisDue2); state.crisisDue=null;
  Math.random=r0;
  // reklam kampanyası
  state.rival={name:'Test Otel',q:70,price:1,promo:0,bought:false}; state.rivalAd=null; const p0=rivalPull(), d0=worldDemand();
  state.rivalAd={from:state.day,to:state.day+2,countered:false}; out.push('adOn:'+rivalAdOn()+' pull +'+(rivalPull()-p0).toFixed(2)+' demand x'+(worldDemand()/d0).toFixed(2));
  out.push('brief ad html:'+/Karşı kampanya/.test(briefItemHtml({k:'ad'}))+' otel html:'+/reklamda/.test(curveHtml()));
  const m0=state.money; out.push('counter:'+counterAd()+' cost '+(m0-state.money)+' adOn after:'+rivalAdOn()+' pull back:'+(Math.abs(rivalPull()-p0)<1e-9));
  // gün sonu: kampanya planlama (%25 → random 0.01)
  state.rivalAd=null; state.morning=null; Math.random=()=>0.01; curveDayEnd({}); Math.random=r0; out.push('dayEnd ad:'+!!state.rivalAd+' morning:'+morningQ().map(x=>x.k).join(','));
  // istifa
  while(staffEnts.filter(e=>e.kind!=='rec').length<3){ state.staff.clean.n++; spawnStaff('clean',true); } const n0=staffEnts.length; state.morale=20; state.lowMoraleDays=1; state.morning=null; state.rivalAd={from:1,to:1,countered:true};
  Math.random=()=>0.01; curveDayEnd({}); Math.random=r0; const it=morningQ().find(x=>x.k==='resign'); out.push('resigned:'+(staffEnts.length===n0-1)+' item:'+JSON.stringify(it)+' html:'+/Geri kazan/.test(briefItemHtml(it)));
  const m1=state.money; out.push('rehire:'+rehireResigned(it)+' cost '+(m1-state.money)+' staff back:'+(staffEnts.length===n0)+' morale '+morale());
  // 4★ altı kapalı
  state.rep=30; out.push('low stars: on '+curveOn()+' gap '+crisisGapDays()); state.rep=90;
  save(); }catch(e){ out.push('EXC '+e.stack); } return out.join('\\n'); })()"""
with sync_playwright() as p:
    b=p.chromium.launch(executable_path=CHROME); pg=b.new_page(); errs=[]
    pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.goto('file:///home/user/default/otel-oyunu/test2.html'); pg.wait_for_timeout(1000)
    print(pg.evaluate(A)); pg.reload(); pg.wait_for_timeout(1200)
    print('reload:',pg.evaluate("(()=>({ad:!!state.rivalAd,low:state.lowMoraleDays,curve:typeof curveOn}))()"))
    print('ERRORS:',errs[:5]); b.close()
