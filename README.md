# Chùa Ảo 9 Sạch - Cảnh 3D + Avatar + Quà (Mục 2, 3, 4)

Cảnh chùa 3D chạy trên trình duyệt (Three.js + bloom), khung dọc 9:16 cho live TikTok.
Toàn bộ texture tạo bằng code, không dùng ảnh ngoài.

## Chạy (từ Mục 4)
Trong thư mục `chua-ao`: `npm install` (1 lần), rồi

    node server.js --demo            (thử: khán giả + quà giả)
    node server.js ten_tiktok        (live thật, không cần dấu @)

Mở http://localhost:8080 (cổng đổi bằng biến PORT). Server vừa phục vụ trang vừa bắt quà TikTok.
`npx serve .` vẫn dùng được để xem cảnh tĩnh nhưng sẽ không có quà.

## Chạy thử trên máy (cách cũ, Mục 2)
Không double-click file index.html (trình duyệt chặn module). Mở Terminal trong thư mục `chua-ao`:

    npx serve .

Rồi mở địa chỉ hiện ra (thường http://localhost:3000). Cần có mạng để tải Three.js từ CDN.

## Điều khiển
- Phím 1: toàn cảnh, 2: bàn thờ, 3: nhìn từ trên
- Phím A: thêm 1 người xem giả, D: bớt 1 người, B: tất cả lạy 3 lần, C: xoá hết
- ?demo=40: tự thêm 40 người xem giả khi mở trang; ?tags=0: ẩn bảng tên
- ?full=1: lấp đầy cửa sổ thay vì khung 9:16
- ?bloom=0.8: tăng độ phát sáng

## Cấu trúc
- index.html: trang chính, nạp Three.js 0.160.0 từ CDN
- js/textures.js: sinh texture gỗ, sơn mài đỏ, đá, thảm, song hoa, hào quang
- js/avatars.js: avatar chibi quỳ (InstancedMesh) + bảng tên (tên + ảnh đại diện)
- js/main.js: dựng cảnh, ánh sáng, tượng Phật, bàn thờ, đèn lồng, khói, bụi

## Cho các mục sau
window.TEMPLE cung cấp scene, camera, seats (78 chỗ quỳ có x, z), flyTo(name), AZ (z bàn thờ), TOP (độ cao mặt bàn).

## Avatar (Mục 3)
window.TEMPLE.avatars:
- add({ id, name, avatarUrl })  -> số chỗ ngồi (-1 nếu hết chỗ); gọi lại cùng id thì chỉ cập nhật tên/ảnh
- remove(id), has(id), get(id), list(), count(), clear()
- bow(id, soLan)  -> lạy; bowAll(soLan); setBow(id, 0..1) -> cúi thủ công
- window.TEMPLE.hooks: mảng hàm (dt, t) chạy mỗi khung hình, dùng cho Mục 4

## Quà -> hành động (Mục 4)
- Phím G: một người ngẫu nhiên tặng quà (thử không cần server). ?debug=1: hiện trạng thái nối server. ?hint=0: ẩn dòng chú thích.
- js/actions.js: hàng đợi quà. Mỗi quà: rời chỗ -> hiện ở đầu thảm -> đi lên -> thắp nhang -> vái -> cắm nhang vào lư -> lạy -> về chỗ.
  Số lần lạy theo giá trị (kim cương x số lượng): <10: 1, <100: 3, <1000: 5, từ 1000: 7. Hàng đợi dài thì mọi thứ nhanh dần.
- js/net.js: nhận sự kiện từ server (join, chat, gift, roster). TEMPLE.bus phát lại các sự kiện này và worship:start / worship:incense / worship:end cho Mục 5.
- server.js: tiktok-live-connector + WebSocket + phục vụ file + tải hộ ảnh đại diện.

## Nhạc Phật giáo (bổ sung Mục 4)
- js/music.js: nhạc TỰ SINH bằng code (WebAudio), không dùng file mp3 nên không bản quyền. Có tiếng ngân trầm, hợp âm nền, giai điệu ngũ cung thưa, chuông xoay, chuông chùa, mõ; khi có người lễ thì có tiếng chuông nhỏ, chuông xoay và mõ.
- Phím M: tắt/bật nhạc. ?music=0: tắt hẳn. ?vol=0.4: chỉnh to nhỏ (0..1).
- Trình duyệt thường chặn tiếng cho đến khi bấm vào trang 1 lần (OBS/LIVE Studio thường không chặn). Trong OBS: tick "Control audio via OBS" ở Browser Source để nhạc vào luồng live.

## Lời cảm ơn + lời chúc (bổ sung Mục 4)
- js/loi-chuc.js: mỗi người tặng quà, khi cắm nhang và bắt đầu lạy, hiện đúng MỘT câu cảm ơn + chúc, có tên người tặng.
- 3 nhóm: quà thường, quà hoa (tên quà có hoa/rose/lotus...), quà lớn (từ 1000 kim cương). Xáo bài nên không lặp liên tiếp. Sửa câu ngay trong file (3 danh sách đầu).
- Phím H: thử quà hoa. ?loichuc=0: tắt. ?capy=0.6: đổi độ cao phụ đề. ?voice=1: đọc thành tiếng nếu máy có giọng tiếng Việt.

## HUD (Mục 5)
- js/hud.js: lớp giao diện chồng đúng lên khung 9:16, né vùng TikTok che (đỉnh, đáy, mép phải).
- Banner đầu trang: tên chùa + dòng hướng dẫn đổi luân phiên (sửa chữ ở CFG.TITLE và TIPS).
- Bảng vàng công đức: top 5 người tặng nhiều kim cương nhất, lưu trong trình duyệt nên tải lại trang/OBS không mất. ?reset=1 xoá bảng.
- Lời cầu: bình luận bắt đầu bằng "cầu", "xin", "nguyện", "con xin"... sẽ hiện lên màn hình. Mỗi người 1 lời / 30 giây, bỏ link, số điện thoại, từ thô tục (danh sách BLOCK trong hud.js). Phím L: thử.
- Banner công đức lớn: quà từ 1000 kim cương. ?hud=0 tắt hết HUD. ?prayy=0.58 đổi độ cao lời cầu.
- Chế độ thử (node server.js --demo) có bình luận cầu giả.

## Đoán nam/nữ từ tên (Mục 4 bổ sung)
- js/gioi-tinh.js: đoán giới tính từ tên. Avatar NAM (tóc ngắn, vai rộng, áo đậm hơn) hoặc NỮ (tóc dài + búi + mái, áo xoè, sáng hơn) sẽ tự bước lên thắp nhang theo đúng giới tính của người tặng.
- Tên DỄ THƯƠNG -> nữ (Bé Bống, Thỏ Con, Kitty, Mochi, Công chúa...). Tên MẠNH MẼ, CÁ TÍNH -> nam (Sói, Hổ, Rồng, Boss, King, Sát thủ, Đại ca...).
- Còn nhận: tên đệm Thị/Văn, xưng hô (chị/cô/bà/mẹ; anh/chú/ông/bố), tên Việt gõ không dấu, tên nước ngoài, emoji.
- Tên trung tính (Minh, Hoàng Anh...) chọn theo mã băm của tên: cùng một người luôn ra cùng giới tính.
- Thêm từ: sửa các danh sách đầu file gioi-tinh.js. Ép riêng một người: điền vào GHI_DE ở đầu file. Hoặc gọi TEMPLE.avatars.setGender('id', 'nam' | 'nu').
- ?gt=1: hiện ký hiệu ♂/♀ trước tên trên bảng tên để kiểm tra. ?debug=1: in lý do đoán ra Console (F12).

## Tượng Phật
Tượng dùng ảnh assets/phat.png (nền trong suốt). Muốn đổi tượng: thay file này bằng ảnh PNG nền trong suốt khác (giữ tên phat.png, tỉ lệ rộng/cao đổi ở STATUE_W trong main.js).
