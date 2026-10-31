// server.js - Mục 4: máy chủ Node.js cho Chùa Ảo.
//  - Bắt sự kiện TikTok Live (vào phòng, bình luận, quà) bằng tiktok-live-connector
//  - Phát về trang 3D qua WebSocket
//  - Phục vụ luôn các file của trang (index.html, js/...) nên chỉ cần chạy 1 lệnh
//  - Tải hộ ảnh đại diện (tránh lỗi CORS)
// Chạy thật:  node server.js ten_tiktok_cua_ban      (không cần dấu @)
// Chạy thử:   node server.js --demo                  (khán giả + quà giả, không cần đang live)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 8080);
const args = process.argv.slice(2);
const DEMO = args.includes('--demo');
const USER = (args.find(a => !a.startsWith('--')) || '').replace(/^@/, '').trim();

if (typeof fetch !== 'function') { console.error('Cần Node.js 18 trở lên (gõ "node -v" để xem phiên bản).'); process.exit(1); }

/* ------------------------------ phát tin ------------------------------ */
const roster = new Map();               // người xem gần đây (để khi tải lại trang/OBS vẫn có avatar)
const clients = new Set();
function send(ws, obj) { if (ws.readyState === 1) ws.send(JSON.stringify(obj)); }
function broadcast(obj) { const s = JSON.stringify(obj); clients.forEach(ws => { if (ws.readyState === 1) ws.send(s); }); }
function remember(u) { roster.delete(u.id); roster.set(u.id, u); while (roster.size > 78) roster.delete(roster.keys().next().value); }
const status = text => { console.log('[TikTok]', text); broadcast({ type: 'status', text }); };
function emitJoin(u) { if (!u.id) return; remember(u); broadcast({ type: 'join', user: u }); }
function emitChat(u, text) { if (!u.id) return; remember(u); broadcast({ type: 'chat', user: u, text }); }
function emitGift(u, gift) {
  if (!u.id) return; remember(u);
  const value = Math.max(1, (gift.diamonds || 1) * (gift.count || 1));
  console.log(`[Quà] ${u.name} tặng ${gift.name} x${gift.count} (${value} kim cương)`);
  broadcast({ type: 'gift', user: u, gift, value });
}

/* ------------------- chuẩn hoá dữ liệu (chạy được cả bản 1.x và 2.x) ------------------- */
function normUser(d) {
  const u = d.user || d;
  const uniqueId = String(u.uniqueId ?? d.uniqueId ?? '');
  const id = uniqueId || String(u.userId ?? d.userId ?? '');
  const name = u.nickname || d.nickname || uniqueId || 'Phật tử';
  const pic = d.profilePictureUrl || u.profilePictureUrl || u.profilePicture?.url?.[0] || u.profilePicture?.urls?.[0] || '';
  return { id, name, avatarUrl: pic ? '/avatar?u=' + encodeURIComponent(pic) : '' };
}
function normGift(d) {
  const g = d.giftDetails || {};
  return {
    name: d.giftName ?? g.giftName ?? 'Quà',
    diamonds: Number(d.diamondCount ?? g.diamondCount ?? 1) || 1,
    count: Number(d.repeatCount ?? 1) || 1,
    streakable: (d.giftType ?? g.giftType) === 1,
    ended: !!d.repeatEnd,
  };
}

/* ------------------------------ TikTok ------------------------------ */
let retryTimer = null;
async function startTikTok() {
  const mod = await import('tiktok-live-connector');
  const lib = { ...(mod.default && typeof mod.default === 'object' ? mod.default : {}), ...mod };
  const Conn = lib.TikTokLiveConnection || lib.WebcastPushConnection;
  if (!Conn) throw new Error('Không tìm thấy lớp kết nối trong tiktok-live-connector (thử: npm install tiktok-live-connector@latest)');
  const conn = new Conn(USER);
  const retry = (sec, why) => {
    if (retryTimer) return;
    status(`${why} Thử nối lại sau ${sec} giây...`);
    retryTimer = setTimeout(() => { retryTimer = null; connect(); }, sec * 1000);
  };
  conn.on('member', d => emitJoin(normUser(d)));
  conn.on('chat', d => { const u = normUser(d); emitChat(u, String(d.comment ?? d.content ?? '')); });
  conn.on('gift', d => {
    const g = normGift(d);
    if (g.streakable && !g.ended) return;                // quà bấm liên tiếp: chỉ tính khi đã kết thúc chuỗi
    emitGift(normUser(d), { name: g.name, diamonds: g.diamonds, count: g.count });
  });
  conn.on('streamEnd', () => status('Phiên live đã kết thúc.'));
  conn.on('disconnected', () => retry(10, 'Mất kết nối TikTok.'));
  conn.on('error', e => console.error('[TikTok] lỗi:', e?.message || e));
  async function connect() {
    try {
      status(`Đang nối vào live của @${USER}...`);
      const st = await conn.connect();
      status(`Đã nối live @${USER}` + (st?.roomId ? ` (phòng ${st.roomId})` : ''));
    } catch (e) {
      retry(20, `Chưa nối được (${e?.message || e}). Kiểm tra: tài khoản @${USER} đang live chưa, gõ đúng tên chưa.`);
    }
  }
  await connect();
}

/* ------------------------------ chạy thử ------------------------------ */
function startDemo() {
  const names = ['Ngọc Lễ', 'Hoàng Anh', 'Minh Châu', 'Bé Mít', 'Thu Trang', 'Quốc Anh', 'Duy Bùi', 'Mỹ Đình', 'Lan Hương', 'Tuấn Kiệt', 'An Nhiên', 'Phú Bà Bình Dương', 'Khánh Ngọc', 'Hà My', 'Nguyễn Văn Thành Đạt'];
  let n = 0;
  setInterval(() => {
    if (n >= 40) return; n++;
    emitJoin({ id: 'd' + n, name: names[n % names.length] + (n > names.length ? ' ' + n : ''), avatarUrl: '' });
  }, 400);
  const gifts = [['Hoa hồng', 1], ['Finger Heart', 5], ['Hoa sen', 30], ['Vương miện', 100], ['Sư tử', 1000]];
  setInterval(() => {
    if (!n) return;
    const id = 'd' + (1 + Math.floor(Math.random() * n)), u = roster.get(id); if (!u) return;
    const [name, diamonds] = gifts[Math.floor(Math.random() * gifts.length)];
    emitGift(u, { name, diamonds, count: 1 });
  }, 6000);
  status('CHẾ ĐỘ THỬ: khán giả và quà giả.');
}

/* ------------------------ ảnh đại diện (proxy) ------------------------ */
const PIC_DOMAINS = ['tiktokcdn.com', 'tiktokcdn-us.com', 'tiktokcdn-eu.com', 'ibyteimg.com', 'byteimg.com', 'tiktokv.com', 'tiktokv.us', 'ibytedtos.com', 'bytecdn.com', 'muscdn.com', 'ttwstatic.com'];
const picCache = new Map();
async function avatarProxy(u, res) {
  const fail = code => { res.writeHead(code, { 'Access-Control-Allow-Origin': '*' }); res.end(); };
  let target; try { target = new URL(u); } catch { return fail(400); }
  const h = target.hostname.toLowerCase();
  if (target.protocol !== 'https:' || !PIC_DOMAINS.some(d => h === d || h.endsWith('.' + d))) return fail(403);
  let hit = picCache.get(u);
  if (!hit) {
    const ac = new AbortController(), to = setTimeout(() => ac.abort(), 8000);
    try {
      const r = await fetch(u, { signal: ac.signal, headers: { 'user-agent': 'Mozilla/5.0' } });
      const type = r.headers.get('content-type') || '';
      if (!r.ok || !type.startsWith('image/')) return fail(502);
      const buf = Buffer.from(await r.arrayBuffer());
      if (buf.length > 2_000_000) return fail(413);
      hit = { type, buf };
      picCache.set(u, hit); if (picCache.size > 300) picCache.delete(picCache.keys().next().value);
    } catch { return fail(504); } finally { clearTimeout(to); }
  }
  res.writeHead(200, { 'content-type': hit.type, 'cache-control': 'public, max-age=3600', 'Access-Control-Allow-Origin': '*' });
  res.end(hit.buf);
}

/* ------------------------ phục vụ file của trang ------------------------ */
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/avatar') return avatarProxy(url.searchParams.get('u') || '', res);
  let rel; try { rel = decodeURIComponent(url.pathname); } catch { res.writeHead(400); return res.end(); }
  if (rel === '/') rel = '/index.html';
  const file = path.normalize(path.join(ROOT, rel));
  const ext = path.extname(file).toLowerCase(), base = path.basename(file).toLowerCase();
  const blocked = !file.startsWith(ROOT + path.sep) || file.includes('node_modules') || base === 'server.js' || base.startsWith('package');
  if (blocked || !MIME[ext]) { res.writeHead(404); return res.end('Không tìm thấy'); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Không tìm thấy'); }
    res.writeHead(200, { 'content-type': MIME[ext], 'cache-control': 'no-store' });
    res.end(data);
  });
});
const wss = new WebSocketServer({ server });
wss.on('connection', ws => {
  clients.add(ws); ws.on('close', () => clients.delete(ws));
  send(ws, { type: 'status', text: DEMO ? 'Chế độ thử' : (USER ? `Server sẵn sàng (@${USER})` : 'Server sẵn sàng') });
  send(ws, { type: 'roster', users: [...roster.values()] });
});
server.on('error', e => {
  if (e.code === 'EADDRINUSE') console.error(`Cổng ${PORT} đang bận (có thể bạn đang chạy server ở cửa sổ khác). Đóng cửa sổ đó hoặc chạy: PORT=8081 node server.js ...`);
  else console.error(e);
  process.exit(1);
});
server.listen(PORT, () => {
  console.log('==============================================');
  console.log(` Chùa Ảo đang chạy.  Mở trang:  http://localhost:${PORT}`);
  console.log(' (OBS / LIVE Studio cũng dùng đúng địa chỉ này)');
  console.log('==============================================');
  if (DEMO) startDemo();
  else if (USER) startTikTok().catch(e => console.error('[TikTok] không khởi động được:', e?.message || e));
  else console.log('Bạn chưa nhập tên TikTok. Chạy:  node server.js ten_tiktok   hoặc   node server.js --demo');
});
