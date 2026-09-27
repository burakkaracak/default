import os,glob
HERE=os.path.dirname(os.path.abspath(__file__))
CHROME=os.environ.get('CHROME') or (sorted(glob.glob('/opt/pw-browsers/chromium*/chrome-linux*/chrome'))+['chromium'])[0]
SP=HERE+''
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(executable_path=CHROME)
    pg=b.new_page(viewport={'width':390,'height':844}); errs=[]
    pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.goto('file://'+SP+'/test2.html'); pg.wait_for_timeout(1000)
    print('quest btn hidden during tut:',pg.evaluate("getComputedStyle($('questBtn')).display"))
    pg.evaluate("state.tut=TUT.length; state.money=5000; ['r102','r103','depo','r101','r104','staff','r106'].forEach(id=>completePad(PADMAP[id]))")
    pg.wait_for_timeout(500)
    print('quest btn:',pg.evaluate("getComputedStyle($('questBtn')).display"),pg.inner_text('#questN'))
    print('quests:',pg.evaluate("state.quests.list.map(q=>questText(q)+' ['+q.have+'/'+q.n+'] +'+q.rew).join(' | ')"))
    print('cafe pad:',pg.evaluate("!!padVis.cafe"))
    pg.evaluate("completePad(PADMAP.cafe)"); pg.wait_for_timeout(300)
    print('cafe built, barista:',pg.evaluate("!!cafeBarista"),'steam',pg.evaluate("cafeSteam.length"))
    # coffee sale
    pg.evaluate("for(let i=0;i<3;i++) spawnGuest(); queue.forEach(g=>{g.path=null; g.state='queue'; g.coffeeT=0.01;})")
    pg.wait_for_timeout(600)
    print('coffee sold:',pg.evaluate("queue.filter(g=>g.coffee).length"),'pile',pg.evaluate("state.piles.cafe"),'holding',pg.evaluate("queue.map(g=>g.c.items.join()).join('|')"))
    # force quest completion
    pg.evaluate("state.quests.list.forEach(q=>qEv(q.k,q.n))"); pg.wait_for_timeout(400)
    pg.click('#questBtn'); pg.wait_for_timeout(400)
    print('sheet:',pg.inner_text('#sheet').replace('\n',' / ')[:400])
    m0=pg.evaluate('state.money'); r0=pg.evaluate('state.rep')
    for i in range(3):
        pg.click('#sheet [data-claim]',force=True); pg.wait_for_timeout(350)
    pg.wait_for_timeout(900)
    print('money +',pg.evaluate('state.money')-m0,'rep +',round(pg.evaluate('state.rep')-r0,1),'bonus',pg.evaluate('state.quests.bonus'),'btn',pg.inner_text('#questN'))
    print('sheet after:',pg.inner_text('#sheet').replace('\n',' / ')[-120:])
    pg.keyboard.press('Escape')
    # inspector + bus
    pg.evaluate("state.t=0.25; state.inspDue=true; state.busDue=true; queue.length=0")
    pg.evaluate("for(let i=0;i<3000&&(state.inspDue||state.busDue);i++) updateEventSpawns(0.1)")
    print('insp in world:',pg.evaluate("guests.some(g=>g.type==='insp')"),'bus:',pg.evaluate("!!bus"))
    pg.wait_for_timeout(9000)
    print('bus phase:',pg.evaluate("bus?bus.phase+' x='+bus.g.position.x.toFixed(1):'gone'"),'tour guests:',pg.evaluate("guests.filter(g=>g.tour).length"),'queue',pg.evaluate("queue.length"))
    g=pg.evaluate("(()=>{const g=guests.find(g=>g.type==='insp'); g.sat=90; g.room=Object.keys(state.rooms).map(Number)[0]; RT(g.room).guest=g; const r=state.rep; checkout(g); return state.rep-r;})()")
    print('insp happy rep delta:',round(g,1),'banner:',pg.inner_text('#banner')[:80])
    print('ERRORS:',errs)
    b.close()
