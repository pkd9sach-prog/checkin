# Chùa Ảo 9 Sạch - Cảnh 3D (Mục 2)

Cảnh chùa 3D chạy trên trình duyệt (Three.js + bloom), khung dọc 9:16 cho live TikTok.
Toàn bộ texture tạo bằng code, không dùng ảnh ngoài.

## Chạy thử trên máy
Không double-click file index.html (trình duyệt chặn module). Mở Terminal trong thư mục `chua-ao`:

    npx serve .

Rồi mở địa chỉ hiện ra (thường http://localhost:3000). Cần có mạng để tải Three.js từ CDN.

## Điều khiển
- Phím 1: toàn cảnh, 2: bàn thờ, 3: nhìn từ trên
- ?full=1: lấp đầy cửa sổ thay vì khung 9:16
- ?bloom=0.8: tăng độ phát sáng

## Cấu trúc
- index.html: trang chính, nạp Three.js 0.160.0 từ CDN
- js/textures.js: sinh texture gỗ, sơn mài đỏ, đá, thảm, song hoa, hào quang
- js/main.js: dựng cảnh, ánh sáng, tượng Phật, bàn thờ, đèn lồng, khói, bụi

## Cho các mục sau
window.TEMPLE cung cấp scene, camera, seats (78 chỗ quỳ có x, z), flyTo(name), AZ (z bàn thờ), TOP (độ cao mặt bàn).
