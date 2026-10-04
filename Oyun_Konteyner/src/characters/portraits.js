// Karakter portreleri: her karakterin kafası bir kez çizilip resme (dataURL) çevrilir.
import * as THREE from 'three';
import { makePerson } from './model.js';
import { CH } from '../core/state.js';

export const portraits = {};
export function renderPortraits(renderer) {
  const size = 160;
  const rt = new THREE.WebGLRenderTarget(size, size, { colorSpace: THREE.SRGBColorSpace });
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight('#FFF8EC', '#B8AE9C', 1.9));
  const d = new THREE.DirectionalLight('#FFF1DC', 1.0); d.position.set(1, 2, 3); scene.add(d);
  const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 10); cam.position.set(0.35, 1.62, 1.75); cam.lookAt(0, 1.38, 0);
  const buf = new Uint8Array(size * size * 4);
  const cv = document.createElement('canvas'); cv.width = cv.height = size; const ctx = cv.getContext('2d');
  const prevTarget = renderer.getRenderTarget();
  const list = [...CH.list.map((c) => [c.id, c.look])];
  CH.workerLooks.forEach((l, i) => list.push(['worker' + i, l]));
  for (const [id, look] of list) {
    const m = makePerson(look); m.root.rotation.y = 0.25; scene.add(m.root);
    scene.background = new THREE.Color(id.startsWith('worker') ? '#E2E6E2' : '#EDE7D8');
    renderer.setRenderTarget(rt); renderer.clear(); renderer.render(scene, cam);
    renderer.readRenderTargetPixels(rt, 0, 0, size, size, buf);
    const img = ctx.createImageData(size, size);
    for (let y = 0; y < size; y++) img.data.set(buf.subarray((size - 1 - y) * size * 4, (size - y) * size * 4), y * size * 4);
    ctx.putImageData(img, 0, 0);
    portraits[id] = cv.toDataURL('image/png');
    scene.remove(m.root);
  }
  renderer.setRenderTarget(prevTarget);
  rt.dispose();
}
