// Test senaryoları
export async function boot({ page, shot, ev, wait }) {
  await shot('1_menu');
  await page.click('text=Yeni Oyun');
  await wait(300);
  await page.click('.slotc >> nth=0 >> text=Başla');
  await wait(1500);
  await shot('2_start');
  await page.click('text=Başlayalım').catch(() => {});
  await wait(500);
  await shot('3_desk');
  console.log(await ev(`JSON.stringify({day: __game.G.day, min: __game.G.min, loc: __game.G.player.loc, inbox: __game.G.inbox.length})`));
}

const START = `(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.textContent.includes('Yeni Oyun'));b.click();return 1})()`;
async function newGame({ page, ev, wait }) {
  await page.click('text=Yeni Oyun'); await wait(200);
  await page.click('.slotc >> nth=0 >> text=Başla'); await wait(1200);
  await page.click('text=Başlayalım').catch(() => {}); await wait(300);
}
export async function flow({ page, shot, ev, wait }) {
  await newGame({ page, ev, wait });
  // Masaya git ve gelen kutusunu aç
  await ev(`(()=>{const m=__game.G.inbox.find(m=>m.rfq); m.rfq.target=-0.05; m.rfq.wantDays=40; return 1})()`);
  await ev(`__game.bus.emit('ui','inbox','ic')`); await wait(300);
  await page.click('.list-item >> nth=1'); await wait(200);
  await shot('1_inbox');
  await page.click('text=Teklifi hazırla'); await wait(400);
  await shot('2_offer');
  await page.click('text=Teklifi gönder'); await wait(500);
  await shot('3_offer_result');
  console.log(await ev(`JSON.stringify(__game.G.orders.map(o=>[o.id,o.status,o.total]))`));
  await ev(`__game.modals.closeAll()`);
  // Proforma
  await ev(`(()=>{const o=__game.G.orders[0]; if(o){__game.bus.emit('ui','orders',o.id)} return 1})()`); await wait(300);
  await shot('4_order');
  await page.click('text=Proforma gönder').catch(()=>{}); await wait(200);
  await ev(`__game.modals.closeAll()`);
  // Fabrikaya git
  await ev(`(()=>{__game.W.enter('factory',{x:0,z:6}); return 1})()`); await wait(800);
  await shot('5_factory');
  // Avans gelsin: gün atla
  await ev(`(()=>{const G=__game.G; const o=G.orders[0]; o.advDay=G.day; __game.time.dayEnded=false; __game.bus.emit('dayStart'); return o.status})()`);
  await ev(`__game.modals.closeAll()`);
  await ev(`__game.bus.emit('ui','talk','semanur')`); await wait(300);
  await shot('6_semanur');
  await ev(`__game.modals.closeAll()`);
  await ev(`(()=>{const o=__game.G.orders[0]; __game.bus.emit('ui','orders',o.id); return o.status})()`); await wait(200);
  await page.click('text=ERP formunu hazırla').catch(()=>{}); await wait(300);
  await shot('7_erp');
  await ev(`__game.modals.closeAll()`);
  // ERP'yi temiz doğrudan onayla
  await ev(`(()=>{const G=__game.G; const o=G.orders[0]; o.erp={rounds:0}; __game.ORD.startProduction(o,{clean:true}); return o.status})()`);
  // Üretimi hızlı ilerlet
  await ev(`(()=>{for(let i=0;i<2000;i++) __game.PR.tick(5); return 1})()`);
  await wait(400); await shot('8_factory_after');
  console.log(await ev(`JSON.stringify({orders: __game.G.orders.map(o=>[o.id,o.status]), wos: Object.values(__game.G.factory.wos).map(w=>[w.id,w.packed,w.qty]), stock: __game.G.mat.stock})`));
}

export async function ship({ page, shot, ev, wait }) {
  await newGame({ page, ev, wait });
  await ev(`(()=>{const g=__game; const G=g.G; const m=G.inbox.find(m=>m.rfq);
    const o=g.ORD.createOrder({cust:'c1',city:'baku',lines:[{fam:'kanepe',fabric:'keten',color:'bej',size:'std',qty:8,price:800},{fam:'berjer',fabric:'kadife',color:'yesil',size:'std',qty:6,price:450}],cur:'USD',incoterm:'FOB',pay:'avans30',promisedDay:30});
    g.ORD.startProduction(o,{clean:true}); for(let i=0;i<2000;i++) g.PR.tick(5); g.W.enter('factory',{x:-12,z:4.5}); return o.status})()`);
  await wait(500); await shot('1_dock');
  await ev(`__game.bus.emit('ui','shipping')`); await wait(300);
  await page.click('.list-item input[type=checkbox]'); await wait(300);
  await shot('2_shipping');
  await page.click('text=Kendin yükle >> nth=1').catch(async()=>{ await page.click('text=Kendin yükle'); });
  await wait(800); await shot('3_container');
  await page.click('text=Kalanı otomatik'); await wait(500); await shot('4_auto');
  await page.click('text=Kapıları kapat'); await wait(4500); await shot('5_done');
  console.log(await ev(`JSON.stringify(__game.G.shipments)`));
}

export async function phone({ page, shot, ev, wait }) {
  await shot('0_menu');
  await newGame({ page, ev, wait });
  await shot('1_start');
  await ev(`__game.bus.emit('ui','inbox','ic')`); await wait(300); await shot('2_inbox');
  await page.click('.list-item >> nth=1'); await wait(200); await shot('3_mail');
  await ev(`__game.modals.closeAll()`);
  await ev(`(()=>{__game.W.enter('factory',{x:0,z:6}); return 1})()`); await wait(600); await shot('4_factory');
  await ev(`__game.bus.emit('ui','factory')`); await wait(300); await shot('5_factorypanel');
}

export async function crm({ page, shot, ev, wait }) {
  await newGame({ page, ev, wait });
  await ev(`__game.bus.emit('ui','world')`); await wait(300); await shot('1_map');
  await page.click('.city[data-id=baku]'); await wait(300); await shot('2_city');
  await page.click('text=Mail yaz'); await wait(400);
  await page.click('.mailpart >> nth=1'); await page.click('.mailpart >> nth=5'); await page.click('.mailpart >> nth=8');
  await page.click('.mailpart >> nth=14'); await page.click('.mailpart >> nth=17'); await wait(200);
  await shot('3_compose');
  await page.click('text=✉️ Gönder'); await wait(300);
  // Günleri hızla geçir
  for (let d = 0; d < 6; d++) {
    await ev(`(()=>{const g=__game; g.time.skip(800); g.modals.closeAll(); g.time.startNextDay(); g.modals.closeAll(); return 1})()`); await wait(50);
  }
  await ev(`__game.modals.closeAll()`);
  await ev(`__game.bus.emit('ui','people')`); await wait(300); await shot('4_people');
  await page.click('text=Aile ağacı'); await wait(200); await shot('5_family');
  await ev(`__game.modals.closeAll()`);
  await ev(`__game.bus.emit('ui','inbox','musteri')`); await wait(300); await shot('6_inbox');
  console.log(await ev(`JSON.stringify({mails:__game.G.inbox.map(m=>m.subject).slice(0,10), cust:Object.values(__game.G.customers).filter(c=>c.level||c.waiting).map(c=>[c.name,c.level,c.waiting])})`));
}

export async function panels({ page, shot, ev, wait }) {
  await newGame({ page, ev, wait });
  const uis = ['desk','inbox','orders','factory','world','people','finance','fairs','studio','marketing','goals','gamemenu','confidence','whereBun','plan','shipping','meetingTable','decor','nostalgia','verifyBoard'];
  for (const u of uis) { await ev(`__game.modals.closeAll(); __game.bus.emit('ui','${u}')`); await wait(150); }
  await ev(`__game.modals.closeAll(); __game.bus.emit('ui','finance','kur')`); await wait(200); await shot('finance_kur');
  for (const t of ['alacak','ham','kredi','pazar']) { await ev(`__game.modals.closeAll(); __game.bus.emit('ui','finance','${t}')`); await wait(120); }
  for (const t of ['hat','is','depo','kadro','alan']) { await ev(`__game.modals.closeAll(); __game.bus.emit('ui','factory','${t}')`); await wait(120); }
  await shot('factory_alan');
  for (const c of ['davut','harun','ibrahim','serkan','bunyamin','busra','semanur']) { await ev(`__game.modals.closeAll(); __game.bus.emit('ui','talk','${c}')`); await wait(120); }
  await shot('talk');
  await ev(`__game.modals.closeAll()`);
  // 40 günlük hızlı simülasyon
  const r = await ev(`(()=>{const g=__game; for(let d=0; d<40; d++){ g.time.skip(800); g.modals.closeAll(); g.time.startNextDay(); g.modals.closeAll(); } return JSON.stringify({day:g.G.day, cash:Math.round(g.G.cash), inbox:g.G.inbox.length, trend:g.G.trend?.name, loans:(g.G.loans||[]).length})})()`);
  console.log(r);
  await ev(`__game.modals.closeAll(); __game.bus.emit('ui','finance')`); await wait(200); await shot('finance_ozet');
}

export async function life({ page, shot, ev, wait }) {
  await newGame({ page, ev, wait });
  await ev(`window.__auto = setInterval(()=>{ const g=__game; if(!g.G) return;
    const btn=[...document.querySelectorAll('#modals .pf .btn.gold, #modals .choices button')].pop();
    if(btn){ btn.click(); return; }
    g.G.speed=3; g.time.slow=1; for(let i=0;i<20;i++) g.time.advance(0.5);
  }, 30)`);
  for (let i = 0; i < 12; i++) { await wait(2500); console.log(await ev(`JSON.stringify({day:__game.G.day, min:Math.round(__game.G.min), cash:Math.round(__game.G.cash), hist:__game.G.month.hist.length})`)); }
  await ev(`clearInterval(window.__auto)`); await wait(300); await shot('end');
}

export async function phone2({ page, shot, ev, wait }) {
  await newGame({ page, ev, wait });
  await ev(`(()=>{const m=__game.G.inbox.find(m=>m.rfq); __game.W.enter('store',{floor:2,x:-6,z:-2.6}); return 1})()`); await wait(300);
  await ev(`(()=>{const m=__game.G.inbox.find(m=>m.rfq); __game.bus.emit('ui','inbox','ic'); return 1})()`); await wait(200);
  await page.click('.list-item >> nth=1'); await wait(100);
  await page.click('text=Teklifi hazırla'); await wait(300); await shot('1_offer');
  await ev(`__game.modals.closeAll()`);
  await ev(`(()=>{const g=__game; const o=g.ORD.createOrder({cust:'c1',city:'baku',lines:[{fam:'kanepe',fabric:'keten',color:'bej',size:'std',qty:8,price:800},{fam:'berjer',fabric:'kadife',color:'yesil',size:'std',qty:6,price:450}],cur:'USD',incoterm:'FOB',pay:'avans30',promisedDay:30}); o.status='erp'; g.bus.emit('ui','orders',o.id); return 1})()`); await wait(200);
  await page.click('text=ERP formunu hazırla'); await wait(300); await shot('2_erp');
  await ev(`__game.modals.closeAll()`);
  await ev(`(()=>{const g=__game; const o=g.G.orders[0]; g.ORD.startProduction(o,{clean:true}); for(let i=0;i<2000;i++) g.PR.tick(5); g.W.enter('factory',{x:-12,z:4.5}); g.bus.emit('ui','shipping'); return 1})()`); await wait(300);
  await page.click('.list-item input[type=checkbox]'); await wait(200);
  await page.click('text=Kendin yükle >> nth=1'); await wait(700); await shot('3_container');
  await page.click('text=Kalanı otomatik'); await wait(400); await shot('4_container_auto');
  await page.click('text=Vazgeç'); await wait(300);
  await ev(`__game.bus.emit('ui','world')`); await wait(300); await shot('5_map');
}

export async function walk({ page, shot, ev, wait }) {
  await newGame({ page, ev, wait });
  const p0 = await ev(`JSON.stringify([__game.G.player.x,__game.G.player.z])`);
  await page.keyboard.down('KeyD'); await wait(800); await page.keyboard.up('KeyD');
  const p1 = await ev(`JSON.stringify([__game.G.player.x,__game.G.player.z])`);
  await page.keyboard.down('KeyA'); await wait(800); await page.keyboard.up('KeyA'); await wait(200);
  await ev(`(()=>{__game.G.player.x=-6; __game.G.player.z=-2.9; return 1})()`); await wait(300);
  await page.keyboard.press('KeyE'); await wait(300);
  const open = await ev(`document.querySelector('#modals .ph h2')?.textContent`);
  console.log('konum', p0, p1, 'panel:', open);
  await shot('desk');
  // Asansör → 3. kat
  await ev(`__game.modals.closeAll(); __game.G.player.x=9; __game.G.player.z=-5.2`); await wait(300);
  await page.keyboard.press('KeyE'); await wait(300);
  await page.click('text=3. Kat'); await wait(800); await shot('floor3');
  await ev(`__game.W.enter('store',{floor:0, x:0, z:3})`); await wait(400); await shot('floor0');
  await ev(`__game.W.enter('nisantasi',{})`); await wait(400); await shot('branch');
}
