// Derleme (Otel Ustası 2): src/*.js dosyalarını sırayla birleştirir, esbuild ile tek dosyaya paketler.
// Çıktı: dist/index.html (artifact parçası), dist/game.js, dist/models.json, dist/play.html (yerel deneme)
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'fs';
import { build } from 'esbuild';

const minify = !process.argv.includes('--dev');
mkdirSync('dist', { recursive: true });
const files = readdirSync('src').filter(f => f.endsWith('.js')).sort();

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
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
`;
for (const f of files) entry += `\n// ===== ${f} =====\n` + readFileSync('src/' + f, 'utf8') + '\n';
writeFileSync('dist/_entry.js', entry);

await build({
  entryPoints: ['dist/_entry.js'], bundle: true, format: 'iife', minify, sourcemap: false,
  outfile: 'dist/game.js', target: ['es2020'], legalComments: 'none', logLevel: 'warning',
  nodePaths: ['../node_modules'],
});

// Modeller: tek JSON (base64). Dokular ham RGBA (python3 ../tools_png2rgba.py ile üretilir)
const models = {};
// GLB içindeki resim/doku başvurularını çıkar (sayfa korumalı; dokular ham RGBA olarak ayrıca gömülür, çalışırken takılır)
function stripTextures(buf) {
  const jsonLen = buf.readUInt32LE(12); const js = JSON.parse(buf.subarray(20, 20 + jsonLen).toString('utf8'));
  if (!js.images && !js.textures) return buf;
  delete js.images; delete js.textures; delete js.samplers;
  for (const m of js.materials || []) { if (m.pbrMetallicRoughness) { delete m.pbrMetallicRoughness.baseColorTexture; delete m.pbrMetallicRoughness.metallicRoughnessTexture; } delete m.normalTexture; delete m.emissiveTexture; delete m.occlusionTexture; m.extras = Object.assign({}, m.extras, { needsTex: true }); }
  // resim verisi binary chunk'ta kalır (bufferView'ler); zararsız
  let jsStr = JSON.stringify(js); while (jsStr.length % 4) jsStr += ' ';
  const jsBuf = Buffer.from(jsStr, 'utf8'), rest = buf.subarray(20 + jsonLen);
  const out = Buffer.concat([buf.subarray(0, 12), Buffer.alloc(8), jsBuf, rest]);
  out.writeUInt32LE(out.length, 8); out.writeUInt32LE(jsBuf.length, 12); out.writeUInt32LE(0x4E4F534A, 16);
  return out;
}
for (const f of readdirSync('models').filter(f => f.endsWith('.glb')).sort())
  models[f.replace('.glb', '')] = stripTextures(readFileSync('models/' + f)).toString('base64');
models.__tex_char = JSON.parse(readFileSync('models/characters.rgba.json', 'utf8'));
models.__tex_city = JSON.parse(readFileSync('models/city.rgba.json', 'utf8'));
writeFileSync('dist/models.json', JSON.stringify(models));

const html = readFileSync('index.html', 'utf8');
writeFileSync('dist/index.html', html);
writeFileSync('dist/play.html', '<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>body{margin:0}</style></head><body>' + html + '</body></html>');
console.log('tamam:', files.length, 'dosya,', (readFileSync('dist/game.js').length / 1024).toFixed(0), 'KB oyun,', (JSON.stringify(models).length / 1024 / 1024).toFixed(1), 'MB model');
