// Derleme: src/*.js dosyalarını sırayla birleştirir, esbuild ile tek dosyaya paketler.
// Çıktı: dist/index.html, dist/game.js, dist/models.json
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'fs';
import { build } from 'esbuild';

const minify = !process.argv.includes('--dev');
mkdirSync('dist', { recursive: true });
const files = readdirSync('src').filter(f => f.endsWith('.js')).sort();

// Aynı adla iki üst düzey tanım varsa durdur (biri diğerini sessizce ezmesin)
const seen = new Map();
for (const f of files) {
  for (const m of readFileSync('src/' + f, 'utf8').matchAll(/^(?:class|function|const|let|var)\s+([A-Za-z_$][\w$]*)/gm)) {
    if (seen.has(m[1])) { console.error(`HATA: "${m[1]}" hem ${seen.get(m[1])} hem ${f} içinde tanımlı`); process.exit(1); }
    seen.set(m[1], f);
  }
}

let entry = `import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
`;
for (const f of files) entry += `\n// ===== ${f} =====\n` + readFileSync('src/' + f, 'utf8') + '\n';
writeFileSync('dist/_entry.js', entry);

await build({
  entryPoints: ['dist/_entry.js'], bundle: true, format: 'iife', minify, sourcemap: false,
  outfile: 'dist/game.js', target: ['es2020'], legalComments: 'none', logLevel: 'warning',
});

// Modeller: tek bir JSON (base64)
const models = {};
for (const f of readdirSync('models').filter(f => f.endsWith('.glb')).sort())
  models[f.replace('.glb', '')] = readFileSync('models/' + f).toString('base64');
// karakter dokusu ayrı (data: URI ile yüklenir; korumalı sayfada blob: resimleri engellenebiliyor)
models.__colormap = JSON.parse(readFileSync('models/colormap.rgba.json', 'utf8')); // ham RGBA (tools_png2rgba.py)
writeFileSync('dist/models.json', JSON.stringify(models));

const html = readFileSync('index.html', 'utf8');
writeFileSync('dist/index.html', html); // artifact sayfası (iskeleti yayın sırasında eklenir)
// yerel deneme için tam belge
writeFileSync('dist/play.html', '<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>body{margin:0}</style></head><body>' + html + '</body></html>');
console.log('tamam:', files.length, 'dosya,', (readFileSync('dist/game.js').length / 1024).toFixed(0), 'KB oyun,',
  (JSON.stringify(models).length / 1024 / 1024).toFixed(1), 'MB model');
