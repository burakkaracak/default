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
    print(pg.evaluate("""(()=>{ state.tut=5; """+sys.argv[1]+"""
      const out={}; const add=(k,m)=>{ out[k]=out[k]||{n:0,ex:[]}; out[k].n++; if(out[k].ex.length<4) out[k].ex.push(m); };
      const jobT=new Map(); const days=+"""+sys.argv[2]+""";
      for(let s=0;s<days*DAY_SEC/0.05;s++){ if(s%3===0) botThink(); simStep(0.05);
        if(s%10) continue;
        for(const e of staffEnts){
          const tag=e.kind+'#'+e.idx;
          if(!e.riding&&blockedAt(e.f,e.x,e.z,0.12)) add('insideCollider',tag+' '+e.x.toFixed(2)+','+e.z.toFixed(2)+' f'+e.f+' job '+(e.job&&e.job.type));
          const key=e.job?e.job.type+e.job.id:null; const j=jobT.get(e);
          if(key){ if(!j||j.k!==key) jobT.set(e,{k:key,t:s}); else if(s-j.t===1200) add('jobOver60s',tag+' '+key+' at '+e.x.toFixed(2)+','+e.z.toFixed(2)+' f'+e.f+' path '+(e.path?e.path.length:0)+' w '+(e.job.working)); } else jobT.delete(e);
        }
        if(s%200===0){
          const idleC=staffEnts.filter(e=>e.kind==='clean'&&!e.job).length, dirtyFree=roomsWhere(id=>state.rooms[id].dirty&&!RT(id).task).length;
          if(idleC&&dirtyFree) add('cleanerIdleButDirty','idle '+idleC+' dirty '+dirtyFree+' '+staffEnts.filter(e=>e.kind==='clean'&&!e.job).map(e=>e.x.toFixed(1)+','+e.z.toFixed(1)+' w'+e.wait.toFixed(1)+' p'+(e.path?1:0)).join(';'));
          const idleB=staffEnts.filter(e=>e.kind==='bell'&&!e.job).length, reqFree=roomsWhere(id=>RT(id).req&&!RT(id).req.by).length;
          if(idleB&&reqFree) add('bellIdleButReq','idle '+idleB+' req '+reqFree);
        }
      }
      return JSON.stringify(out,null,1)+'\\nstaff '+JSON.stringify(Object.values(state.staff).map(s=>s.n))+' built '+Object.keys(state.built).length; })()"""))
    print(errs[:3]); b.close()
