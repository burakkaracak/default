import os,glob
HERE=os.path.dirname(os.path.abspath(__file__))
CHROME=os.environ.get('CHROME') or (sorted(glob.glob('/opt/pw-browsers/chromium*/chrome-linux*/chrome'))+['chromium'])[0]
import sys
SP=HERE+'/'
P=['p1_core','p2_render','p26_gfx','p3_world','p4_nav','p5_chars','p6_ents','p7_systems','p75_extras','p76_features','p77_polish','p78_mega','p79_mega2','p80_depth','p81_depth2','p82_events','p83_gfx2','p84_ai2','p85_polish3','p86_ops','p87_live','p88_flow','p89_econ','p90_ui','p91_real','p92_view','p93_content','p94_mescit','p95_perf','p96_gfx3','p97_city','p98_ops2','p99_world','p9a_gfx4','p9b_endgame','p9c_next','p9d_gfx5','p9e_loda','p9f_curve','p8_ui']
# güvenlik: parçalar tek script'te birleştiği için aynı adlı iki üst düzey `function` sessizce birbirini ezer
# (v46-47'de p96 updateSky gece aydınlatmasını böyle bozmuştu) -> build durur
import re as _re, collections as _col
_seen=_col.defaultdict(list)
for _p in P:
    for _i,_l in enumerate(open(SP+'src/'+_p+'.js').read().split('\n')):
        if _l.startswith(' ') or _l.startswith('\t'): continue
        for _m in _re.finditer(r'(?:^|[;}]\s*)function\s+([A-Za-z_$][\w$]*)\s*\(',_l): _seen[_m.group(1)].append('%s:%d'%(_p,_i+1))
_dup={k:v for k,v in _seen.items() if len(v)>1}
if _dup:
    print('HATA: aynı adlı fonksiyon birden çok kez tanımlı:'); [print('  ',k,v) for k,v in _dup.items()]; sys.exit(1)
g=open(SP+'vendor/adhan.umd.min.js').read()+';\n'+''.join(open(SP+'src/'+p+'.js').read() for p in P)
open(SP+'src/g.js','w').write(g)
import base64,glob as _g
snd='<script>window.__SND={'+','.join('"%s":"data:audio/mpeg;base64,%s"'%(os.path.basename(f)[:-4],base64.b64encode(open(f,'rb').read()).decode()) for f in sorted(_g.glob(SP+'snd/*.mp3')))+'}</script>\n'
head=open(SP+'src/p0_head.html').read()
i=head.rfind('<script>')
html=head[:i]+snd+head[i:]+g+'\n</script>\n</body>\n</html>\n'
open(SP+'src/game.html','w').write(html)
t=html.replace('<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>','<script>'+open(SP+'mock2.js').read()+'</script>')
if '--bot' in sys.argv: t=t.replace('\nboot();\n','\n'+open(SP+'bot.js').read()+'\nboot();\n')
if '--demo' in sys.argv: t=t.replace('\nboot();\n','\n'+open(SP+'src/p9_debug.js').read()+'\nboot();\n')
open(SP+'test2.html','w').write(t)
open(SP+'chk.js','w').write(g)
print('lines',len(html.splitlines()))
# dağıtım: dist/game.html (CDN'li, artifact ile aynı) + dist/game-offline.html (three.js gömülü, internetsiz açılır)
os.makedirs(SP+'dist',exist_ok=True)
open(SP+'dist/game.html','w').write(html)
three=open(SP+'three.min.js').read().replace('</script','<\\/script')
import base64,shutil
shutil.copy(SP+'src/ezan.mp3',SP+'dist/ezan.mp3')
ez='<script>window.__EZAN="data:audio/mpeg;base64,'+base64.b64encode(open(SP+'src/ezan.mp3','rb').read()).decode()+'"</script>'
off=html.replace('<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>','<script>'+three+'</script>'+ez)
assert off!=html
open(SP+'dist/game-offline.html','w').write(off)
