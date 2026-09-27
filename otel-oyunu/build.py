import os,glob
HERE=os.path.dirname(os.path.abspath(__file__))
CHROME=os.environ.get('CHROME') or (sorted(glob.glob('/opt/pw-browsers/chromium*/chrome-linux*/chrome'))+['chromium'])[0]
import sys
SP=HERE+'/'
P=['p1_core','p2_render','p26_gfx','p3_world','p4_nav','p5_chars','p6_ents','p7_systems','p75_extras','p76_features','p77_polish','p78_mega','p79_mega2','p80_depth','p81_depth2','p82_events','p83_gfx2','p84_ai2','p85_polish3','p86_ops','p87_live','p88_flow','p89_econ','p90_ui','p91_real','p92_view','p8_ui']
g=''.join(open(SP+'src/'+p+'.js').read() for p in P)
open(SP+'src/g.js','w').write(g)
html=open(SP+'src/p0_head.html').read()+g+'\n</script>\n</body>\n</html>\n'
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
off=html.replace('<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>','<script>'+three+'</script>')
assert off!=html
open(SP+'dist/game-offline.html','w').write(off)
