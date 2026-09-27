import os,glob
HERE=os.path.dirname(os.path.abspath(__file__))
CHROME=os.environ.get('CHROME') or (sorted(glob.glob('/opt/pw-browsers/chromium*/chrome-linux*/chrome'))+['chromium'])[0]
import json,sys
from playwright.sync_api import sync_playwright
days=int(sys.argv[1]) if len(sys.argv)>1 else 12
with sync_playwright() as p:
    b=p.chromium.launch(executable_path=CHROME)
    pg=b.new_page(viewport={'width':390,'height':844}); errs=[]
    pg.on('pageerror',lambda e: errs.append('PAGEERR '+str(e)))
    pg.goto('file://'+HERE+'/test2.html'); pg.wait_for_timeout(1200)
    if not pg.evaluate('typeof runSim==="function"'): pg.add_script_tag(path=HERE+'/bot.js')
    pg.evaluate("state.tut=5")
    reps=[]
    for d in range(days):
        r=pg.evaluate("(()=>{ const before={...state.today}; const log=runSim(DAY_SEC); return log; })()")
        reps+=r
    rp=pg.evaluate('window._reports')
    for r,q in zip(reps,rp): print(r['day'],'$',r['money'],'*',r['stars'],'rep',r['rep'],'rooms',r['rooms'],'built',r['built'],'staff',r['staff'],'| g',q['guests'],'h',q['happy'],'n',q['neu'],'u',q['unh'],'left',q['left'],'inc',q['inc'],'wage',q['wages'],'cafe',q['cafe'],'quest',q['quest'],'| new:',r['list'])
    print('built:',pg.evaluate("Object.keys(state.built).join(' ')"))
    print('goal:',pg.evaluate("JSON.stringify(goal())"))
    print('guests alive:',pg.evaluate('guests.length'),'queue',pg.evaluate('queue.length'),'ents',pg.evaluate('ents.length'),'bot path fails',pg.evaluate('window._fail||0'))
    print('rooms types:',pg.evaluate("Object.values(state.rooms).map(s=>s.type[0]).join('')"))
    print('level:',pg.evaluate('state.lvl'),'ach:',pg.evaluate('Object.keys(state.ach).length'))
    print('events:',pg.evaluate('window._ev'))
    print('quests:',pg.evaluate('JSON.stringify(state.quests)'))
    print('ERRORS:',errs[:8])
    b.close()
