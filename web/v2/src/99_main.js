// Açılış: sahne, ışıklar, modeller, döngü
function setupRenderer() {
  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.id = 'gl'; renderer.domElement.tabIndex = 0;
  document.body.insertBefore(renderer.domElement, document.getElementById('vig'));

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x9ad0f3);
  scene.fog = new THREE.Fog(0x9ad0f3, 70, 150);
  W = new THREE.Group(); W.name = 'Dunya'; scene.add(W);
  camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, 2, 320);
  scene.add(camera);
  hemiLight = new THREE.HemisphereLight(0xffffff, 0x888866, 1.2); scene.add(hemiLight);
  sunLight = new THREE.DirectionalLight(0xffffff, 3);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(2048, 2048);
  const sc = sunLight.shadow.camera; sc.left = -36; sc.right = 36; sc.top = 36; sc.bottom = -36; sc.near = 1; sc.far = 160;
  sunLight.shadow.bias = -0.0004; sunLight.shadow.normalBias = 0.04; sunLight.shadow.radius = 3;
  scene.add(sunLight); scene.add(sunLight.target);
  Particles.init();
}

async function loadModels(onProgress) {
  const loader = new GLTFLoader();
  let data;
  if (window.__MODELS) data = window.__MODELS; else { const res = await fetch('models.json'); data = await res.json(); }
  const charTex = data.__tex_char ? dataTex(data.__tex_char) : null, cityTex = data.__tex_city ? dataTex(data.__tex_city) : null;
  U.tex.char = charTex; U.tex.city = cityTex;
  const cityNames = new Set(['building-garage', 'building-small-a', 'building-small-b', 'building-small-c', 'building-small-d', 'grass', 'grass-trees', 'grass-trees-tall', 'pavement', 'pavement-fountain', 'road-corner', 'road-intersection', 'road-split', 'road-straight', 'road-straight-lightposts']);
  const names = Object.keys(data).filter(n => !n.startsWith('__'));
  let done = 0;
  await Promise.all(names.map(async n => {
    const bin = Uint8Array.from(atob(data[n]), c => c.charCodeAt(0)).buffer;
    const isCity = cityNames.has(n);
    const g = await new Promise((ok, fail) => loader.parse(bin, '', ok, fail));
    const tex = n.startsWith('character') ? charTex : isCity ? cityTex : null;
    if (tex) g.scene.traverse(o => {
      if (!o.isMesh) return;
      const ms = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of ms) if (m) { if (m.map && m.map !== tex) m.map.dispose(); m.map = tex; m.color.set(0xffffff); m.needsUpdate = true; }
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
  for (let i = lateTasks.length - 1; i >= 0; i--) if (lateTasks[i].step(Time.deltaTime || 0)) lateTasks.splice(i, 1);
  for (const r of Rig.all) { if (r.go.userData.destroyed) { Rig.all.delete(r); continue; } r.update(Time.deltaTime); }
  Particles.update(Time.deltaTime);
  World.Tick(Time.deltaTime);
  Game.Tick(Time.deltaTime);
}

let _last = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const raw = window.__fixedDt || Math.min(0.1, Math.max(0, (now - (_last || now)) / 1000)); // __fixedDt: testte sabit kare süresi
  _last = now;
  Time.timeScale = (UI.Blocking || window.__pause) ? 0 : 1;
  Time.unscaledDeltaTime = raw; Time.deltaTime = raw * Time.timeScale; Time.time += Time.deltaTime; Time.unscaledTime += raw; Time.frameCount++;
  const sub = window.__sub || 1;
  for (let k = 0; k < sub; k++) { if (k > 0) { Time.deltaTime = raw * Time.timeScale; Time.time += Time.deltaTime; } tickLogic(); }
  Cam.Update(raw);
  Hotel.TickDoors(raw);
  Hotel.FrameView();
  applySun();
  Game.Frame(raw);
  UI.Frame(raw);
  Quality.Tick(raw);
  // test: window.__noRender ile çizim seyreltilir (mantık hızlı koşar)
  if (!window.__noRender || Time.frameCount % 15 === 0) { Quality.Render(); Photo.AfterRender(); }
}

async function boot() {
  setupRenderer();
  UI.Init();
  Cam.Setup(renderer.domElement);
  addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); Quality.Resize(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { Game.Save(); Cloud.Push(); } });
  addEventListener('pagehide', () => { Game.Save(); Cloud.Push(); });
  const bar = document.getElementById('loadbar');
  await loadModels(p => { if (bar) bar.style.width = Math.round(p * 100) + '%'; });
  const msg = document.querySelector('#loading p'); if (msg) msg.textContent = 'Kayıt yükleniyor…';
  await Promise.race([Cloud.Init(), new Promise(r => setTimeout(r, 15000))]);
  Cloud.booted = true;
  const ld = document.getElementById('loading'); if (ld) ld.remove();
  Quality.Init();
  World.Build();
  Game.Boot();
  Photo.Init();
  Cam.Snap();
  if (Cloud.restored) UI.Toast('Kayıt buluttan yüklendi', 'info');
  Cloud.OfferBackup();
  setInterval(() => Cloud.Push(), 15000);
  requestAnimationFrame(frame);
  window.__game = { Game, World, Hotel, Cam, UI, Store, U, Time, Guest, Staff, Player, Quality, Cloud, Data, THREE, scene, camera, renderer, Rig, Particles, Tween, Decor, Facilities, worldToScreen };
  window.__ready = true;
}
boot().catch(e => { console.error(e); const ld = document.getElementById('loading'); if (ld) ld.innerHTML = '<div style="color:#fff;padding:20px">Yüklenemedi: ' + e.message + '</div>'; });
