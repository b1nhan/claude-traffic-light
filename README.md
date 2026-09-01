# Claude Traffic Light (Windows)

Bản "đèn giao thông ảo" chạy ngay trên máy tính, thay cho đèn giao thông vật lý:
- 🔴 đỏ = Claude Code đang chờ xác nhận
- 🟡 vàng = đang chạy
- 🟢 xanh = task xong, sẵn sàng task mới

Gồm 3 phần:

```
server/             -> server local (Node.js), là "cầu nối" nhận trạng thái từ Claude Code
hooks/               -> mẫu cấu hình hook để Claude Code báo trạng thái về server
desktop-app/         -> app Electron: cửa sổ nổi always-on-top + system tray
browser-extension/   -> extension Chrome/Edge: đổi icon + popup theo trạng thái
```

Cả desktop app và extension đều chỉ **đọc** trạng thái từ server local (`http://localhost:7317`) — chúng không nói chuyện trực tiếp với nhau.

---

## 1. Yêu cầu

- Node.js 18+ (tải tại nodejs.org) — dùng cho server và app desktop.
- Claude Code chạy trên Windows qua **WSL hoặc Git Bash** (hook commands là lệnh shell kiểu POSIX, cần `curl`). Nếu bạn chạy Claude Code hoàn toàn native trên `cmd.exe`, xem phần "Windows thuần" bên dưới.
- Google Chrome hoặc Microsoft Edge (cho phần extension).

---

## 2. Chạy server (bắt buộc, chạy trước tiên)

```bash
cd server
npm install
npm start
```

Sẽ thấy: `Claude Traffic Light server listening on http://localhost:7317`

Server này giữ trạng thái hiện tại trong bộ nhớ và có 2 API:
- `GET /status` → trả JSON trạng thái hiện tại
- `POST /status` với body `{ "status": "running" | "waiting" | "done" | "idle", "message": "..." }`

**Test nhanh không cần Claude Code** (mở terminal khác):

```bash
curl -X POST http://localhost:7317/status -H "Content-Type: application/json" -d "{\"status\":\"waiting\",\"message\":\"can xac nhan\"}"
```

Hoặc PowerShell:

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:7317/status -ContentType "application/json" -Body '{"status":"waiting","message":"can xac nhan"}'
```

---

## 3. Chạy desktop app (cửa sổ nổi + system tray)

```bash
cd desktop-app
npm install
npm start
```

- Một cửa sổ nhỏ, không viền, luôn nổi trên cùng sẽ xuất hiện ở góc phải màn hình — kéo thả để đổi vị trí.
- Icon trong khay hệ thống (system tray) cũng đổi màu theo trạng thái; click chuột phải để **Ẩn/Hiện cửa sổ nổi** hoặc **Thoát**.
- Đóng cửa sổ nổi (nút X ảo, nếu bạn tự thêm) không thoát app — app tiếp tục sống trong tray, dùng menu tray để thoát hẳn.

### Đóng gói thành file .exe (tùy chọn)

```bash
npm run dist:win
```

Cần chạy lệnh này **trên máy Windows** (electron-builder đóng gói NSIS installer cho Windows tốt nhất khi build trực tiếp trên Windows).

---

## 4. Cài browser extension

1. Mở Chrome/Edge → `chrome://extensions` (hoặc `edge://extensions`)
2. Bật **Developer mode** (góc trên phải)
3. Chọn **Load unpacked** → trỏ tới thư mục `browser-extension/`
4. Icon Claude Traffic Light sẽ xuất hiện trên thanh công cụ, đổi màu theo trạng thái. Click vào icon để xem chi tiết trạng thái + message.

> Lưu ý: Manifest V3 có thể tạm "ngủ" service worker sau ~30s không hoạt động, nên badge có thể cập nhật hơi trễ. Extension tự đánh thức lại mỗi 1 phút và luôn lấy trạng thái mới nhất mỗi khi bạn mở popup, nên không bao giờ hiển thị sai quá lâu.

---

## 5. Nối Claude Code vào hệ thống (phần quan trọng nhất)

Claude Code hỗ trợ **hooks** — chạy lệnh shell khi có sự kiện xảy ra. Mở (hoặc tạo) file cấu hình:

- Toàn cục: `~/.claude/settings.json`
- Hoặc riêng theo project: `.claude/settings.json` trong thư mục project

Copy nội dung từ `hooks/settings.snippet.json` vào (merge với cấu hình sẵn có nếu có). Cách map sự kiện → màu:

| Sự kiện Claude Code | Trạng thái | Màu |
|---|---|---|
| `UserPromptSubmit`, `PreToolUse` | `running` | 🟡 vàng |
| `Notification` (cần quyền / chờ xác nhận) | `waiting` | 🔴 đỏ |
| `Stop` (trả lời xong) | `done` | 🟢 xanh |

Sau khi lưu file, khởi động lại Claude Code. Giờ mỗi khi Claude chạy tool, cần xác nhận, hoặc xong việc — cửa sổ nổi, tray icon và extension đều đổi màu theo thời gian thực.

### Windows thuần (không dùng WSL/Git Bash)

Nếu shell mặc định của Claude Code trên máy bạn là `cmd.exe`/PowerShell thuần (không có `curl` kiểu Unix pipe), đổi mỗi `command` trong `settings.snippet.json` thành PowerShell, ví dụ:

```json
"command": "powershell -NoProfile -Command \"Invoke-RestMethod -Method Post -Uri http://localhost:7317/status -ContentType 'application/json' -Body '{\\\"status\\\":\\\"waiting\\\"}'\" "
```

---

## 6. Thứ tự khởi động khuyến nghị

1. Chạy `server` trước
2. Chạy `desktop-app` (hoặc chỉ dùng extension nếu không cần cửa sổ nổi)
3. Mở Claude Code — hooks sẽ tự bắn trạng thái về server

---

## Gợi ý mở rộng

- Thêm sự kiện `SessionStart` → set về `idle` khi mở phiên mới.
- Thêm âm thanh "ting" khi chuyển sang `waiting` (dùng `Audio` trong renderer.js).
- Đổi cửa sổ nổi thành 3 hình tròn xếp dọc y hệt đèn giao thông thật thay vì 1 chấm đổi màu.
