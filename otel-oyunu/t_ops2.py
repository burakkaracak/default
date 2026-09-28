import glob
CHROME=(sorted(glob.glob('/opt/pw-browsers/chromium*/chrome-linux*/chrome'))+['chromium'])[0]
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(executable_path=CHROME); pg=b.new_page(); errs=[]
    pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.goto('file:///home/user/default/otel-oyunu/test2.html'); pg.wait_for_timeout(1000)
    print(pg.evaluate("""(()=>{ state.tut=99; spawnT=1e9; ADMIN.allOpen(); state.money=1e6; const out=[]; const st0=stars; stars=()=>5;
      const setH=h=>{ for(let t=0;t<1;t+=0.002){ if(hourOf(t)%24>=h){ state.t=t; return; } } }; setH(12);
      state.kitchen={ready:0,cook:0}; const id=+Object.keys(state.rooms)[0]; RT(id).req={item:'food',left:40,max:40,by:null};
      out.push('stockHas food(0):'+stockHas('food')); for(let i=0;i<100;i++) updateKitchen(0.1); out.push('after10s ready:'+kitchen().ready+' has:'+stockHas('food')); useStock('food'); out.push('taken ready:'+kitchen().ready);
      state.stock={paper:5,towel:5}; laundryToStock(3); out.push('towel:'+state.stock.towel);
      state.book={}; const m0=state.money; planBookings(); const B=state.book[state.day+2]; out.push('book d+2:'+JSON.stringify(B)+' dep+'+(state.money-m0));
      state.book[state.day]={n:3,left:3,dep:0}; bookT=0; const q0=queue.length; updateBookings(0.1); out.push('booked spawn:'+(queue.length-q0)+' booked:'+!!queue[queue.length-1].booked);
      const bg=queue[queue.length-1]; const m1=state.money; angryLeave(bg); out.push('bookedLeft money-'+(m1-state.money));
      state.morale=10; Math.random=()=>0.1; moraleDay(); out.push('strike:'+strikeOn()+' mul:'+moraleMul().toFixed(2)); closeModal(); giveBonus(); out.push('after bonus morale:'+morale()+' strike:'+strikeOn());
      state.nightShift=true; out.push('nightWage:'+nightWageMul());
      const g=spawnGuest('tourist'); queue.splice(queue.indexOf(g),1); g.memory={n:g.name,t:'tourist',room:id,sat:30,visits:2}; state.rooms[id].dirty=false; state.rooms[id].broken=false; RT(id).req=null;
      out.push('memoryPick:'+(pickRoom(g)===id)); memoryAtDesk(g); checkIn(g,id); g.sat=90; g.stay=0; g.state='room'; checkout(g); out.push('remembered:'+JSON.stringify((state.loyal||[]).find(x=>x.n===g.name)));
      mgmtTab='staff'; openSheet('mgmt'); out.push('staffUI:'+/Personel morali/.test(sheet.innerHTML)); mgmtTab='hotel'; hotelSub='eco'; renderSheet(); out.push('ecoUI:'+/Rezervasyon takvimi/.test(sheet.innerHTML)+/Mutfak/.test(sheet.innerHTML));
      return out.join('\\n'); })()"""))
    print('errs',errs[:3]); b.close()
