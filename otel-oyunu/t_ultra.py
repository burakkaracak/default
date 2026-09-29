# MG11-A Ultra: seviye yardımcıları, applyGfx('ultra') hatasız, ayar düğmesi, FPS kalkanı ultra→high, huzmeler (mock THREE) ve ultraFrame güvenli
import glob
CHROME=(sorted(glob.glob('/opt/pw-browsers/chromium*/chrome-linux*/chrome'))+['chromium'])[0]
from playwright.sync_api import sync_playwright
A="""(()=>{ const out=[]; try{ state.tut=99; ADMIN.allOpen(); closeModal();
  state.gfx='high'; out.push('high: gfxHigh '+gfxHigh()+' ultra '+gfxUltra());
  state.gfx='ultra'; out.push('ultra: gfxHigh '+gfxHigh()+' ultra '+gfxUltra()+' level '+gfxLevel());
  let ok=true; try{ applyGfx(); }catch(e){ ok=false; out.push('applyGfx err '+e); } out.push('applyGfx no-throw:'+ok+' postState:'+postState);
  ok=true; try{ ultraFrame(); updateUltra(1); updateShafts(); }catch(e){ ok=false; out.push('frame err '+e); } out.push('ultraFrame/updateUltra no-throw:'+ok+' shafts:'+!!shaftG+' shaftKids:'+(shaftG?shaftG.children.length:0));
  out.push('ultraHtml:'+/Ultra/.test(ultraHtml())+' grain uniform:'+('grain' in GradeShader.uniforms)+' shader has grain:'+/grain/.test(GradeShader.fragmentShader)+' POST_FILES bokeh/smaa:'+POST_FILES.some(f=>/BokehPass/.test(f))+POST_FILES.some(f=>/SMAAPass/.test(f)));
  lastUserT=performance.now(); openSettings(); out.push('settings ultra button:'+!!modal.querySelector('[data-gfx="ultra"]')+' note:'+/Ultra:/.test(modal.innerHTML)); closeModal();
  // FPS kalkanı: ultra → high
  state.gfxAuto=true; fpsWarm=99; fpsAcc=0; fpsN=0; for(let i=0;i<20;i++) trackFps(0.25); out.push('after slow frames: gfx '+state.gfx);
  state.gfx='high'; out.push('mid check: '+(gfxHigh()&&!gfxUltra()));
  save(); }catch(e){ out.push('EXC '+e.stack); } return out.join('\\n'); })()"""
with sync_playwright() as p:
    b=p.chromium.launch(executable_path=CHROME); pg=b.new_page(); errs=[]
    pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.goto('file:///home/user/default/otel-oyunu/test2.html'); pg.wait_for_timeout(1000)
    print(pg.evaluate(A)); print('ERRORS:',errs[:5]); b.close()
