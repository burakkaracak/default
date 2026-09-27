import os,glob
HERE=os.path.dirname(os.path.abspath(__file__))
CHROME=os.environ.get('CHROME') or (sorted(glob.glob('/opt/pw-browsers/chromium*/chrome-linux*/chrome'))+['chromium'])[0]
SP=HERE+''
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(executable_path=CHROME)
    pg=b.new_page(); errs=[]
    pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.goto('file://'+SP+'/test2.html'); pg.wait_for_timeout(800)
    pg.add_script_tag(path=SP+'/bot.js')
    print(pg.evaluate("""(()=>{ state.tut=5; ['r102','r103','depo','r101','r104','staff','r106','cafe'].forEach(id=>completePad(PADMAP[id])); ADMIN.staffMax(); window.botThink=()=>{}; spawnT=1e9;
      const blocked=L.staffIdle.map(s=>blockedAt(0,s[0],s[1],0.22)?1:0).join('');
      let repaths=0; const g0=Ent.prototype.goTo; Ent.prototype.goTo=function(...a){ if(this.kind&&!this.job) repaths++; return g0.apply(this,a); };
      for(let s=0;s<1200;s++) simStep(0.05);
      const idle=staffEnts.filter(e=>!e.job&&e.kind!=='rec'); let minD=9;
      for(let i=0;i<idle.length;i++) for(let j=i+1;j<idle.length;j++) minD=Math.min(minD,Math.hypot(idle[i].x-idle[j].x,idle[i].z-idle[j].z));
      const r0=repaths; for(let s=0;s<600;s++) simStep(0.05);
      return 'blocked spots '+blocked+' | idle '+idle.length+' minDist '+minD.toFixed(2)+' | idle repaths in 30s after settle: '+(repaths-r0)+' | '+idle.map(e=>e.kind+'@'+e.x.toFixed(2)+','+e.z.toFixed(2)+(e.idleDone?'✓':'')).join(' '); })()"""))
    print(errs[:3]); b.close()
