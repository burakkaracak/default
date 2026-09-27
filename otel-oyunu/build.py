import os,glob
HERE=os.path.dirname(os.path.abspath(__file__))
CHROME=os.environ.get('CHROME') or (sorted(glob.glob('/opt/pw-browsers/chromium*/chrome-linux*/chrome'))+['chromium'])[0]
import sys
SP=HERE+'/'
P=['p1_core','p2_render','p26_gfx','p3_world','p4_nav','p5_chars','p6_ents','p7_systems','p75_extras','p76_features','p77_polish','p78_mega','p79_mega2','p80_depth','p81_depth2','p8_ui']
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
