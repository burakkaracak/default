// Giriş noktası: motoru kurar, menüyü gösterir, oyun döngüsünü çalıştırır.
import './ui/style.css';
import { G, setG, freshState } from './core/state.js';
import { bus } from './core/bus.js';
import { time } from './core/time.js';
import { save } from './core/save.js';
import { input } from './core/input.js';
import { sfx } from './core/audio.js';
import { conf } from './core/confidence.js';
import { W } from './locations/world3d.js';
import { storeLoc } from './locations/store.js';
import { factoryLoc } from './locations/factory.js';
import { nisantasiLoc, atasehirLoc } from './locations/branch.js';
import { player } from './characters/player.js';
import { npcs } from './characters/npcs.js';
import { renderPortraits } from './characters/portraits.js';
import * as PR from './factory/production.js';
import { hud } from './ui/hud.js';
import { h, $, modals, toast, goldGlow } from './ui/dom.js';
import { showMenu, hideMenu } from './ui/menu.js';
import { newGame, startLoaded, enterWorld, game } from './core/game.js';
import { openTravel, openElevator } from './ui/travel.js';
import { stationPanel, factoryPanel, shippingPanel, buyExpansion } from './ui/factoryUI.js';
import { deskPanel, inboxPanel, ordersPanel, deskHooks } from './ui/desk.js';
import { talkTo } from './ui/talk.js';
import { gameMenu, whereBun, confidencePanel, nostalgia, verifyBoard, goalsPanel, slotPanel, decorPanel, unlockFloor } from './ui/misc.js';
import { dayPlan } from './ui/reports.js';
import { erpPanel } from './crm/erp.js';
import './crm/actions.js';
import './world/logistics.js';
import * as ORD from './crm/orders.js';
import { setFlag } from './core/story.js';
import { ext } from './ext.js';
import { worldPanel } from './world/map.js';
import { peoplePanel, branchDesk } from './characters/social.js';
import './crm/outreach.js';
import './core/events.js';
import { financePanel } from './economy/financeUI.js';
import './economy/competitors.js';
import { fairsPanel } from './world/fairs.js';
import { studioPanel } from './factory/studio.js';
import { marketingPanel } from './crm/marketing.js';
import { meetingTable } from './core/yk.js';
import './core/late.js';

const canvas = $('#c');
const st = save.settings();
sfx.on = st.sound !== false;
const mobile = matchMedia('(pointer:coarse)').matches;
let quality = st.quality === 'auto' ? (mobile ? 'med' : 'high') : st.quality;
document.body.dataset.q = quality;
W.init(canvas, quality);
W.register(storeLoc); W.register(factoryLoc); W.register(nisantasiLoc); W.register(atasehirLoc);
input.init(canvas);
player.init();
npcs.init();
renderPortraits(W.renderer);
deskHooks.erp = (o, after) => erpPanel(o, after);

// ---- Arayüz yönlendirici ----
const UI = {
  desk: deskPanel,
  inbox: (tab) => { setFlag('openedInbox'); inboxPanel(tab); },
  orders: (id) => ordersPanel(id),
  factory: (tab) => factoryPanel(tab),
  station: (sid) => stationPanel(sid),
  materials: () => factoryPanel('depo'),
  staff: () => factoryPanel('kadro'),
  shipping: shippingPanel,
  travel: openTravel,
  elevator: openElevator,
  talk: (id) => talkTo(id),
  gamemenu: gameMenu,
  goals: goalsPanel,
  whereBun, confidence: confidencePanel, nostalgia, verifyBoard,
  expansion: (id) => buyExpansion(id),
  slot: (f, i) => slotPanel(f, i), decor: decorPanel, unlockFloor: (f) => unlockFloor(f),
  plan: () => dayPlan(),
  world: (id) => worldPanel(id),
  finance: (tab) => financePanel(tab),
  fairs: fairsPanel, studio: studioPanel, marketing: marketingPanel, meetingTable,
  calendar: () => dayPlan(),
  people: () => peoplePanel(),
  branchDesk: (id) => branchDesk(id),
  meetroom: () => toast('Müşteri görüşme odası: yabancı alıcı ziyaretleri burada ağırlanır (Gelen Kutusu\'nda ziyaret haberi gelir).', 'info', 5000),
};
Object.assign(UI, ext.ui);
bus.on('ui', (name, ...args) => {
  const fn = UI[name];
  if (fn) fn(...args); else toast('Bu bölüm yakında açılacak.', 'info');
});
bus.on('sfx', (n) => sfx[n]?.());
bus.on('goldGlow', () => goldGlow());
bus.on('expansion', () => { if (G.player.loc === 'factory' || G.player.loc === 'store') W.enter(G.player.loc, { floor: G.player.floor, x: G.player.x, z: G.player.z }); });
bus.on('voice', (t) => {
  document.querySelectorAll('.innervoice').forEach((e) => e.remove());
  const v = h('div', { class: 'innervoice' }, '💭 ' + t); document.body.append(v); setTimeout(() => v.remove(), 3500);
});
bus.on('bubble', (n, text) => {
  const b = h('div', { class: 'bubble' }, text); n.tag.after(b);
  const upd = () => { const r = n.m.root.position; const s = W.toScreen(r.x, 2.6, r.z); b.style.transform = `translate(${s.x}px,${s.y}px) translate(-50%,-100%)`; };
  upd(); const iv = setInterval(upd, 50); setTimeout(() => { clearInterval(iv); b.remove(); }, 4200);
});

// ---- Oyunu başlat ----
bus.on('startGame', ({ slot, mode, load }) => {
  if (load) { if (!save.load(slot)) return toast('Kayıt okunamadı.', 'bad'); startLoaded(); }
  else newGame(slot, mode || 'story');
  hideMenu();
  hud.build();
  enterWorld();
});
bus.on('toMenu', () => { game.running = false; modals.closeAll(); $('#hud').innerHTML = ''; npcs.clear(); demoScene(); });

// Otomatik kayıt
setInterval(() => { if (game.running && G) save.write(); }, 30000);
document.addEventListener('visibilitychange', () => { if (document.hidden && game.running && G) save.write(); });
addEventListener('pagehide', () => { if (game.running && G) save.write(); });

// Kalite: otomatik modda FPS düşükse kademeli düşür
let lowFps = 0;
bus.on('fps', (fps) => {
  if (save.settings().quality !== 'auto' || !game.running) return;
  if (fps < 40) lowFps++; else lowFps = 0;
  if (lowFps >= 2 && W.quality !== 'low') {
    const q = W.quality === 'high' ? 'med' : 'low';
    W.setQuality(q); if (q !== 'high') { W.renderer.shadowMap.enabled = false; } document.body.dataset.q = q; lowFps = 0;
    toast('Akıcılık için grafik kalitesi düşürüldü: ' + (q === 'med' ? 'Orta' : 'Düşük'), 'info');
  }
});

// ---- Döngü ----
let last = performance.now(), hudT = 0;
function frame(t) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.1, (t - last) / 1000); last = t;
  if (game.running && G) {
    time.slow = modals.open ? 0.3 : 1;
    time.advance(dt);
    if (!W.overlay) { player.update(dt); npcs.update(dt); }
    conf.update(dt);
    hudT += dt; if (hudT > 0.25) { hudT = 0; hud.update(); }
  }
  W.frame(dt);
}
bus.on('tick', (dm) => { if (G) PR.tick(dm); });
requestAnimationFrame(frame);

// Menü arkasında sahne görünsün (geçici bir durumla)
function demoScene() {
  const g = freshState('free'); PR.initFactory(g); setG(g);
  W.enter('factory', { x: 0, z: 2 });
  showMenu();
}
demoScene();
$('#boot').remove();
window.__game = { get G() { return G; }, W, bus, time, PR, save, modals, ORD };
