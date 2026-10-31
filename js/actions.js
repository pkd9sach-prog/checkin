// actions.js - Mục 4: quà TikTok -> avatar rời chỗ, đi lên thảm, thắp nhang, vái, cắm nhang, lạy, rồi về chỗ.
// Camera zoom vào bàn thờ khi có người đang lễ, trả về toàn cảnh khi xong.
// Chỉnh nhanh: sửa các hằng số trong khối CONFIG ngay dưới đây.
import * as THREE from 'three';

/* ============================== CONFIG ============================== */
const CFG = {
  ENTRY_Z: 7.4,            // chỗ avatar xuất hiện ở đầu thảm
  LANE_X: 0.9,             // avatar vào từ trái/phải thảm xen kẽ (cách tim thảm bấy nhiêu mét)
  WALK_SPEED: 3.4,         // mét/giây
  // số lần lạy theo giá trị quà (tổng kim cương = giá 1 quà x số lượng)
  TIERS: [{ min: 0, bows: 1 }, { min: 10, bows: 3 }, { min: 100, bows: 5 }, { min: 1000, bows: 7 }],
  VAI_TIMES: 3,            // số lần vái khi cầm nhang
  VAI_CYCLE: 1.1,          // giây cho 1 lần vái
  VAI_AMP: 0.28,           // độ cúi khi vái (0..1)
  BOW_CYCLE: 1.7,          // giây cho 1 lần lạy
  MAX_QUEUE: 30,           // hàng đợi tối đa, quá thì bỏ quà nhỏ nhất
  SPEED_PER_QUEUE: 0.35,   // mỗi người đang chờ làm mọi thứ nhanh thêm bấy nhiêu
  MAX_SPEED: 3.2,          // nhanh tối đa
  STICK_SLOTS: 24,         // số cây nhang tối đa cắm thêm trong lư (cây cũ nhất bị thay)
  ZOOM: true,              // camera zoom vào bàn thờ
};
/* ==================================================================== */

const smooth = x => x * x * (3 - 2 * x);
const easeOutBack = u => { const c1 = 1.70158, c3 = c1 + 1, v = u - 1; return 1 + c3 * v * v * v + c1 * v * v; };
const lerpAngle = (a, b, u) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * u;
const bowsFor = value => { let n = CFG.TIERS[0].bows; for (const t of CFG.TIERS) if (value >= t.min) n = t.bows; return n; };

export function createActions(TEMPLE) {
  const { scene, avatars, hooks, AZ, TOP, glowMap, bus, flyTo } = TEMPLE;
  const ZF = AZ + 1.6;                         // chỗ đứng trước bàn thờ

  /* ---------------- đồng hồ hoạt cảnh (tăng tốc khi hàng đợi dài) ---------------- */
  let speed = 1;
  const tweens = [], pollers = [];
  const tween = (dur, fn) => new Promise(res => tweens.push({ t: 0, dur: Math.max(dur, 0.001), fn, res }));
  const wait = s => tween(s, () => {});
  const until = cond => new Promise(res => pollers.push({ cond, res }));

  /* ---------------- nhang ---------------- */
  const stickGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.7, 5); stickGeo.translate(0, 0.35, 0);
  const tipGeo = new THREE.SphereGeometry(0.02, 6, 6);
  const stickMat = new THREE.MeshStandardMaterial({ color: 0x2a1408, roughness: 0.8 });
  const tipMat = new THREE.MeshBasicMaterial({ color: 0xff5a1a, fog: false });
  function makeStick() {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(stickGeo, stickMat));
    const tip = new THREE.Mesh(tipGeo, tipMat); tip.position.y = 0.7; g.add(tip);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowMap, color: 0xff5a1a, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    glow.scale.set(0.22, 0.22, 1); glow.position.y = 0.7; g.add(glow);
    g.userData.glow = glow; g.visible = false; scene.add(g); return g;
  }
  // các chỗ cắm nhang quanh lư hương
  const slots = [];
  [{ r: 0, n: 1 }, { r: 0.07, n: 6 }, { r: 0.14, n: 9 }, { r: 0.22, n: 8 }].forEach(({ r, n }) => {
    for (let i = 0; i < n && slots.length < CFG.STICK_SLOTS; i++) {
      const a = (i / n) * Math.PI * 2 + r * 7;
      slots.push({ g: makeStick(), x: Math.cos(a) * r, z: AZ + Math.sin(a) * r, tx: (Math.random() - 0.5) * 0.22, tz: (Math.random() - 0.5) * 0.22 });
    }
  });
  let nextSlot = 0;
  const held = makeStick();                    // cây nhang đang cầm trên tay
  let holding = null;                          // avatar đang cầm nhang

  hooks.push((dt, t) => {
    const d = dt * speed;
    for (let i = tweens.length - 1; i >= 0; i--) {
      const tw = tweens[i]; tw.t += d;
      const u = Math.min(tw.t / tw.dur, 1);
      tw.fn(u);
      if (u >= 1) { tweens.splice(i, 1); tw.res(); }
    }
    for (let i = pollers.length - 1; i >= 0; i--) if (pollers[i].cond()) pollers.splice(i, 1)[0].res();
    if (holding) { held.position.copy(holding.hand); held.position.y -= 0.1; held.rotation.set(-0.3, 0, 0); }
    const f = 0.2 + Math.sin(t * 7) * 0.03 + Math.sin(t * 13) * 0.02;
    held.userData.glow.scale.set(f, f, 1);
    slots.forEach((s, i) => { if (s.g.visible) { const k = 0.2 + Math.sin(t * 6 + i) * 0.03; s.g.userData.glow.scale.set(k, k, 1); } });
  });

  /* ---------------- chuyển động cơ bản ---------------- */
  function walk(a, tx, tz, onFrame) {
    const sx = a.px, sz = a.pz, dx = tx - sx, dz = tz - sz, dist = Math.hypot(dx, dz);
    const dur = Math.max(dist / CFG.WALK_SPEED, 0.05);
    const y0 = a.yaw, y1 = dist > 0.01 ? Math.atan2(-dx, -dz) : y0, turnT = Math.min(0.25, dur);
    return tween(dur, k => {
      const el = k * dur;
      a.px = sx + dx * k; a.pz = sz + dz * k;
      a.yaw = lerpAngle(y0, y1, Math.min(el / turnT, 1));
      const env = Math.max(0, Math.min(1, el / 0.15, (dur - el) / 0.15)), ph = el * 9;
      a.bobW = Math.abs(Math.sin(ph)) * 0.05 * env; a.sway = Math.sin(ph) * 0.05 * env;
      if (k >= 1) { a.bobW = 0; a.sway = 0; }
      if (onFrame) onFrame();
    });
  }
  function turn(a, yaw, dur = 0.3) { const y0 = a.yaw; return tween(dur, k => { a.yaw = lerpAngle(y0, yaw, smooth(k)); }); }

  /* ---------------- một lượt lễ của 1 người ---------------- */
  let laneToggle = false;
  async function worship(job) {
    avatars.add(job.user);                                       // bảo đảm đã có chỗ ngồi
    const a = avatars.ctl(job.user.id);
    if (!a) return;
    if (a.state === 'in' && a.age < 0.5) await wait(0.5 - a.age);   // chờ avatar hiện hẳn
    avatars.busy(a, true);
    const side = (laneToggle = !laneToggle) ? 1 : -1;
    bus.dispatchEvent(new CustomEvent('worship:start', { detail: job }));
    try {
      await tween(0.3, k => { a.vis = 1 - smooth(k); });          // rời chỗ quỳ
      a.px = side * CFG.LANE_X; a.pz = CFG.ENTRY_Z; a.yaw = 0; a.stand = 1; a.tagK = 1.35;
      await tween(0.3, k => { a.vis = smooth(k); });              // xuất hiện ở đầu thảm
      let zoomed = false;
      await walk(a, 0, ZF, () => { if (CFG.ZOOM && !zoomed && a.pz < -3.5) { zoomed = true; flyTo('worship'); } });
      if (CFG.ZOOM && !zoomed) flyTo('worship');
      await turn(a, 0, 0.3);

      // thắp nhang
      holding = a; a.trackHand = true; held.visible = true; held.scale.setScalar(0.0001);
      await tween(0.6, k => { held.scale.setScalar(Math.max(0.75 * smooth(k), 0.0001)); });

      // vái
      avatars.bowRec(a, speed > 2 ? 1 : CFG.VAI_TIMES, { cycle: CFG.VAI_CYCLE / speed, amp: CFG.VAI_AMP });
      await until(() => !a.bowAnim);

      // cắm nhang vào lư
      const slot = slots[nextSlot]; nextSlot = (nextSlot + 1) % slots.length; slot.g.visible = false;
      const from = held.position.clone(), to = new THREE.Vector3(slot.x, TOP + 0.4, slot.z);
      holding = null; a.trackHand = false;
      bus.dispatchEvent(new CustomEvent('worship:incense', { detail: job }));
      await tween(0.8, k => {
        const e = smooth(k);
        held.position.lerpVectors(from, to, e); held.position.y += Math.sin(Math.PI * k) * 0.5;
        held.rotation.set(-0.3 * (1 - e) + slot.tz * e, 0, slot.tx * e);
        held.scale.setScalar(0.75 + 0.25 * e);
      });
      held.visible = false;
      slot.g.position.copy(to); slot.g.rotation.set(slot.tz, 0, slot.tx); slot.g.scale.setScalar(1); slot.g.visible = true;

      // lạy
      avatars.bowRec(a, bowsFor(job.value), { cycle: CFG.BOW_CYCLE / speed, amp: 1 });
      await until(() => !a.bowAnim);
      await wait(0.2);
      bus.dispatchEvent(new CustomEvent('worship:end', { detail: job }));
      await tween(0.35, k => { a.vis = 1 - smooth(k); });         // biến mất tại bàn thờ
    } finally {
      holding = null; held.visible = false;
      a.trackHand = false; a.bowAnim = null; a.vis = 0;
      a.px = a.x; a.pz = a.z; a.yaw = 0; a.stand = 0; a.bobW = 0; a.sway = 0; a.tagK = 1;
      avatars.busy(a, false);
      if (a.state === 'in') { await tween(0.4, k => { a.vis = Math.max(easeOutBack(k), 0); }); a.vis = 1; }   // hiện lại ở chỗ quỳ
    }
  }

  /* ---------------- hàng đợi ---------------- */
  const jobs = [];
  let running = false;
  async function run() {
    if (running) return;
    running = true;
    while (jobs.length) {
      const job = jobs.shift();
      speed = Math.min(CFG.MAX_SPEED, 1 + jobs.length * CFG.SPEED_PER_QUEUE);
      try { await worship(job); } catch (e) { console.error('[chùa ảo] lỗi khi lễ:', e); }
    }
    speed = 1;
    await wait(0.8);
    running = false;
    if (jobs.length) run(); else if (CFG.ZOOM) flyTo('wide');
  }
  // job = { user: {id, name, avatarUrl}, gift: {name, diamonds, count}, value }
  function enqueue(job) {
    job.user.id = String(job.user.id);
    job.value = Number(job.value) || 1;
    const same = jobs.find(j => j.user.id === job.user.id);
    if (same) { same.value += job.value; same.gift = job.gift || same.gift; }   // cùng người tặng liên tiếp -> gộp lại
    else {
      jobs.push(job);
      if (jobs.length > CFG.MAX_QUEUE) { let mi = 0; jobs.forEach((j, i) => { if (j.value < jobs[mi].value) mi = i; }); jobs.splice(mi, 1); }
    }
    run();
  }

  /* ---------------- phím thử: G = một người ngẫu nhiên tặng quà ---------------- */
  function demoGift(value) {
    let l = avatars.list();
    if (!l.length) { avatars.add({ id: 'demoG', name: 'Phật tử thử' }); l = avatars.list(); }
    const u = l[Math.floor(Math.random() * l.length)];
    const v = value ?? [1, 5, 30, 100, 299, 1000][Math.floor(Math.random() * 6)];
    enqueue({ user: { id: u.id, name: u.name }, gift: { name: 'Quà thử', diamonds: v, count: 1 }, value: v });
  }
  addEventListener('keydown', e => { if (e.key.toLowerCase() === 'g') demoGift(); });

  return { enqueue, demoGift, CFG, get pending() { return jobs.length; } };
}
