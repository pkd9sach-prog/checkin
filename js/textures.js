// textures.js - Toàn bộ texture được TẠO BẰNG CODE (canvas), không cần ảnh ngoài.
import * as THREE from 'three';

export const TAU = Math.PI * 2;

export function rng(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const cvs = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const rgb = (r, g, b) => `rgb(${r | 0},${g | 0},${b | 0})`;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

/** Nhiễu nhiều lớp (value noise xếp chồng) -> canvas xám */
export function fbmCanvas(W, H, seed, octaves = 5, baseCells = 3, contrast = 1) {
  const out = cvs(W, H), o = out.getContext('2d');
  o.fillStyle = '#808080'; o.fillRect(0, 0, W, H);
  let cells = baseCells, alpha = 1;
  for (let i = 0; i < octaves; i++) {
    const n = cvs(cells, cells), nx = n.getContext('2d');
    const im = nx.createImageData(cells, cells), d = im.data, r = rng(seed + i * 977);
    for (let k = 0; k < cells * cells; k++) {
      const v = clamp(128 + (r() - 0.5) * 255 * contrast, 0, 255);
      d[k * 4] = d[k * 4 + 1] = d[k * 4 + 2] = v; d[k * 4 + 3] = 255;
    }
    nx.putImageData(im, 0, 0);
    o.globalAlpha = alpha;
    o.globalCompositeOperation = i === 0 ? 'source-over' : 'overlay';
    o.imageSmoothingEnabled = true; o.imageSmoothingQuality = 'high';
    o.drawImage(n, 0, 0, W, H);
    cells *= 2; alpha *= 0.62;
  }
  o.globalAlpha = 1; o.globalCompositeOperation = 'source-over';
  return out;
}

/** Bản đồ độ cao (canvas xám) -> normal map */
export function normalFromHeight(hc, strength = 2.4) {
  const W = hc.width, H = hc.height;
  const b = cvs(W, H), bx = b.getContext('2d');
  bx.filter = 'blur(1px)'; bx.drawImage(hc, 0, 0); bx.filter = 'none';
  const src = bx.getImageData(0, 0, W, H).data;
  const out = cvs(W, H), ox = out.getContext('2d');
  const im = ox.createImageData(W, H), d = im.data;
  const at = (x, y) => src[(((y + H) % H) * W + ((x + W) % W)) * 4] / 255;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const gx = (at(x + 1, y) - at(x - 1, y)) * strength;
    const gy = (at(x, y + 1) - at(x, y - 1)) * strength;
    const il = 1 / Math.hypot(gx, gy, 1), i = (y * W + x) * 4;
    d[i] = (-gx * il * 0.5 + 0.5) * 255;
    d[i + 1] = (gy * il * 0.5 + 0.5) * 255;
    d[i + 2] = (il * 0.5 + 0.5) * 255;
    d[i + 3] = 255;
  }
  ox.putImageData(im, 0, 0);
  return out;
}

export function makeTex(c, { color = true, repeat = [1, 1], aniso = 8 } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = aniso;
  if (color) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Gỗ tuyết tùng: ván + vân gỗ + mắt gỗ */
export function texWood(seed = 3, base = [44, 28, 18], planks = 4) {
  const W = 512, H = 512, c = cvs(W, H), x = c.getContext('2d');
  const h = cvs(W, H), hx = h.getContext('2d'), rnd = rng(seed);
  x.fillStyle = rgb(...base); x.fillRect(0, 0, W, H);
  hx.fillStyle = '#808080'; hx.fillRect(0, 0, W, H);
  x.globalCompositeOperation = 'overlay'; x.globalAlpha = 0.7;
  x.drawImage(fbmCanvas(W, H, seed + 5, 5, 2, 1), 0, 0);
  x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
  for (let i = 0; i < 420; i++) {
    const sx = rnd() * W, w = 0.5 + rnd() * 1.6, a = 0.06 + rnd() * 0.2;
    const ph = rnd() * TAU, fr = 0.004 + rnd() * 0.01, amp = 1 + rnd() * 5;
    const p = new Path2D();
    for (let y = 0; y <= H; y += 8) {
      const px = sx + Math.sin(y * fr + ph) * amp;
      y ? p.lineTo(px, y) : p.moveTo(px, y);
    }
    x.strokeStyle = `rgba(0,0,0,${a})`; x.lineWidth = w; x.stroke(p);
    hx.strokeStyle = 'rgba(0,0,0,.22)'; hx.lineWidth = w; hx.stroke(p);
  }
  for (let i = 0; i < 3; i++) {
    const kx = rnd() * W, ky = rnd() * H, kr = 3 + rnd() * 6;
    for (let k = 5; k >= 1; k--) {
      const t = k / 5;
      x.strokeStyle = `rgba(0,0,0,${0.45 - t * 0.2})`; x.lineWidth = 1;
      x.beginPath(); x.ellipse(kx, ky, kr * t * 1.4, kr * t * 2.6, 0, 0, TAU); x.stroke();
    }
  }
  for (let i = 1; i < planks; i++) {
    const px = (W / planks) * i;
    x.fillStyle = 'rgba(0,0,0,.75)'; x.fillRect(px - 1, 0, 2.2, H);
    x.fillStyle = 'rgba(170,135,105,.10)'; x.fillRect(px + 1.2, 0, 1.2, H);
    hx.fillStyle = '#222'; hx.fillRect(px - 1.5, 0, 3, H);
  }
  return { map: c, normal: normalFromHeight(h, 2.0) };
}

/** Sơn mài đỏ son đã phong hóa: nứt, bong tróc lộ gỗ đen */
export function texLacquer(seed = 5) {
  const W = 512, H = 512, c = cvs(W, H), x = c.getContext('2d');
  const h = cvs(W, H), hx = h.getContext('2d'), rnd = rng(seed);
  const wood = texWood(seed + 100, [30, 18, 13], 0);
  x.drawImage(wood.map, 0, 0);
  hx.fillStyle = '#808080'; hx.fillRect(0, 0, W, H);
  x.globalAlpha = 0.86; x.fillStyle = '#8a1912'; x.fillRect(0, 0, W, H); x.globalAlpha = 1;
  x.globalCompositeOperation = 'multiply'; x.globalAlpha = 0.45; x.drawImage(wood.map, 0, 0);
  x.globalAlpha = 1; x.globalCompositeOperation = 'overlay'; x.globalAlpha = 0.5;
  x.drawImage(fbmCanvas(W, H, seed + 300, 5, 3, 1), 0, 0);
  x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
  for (let i = 0; i < 160; i++) {
    let px = rnd() * W, py = rnd() * H, a = rnd() * TAU;
    const p = new Path2D(); p.moveTo(px, py);
    for (let k = 0; k < 4 + rnd() * 8; k++) {
      a += (rnd() - 0.5) * 1.5; px += Math.cos(a) * (5 + rnd() * 9); py += Math.sin(a) * (5 + rnd() * 9); p.lineTo(px, py);
    }
    x.strokeStyle = `rgba(30,8,6,${0.25 + rnd() * 0.4})`; x.lineWidth = 0.5 + rnd() * 0.7; x.stroke(p);
    hx.strokeStyle = 'rgba(0,0,0,.4)'; hx.lineWidth = 0.8; hx.stroke(p);
  }
  for (let i = 0; i < 26; i++) {
    const px = rnd() * W, py = rnd() * H, rad = 2 + rnd() * rnd() * 15, pts = [];
    for (let k = 0; k < 9; k++) {
      const a = (k / 9) * TAU, rr = rad * (0.55 + rnd() * 0.75);
      pts.push([px + Math.cos(a) * rr, py + Math.sin(a) * rr]);
    }
    const path = (d) => { d.beginPath(); d.moveTo(pts[0][0], pts[0][1]); pts.forEach(q => d.lineTo(q[0], q[1])); d.closePath(); };
    x.save(); path(x); x.clip(); x.drawImage(wood.map, 0, 0);
    x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(0, 0, W, H); x.restore();
    path(x); x.strokeStyle = 'rgba(200,110,76,.28)'; x.lineWidth = 1.1; x.stroke();
    path(hx); hx.fillStyle = 'rgba(0,0,0,.32)'; hx.fill();
  }
  for (let i = 0; i < 100; i++) {
    const sx = rnd() * W, top = rnd() * H, len = H * (0.2 + rnd() * 0.5);
    const g = x.createLinearGradient(0, top, 0, top + len);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(0.3, rnd() > 0.5 ? 'rgba(14,4,4,.22)' : 'rgba(220,150,120,.05)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(sx, top, 0.8 + rnd() * 2.4, len);
  }
  return { map: c, normal: normalFromHeight(h, 2.0) };
}

/** Đá phiến lát nền: tấm lớn, khe hẹp, đốm khoáng */
export function texStone(seed = 17, slabs = 4) {
  const W = 1024, H = 1024, c = cvs(W, H), x = c.getContext('2d'), rnd = rng(seed);
  const S = W / slabs;
  x.fillStyle = '#1a1210'; x.fillRect(0, 0, W, H);
  for (let j = 0; j < slabs; j++) for (let i = 0; i < slabs; i++) {
    const t = 0.8 + rnd() * 0.45;
    x.fillStyle = rgb(46 * t, 36 * t, 32 * t);
    x.fillRect(i * S + 1.5, j * S + 1.5, S - 3, S - 3);
  }
  x.globalCompositeOperation = 'overlay'; x.globalAlpha = 0.6;
  x.drawImage(fbmCanvas(W, H, seed + 40, 6, 4, 1), 0, 0);
  x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
  for (let i = 0; i < 5000; i++) {
    const s = 0.5 + rnd() * 2, px = rnd() * W, py = rnd() * H;
    x.fillStyle = rnd() > 0.5 ? `rgba(210,190,170,${0.04 + rnd() * 0.1})` : `rgba(0,0,0,${0.08 + rnd() * 0.2})`;
    x.beginPath(); x.ellipse(px, py, s, s * (0.5 + rnd()), rnd() * TAU, 0, TAU); x.fill();
  }
  x.strokeStyle = 'rgba(0,0,0,.8)'; x.lineWidth = 3;
  for (let i = 0; i <= slabs; i++) {
    x.beginPath(); x.moveTo(i * S, 0); x.lineTo(i * S, H); x.stroke();
    x.beginPath(); x.moveTo(0, i * S); x.lineTo(W, i * S); x.stroke();
  }
  const h = cvs(W, H), hx = h.getContext('2d');
  hx.fillStyle = '#8c8c8c'; hx.fillRect(0, 0, W, H);
  hx.globalAlpha = 0.35; hx.drawImage(fbmCanvas(W, H, seed + 40, 5, 8, 1), 0, 0); hx.globalAlpha = 1;
  hx.strokeStyle = '#303030'; hx.lineWidth = 5;
  for (let i = 0; i <= slabs; i++) {
    hx.beginPath(); hx.moveTo(i * S, 0); hx.lineTo(i * S, H); hx.stroke();
    hx.beginPath(); hx.moveTo(0, i * S); hx.lineTo(W, i * S); hx.stroke();
  }
  return { map: c, normal: normalFromHeight(h, 1.5) };
}

/** Thảm đỏ viền vàng, hoa văn hoa sen lặp theo chiều dài (tile theo trục dọc) */
export function texCarpet() {
  const W = 256, H = 1024, c = cvs(W, H), x = c.getContext('2d');
  x.fillStyle = '#6b0d0b'; x.fillRect(0, 0, W, H);
  x.globalCompositeOperation = 'overlay'; x.globalAlpha = 0.5;
  x.drawImage(fbmCanvas(W, H, 77, 6, 4, 1), 0, 0);
  x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
  x.fillStyle = 'rgba(0,0,0,.18)';
  for (let y = 0; y < H; y += 3) x.fillRect(0, y, W, 1);
  const gold = '#d9a441';
  x.fillStyle = gold; x.fillRect(8, 0, 10, H); x.fillRect(W - 18, 0, 10, H);
  x.fillStyle = 'rgba(217,164,65,.7)'; x.fillRect(24, 0, 3, H); x.fillRect(W - 27, 0, 3, H);
  for (let k = 0; k < 4; k++) {
    const cy = H / 8 + (H / 4) * k, cx = W / 2;
    x.strokeStyle = gold; x.lineWidth = 3;
    x.beginPath(); x.moveTo(cx, cy - 78); x.lineTo(cx + 62, cy); x.lineTo(cx, cy + 78); x.lineTo(cx - 62, cy); x.closePath(); x.stroke();
    x.lineWidth = 2;
    x.beginPath(); x.arc(cx, cy, 30, 0, TAU); x.stroke();
    for (let p = 0; p < 8; p++) {
      const a = (p / 8) * TAU;
      x.beginPath(); x.ellipse(cx + Math.cos(a) * 17, cy + Math.sin(a) * 17, 11, 4.5, a, 0, TAU);
      x.fillStyle = 'rgba(217,164,65,.88)'; x.fill();
    }
    x.fillStyle = gold; x.beginPath(); x.arc(cx, cy, 6, 0, TAU); x.fill();
    x.fillStyle = 'rgba(217,164,65,.55)';
    [cy - 100, cy + 100].forEach(dy => { x.beginPath(); x.arc(cx, dy, 3.5, 0, TAU); x.fill(); });
  }
  return { map: c };
}

/** Tường hậu: gỗ đỏ sẫm + song hoa vàng */
export function texLattice() {
  const W = 1024, H = 1024, c = cvs(W, H), x = c.getContext('2d');
  const wood = texLacquer(9);
  x.drawImage(wood.map, 0, 0, W, H);
  x.fillStyle = 'rgba(30,6,4,.55)'; x.fillRect(0, 0, W, H);
  x.strokeStyle = 'rgba(217,164,65,.55)'; x.lineWidth = 3;
  const step = 64;
  for (let i = -H; i < W + H; i += step) {
    x.beginPath(); x.moveTo(i, 0); x.lineTo(i + H, H); x.stroke();
    x.beginPath(); x.moveTo(i, H); x.lineTo(i + H, 0); x.stroke();
  }
  x.lineWidth = 8; x.strokeStyle = 'rgba(217,164,65,.8)';
  x.strokeRect(10, 10, W - 20, H - 20);
  return { map: c, normal: wood.normal };
}

/** Quầng sáng mềm (dùng cho sprite phát sáng, khói) */
export function texGlow(inner = 'rgba(255,255,255,1)', mid = 'rgba(255,255,255,.35)') {
  const c = cvs(128, 128), x = c.getContext('2d');
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, inner); g.addColorStop(0.35, mid); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  return c;
}

/** Hào quang sau lưng Phật: vòng sáng + tia */
export function texHalo() {
  const S = 1024, c = cvs(S, S), x = c.getContext('2d'), cx = S / 2;
  const g = x.createRadialGradient(cx, cx, 0, cx, cx, cx);
  g.addColorStop(0, 'rgba(255,226,150,.95)');
  g.addColorStop(0.45, 'rgba(255,190,90,.55)');
  g.addColorStop(0.8, 'rgba(255,140,50,.18)');
  g.addColorStop(1, 'rgba(255,120,40,0)');
  x.fillStyle = g; x.fillRect(0, 0, S, S);
  x.save(); x.translate(cx, cx);
  for (let i = 0; i < 36; i++) {
    x.rotate(TAU / 36);
    const lg = x.createLinearGradient(0, 0, 0, -cx);
    lg.addColorStop(0, 'rgba(255,225,150,.40)'); lg.addColorStop(1, 'rgba(255,200,100,0)');
    x.fillStyle = lg; x.beginPath(); x.moveTo(-6, -90); x.lineTo(0, -cx); x.lineTo(6, -90); x.closePath(); x.fill();
  }
  x.restore();
  x.strokeStyle = 'rgba(255,215,130,.9)'; x.lineWidth = 6;
  x.beginPath(); x.arc(cx, cx, S * 0.30, 0, TAU); x.stroke();
  x.lineWidth = 2; x.beginPath(); x.arc(cx, cx, S * 0.34, 0, TAU); x.stroke();
  return c;
}
