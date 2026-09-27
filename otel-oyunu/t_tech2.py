import os,glob
HERE=os.path.dirname(os.path.abspath(__file__))
CHROME=os.environ.get('CHROME') or (sorted(glob.glob('/opt/pw-browsers/chromium*/chrome-linux*/chrome'))+['chromium'])[0]
import sys
SP=HERE+''
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(executable_path=CHROME)
    pg=b.new_page(); errs=[]
    pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.goto('file://'+SP+'/test2.html'); pg.wait_for_timeout(800)
    pg.add_script_tag(path=SP+'/bot.js')
    print(pg.evaluate("""(()=>{ state.tut=5; """+sys.argv[1]+""" window.botThink=()=>{};
      const out=[]; const last=new Map(); const still=new Map();
      for(let s=0;s<16000;s++){ simStep(0.05);
        for(const e of staffEnts){ const L0=last.get(e); const moved=!L0||Math.hypot(e.x-L0[0],e.z-L0[1])>0.001; last.set(e,[e.x,e.z]);
          const st=moved?0:(still.get(e)||0)+1; still.set(e,st);
          if(st===100&&(e.path||e.job&&!e.job.working)) out.push(s+' STUCK '+e.kind+'#'+e.idx+' '+e.x.toFixed(2)+','+e.z.toFixed(2)+' job '+JSON.stringify(e.job&&{t:e.job.type,id:e.job.id,w:e.job.working})+' path '+(e.path?e.path.map(p=>p.x.toFixed(2)+','+p.z.toFixed(2)+'f'+p.f+(p.ride?'R':'')).join(' ')+' pi'+e.pi:'none')+' riding '+e.riding+' y '+e.y.toFixed(2)+' speed '+e.speed+' wait '+e.wait.toFixed(2)); } }
      return out.slice(0,15).join('\\n')+'\\ncount '+out.length; })()"""))
    print(errs[:3]); b.close()
