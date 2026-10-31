// main.js - Cảnh chùa 3D "Chùa Ảo 9 Sạch" (Mục 2 + gắn avatar Mục 3). Three.js + bloom.
// Chỉnh nhanh: sửa các hằng số trong khối CONFIG ngay dưới đây.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import * as T from './textures.js';
import { createAvatars } from './avatars.js';

/* ============================== CONFIG ============================== */
const Q = new URLSearchParams(location.search);
const FULL = Q.get('full') === '1';                 // ?full=1 -> lấp đầy cửa sổ thay vì khung 9:16
const BLOOM = parseFloat(Q.get('bloom') ?? '0.45'); // độ phát sáng
const CAMERAS = {                                   // phím 1/2/3 đổi góc máy
  wide:  { pos: [0, 5.4, 11.5], look: [0, 2.3, -9], fov: 50 },
  altar: { pos: [0, 2.8, -3.0], look: [0, 2.6, -11], fov: 50 },
  top:   { pos: [0, 12.5, 7.0], look: [0, 0.0, -4], fov: 50 },
};
/* ==================================================================== */

const stage = document.getElementById('stage');
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.8;
stage.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0403);
scene.fog = new THREE.FogExp2(0x1d0d06, 0.022);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

const camera = new THREE.PerspectiveCamera(50, 9 / 16, 0.1, 90);

/* ----------------------------- vật liệu ----------------------------- */
function pbr(tex, { repeat = [1, 1], rough = 0.7, metal = 0, env = 0.25, color } = {}) {
  const m = new THREE.MeshStandardMaterial({ roughness: rough, metalness: metal, envMapIntensity: env });
  if (color !== undefined) m.color = new THREE.Color(color);
  if (tex.map) m.map = T.makeTex(tex.map, { repeat });
  if (tex.normal) { m.normalMap = T.makeTex(tex.normal, { color: false, repeat }); m.normalScale = new THREE.Vector2(0.9, 0.9); }
  return m;
}
const woodTex = T.texWood(3, [46, 29, 19]);
const darkWoodTex = T.texWood(8, [30, 19, 13]);
const lacTex = T.texLacquer(5);
const stoneTex = T.texStone(17, 4);
const carpetTex = T.texCarpet();
const latticeTex = T.texLattice();

const M = {
  floor: pbr(stoneTex, { repeat: [3.5, 7.5], rough: 0.38, metal: 0.1, env: 0.6 }),
  carpet: pbr(carpetTex, { repeat: [1, 1.875], rough: 0.95, env: 0.1 }),
  wall: pbr(darkWoodTex, { repeat: [3, 1.2], rough: 0.8, env: 0.15 }),
  back: pbr(latticeTex, { repeat: [1, 1], rough: 0.6, env: 0.3 }),
  wood: pbr(woodTex, { repeat: [1, 1], rough: 0.7, env: 0.25 }),
  beam: pbr(woodTex, { repeat: [4, 1], rough: 0.7, env: 0.25 }),
  ceil: pbr(darkWoodTex, { repeat: [4, 6], rough: 0.85, env: 0.1 }),
  lacquer: pbr(lacTex, { repeat: [1, 3], rough: 0.42, metal: 0.05, env: 0.5 }),
  lacquerSm: pbr(lacTex, { repeat: [2, 1], rough: 0.42, metal: 0.05, env: 0.5 }),
  gold: new THREE.MeshStandardMaterial({ color: 0xe0a93a, metalness: 0.85, roughness: 0.32, emissive: 0x2a1604, emissiveIntensity: 0.45, envMapIntensity: 0.85 }),
  goldTrim: new THREE.MeshStandardMaterial({ color: 0xb98630, metalness: 0.6, roughness: 0.55, envMapIntensity: 0.3 }),
  bronze: new THREE.MeshStandardMaterial({ color: 0x8a5a2b, metalness: 0.8, roughness: 0.4, envMapIntensity: 1.0 }),
  paper: new THREE.MeshStandardMaterial({ color: 0xff5a2a, emissive: 0xff3a14, emissiveIntensity: 0.95, roughness: 0.9 }),
  candle: new THREE.MeshStandardMaterial({ color: 0xf2e6c8, roughness: 0.7, emissive: 0x302010 }),
  cushion: new THREE.MeshStandardMaterial({ color: 0x7a4e1a, roughness: 0.9 }),
  orange: new THREE.MeshStandardMaterial({ color: 0xff8a1e, roughness: 0.55, emissive: 0x401800 }),
  pink: new THREE.MeshStandardMaterial({ color: 0xf59ab8, roughness: 0.6, emissive: 0x2a0a14 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x2a1408, roughness: 0.8 }),
};
const glowMap = T.makeTex(T.texGlow(), { color: true });
glowMap.wrapS = glowMap.wrapT = THREE.ClampToEdgeWrapping;

function mesh(geo, mat, x = 0, y = 0, z = 0, parent = scene) {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); parent.add(m); return m;
}
function glowSprite(color, size, opacity, x, y, z, parent = scene) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowMap, color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  s.scale.set(size, size, 1); s.position.set(x, y, z); parent.add(s); return s;
}

/* ------------------------------ kiến trúc ------------------------------ */
const HALL = { x: 7, zBack: -15, zFront: 14, h: 8 };
{
  const floor = mesh(new THREE.PlaneGeometry(14, 30), M.floor, 0, 0, -0.5); floor.rotation.x = -Math.PI / 2;
  const carpet = mesh(new THREE.PlaneGeometry(3.2, 24), M.carpet, 0, 0.012, -3); carpet.rotation.x = -Math.PI / 2;
  mesh(new THREE.PlaneGeometry(14, 9), M.back, 0, 4.5, HALL.zBack);
  const wl = mesh(new THREE.PlaneGeometry(30, 8), M.wall, -HALL.x, 4, -0.5); wl.rotation.y = Math.PI / 2;
  const wr = mesh(new THREE.PlaneGeometry(30, 8), M.wall, HALL.x, 4, -0.5); wr.rotation.y = -Math.PI / 2;
  const ceil = mesh(new THREE.PlaneGeometry(14, 30), M.ceil, 0, HALL.h, -0.5); ceil.rotation.x = Math.PI / 2;
}

const COL_Z = [6, 2.4, -1.2, -4.8, -8.4, -12];
const COL_X = 4.7;
[-COL_X, COL_X].forEach(cx => {
  COL_Z.forEach(cz => {
    mesh(new THREE.CylinderGeometry(0.3, 0.34, 7.4, 24), M.lacquer, cx, 3.7, cz);
    mesh(new THREE.CylinderGeometry(0.42, 0.46, 0.3, 24), M.gold, cx, 0.15, cz);
    mesh(new THREE.BoxGeometry(0.9, 0.35, 0.9), M.wood, cx, 7.45, cz);
  });
  mesh(new THREE.BoxGeometry(0.5, 0.42, 28), M.beam, cx, 7.7, -3);
});
COL_Z.forEach(cz => {
  mesh(new THREE.BoxGeometry(10.6, 0.42, 0.55), M.beam, 0, 7.7, cz);
  mesh(new THREE.BoxGeometry(10.6, 0.07, 0.6), M.goldTrim, 0, 7.46, cz);
});

/* ------------------------------ ánh sáng ------------------------------ */
scene.add(new THREE.HemisphereLight(0xffcf9a, 0x1a0a06, 0.5));
const lights = [];
function warmLight(x, y, z, intensity, dist, color = 0xff8a3a) {
  const l = new THREE.PointLight(color, intensity, dist, 2); l.position.set(x, y, z);
  l.userData.base = intensity; l.userData.ph = Math.random() * 10; scene.add(l); lights.push(l); return l;
}

/* ------------------------------ đèn lồng ------------------------------ */
const lanterns = [];
function lantern(x, y, z) {
  const g = new THREE.Group(); g.position.set(x, y, z);
  mesh(new THREE.CylinderGeometry(0.012, 0.012, 7.3 - y, 6), M.dark, 0, (7.3 - y) / 2, 0, g);
  const body = mesh(new THREE.SphereGeometry(0.42, 20, 14), M.paper, 0, 0, 0, g); body.scale.set(1, 1.25, 1);
  mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.1, 16), M.gold, 0, 0.56, 0, g);
  mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.1, 16), M.gold, 0, -0.56, 0, g);
  mesh(new THREE.ConeGeometry(0.06, 0.45, 8), M.lacquerSm, 0, -0.9, 0, g);
  glowSprite(0xff6a2a, 2.4, 0.32, 0, 0, 0, g);
  scene.add(g); lanterns.push(g); return g;
}
[-3.4, 3.4].forEach(lx => [6.2, 2.6, -1.0, -4.6, -8.2].forEach((lz, i) => lantern(lx, 5.5 + (i % 2) * 0.25, lz)));
[[-3.6, 2.6], [3.6, 2.6], [-3.6, -4.6], [3.6, -4.6]].forEach(([x, z]) => warmLight(x, 5.2, z, 26, 12));
[[-3.6, 8], [3.6, 8]].forEach(([x, z]) => warmLight(x, 5.2, z, 16, 10));

/* ------------------------- bệ + tượng Phật ------------------------- */
const BZ = -12.3;
mesh(new THREE.BoxGeometry(9.5, 0.3, 4.2), M.wood, 0, 0.15, BZ);
mesh(new THREE.BoxGeometry(7.6, 0.3, 3.4), M.lacquerSm, 0, 0.45, BZ);
mesh(new THREE.BoxGeometry(7.7, 0.05, 3.5), M.goldTrim, 0, 0.62, BZ);

const buddha = new THREE.Group(); buddha.position.set(0, 0.65, BZ - 0.3); buddha.scale.setScalar(1.25); scene.add(buddha);
for (let i = 0; i < 22; i++) {
  const a = (i / 22) * T.TAU, p = mesh(new THREE.SphereGeometry(0.42, 12, 10), M.gold, Math.cos(a) * 1.95, 0.32, Math.sin(a) * 1.95, buddha);
  p.scale.set(0.55, 0.55, 1.15); p.rotation.y = -a + Math.PI / 2; p.rotation.x = 0.3;
}
mesh(new THREE.CylinderGeometry(1.95, 2.1, 0.35, 32), M.gold, 0, 0.12, 0, buddha);
const prof = [[0, 0.3], [1.75, 0.3], [1.85, 0.55], [1.6, 0.95], [1.15, 1.5], [0.98, 2.1], [0.98, 2.55], [0.72, 2.85], [0.4, 3.0], [0, 3.0]]
  .map(([r, y]) => new THREE.Vector2(r, y));
const body = mesh(new THREE.LatheGeometry(prof, 40), M.gold, 0, 0.1, 0, buddha); body.scale.z = 0.72;
mesh(new THREE.CylinderGeometry(0.2, 0.27, 0.3, 16), M.gold, 0, 3.2, 0, buddha);
const head = mesh(new THREE.SphereGeometry(0.5, 28, 22), M.gold, 0, 3.62, 0.02, buddha); head.scale.set(1, 1.15, 1.02);
mesh(new THREE.SphereGeometry(0.24, 16, 12), M.gold, 0, 4.16, 0, buddha);
mesh(new THREE.ConeGeometry(0.06, 0.2, 8), M.gold, 0, 4.42, 0, buddha);
[-0.17, 0.17].forEach(ex => { const e = mesh(new THREE.SphereGeometry(1, 8, 6), M.dark, ex, 3.66, 0.47, buddha); e.scale.set(0.11, 0.022, 0.03); });
const mouth = mesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshStandardMaterial({ color: 0x7a2a18, roughness: 0.6 }), 0, 3.42, 0.5, buddha); mouth.scale.set(0.1, 0.025, 0.03);
[-0.52, 0.52].forEach(ex => { const ear = mesh(new THREE.CapsuleGeometry(0.07, 0.4, 4, 8), M.gold, ex, 3.5, 0, buddha); ear.rotation.z = ex > 0 ? -0.1 : 0.1; });
function limb(a, b, r) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), len = A.distanceTo(B);
  const m = mesh(new THREE.CapsuleGeometry(r, Math.max(len - 2 * r, 0.01), 6, 12), M.gold, 0, 0, 0, buddha);
  m.position.copy(A).add(B).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
}
limb([0.95, 2.65, 0.05], [0.55, 1.55, 0.6], 0.26);
limb([-0.95, 2.65, 0.05], [-0.55, 1.55, 0.6], 0.26);
const lap = mesh(new THREE.SphereGeometry(1, 20, 14), M.gold, 0, 1.12, 0.7, buddha); lap.scale.set(1.5, 0.32, 0.8);
const hands = mesh(new THREE.SphereGeometry(0.24, 14, 10), M.gold, 0, 1.55, 0.95, buddha); hands.scale.set(1.5, 0.6, 1);

const haloMat = new THREE.MeshBasicMaterial({ map: T.makeTex(T.texHalo()), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, opacity: 0.8 });
const halo = mesh(new THREE.PlaneGeometry(9.6, 9.6), haloMat, 0, 4.4, BZ - 1.6);
glowSprite(0xffb050, 9, 0.22, 0, 3.6, BZ - 1.3);
{
  const sp = new THREE.SpotLight(0xffe0b0, 110, 26, 0.55, 0.6, 2);
  sp.position.set(0, 9, -5); sp.target.position.set(0, 3, BZ); scene.add(sp, sp.target);
  warmLight(0, 3.2, BZ + 3.2, 22, 14, 0xffc070);
}

/* -------------------------- bàn thờ + lễ vật -------------------------- */
const AZ = -9.3;
mesh(new THREE.BoxGeometry(5.2, 1.1, 1.5), M.lacquerSm, 0, 0.55, AZ);
mesh(new THREE.BoxGeometry(5.7, 0.14, 1.9), M.wood, 0, 1.17, AZ);
mesh(new THREE.BoxGeometry(5.72, 0.04, 1.92), M.gold, 0, 1.0, AZ);
const TOP = 1.24;
mesh(new THREE.CylinderGeometry(0.46, 0.34, 0.42, 24), M.bronze, 0, TOP + 0.21, AZ);
[-0.3, 0.3].forEach(lx => [-0.3, 0.3].forEach(lz => mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.14, 8), M.bronze, lx, TOP + 0.05, AZ + lz)));
const incenseTips = [];
for (let i = 0; i < 11; i++) {
  const a = (i / 11) * T.TAU, r = i < 5 ? 0.0 + i * 0.07 : 0.22, ix = Math.cos(a) * r, iz = Math.sin(a) * r;
  mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.7, 5), M.dark, ix, TOP + 0.75, AZ + iz);
  const tip = mesh(new THREE.SphereGeometry(0.02, 6, 6), new THREE.MeshBasicMaterial({ color: 0xff5a1a, fog: false }), ix, TOP + 1.1, AZ + iz);
  incenseTips.push(tip);
}
glowSprite(0xff5a1a, 0.7, 0.8, 0, TOP + 1.1, AZ);
const flames = [];
[-1.7, 1.7].forEach(cx => {
  mesh(new THREE.CylinderGeometry(0.2, 0.26, 0.1, 16), M.gold, cx, TOP + 0.05, AZ);
  mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.62, 14), M.candle, cx, TOP + 0.41, AZ);
  const f = glowSprite(0xffb347, 0.7, 0.95, cx, TOP + 0.9, AZ); flames.push(f);
  glowSprite(0xff7a20, 2.2, 0.35, cx, TOP + 0.9, AZ);
  warmLight(cx, TOP + 1.1, AZ + 0.4, 6, 6, 0xffa040);
});
[-0.95, 0.95].forEach(fx => {
  mesh(new THREE.CylinderGeometry(0.42, 0.3, 0.08, 20), M.gold, fx, TOP + 0.04, AZ);
  [[0, 0], [0.2, 0.1], [-0.2, 0.1], [0.1, -0.2], [-0.1, -0.2]].forEach(([ox, oz]) => mesh(new THREE.SphereGeometry(0.15, 14, 10), M.orange, fx + ox, TOP + 0.2, AZ + oz));
  mesh(new THREE.SphereGeometry(0.15, 14, 10), M.orange, fx, TOP + 0.38, AZ);
});
[-2.35, 2.35].forEach(vx => {
  mesh(new THREE.CylinderGeometry(0.16, 0.22, 0.5, 16), M.gold, vx, TOP + 0.25, AZ);
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * T.TAU;
    mesh(new THREE.SphereGeometry(0.15, 10, 8), M.pink, vx + Math.cos(a) * 0.18, TOP + 0.62 + (i % 2) * 0.1, AZ + Math.sin(a) * 0.18);
  }
  mesh(new THREE.SphereGeometry(0.17, 10, 8), M.pink, vx, TOP + 0.78, AZ);
});

/* ------------------------------ chỗ quỳ ------------------------------ */
const seats = [];
const SEAT_X = [-3.5, -2.7, -1.9, 1.9, 2.7, 3.5];
for (let r = 0; r < 13; r++) SEAT_X.forEach(x => seats.push({ x, z: 6 - r * 1.0, row: r }));
const cushions = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.3, 0.34, 0.1, 20), M.cushion, seats.length);
{ const d = new THREE.Object3D(); seats.forEach((s, i) => { d.position.set(s.x, 0.06, s.z); d.updateMatrix(); cushions.setMatrixAt(i, d.matrix); }); scene.add(cushions); }

/* ------------------------------ khói + bụi ------------------------------ */
const smokeN = 70;
const smokePos = new Float32Array(smokeN * 3), smokeLife = new Float32Array(smokeN);
for (let i = 0; i < smokeN; i++) smokeLife[i] = Math.random();
const smokeGeo = new THREE.BufferGeometry(); smokeGeo.setAttribute('position', new THREE.BufferAttribute(smokePos, 3));
const smoke = new THREE.Points(smokeGeo, new THREE.PointsMaterial({ map: glowMap, color: 0xcfc3b4, size: 0.55, transparent: true, opacity: 0.2, depthWrite: false, sizeAttenuation: true }));
smoke.frustumCulled = false; scene.add(smoke);

const dustN = 320;
const dustPos = new Float32Array(dustN * 3), dustSeed = new Float32Array(dustN);
for (let i = 0; i < dustN; i++) {
  dustPos[i * 3] = (Math.random() - 0.5) * 12; dustPos[i * 3 + 1] = Math.random() * 7; dustPos[i * 3 + 2] = -14 + Math.random() * 26; dustSeed[i] = Math.random() * 10;
}
const dustGeo = new THREE.BufferGeometry(); dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ map: glowMap, color: 0xffc27a, size: 0.09, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false }));
dust.frustumCulled = false; scene.add(dust);

/* ------------------------------ hậu kỳ ------------------------------ */
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), BLOOM, 0.6, 0.85);
composer.addPass(bloom);
composer.addPass(new OutputPass());

function fit() {
  const ratio = FULL ? innerWidth / innerHeight : 9 / 16;
  let w = innerWidth, h = innerHeight;
  if (!FULL) { if (w / h > ratio) w = Math.floor(h * ratio); else h = Math.floor(w / ratio); }
  renderer.setSize(w, h); composer.setSize(w, h);
  camera.aspect = w / h; camera.updateProjectionMatrix();
}
addEventListener('resize', fit); fit();

/* ------------------------------ camera ------------------------------ */
const cur = { pos: new THREE.Vector3(...CAMERAS.wide.pos), look: new THREE.Vector3(...CAMERAS.wide.look) };
const tgt = { pos: cur.pos.clone(), look: cur.look.clone() };
function flyTo(name) { const c = CAMERAS[name]; if (!c) return; tgt.pos.set(...c.pos); tgt.look.set(...c.look); }
addEventListener('keydown', e => { if (e.key === '1') flyTo('wide'); if (e.key === '2') flyTo('altar'); if (e.key === '3') flyTo('top'); });

/* ------------------------------ vòng lặp ------------------------------ */
const hooks = [];   // các mục sau (avatar...) đăng ký hàm cập nhật mỗi khung hình vào đây
const clock = new THREE.Clock();
let first = true;
function tick() {
  const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
  const k = 1 - Math.exp(-2.2 * dt);
  cur.pos.lerp(tgt.pos, k); cur.look.lerp(tgt.look, k);
  camera.position.set(cur.pos.x + Math.sin(t * 0.17) * 0.28, cur.pos.y + Math.sin(t * 0.23) * 0.08, cur.pos.z);
  camera.lookAt(cur.look);

  halo.rotation.z = t * 0.03;
  haloMat.opacity = 0.74 + Math.sin(t * 0.8) * 0.06;
  lights.forEach(l => { l.intensity = l.userData.base * (0.9 + Math.sin(t * 5 + l.userData.ph) * 0.06 + Math.sin(t * 11.3 + l.userData.ph) * 0.04); });
  flames.forEach((f, i) => { const s = 0.62 + Math.sin(t * 9 + i * 2) * 0.06 + Math.sin(t * 17 + i) * 0.04; f.scale.set(s, s * 1.35, 1); });
  lanterns.forEach((l, i) => { l.rotation.z = Math.sin(t * 0.7 + i) * 0.015; });
  incenseTips.forEach((m, i) => { m.material.color.setRGB(1, 0.28 + Math.sin(t * 3 + i) * 0.08, 0.1); });

  for (let i = 0; i < smokeN; i++) {
    smokeLife[i] += dt * 0.12; if (smokeLife[i] > 1) smokeLife[i] -= 1;
    const l = smokeLife[i], a = i * 2.4;
    smokePos[i * 3] = Math.sin(a + l * 5) * (0.04 + l * 0.35);
    smokePos[i * 3 + 1] = TOP + 1.1 + l * 3.4;
    smokePos[i * 3 + 2] = AZ + Math.cos(a * 1.3 + l * 4) * (0.04 + l * 0.3);
  }
  smokeGeo.attributes.position.needsUpdate = true;
  for (let i = 0; i < dustN; i++) {
    dustPos[i * 3 + 1] += dt * 0.12; dustPos[i * 3] += Math.sin(t * 0.3 + dustSeed[i]) * dt * 0.08;
    if (dustPos[i * 3 + 1] > 7.5) dustPos[i * 3 + 1] = 0.2;
  }
  dustGeo.attributes.position.needsUpdate = true;

  for (const h of hooks) h(dt, t);
  composer.render();
  if (first) { first = false; document.getElementById('loading')?.remove(); }
  requestAnimationFrame(tick);
}
tick();

// Giao diện lập trình cho các mục sau (avatar, sự kiện quà TikTok)
const TEMPLE = { THREE, scene, camera, renderer, seats, flyTo, AZ, BZ, TOP, hooks };
window.TEMPLE = TEMPLE;
// Mục 3: avatar quỳ + bảng tên. Dùng: TEMPLE.avatars.add({ id, name, avatarUrl }) / .remove(id) / .bow(id, 3)
TEMPLE.avatars = createAvatars(TEMPLE);
