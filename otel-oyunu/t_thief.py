# Hırsız: kasaya varınca parayı alıp kaçar; kaçarken yakalanırsa para kasaya döner + ödül; çıkışa varırsa para gider
import glob
CHROME=(sorted(glob.glob('/opt/pw-browsers/chromium*/chrome-linux*/chrome'))+['chromium'])[0]
from playwright.sync_api import sync_playwright
A="""(()=>{ const out=[]; try{ state.tut=99; spawnT=1e9; ADMIN.allOpen(); closeModal(); state.piles.desk=1000; pileChanged('desk'); player.x=8; player.z=-8; player.f=0; player.path=null;
  startEmergency('thief'); out.push('start phase '+emerg.phase+' goal:'+emergencyGoal().text);
  // kasaya vardı (yolu bitti)
  emerg.e.path=null; updateEmergency(0.05); out.push('after grab: phase '+emerg.phase+' stolen '+emerg.stolen+' desk '+state.piles.desk+' fleeing path:'+!!emerg.e.path+' goal:'+emergencyGoal().text);
  // kaçarken yakalandı
  player.x=emerg.e.x; player.z=emerg.e.z; const m0=state.money; updateEmergency(0.05); out.push('caught: emerg '+(emerg===null)+' desk back '+state.piles.desk+' reward '+(state.money-m0>0||state.piles.desk>1000));
  // kaçtı senaryosu
  state.piles.desk=1000; player.x=8; player.z=-8; startEmergency('thief'); emerg.e.path=null; updateEmergency(0.05); const st=emerg.stolen; emerg.e.path=null; updateEmergency(0.05); out.push('escaped: emerg '+(emerg===null)+' desk '+state.piles.desk+' (stolen '+st+')');
  }catch(e){ out.push('EXC '+e.stack); } return out.join('\\n'); })()"""
with sync_playwright() as p:
    b=p.chromium.launch(executable_path=CHROME); pg=b.new_page(); errs=[]
    pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.goto('file:///home/user/default/otel-oyunu/test2.html'); pg.wait_for_timeout(1000)
    print(pg.evaluate(A)); print('ERRORS:',errs[:5]); b.close()
