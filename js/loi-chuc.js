// loi-chuc.js - Mỗi lần có người tặng quà (hoa) và lên thắp nhang: hiện ĐÚNG MỘT câu cảm ơn + lời chúc.
// - 3 nhóm câu: quà thường, quà hoa (tên quà có "hoa", "rose", "lotus"...), quà lớn (từ 1000 kim cương)
// - Mỗi nhóm xáo bài: dùng hết câu này mới lặp lại, không bao giờ đọc trùng 2 lần liên tiếp
// - Hiện dạng phụ đề ở giữa-dưới khung 9:16 khi người đó cắm nhang và bắt đầu lạy
// - Đọc thành tiếng (tuỳ chọn): thêm ?voice=1 vào link (cần máy có giọng tiếng Việt; OBS/LIVE Studio thường không có)
// Thêm/sửa câu: sửa 3 danh sách bên dưới. {ten} sẽ được thay bằng tên người tặng.
// Phím H: thử nhanh một người tặng quà HOA. Phím G (mục 4): quà thường ngẫu nhiên.
// Chỉnh nhanh: khối CONFIG.

/* ============================== CONFIG ============================== */
const CFG = {
  BIG_FROM: 1000,        // từ giá trị này (tổng kim cương) là quà lớn
  MAX_NAME: 22,          // tên dài quá thì cắt bớt
  SHOW_SEC: 6.5,         // phụ đề hiện tối thiểu (giây); câu dài tự kéo thêm
  POS_Y: 0.7,            // vị trí dọc của phụ đề trên khung hình (0 = sát đỉnh, 1 = sát đáy); ?capy=0.6 để đổi
  FONT: 0.042,           // cỡ chữ = tỉ lệ bề rộng khung hình
  SPEAK_MAX_QUEUE: 2,    // chỉ đọc thành tiếng khi hàng đợi quà không dài hơn mức này
  FLOWER: /hoa|rose|lotus|flower|tulip|lily|bouquet|peony|daisy|sunflower|hướng dương|cúc|\bsen\b/i,
};
/* ==================================================================== */

// Quà thường
const GENERAL = [
  'Cảm ơn {ten} đã thắp nén hương lòng, nguyện bạn và gia đình luôn bình an.',
  'Nén hương của {ten} đã thắp lên, chúc bạn một ngày tâm an, vạn sự hanh thông.',
  'Cảm ơn {ten} đã ghé chùa lễ Phật, chúc bạn thân tâm thường an lạc.',
  'Một lạy tri ân {ten}, nguyện mọi điều lành tìm về bên bạn.',
  'Cảm ơn tấm lòng của {ten}, chúc bạn thuận duyên trong công việc và bình yên trong cuộc sống.',
  'Nam mô A Di Đà Phật, cảm ơn {ten} và chúc bạn sức khỏe dồi dào, tâm luôn thanh thản.',
  'Cảm ơn {ten} đã cùng thắp sáng ngọn đèn lòng, chúc bạn gặp nhiều may mắn và an vui.',
  'Hương thơm gửi tới {ten}, chúc bạn gia đạo êm ấm, lòng người nhẹ nhàng.',
  'Cảm ơn {ten} đã đến lễ Phật, nguyện bao muộn phiền hôm nay đều tan theo khói hương.',
  'Cảm ơn {ten}, chúc bạn bước đi bình an và gặp toàn người tốt, việc lành.',
  'Chùa xin tri ân {ten}, nguyện phúc lành đong đầy cho bạn và những người thương yêu.',
  'Cảm ơn {ten} đã dâng nén hương thành tâm, chúc bạn mọi việc suôn sẻ, lòng không lo âu.',
  'Nén nhang vừa thắp là tấm lòng của {ten}, chúc bạn bình an từ sáng đến tối.',
  'Cảm ơn {ten} đã chia sẻ một chút duyên lành, chúc bạn luôn mạnh khỏe và vui vẻ.',
  'A Di Đà Phật, cảm ơn {ten}, chúc bạn một đời an nhiên như ngọn đèn sáng trước Phật.',
  'Cảm ơn {ten} đã lễ Phật cùng mọi người, chúc bạn gặp nhiều niềm vui nhỏ mỗi ngày.',
  'Chúc {ten} tâm an như mặt hồ phẳng lặng, xin cảm ơn tấm lòng của bạn hôm nay.',
];

// Quà hoa
const FLOWER = [
  'Cảm ơn {ten} đã dâng đóa hoa lên Phật, chúc bạn tâm hồn luôn tươi thắm và an lạc.',
  'Đóa hoa của {ten} thơm ngát trước điện Phật, nguyện bạn mọi việc đều nở hoa.',
  'Cảm ơn {ten} đã hiến hoa cúng Phật, chúc bạn một ngày nhẹ nhàng như cánh sen.',
  'Hoa dâng Phật là tấm lòng của {ten}, chúc bạn bình an và nhiều niềm vui.',
  'Cảm ơn {ten} đã dâng hoa, nguyện cuộc sống của bạn ngát hương như đóa hoa này.',
  'Một đóa hoa, một tấm lòng thành, cảm ơn {ten} và chúc bạn gia đình hạnh phúc, êm ấm.',
  'Cảm ơn {ten} đã mang hoa đến chùa, chúc bạn tâm sáng như hoa sen giữa hồ.',
  'Hương hoa gửi tới {ten}, chúc bạn sức khỏe dồi dào và lòng luôn thanh thản.',
  'Nam mô A Di Đà Phật, cảm ơn đóa hoa của {ten}, chúc bạn gặp nhiều duyên lành.',
  'Cảm ơn {ten} đã dâng hoa lễ Phật, nguyện phúc đức nở rộ trong nhà bạn.',
  'Đóa hoa thơm của {ten} làm chánh điện thêm rạng rỡ, xin cảm ơn và chúc bạn an vui.',
  'Cảm ơn {ten} đã dâng hoa, chúc bạn mỗi ngày đều bắt đầu bằng một nụ cười hiền.',
];

// Quà lớn
const BIG = [
  'Công đức của {ten} thật lớn lao, cảm ơn bạn và nguyện phúc lành đến với cả gia đình.',
  'Chùa xin tri ân tấm lòng rộng mở của {ten}, nguyện bạn an lạc, sức khỏe và muôn việc hanh thông.',
  'Cảm ơn {ten} đã phát tâm hào hiệp, nguyện bạn gieo duyên lành và gặt hái an vui trọn đời.',
  'A Di Đà Phật, tấm lòng thành của {ten} ấm áp cả chánh điện, xin chúc bạn bình an viên mãn.',
  'Cảm ơn {ten} đã phát tâm cúng dường, nguyện công đức này hồi hướng đến bạn và những người thương.',
  'Thành kính cảm ơn {ten}, chúc bạn thân tâm an lạc và mọi điều tốt lành luôn theo bước.',
];

// Xáo bài: mỗi nhóm đi hết một vòng mới lặp lại; câu đầu vòng mới không trùng câu cuối vòng trước
function makeBag(list) {
  let bag = [], last = -1;
  return () => {
    if (!bag.length) {
      bag = list.map((_, i) => i);
      for (let i = bag.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [bag[i], bag[j]] = [bag[j], bag[i]]; }
      if (bag.length > 1 && bag[bag.length - 1] === last) { const t = bag[0]; bag[0] = bag[bag.length - 1]; bag[bag.length - 1] = t; }
    }
    last = bag.pop();
    return list[last];
  };
}
const nextGeneral = makeBag(GENERAL), nextFlower = makeBag(FLOWER), nextBig = makeBag(BIG);

const cleanName = n => {
  const a = Array.from(String(n || 'Phật tử').replace(/\s+/g, ' ').trim() || 'Phật tử');
  return a.length > CFG.MAX_NAME ? a.slice(0, CFG.MAX_NAME).join('').trim() + '…' : a.join('');
};

export function createBlessings(TEMPLE) {
  const Q = new URLSearchParams(location.search);
  if (Q.get('loichuc') === '0') return { enabled: false };
  const posY = Q.has('capy') ? Math.min(Math.max(parseFloat(Q.get('capy')) || CFG.POS_Y, 0.05), 0.95) : CFG.POS_Y;
  const VOICE = Q.get('voice') === '1' && 'speechSynthesis' in window;

  /* ---------- phụ đề (đặt đúng lên khung hình 9:16 của canvas) ---------- */
  const box = document.createElement('div');
  box.style.cssText = [
    'position:fixed', 'z-index:6', 'pointer-events:none', 'text-align:center', 'box-sizing:border-box',
    'opacity:0', 'transform:translateY(8px)', 'transition:opacity .7s ease, transform .7s ease',
    'font-family:"Noto Serif","Times New Roman",Georgia,serif', 'line-height:1.45', 'color:#f6e3b4',
    'text-shadow:0 1px 6px rgba(0,0,0,.9),0 0 14px rgba(0,0,0,.7)',
    'background:radial-gradient(ellipse at center,rgba(20,8,3,.72) 0%,rgba(20,8,3,.5) 60%,rgba(20,8,3,0) 100%)',
    'padding:.7em 1.2em',
  ].join(';');
  document.body.appendChild(box);
  const canvas = TEMPLE.renderer.domElement;
  function place() {
    const r = canvas.getBoundingClientRect();
    box.style.width = Math.round(r.width * 0.92) + 'px';
    box.style.left = Math.round(r.left + r.width * 0.04) + 'px';
    box.style.top = Math.round(r.top + r.height * posY) + 'px';
    box.style.fontSize = Math.max(12, Math.round(r.width * CFG.FONT)) + 'px';
  }
  addEventListener('resize', place); place();

  let hideTimer = null;
  function show(template, name) {
    place();
    const [a, b = ''] = template.split('{ten}');
    box.textContent = '';                                    // dựng bằng textContent: tên người xem không thể chèn mã vào trang
    box.append(document.createTextNode(a));
    const nm = document.createElement('b'); nm.textContent = name; nm.style.cssText = 'color:#ffd978;font-weight:700';
    box.append(nm, document.createTextNode(b));
    box.style.opacity = '1'; box.style.transform = 'translateY(0)';
    clearTimeout(hideTimer);
    const sec = Math.max(CFG.SHOW_SEC, template.length * 0.085);
    hideTimer = setTimeout(() => { box.style.opacity = '0'; box.style.transform = 'translateY(8px)'; }, sec * 1000);
  }

  /* ---------- đọc thành tiếng (tuỳ chọn) ---------- */
  function speak(text) {
    try {
      const synth = window.speechSynthesis; synth.cancel();
      const u = new SpeechSynthesisUtterance(text);
      const v = synth.getVoices().find(x => /^vi/i.test(x.lang));
      if (!v) return;                                        // máy không có giọng Việt thì thôi, vẫn có phụ đề
      u.voice = v; u.lang = v.lang; u.rate = 0.88; u.pitch = 0.95; u.volume = 1;
      synth.speak(u);
    } catch (e) { /* bỏ qua */ }
  }
  if (VOICE) speechSynthesis.getVoices();                    // nạp danh sách giọng

  /* ---------- chọn câu ---------- */
  function pickLine(job) {
    const gname = String(job.gift?.name || '');
    if ((job.value || 0) >= CFG.BIG_FROM) return nextBig();
    if (CFG.FLOWER.test(gname)) return nextFlower();
    return nextGeneral();
  }
  function say(job) {
    const name = cleanName(job.user?.name);
    const tpl = pickLine(job);
    show(tpl, name);
    if (VOICE && (TEMPLE.actions?.pending ?? 0) <= CFG.SPEAK_MAX_QUEUE) speak(tpl.replace('{ten}', name));
    return tpl.replace('{ten}', name);
  }

  // Hiện khi người đó cắm nhang vào lư và bắt đầu lạy
  TEMPLE.bus.addEventListener('worship:incense', e => { if (e.detail) say(e.detail); });

  // Phím H: thử quà hoa
  addEventListener('keydown', e => {
    if (e.key.toLowerCase() !== 'h') return;
    const av = TEMPLE.avatars;
    let l = av.list();
    if (!l.length) { av.add({ id: 'demoH', name: 'Phật tử thử' }); l = av.list(); }
    const u = l[Math.floor(Math.random() * l.length)];
    TEMPLE.actions.enqueue({ user: { id: u.id, name: u.name }, gift: { name: 'Hoa hồng', diamonds: 1, count: 1 }, value: 1 });
  });

  return { enabled: true, say, lists: { GENERAL, FLOWER, BIG } };
}
