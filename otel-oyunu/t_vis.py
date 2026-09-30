import os,glob
HERE=os.path.dirname(os.path.abspath(__file__))
CHROME=os.environ.get('CHROME') or (sorted(glob.glob('/opt/pw-browsers/chromium*/chrome-linux*/chrome'))+['chromium'])[0]
import sys
SP=HERE+''
from playwright.sync_api import sync_playwright
steps=sys.argv[1:]
with sync_playwright() as p:
    b=p.chromium.launch(executable_path=CHROME,args=['--allow-file-access-from-files','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
    pg=b.new_page(viewport={'width':int(__import__('os').environ.get('VW','900')),'height':int(__import__('os').environ.get('VH','640'))}); errs=[]
    pg.on('pageerror',lambda e: errs.append(str(e))); pg.on('console',lambda m: print('CONSOLE',m.text[:200]) if m.type in ('warning','error') and 'skinChar' in m.text else None)
    pg.goto('file://'+SP+'/vis.html'); pg.wait_for_timeout(3000)
    for i,s in enumerate(steps):
        if s.startswith('js:'): print(pg.evaluate(s[3:]))
        elif s.startswith('key:'): pg.keyboard.type(s[4:]) 
        elif s.startswith('wait:'): pg.wait_for_timeout(int(s[5:]))
        elif s=='reload': pg.reload(); pg.wait_for_timeout(3000)
        elif s.startswith('shot:'): pg.screenshot(path=SP+'/'+s[5:]+'.png',timeout=180000)
    print('clock',pg.inner_text('#clock'),'ERR',errs[:5])
    b.close()
