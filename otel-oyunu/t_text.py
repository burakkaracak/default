# Uzun Türkçe metin taşma testi (telefon 390x844): baş üstü etiketler, resepsiyon onayı, oda değişimi, toast, sohbet, Otel sekmeleri.
# Bir elemanın scrollWidth>clientWidth, ekran dışına çıkması ya da genişliğinin ekranı aşması "taşma" sayılır.
import glob, os
HERE=os.path.dirname(os.path.abspath(__file__))
CHROME=(sorted(glob.glob('/opt/pw-browsers/chromium*/chrome-linux*/chrome'))+['chromium'])[0]
from playwright.sync_api import sync_playwright
SCAN="""(rootSel,label)=>{ const W=innerWidth, out=[]; const root=document.querySelector(rootSel); if(!root) return [label+': KÖK YOK '+rootSel];
  const els=[root,...root.querySelectorAll('*')];
  for(const e of els){ const cs=getComputedStyle(e); if(cs.display==='none'||cs.visibility==='hidden'||e.classList.contains('tag')) continue; const r=e.getBoundingClientRect(); if(!r.width||!r.height) continue;
    if(e.closest('svg')||e.tagName==='INPUT') continue; let sp=e.parentElement, inScroll=false; while(sp&&sp!==document.body){ const o=getComputedStyle(sp).overflowX; if((o==='auto'||o==='scroll')&&sp.scrollWidth>sp.clientWidth&&sp.id!=='sheet'&&sp.id!=='modal'){ inScroll=true; break; } sp=sp.parentElement; } if(inScroll) continue;
    const txt=(e.childNodes.length&&[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim()));
    const sc=txt&&e.scrollWidth>e.clientWidth+1&&cs.display!=='inline', off=r.right>W+1||r.left<-1;
    if(sc||off) out.push(label+' <'+e.tagName.toLowerCase()+'.'+(e.className||'')+'> '+(sc?'scrollW '+e.scrollWidth+'>'+e.clientWidth+' ':'')+(off?'ekran dışı L'+Math.round(r.left)+' R'+Math.round(r.right)+' ':'')+'"'+(e.textContent||'').trim().slice(0,50)+'"'); }
  return out; }"""
SETUP="""(()=>{ state.tut=99; spawnT=1e9; ADMIN.allOpen(); state.money=5e5; closeModal(); return 1; })()"""
# baş üstü etiketler: gerçek renderTags HTML'i yerine aynı sınıflarla sahte .tag konur (mock kamerada konum güvenilmez)
TAGS="""(()=>{ const box=document.getElementById('tags')||document.body; document.querySelectorAll('.tt').forEach(x=>x.remove());
  const H=['<div class="bubble warn small txt">⚡ Elektrik yok! Elektrik yok, lütfen jeneratörü ve sigortaları kontrol edin</div>','<div class="bubble warn small txt">🛏️ Hazır oda yok!</div>','<div class="bubble small">💵 12.500</div>','<div class="bubble req">🍽️</div>'];
  H.forEach((h,i)=>{ const t=document.createElement('div'); t.className='tag tt'; t.style.transform='translate(195px,'+(120+i*70)+'px)'; t.innerHTML=h; box.appendChild(t); }); return 1; })()"""
TRIG=[
 ("etiket", TAGS, "#tags"),
 ("deskAsk", "(()=>{ const g=spawnGuest('tourist'); g.name='Muhammed Abdurrahman Karaçelebioğlu'; g.nights=9; showAsk(g,'rec'); return 1; })()", "#deskAsk"),
 ("upsell", "(()=>{ closeModal(); const g=spawnGuest('tourist'); const id=+Object.keys(state.rooms)[0]; g.room=id; g.name='Muhammed Abdurrahman Karaçelebioğlu'; g.state='room'; try{ if(!upsellDilemma(g)) throw 'no'; }catch(e){ modalWrap.classList.remove('show'); state.rooms[id].type='std'; upsellDilemma(g); } return 1; })()", "#modal"),
 ("toast", "(()=>{ closeModal(); const R='Alkol yasağını bilmiyordum, hayal kırıklığı. Kuralları net, personel saygılı; bir dahakine şişesiz gelirim.'; toast('★★☆☆☆ Muhammed Abdurrahman Karaçelebioğlu: “'+R+'”','bad'); toast('🍾 Muhammed Abdurrahman Karaçelebioğlu şişesini emanete bıraktı, giriş yapıyor'); return 1; })()", "#toasts"),
 ("sohbet", "(()=>{ closeModal(); const g=spawnGuest('tourist'); g.chat=[{who:'them',text:'Odamın manzarası beklediğim gibi değil, daha iyi bir odaya geçebilir miyim? Üst katlarda boş oda var mı, manzaralı bir oda istiyorum.'},{who:'me',text:'Elbette efendim, hemen resepsiyonla ilgilenip size uygun bir oda ayarlıyoruz.'}]; guests.push(g); openChat(g); return 1; })()", "#sheet"),
 ("otel-gen","(()=>{ closeSheet(); mgmtTab='hotel'; hotelSub='gen'; openSheet('mgmt'); return 1; })()", "#sheet"),
 ("otel-eco","(()=>{ hotelSub='eco'; openSheet('mgmt'); return 1; })()", "#sheet"),
 ("otel-evt","(()=>{ hotelSub='evt'; openSheet('mgmt'); return 1; })()", "#sheet"),
 ("otel-rule","(()=>{ hotelSub='rule'; openSheet('mgmt'); return 1; })()", "#sheet"),
 ("otel-city","(()=>{ hotelSub='city'; openSheet('mgmt'); return 1; })()", "#sheet"),
]
def run(w=390,h=844,quiet=False):
    total=[]; errs=[]
    with sync_playwright() as p:
        b=p.chromium.launch(executable_path=CHROME); pg=b.new_page(viewport={'width':w,'height':h})
        pg.on('pageerror',lambda e: errs.append(str(e)))
        pg.goto('file://'+HERE+'/test2.html'); pg.wait_for_timeout(1000); pg.evaluate(SETUP)
        for name,js,sel in TRIG:
            try:
                pg.evaluate(js); pg.wait_for_timeout(350)
                r=pg.evaluate(SCAN,[sel,name]) if False else pg.evaluate("([s,l])=>("+SCAN+")(s,l)",[sel,name])
            except Exception as e:
                r=[name+': HATA '+str(e)[:120]]; errs.append(name+' '+str(e)[:120])
            total+=r
        b.close()
    return total,errs
if __name__=='__main__':
    for w in (390,):
        tot,errs=run(w)
        for t in tot: print(t)
        print('viewport',w,'taşan eleman:',len([t for t in tot if 'HATA' not in t and 'KÖK YOK' not in t]))
    print('ERRORS:',errs[:5])
