# Testleri aynı anda çalıştırır (en çok 3), sonunda geçti/kaldı özeti verir. Her testin çıktısı test_ciktilari/<ad>.log
# Kullanım: python3 testler.py test_flow.py test_wc.py "test_iphone.py iphone_shots --cihaz mac"
import sys, subprocess, os, time, shlex
HERE = os.path.dirname(os.path.abspath(__file__))
LOG = os.path.join(HERE, 'test_ciktilari'); os.makedirs(LOG, exist_ok=True)
MAX = int(os.environ.get('TEST_PARALEL', '3'))
todo = sys.argv[1:] or ['test_flow.py']
run, done, t0 = [], [], time.time()
def name(cmd): a = shlex.split(cmd); return a[0][:-3] + ('_' + a[a.index('--cihaz') + 1] if '--cihaz' in a else '')
while todo or run:
    while todo and len(run) < MAX:
        cmd = todo.pop(0); f = open(os.path.join(LOG, name(cmd) + '.log'), 'w')
        run.append((cmd, subprocess.Popen([sys.executable] + shlex.split(cmd), cwd=HERE, stdout=f, stderr=subprocess.STDOUT), time.time()))
    for r in run[:]:
        if r[1].poll() is not None:
            run.remove(r); done.append((r[0], r[1].returncode, time.time() - r[2]))
            print(('GEÇTİ ' if r[1].returncode == 0 else 'KALDI ') + r[0] + f'  ({(time.time() - r[2]) / 60:.1f} dk)', flush=True)
    time.sleep(1)
bad = [d for d in done if d[1] != 0]
print(f'\nToplam {(time.time() - t0) / 60:.1f} dk · ' + ('HEPSİ GEÇTİ' if not bad else f'{len(bad)} test kaldı: ' + ', '.join(d[0] for d in bad) + ' (ayrıntı test_ciktilari/*.log)'))
sys.exit(1 if bad else 0)
