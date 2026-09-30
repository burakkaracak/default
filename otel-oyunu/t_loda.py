# MG11-B Loda kontrolü: tasarımcıda Loda eşyası + kaplama, Loda süiti (fiyat/memnuniyet), galeri + vitrin, satış,
# ihracat bayisi (kapora + 3 gün sonra kalan), UI teması, yeniden yüklemede kalıcılık
import glob
CHROME=(sorted(glob.glob('/opt/pw-browsers/chromium*/chrome-linux*/chrome'))+['chromium'])[0]
from playwright.sync_api import sync_playwright
A="""(()=>{ const out=[]; try{ state.tut=99; spawnT=1e9; ADMIN.allOpen(); state.money=5e6; closeModal(); const r0=Math.random; const tap=el=>{ lastUserT=performance.now(); el.click(); };
  // 1) tasarımcı: Loda eşyası + kaplama
  const id=+Object.keys(state.rooms)[0]; const s=state.rooms[id]; if(RT(id).guest){ standUp(RT(id).guest); checkout(RT(id).guest); } upgradeRoomMax(id); out.push('room type:'+s.type);
  s.furn=[]; openDesigner(id); out.push('designer open, loda buttons hidden:'+(modal.querySelectorAll('[data-fk^="l_"]').length===0)); closeModal(); designSel='l_nova'; designFin='oak'; s.furn.push({k:'l_nova',i:4,j:2,g:2,fin:'oak'}); out.push('legacy piece renders:'+(()=>{ try{ buildRoomVisual(id,false); return true; }catch(e){ return false; } })()); const rate0=roomRate(id);
  s.furn=[{k:'l_nova',i:0,j:0,g:2,fin:'oak'},{k:'l_domo',i:1,j:0,g:2,fin:'ivory'},{k:'l_dali',i:2,j:0,g:2,fin:'mink'}];
  out.push('suite:'+lodaSuite(id)+' mul:'+lodaRoomMul(id)+' sat:'+lodaRoomSat(id)+' rate x'+(roomRate(id)/rate0).toFixed(2)+' designSat:'+designSat(s)+' label:'+/LODA/.test(lodaRoomLabel(id)));
  let ok=true; try{ buildRoomVisual(id,false); }catch(e){ ok=false; out.push('build err '+e); } out.push('room build no-throw:'+ok);
  // 2) galeri + vitrin
  Object.keys(state.rooms).slice(0,8).forEach(k=>{ const R=RT(+k); if(R.guest){ standUp(R.guest); checkout(R.guest); } upgradeRoomMax(+k); }); state.rep=Math.max(state.rep,85); out.push('stars:'+stars()+' galCost:'+galCost()); const m0=state.money; buyGallery(); out.push('gallery:'+galOn()+' spent:'+(m0-state.money)); buyVitrin('nova'); out.push('vitrin nova:'+vitOn('nova')+' chance:'+galChance().toFixed(2)+' html:'+/LODA<\/span> Gallery/.test(galleryHtml()));
  // 2b) yol: lobiden yaya geçidiyle galeri kapısına gidilebilir; galeri duvarı yürünmez; Yürü düğmesi var
  player.x=-4.2; player.z=3.8; player.f=0; player.path=null; const D=galDoor(); out.push('door:'+JSON.stringify(D)+' goTo:'+!!player.goTo(0,D.x,D.z)+' pathLen:'+(player.path?player.path.length:0)+' wall blocked:'+blockedAt(0,GAL.x,GAL.z,0.2)+' crosswalk:'+!!zebraG+' walkBtn:'+/data-galgo/.test(galleryHtml()));
  player.path=null; player.x=D.x; player.z=D.z; galVisit=false; closeModal(); updateGalVisit(); out.push('visit modal:'+/LODA Gallery/.test(modal.innerHTML)+' open:'+modalWrap.classList.contains('show')); closeModal(); player.x=-4.2; player.z=3.8;
  // 2c) gerçek model: mock'ta yüklenmez → galeri hatasız kurulur; koltuk satın alma + kumaş; tasarımcıda kaba parçalar gizli
  out.push('gltf state:'+lodaGltfState+' sofaHtml:'+/Sophia üçlü koltuk/.test(galleryHtml())+' hidden in designer:'+(()=>{ lastUserT=performance.now(); openDesigner(id); const n=modal.querySelectorAll('[data-fk^="l_"]').length; closeModal(); return n===0; })());
  const ms=state.money; buyLodaSofa('mink'); out.push('sofa bought:'+sofaOn()+' fin '+state.loda.sofa+' cost '+(ms-state.money)+' lobbySat +'+lodaLobbySat()+' default hidden:'+(lobbySofaG&&!lobbySofaG.visible)); const ms2=state.money; buyLodaSofa('antra'); out.push('refabric:'+state.loda.sofa+' cost '+(ms2-state.money));
  // 3) satış: mutlu misafir çıkışında gelir
  const g=spawnGuest('tourist'); g.f=0; checkIn(g,id); g.sat=90; Math.random=()=>0.01; const m1=state.money; lodaCheckout(g); Math.random=r0; out.push('sale:'+(state.money>m1)+' sales:'+state.loda.sales);
  // 4) bayi: sipariş + 3 gün sonra teslimat
  const d=spawnDealer(); out.push('dealer:'+(d&&d.type==='dealer')+' name:'+d.name+' look ok:'+(()=>{ try{ LOOKS.guest('dealer'); return true; }catch(e){ return false; } })());
  d.sat=90; const m2=state.money, r2=state.rep; dealerCheckout(d); out.push('deposit:'+(state.money-m2)+' rep+'+(state.rep-r2).toFixed(1)+' pend:'+JSON.stringify(state.loda.pend));
  const t={amen:0}; lodaDayEnd(t); out.push('paid early:'+t.amen); state.day+=3; lodaDayEnd(t); out.push('paid at day+3:'+t.amen+' pend left:'+state.loda.pend.length);
  // 5) yorum + UI teması
  out.push('review mentions loda:'+/Loda/.test(cannedReview({name:'Ayşe Y.',lodaSuite:true,sat:90,type:'Turist',room:'suite',waited:0},5)));
  state.lodaUI=true; applyLodaUI(); out.push('body.loda:'+document.body.classList.contains('loda')); state.lodaUI=false; applyLodaUI();
  state.lodaUI=true; save(); }catch(e){ out.push('EXC '+e.stack); } return out.join('\\n'); })()"""
with sync_playwright() as p:
    b=p.chromium.launch(executable_path=CHROME); pg=b.new_page(); errs=[]
    pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.goto('file:///home/user/default/otel-oyunu/test2.html'); pg.wait_for_timeout(1000)
    print(pg.evaluate(A)); pg.reload(); pg.wait_for_timeout(1200)
    print('reload:',pg.evaluate("(()=>({gal:galOn(),vit:vitOn('nova'),ui:document.body.classList.contains('loda'),fin:(Object.values(state.rooms).find(s=>(s.furn||[]).some(f=>f.fin))||{furn:[]}).furn.map(f=>f.fin).join(',')}))()"))
    print('ERRORS:',errs[:5]); b.close()
