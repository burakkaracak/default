# Uçtan uca gün testi (MG9): gerçek endDay akışıyla etkileri sayar — tek fonksiyonu elle çağıran testlerin
# kaçırdığı sessiz hataları (fiyat savaşı günü, kapora raporu, izin, sahur, taşınma, sabah brifingi) yakalar.
import glob
CHROME=(sorted(glob.glob('/opt/pw-browsers/chromium*/chrome-linux*/chrome'))+['chromium'])[0]
from playwright.sync_api import sync_playwright
SETH="const setH=h=>{ for(let t=0;t<1;t+=0.0005){ const x=hourOf(t)%24; if(x>=h&&x<h+0.5){ state.t=t; return; } } };"
A="""(()=>{ state.tut=99; spawnT=1e9; ADMIN.allOpen(); state.money=5e5; const out=[]; SETH stars=()=>5; closeModal();
  // 1) fiyat savaşı: rakip indirimi yeni güne düşer, brifinge girer
  if(!state.rival) state.rival={name:'Test Otel',q:60,price:1,promo:0,bought:false};
  const r0=Math.random; Math.random=()=>0.01; state.morale=90; endDay(); Math.random=r0;
  out.push('promo==day:'+(state.rival.promo===state.day)+' warQ:'+morningQ().some(x=>x.k==='war')+' pull>0:'+(rivalPull()>0));
  // 2) kapora biten günün raporunda
  out.push('bookDep in report:'+(()=>{ const b=state.book&&state.book[state.day+2]; return b?b.dep:0; })());
  // 3) brifing açılır, karar uygulanır
  closeModal(); modalQ&&(modalQ.length=0); openBriefing(); const hasB=/Sabah brifingi/.test(modal.innerHTML); const wb=modal.querySelector('[data-bf="warY"]'); if(wb) wb.click();
  out.push('briefing:'+hasB+' warApplied:'+(state.priceWar===state.day)+' mul:'+priceWarMul()); closeModal();
  // 4) izinli personel iş tutmaz
  if(!staffEnts.some(e=>e.kind==='clean')) hireStaff('clean'); const cl=staffEnts.filter(e=>e.kind==='clean'); if(cl.length){ const e=cl[0]; const id=+Object.keys(state.rooms)[0]; state.rooms[id].dirty=true; RT(id).guest=null; RT(id).task=e; e.job={type:'clean',id};
    state.leaveDay={day:state.day,kind:'clean'}; updateStaff(0.05); out.push('leave: job freed '+(RT(id).task!==e)+' hidden '+(!e.c.root.visible)+' gone '+!!e.gone);
    state.leaveDay=null; updateStaff(0.05); out.push('back: visible '+e.c.root.visible+' gone '+!!e.gone); }
  // 5) fuar fiyat toleransı
  state.news={k:'fuar',day:state.day}; state.price=1.2; const pd=priceDemand(); state.news=null; const pd0=priceDemand(); out.push('fair priceDemand '+pd0.toFixed(2)+'->'+pd.toFixed(2)); state.price=1;
  // 6) sahur: misafir uyanır, yemek ister, mutfak pişirir
  state.day=16; state.shown={}; setH(3.8); const g=spawnGuest('tourist'); queue.splice(queue.indexOf(g),1); const rid=+Object.keys(state.rooms).find(k=>!RT(+k).guest&&!state.rooms[k].dirty); state.rooms[rid].dirty=false; state.rooms[rid].broken=false; checkIn(g,rid); g.state='room'; g.inRoom=true; g.stay=999;
  const rr=Math.random; Math.random=()=>0.1; updateCalendar(); Math.random=rr; out.push('sahur awake:'+!!g.sahurAwake+' nightKitchen:'+nightKitchen());
  RT(rid).req=null; makeRequest(g); out.push('sahur req:'+(RT(rid).req&&RT(rid).req.item)); state.kitchen={ready:0,cook:0}; for(let i=0;i<120;i++) updateKitchen(0.1); out.push('kitchen ready at sahur:'+kitchen().ready);
  // 7) kalıcı prestij ünü
  state.prj={anit:2}; state.charity=4; state.repHist=[80,80,80]; out.push('repTarget '+repTarget()+' (80+4+2)');
  // 8) bildirim tekrar etmez (kayıtta)
  out.push('shown sahur saved:'+(state.shown.sahur===state.day));
  // 9) upg görevi: büyük yatırım alımı sayılır, upgAvailable boolean döner
  for(const k in UPG) state.up[k]=UPG[k].costs.length; out.push('upgAvailable bool:'+(typeof upgAvailable()==='boolean'));
  state.quests={day:state.day,bonus:false,list:[{k:'upg',n:1,have:0,rew:10,done:false,claimed:false}]}; state.money=1e9; buyInv(Object.keys(INV)[0],true); out.push('upg quest via inv:'+state.quests.list[0].done);
  save(); return out.join('\\n'); })()""".replace('SETH',SETH)
with sync_playwright() as p:
    b=p.chromium.launch(executable_path=CHROME); pg=b.new_page(); errs=[]
    pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.goto('file:///home/user/default/otel-oyunu/test2.html'); pg.wait_for_timeout(1000)
    print(pg.evaluate(A))
    # 9) taşınma: ayarlar ve zincir müdürleri taşınır
    pg.evaluate("(()=>{ state.lowFx=true; state.ezan='off'; state.mgrs={'0':{lv:2}}; state.done=true; state.money=1e6; save(); })()")
    pg.evaluate("(()=>{ try{ closeModal(); confirmMove(); }catch(e){ window.__moveErr=String(e); } const b=document.querySelector('#mvYes'); if(b) b.click(); else { window.__noMove=1; } })()")
    pg.wait_for_timeout(1500)
    print('move:',pg.evaluate("(window.__noMove?'NO MOVE BUTTON ':'')+'city '+state.city+' lowFx '+state.lowFx+' ezan '+state.ezan+' mgrs '+JSON.stringify(state.mgrs)"))
    # 10) yenilemede brifing kaybolmaz
    pg.evaluate("(()=>{ morningAdd({k:'leave',kind:'clean',name:'Ayşe'}); save(); })()"); pg.reload(); pg.wait_for_timeout(5500)
    seen=False
    for i in range(6):   # önce sıradaki pencereler (giriş serisi vb.) kapanır; brifing sıraya girmiş olmalı
        if pg.evaluate("/Sabah brifingi/.test(modal.innerHTML)"): seen=True; break
        pg.evaluate("closeModal()"); pg.wait_for_timeout(700)
    print('reload briefing:',pg.evaluate("morningQ().length"),'shown',seen)
    print('ERRORS:',errs[:5]); b.close()
