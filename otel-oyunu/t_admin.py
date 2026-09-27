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
    pg.evaluate('state.sandbox=true'); pg.click('#setBtn'); pg.wait_for_timeout(300); pg.click('#sAdmin'); pg.wait_for_timeout(400)
    print('open:',pg.evaluate('sheetMode'), pg.evaluate("document.querySelectorAll('#sheet [data-a]').length"),'buttons')
    acts=pg.evaluate("[...document.querySelectorAll('#sheet [data-a]')].map(e=>e.dataset.a+'|'+e.dataset.v)")
    order=[a for a in acts if not a.startswith('endDay') and not a.startswith('moneyZero')]
    for a in order:
        k,v=a.split('|')
        sel=f'#sheet [data-a="{k}"][data-v="{v}"]'
        if pg.query_selector(sel) is None: print('missing',a); continue
        pg.click(sel,force=True); pg.wait_for_timeout(60)
        if errs: print('ERR after',a,errs); errs.clear()
    print('money',pg.evaluate('Math.round(state.money)'),'stars',pg.evaluate('stars()'),'built',pg.evaluate('Object.keys(state.built).length'),'/',pg.evaluate('PADS.length'),'rooms',pg.evaluate('Object.keys(state.rooms).length'),'staff',pg.evaluate("JSON.stringify(state.staff)"),'speed',pg.evaluate('gameSpeed'),'day',pg.evaluate('state.day'))
    print('dayLbl',pg.inner_text('#dayLbl'),'tut',pg.evaluate('state.tut'),'quests done',pg.evaluate("state.quests.list.map(q=>q.done).join()"))
    pg.click('#sheet [data-a="endDay"]',force=True); pg.wait_for_timeout(1500)
    print('after endDay day',pg.evaluate('state.day'),'modal',pg.evaluate("modalWrap.classList.contains('show')"))
    pg.keyboard.press('Escape'); pg.keyboard.press('F2'); pg.wait_for_timeout(300); print('F2 ->',pg.evaluate('sheetMode'))
    print('ERRORS:',errs)
    b.close()
