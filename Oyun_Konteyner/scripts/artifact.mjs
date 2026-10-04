// dist/konteyner.html → dist/artifact.html (claude.ai Artifact sayfası: doctype/html/head/body etiketleri olmadan)
import { readFileSync, writeFileSync } from 'node:fs';
let s = readFileSync('dist/konteyner.html', 'utf8');
const head = s.match(/<head>([\s\S]*?)<\/head>/i)[1].replace(/<meta charset[^>]*>/i, '').replace(/<meta name="viewport"[^>]*>/i, '');
const body = s.match(/<body>([\s\S]*)<\/body>/i)[1];
writeFileSync('dist/artifact.html', head + body);
console.log('dist/artifact.html', (Buffer.byteLength(head + body) / 1024).toFixed(0) + ' KB');
