import os,glob
HERE=os.path.dirname(os.path.abspath(__file__))
CHROME=os.environ.get('CHROME') or (sorted(glob.glob('/opt/pw-browsers/chromium*/chrome-linux*/chrome'))+['chromium'])[0]
import sys
SP=HERE+''
from playwright.sync_api import sync_playwright
setup=sys.argv[1]
with sync_playwright() as p:
    b=p.chromium.launch(executable_path=CHROME)
    pg=b.new_page(viewport={'width':390,'height':844}); errs=[]
    pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.goto('file://'+SP+'/test2.html'); pg.wait_for_timeout(800)
    pg.add_script_tag(path=SP+'/bot.js')
    pg.evaluate("state.tut=5;"+setup)
    r=pg.evaluate("""(()=>{
      const out=[]; const hist=new Map();
      for(let s=0;s<8000;s++){ simStep(0.05);
        if(s%200===0){ for(const e of staffEnts){ const h=hist.get(e)||[]; h.push([e.x,e.z,e.f,e.job?e.job.type+':'+e.job.id+(e.job.working?'W':''):'-',!!e.path]); hist.set(e,h);} } }
      for(const e of staffEnts){ const h=hist.get(e); let moves=0, stuck=0; for(let i=1;i<h.length;i++){ const d=Math.hypot(h[i][0]-h[i-1][0],h[i][1]-h[i-1][1]); if(d>0.05) moves++; if(d<0.02&&h[i][4]) stuck++; }
        out.push(e.kind+'#'+e.idx+' at '+e.x.toFixed(2)+','+e.z.toFixed(2)+' f'+e.f+' job '+(e.job?JSON.stringify({t:e.job.type,id:e.job.id,w:e.job.working}):'-')+' path '+(e.path?e.path.length:0)+' wait '+e.wait.toFixed(2)+' | moves '+moves+' stuckWithPath '+stuck+' last: '+h.slice(-4).map(x=>x[3]).join(' ')); }
      const dirty=roomsWhere(id=>state.rooms[id].dirty).length, brk=roomsWhere(id=>state.rooms[id].broken).length, req=roomsWhere(id=>RT(id).req).length;
      out.push('rooms '+Object.keys(state.rooms).length+' dirty '+dirty+' broken '+brk+' req '+req+' served '+state.served);
      return out.join('\\n'); })()""")
    print(r); print('ERR',errs[:5])
    b.close()
