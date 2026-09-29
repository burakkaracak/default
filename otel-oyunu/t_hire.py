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
    btn=lambda: pg.evaluate("(()=>{const b=document.querySelector('#sheet [data-hire=clean]')||[...document.querySelectorAll('#sheet .row')][1].querySelector('.btn'); return b.innerText.replace(/\\n/g,' ')+(b.disabled?' [kapalı]':' [açık]');})()")
    pg.evaluate("state.money=50"); pg.click('#mgmtBtn'); pg.wait_for_timeout(400)
    print('1) personel odası yok:',btn())
    pg.evaluate("state.built.staff=true"); pg.wait_for_timeout(600)
    print('2) oda açıldı, para 50 (panel açık kaldı):',btn())
    pg.evaluate("state.money=500"); pg.wait_for_timeout(600)
    print('3) para 500 oldu (panel hâlâ açık):',btn())
    pg.click('#sheet [data-hire=clean]'); pg.wait_for_timeout(300)
    print('   aday penceresi:',pg.evaluate("modal.querySelectorAll('[data-cand]').length"),'aday'); pg.click('#modal [data-cand="0"]'); pg.wait_for_timeout(300)   # MG10: önce iki aday, biri seçilir
    print('4) işe alındı:',pg.evaluate('state.staff.clean.n'),'temizlikçi, para',pg.evaluate('state.money'))
    print('ERRORS:',errs)
    b.close()
