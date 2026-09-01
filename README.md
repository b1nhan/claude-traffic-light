# Claude Traffic Light (Windows)

Bản "đèn giao thông ảo" chạy ngay trên máy tính, thay cho đèn giao thông vật lý:
- 🔴 đỏ = Claude Code đang chờ xác nhận
- 🟡 vàng = đang chạy
- 🟢 xanh = task xong, sẵn sàng task mới

Gồm 3 phần:

```
desktop-app/         -> app Electron: cửa sổ nổi always-on-top + system tray + server nhúng sẵn +
                         cửa sổ "Hướng dẫn/Cài đặt" tự setup hook cho bạn. Chỉ cần chạy app này.
hooks/               -> mẫu cấu hình hook để Claude Code báo trạng thái về server (tham khảo thủ công)
server/              -> server local (Node.js) độc lập — KHÔNG bắt buộc, chỉ dành cho ai muốn
                         chạy relay server riêng không qua Electron (dev/nâng cao)
browser-extension/   -> extension Chrome/Edge: đổi icon + popup theo trạng thái
```

`desktop-app` giờ tự chạy server trạng thái nhúng bên trong (không cần mở `server/` riêng nữa) —
build thành 1 file `.exe` portable, bạn bè tải về chạy thẳng là dùng được. `browser-extension` vẫn
chỉ **đọc** trạng thái qua `http://localhost:7317`, do desktop-app phát ra khi đang chạy.

---

## 1. Yêu cầu

- Node.js 18+ (tải tại nodejs.org) — dùng cho server và app desktop.
- Claude Code chạy trên Windows qua **WSL hoặc Git Bash** (hook commands là lệnh shell kiểu POSIX, cần `curl`). Nếu bạn chạy Claude Code hoàn toàn native trên `cmd.exe`, xem phần "Windows thuần" bên dưới.
- Google Chrome hoặc Microsoft Edge (cho phần extension).

---

## 2. Chạy server (không bắt buộc — chỉ dành cho dev/nâng cao)

> Nếu bạn chỉ muốn dùng app, **bỏ qua mục này**: `desktop-app` (mục 3) đã tự chạy server nhúng bên
> trong khi khởi động. Mục này chỉ cần khi bạn muốn chạy relay server độc lập, không qua Electron.

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
- Icon trong khay hệ thống (system tray) cũng đổi màu theo trạng thái; click chuột phải để **Ẩn/Hiện cửa sổ nổi**, mở **Hướng dẫn/Cài đặt**, hoặc **Thoát**.
- Đóng cửa sổ nổi (nút X ảo, nếu bạn tự thêm) không thoát app — app tiếp tục sống trong tray, dùng menu tray để thoát hẳn.
- Lần chạy đầu tiên, app tự mở cửa sổ **Hướng dẫn/Cài đặt** (mục 5) để bạn kết nối với Claude Code — chỉ cần làm 1 lần.

### Đóng gói thành file .exe (portable — dùng để gửi cho bạn bè)

```bash
npm run dist:win
```

Cần chạy lệnh này **trên máy Windows**. Kết quả nằm trong `desktop-app/dist/` — 1 file `.exe`
portable duy nhất, gửi cho bạn bè, họ chỉ cần double-click là chạy, không cần cài đặt, không cần
Node.js hay bất cứ thứ gì khác. Windows SmartScreen có thể cảnh báo "Unknown Publisher" ở lần chạy
đầu (do file chưa ký code-signing) — bấm **More info → Run anyway** là dùng được bình thường.

---

## 4. Cài browser extension

1. Mở Chrome/Edge → `chrome://extensions` (hoặc `edge://extensions`)
2. Bật **Developer mode** (góc trên phải)
3. Chọn **Load unpacked** → trỏ tới thư mục `browser-extension/`
4. Icon Claude Traffic Light sẽ xuất hiện trên thanh công cụ, đổi màu theo trạng thái. Click vào icon để xem chi tiết trạng thái + message.

> Lưu ý: Manifest V3 có thể tạm "ngủ" service worker sau ~30s không hoạt động, nên badge có thể cập nhật hơi trễ. Extension tự đánh thức lại mỗi 1 phút và luôn lấy trạng thái mới nhất mỗi khi bạn mở popup, nên không bao giờ hiển thị sai quá lâu.

---

## 5. Nối Claude Code vào hệ thống (phần quan trọng nhất)

### Cách 0 — dùng ngay trong app (khuyên dùng, dành cho bạn bè non-tech)

Mở app → click phải icon tray → **Hướng dẫn/Cài đặt** (hoặc cửa sổ này tự mở ở lần chạy đầu). Bấm
nút **Connect to Claude** — app tự thêm hook vào `~/.claude/settings.json` giúp bạn, không cần biết
dòng lệnh nào. Nếu nút đó không khả thi trên máy bạn (bị chặn quyền ghi file, v.v.), cửa sổ đó còn
2 cách dự phòng: chạy sẵn 1 script `.ps1`, hoặc copy 1 đoạn prompt để nhờ chính Claude Code của bạn
tự cấu hình giúp.

### Cách thủ công (nâng cao / tham khảo)

Claude Code hỗ trợ **hooks** — chạy lệnh shell khi có sự kiện xảy ra. Mở (hoặc tạo) file cấu hình:

- Toàn cục: `~/.claude/settings.json`
- Hoặc riêng theo project: `.claude/settings.json` trong thư mục project

Copy nội dung từ `hooks/settings.snippet.json` vào (merge với cấu hình sẵn có nếu có) — bản này
dùng `"shell": "powershell"` nên chạy được trên Windows thuần, không cần cài Git Bash. Cách map sự
kiện → màu:

| Sự kiện Claude Code | Trạng thái | Màu |
|---|---|---|
| `UserPromptSubmit`, `PreToolUse` | `running` | 🟡 vàng |
| `Notification` (cần quyền / chờ xác nhận) | `waiting` | 🔴 đỏ |
| `Stop` (trả lời xong) | `done` | 🟢 xanh |

Sau khi lưu file, khởi động lại Claude Code. Giờ mỗi khi Claude chạy tool, cần xác nhận, hoặc xong việc — cửa sổ nổi, tray icon và extension đều đổi màu theo thời gian thực.

---

## 6. Thứ tự khởi động khuyến nghị

1. Chạy `desktop-app` (hoặc file `.exe` portable đã build) — server nhúng tự khởi động cùng app
2. Làm mục 5 (Cách 0) một lần duy nhất để nối Claude Code
3. Mở Claude Code — hooks sẽ tự bắn trạng thái về app

(Chỉ cần chạy `server/` riêng nếu bạn không dùng desktop-app mà chỉ muốn dùng browser-extension.)

---

## Gợi ý mở rộng

- Thêm sự kiện `SessionStart` → set về `idle` khi mở phiên mới.
- Thêm âm thanh "ting" khi chuyển sang `waiting` (dùng `Audio` trong renderer.js).
- Đổi cửa sổ nổi thành 3 hình tròn xếp dọc y hệt đèn giao thông thật thay vì 1 chấm đổi màu.
