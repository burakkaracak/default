# MG11-C hikâye: bölüm girişi, perde tetikleme (3★/4★/5★), karar etkileri + bayraklar, harita/günlük, yan zincir adımları, taşınmada korunma, reload
import glob
CHROME=(sorted(glob.glob('/opt/pw-browsers/chromium*/chrome-linux*/chrome'))+['chromium'])[0]
from playwright.sync_api import sync_playwright
A="""(()=>{ const out=[]; try{ state.tut=99; spawnT=1e9; ADMIN.allOpen(); state.money=5e6; closeModal(); const r0=Math.random; state.saga=null;
  // 1) giriş + 2★'da perde yok
  state.rep=30; sagaT=0; updateSaga(1); out.push('intro:'+sagaCh(state.city).intro+' pend:'+!!saga().pend+' diary:'+saga().diary.length+' html:'+/Bölüm 1/.test(sagaHtml()));
  // 2) 3★ → perde 1 açılır, karar a
  Object.keys(state.rooms).slice(0,8).forEach(k=>{ const R=RT(+k); if(R.guest){ standUp(R.guest); checkout(R.guest); } upgradeRoomMax(+k); }); state.rep=90; out.push('stars:'+stars());
  sagaT=0; updateSaga(1); out.push('pend after 5★:'+JSON.stringify(saga().pend)+' modal:'+/perde 1/.test(modal.innerHTML)+' buttons:'+modal.querySelectorAll('[data-beat]').length);
  const m0=state.money; out.push('choose a:'+sagaChoose('a')+' money '+(state.money-m0)+' flag zarf:'+saga().flags.zarf+' beat:'+sagaCh(0).beats.b1+' pend cleared:'+!saga().pend);
  // 3) sıradaki perdeler ardışık açılır (4★ ve 5★ koşulu zaten sağlı)
  sagaT=0; updateSaga(1); out.push('pend2:'+(saga().pend&&saga().pend.k)); const mo=morale(); sagaChoose('a'); out.push('b2 morale +'+(morale()-mo)+' flag vefa:'+saga().flags.vefa);
  sagaT=0; updateSaga(1); const k0=state.keys||0; sagaChoose('b'); out.push('b3 keys +'+((state.keys||0)-k0)+' progress:'+sagaProgress(0)+' epilogue:'+sagaEpilogue(0)+' diary:'+saga().diary.length);
  out.push('map:'+/Perde 1: <b>/.test(sagaMapHtml())+' no more pend:'+(()=>{ sagaT=0; updateSaga(1); return !saga().pend; })());
  // 4) yan zincir: neseli personel + moral
  while(staffEnts.filter(e=>e.kind!=='rec').length<2){ state.staff.clean.n++; spawnStaff('clean',true); } const e=staffEnts.find(x=>x.kind!=='rec'); e.rec=e.rec||{}; e.rec.tr='neseli';
  state.morale=90; sagaDayEnd({guests:5,happy:3,unhappy:0,left:0}); out.push('neseli step:'+sideState('neseli').step); sagaDayEnd({guests:5,happy:3,unhappy:0,left:0}); const m2=state.money; sagaDayEnd({guests:5,happy:3,unhappy:0,left:0}); out.push('after 2 more days step:'+sideState('neseli').step+' reward paid:'+(state.money>m2)+' map lists side:'+/Ekip Ruhu/.test(sagaMapHtml()));
  // 5) günde en fazla 1 adım: calisan da olsa aynı gün ilerlemez
  e.rec.tr='calisan'; state.staff.clean.n++; const e2=spawnStaff('clean',true); e2.rec=e2.rec||{}; e2.rec.tr='sakar'; sagaDayEnd({guests:20,happy:15,unhappy:1,left:0}); out.push('one step/day: calisan '+sideState('calisan').step+' sakar '+sideState('sakar').step);
  // 6) günlük modalı + harita modalı
  lastUserT=performance.now(); openDiary(); out.push('diary modal:'+/Günlük/.test(modal.innerHTML)); closeModal(); lastUserT=performance.now(); openSagaMap(); out.push('map modal:'+/Hikâye haritası/.test(modal.innerHTML)); closeModal();
  save(); }catch(e){ out.push('EXC '+e.stack); } return out.join('\\n'); })()"""
with sync_playwright() as p:
    b=p.chromium.launch(executable_path=CHROME); pg=b.new_page(); errs=[]
    pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.goto('file:///home/user/default/otel-oyunu/test2.html'); pg.wait_for_timeout(1000)
    print(pg.evaluate(A)); pg.reload(); pg.wait_for_timeout(1200)
    print('reload:',pg.evaluate("(()=>({flags:Object.keys(saga().flags).join(','),prog:sagaProgress(0),diary:saga().diary.length,side:sideState('neseli').step}))()"))
    print('ERRORS:',errs[:5]); b.close()
