import os,glob
HERE=os.path.dirname(os.path.abspath(__file__))
CHROME=os.environ.get('CHROME') or (sorted(glob.glob('/opt/pw-browsers/chromium*/chrome-linux*/chrome'))+['chromium'])[0]
SP=HERE+'/'
h=open(SP+'src/game.html').read()
h=h.replace('<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>','<script src="three.min.js"></script>')
h=h.replace('\nboot();\n','\n'+open(SP+'src/p9_debug.js').read()+'\nwindow.__err=[];window.addEventListener("error",e=>window.__err.push(e.message));\nboot();\n')
h=h.replace("https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/","t3/examples/js/")
open(SP+'vis.html','w').write(h)
