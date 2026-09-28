import glob
CHROME=(sorted(glob.glob('/opt/pw-browsers/chromium*/chrome-linux*/chrome'))+['chromium'])[0]
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(executable_path=CHROME); errs=[]
    for ci in range(6):
        pg=b.new_page(); pg.on('pageerror',lambda e: errs.append(str(e)))
        pg.goto('file:///home/user/default/otel-oyunu/test2.html'); pg.wait_for_timeout(700)
        pg.evaluate(f"(()=>{{ const s=freshState({ci},0); s.tut=99; state=s; save(); }})()"); pg.reload(); pg.wait_for_timeout(900)
        pg.evaluate("ADMIN.allOpen()"); pg.wait_for_timeout(300); print(pg.evaluate("""(()=>{ const bad=[]; const from=f=>f===0?{x:0,z:5}:{x:L.elev.x,z:L.elev.z-1};
          for(const k in state.rooms){ const id=+k, sp=roomSpots(id), s=from(sp.stand.f); if(!findPath(sp.stand.f,s.x,s.z,sp.stand.x,sp.stand.z)) bad.push(id); }
          PADS.forEach(d=>{ const s=from(d.f); if(!findPath(d.f,s.x,s.z,d.x,d.z)) bad.push('pad:'+d.id); });
          return city().name+' plan:'+(cityPlan()||{}).n+' rooms:'+Object.keys(state.rooms).length+' cap:'+cityCapacity()+' nooks:'+[1,2].map(f=>nookG[f]?nookG[f].children.length:0)+' facade:'+!!facadeG+' bad:'+bad.join(','); })()"""))
        pg.close()
    print('errs',errs[:3]); b.close()
