# Claude Traffic Light

Bản "đèn giao thông ảo" chạy ngay trên máy tính, thay cho đèn giao thông vật lý — báo trạng thái Claude Code theo thời gian thực:
- 🔴 đỏ = đang chờ xác nhận
- 🟡 vàng = đang chạy
- 🟢 xanh = task xong, sẵn sàng task mới

**[⬇️ Tải bản build sẵn (Windows / macOS / Linux) tại GitHub Releases](https://github.com/b1nhan/claude-traffic-light/releases/latest)** —
không cần cài Node.js, chạy thẳng.

Gồm 3 phần độc lập, dùng phần nào tùy nhu cầu:

```
desktop-app/         -> app Electron (Windows/macOS/Linux): cửa sổ nổi always-on-top + system tray +
                         server trạng thái nhúng sẵn + cửa sổ "Hướng dẫn/Cài đặt" tự setup hook cho
                         Claude Code. Chỉ cần chạy/tải app này là đủ cho hầu hết mọi người.
hooks/               -> mẫu cấu hình hook Claude Code (tham khảo thủ công, nếu không dùng nút
                         "Connect" trong app)
server/              -> server local (Node.js) độc lập — KHÔNG bắt buộc, chỉ dành cho ai muốn
                         chạy relay server riêng không qua Electron (dev/nâng cao)
browser-extension/   -> extension Chrome/Edge: theo dõi trực tiếp trang claude.ai (web), đổi icon +
                         popup theo trạng thái. Độc lập hoàn toàn với desktop-app/server — không cần
                         Claude Code, không cần server local.
```

`desktop-app` tự chạy server trạng thái nhúng bên trong (không cần mở `server/` riêng) và theo dõi
**Claude Code** (CLI) qua hooks. `browser-extension` theo dõi **claude.ai** (web chat) bằng cách đọc
DOM của trang — hai nguồn dữ liệu khác nhau, không liên quan tới nhau.

---

## 1. Yêu cầu

- Đã có build sẵn ở [Releases](https://github.com/b1nhan/claude-traffic-light/releases/latest) — chỉ cần tải, không cần cài gì thêm.
- Muốn tự chạy từ source: Node.js 18+ (tải tại nodejs.org).
- Claude Code chạy trên máy có PowerShell (mặc định có sẵn trên Windows; trên macOS/Linux cần cài
  [PowerShell 7](https://github.com/PowerShell/PowerShell) nếu muốn dùng nút "Connect to Claude" tự
  động — hook mặc định dùng lệnh PowerShell. Nếu không có PowerShell, xem "Cách thủ công" ở mục 5 để
  đổi sang `curl`).
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

## 3. Desktop app (cửa sổ nổi + system tray)

### Cách nhanh nhất — tải bản build sẵn

Vào [Releases](https://github.com/b1nhan/claude-traffic-light/releases/latest), tải file tương ứng
hệ điều hành:

| Hệ điều hành | File |
|---|---|
| Windows | `Claude Traffic Light 1.0.0.exe` (portable, double-click chạy thẳng, không cần cài) |
| macOS (Apple Silicon) | `Claude Traffic Light-1.0.0-arm64.dmg` |
| Linux | `.AppImage` (chạy thẳng) hoặc `.tar.gz` (giải nén rồi chạy) |

Windows SmartScreen / macOS Gatekeeper có thể cảnh báo "Unknown Publisher" ở lần chạy đầu (app chưa
ký code-signing) — chọn **More info → Run anyway** (Windows) hoặc **chuột phải → Open** (macOS) là
dùng được bình thường.

### Chạy từ source (dev)

```bash
cd desktop-app
npm install
npm start
```

- Một cửa sổ nhỏ, không viền, luôn nổi trên cùng sẽ xuất hiện ở góc phải màn hình — kéo thả để đổi vị trí.
- Icon trong khay hệ thống (system tray) cũng đổi màu theo trạng thái; click chuột phải để đổi chế độ hiển thị (**Standard / Compact / Minimal**), **Ẩn**, mở **Home** (Hướng dẫn/Cài đặt), hoặc **Thoát**.
- Đóng cửa sổ nổi không thoát app — app tiếp tục sống trong tray, dùng menu tray để thoát hẳn.
- Lần chạy đầu tiên, app tự mở cửa sổ **Hướng dẫn/Cài đặt** (mục 5) để bạn kết nối với Claude Code — chỉ cần làm 1 lần.

### Tự đóng gói (build)

```bash
npm run dist:win     # Windows — output: desktop-app/release/*.exe (portable)
npm run dist:mac     # macOS  — output: desktop-app/release/*.dmg
npm run dist:linux   # Linux  — output: desktop-app/release/*.AppImage, *.tar.gz
```

Mỗi lệnh cần chạy **trên đúng hệ điều hành tương ứng** (hoặc qua CI — xem
`.github/workflows/build-desktop.yml`, tự động build cả 3 nền tảng khi push tag `v*`).

---

## 4. Cài browser extension (theo dõi claude.ai trên web)

Độc lập với desktop-app/server — không cần Claude Code CLI, không cần chạy server local. Extension tự
quan sát DOM của trang claude.ai để biết Claude đang trả lời / đang chờ bạn xác nhận / đã xong.

1. Mở Chrome/Edge → `chrome://extensions` (hoặc `edge://extensions`)
2. Bật **Developer mode** (góc trên phải)
3. Chọn **Load unpacked** → trỏ tới thư mục `browser-extension/`
4. Icon Claude Traffic Light sẽ xuất hiện trên thanh công cụ, đổi màu theo trạng thái. Click vào icon để xem chi tiết trạng thái + message. Mở trang tùy chọn (**Options**) để bật/tắt widget nổi trên trang, đổi chế độ hiển thị, độ mờ, vị trí.

> Cơ chế nhận diện dựa trên heuristic (aria-label, text nút bấm, tiêu đề trang) vì claude.ai chưa có API chính thức để đọc trạng thái — nếu Anthropic đổi UI, có thể cần cập nhật lại regex trong `content-claude.js`.
>
> Lưu ý: Manifest V3 có thể tạm "ngủ" service worker sau ~30s không hoạt động, nên badge có thể cập nhật hơi trễ. Extension tự đánh thức lại mỗi khi có tab claude.ai gửi trạng thái mới, và luôn lấy trạng thái mới nhất mỗi khi bạn mở popup, nên không bao giờ hiển thị sai quá lâu.

---

## 5. Nối Claude Code (CLI) vào desktop app (phần quan trọng nhất)

### Cách 0 — dùng ngay trong app (khuyên dùng, dành cho bạn bè non-tech)

Mở app → click phải icon tray → **Home** (hoặc cửa sổ này tự mở ở lần chạy đầu). Bấm nút **Connect to
Claude** — app tự thêm hook vào `~/.claude/settings.json` giúp bạn, không cần biết dòng lệnh nào. Nếu
nút đó không khả thi trên máy bạn (bị chặn quyền ghi file, không có PowerShell, v.v.), cửa sổ đó còn
2 cách dự phòng: chạy sẵn 1 script `.ps1` (`desktop-app/assets/connect-claude.ps1`), hoặc copy 1 đoạn
prompt để nhờ chính Claude Code của bạn tự cấu hình giúp.

### Cách thủ công (nâng cao / tham khảo)

Claude Code hỗ trợ **hooks** — chạy lệnh shell khi có sự kiện xảy ra. Mở (hoặc tạo) file cấu hình:

- Toàn cục: `~/.claude/settings.json`
- Hoặc riêng theo project: `.claude/settings.json` trong thư mục project

Copy nội dung từ `hooks/settings.snippet.json` vào (merge với cấu hình sẵn có nếu có) — bản này dùng
`"shell": "powershell"`. Nếu máy bạn không có PowerShell (thường gặp trên macOS/Linux), đổi mỗi
`command` sang `curl`, ví dụ:

```bash
curl -s -X POST http://localhost:7317/status -H "Content-Type: application/json" -d '{"status":"running","message":"Claude dang xu ly"}' >/dev/null 2>&1
```

và bỏ khóa `"shell": "powershell"` đi (dùng shell mặc định POSIX). Cách map sự kiện → màu:

| Sự kiện Claude Code | Trạng thái | Màu |
|---|---|---|
| `UserPromptSubmit`, `PreToolUse` | `running` | 🟡 vàng |
| `Notification` (cần quyền / chờ xác nhận) | `waiting` | 🔴 đỏ |
| `Stop` (trả lời xong) | `done` | 🟢 xanh |

Sau khi lưu file, khởi động lại Claude Code. Giờ mỗi khi Claude chạy tool, cần xác nhận, hoặc xong việc — cửa sổ nổi và tray icon đều đổi màu theo thời gian thực.

---

## 6. Thứ tự khởi động khuyến nghị

1. Chạy `desktop-app` (hoặc file build sẵn từ Releases) — server nhúng tự khởi động cùng app
2. Làm mục 5 (Cách 0) một lần duy nhất để nối Claude Code
3. Mở Claude Code — hooks sẽ tự bắn trạng thái về app

(Chỉ cần chạy `server/` riêng nếu bạn không dùng desktop-app mà chỉ muốn build 1 relay server riêng cho việc khác.)

---

## Gợi ý mở rộng

- Thêm sự kiện `SessionStart` → set về `idle` khi mở phiên mới.
- Thêm âm thanh "ting" khi chuyển sang `waiting` (dùng `Audio` trong renderer.js).
- Cross-platform hook mặc định (tự chọn PowerShell/curl theo OS) thay vì hard-code PowerShell trong `hooksConfig.js`.
