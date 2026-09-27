import os,glob
HERE=os.path.dirname(os.path.abspath(__file__))
CHROME=os.environ.get('CHROME') or (sorted(glob.glob('/opt/pw-browsers/chromium*/chrome-linux*/chrome'))+['chromium'])[0]
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(executable_path=CHROME)
    pg=b.new_page(viewport={'width':390,'height':844}); errs=[]
    pg.on('pageerror',lambda e: errs.append('PAGEERR '+str(e)))
    pg.on('console',lambda m: m.type in('error','warning') and errs.append(m.type+' '+m.text))
    pg.goto('file://'+HERE+'/test2.html'); pg.wait_for_timeout(1500)
    print('boot ok:',pg.evaluate("!!player"),'| money',pg.evaluate('state.money'),'| goal:',pg.inner_text('#goal'))
    print('pads visible:',pg.evaluate("Object.keys(padVis)"),'| hint:',pg.inner_text('#hint'))
    print('grid0 free cells:',pg.evaluate("(()=>{const g=gridFor(0); let n=0; for(const v of g.b) if(!v) n++; return [n,g.w*g.h];})()"))
    print('path desk->pad r102:',pg.evaluate("(()=>{const p=findPath(0,L.serve.cx,L.serve.cz,COLX[1],ROWZ[0]); return p?p.length+' pts, end '+p[p.length-1].x.toFixed(2)+','+p[p.length-1].z.toFixed(2):'NONE';})()"))
    print('path spawn->queue head:',pg.evaluate("(()=>{const p=findPath(0,L.spawnL.x,L.spawnL.z,L.qHead.x,L.qHead.z); return p?p.length+' pts':'NONE';})()"))
    print('ERRORS:',errs[:8])
    b.close()
