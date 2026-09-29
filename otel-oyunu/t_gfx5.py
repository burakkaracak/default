# Grafik 5 kontrolü (mock THREE: Reflector/Lensflare yüklenmez → hata vermeden beklemeli; gece ışıkları ve görünürlük mantığı)
import glob
CHROME=(sorted(glob.glob('/opt/pw-browsers/chromium*/chrome-linux*/chrome'))+['chromium'])[0]
from playwright.sync_api import sync_playwright
A="""(()=>{ state.tut=99; ADMIN.allOpen(); const out=[]; closeModal();
  state.gfx='mid'; nightLights.length=0; gfx5Ready=false; bootGfx5(); out.push('mid: lights '+nightLights.length+' ready '+gfx5Ready);
  state.gfx='high'; bootGfx5(); out.push('high no Reflector: lights '+nightLights.length+' ready '+gfx5Ready+' refl '+!!reflLobby);
  let ok=true; try{ for(let i=0;i<3;i++) updateGfx5(); }catch(e){ ok=false; out.push('err '+e); } out.push('update no-throw:'+ok);
  nightF=1; updateGfx5(); out.push('night intensities:'+nightLights.map(o=>o.l.intensity.toFixed(2)).join(','));
  nightF=0; updateGfx5(); out.push('day intensities:'+nightLights.map(o=>o.l.intensity).join(','));
  state.gfx='mid'; nightF=1; updateGfx5(); out.push('mid at night:'+nightLights.map(o=>o.l.intensity).join(','));
  // görünürlük mantığı (mock THREE üzerine yazılamıyor; sahte ayna nesneleriyle)
  reflLobby={visible:true}; reflPool={visible:true}; state.gfx='high';
  viewFloor=0; cam.tx=0; cam.tz=5; state.lowFx=false; updateGfx5(); out.push('vis ground:'+reflLobby.visible+'/'+reflPool.visible);
  viewFloor=2; updateGfx5(); out.push('vis upper floor:'+reflLobby.visible); viewFloor=0; cam.tx=60; updateGfx5(); out.push('vis far:'+reflLobby.visible); cam.tx=0;
  state.lowFx=true; updateGfx5(); out.push('vis lowFx:'+reflLobby.visible); state.lowFx=false; state.gfx='mid'; updateGfx5(); out.push('vis mid:'+reflLobby.visible); reflLobby=null; reflPool=null;
  return out.join('\\n'); })()"""
with sync_playwright() as p:
    b=p.chromium.launch(executable_path=CHROME); pg=b.new_page(); errs=[]
    pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.goto('file:///home/user/default/otel-oyunu/test2.html'); pg.wait_for_timeout(1000)
    print(pg.evaluate(A)); print('ERRORS:',errs[:5]); b.close()
# statik: gerçek Reflector.js'de shader yaması için aranan satırlar hâlâ var mı (three r128)
import os
rf='/home/user/default/otel-oyunu/t3/examples/js/objects/Reflector.js'
if os.path.exists(rf):
    t=open(rf).read(); print('Reflector.js patch anchors:',('uniform vec3 color;' in t) and ('gl_FragColor = vec4( blendOverlay( base.rgb, color ), 1.0 );' in t))
