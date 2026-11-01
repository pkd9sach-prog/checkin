// avatars.js - Mục 3: Avatar chibi quỳ + bảng tên người xem (tối đa 78 chỗ).
// Nhẹ: toàn bộ 78 avatar vẽ bằng 8 InstancedMesh (nam/nữ khác dáng áo + tóc), mỗi bảng tên là 1 sprite.
// Giới tính (nam/nữ) được đoán từ tên bằng js/gioi-tinh.js; nữ: tóc dài + búi, áo xoè; nam: tóc ngắn, vai rộng.
// Chỉnh nhanh: sửa các hằng số trong khối CONFIG ngay dưới đây.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { doanGioiTinh } from './gioi-tinh.js';

/* ============================== CONFIG ============================== */
const CFG = {
  ROBE: 0x8b9bb0,          // màu áo xám xanh
  HIP: 0.42,               // độ cao "khớp hông" (chỗ avatar cúi xuống khi lạy)
  MAX_BOW: 1.35,           // góc cúi tối đa khi lạy (radian)
  APPEAR_TIME: 0.45,       // giây: avatar hiện ra
  LEAVE_TIME: 0.3,         // giây: avatar biến mất
  BOW_CYCLE: 2.0,          // giây cho 1 lần lạy (xuống - giữ - lên - nghỉ)
  TAG_W: 1.04,             // bề rộng bảng tên (mét trong cảnh)
  TAG_H: 0.26,             // bề cao bảng tên
  TAG_Y: 1.72,             // độ cao bảng tên so với sàn
  TAG_STAGGER: 0.34,       // chỗ liền kề so le cao thấp để bảng tên đỡ đè nhau
  TAG_BRIGHT: 1.25,        // độ sáng bảng tên (tăng nếu thấy mờ)
  FILL: 'front',           // thứ tự ngồi: 'front' (từ gần bàn thờ ra sau) | 'back' | 'random'
  REPLACE_OLDEST: true,    // đủ 78 chỗ thì người mới thay người ngồi lâu nhất
  HAIR: [0x15100d, 0x24160e, 0x3a2415, 0x0e0e12, 0x4a2a1a, 0x2b2b30],
  SKIN: [0xf0c9a8, 0xe6b992, 0xf6d5b8, 0xd9a77f, 0xefc0a0],
};
/* ==================================================================== */

const TAU = Math.PI * 2;
const Q = new URLSearchParams(location.search);
const SHOW_TAGS = Q.get('tags') !== '0';           // ?tags=0 -> ẩn bảng tên
const SHOW_G = Q.get('gt') === '1';                // ?gt=1 -> thêm ký hiệu ♂/♀ trước tên để kiểm tra việc đoán giới tính

/* ------------------------------ tiện ích ------------------------------ */
const smooth = x => x * x * (3 - 2 * x);
const easeOutBack = u => { const c1 = 1.70158, c3 = c1 + 1, v = u - 1; return 1 + c3 * v * v * v + c1 * v * v; };
function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

function place(geo, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) {
  geo.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion(), new THREE.Vector3(sx, sy, sz)));
  return geo;
}
function limbGeo(a, b, r) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), len = A.distanceTo(B);
  const geo = new THREE.CapsuleGeometry(r, Math.max(len - 2 * r, 0.01), 4, 10);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
  geo.applyMatrix4(new THREE.Matrix4().compose(A.clone().add(B).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1)));
  return geo;
}

/* --------------------------- hình dạng chibi --------------------------- */
// Avatar nhìn về -z (hướng bàn thờ). Camera ở +z nên thấy lưng avatar.
function buildGeometries() {
  // Chân (dùng chung)
  const feet = mergeGeometries([
    place(new THREE.SphereGeometry(1, 10, 8), -0.11, 0.15, 0.44, 0.085, 0.05, 0.17),
    place(new THREE.SphereGeometry(1, 10, 8), 0.11, 0.15, 0.44, 0.085, 0.05, 0.17),
  ]);
  // Đầu + cổ + hai bàn tay (dùng chung)
  const skin = mergeGeometries([
    place(new THREE.SphereGeometry(0.27, 20, 16), 0, 1.17, 0, 1, 1, 0.96),
    place(new THREE.CylinderGeometry(0.07, 0.08, 0.14, 8), 0, 0.98, 0),
    place(new THREE.SphereGeometry(0.06, 10, 8), -0.06, 0.62, -0.3),
    place(new THREE.SphereGeometry(0.06, 10, 8), 0.06, 0.62, -0.3),
  ]);
  // Phần dưới (không cúi): váy áo quỳ. Nam: thẳng hơn; nữ: xoè hơn
  const lower = male => {
    const k = male ? 0.93 : 1.09;
    const prof = [[0, 0.1], [0.36, 0.1], [0.41, 0.2], [0.37, 0.34], [0.29, 0.46], [0.22, 0.52], [0, 0.52]].map(([r, y]) => new THREE.Vector2(r * k, y));
    return place(new THREE.LatheGeometry(prof, 28), 0, 0, 0, 1, 1, 0.95);
  };
  // Phần trên (cúi quanh khớp hông): thân + tay áo. Nam: vai rộng, thân to; nữ: nhỏ nhắn
  const upper = male => {
    const tr = male ? 0.235 : 0.188, tl = male ? 0.36 : 0.32, sw = male ? 0.275 : 0.225, sr = male ? 0.115 : 0.096;
    return mergeGeometries([
      place(new THREE.CapsuleGeometry(tr, tl, 4, 12), 0, 0.66, 0, 1, 1, 0.85),
      limbGeo([-sw, 0.92, 0], [-0.1, 0.64, -0.24], sr),
      limbGeo([sw, 0.92, 0], [0.1, 0.64, -0.24], sr),
    ]);
  };
  // Tóc (mặt quay về -z, camera thấy phía sau đầu ở +z). Nam: ngắn, gọn. Nữ: dài xuống lưng + búi + mái
  const hairM = mergeGeometries([
    place(new THREE.SphereGeometry(0.28, 20, 16), 0, 1.21, 0.06, 1, 0.92, 1),
    place(new THREE.SphereGeometry(0.2, 12, 10), 0, 1.33, -0.07, 1, 0.5, 0.9),
  ]);
  const hairF = mergeGeometries([
    place(new THREE.SphereGeometry(0.292, 20, 16), 0, 1.22, 0.075, 1, 0.95, 1),
    place(new THREE.SphereGeometry(0.105, 10, 8), 0, 1.44, 0.14),
    place(new THREE.SphereGeometry(1, 14, 10), 0, 0.98, 0.2, 0.21, 0.36, 0.1),
    place(new THREE.SphereGeometry(1, 12, 8), 0, 1.36, -0.17, 0.2, 0.07, 0.1),
  ]);
  return { feet, skin, skirtM: lower(true), skirtF: lower(false), upperM: upper(true), upperF: upper(false), hairM, hairF };
}

/* ------------------------------ chính ------------------------------ */
export function createAvatars(TEMPLE) {
  const { scene, seats, hooks } = TEMPLE;
  const N = seats.length;
  const G = buildGeometries();

  const matRobe = new THREE.MeshStandardMaterial({ color: CFG.ROBE, roughness: 0.85, emissive: 0x1a1d26, emissiveIntensity: 0.6, side: THREE.DoubleSide });
  const matSkin = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7, emissive: 0x2a1408, emissiveIntensity: 0.35 });
  const matHair = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 });
  const matFeet = new THREE.MeshStandardMaterial({ color: 0xe9e2d6, roughness: 0.8 });

  function inst(geo, mat) {
    const m = new THREE.InstancedMesh(geo, mat, N);
    m.frustumCulled = false;                       // ma trận đổi liên tục nên tắt cắt xén theo khung nhìn
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(m);
    return m;
  }
  // mỗi bộ phận có bản nam ('nam') và bản nữ ('nu'); mỗi chỗ ngồi chỉ dùng 1 bản, bản kia thu về kích thước 0
  const mSkirt = { nam: inst(G.skirtM, matRobe), nu: inst(G.skirtF, matRobe) };
  const mUpper = { nam: inst(G.upperM, matRobe), nu: inst(G.upperF, matRobe) };
  const mHair = { nam: inst(G.hairM, matHair), nu: inst(G.hairF, matHair) };
  const mFeet = inst(G.feet, matFeet);
  const mSkin = inst(G.skin, matSkin);
  const colored = [mSkirt.nam, mSkirt.nu, mUpper.nam, mUpper.nu, mHair.nam, mHair.nu, mSkin];
  const gendered = [mSkirt.nam, mSkirt.nu, mUpper.nam, mUpper.nu, mHair.nam, mHair.nu];
  const all = [...gendered, mFeet, mSkin];
  const white = new THREE.Color(1, 1, 1);
  colored.forEach(m => { for (let i = 0; i < N; i++) m.setColorAt(i, white); m.instanceColor.needsUpdate = true; });
  const ZERO = new THREE.Matrix4().makeScale(0.0001, 0.0001, 0.0001);
  const zeroSeat = i => gendered.forEach(m => m.setMatrixAt(i, ZERO));   // cất cả 2 bản nam/nữ của chỗ i

  /* ---------------- dữ liệu từng chỗ ---------------- */
  const A = seats.map((s, i) => ({
    i, x: s.x, z: s.z, state: 'empty', id: null, name: '', url: '', g: 'nam', gChac: true,
    age: 0, s: 0, bowManual: 0, bowAnim: null, phase: Math.random() * 10, joined: 0,
    sprite: null, canvas: null, tex: null, img: null, imgOk: false, token: 0,
    // tư thế (Mục 4 điều khiển): vị trí hiện tại, hướng, đứng/quỳ, đi bộ, độ hiện
    px: s.x, pz: s.z, yaw: 0, stand: 0, vis: 1, bobW: 0, sway: 0, busy: false, removeLater: false,
    tagK: 1, tagY0: 0, trackHand: false, hand: new THREE.Vector3(),
  }));
  const byId = new Map();
  let joinCounter = 0;

  // thứ tự chọn chỗ
  const order = A.map(a => a.i);
  if (CFG.FILL === 'front') order.sort((a, b) => A[a].z - A[b].z || Math.abs(A[a].x) - Math.abs(A[b].x));
  else if (CFG.FILL === 'back') order.sort((a, b) => A[b].z - A[a].z || Math.abs(A[a].x) - Math.abs(A[b].x));
  else order.sort(() => Math.random() - 0.5);

  /* ---------------- bảng tên ---------------- */
  function roundRect(g, x, y, w, h, r) {
    g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }
  function ensureTag(a) {
    if (a.sprite) return;
    a.canvas = document.createElement('canvas'); a.canvas.width = 512; a.canvas.height = 128;
    a.tex = new THREE.CanvasTexture(a.canvas); a.tex.colorSpace = THREE.SRGBColorSpace; a.tex.anisotropy = 4;
    const mat = new THREE.SpriteMaterial({ map: a.tex, transparent: true, depthTest: false, depthWrite: false, fog: false });
    mat.color.setScalar(CFG.TAG_BRIGHT);
    a.sprite = new THREE.Sprite(mat);
    const col = a.i % 6;
    a.tagY0 = CFG.TAG_Y + (col % 2) * CFG.TAG_STAGGER;
    a.sprite.position.set(a.x, a.tagY0, a.z);
    a.sprite.renderOrder = 10 + Math.round((6 - a.z) * 2);   // hàng gần camera vẽ sau (nằm trên)
    a.sprite.visible = false;
    scene.add(a.sprite);
  }
  function drawTag(a) {
    const W = 512, H = 128, g = a.canvas.getContext('2d');
    g.clearRect(0, 0, W, H);
    roundRect(g, 4, 4, W - 8, H - 8, 58);
    g.fillStyle = 'rgba(58,8,14,0.90)'; g.fill();
    const grad = g.createLinearGradient(0, 0, W, 0); grad.addColorStop(0, '#f4d27a'); grad.addColorStop(1, '#c58a2c');
    g.lineWidth = 5; g.strokeStyle = grad; g.stroke();
    // ảnh đại diện (hoặc chữ cái đầu nếu chưa có ảnh)
    g.save(); g.beginPath(); g.arc(66, 64, 46, 0, TAU); g.clip();
    if (a.imgOk && a.img) g.drawImage(a.img, 20, 18, 92, 92);
    else {
      g.fillStyle = `hsl(${hash(a.id || a.name) % 360},38%,42%)`; g.fillRect(20, 18, 92, 92);
      g.fillStyle = '#fff3d6'; g.font = '700 54px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText((Array.from(a.name.trim())[0] || '?').toUpperCase(), 66, 68);
    }
    g.restore();
    g.lineWidth = 4; g.strokeStyle = '#f4d27a'; g.beginPath(); g.arc(66, 64, 46, 0, TAU); g.stroke();
    // tên (tự thu nhỏ chữ, quá dài thì cắt và thêm "…")
    const x0 = 128, maxW = W - x0 - 30;
    let size = 54, text = (SHOW_G ? (a.g === 'nu' ? '♀ ' : '♂ ') : '') + (a.name || '?');
    g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillStyle = '#fff3d6';
    const setFont = s => { g.font = `700 ${s}px "Segoe UI", system-ui, sans-serif`; };
    setFont(size);
    while (g.measureText(text).width > maxW && size > 30) { size -= 2; setFont(size); }
    if (g.measureText(text).width > maxW) {
      const chars = Array.from(text);
      while (chars.length > 1 && g.measureText(chars.join('') + '…').width > maxW) chars.pop();
      text = chars.join('') + '…';
    }
    g.fillText(text, x0, 68);
    a.tex.needsUpdate = true;
  }
  function loadPicture(a, url) {
    a.img = null; a.imgOk = false;
    if (!url) return;
    const token = ++a.token, img = new Image();
    img.crossOrigin = 'anonymous'; img.referrerPolicy = 'no-referrer';
    img.onload = () => { if (a.token !== token || a.state === 'empty') return; a.img = img; a.imgOk = true; drawTag(a); };
    img.onerror = () => { /* không tải được ảnh (thường do chặn CORS) -> giữ chữ cái đầu */ };
    img.src = url;
  }

  /* ---------------- ma trận ---------------- */
  const base = new THREE.Matrix4(), up = new THREE.Matrix4(), lower = new THREE.Matrix4(), feetM = new THREE.Matrix4();
  const t1 = new THREE.Matrix4(), t2 = new THREE.Matrix4(), t3 = new THREE.Matrix4(), t4 = new THREE.Matrix4(), sk = new THREE.Matrix4(), ft = new THREE.Matrix4();
  const P = new THREE.Vector3(), S = new THREE.Vector3(), QY = new THREE.Quaternion(), AXY = new THREE.Vector3(0, 1, 0);
  function writeMatrices(a, s, bow, bob) {
    const sc = Math.max(s * a.vis, 0.0001), st = a.stand;
    P.set(a.px, 0, a.pz); S.set(sc, sc, sc); QY.setFromAxisAngle(AXY, a.yaw);
    base.compose(P, QY, S);
    // đứng dậy: áo dài ra và thu hẹp lại, bàn chân thu về dưới thân
    sk.makeScale(1 - 0.15 * st, 1 + 0.9 * st, 1 - 0.15 * st); lower.copy(base).multiply(sk);
    ft.makeTranslation(0, 0, -0.38 * st); feetM.copy(base).multiply(ft);
    t1.makeTranslation(0, CFG.HIP + st * 0.5 + bob, 0); t2.makeRotationX(-bow); t4.makeRotationZ(a.sway); t3.makeTranslation(0, -CFG.HIP, 0);
    up.copy(base).multiply(t1).multiply(t2).multiply(t4).multiply(t3);
    if (a.trackHand) a.hand.set(0, 0.66, -0.34).applyMatrix4(up);
    const gk = a.g === 'nu' ? 'nu' : 'nam';
    mSkirt[gk].setMatrixAt(a.i, lower); mFeet.setMatrixAt(a.i, feetM);
    mUpper[gk].setMatrixAt(a.i, up); mSkin.setMatrixAt(a.i, up); mHair[gk].setMatrixAt(a.i, up);
  }
  function hideSeat(a) {
    writeMatrices(a, 0, 0, 0);
    if (a.sprite) a.sprite.visible = false;
  }
  A.forEach(a => { zeroSeat(a.i); hideSeat(a); });
  all.forEach(m => { m.instanceMatrix.needsUpdate = true; });

  /* ---------------- vòng cập nhật mỗi khung hình ---------------- */
  function bowCurve(u) {        // u trong [0,1] của 1 lần lạy
    if (u < 0.33) return smooth(u / 0.33);
    if (u < 0.5) return 1;
    if (u < 0.83) return 1 - smooth((u - 0.5) / 0.33);
    return 0;
  }
  function update(dt, t) {
    let any = false;
    for (let i = 0; i < N; i++) {
      const a = A[i];
      if (a.state === 'empty') continue;
      any = true;
      a.age += dt;
      if (a.state === 'in') a.s = easeOutBack(Math.min(a.age / CFG.APPEAR_TIME, 1));
      else if (a.state === 'out') {
        const u = Math.min(a.age / CFG.LEAVE_TIME, 1);
        a.s = 1 - smooth(u);
        if (u >= 1) { a.state = 'empty'; a.id = null; hideSeat(a); continue; }
      }
      let bowV = a.bowManual;
      if (a.bowAnim) {
        const ba = a.bowAnim; ba.t += dt;
        const k = Math.floor(ba.t / ba.cycle);
        if (k >= ba.n) a.bowAnim = null;
        else bowV = Math.max(bowV, bowCurve((ba.t - k * ba.cycle) / ba.cycle) * ba.amp);
      }
      const breathe = Math.sin(t * 1.3 + a.phase) * 0.02 * (1 - a.stand);
      const bob = Math.sin(t * 1.6 + a.phase) * 0.008 + a.bobW;
      writeMatrices(a, a.s, bowV * CFG.MAX_BOW + breathe, bob);
      if (a.sprite && SHOW_TAGS) {
        const k = Math.max(a.s * a.vis, 0.0001);
        a.sprite.scale.set(CFG.TAG_W * k * a.tagK, CFG.TAG_H * k * a.tagK, 1);
        a.sprite.position.set(a.px, a.tagY0 + a.stand * 0.5 + (a.tagK - 1) * 0.12, a.pz);
        a.sprite.material.opacity = Math.min(1, k);
      }
    }
    if (any) all.forEach(m => { m.instanceMatrix.needsUpdate = true; });
  }
  hooks.push(update);

  /* ---------------- giao diện lập trình ---------------- */
  function pickSeat() {
    for (const i of order) if (A[i].state === 'empty') return i;
    if (!CFG.REPLACE_OLDEST) return -1;
    let oldest = -1;
    for (const a of A) if (a.state === 'in' && !a.busy && (oldest < 0 || a.joined < A[oldest].joined)) oldest = a.i;
    if (oldest >= 0) { byId.delete(A[oldest].id); A[oldest].id = null; A[oldest].state = 'empty'; }
    return oldest;
  }
  function style(a) {
    const h = hash(String(a.id));
    // áo xám xanh: nam đậm hơn một chút, nữ sáng hơn một chút
    const tint = a.g === 'nu' ? 1.0 + ((h >> 3) % 13) / 100 : 0.84 + ((h >> 3) % 13) / 100;
    const gk = a.g === 'nu' ? 'nu' : 'nam', col = new THREE.Color(tint, tint, tint);
    mSkirt[gk].setColorAt(a.i, col); mUpper[gk].setColorAt(a.i, col);
    mSkin.setColorAt(a.i, new THREE.Color(CFG.SKIN[h % CFG.SKIN.length]));
    mHair[gk].setColorAt(a.i, new THREE.Color(CFG.HAIR[(h >> 5) % CFG.HAIR.length]));
    colored.forEach(m => { m.instanceColor.needsUpdate = true; });
  }
  function decideGender(user, id, name) {
    const forced = String(user.gender ?? '').toLowerCase();
    if (/^(nu|nữ|female|f|girl)$/.test(forced)) return { g: 'nu', chac: true, diem: 9 };
    if (/^(nam|male|m|boy)$/.test(forced)) return { g: 'nam', chac: true, diem: -9 };
    return doanGioiTinh(name, id);
  }

  const api = {
    // user = { id, name, avatarUrl }. Trả về số thứ tự chỗ ngồi, hoặc -1 nếu hết chỗ.
    add(user) {
      const id = String(user.id ?? user.name ?? Math.random());
      const name = String(user.name ?? user.nickname ?? id);
      const url = user.avatarUrl ?? user.profilePictureUrl ?? '';
      if (byId.has(id)) {                                            // đã ngồi rồi -> chỉ cập nhật tên/ảnh
        const a = A[byId.get(id)]; a.name = name;
        if (url && url !== a.url) { a.url = url; loadPicture(a, url); }
        drawTag(a); return a.i;
      }
      const i = pickSeat(); if (i < 0) return -1;
      const a = A[i];
      Object.assign(a, { id, name, url, state: 'in', age: 0, s: 0, bowManual: 0, bowAnim: null, joined: ++joinCounter,
        px: a.x, pz: a.z, yaw: 0, stand: 0, vis: 1, bobW: 0, sway: 0, busy: false, removeLater: false, tagK: 1, trackHand: false });
      byId.set(id, i);
      const gi = decideGender(user, id, name); a.g = gi.g; a.gChac = gi.chac;
      if (Q.get('debug') === '1') console.log(`[giới tính] ${name} -> ${a.g} (điểm ${gi.diem.toFixed(1)}${gi.chac ? '' : ', đoán theo mã băm'})`);
      zeroSeat(i);
      style(a); ensureTag(a); a.sprite.position.set(a.x, a.tagY0, a.z); drawTag(a); loadPicture(a, url);
      a.sprite.visible = SHOW_TAGS; a.sprite.scale.set(0.0001, 0.0001, 1);
      return i;
    },
    remove(id) {
      id = String(id); const i = byId.get(id); if (i === undefined) return false;
      const a = A[i]; byId.delete(id);
      if (a.busy) { a.removeLater = true; return true; }   // đang đi lên bàn thờ: rời đi sau khi xong
      a.state = 'out'; a.age = 0; return true;
    },
    has(id) { return byId.has(String(id)); },
    get(id) { const i = byId.get(String(id)); if (i === undefined) return null; const a = A[i]; return { seat: i, x: a.x, z: a.z, name: a.name, id: a.id }; },
    list() { return A.filter(a => a.state === 'in').map(a => ({ seat: a.i, id: a.id, name: a.name, gender: a.g })); },
    gender(id) { const i = byId.get(String(id)); return i === undefined ? null : A[i].g; },
    // đổi giới tính thủ công: TEMPLE.avatars.setGender('id', 'nam' | 'nu')
    setGender(id, g) {
      const i = byId.get(String(id)); if (i === undefined) return false;
      const a = A[i]; a.g = /^(nu|nữ|female|f)$/i.test(g) ? 'nu' : 'nam'; a.gChac = true;
      zeroSeat(i); style(a); drawTag(a); return true;
    },
    count() { return byId.size; },
    clear() { [...byId.keys()].forEach(id => api.remove(id)); },
    setBow(id, v) { const i = byId.get(String(id)); if (i !== undefined) A[i].bowManual = Math.min(1, Math.max(0, v)); },
    bow(id, times = 1, opts = {}) { const i = byId.get(String(id)); if (i !== undefined) api.bowRec(A[i], times, opts); },
    bowAll(times = 1) { byId.forEach(i => api.bowRec(A[i], times, {})); },
    bowRec(a, times = 1, { cycle = CFG.BOW_CYCLE, amp = 1 } = {}) { a.bowAnim = { t: 0, n: times, cycle, amp }; },
    // --- dành cho Mục 4 (điều khiển trực tiếp 1 avatar) ---
    ctl(id) { const i = byId.get(String(id)); return i === undefined ? null : A[i]; },
    busy(a, on) {
      a.busy = on;
      if (a.sprite) a.sprite.renderOrder = on ? 100 : 10 + Math.round((6 - a.z) * 2);
      if (!on && a.removeLater) { a.removeLater = false; a.state = 'out'; a.age = 0; }
    },
    CFG,
  };

  /* ---------------- phím thử nghiệm ---------------- */
  const FAKE = ['Ngọc Lễ', 'Hoàng Anh', 'Minh Châu', 'Bé Mít', 'Thu Trang', 'Quốc Anh', 'Duy Bùi', 'Mỹ Đình', 'Lan Hương', 'Tuấn Kiệt', 'An Nhiên', 'Phú Bà Bình Dương', 'Khánh Ngọc', 'Sói Đơn Độc', 'Hà My', 'Boss Hùng', 'Bé Bống', 'Mạnh Cường', 'Kitty Pink', 'Thỏ Con', 'Nguyễn Văn Thành Đạt', 'Hải Long'];
  let fakeN = 0;
  const addFake = () => { fakeN++; return api.add({ id: 'demo' + fakeN, name: FAKE[fakeN % FAKE.length] + (fakeN > FAKE.length ? ' ' + fakeN : '') }); };
  addEventListener('keydown', e => {
    const k = e.key.toLowerCase();
    if (k === 'a') addFake();                                  // A: thêm 1 người xem giả
    else if (k === 'd') { const l = api.list(); if (l.length) api.remove(l[Math.floor(Math.random() * l.length)].id); }  // D: xoá ngẫu nhiên 1 người
    else if (k === 'b') api.bowAll(3);                         // B: tất cả lạy 3 lần
    else if (k === 'c') api.clear();                           // C: xoá hết
  });
  const demo = parseInt(Q.get('demo') || '0', 10);             // ?demo=40 -> tự thêm 40 người xem giả
  if (demo > 0) { let n = 0; const iv = setInterval(() => { addFake(); if (++n >= demo) clearInterval(iv); }, 60); }

  return api;
}
