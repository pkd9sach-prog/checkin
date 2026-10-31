# Chùa Ảo 9 Sạch - Cảnh 3D + Avatar (Mục 2, 3)

Cảnh chùa 3D chạy trên trình duyệt (Three.js + bloom), khung dọc 9:16 cho live TikTok.
Toàn bộ texture tạo bằng code, không dùng ảnh ngoài.

## Chạy thử trên máy
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
