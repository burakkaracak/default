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
    E=pg.evaluate
    E("localStorage.clear(); state.tut=5; ADMIN.allOpen(); window.botThink=()=>{}; spawnT=1e9;")
    print('roof built',E("built('roof')"),'floors',E("floorsBuilt()"),'roof pad label',E("PADMAP.roof.label"))
    print('roof seats reachable:',E("SEATS.filter(s=>s.amen==='roof').map(s=>{const p=route(0,0,5,ROOF,s.x,s.z); return p?1:0}).join('')"))
    print('seat approach blocked:',E("SEATS.filter(s=>s.amen==='roof').map(s=>blockedAt(ROOF,s.x,s.z,0.2)?1:0).join('')"))
    print('pile roof free',E("!blockedAt(ROOF,L.piles.roof.x,L.piles.roof.z,0.2)"),'heli spawn free',E("!blockedAt(ROOF,L.helipad.x-1.2,L.helipad.z+1.6,0.2)"))
    # guest to roof amenity
    E("state.t=0.3; state.weather='sun'; spawnGuest('vip'); const g=queue[0]; g.path=null; g.state='queue'; checkIn(g,pickRoom(g)); for(let i=0;i<400;i++) simStep(0.05); window._g=g;")
    print('guest state',E("_g.state+' f'+_g.f"))
    E("_g.state='room'; _g.inRoom=true; _g.path=null; const ok=(()=>{ const s=SEATS.find(s=>s.amen==='roof'&&s.pose==='sit'); s.busy=_g; _g.seat=s; _g.state='toAmen'; return _g.goTo(ROOF,s.x,s.z,()=>{ _g.pose(s); _g.state='amen'; _g.amenLeft=5; }); })(); window._ok=ok;")
    E("for(let i=0;i<1200&&_g.state!=='amen';i++) simStep(0.05)")
    print('guest reached roof seat:',E("_ok+' '+_g.state+' f'+_g.f"))
    E("for(let i=0;i<200;i++) simStep(0.05)"); print('roof pile',E("state.piles.roof"))
    # heli
    E("startHeli(); for(let i=0;i<400;i++){ updateHeli(0.05,i*0.05); simStep(0.05);} ")
    print('heli',E("heli?heli.phase:'gone'"),'vip heli guests',E("guests.filter(g=>g.heli).map(g=>g.state+' f'+g.f).join(',')"))
    E("for(let i=0;i<1200;i++){ updateHeli(0.05,i*0.05); simStep(0.05);} ")
    print('heli after',E("heli?heli.phase:'gone'"),'vip',E("guests.filter(g=>g.heli).map(g=>g.state+' f'+g.f+' q'+queue.indexOf(g)).join(',')"))
    # FP
    E("toggleFP(true); keys.w=true; for(let i=0;i<30;i++){ updatePlayer(0.05); } keys.w=false; updateCamera(0.05);")
    print('fp moved', E("fpMode"), E("player.x.toFixed(2)+','+player.z.toFixed(2)"))
    E("toggleFP(false)")
    # theme
    E("state.custom.theme='ottoman'; applyHotelTheme()"); print('theme facade',E("M.facade.color.getHexString()"),'chords',E("CHORDS[0].join()"))
    # chat fallback
    E("const g=guests.find(g=>g.room!=null&&!g.heli)||guests[0]; openChat(g); window._cg=g;"); pg.wait_for_timeout(300)
    pg.fill('#chIn','Hoş geldiniz, size nasıl yardımcı olabilirim?'); pg.click('#chSend'); pg.wait_for_timeout(700)
    print('chat:',E("_cg.chat.map(m=>m.who+': '+m.text).join(' | ')"),'ai',E("aiState"))
    print('ERRORS:',errs[:5]); b.close()
