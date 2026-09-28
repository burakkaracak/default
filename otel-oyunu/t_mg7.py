# MG7 kontrolü: aşçı, grev (kalan süre + eski kayıt), rehber, açılır bölümler, yatırım uyarısı, 3★ kilidi,
# köşe geliri, şehir silüeti, takvim şeridi, hafıza halkası, çatı gece barı + ampuller
import glob
CHROME=(sorted(glob.glob('/opt/pw-browsers/chromium*/chrome-linux*/chrome'))+['chromium'])[0]
from playwright.sync_api import sync_playwright
SETH="const setH=h=>{ for(let t=0;t<1;t+=0.002){ if(hourOf(t)%24>=h){ state.t=t; return; } } };"
A="""(()=>{ state.tut=99; spawnT=1e9; ADMIN.allOpen(); state.money=1e6; const out=[]; SETH setH(12);
  const ct0=cookTime(); hireStaff('cook'); const ck=staffEnts.find(e=>e.kind==='cook'); window.__ck=ck;
  out.push('cook hired:'+!!ck+' cookTime '+ct0.toFixed(1)+'->'+cookTime().toFixed(1)+' reach:'+!!findPath(0,0,5,L.cookSpot.x,L.cookSpot.z));
  return out.join('\\n'); })()""".replace('SETH',SETH)
B="""(()=>{ const out=[]; SETH setH(12); const r0=Math.random;
  stars=()=>5; state.morale=10; Math.random=()=>0.1; moraleDay(); Math.random=r0; closeModal();
  out.push('strike:'+strikeOn()+' left:'+state.strike); updateOps2(30); out.push('after30:'+state.strike); updateOps2(31); out.push('after61:'+strikeOn());
  stars=()=>2; state.book={}; planBookings(); out.push('book<3:'+JSON.stringify(state.book)+' lock:'+/3★'da açılır/.test(bookingHtml()));
  state.morale=10; Math.random=()=>0.1; moraleDay(); Math.random=r0; out.push('strike<3:'+strikeOn());
  stars=()=>5; planBookings(); out.push('book 5:'+!!state.book[state.day+2]);
  out.push('guide secs:'+GUIDE.length+' items:'+GUIDE.reduce((a,x)=>a+x[1].length,0)); openGuide(); out.push('guide ok:'+/Rezervasyon ve overbooking/.test(modal.innerHTML)+/Mescit/.test(modal.innerHTML)); closeModal();
  mgmtTab='hotel'; hotelSub='eco'; openSheet('mgmt'); const ds=sheet.querySelectorAll('details.fold'); out.push('eco folds:'+ds.length+' open:'+[...ds].filter(d=>d.open).length+' nested:'+sheet.querySelectorAll('details details').length);
  hotelSub='city'; sheet._h=null; renderSheet(); out.push('city folds:'+sheet.querySelectorAll('details.fold').length+' shopBtnInFold:'+!!sheet.querySelector('details [data-shop]'));
  const k=Object.keys(INV)[0]; state.money=invCost(k)+10; hotelSub='eco'; sheet._h=null; renderSheet(); out.push('inv warn:'+/Alırsan kalan/.test(sheet.innerHTML));
  buyInv(k); out.push('inv modal:'+/Maaşlar tehlikede/.test(modal.innerHTML)+' lv:'+invLv(k)); modal.querySelector('#ivY').click(); out.push('after yes lv:'+invLv(k)); closeSheet();
  state.money=1e6;
  const t={amen:0}; out.push('nooks:'+nookCount()+' inc:'+nookIncome()); nooksDayEnd(t); out.push('nook amen:'+t.amen);
  buildCityCrown(); out.push('crown:'+!!crownG+' kids:'+(crownG?crownG.children.length:0)+' floor:'+Object.keys(floorRoots).find(f=>floorRoots[f]===crownG.parent));
  state.day=21; state.newsPlan=null; rollNews(); out.push('plan:'+JSON.stringify(state.newsPlan)); sheetMode=null; calT=0; updateCalStrip(0.1); out.push('strip:'+calEl.style.display+' '+calEl.textContent);
  const id=+Object.keys(state.rooms)[3]; RT(id).guest=null; const g=spawnGuest('tourist'); g.memory={n:g.name,t:'tourist',room:id,sat:80,visits:2}; g.state='queue'; memoryAtDesk(g);
  out.push('ring:'+!!memRing+' floor:'+roomInfo(id).f); updateMemRing(); out.push('ring kept:'+!!memRing); memorySat(g,id); out.push('ring after checkin:'+!!memRing);
  setH(20.5); state.weather='sun'; out.push('bar:'+roofBarOn()+' bonus:'+worldAmenBonus('roof')); updateRoofLights(); updateRoofLights();
  out.push('lights:'+!!roofLightG+' emis:'+roofLightMat.emissiveIntensity.toFixed(1));
  let roof=0; for(let i=0;i<60;i++){ const g2=spawnGuest('tourist'); g2.room=+Object.keys(state.rooms)[0]; g2.T=Object.assign({},g2.T,{likes:null}); if(tryAmenity(g2)&&g2.seat.amen==='roof') roof++; if(g2.seat){ g2.seat.busy=null; g2.seat=null; } }
  out.push('roof picks/60:'+roof);
  return out.join('\\n'); })()""".replace('SETH',SETH)
with sync_playwright() as p:
    b=p.chromium.launch(executable_path=CHROME); pg=b.new_page(); errs=[]
    pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.goto('file:///home/user/default/otel-oyunu/test2.html'); pg.wait_for_timeout(1000)
    # eski kayıt: grev bitişi mutlak oyun saati olarak kaydedilmiş, aşçı alanı yok
    pg.evaluate("(()=>{ const s=freshState(0,0); s.tut=99; s.strike=5000; delete s.staff.cook; localStorage.setItem(SAVE_KEY,JSON.stringify(s)); })()"); pg.reload(); pg.wait_for_timeout(900)
    print('migr strike:',pg.evaluate("state.strike"),'cook slot:',pg.evaluate("JSON.stringify(state.staff.cook)"))
    print(pg.evaluate(A)); pg.wait_for_timeout(9000)
    print(pg.evaluate("'cook at post:'+(d2(__ck.x,__ck.z,L.cookSpot.x,L.cookSpot.z)<0.1)+' f:'+__ck.f+' pos:'+__ck.x.toFixed(1)+','+__ck.z.toFixed(1)"))
    print(pg.evaluate(B))
    print('ERRORS:',errs[:5]); b.close()
