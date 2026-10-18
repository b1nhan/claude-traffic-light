"use strict";

// Nguồn dữ liệu hook DUY NHẤT cho Claude Traffic Light.
// Dùng chung cho: IPC "connect-claude" (main.js), fallback script
// (assets/connect-claude.ps1 — tự tay đồng bộ nếu sửa ở đây), và đoạn
// prompt copy-paste trong setup.html.
//
// Windows dùng "shell": "powershell" (không phải curl/bash) vì máy bạn bè
// chưa chắc có Git Bash cài sẵn — PowerShell luôn có sẵn trên Windows.
// macOS/Linux dùng curl với shell POSIX mặc định (không cần cài PowerShell).

const PORT = 7317;
const IS_WINDOWS = process.platform === "win32";

function psCommand(status, message) {
  const body = JSON.stringify({ status, message }).replace(/'/g, "''");
  return (
    `Invoke-RestMethod -Method Post -Uri http://localhost:${PORT}/status ` +
    `-ContentType 'application/json' -Body '${body}' -ErrorAction SilentlyContinue | Out-Null`
  );
}

function curlCommand(status, message) {
  const body = JSON.stringify({ status, message }).replace(/'/g, "'\\''");
  return (
    `curl -s -m 2 -X POST http://localhost:${PORT}/status ` +
    `-H 'Content-Type: application/json' -d '${body}' >/dev/null 2>&1 || true`
  );
}

// Một block hook theo nền tảng hiện tại.
function hookBlock(status, message, extra = {}) {
  const hook = IS_WINDOWS
    ? { type: "command", shell: "powershell", command: psCommand(status, message) }
    : { type: "command", command: curlCommand(status, message) };
  return { ...extra, hooks: [hook] };
}

const HOOKS = {
  UserPromptSubmit: [hookBlock("running", "Claude dang xu ly")],
  PreToolUse: [hookBlock("running", "Dang chay tool", { matcher: "" })],
  Notification: [hookBlock("waiting", "Claude Code dang cho xac nhan")],
  Stop: [hookBlock("done", "Task da xong")],
};

module.exports = { HOOKS, PORT, IS_WINDOWS };
