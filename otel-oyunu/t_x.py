import os,glob
HERE=os.path.dirname(os.path.abspath(__file__))
CHROME=os.environ.get('CHROME') or (sorted(glob.glob('/opt/pw-browsers/chromium*/chrome-linux*/chrome'))+['chromium'])[0]
SP=HERE+''
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(executable_path=CHROME)
    pg=b.new_page(viewport={'width':390,'height':844}); errs=[]
    pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.goto('file://'+SP+'/test2.html'); pg.wait_for_timeout(900)
    pg.add_script_tag(path=SP+'/bot.js')
    E=lambda s: pg.evaluate(s)
    E("localStorage.clear(); state.tut=5; ['r102','r103','depo','r101','r104','staff','r106','cafe','r107'].forEach(id=>completePad(PADMAP[id])); window.botThink=()=>{}; spawnT=1e9;")
    print('gen col:',E("!!COLS.gen"),'genSpot free',E("!blockedAt(0,L.genSpot.x,L.genSpot.z,0.25)"),'mess spots free',E("MESS_SPOTS.map(([x,z])=>blockedAt(0,x,z,0.22)?0:1).join('')"))
    E("catArrive()"); print('cat:',E("cat.state+' '+cat.x.toFixed(1)+','+cat.z.toFixed(1)"))
    E("for(let i=0;i<400;i++){ simStep(0.05); updateCat(0.05,i*0.05);} ")
    print('cat after walk:',E("cat.state+' '+cat.x.toFixed(1)+','+cat.z.toFixed(1)"))
    r0=E("state.rep"); E("cat.state='idle'; cat.t=99; player.place(cat.x+0.3,cat.z,0); simStep(0.05)")
    print('pet: rep +',round(E("state.rep")-r0,2),'pets',E("state.catPets"),'catstate',E("cat.state"))
    E("state.quests={day:state.day,bonus:false,list:[{k:'pet',n:2,have:0,rew:60,done:false,claimed:false}]}; cat.petCd=0; cat.state='idle'; simStep(0.05)")
    print('pet quest have',E("state.quests.list[0].have"),'text',E("questText(state.quests.list[0])"))
    # mess
    E("player.place(-4.2,3.8,0); catKnock()"); print('mess:',E("JSON.stringify(state.mess)"),'goal',E("goal().text"))
    E("state.staff.clean.n=1; spawnStaff('clean',false); for(let i=0;i<600&&state.mess;i++) simStep(0.05)")
    print('mess cleaned by staff:',E("state.mess===null"))
    E("catKnock(); player.place(state.mess.x,state.mess.z+0.3,0); for(let i=0;i<40;i++) simStep(0.05)"); print('mess cleaned by player:',E("state.mess===null"))
    # power
    E("player.place(-2,5,0); for(let i=0;i<3;i++) spawnGuest(); startCrisis('power')")
    print('power: desk tag noPower',E("deskState.noPower"),'goal',E("goal().text"),'fx',E("$('powerFx').className"))
    E("for(let i=0;i<60;i++) simStep(0.05)"); print('checkins blocked, queue',E("queue.length"))
    E("player.place(L.genSpot.x,L.genSpot.z,0); for(let i=0;i<70;i++) simStep(0.05)"); print('power resolved by player:',E("state.crisis===null"),'banner',pg.inner_text('#banner')[:40])
    # flood fixed by tech
    E("state.staff.tech.n=1; spawnStaff('tech',false); startCrisis('flood')"); print('flood at',E("JSON.stringify(state.crisis)"))
    E("player.place(-4.2,3.8,0); for(let i=0;i<1200&&state.crisis;i++) simStep(0.05)"); print('flood resolved by tech:',E("state.crisis===null"))
    # flu
    E("state.staff.bell.n=2; spawnStaff('bell',false); spawnStaff('bell',false); startCrisis('flu')")
    print('sick:',E("staffEnts.filter(e=>e.sick).map(e=>e.kind).join()"))
    E("for(let i=0;i<400;i++) simStep(0.05)"); print('gone:',E("staffEnts.filter(e=>e.gone).length"))
    E("state.t=0.999; simStep(0.05)"); print('after day end sick:',E("staffEnts.filter(e=>e.sick).length"),'day',E("state.day"))
    # custom
    E("closeModal(); openSheet('custom')"); pg.wait_for_timeout(300)
    pg.fill('#cName','Grand Budapest Palace Otel'); pg.click('#cNameOk'); pg.wait_for_timeout(200)
    print('name:',E("state.custom.name"))
    pg.click('#sheet [data-ck=hs][data-cv=long]'); pg.wait_for_timeout(200); pg.click('#sheet [data-ck=hat][data-cv=fedora]'); pg.wait_for_timeout(200)
    print('custom:',E("JSON.stringify(state.custom)"))
    # persistence
    E("startCrisis('power'); catKnock(); save()"); pg.reload(); pg.wait_for_timeout(1200)
    print('reload: crisis',E("state.crisis&&state.crisis.type"),'mess',E("!!state.mess"),'cat',E("!!cat"),'name',E("state.custom.name"),'hs',E("state.custom.hs"))
    print('ERRORS:',errs)
    b.close()
