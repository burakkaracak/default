# MG10 kontrolü: personel kişilikleri (aday seçimi, hız/maaş/moral/enerji/xp), Efsane zorluk (çarpanlar, anahtar bonusu),
# foto modu (mock'ta toDataURL yok → hata vermeden çıkmalı), Spor takımı grubu, Film ekibi çatı çekimi, albüm
import glob
CHROME=(sorted(glob.glob('/opt/pw-browsers/chromium*/chrome-linux*/chrome'))+['chromium'])[0]
from playwright.sync_api import sync_playwright
A="""(async()=>{ state.tut=99; spawnT=1e9; ADMIN.allOpen(); state.money=5e6; const out=[]; closeModal(); const r0=Math.random;
  // 1) aday seçimi
  const n0=staffEnts.filter(e=>e.kind==='clean').length; hireCandidates('clean'); const cands=[...modal.querySelectorAll('[data-cand]')]; out.push('cands:'+cands.length+' modal:'+/adayları/.test(modal.innerHTML));
  cands[1].click(); const e=staffEnts.filter(x=>x.kind==='clean').slice(-1)[0]; out.push('hired:'+(staffEnts.filter(x=>x.kind==='clean').length===n0+1)+' trait:'+(e.rec&&e.rec.tr)+' crewHtml:'+/Ekip/.test(crewHtml()));
  // 2) kişilik etkileri
  e.rec.tr='calisan'; const s1=staffEnergyMul(e); e.rec.tr='sakar'; const s2=staffEnergyMul(e); out.push('spd calisan '+s1.toFixed(2)+' sakar '+s2.toFixed(2));
  e.rec.tr='gece'; const setH=h=>{ for(let t=0;t<1;t+=0.0005){ const x=hourOf(t)%24; if(x>=h&&x<h+0.5){ state.t=t; return; } } }; setH(23.5); state.nightShift=false; out.push('gece night spd:'+(staffSpeedMul('clean')*staffEnergyMul(e)).toFixed(2)+' (gündüz '+(()=>{ setH(12); return (staffSpeedMul('clean')*staffEnergyMul(e)).toFixed(2); })()+')');
  e.rec.tr='tutumlu'; const w0=wagesToday(); e.rec.tr='calisan'; out.push('wage tutumlu<normal:'+(w0<wagesToday()));
  e.rec.tr='dayanikli'; e.energy=100; staffWorked(e); const en1=e.energy; e.rec.tr='calisan'; e.energy=100; staffWorked(e); out.push('energy dayanikli '+en1+' normal '+e.energy);
  e.rec.tr='yetenekli'; e.rec.xp=0; careerWorked(e); out.push('xp yetenekli:'+e.rec.xp);
  e.rec.tr='neseli'; out.push('moraleDelta:'+traitMoraleDelta());
  // 3) Efsane zorluk
  state.diff='auto'; const ws0=wageScale(), ep0=expectPen(); state.diff='legend'; out.push('legend wage x'+(wageScale()/ws0).toFixed(2)+' expect +'+(expectPen()-ep0)+' flowV '+flowV()+' ui:'+/Efsane zorluk/.test(flowHtml()));
  state.diffDays={legend:9,auto:1}; out.push('keyMul '+diffKeyMul()+' badge '+diffBadge()+' keys '+JSON.stringify(moveKeys()));
  state.diffDays={legend:5,auto:5}; out.push('keyMul 50%:'+diffKeyMul()); state.diffDays={hard:9,legend:1}; out.push('keyMul hard:'+diffKeyMul()); state.diff='auto'; state.diffDays={};
  // 4) foto modu (mock: toDataURL yok → hata yok)
  let ok=true; try{ await photoMode(); }catch(err){ ok=false; out.push('photo err '+err); } out.push('photo no-throw:'+ok); closeModal();
  // 5) spor takımı
  const q0=guests.length; const cap=spawnGuest('team'); out.push('team spawn +'+(guests.length-q0)+' companions:'+guests.filter(g=>g.teamOf===cap).length);
  guests.filter(g=>g.teamOf===cap).concat([cap]).forEach(g=>{ g.sat=90; }); const rep0=state.rep; state.rep=50;
  [...guests.filter(g=>g.teamOf===cap),cap].forEach(g=>teamCheckout(g)); out.push('team photo rep+'+(state.rep-50).toFixed(1)); state.rep=rep0;
  // 6) film ekibi
  const f=spawnGuest('film'); f.f=ROOF; state.rep=50; filmShoot(f); out.push('film shot:'+!!f.shot+' rep+'+(state.rep-50).toFixed(1)+' boost day:'+state.filmBoost); state.day=state.filmBoost; out.push('filmDemand:'+filmDemand()); state.rep=rep0;
  // 7) albüm
  const L=albumList(); out.push('album has team/film:'+!!L.find(x=>x.k==='team')+!!L.find(x=>x.k==='film'));
  out.push('LOOKS team/film ok:'+(()=>{ try{ LOOKS.guest('team'); LOOKS.guest('film'); return true; }catch(e){ return false; } })());
  save(); return out.join('\\n'); })()"""
with sync_playwright() as p:
    b=p.chromium.launch(executable_path=CHROME); pg=b.new_page(); errs=[]
    pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.goto('file:///home/user/default/otel-oyunu/test2.html'); pg.wait_for_timeout(1000)
    print(pg.evaluate(A)); pg.reload(); pg.wait_for_timeout(1000)
    print('reload trait kept:',pg.evaluate("(()=>{ const e=staffEnts.find(x=>x.kind==='clean'); return e&&e.rec&&e.rec.tr; })()"))
    print('ERRORS:',errs[:5]); b.close()
