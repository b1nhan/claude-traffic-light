"use strict";

// Nguồn dữ liệu hook DUY NHẤT cho Claude Traffic Light.
// Dùng chung cho: IPC "connect-claude" (main.js), fallback script
// (assets/connect-claude.ps1 — tự tay đồng bộ nếu sửa ở đây), và đoạn
// prompt copy-paste trong setup.html.
//
// Dùng "shell": "powershell" (không phải curl/bash) vì máy bạn bè
// chưa chắc có Git Bash cài sẵn — PowerShell luôn có sẵn trên Windows.

const PORT = 7317;

function psCommand(status, message) {
  const body = JSON.stringify({ status, message }).replace(/'/g, "''");
  return (
    `Invoke-RestMethod -Method Post -Uri http://localhost:${PORT}/status ` +
    `-ContentType 'application/json' -Body '${body}' -ErrorAction SilentlyContinue | Out-Null`
  );
}

const HOOKS = {
  UserPromptSubmit: [
    { hooks: [{ type: "command", shell: "powershell", command: psCommand("running", "Claude dang xu ly") }] },
  ],
  PreToolUse: [
    { matcher: "", hooks: [{ type: "command", shell: "powershell", command: psCommand("running", "Dang chay tool") }] },
  ],
  Notification: [
    { hooks: [{ type: "command", shell: "powershell", command: psCommand("waiting", "Claude Code dang cho xac nhan") }] },
  ],
  Stop: [
    { hooks: [{ type: "command", shell: "powershell", command: psCommand("done", "Task da xong") }] },
  ],
};

module.exports = { HOOKS, PORT };
