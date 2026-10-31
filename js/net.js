// net.js - Mục 4: nhận sự kiện TikTok từ server Node.js qua WebSocket.
// Mặc định nối tới cùng địa chỉ trang đang mở (ws://localhost:8080). Đổi bằng ?ws=ws://may-khac:8080
export function connectNet(TEMPLE) {
  const Q = new URLSearchParams(location.search);
  const DEBUG = Q.get('debug') === '1';
  if (location.protocol === 'file:') return { connected: false };
  const url = Q.get('ws') || `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`;
  const { avatars, actions, bus } = TEMPLE;
  const state = { connected: false, url };

  let badge = null;
  if (DEBUG) {
    badge = document.createElement('div');
    badge.style.cssText = 'position:fixed;left:10px;top:8px;z-index:6;font:12px system-ui;color:#e8c98a;background:rgba(0,0,0,.55);padding:3px 8px;border-radius:10px;pointer-events:none';
    document.body.appendChild(badge);
  }
  const show = t => { if (badge) badge.textContent = t; };

  function handle(m) {
    bus.dispatchEvent(new CustomEvent(m.type, { detail: m }));   // Mục 5 (HUD) sẽ nghe các sự kiện này
    if (m.type === 'roster') (m.users || []).forEach(u => avatars.add(u));
    else if (m.type === 'join' || m.type === 'chat') { if (m.user) avatars.add(m.user); }
    else if (m.type === 'gift') { actions.enqueue({ user: m.user, gift: m.gift, value: m.value }); }
    else if (m.type === 'status') { console.log('[server]', m.text); show('● ' + m.text); }
  }

  let ws, delay = 1000;
  function open() {
    try { ws = new WebSocket(url); } catch (e) { return setTimeout(open, 5000); }
    ws.onopen = () => { state.connected = true; delay = 1000; show('● Đã nối server'); console.log('[net] đã nối', url); };
    ws.onmessage = e => { try { handle(JSON.parse(e.data)); } catch (err) { console.error('[net] tin nhắn lỗi', err); } };
    ws.onclose = () => { state.connected = false; show('○ Mất kết nối, đang nối lại...'); delay = Math.min(delay * 1.5, 8000); setTimeout(open, delay); };
    ws.onerror = () => { try { ws.close(); } catch (e) { /* bỏ qua */ } };
  }
  open();
  return state;
}
