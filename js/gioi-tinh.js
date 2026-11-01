// gioi-tinh.js - Đoán nam / nữ từ tên người xem để avatar nam hoặc nữ bước lên thắp nhang.
// Cách đoán (cộng điểm, dương = nữ, âm = nam):
//   - Tên Việt: tên đệm "Thị" -> nữ, "Văn" -> nam; tên gọi (từ cuối) có trọng số lớn nhất
//   - Tên DỄ THƯƠNG (Bé Bống, Thỏ Con, Kitty, Mochi, Công chúa...) -> nữ
//   - Tên MẠNH MẼ, CÁ TÍNH (Sói, Hổ, Rồng, Boss, King, Sát thủ, Đại ca...) -> nam
//   - Xưng hô: chị, cô, bà, mẹ -> nữ; anh, chú, ông, bố -> nam
//   - Tên nước ngoài (Anna, Lisa / Alex, David...), emoji (hoa, tim, bướm -> nữ; sư tử, sói, cơ bắp -> nam)
//   - Gõ không dấu cũng nhận (Ngoc, Huong, Hung, Cuong...)
// Đoán không ra (tên trung tính như "Minh", "Hoàng Anh") thì chọn theo mã băm của tên:
//   cùng một người luôn ra cùng một giới tính, không bị đổi lung tung.
// MUỐN SỬA: thêm từ vào các danh sách bên dưới (viết chữ thường, có dấu cũng được, không dấu cũng được),
//           hoặc ghi đè cho một người cụ thể ở GHI_DE.

/* ======================= DANH SÁCH CÓ THỂ SỬA ======================= */
// Ghi đè theo tên đầy đủ (viết thường). Giá trị: 'nam' hoặc 'nu'.
export const GHI_DE = {
  // 'phan trường giang': 'nam',
  // 'hoàng anh': 'nu',
};

// Tên gọi nữ (điểm 2) - tên gọi hay nằm ở cuối tên
const NU = ['hương', 'lan', 'mai', 'trang', 'thu', 'ngọc', 'nhi', 'vy', 'như', 'quỳnh', 'trân', 'tiên', 'uyên', 'diễm', 'thảo', 'thư', 'thùy', 'thúy', 'trinh', 'yến',
  'hạnh', 'hằng', 'hoa', 'huyền', 'kiều', 'liên', 'loan', 'lụa', 'my', 'nga', 'ngân', 'nguyệt', 'nhàn', 'nhung', 'oanh', 'phượng', 'quyên', 'sương', 'thắm', 'thơ', 'thy',
  'tuyền', 'vân', 'xinh', 'ý', 'yên', 'ánh', 'bích', 'cúc', 'dung', 'duyên', 'hân', 'hồng', 'khuê', 'lệ', 'lý', 'ly', 'nhã', 'nương', 'quế', 'thục', 'trúc', 'tuyết', 'đào',
  'đan', 'đoan', 'mơ', 'mận', 'diệp', 'phụng', 'dịu', 'ni', 'na', 'nghi', 'nhiên', 'châu', 'hạ', 'mỵ', 'ngà', 'thủy', 'chi', 'giao', 'tố', 'thương', 'sen', 'san', 'hiền',
  'ánh', 'nhài', 'ngát', 'tuyên', 'vi', 'my', 'thanh thảo', 'kiểu', 'lài', 'lựu', 'xoan', 'đài', 'hường', 'miền', 'nụ', 'sa', 'sương'];
// Tên gọi nữ nhẹ (điểm 1)
const NU_NHE = ['linh', 'lam', 'kim', 'hà', 'phương', 'xuân', 'hoài', 'minh thư'];
// Tên gọi nam (điểm 2)
const NAM = ['hùng', 'cường', 'dũng', 'mạnh', 'kiệt', 'long', 'hổ', 'đại', 'bá', 'phong', 'tuấn', 'quân', 'tùng', 'nam', 'đức', 'hải', 'khoa', 'thành', 'trường', 'vũ', 'phát',
  'huy', 'hào', 'quốc', 'hiếu', 'trung', 'tài', 'tiến', 'thắng', 'thịnh', 'sơn', 'lâm', 'kiên', 'nghĩa', 'nhân', 'khang', 'khôi', 'tín', 'toàn', 'lộc', 'đạt', 'đông', 'cương',
  'chiến', 'cảnh', 'hậu', 'huân', 'hưng', 'khải', 'lực', 'nguyên', 'quang', 'sang', 'tân', 'thái', 'thạch', 'thuận', 'vinh', 'việt', 'vượng', 'phước', 'hiệp', 'bằng', 'công',
  'dân', 'đồng', 'giáp', 'trọng', 'lương', 'danh', 'hai', 'tú đạt', 'quyết', 'thiên', 'tuyến', 'lợi', 'nhật', 'đăng', 'kha', 'khương', 'bách', 'bảo long', 'tùng lâm'];
// Tên gọi nam nhẹ (điểm 1)
const NAM_NHE = ['bảo', 'bình', 'duy', 'dương', 'đình', 'thiện', 'phúc', 'hòa', 'hoà'];
// Tên trung tính: nếu đứng sau một tên đệm/tên rõ giới tính thì theo giới tính đó (vd "Thùy Dương" -> nữ, "Tuấn Anh" -> nam)
const TRUNG_TINH = ['anh', 'dương', 'giang', 'khánh', 'minh', 'phương', 'thanh', 'tâm', 'nhiên', 'kim', 'lam', 'tú', 'hiền', 'an', 'bảo', 'bình', 'hà', 'linh', 'sơn'];

// Từ DỄ THƯƠNG -> nữ (điểm 2.5, tính ở bất kỳ vị trí nào trong tên)
const DE_THUONG = ['bống', 'bông', 'mít', 'bơ', 'su', 'na', 'bắp', 'nấm', 'sóc', 'thỏ', 'mèo', 'heo', 'ỉn', 'cún', 'chuột', 'kẹo', 'xoài', 'dâu', 'cherry', 'kitty', 'miu', 'meo',
  'mochi', 'pudding', 'pink', 'baby', 'princess', 'angel', 'sweet', 'cute', 'honey', 'candy', 'sugar', 'bunny', 'kute', 'cutie', 'nàng', 'tiểu', 'tím', 'lolita',
  'cupcake', 'kem', 'sữa', 'strawberry', 'dâu tây', 'peach', 'đào tiên', 'sakura', 'hello kitty', 'melody', 'unicorn', 'fairy', 'tiên nữ', 'công chúa', 'tiểu thư', 'búp bê',
  'thiên thần', 'trà sữa', 'bánh bao', 'trân châu', 'phú bà'];
// Nhẹ hơn (điểm 1.5)
const DE_THUONG_NHE = ['bé', 'nhỏ', 'iu', 'xíu', 'ngố', 'kute', 'xinh'];
// Từ MẠNH MẼ, CÁ TÍNH -> nam (điểm 2.5, ở bất kỳ vị trí nào)
const CA_TINH = ['king', 'boss', 'sói', 'hổ', 'rồng', 'cọp', 'thép', 'alpha', 'wolf', 'tiger', 'dragon', 'lion', 'eagle', 'thunder', 'storm', 'steel', 'iron', 'killer', 'ninja',
  'samurai', 'hunter', 'rider', 'biker', 'warrior', 'captain', 'hacker', 'bad boy', 'badboy', 'sát thủ', 'đại ca', 'đại gia', 'anh hùng', 'bá đạo', 'chiến thần', 'lão đại',
  'ông chủ', 'em trai', 'anh hai', 'tướng', 'hiệp sĩ', 'chiến binh', 'cao bồi', 'lính', 'phi công', 'tài xế', 'trùm'];

// Xưng hô (điểm 3)
const XUNG_HO_NU = ['chị', 'cô', 'bà', 'mẹ', 'mama', 'mommy', 'mom', 'dì', 'thím', 'mợ', 'mrs', 'ms', 'miss', 'girl', 'lady', 'queen', 'nữ', 'chị đại', 'bà chủ', 'em gái', 'cô giáo', 'mẹ bỉm'];
const XUNG_HO_NAM = ['chú', 'ông', 'thầy', 'cậu', 'bố', 'cha', 'papa', 'daddy', 'dad', 'mr', 'sir', 'bro', 'boy', 'guy', 'man', 'lão', 'bác sĩ', 'anh trai', 'thằng'];

// Tên nước ngoài (điểm 2)
const NGOAI_NAM = ['alex', 'john', 'david', 'mike', 'tom', 'jack', 'leo', 'max', 'kevin', 'peter', 'james', 'tony', 'jerry', 'andy', 'ken', 'bob', 'steve', 'jason', 'ryan', 'daniel',
  'michael', 'henry', 'harry', 'ben', 'mark', 'paul', 'eric', 'adam', 'jimmy', 'johnny', 'billy', 'danny', 'kenny', 'jun', 'kai', 'ryu', 'taro'];
const NGOAI_NU = ['anna', 'lisa', 'emma', 'linda', 'jenny', 'lily', 'mary', 'sophie', 'jessica', 'amy', 'ruby', 'mia', 'kate', 'lucy', 'rose', 'rosé', 'jane', 'julia', 'nancy', 'helen',
  'grace', 'ivy', 'nina', 'sara', 'sarah', 'ella', 'zoe', 'chloe', 'coco', 'yuki', 'mika', 'hana', 'jennie', 'alice', 'angela', 'annie', 'bella', 'cindy', 'daisy', 'emily', 'fiona',
  'mimi', 'nana', 'vivi', 'lala', 'kiki', 'lulu', 'momo', 'sana', 'mina', 'yuna', 'rin'];

// Emoji trong tên
const EMOJI_NU = '🌸🌷🌺🌹🌼💐🦋🐰🐱🐻🍓🍒🍑🎀💕💖💗💘💝🧸👸👧👩💃🤱🧚🦄🍭🍬🐥🐣🐤🌈💋👑🪷🌻🍰🧁💅👗👠';
const EMOJI_NAM = '💪🦁🐺🐉🐅🦅⚔🗡🏍🚗🏎🎮🎯👨👦🧔🕺🏋🥊🦈🐗🦍🏆🔱🛡⚽🏀🚀🔫🚬';
/* ==================================================================== */

/* ------------------------------ cài đặt ------------------------------ */
const strip = s => String(s).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
const nfc = s => String(s).normalize('NFC').toLowerCase();

const exact = new Map();       // từ có dấu (hoặc từ Latin) -> { w, free }
const plain = new Map();       // từ đã bỏ dấu -> { w, free }   (để nhận tên gõ không dấu)
const phrases = [];            // cụm nhiều từ -> { p, ps, w }

function add(list, w, free, { stripped = true } = {}) {
  for (const raw of list) {
    const k = nfc(raw).trim(); if (!k) continue;
    if (k.includes(' ')) { phrases.push({ p: k, ps: strip(k), w }); continue; }
    const cur = exact.get(k);
    if (!cur || Math.abs(w) > Math.abs(cur.w)) exact.set(k, { w, free });
    if (stripped) {
      const s = strip(k), c2 = plain.get(s);
      if (!c2) plain.set(s, { w, free });
      else if (Math.sign(c2.w) !== Math.sign(w)) { if (Math.abs(w) > Math.abs(c2.w)) plain.set(s, { w, free }); else if (Math.abs(w) === Math.abs(c2.w)) plain.set(s, { w: 0, free }); }
      else if (Math.abs(w) > Math.abs(c2.w)) plain.set(s, { w, free });
    }
  }
}
add(NU, 2, false);                add(NU_NHE, 1, false);
add(NAM, -2, false);              add(NAM_NHE, -1, false);
add(DE_THUONG, 2.5, true);        add(DE_THUONG_NHE, 1.5, true);
add(CA_TINH, -2.5, true);
add(NGOAI_NU, 2, true);           add(NGOAI_NAM, -2, true);
add(XUNG_HO_NU, 3, true, { stripped: false });
add(XUNG_HO_NAM, -3, true, { stripped: false });
exact.set('thị', { w: 3, free: true }); exact.set('văn', { w: -3, free: true });   // tên đệm kinh điển
const NEUTRAL = new Set(TRUNG_TINH.map(strip));
const ANH_NU_SAU = new Set(['thu', 'dao', 'thy', 'vy', 'phuong', 'nhi', 'tuyet', 'dong', 'tu', 'khoi']);   // "Anh Thư", "Anh Đào"... là tên nữ

function look(tok) {
  const e = exact.get(tok); if (e) return e;
  const p = plain.get(strip(tok)); return p && p.w ? p : null;
}
function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

/* ------------------------------ hàm chính ------------------------------ */
// Trả về { g: 'nam' | 'nu', diem, chac }   (chac = false nghĩa là đoán theo mã băm vì tên trung tính)
export function doanGioiTinh(name, id = '') {
  const raw = String(name || '').normalize('NFKC');
  const ov = GHI_DE[nfc(raw).trim()]; if (ov) return { g: ov === 'nu' ? 'nu' : 'nam', diem: ov === 'nu' ? 9 : -9, chac: true };

  let s = 0, hit = false;
  // emoji
  let em = 0;
  for (const ch of raw.match(/\p{Extended_Pictographic}/gu) || []) { if (EMOJI_NU.includes(ch)) em += 1.5; else if (EMOJI_NAM.includes(ch)) em -= 1.5; }
  if (em) { s += Math.max(-3, Math.min(3, em)); hit = true; }

  const text = raw.replace(/\p{Extended_Pictographic}/gu, ' ').replace(/(\p{Ll})(\p{Lu})/gu, '$1 $2');
  const tokens = nfc(text).split(/[^\p{L}\p{N}]+/u).map(t => t.replace(/\d+$/, '')).filter(Boolean);
  const n = tokens.length;
  const joined = ' ' + tokens.join(' ') + ' ', joinedS = ' ' + tokens.map(strip).join(' ') + ' ';

  for (const ph of phrases) if (joined.includes(' ' + ph.p + ' ') || joinedS.includes(' ' + ph.ps + ' ')) { s += ph.w; hit = true; }

  const info = tokens.map(look);
  let skipNext = false;
  for (let i = 0; i < n; i++) {
    if (skipNext) { skipNext = false; continue; }
    const t = tokens[i], ts = strip(t);
    if (t === 'anh' && i === 0 && n > 1) {                      // "Anh Hai", "Anh Tuấn" -> xưng hô nam; "Anh Thư" -> tên nữ
      if (!ANH_NU_SAU.has(strip(tokens[1]))) { s -= 3; hit = true; continue; }
      s += 2; hit = true; skipNext = true; continue;
    }
    if (i === n - 1 && i > 0 && NEUTRAL.has(ts)) {              // tên trung tính ở cuối: theo tên đệm đứng trước nếu tên đệm rõ giới tính
      const pv = info[i - 1];
      if (pv && Math.abs(pv.w) >= 2) { s += Math.sign(pv.w) * 2.2; hit = true; continue; }
    }
    const inf = info[i]; if (!inf) continue;
    hit = true;
    if (inf.free) { s += inf.w; continue; }
    s += inf.w * (i === n - 1 ? 1.6 : i === n - 2 ? 1.0 : 0.6);
  }

  // Tên Latin lạ không có trong từ điển: đoán theo âm cuối (nhẹ)
  if (!hit && n) {
    const last = strip(tokens[n - 1]);
    if (/^[a-z]{3,}$/.test(last)) {
      if (/(a|i|y|ie|ee)$/.test(last)) s += 0.7;
      else if (/(ng|n|c|t|p)$/.test(last)) s -= 0.7;
    }
  }

  if (s >= 1) return { g: 'nu', diem: s, chac: true };
  if (s <= -1) return { g: 'nam', diem: s, chac: true };
  return { g: hash(raw + '|' + id) % 2 ? 'nu' : 'nam', diem: s, chac: false };    // trung tính -> chọn ổn định theo mã băm
}
