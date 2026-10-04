// Başsız Chromium ile oyun testi. Kullanım: node tests/run.mjs [senaryo] [genişlik] [yükseklik]
// Playwright: scratchpad'deki playwright-core (ya da PW yolu) kullanılır.
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
const require = createRequire(import.meta.url);
const PWDIR = process.env.PW || '/tmp/claude-0/-home-user-default/10c0de8d-664c-5f20-b95e-443b8ad27e6b/scratchpad/pw/node_modules/playwright-core';
const { chromium } = require(PWDIR);
const [scenario = 'boot', W = '1280', H = '800'] = process.argv.slice(2);
const out = path.resolve('tests/shots'); mkdirSync(out, { recursive: true });
const file = 'file://' + path.resolve('dist/konteyner.html');
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const mobile = +W < 600;
const ctx = await browser.newContext({ viewport: { width: +W, height: +H }, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message + '\n' + e.stack));
page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE ' + m.text()); });
await page.goto(file);
await page.waitForTimeout(2500);
const shot = async (n) => page.screenshot({ path: `${out}/${scenario}_${n}.png` });
const ev = (js) => page.evaluate(js);
const mod = await import(path.resolve('tests/scenarios.mjs'));
await mod[scenario]({ page, shot, ev, wait: (ms) => page.waitForTimeout(ms) });
console.log(errors.length ? errors.join('\n') : 'HATA YOK');
await browser.close();
