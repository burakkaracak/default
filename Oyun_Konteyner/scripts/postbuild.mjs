// dist/index.html → dist/konteyner.html (tek dosya, çift tıklayınca açılır)
import { copyFileSync, statSync } from 'node:fs';
copyFileSync('dist/index.html', 'dist/konteyner.html');
console.log('dist/konteyner.html', (statSync('dist/konteyner.html').size / 1024).toFixed(0) + ' KB');
