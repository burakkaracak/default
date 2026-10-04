// ============================================================================
// Açılış: sahne, ışıklar, modeller, girdi ve ana döngü
// ============================================================================
const onGUIs = [];   // { depth, fn } — derinliği büyük olan önce (altta) çizilir
function RegisterGUI(depth, fn) { onGUIs.push({ depth, fn }); }

function setupRenderer() {
  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.id = 'gl';
  document.body.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  scene.background = new THREE.Color();
  scene.fog = new THREE.Fog(0xffffff, 40, 85);
  // Unity uzayı: z ekseni ters çevrilir (Unity solak, three sağlak)
  W = new THREE.Group(); W.name = 'UnityUzayi'; W.scale.z = -1;
  scene.add(W);

  camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 3, 160);
  scene.add(camera);

  hemiLight = new THREE.HemisphereLight(0xffffff, 0x888888, 1);
  scene.add(hemiLight);
  ambLight = new THREE.AmbientLight(0xffffff, 0.0);
  scene.add(ambLight);

  sunLight = new THREE.DirectionalLight(0xffffff, 4);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(2048, 2048);
  const sc = sunLight.shadow.camera; sc.left = -28; sc.right = 28; sc.top = 28; sc.bottom = -28; sc.near = 1; sc.far = 120;
  sunLight.shadow.bias = -0.0005; sunLight.shadow.normalBias = 0.03;
  scene.add(sunLight); scene.add(sunLight.target);

  GUI.cv = document.getElementById('ui');
  GUI.ctx = GUI.cv.getContext('2d');
  Particles.init();
}

// Unity kamera konumu/yönü → three kamerası
const CamState = { pos: V(0, 17.6, -13.75), rot: { x: 52, y: 0 } };
function applyCamera() {
  const p = CamState.pos;
  camera.position.set(p.x, p.y, -p.z);
  const rx = CamState.rot.x * Mathf.Deg2Rad, ry = CamState.rot.y * Mathf.Deg2Rad;
  const f = V(Math.sin(ry) * Math.cos(rx), -Math.sin(rx), Math.cos(ry) * Math.cos(rx));
  camera.lookAt(p.x + f.x, p.y + f.y, -(p.z + f.z));
}
// Güneş yönü (Unity Euler) → ışık konumu; gölge kamerası hedefi takip eder
const SunState = { x: 52, y: -38, target: V(0, 0, 0) };
function applySun() {
  const rx = SunState.x * Mathf.Deg2Rad, ry = SunState.y * Mathf.Deg2Rad;
  const f = V(Math.sin(ry) * Math.cos(rx), -Math.sin(rx), Math.cos(ry) * Math.cos(rx)); // Unity yönü
  const t = SunState.target;
  sunLight.target.position.set(t.x, 0, -t.z);
  sunLight.position.set(t.x - f.x * 50, -f.y * 50, -(t.z - f.z * 50));
}

// Ekran noktasının Unity uzayında zemine (y=0) izdüşümü
function screenToGround(px, py, y = 0) {
  const ndc = new THREE.Vector2(px / innerWidth * 2 - 1, -(py / innerHeight) * 2 + 1);
  const rc = new THREE.Raycaster(); rc.setFromCamera(ndc, camera);
  const o = rc.ray.origin, d = rc.ray.direction;
  if (Math.abs(d.y) < 1e-6) return null;
  const t = (y - o.y) / d.y; if (t < 0) return null;
  return V(o.x + d.x * t, y, -(o.z + d.z * t));
}
// Unity dünya noktası → ekran (CSS px)
function worldToScreen(p) {
  const v = new THREE.Vector3(p.x, p.y, -p.z).project(camera);
  return { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight, z: v.z };
}

function setupInput() {
  const down = (x, y) => { Input.pointerDown = true; Input.pointerPos = { x, y }; Input.pressPos = { x, y }; Input.clicked = true; Sfx.Init(); Sfx.Resume(); if (typeof Music !== 'undefined' && Music.Resume) Music.Resume(); };
  const move = (x, y) => { Input.pointerPos = { x, y }; };
  const up = (x, y) => { Input.pointerDown = false; Input.pointerPos = { x, y }; Input.released = true; Input.releasePos = { x, y }; };
  const el = document.getElementById('ui');
  el.addEventListener('pointerdown', e => { window.focus(); el.setPointerCapture(e.pointerId); if (document.activeElement && document.activeElement.tagName === 'INPUT') document.activeElement.blur(); down(e.clientX, e.clientY); e.preventDefault(); });
  el.addEventListener('pointermove', e => { move(e.clientX, e.clientY); });
  el.addEventListener('pointerup', e => { up(e.clientX, e.clientY); });
  el.addEventListener('pointercancel', e => { up(e.clientX, e.clientY); });
  el.addEventListener('wheel', e => { Input.wheel += e.deltaY; e.preventDefault(); }, { passive: false });
  addEventListener('keydown', e => { Input.keys.add(e.code); Sfx.Init(); Sfx.Resume(); if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault(); });
  addEventListener('keyup', e => Input.keys.delete(e.code));
  // Artifact bir çerçeve (iframe) içinde açılır: pointerdown'da preventDefault yüzünden çerçeve klavye odağını alamıyordu.
  // Tıklayınca ve açılışta odağı oyuna al ki WASD / ok tuşları çalışsın.
  try { window.focus(); } catch (e) { }
  addEventListener('blur', () => { Input.keys.clear(); Input.pointerDown = false; });
  addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); Quality.Resize(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && GameManager.I) { GameManager.I.Save(); Cloud.Push(); } });
  addEventListener('pagehide', () => { if (GameManager.I) { GameManager.I.Save(); Cloud.Push(); } });
}

async function loadModels(onProgress) {
  const loader = new GLTFLoader();
  let data;
  if (window.__MODELS) data = window.__MODELS;
  else {
    const res = await fetch('models.json');
    data = await res.json();
  }
  // Karakter dokusu: data: URI'den (Safari'de modelin içindeki resim blob: ile yüklenemeyebiliyor)
  // Karakter dokusu ham piksel olarak gömülü: çalışırken resim çözülmez (oyun paneli resim yüklemeyi engelleyebiliyor)
  let charTex = null;
  if (data.__colormap) {
    const c = data.__colormap;
    const px = Uint8Array.from(atob(c.rgba), ch => ch.charCodeAt(0));
    charTex = new THREE.DataTexture(px, c.w, c.h, THREE.RGBAFormat);
    charTex.colorSpace = THREE.SRGBColorSpace; charTex.flipY = false;
    charTex.magFilter = THREE.NearestFilter; charTex.minFilter = THREE.NearestFilter; charTex.generateMipmaps = false;
    charTex.needsUpdate = true;
  }
  const names = Object.keys(data).filter(n => !n.startsWith('__'));
  let done = 0;
  await Promise.all(names.map(async n => {
    const bin = Uint8Array.from(atob(data[n]), c => c.charCodeAt(0)).buffer;
    const g = await new Promise((ok, fail) => loader.parse(bin, '', ok, fail));
    if (charTex && n.startsWith('character')) g.scene.traverse(o => {
      if (!o.isMesh) return;
      const ms = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of ms) if (m) { if (m.map && m.map !== charTex) m.map.dispose(); m.map = charTex; m.color.set(0xffffff); }
    });
    U.models[n] = { scene: g.scene, animations: g.animations };
    done++; onProgress && onProgress(done / names.length);
  }));
}

function tickLogic() {
  for (let i = 0; i < behaviours.length; i++) {
    const b = behaviours[i];
    if (b.go.userData.destroyed) { behaviours.splice(i, 1); i--; continue; }
    if (b.enabled && b.Update && activeInHierarchy(b.go)) b.Update();
  }
  for (let i = 0; i < behaviours.length; i++) {
    const b = behaviours[i];
    if (!b.go.userData.destroyed && b.enabled && b.LateUpdate && activeInHierarchy(b.go)) b.LateUpdate();
  }
  for (let i = lateTasks.length - 1; i >= 0; i--) if (lateTasks[i].step(Time.deltaTime || 0)) lateTasks.splice(i, 1);
  for (const r of Rig.all) { if (r.go.userData.destroyed) { Rig.all.delete(r); continue; } r.update(Time.deltaTime); }
  Particles.update(Time.deltaTime);
}

let _last = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const raw = Math.min(0.1, Math.max(0, (now - (_last || now)) / 1000));
  _last = now;
  Time.unscaledDeltaTime = raw;
  Time.deltaTime = raw * Time.timeScale;
  Time.time += Time.deltaTime;
  Time.unscaledTime += raw;
  Time.frameCount++;

  // test için: bir karede birden çok mantık adımı (window.__sub)
  const sub = window.__sub || 1;
  for (let k = 0; k < sub; k++) {
    if (k > 0) { Time.deltaTime = raw * Time.timeScale; Time.time += Time.deltaTime; }
    tickLogic();
  }
  applyCamera();
  applySun();
  Quality.Tick(raw);
  Quality.Render();
  Photo.AfterRender();

  // arayüz: derinliği büyük olan önce çizilir (Unity GUI.depth)
  // arayüz ölçeği: masaüstünde Unity'deki gibi (yükseklik/1080); telefonda okunur kalsın
  GUI.scale = innerWidth >= innerHeight ? Math.max(innerHeight / 1080, Math.min(0.55, innerWidth / 1500))
    : Math.min(innerWidth / 740, innerHeight / 1080);
  GUI.begin();
  onGUIs.sort((a, b) => b.depth - a.depth);
  for (const g of onGUIs) { try { GUI.color = C(1, 1, 1, 1); g.fn(); } catch (e) { console.error(e); } }
  GUI.end();
  Store.Save();
}

async function boot() {
  setupRenderer();
  setupInput();
  const bar = document.getElementById('loadbar');
  await loadModels(p => { if (bar) bar.style.width = Math.round(p * 100) + '%'; });
  // bulut kaydı (en fazla 6 sn beklenir)
  const msg = document.querySelector('#loading p'); if (msg) msg.textContent = 'Kayıt yükleniyor…';
  await Promise.race([Cloud.Init(), new Promise(r => setTimeout(r, 6000))]);
  Cloud.booted = true;
  const ld = document.getElementById('loading'); if (ld) ld.remove();
  GameManager.Boot();
  Quality.Init();
  Photo.Init();
  if (Cloud.restored) GameManager.I.Notify('Kayıt buluttan yüklendi');
  setInterval(() => Cloud.Push(), 15000);
  requestAnimationFrame(frame);
  // test ve hata ayıklama için
  window.__game = { GameManager, Popups, Store, U, Time, Customer, Room, Quests, Events, Seasons, Story, Reception, Chain, Menu, Input, GUI, CamState, W, scene, camera, renderer, Tween, Vec, V, THREE, Quality, Wedding, Photo, Social };
  window.__ready = true;
}
boot().catch(e => { console.error(e); const ld = document.getElementById('loading'); if (ld) ld.innerHTML = '<div style="color:#fff;padding:20px">Yüklenemedi: ' + e.message + '</div>'; });
