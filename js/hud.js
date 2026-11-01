// hud.js - Mục 5: lớp giao diện chồng lên cảnh 3D (đúng khung 9:16 của canvas).
//  1) Banner đầu trang: tên chùa + dòng hướng dẫn đổi luân phiên
//  2) Bảng vàng công đức: top người tặng nhiều nhất trong phiên (lưu lại, tải lại trang/OBS không mất)
//  3) Lời cầu: bình comment bắt đầu bằng "cầu ..." / "xin ..." / "nguyện ..." sẽ hiện lên màn hình
//  4) Banner công đức lớn: khi có quà từ BIG_FROM kim cương trở lên
// Phím L: thử lời cầu. Link: ?hud=0 tắt hết, ?reset=1 xoá bảng vàng, ?prayy=0.58 đổi độ cao lời cầu.
// Chỉnh nhanh: khối CONFIG; sửa chữ trong TIPS / TRIGGER / BLOCK.

/* ============================== CONFIG ============================== */
const CFG = {
  TITLE: 'CHÙA ẢO 9 SẠCH',
  TOP_N: 5,                 // số người trên bảng vàng
  BIG_FROM: 1000,           // quà từ bấy nhiêu kim cương: hiện banner công đức lớn
  BIG_SEC: 6,               // banner công đức lớn hiện mấy giây
  TIP_SEC: 11,              // dòng hướng dẫn đổi mỗi mấy giây
  PRAY_SEC: 7,              // lời cầu hiện tối thiểu mấy giây (câu dài tự kéo thêm)
  PRAY_MAX_LEN: 70,         // lời cầu dài quá thì cắt
  PRAY_QUEUE: 8,            // hàng đợi lời cầu tối đa (đầy thì bỏ lời cũ nhất)
  PRAY_COOLDOWN: 30,        // mỗi người chỉ gửi 1 lời cầu mỗi bấy nhiêu giây
  NAME_LEN: 16,             // cắt tên trên bảng vàng
  Y_TITLE: 0.115, Y_BOARD: 0.175, Y_BIG: 0.31, Y_PRAY: 0.58,   // vị trí dọc (0 = đỉnh, 1 = đáy) tránh vùng TikTok che
  STORE_KEY: 'chuaao.congduc.v1',
};
const TIPS = [
  'Thắp nén hương lòng nơi cửa Phật',
  'Tặng quà để được thắp nhang và lễ Phật',
  'Bình luận "cầu ..." để gửi lời cầu nguyện',
];
// Lời cầu phải bắt đầu bằng một trong các từ này (tránh spam và bình luận linh tinh)
const TRIGGER = /^\s*(?:#cau\b|cầu|cau\s+cho|xin(?!\s+(?:chào|chao|lỗi|loi|cảm\s+ơn|phép|hỏi|link|số|chủ))|nguyện|nguyen|con\s+xin|con\s+cầu|con\s+nguyện)\s*[:,\-]?\s*/iu;
// Từ bị chặn (khớp nguyên từ). Thêm từ vào đây nếu thấy cần.
const BLOCK = ['dm', 'đm', 'vcl', 'vl', 'cc', 'đéo', 'địt', 'lồn', 'cặc', 'đụ', 'cút', 'chết mẹ', 'đồ ngu', 'ăn cứt', 'cho vay', 'vay tiền', 'nạp tiền', 'cá độ', 'kèo', 'sex'];
/* ==================================================================== */

const blockRe = new RegExp('(?<![\\p{L}\\p{N}])(?:' + BLOCK.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')(?![\\p{L}\\p{N}])', 'iu');
const urlRe = /https?:|www\.|\.(?:com|vn|net|org|xyz|me|ly)\b|@\w|\d{8,}/i;     // bỏ link, tài khoản, số điện thoại dài

const cut = (s, n) => { const a = Array.from(String(s || '').replace(/\s+/g, ' ').trim()); return a.length > n ? a.slice(0, n).join('').trim() + '…' : a.join(''); };
const compact = n => n >= 1e6 ? (n / 1e6).toFixed(n >= 1e7 ? 0 : 1).replace(/\.0$/, '') + 'M' : n >= 1e4 ? (n / 1e3).toFixed(n >= 1e5 ? 0 : 1).replace(/\.0$/, '') + 'K' : String(n);

// Tách lời cầu từ bình luận. Trả về chuỗi sạch, hoặc null nếu không phải lời cầu / bị chặn.
export function parsePrayer(text) {
  const t = String(text || '').normalize('NFC');
  if (!TRIGGER.test(t)) return null;
  const body = t.replace(TRIGGER, '').trim();
  if (Array.from(body).length < 3) return null;
  if (urlRe.test(body) || blockRe.test(body)) return null;
  return cut(body, CFG.PRAY_MAX_LEN);
}

export function createHud(TEMPLE) {
  const Q = new URLSearchParams(location.search);
  if (Q.get('hud') === '0') return { enabled: false };
  const prayY = Q.has('prayy') ? Math.min(Math.max(parseFloat(Q.get('prayy')) || CFG.Y_PRAY, 0.05), 0.95) : CFG.Y_PRAY;
  const canvas = TEMPLE.renderer.domElement;

  /* ---------- kiểu dáng ---------- */
  const st = document.createElement('style');
  st.textContent = `
  #hud{position:fixed;z-index:6;pointer-events:none;overflow:hidden;font-family:"Noto Serif","Times New Roman",Georgia,serif;color:#f6e3b4;text-shadow:0 1px 5px rgba(0,0,0,.9)}
  #hud .abs{position:absolute;left:0;right:0}
  #hud .title{text-align:center;letter-spacing:.28em;font-weight:700;font-size:1.05em;color:#ffd978}
  #hud .tip{text-align:center;font-size:.8em;opacity:0;transition:opacity .9s;margin-top:.35em;color:#f0d7a0}
  #hud .line{height:1px;width:46%;margin:.45em auto 0;background:linear-gradient(90deg,transparent,#e0a93a,transparent)}
  #hud .board{left:3%;right:auto;width:44%;padding:.55em .7em .5em;border-radius:.7em;background:linear-gradient(180deg,rgba(25,10,4,.72),rgba(25,10,4,.5));border:1px solid rgba(224,169,58,.35)}
  #hud .bh{font-size:.72em;letter-spacing:.14em;color:#ffd978;font-weight:700;text-align:center;margin-bottom:.35em}
  #hud .row{display:flex;gap:.4em;align-items:baseline;font-size:.82em;line-height:1.55;padding:0 .25em;border-radius:.3em;transition:background .8s}
  #hud .row.flash{background:rgba(255,217,120,.35);transition:none}
  #hud .rk{width:1.1em;text-align:center;font-weight:700;color:#e0a93a}
  #hud .row:nth-child(1) .rk{color:#ffe27a}#hud .row:nth-child(2) .rk{color:#e6e6e6}#hud .row:nth-child(3) .rk{color:#d99a5a}
  #hud .nm{flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  #hud .vl{font-weight:700;color:#ffd978}
  #hud .empty{font-size:.75em;opacity:.7;text-align:center;padding:.2em 0}
  #hud .big{left:50%;right:auto;width:92%;transform:translate(-50%,-30px);opacity:0;transition:opacity .7s,transform .7s;text-align:center;padding:.7em 1em;border-radius:.9em;
    background:linear-gradient(90deg,rgba(60,22,6,0),rgba(110,45,10,.85) 20%,rgba(110,45,10,.85) 80%,rgba(60,22,6,0));border-top:1px solid #e0a93a;border-bottom:1px solid #e0a93a}
  #hud .big.on{opacity:1;transform:translate(-50%,0)}
  #hud .big .k{font-size:.72em;letter-spacing:.3em;color:#ffd978}
  #hud .big .n{font-size:1.25em;font-weight:700;color:#fff1c8;margin:.15em 0}
  #hud .big .g{font-size:.82em;color:#f0d7a0}
  #hud .pray{left:50%;right:auto;width:84%;transform:translate(-50%,10px);opacity:0;transition:opacity .8s,transform .8s;text-align:center;padding:.6em 1em;border-radius:1em;
    background:radial-gradient(ellipse at center,rgba(25,10,4,.7),rgba(25,10,4,.4) 70%,rgba(25,10,4,0))}
  #hud .pray.on{opacity:1;transform:translate(-50%,0)}
  #hud .pray .w{font-size:.72em;letter-spacing:.12em;color:#ffd978}
  #hud .pray .t{font-size:1em;font-style:italic;line-height:1.4;margin-top:.2em}`;
  document.head.appendChild(st);

  const root = document.createElement('div'); root.id = 'hud';
  const el = (cls, parent = root, tag = 'div') => { const d = document.createElement(tag); d.className = cls; parent.appendChild(d); return d; };

  const head = el('abs'); head.style.top = (CFG.Y_TITLE * 100) + '%';
  const title = el('title', head); title.textContent = CFG.TITLE;
  const tip = el('tip', head); el('line', head);

  const board = el('abs board'); board.style.top = (CFG.Y_BOARD * 100) + '%';
  const bh = el('bh', board); bh.textContent = 'BẢNG VÀNG CÔNG ĐỨC';
  const rows = el('rows', board);

  const big = el('abs big'); big.style.top = (CFG.Y_BIG * 100) + '%';
  const bigK = el('k', big), bigN = el('n', big), bigG = el('g', big);
  bigK.textContent = 'CÔNG ĐỨC LỚN';

  const pray = el('abs pray'); pray.style.top = (prayY * 100) + '%';
  const prayW = el('w', pray), prayT = el('t', pray);

  document.body.appendChild(root);
  function place() {
    const r = canvas.getBoundingClientRect();
    root.style.left = r.left + 'px'; root.style.top = r.top + 'px'; root.style.width = r.width + 'px'; root.style.height = r.height + 'px';
    root.style.fontSize = Math.max(11, Math.round(r.width * 0.038)) + 'px';
  }
  addEventListener('resize', place); place();

  /* ---------- 1) dòng hướng dẫn luân phiên ---------- */
  let tipI = 0;
  function nextTip() {
    tip.style.opacity = '0';
    setTimeout(() => { tip.textContent = TIPS[tipI++ % TIPS.length]; tip.style.opacity = '1'; }, 900);
  }
  nextTip(); setInterval(nextTip, CFG.TIP_SEC * 1000);

  /* ---------- 2) bảng vàng công đức ---------- */
  const totals = new Map();                       // id -> { name, total }
  if (Q.get('reset') === '1') { try { localStorage.removeItem(CFG.STORE_KEY); } catch (e) { /* bỏ qua */ } }
  try {
    const raw = JSON.parse(localStorage.getItem(CFG.STORE_KEY) || 'null');
    if (raw && Array.isArray(raw.list)) raw.list.forEach(([id, name, total]) => totals.set(String(id), { name, total: Number(total) || 0 }));
  } catch (e) { /* bỏ qua */ }
  let saveT = null;
  function save() {
    clearTimeout(saveT);
    saveT = setTimeout(() => { try { localStorage.setItem(CFG.STORE_KEY, JSON.stringify({ list: [...totals].map(([id, v]) => [id, v.name, v.total]) })); } catch (e) { /* bỏ qua */ } }, 800);
  }
  function renderBoard(flashId) {
    rows.textContent = '';
    const top = [...totals].sort((a, b) => b[1].total - a[1].total).slice(0, CFG.TOP_N);
    if (!top.length) { const e = el('empty', rows); e.textContent = 'Hãy là người đầu tiên thắp nhang'; return; }
    top.forEach(([id, v], i) => {
      const r = el('row', rows);
      el('rk', r).textContent = String(i + 1);
      el('nm', r).textContent = cut(v.name, CFG.NAME_LEN);
      el('vl', r).textContent = compact(v.total);
      if (id === flashId) { r.classList.add('flash'); requestAnimationFrame(() => requestAnimationFrame(() => r.classList.remove('flash'))); }
    });
  }
  renderBoard();
  function addMerit(user, value) {
    const id = String(user.id), cur = totals.get(id) || { name: user.name || 'Phật tử', total: 0 };
    cur.name = user.name || cur.name; cur.total += Math.max(1, Math.round(value));
    totals.set(id, cur);
    if (totals.size > 300) {                       // giữ nhẹ: bỏ bớt người ít nhất
      let mi = null; totals.forEach((v, k) => { if (mi === null || v.total < totals.get(mi).total) mi = k; }); totals.delete(mi);
    }
    renderBoard(id); save();
  }

  /* ---------- 4) banner công đức lớn (xếp hàng, hiện lần lượt) ---------- */
  const bigQ = []; let bigBusy = false;
  function bigNext() {
    if (bigBusy || !bigQ.length) return;
    bigBusy = true;
    const j = bigQ.shift();
    bigN.textContent = cut(j.user.name || 'Phật tử', 24);
    const g = j.gift || {};
    bigG.textContent = `đã dâng ${g.name || 'quà'}${g.count > 1 ? ' x' + g.count : ''} · ${compact(j.value)} kim cương`;
    big.classList.add('on');
    setTimeout(() => { big.classList.remove('on'); setTimeout(() => { bigBusy = false; bigNext(); }, 800); }, CFG.BIG_SEC * 1000);
  }

  /* ---------- 3) lời cầu ---------- */
  const prayQ = []; let prayBusy = false; const lastPray = new Map(), lastText = new Map();
  function prayNext() {
    if (prayBusy || !prayQ.length) return;
    prayBusy = true;
    const p = prayQ.shift();
    prayW.textContent = cut(p.name, 22) + ' nguyện cầu';
    prayT.textContent = '“' + p.text + '”';
    pray.classList.add('on');
    const sec = Math.max(CFG.PRAY_SEC, p.text.length * 0.09) / Math.min(1 + prayQ.length * 0.25, 2);   // hàng đợi dài thì rút ngắn
    setTimeout(() => { pray.classList.remove('on'); setTimeout(() => { prayBusy = false; prayNext(); }, 900); }, sec * 1000);
  }
  function addPrayer(user, text) {
    const t = parsePrayer(text);
    if (!t || !user) return false;
    const id = String(user.id || user.name), now = Date.now();
    if (now - (lastPray.get(id) || 0) < CFG.PRAY_COOLDOWN * 1000) return false;
    if (lastText.get(id) === t) return false;
    lastPray.set(id, now); lastText.set(id, t);
    if (lastPray.size > 500) lastPray.delete(lastPray.keys().next().value);
    prayQ.push({ name: user.name || 'Phật tử', text: t });
    while (prayQ.length > CFG.PRAY_QUEUE) prayQ.shift();
    prayNext();
    return true;
  }

  /* ---------- nối sự kiện ---------- */
  TEMPLE.bus.addEventListener('gift', e => {
    const m = e.detail; if (!m?.user) return;
    const value = Number(m.value) || 1;
    addMerit(m.user, value);
    if (value >= CFG.BIG_FROM) { bigQ.push({ user: m.user, gift: m.gift, value }); bigNext(); }
  });
  TEMPLE.bus.addEventListener('chat', e => { const m = e.detail; if (m?.user) addPrayer(m.user, m.text); });

  // Phím L: thử lời cầu
  const DEMO_PRAY = ['cầu bình an cho gia đình', 'xin cho mẹ con luôn mạnh khỏe', 'nguyện cho mọi người an lạc', 'cầu cho con thi đỗ', 'cầu công việc thuận lợi, làm ăn phát đạt'];
  addEventListener('keydown', e => {
    if (e.key.toLowerCase() !== 'l') return;
    const l = TEMPLE.avatars.list(); const u = l.length ? l[Math.floor(Math.random() * l.length)] : { id: 'demoL', name: 'Phật tử thử' };
    lastPray.delete(String(u.id));
    addPrayer({ id: u.id, name: u.name }, DEMO_PRAY[Math.floor(Math.random() * DEMO_PRAY.length)]);
  });

  return { enabled: true, totals, addPrayer, addMerit, parsePrayer, reset() { totals.clear(); renderBoard(); save(); } };
}
